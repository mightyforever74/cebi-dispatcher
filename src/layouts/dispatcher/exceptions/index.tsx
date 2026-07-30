/**
 * FEAT-010 Dilim 4 - Istisna Yonetimi sayfasi (FN-13 ExceptionStatusPanel
 * + FN-14 ResolutionActionPanel MVP + FN-12 MVP sayfa-ici "yeni olay" vurgusu).
 * SAPMA NOTU (kanitli): Notistack kodda KURULU DEGIL (yalniz spec/ADR metninde
 * geciyor) - toast yerine severity rozetleri + yeni-olay satir vurgusu; gercek
 * toast ayri cila kalemi. 20 sn polling: useExceptions (FN-09 yerine onaylanan karar).
 * FN-14 "sifir is gucu" butonlari (tel:, Focus-on-Map) sonraki tur - payload hazir.
 */
import { useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDBadge from "components/MDBadge";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";
import { useAuthStore } from "store/useAuthStore";
import {
  useExceptions,
  ExceptionEvent,
  ResolveAction,
} from "hooks/useExceptions";

const SEVERITY_COLOR: Record<string, "error" | "warning" | "info" | "dark"> = {
  critical: "error",
  high: "warning",
  medium: "info",
  low: "dark",
};

const TYPE_LABEL: Record<string, string> = {
  eta_delay: "ETA Gecikmesi",
  driver_offline: "Sürücü Çevrimdışı",
  driver_location_mismatch: "Konum Uyumsuzluğu",
  compliance_zone_breach: "ZE-Zone İhlali",
  traffic_impact: "Trafik Etkisi",
  dock_conflict: "Rampa Çakışması",
};

const RESOLVE_OPTIONS: { value: ResolveAction; label: string }[] = [
  { value: "manual_replan", label: "Yeniden planlandı (manuel)" },
  { value: "manual_reassign", label: "Yeniden atandı (manuel)" },
  { value: "dismiss", label: "Kapat (aksiyon gerekmiyor)" },
];

function payloadSummary(e: ExceptionEvent): string {
  const p = e.detection_payload || {};
  const parts: string[] = [];
  if (p.task_no) parts.push(String(p.task_no));
  if (p.vehicle_plate) parts.push(String(p.vehicle_plate));
  if (p.eta_deviation_minutes) parts.push(`sapma ~${p.eta_deviation_minutes} dk`);
  if (p.remaining_km) parts.push(`kalan ${p.remaining_km} km`);
  if (p.distance_from_pickup_m) parts.push(`pickup'a ${p.distance_from_pickup_m} m`);
  if (p.silence_minutes_after_debounce) parts.push(`${p.silence_minutes_after_debounce} dk sessiz`);
  if (p.city) parts.push(`bölge: ${p.city}`);
  return parts.join(" · ") || "—";
}

export default function Exceptions(): JSX.Element {
  const token = useAuthStore((s) => s.token);
  const { exceptions, loading, error, newIds, resolve } = useExceptions(token);

  const [dialogFor, setDialogFor] = useState<ExceptionEvent | null>(null);
  const [action, setAction] = useState<ResolveAction>("dismiss");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    exceptions.forEach((e) => {
      c[e.severity] += 1;
    });
    return c;
  }, [exceptions]);

  const doAcknowledge = async (e: ExceptionEvent) => {
    setActionError(null);
    try {
      await resolve(e.id, "acknowledge");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const doResolve = async () => {
    if (!dialogFor) return;
    setBusy(true);
    setActionError(null);
    try {
      await resolve(dialogFor.id, action, comment || undefined);
      setDialogFor(null);
      setComment("");
      setAction("dismiss");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const table = useMemo(
    () => ({
      columns: [
        { Header: "Tip", accessor: "type", width: "18%" },
        { Header: "Önem", accessor: "severity", width: "10%" },
        { Header: "Durum", accessor: "status", width: "12%" },
        { Header: "Özet", accessor: "summary", width: "34%" },
        { Header: "Zaman", accessor: "time", width: "12%" },
        { Header: "Aksiyon", accessor: "actions", width: "14%" },
      ],
      rows: exceptions.map((e) => ({
        type: (
          <MDTypography
            variant="button"
            fontWeight={newIds.has(e.id) ? "bold" : "regular"}
            color={newIds.has(e.id) ? "error" : "text"}
          >
            {newIds.has(e.id) ? "● " : ""}
            {TYPE_LABEL[e.exception_type] || e.exception_type}
          </MDTypography>
        ),
        severity: (
          <MDBadge
            badgeContent={e.severity}
            color={SEVERITY_COLOR[e.severity] || "dark"}
            size="xs"
            container
          />
        ),
        status: (
          <MDTypography variant="caption" color="text">
            {e.status === "open" ? "AÇIK" : e.status === "acknowledged" ? "GÖRÜLDÜ" : e.status}
          </MDTypography>
        ),
        summary: (
          <MDTypography variant="caption" color="text">
            {payloadSummary(e)}
          </MDTypography>
        ),
        time: (
          <MDTypography variant="caption" color="text">
            {new Date(e.occurred_at).toLocaleString("tr-TR")}
          </MDTypography>
        ),
        actions: (
          <MDBox display="flex" gap={1}>
            {e.status === "open" && (
              <MDButton size="small" variant="outlined" color="info" onClick={() => doAcknowledge(e)}>
                Onayla
              </MDButton>
            )}
            <MDButton size="small" variant="gradient" color="success" onClick={() => setDialogFor(e)}>
              Çöz
            </MDButton>
          </MDBox>
        ),
      })),
    }),
    [exceptions, newIds]
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card>
          <MDBox p={3} display="flex" alignItems="center" justifyContent="space-between">
            <MDBox>
              <MDTypography variant="h5">İstisna Yönetimi (İkaz)</MDTypography>
              <MDTypography variant="caption" color="text">
                FEAT-010 · 20 sn otomatik yenileme · açık + görüldü olaylar
              </MDTypography>
            </MDBox>
            <MDBox display="flex" gap={1}>
              {(["critical", "high", "medium", "low"] as const).map((s) => (
                <MDBadge
                  key={s}
                  badgeContent={`${s}: ${counts[s]}`}
                  color={SEVERITY_COLOR[s]}
                  size="sm"
                  container
                />
              ))}
            </MDBox>
          </MDBox>
          {error && (
            <MDBox px={3} pb={1}>
              <MDTypography variant="caption" color="error">
                Veri alınamadı: {error}
              </MDTypography>
            </MDBox>
          )}
          {actionError && (
            <MDBox px={3} pb={1}>
              <MDTypography variant="caption" color="error">
                Aksiyon hatası: {actionError}
              </MDTypography>
            </MDBox>
          )}
          {loading ? (
            <MDBox p={3}>
              <MDTypography variant="button" color="text">
                Yükleniyor…
              </MDTypography>
            </MDBox>
          ) : exceptions.length === 0 ? (
            <MDBox p={3}>
              <MDTypography variant="button" color="text">
                Açık istisna yok — filo temiz. ✅
              </MDTypography>
            </MDBox>
          ) : (
            <DataTable table={table} entriesPerPage={false} showTotalEntries={false} isSorted={false} />
          )}
        </Card>
      </MDBox>

      <Dialog open={dialogFor !== null} onClose={() => setDialogFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>İstisnayı çöz</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2" mb={2}>
            {dialogFor ? TYPE_LABEL[dialogFor.exception_type] || dialogFor.exception_type : ""} —{" "}
            {dialogFor ? payloadSummary(dialogFor) : ""}
          </MDTypography>
          <TextField
            select
            fullWidth
            label="Çözüm aksiyonu"
            value={action}
            onChange={(ev) => setAction(ev.target.value as ResolveAction)}
            sx={{ mb: 2 }}
          >
            {RESOLVE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Yorum (opsiyonel)"
            value={comment}
            onChange={(ev) => setComment(ev.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <MDButton variant="text" color="secondary" onClick={() => setDialogFor(null)}>
            Vazgeç
          </MDButton>
          <MDButton variant="gradient" color="success" onClick={doResolve} disabled={busy}>
            {busy ? "Kaydediliyor…" : "Çöz ve Kapat"}
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

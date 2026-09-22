/**
 * FEAT-010 Dilim 4 - Istisna Yonetimi sayfasi (FN-13 ExceptionStatusPanel
 * + FN-14 ResolutionActionPanel MVP + FN-12 MVP sayfa-ici "yeni olay" vurgusu).
 * D4: StatusChip + DataTable + DataState; toast/banner `useNotifications`.
 * Dialog (çöz modal) D5 kapsamındadır — buradaki Dialog olduğu gibi bırakıldı.
 */
import { useCallback, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import DataState, { isDataStale, listFetchState } from "components/DataState";
import DataTable, { type DataColumn, type DataRow } from "components/DataTable";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import StatusChip from "components/StatusChip";
import { useNotifications } from "components/Notifications";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { ExceptionEvent, ResolveAction } from "hooks/useExceptions";
import { formatDateTime, useT, type TranslationKey } from "i18n";

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

function exceptionTypeLabel(type: string, translate: (key: TranslationKey) => string): string {
  const key = `status.exception.${type}` as TranslationKey;
  const label = translate(key);
  return label === key ? type : label;
}

function statusLabel(status: string, translate: (key: TranslationKey) => string): string {
  if (status === "open") return translate("exceptions.statusOpen");
  if (status === "acknowledged") return translate("exceptions.statusAcknowledged");
  if (status === "resolved") return translate("exceptions.statusResolved");
  return status;
}

export default function Exceptions(): JSX.Element {
  const { t, lang } = useT();
  const {
    exceptions,
    loading,
    error,
    newIds,
    lastOkAt,
    refresh,
    resolve,
  } = useNotifications();

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

  const doAcknowledge = useCallback(async (e: ExceptionEvent) => {
    setActionError(null);
    try {
      await resolve(e.id, "acknowledge");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [resolve]);

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

  const table = useMemo(() => {
    const columns: DataColumn[] = [
      { Header: t("exceptions.colType"), accessor: "type", minWidth: 140, truncate: true, primary: true },
      { Header: t("exceptions.colSeverity"), accessor: "severity", minWidth: 96, maxWidth: 120, primary: true },
      { Header: t("exceptions.colStatus"), accessor: "status", minWidth: 88, maxWidth: 110 },
      { Header: t("exceptions.colSummary"), accessor: "summary", minWidth: 160, flex: 1, truncate: true, primary: true },
      { Header: t("exceptions.colTime"), accessor: "time", minWidth: 120, maxWidth: 160 },
      { Header: t("exceptions.colActions"), accessor: "actions", minWidth: 140, maxWidth: 180 },
    ];

    const rows: DataRow[] = exceptions.map((e) => {
      const summary = payloadSummary(e);
      return {
        type: (
          <MDBox display="flex" alignItems="center" gap={0.75} title={exceptionTypeLabel(e.exception_type, t)}>
            {newIds.has(e.id) ? (
              <MDTypography variant="caption" color="error" fontWeight="bold">
                {t("exceptions.newDot")}
              </MDTypography>
            ) : null}
            <StatusChip kind="exception" value={e.exception_type} />
          </MDBox>
        ),
        severity: <StatusChip kind="alert" value={e.severity} />,
        status: (
          <MDTypography variant="caption" color="text">
            {statusLabel(e.status, t)}
          </MDTypography>
        ),
        summary: (
          <MDTypography variant="caption" color="text" noWrap title={summary}>
            {summary}
          </MDTypography>
        ),
        time: (
          <MDTypography variant="caption" color="text" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatDateTime(e.occurred_at, lang)}
          </MDTypography>
        ),
        actions: (
          <MDBox display="flex" gap={1}>
            {e.status === "open" && (
              <MDButton size="small" variant="outlined" color="info" onClick={() => void doAcknowledge(e)}>
                {t("exceptions.acknowledge")}
              </MDButton>
            )}
            <MDButton size="small" variant="gradient" color="success" onClick={() => setDialogFor(e)}>
              {t("exceptions.resolve")}
            </MDButton>
          </MDBox>
        ),
        id: e.id,
        _ariaLabel: summary,
      };
    });

    return { columns, rows };
  }, [exceptions, newIds, t, lang, doAcknowledge]);

  const state = listFetchState({
    isLoading: loading,
    isError: Boolean(error),
    data: loading ? undefined : exceptions,
    error,
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card>
          <MDBox p={3} display="flex" alignItems="center" justifyContent="space-between">
            <MDBox>
              <MDTypography variant="h5" component="h2">{t("exceptions.title")}</MDTypography>
              <MDTypography variant="caption" color="text">
                {t("exceptions.subtitle")}
              </MDTypography>
            </MDBox>
            <MDBox display="flex" gap={1} flexWrap="wrap">
              {(["critical", "high", "medium", "low"] as const).map((s) => (
                <MDBox key={s} display="flex" alignItems="center" gap={0.5}>
                  <StatusChip kind="alert" value={s} />
                  <MDTypography variant="caption">{counts[s]}</MDTypography>
                </MDBox>
              ))}
            </MDBox>
          </MDBox>
          {actionError && (
            <MDBox px={3} pb={1}>
              <MDTypography variant="caption" color="error">
                {t("common.errorWithMessage", { message: actionError })}
              </MDTypography>
            </MDBox>
          )}
          <DataState
            status={state}
            stale={isDataStale(lastOkAt)}
            staleWhen={lastOkAt}
            onRetry={() => {
              void refresh();
            }}
            emptyMessage={t("dataState.emptyExceptions")}
            emptyIcon="check_circle"
            errorMessage={error ?? undefined}
          >
            <DataTable
              table={table}
              loading={loading}
              ariaLabel={t("exceptions.title")}
              entriesPerPage={false}
              showTotalEntries={false}
              isSorted={false}
            />
          </DataState>
        </Card>
      </MDBox>

      <Dialog open={dialogFor !== null} onClose={() => setDialogFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>İstisnayı çöz</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2" mb={2}>
            {dialogFor ? exceptionTypeLabel(dialogFor.exception_type, t) : ""} —{" "}
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
          <MDButton variant="gradient" color="success" onClick={() => void doResolve()} disabled={busy}>
            {busy ? "Kaydediliyor…" : "Çöz ve Kapat"}
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

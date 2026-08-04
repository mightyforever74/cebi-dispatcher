/**
 * BulkConfirmDialog — BUG-2 Bulk Guard (2026-08-03, Cem onaylı).
 *
 * Optimize formunda N>1 araç seçiliyken submit anında açılan onay kapısı.
 * Fan-out sözleşmesi: onaylanırsa seçili HER araca aynı görevin 1 kopyası
 * optimize edilir (draft[i] → araç[i] indeks eşlemesi, Kanban'da sürüklenebilir).
 * N=1 akışı bu bileşene HİÇ uğramaz (tek bit değişmez — BUG-2 sözleşmesi).
 *
 * Tema: ConflictOverrideModal'ın birebir MD2 PRO deseni (aynı C sabit ailesi,
 * flat B2B, 1px border) — ama danger değil ACCENT tonu: bu bir hata değil,
 * bilinçli çoklu-atama onayıdır. Yeni desen icat edilmedi.
 */
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const C = {
  panelBg: "#1a2035",
  border: "#2c3454",
  accent: "#7C3AED",
  accentBg: "rgba(124,58,237,0.10)",
  textMuted: "#8f9bb3",
  textFaint: "#65718c",
};

interface BulkVehicle {
  id: string;
  plate: string;
}

interface Props {
  open: boolean;
  /** Seçili araçlar (plaka etiketiyle) — fan-out hedef listesi. */
  vehicles: BulkVehicle[];
  /** Submit isteği uçarken buton kilidi. */
  submitting?: boolean;
  onCancel: () => void;
  /** Onay — çağıran doSubmit() ile fan-out'u fırlatır. */
  onConfirm: () => void;
}

function BulkConfirmDialog({
  open,
  vehicles,
  submitting = false,
  onCancel,
  onConfirm,
}: Props): JSX.Element {
  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: C.panelBg,
          border: `1px solid ${C.accent}`,
          borderRadius: "12px",
          backgroundImage: "none",
        },
      }}
    >
      {/* Başlık */}
      <MDBox display="flex" alignItems="center" gap={1} px={2.5} pt={2.5} pb={1}>
        <MDBox
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: C.accentBg,
            border: `1px solid ${C.accent}`,
          }}
        >
          <Icon sx={{ color: C.accent }}>library_add</Icon>
        </MDBox>
        <MDBox>
          <MDTypography variant="h6" fontWeight="bold" color="white" sx={{ lineHeight: 1.2 }}>
            Toplu Görev Oluşturma
          </MDTypography>
          <MDTypography variant="caption" sx={{ color: C.textMuted }}>
            {vehicles.length} araç seçili — fan-out onayı
          </MDTypography>
        </MDBox>
      </MDBox>

      <MDBox px={2.5} pb={2.5}>
        {/* Sözleşme açıklaması */}
        <MDBox
          sx={{
            bgcolor: C.accentBg,
            border: `1px solid ${C.border}`,
            borderRadius: "10px",
            p: 1.5,
            mb: 1.5,
          }}
        >
          <MDTypography variant="button" color="white" sx={{ display: "block" }}>
            Seçili <b>{vehicles.length} araca</b> aynı görevin{" "}
            <b>1&apos;er kopyası</b> oluşturulacak.
          </MDTypography>
          <MDTypography variant="caption" sx={{ color: C.textMuted, display: "block", mt: 0.5 }}>
            Atamalar onay ekranında (Kanban) sürüklenerek değiştirilebilir.
          </MDTypography>
        </MDBox>

        {/* Plaka listesi */}
        <MDBox
          sx={{
            border: `1px solid ${C.border}`,
            borderRadius: "10px",
            p: 1.5,
            mb: 0.5,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {vehicles.map((v) => (
            <MDTypography
              key={v.id}
              variant="caption"
              sx={{ color: C.textMuted, display: "block", fontFamily: "monospace" }}
            >
              • {v.plate}
            </MDTypography>
          ))}
        </MDBox>

        <Divider sx={{ my: 1.5, borderColor: C.border }} />

        {/* Aksiyonlar */}
        <MDBox display="flex" gap={1}>
          <MDBox
            component="button"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            sx={{
              flex: 1,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.textMuted,
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              fontSize: "13px",
              fontWeight: 600,
              "&:hover": { color: "#fff", borderColor: C.accent },
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            Vazgeç
          </MDBox>
          <MDBox
            component="button"
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            sx={{
              flex: 2,
              border: "none",
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              background: `linear-gradient(135deg, ${C.accent}, #5b21b6)`,
              "&:hover": { filter: "brightness(1.08)" },
              "&:disabled": {
                opacity: 0.45,
                cursor: "not-allowed",
                filter: "none",
              },
            }}
          >
            {submitting ? "Gönderiliyor..." : `${vehicles.length} Araca Oluştur`}
          </MDBox>
        </MDBox>
      </MDBox>
    </Dialog>
  );
}

export default BulkConfirmDialog;

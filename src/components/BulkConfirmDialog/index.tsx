/**
 * BulkConfirmDialog — BUG-2 Bulk Guard + UI Modernizasyonu (04.08.2026).
 *
 * Fan-out sözleşmesi DEĞİŞMEDİ: N>1 seçimde onay kapısı; onaylanırsa her
 * araca aynı görevin 1 kopyası (draft[i] → araç[i]); N=1 akışı buraya uğramaz.
 * Yenilik: gövde ortak ConfirmDialogShell'den (accent severity), plakalar
 * taranabilir pill rozetler halinde.
 */
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfirmDialogShell, { SHELL_C } from "components/ConfirmDialogShell";

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
    <ConfirmDialogShell
      open={open}
      severity="accent"
      icon="library_add"
      title="Toplu Görev Oluşturma"
      subtitle={`${vehicles.length} araç seçili — toplu oluşturma onayı`}
      submitting={submitting}
      confirmLabel={`${vehicles.length} Araca Oluştur`}
      submittingLabel="Gönderiliyor..."
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {/* Sözleşme açıklaması */}
      <MDBox
        sx={{
          bgcolor: SHELL_C.accentBg,
          border: `1px solid ${SHELL_C.border}`,
          borderRadius: "12px",
          p: 1.5,
          mb: 1.5,
        }}
      >
        <MDTypography variant="button" color="white" sx={{ display: "block" }}>
          Seçili <b>{vehicles.length} araca</b> aynı görevin{" "}
          <b>1&apos;er kopyası</b> oluşturulacak.
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: SHELL_C.textMuted, display: "block", mt: 0.5 }}>
          Atamalar onay ekranında (Kanban) sürüklenerek değiştirilebilir.
        </MDTypography>
      </MDBox>

      {/* Plaka rozetleri — taranabilir pill formu */}
      <MDBox
        display="flex"
        flexWrap="wrap"
        gap={0.7}
        sx={{
          border: `1px solid ${SHELL_C.border}`,
          borderRadius: "12px",
          p: 1.5,
          mb: 0.5,
          maxHeight: 160,
          overflowY: "auto",
        }}
      >
        {vehicles.map((v) => (
          <MDBox
            key={v.id}
            sx={{
              border: `1px solid ${SHELL_C.accent}`,
              bgcolor: SHELL_C.accentBg,
              color: "#fff",
              borderRadius: "999px",
              px: 1.2,
              py: 0.3,
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          >
            {v.plate}
          </MDBox>
        ))}
      </MDBox>
    </ConfirmDialogShell>
  );
}

export default BulkConfirmDialog;

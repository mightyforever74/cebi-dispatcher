/**
 * BulkConfirmDialog — BUG-2 Bulk Guard + UI Modernizasyonu (04.08.2026).
 *
 * Fan-out sözleşmesi DEĞİŞMEDİ: N>1 seçimde onay kapısı; onaylanırsa her
 * araca aynı görevin 1 kopyası (draft[i] → araç[i]); N=1 akışı buraya uğramaz.
 */
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfirmDialogShell, { SHELL_C } from "components/ConfirmDialogShell";
import { useT } from "i18n";

interface BulkVehicle {
  id: string;
  plate: string;
}

interface Props {
  open: boolean;
  vehicles: BulkVehicle[];
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function BulkConfirmDialog({
  open,
  vehicles,
  submitting = false,
  onCancel,
  onConfirm,
}: Props): JSX.Element {
  const { t } = useT();
  const count = vehicles.length;
  return (
    <ConfirmDialogShell
      open={open}
      severity="accent"
      icon="library_add"
      title={t("bulk.title")}
      subtitle={t("bulk.subtitle", { count })}
      submitting={submitting}
      confirmLabel={t("bulk.confirm", { count })}
      submittingLabel={t("bulk.submitting")}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
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
          {t("bulk.body", { count })}
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: SHELL_C.textMuted, display: "block", mt: 0.5 }}>
          {t("bulk.bodyHint")}
        </MDTypography>
      </MDBox>

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

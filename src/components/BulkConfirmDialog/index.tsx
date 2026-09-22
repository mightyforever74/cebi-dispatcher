/**
 * BulkConfirmDialog — BUG-2 Bulk Guard. Fan-out sozlesmesi degismedi.
 */
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfirmDialogShell, { useDialogChrome } from "components/ConfirmDialogShell";
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
  const chrome = useDialogChrome();
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
          bgcolor: chrome.accentBg,
          border: `1px solid ${chrome.border}`,
          borderRadius: "12px",
          p: 1.5,
          mb: 1.5,
        }}
      >
        <MDTypography variant="button" sx={{ display: "block", color: chrome.text }}>
          {t("bulk.body", { count })}
        </MDTypography>
        <MDTypography variant="caption" sx={{ color: chrome.textMuted, display: "block", mt: 0.5 }}>
          {t("bulk.bodyHint")}
        </MDTypography>
      </MDBox>

      <MDBox
        display="flex"
        flexWrap="wrap"
        gap={0.7}
        sx={{
          border: `1px solid ${chrome.border}`,
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
              border: `1px solid ${chrome.accent}`,
              bgcolor: chrome.accentBg,
              color: chrome.onAccent,
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

/**
 * ConflictOverrideModal — BUG-1 Faz C çekirdeği.
 * Davranış sözleşmesi DEĞİŞMEDİ: zorunlu ≥5 karakter gerekçe.
 */
import { useEffect, useState } from "react";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfirmDialogShell, {
  CopyChip,
  DetailRow,
  ShellSeverity,
  useDialogChrome,
} from "components/ConfirmDialogShell";
import { useT } from "i18n";

import { ConflictMetadata } from "hooks/useTaskOptimization";

const SEVERITY_THRESHOLD_MIN = 15;
const REASON_MIN = 5;

interface Props {
  open: boolean;
  conflict: ConflictMetadata | null;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

function ConflictOverrideModal({
  open,
  conflict,
  submitting = false,
  onCancel,
  onConfirm,
}: Props): JSX.Element {
  const { t } = useT();
  const chrome = useDialogChrome();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const reasonOk = reason.trim().length >= REASON_MIN;
  const severity: ShellSeverity =
    conflict && conflict.overlap_minutes < SEVERITY_THRESHOLD_MIN ? "warning" : "danger";

  return (
    <ConfirmDialogShell
      open={open}
      severity={severity}
      icon="warning_amber"
      title={t("conflict.title")}
      subtitle={t("conflict.subtitle")}
      submitting={submitting}
      confirmLabel={t("conflict.confirm")}
      submittingLabel={t("conflict.submitting")}
      confirmDisabled={!reasonOk}
      onCancel={onCancel}
      onConfirm={() => reasonOk && onConfirm(reason.trim())}
      reason={{
        value: reason,
        onChange: setReason,
        label: t("conflict.reasonLabel"),
        placeholder: t("conflict.reasonPlaceholder"),
        helperText: reasonOk ? t("conflict.auditNote") : t("dialog.reasonMin", { n: REASON_MIN }),
        required: true,
        minLength: REASON_MIN,
      }}
    >
      <MDBox
        sx={{
          bgcolor: chrome.cardWash,
          border: `1px solid ${chrome.border}`,
          borderRadius: "12px",
          p: 1.5,
          mb: 1.5,
        }}
      >
        {conflict ? (
          <>
            <DetailRow
              label={t("conflict.task")}
              value={<CopyChip text={conflict.conflicting_task_no} color={severity} />}
            />
            <DetailRow
              label={t("conflict.duration")}
              value={t("conflict.durationValue", { n: conflict.overlap_minutes })}
            />
          </>
        ) : (
          <MDTypography variant="caption" sx={{ color: chrome.text }}>
            {t("conflict.fallback")}
          </MDTypography>
        )}
      </MDBox>
    </ConfirmDialogShell>
  );
}

export default ConflictOverrideModal;

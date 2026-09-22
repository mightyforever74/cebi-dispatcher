/**
 * ConflictOverrideModal — BUG-1 Faz C çekirdeği + UI Modernizasyonu
 * (04.08.2026, Cem onaylı plan: jargonsuz microcopy, KV kartı, K1 severity).
 *
 * Davranış sözleşmesi DEĞİŞMEDİ: zorunlu ≥5 karakter gerekçe, Vazgeç /
 * Gerekçeli Onay yolları, çağıran approve'u override:true ile yeniden fırlatır.
 */
import { useEffect, useState } from "react";

import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfirmDialogShell, {
  CopyChip,
  DetailRow,
  SHELL_C,
  ShellSeverity,
} from "components/ConfirmDialogShell";
import { useT } from "i18n";

import { ConflictMetadata } from "hooks/useTaskOptimization";

/** K1 eşiği: bu dakikanın altı "dikkat" (turuncu), üstü "kritik" (kırmızı). */
const SEVERITY_THRESHOLD_MIN = 15;
const REASON_MIN = 5;

interface Props {
  open: boolean;
  /** Köprünün 409 gövdesindeki mühür; null ise genel mesaj gösterilir. */
  conflict: ConflictMetadata | null;
  /** Override isteği uçarken buton kilidi. */
  submitting?: boolean;
  onCancel: () => void;
  /** Zorunlu gerekçeyle "Gerekçeli Onay" — çağıran approve'u override ile yeniden atar. */
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
    >
      <MDBox
        sx={{
          bgcolor: "rgba(255,255,255,0.03)",
          border: `1px solid ${SHELL_C.border}`,
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
          <MDTypography variant="caption" color="white">
            {t("conflict.fallback")}
          </MDTypography>
        )}
      </MDBox>

      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        label={t("conflict.reasonLabel")}
        InputLabelProps={{ shrink: true }}
        placeholder={t("conflict.reasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={submitting}
        required
        inputProps={{ "aria-required": true }}
        helperText={reasonOk ? undefined : t("dialog.reasonMin", { n: REASON_MIN })}
        sx={{
          mt: 0.5,
          "& .MuiInputLabel-root": { color: SHELL_C.textMuted, fontSize: "13px" },
          "& .MuiInputLabel-root.Mui-focused": { color: SHELL_C.accent },
          "& .MuiOutlinedInput-root": {
            color: "white",
            fontSize: "13px",
            bgcolor: SHELL_C.inputBg,
            "& fieldset": { borderColor: SHELL_C.border },
            "&:hover fieldset": { borderColor: SHELL_C.accent },
            "&.Mui-focused fieldset": { borderColor: SHELL_C.accent },
          },
          "& .MuiInputBase-input::placeholder": { color: SHELL_C.textFaint, opacity: 1 },
        }}
      />
      <MDTypography variant="caption" sx={{ color: SHELL_C.textFaint, display: "block", mt: 0.5 }}>
        {t("conflict.auditNote")}
      </MDTypography>
    </ConfirmDialogShell>
  );
}

export default ConflictOverrideModal;

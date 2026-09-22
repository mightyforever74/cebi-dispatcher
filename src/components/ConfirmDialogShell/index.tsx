/**
 * ConfirmDialogShell — dispatcher ikaz/onay modallarinin ORTAK govdesi.
 * D5: token'lı light/dark chrome, Esc/Enter, odak tuzağı, aria, spinner.
 * Tehlikeli aksiyon: ilk adım nötr (accent), onay adımı kırmızı.
 */
import { ReactNode, useEffect, useId, useState, type KeyboardEvent } from "react";

import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";

import { dialog } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useMaterialUIController } from "context";
import { useT } from "i18n";

export type ShellSeverity = "danger" | "warning" | "accent";

export interface DialogChrome {
  panelBg: string;
  border: string;
  inputBg: string;
  textMuted: string;
  textFaint: string;
  text: string;
  cardWash: string;
  danger: string;
  dangerDark: string;
  dangerBg: string;
  warning: string;
  warningDark: string;
  warningBg: string;
  accent: string;
  accentDark: string;
  accentBg: string;
  onAccent: string;
}

export function useDialogChrome(): DialogChrome {
  const [controller] = useMaterialUIController();
  const tone = controller.darkMode ? dialog.dark : dialog.light;
  return {
    ...tone,
    danger: dialog.danger,
    dangerDark: dialog.dangerDark,
    dangerBg: dialog.dangerBg,
    warning: dialog.warning,
    warningDark: dialog.warningDark,
    warningBg: dialog.warningBg,
    accent: dialog.accent,
    accentDark: dialog.accentDark,
    accentBg: dialog.accentBg,
    onAccent: dialog.onAccent,
  };
}

/** @deprecated use useDialogChrome() — kept as dark defaults for CopyChip callers. */
export const SHELL_C = {
  panelBg: dialog.dark.panelBg,
  border: dialog.dark.border,
  danger: dialog.danger,
  dangerDark: dialog.dangerDark,
  dangerBg: dialog.dangerBg,
  warning: dialog.warning,
  warningDark: dialog.warningDark,
  warningBg: dialog.warningBg,
  accent: dialog.accent,
  accentDark: dialog.accentDark,
  accentBg: dialog.accentBg,
  inputBg: dialog.dark.inputBg,
  textMuted: dialog.dark.textMuted,
  textFaint: dialog.dark.textFaint,
};

const SEV: Record<ShellSeverity, { main: string; dark: string; bg: string }> = {
  danger: { main: dialog.danger, dark: dialog.dangerDark, bg: dialog.dangerBg },
  warning: { main: dialog.warning, dark: dialog.warningDark, bg: dialog.warningBg },
  accent: { main: dialog.accent, dark: dialog.accentDark, bg: dialog.accentBg },
};

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): JSX.Element {
  const chrome = useDialogChrome();
  return (
    <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={1} py={0.4}>
      <MDTypography variant="caption" sx={{ color: chrome.textMuted }}>
        {label}
      </MDTypography>
      {typeof value === "string" ? (
        <MDTypography variant="caption" fontWeight="bold" sx={{ color: chrome.text }}>
          {value}
        </MDTypography>
      ) : (
        value
      )}
    </MDBox>
  );
}

export function CopyChip({
  text,
  color,
}: {
  text: string;
  color: ShellSeverity;
}): JSX.Element {
  const { t } = useT();
  const chrome = useDialogChrome();
  const [copied, setCopied] = useState(false);
  const sev = SEV[color];
  return (
    <MDBox
      component="button"
      type="button"
      title={t("dialog.copyToClipboard")}
      onClick={() => {
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      sx={{
        border: `1px solid ${sev.main}`,
        bgcolor: sev.bg,
        color: chrome.onAccent,
        cursor: "pointer",
        borderRadius: "999px",
        px: 1.2,
        py: 0.3,
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "monospace",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {copied ? t("dialog.copied") : text}
    </MDBox>
  );
}

export interface ReasonField {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  minLength?: number;
}

interface Props {
  open: boolean;
  severity: ShellSeverity;
  icon: string;
  title: string;
  subtitle?: string;
  submitting?: boolean;
  children?: ReactNode;
  reason?: ReasonField;
  cancelLabel?: string;
  confirmLabel: string;
  submittingLabel?: string;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialogShell({
  open,
  severity,
  icon,
  title,
  subtitle,
  submitting = false,
  children,
  reason,
  cancelLabel,
  confirmLabel,
  submittingLabel,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: Props): JSX.Element {
  const { t } = useT();
  const chrome = useDialogChrome();
  const titleId = useId();
  const descId = useId();
  const resolvedCancel = cancelLabel ?? t("dialog.cancel");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) setArmed(false);
  }, [open]);

  const reasonOk =
    !reason ||
    !reason.required ||
    reason.value.trim().length >= (reason.minLength ?? 1);

  const needsArm = severity === "danger";
  const showDanger = needsArm ? armed : severity !== "accent";
  const chromeSev: ShellSeverity = showDanger ? severity : "accent";
  const sev = SEV[chromeSev];
  const blocked = confirmDisabled || submitting || !reasonOk;
  const primaryLabel =
    needsArm && !armed ? t("dialog.continue") : submitting ? submittingLabel || t("dialog.submitting") : confirmLabel;

  const fireConfirm = () => {
    if (blocked) return;
    if (needsArm && !armed) {
      setArmed(true);
      return;
    }
    onConfirm();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (!submitting) onCancel();
      return;
    }
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement | null;
    const inTextarea = target?.tagName === "TEXTAREA";
    if (inTextarea && !event.ctrlKey && !event.metaKey) return;
    if (!reasonOk || blocked) return;
    event.preventDefault();
    fireConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={submitting}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? descId : undefined}
      aria-modal="true"
      onKeyDown={onKeyDown}
      PaperProps={{
        sx: {
          bgcolor: chrome.panelBg,
          border: `1px solid ${sev.main}`,
          borderRadius: `${dialog.radiusPx}px`,
          backgroundImage: "none",
        },
      }}
    >
      <MDBox display="flex" alignItems="center" gap={1} px={2.5} pt={2.5} pb={1}>
        <MDBox
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: sev.bg,
            border: `1px solid ${sev.main}`,
          }}
        >
          <Icon aria-hidden sx={{ color: sev.main }}>
            {icon}
          </Icon>
        </MDBox>
        <MDBox>
          <MDTypography
            id={titleId}
            component="h2"
            variant="h6"
            fontWeight="bold"
            sx={{ lineHeight: 1.2, color: chrome.text }}
          >
            {title}
          </MDTypography>
          {subtitle && (
            <MDTypography id={descId} variant="caption" sx={{ color: chrome.textMuted }}>
              {subtitle}
            </MDTypography>
          )}
        </MDBox>
      </MDBox>

      <MDBox px={2.5} pb={2.5}>
        {children}

        {reason && (
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            autoFocus
            label={reason.label}
            InputLabelProps={{ shrink: true }}
            placeholder={reason.placeholder}
            value={reason.value}
            onChange={(e) => reason.onChange(e.target.value)}
            disabled={submitting}
            required={reason.required}
            helperText={reason.helperText}
            inputProps={{ "aria-required": reason.required ? true : undefined }}
            sx={{
              mt: 0.5,
              "& .MuiInputLabel-root": { color: chrome.textMuted, fontSize: "13px" },
              "& .MuiInputLabel-root.Mui-focused": { color: dialog.accent },
              "& .MuiOutlinedInput-root": {
                color: chrome.text,
                fontSize: "13px",
                bgcolor: chrome.inputBg,
                "& fieldset": { borderColor: chrome.border },
                "&:hover fieldset": { borderColor: dialog.accent },
                "&.Mui-focused fieldset": { borderColor: dialog.accent },
              },
              "& .MuiInputBase-input::placeholder": { color: chrome.textFaint, opacity: 1 },
              "& .MuiFormHelperText-root": { color: chrome.textFaint },
            }}
          />
        )}

        <Divider sx={{ my: 1.5, borderColor: chrome.border }} />

        <MDBox display="flex" gap={1}>
          <MDBox
            component="button"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            sx={{
              flex: 1,
              border: `1px solid ${chrome.border}`,
              background: "transparent",
              color: chrome.textMuted,
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              fontSize: "13px",
              fontWeight: 600,
              "&:hover": { color: chrome.text, borderColor: sev.main },
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            {resolvedCancel}
          </MDBox>
          <MDBox
            component="button"
            type="button"
            onClick={fireConfirm}
            disabled={blocked}
            sx={{
              flex: 2,
              border: "none",
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              color: chrome.onAccent,
              fontWeight: 600,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              background: `linear-gradient(135deg, ${sev.main}, ${sev.dark})`,
              "&:hover": { filter: "brightness(1.08)" },
              "&:disabled": {
                opacity: 0.45,
                cursor: "not-allowed",
                filter: "none",
              },
            }}
          >
            {submitting && <CircularProgress size={14} sx={{ color: chrome.onAccent }} />}
            {primaryLabel}
          </MDBox>
        </MDBox>
      </MDBox>
    </Dialog>
  );
}

export default ConfirmDialogShell;

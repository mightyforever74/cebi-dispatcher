/**
 * ConfirmDialogShell — dispatcher ikaz/onay modallarinin ORTAK govdesi
 * (04.08.2026, Cem onayli UI modernizasyon plani, K1/K2/K3).
 *
 * Standart: yumusak ikaz halkasi (dairesel, severity rengi) + baslik/altbaslik
 * (teknik jargon YOK — HTTP kodlari kullaniciya gosterilmez), govde (children),
 * Divider, "Vazgec" + severity-gradyanli onay butonu.
 * Yardimcilar: DetailRow (KV satiri), CopyChip (tikla-kopyala rozet).
 * Severity: danger (kirmizi) | warning (turuncu) | accent (mor).
 * ConflictOverrideModal + BulkConfirmDialog bu shell'i kullanir; gelecekteki
 * her ikaz kutusu ayni standardi otomatik alir. MD2 PRO flat B2B, 1px border.
 */
import { ReactNode, useState } from "react";

import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

export const SHELL_C = {
  panelBg: "#1a2035",
  border: "#2c3454",
  danger: "#f44336",
  dangerDark: "#b71c1c",
  dangerBg: "rgba(244,67,54,0.08)",
  warning: "#ff9800",
  warningDark: "#e65100",
  warningBg: "rgba(255,152,0,0.10)",
  accent: "#7C3AED",
  accentDark: "#5b21b6",
  accentBg: "rgba(124,58,237,0.10)",
  inputBg: "#131826",
  // Cem microcopy karari (04.08): silik griler #B0BEC5 okunabilirligine cekildi
  textMuted: "#B0BEC5",
  textFaint: "#8f9bb3",
};

export type ShellSeverity = "danger" | "warning" | "accent";

const SEV: Record<ShellSeverity, { main: string; dark: string; bg: string }> = {
  danger: { main: SHELL_C.danger, dark: SHELL_C.dangerDark, bg: SHELL_C.dangerBg },
  warning: { main: SHELL_C.warning, dark: SHELL_C.warningDark, bg: SHELL_C.warningBg },
  accent: { main: SHELL_C.accent, dark: SHELL_C.accentDark, bg: SHELL_C.accentBg },
};

/** KV satiri: sol etiket (muted) — sag deger (string ise beyaz bold, degilse node). */
export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): JSX.Element {
  return (
    <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={1} py={0.4}>
      <MDTypography variant="caption" sx={{ color: SHELL_C.textMuted }}>
        {label}
      </MDTypography>
      {typeof value === "string" ? (
        <MDTypography variant="caption" fontWeight="bold" color="white">
          {value}
        </MDTypography>
      ) : (
        value
      )}
    </MDBox>
  );
}

/** Tikla-kopyala rozet: panoya kopyalar, 1.5 sn "Kopyalandi" geri bildirimi. */
export function CopyChip({
  text,
  color,
}: {
  text: string;
  color: ShellSeverity;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const sev = SEV[color];
  return (
    <MDBox
      component="button"
      type="button"
      title="Copy to clipboard"
      onClick={() => {
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      sx={{
        border: `1px solid ${sev.main}`,
        bgcolor: sev.bg,
        color: "#fff",
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
      {copied ? "Copied ✓" : text}
    </MDBox>
  );
}

interface Props {
  open: boolean;
  severity: ShellSeverity;
  /** Material icon adi (or. warning_amber, library_add). */
  icon: string;
  title: string;
  /** Operasyonel altbaslik — teknik jargon (HTTP kodu vb.) KONULMAZ. */
  subtitle?: string;
  submitting?: boolean;
  children: ReactNode;
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
  cancelLabel = "Discard",
  confirmLabel,
  submittingLabel,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: Props): JSX.Element {
  const sev = SEV[severity];
  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: SHELL_C.panelBg,
          border: `1px solid ${sev.main}`,
          borderRadius: "16px",
          backgroundImage: "none",
        },
      }}
    >
      {/* Baslik — yumusak dairesel ikaz halkasi */}
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
          <Icon sx={{ color: sev.main }}>{icon}</Icon>
        </MDBox>
        <MDBox>
          <MDTypography variant="h6" fontWeight="bold" color="white" sx={{ lineHeight: 1.2 }}>
            {title}
          </MDTypography>
          {subtitle && (
            <MDTypography variant="caption" sx={{ color: SHELL_C.textMuted }}>
              {subtitle}
            </MDTypography>
          )}
        </MDBox>
      </MDBox>

      <MDBox px={2.5} pb={2.5}>
        {children}

        <Divider sx={{ my: 1.5, borderColor: SHELL_C.border }} />

        {/* Aksiyonlar */}
        <MDBox display="flex" gap={1}>
          <MDBox
            component="button"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            sx={{
              flex: 1,
              border: `1px solid ${SHELL_C.border}`,
              background: "transparent",
              color: SHELL_C.textMuted,
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              fontSize: "13px",
              fontWeight: 600,
              "&:hover": { color: "#fff", borderColor: sev.main },
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            {cancelLabel}
          </MDBox>
          <MDBox
            component="button"
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || submitting}
            sx={{
              flex: 2,
              border: "none",
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              background: `linear-gradient(135deg, ${sev.main}, ${sev.dark})`,
              "&:hover": { filter: "brightness(1.08)" },
              "&:disabled": {
                opacity: 0.45,
                cursor: "not-allowed",
                filter: "none",
              },
            }}
          >
            {submitting ? submittingLabel || confirmLabel : confirmLabel}
          </MDBox>
        </MDBox>
      </MDBox>
    </Dialog>
  );
}

export default ConfirmDialogShell;

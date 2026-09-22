/**
 * FEAT-010:FN-20 — OverrideReasonDialog. Sebep opsiyonel.
 */
import { useState } from "react";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfirmDialogShell, { DetailRow, useDialogChrome } from "components/ConfirmDialogShell";
import { useT, type TranslationKey } from "i18n";
import { OVERRIDE_REASON_OPTIONS } from "services/dispatch/decisionLog";

interface Props {
  open: boolean;
  chosenPlate?: string;
  recommendedPlate?: string;
  onCancel: () => void;
  onConfirm: (reason: string | null) => void;
}

function Pill({ text, accent }: { text: string; accent: boolean }): JSX.Element {
  const chrome = useDialogChrome();
  return (
    <MDBox
      sx={{
        border: `1px solid ${accent ? chrome.accent : chrome.border}`,
        bgcolor: accent ? chrome.accentBg : "transparent",
        color: chrome.onAccent,
        borderRadius: "999px",
        px: 1.2,
        py: 0.3,
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "monospace",
        display: "inline-flex",
      }}
    >
      {text}
    </MDBox>
  );
}

export default function OverrideReasonDialog({
  open,
  chosenPlate,
  recommendedPlate,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useT();
  const chrome = useDialogChrome();
  const [reason, setReason] = useState<string>("");
  const handleConfirm = () => {
    onConfirm(reason === "" ? null : reason);
    setReason("");
  };
  const handleCancel = () => {
    setReason("");
    onCancel();
  };
  return (
    <ConfirmDialogShell
      open={open}
      severity="accent"
      icon="swap_horiz"
      title={t("override.title")}
      subtitle={t("override.subtitle")}
      confirmLabel={t("override.confirm")}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    >
      <MDTypography variant="caption" sx={{ color: chrome.textMuted, display: "block", mb: 1.5 }}>
        {t("override.body")}
      </MDTypography>

      {(chosenPlate || recommendedPlate) && (
        <MDBox
          sx={{
            bgcolor: chrome.cardWash,
            border: `1px solid ${chrome.border}`,
            borderRadius: "12px",
            p: 1.5,
            mb: 1.5,
          }}
        >
          {chosenPlate && (
            <DetailRow label={t("override.chosen")} value={<Pill text={chosenPlate} accent />} />
          )}
          {recommendedPlate && (
            <DetailRow
              label={t("override.recommended")}
              value={<Pill text={recommendedPlate} accent={false} />}
            />
          )}
        </MDBox>
      )}

      <TextField
        select
        fullWidth
        size="small"
        autoFocus
        label={t("override.reasonLabel")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: {
                bgcolor: chrome.panelBg,
                border: `1px solid ${chrome.border}`,
                color: chrome.text,
                "& .MuiMenuItem-root": { fontSize: "13px" },
              },
            },
          },
        }}
        sx={{
          mt: 0.5,
          "& .MuiInputLabel-root": { color: chrome.textMuted, fontSize: "13px" },
          "& .MuiInputLabel-root.Mui-focused": { color: chrome.accent },
          "& .MuiOutlinedInput-root": {
            color: chrome.text,
            fontSize: "13px",
            bgcolor: chrome.inputBg,
            "& fieldset": { borderColor: chrome.border },
            "&:hover fieldset": { borderColor: chrome.accent },
            "&.Mui-focused fieldset": { borderColor: chrome.accent },
          },
          "& .MuiSvgIcon-root": { color: chrome.textMuted },
        }}
      >
        <MenuItem value="">{t("override.none")}</MenuItem>
        {OVERRIDE_REASON_OPTIONS.map((o) => {
          const key = `overrideReason.${o.value}` as TranslationKey;
          return (
            <MenuItem key={o.value} value={o.value}>
              {t(key)}
            </MenuItem>
          );
        })}
      </TextField>
      <MDTypography variant="caption" sx={{ color: chrome.textFaint, display: "block", mt: 0.5 }}>
        {t("override.auditNote")}
      </MDTypography>
    </ConfirmDialogShell>
  );
}

/**
 * FEAT-010:FN-20 — <OverrideReasonDialog /> + UI Modernizasyonu (04.08.2026).
 *
 * Sözleşme DEĞİŞMEDİ (spec v1.8, #20): scorer #1 dışında araç seçilince
 * approve öncesi TEK soru; sebep OPSİYONEL — boş override da sinyaldir,
 * dialog approve'u engelleyemez. onConfirm(reason: string | null) aynı.
 * Yenilikler (Cem onaylı regression fix + K4):
 *  - Gövde ortak ConfirmDialogShell (accent — hata değil, bilinçli tercih).
 *  - Label/çizgi çakışması: Conflict modalında kanıtlı dark TextField reçetesi.
 *  - Çiğ yeşil buton → accent gradyan "Onayla ve Devam Et".
 *  - K4: opsiyonel chosenPlate/recommendedPlate chip'leri — sayfa kablolayana
 *    kadar görünmez (geriye dönük uyumlu, props'suz çağrı bugünkü gibi çalışır).
 */
import { useState } from "react";

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfirmDialogShell, { DetailRow, SHELL_C } from "components/ConfirmDialogShell";
import { OVERRIDE_REASON_OPTIONS } from "services/dispatch/decisionLog";

interface Props {
  open: boolean;
  /** K4 (opsiyonel): dispatcher'ın seçtiği araç plakası — chip olarak gösterilir. */
  chosenPlate?: string;
  /** K4 (opsiyonel): scorer #1 önerisinin plakası — karşılaştırma chip'i. */
  recommendedPlate?: string;
  onCancel: () => void;
  onConfirm: (reason: string | null) => void;
}

function Pill({ text, accent }: { text: string; accent: boolean }): JSX.Element {
  return (
    <MDBox
      sx={{
        border: `1px solid ${accent ? SHELL_C.accent : SHELL_C.border}`,
        bgcolor: accent ? SHELL_C.accentBg : "transparent",
        color: "#fff",
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
      title="Öneri dışında araç seçtiniz"
      subtitle="Skor önerisinden farklı bir tercih yaptınız."
      confirmLabel="Onayla ve Devam Et"
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    >
      <MDTypography variant="caption" sx={{ color: SHELL_C.textMuted, display: "block", mb: 1.5 }}>
        Skor sıralamasının #1 önerisi yerine farklı bir araç atadınız. Sebebini
        belirtmek ister misiniz? (İsteğe bağlı — boş bırakabilirsiniz.)
      </MDTypography>

      {/* K4: seçim vs öneri karşılaştırma kartı (props geldiyse) */}
      {(chosenPlate || recommendedPlate) && (
        <MDBox
          sx={{
            bgcolor: "rgba(255,255,255,0.03)",
            border: `1px solid ${SHELL_C.border}`,
            borderRadius: "12px",
            p: 1.5,
            mb: 1.5,
          }}
        >
          {chosenPlate && (
            <DetailRow label="Seçilen Araç" value={<Pill text={chosenPlate} accent />} />
          )}
          {recommendedPlate && (
            <DetailRow
              label="Skor Önerisi (#1)"
              value={<Pill text={recommendedPlate} accent={false} />}
            />
          )}
        </MDBox>
      )}

      <TextField
        select
        fullWidth
        size="small"
        label="Override sebebi (opsiyonel)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: {
                bgcolor: SHELL_C.panelBg,
                border: `1px solid ${SHELL_C.border}`,
                color: "#fff",
                "& .MuiMenuItem-root": { fontSize: "13px" },
              },
            },
          },
        }}
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
          "& .MuiSvgIcon-root": { color: SHELL_C.textMuted },
        }}
      >
        <MenuItem value="">— Belirtmek istemiyorum —</MenuItem>
        {OVERRIDE_REASON_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
      <MDTypography variant="caption" sx={{ color: SHELL_C.textFaint, display: "block", mt: 0.5 }}>
        ℹ️ Tercih ve sebep karar kaydına (Audit Log) işlenir.
      </MDTypography>
    </ConfirmDialogShell>
  );
}

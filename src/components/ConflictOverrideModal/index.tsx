/**
 * ConflictOverrideModal — BUG-1 Faz C çekirdeği + UI Modernizasyonu
 * (04.08.2026, Cem onaylı plan: jargonsuz microcopy, KV kartı, K1 severity).
 *
 * Davranış sözleşmesi DEĞİŞMEDİ: zorunlu ≥5 karakter gerekçe, Vazgeç /
 * Gerekçeli Onay yolları, çağıran approve'u override:true ile yeniden fırlatır.
 * Yenilikler:
 *  - HTTP 409 kullanıcıya gösterilmez — altbaşlık operasyonel dilde.
 *  - Çakışma detayı Structured KV kartı: kopyalanabilir görev rozeti + süre.
 *  - K1 (Cem onaylı): overlap < 15 dk → turuncu (warning), ≥ 15 dk → kırmızı
 *    (danger); modal çerçevesi, halka ve rozet birlikte döner.
 *  - K2: onay butonu "Riski Onayla ve Görevi Ata".
 *  - Gövde ortak ConfirmDialogShell'den gelir (tek standart, tüm ikaz kutuları).
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

import { ConflictMetadata } from "hooks/useTaskOptimization";

/** K1 eşiği: bu dakikanın altı "dikkat" (turuncu), üstü "kritik" (kırmızı). */
const SEVERITY_THRESHOLD_MIN = 15;

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
  const [reason, setReason] = useState("");

  // Her açılışta temiz gerekçe kutusu
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const reasonOk = reason.trim().length >= 5;

  // K1: metadata yoksa temkinli davran — kritik (danger) varsay.
  const severity: ShellSeverity =
    conflict && conflict.overlap_minutes < SEVERITY_THRESHOLD_MIN ? "warning" : "danger";

  return (
    <ConfirmDialogShell
      open={open}
      severity={severity}
      icon="warning_amber"
      title="Zaman Penceresi Çakışması"
      subtitle="Zaman pencereleri birbiriyle çakışıyor."
      submitting={submitting}
      confirmLabel="Riski Onayla ve Görevi Ata"
      submittingLabel="Atanıyor..."
      confirmDisabled={!reasonOk}
      onCancel={onCancel}
      onConfirm={() => reasonOk && onConfirm(reason.trim())}
    >
      {/* Structured KV kartı — taranabilir çakışma detayı */}
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
              label="Çakışan Görev"
              value={<CopyChip text={conflict.conflicting_task_no} color={severity} />}
            />
            <DetailRow label="Çakışma Süresi" value={`~${conflict.overlap_minutes} dakika`} />
          </>
        ) : (
          <MDTypography variant="caption" color="white">
            Bu araca belirtilen aralıkta atanmış görev var.
          </MDTypography>
        )}
      </MDBox>

      {/* Zorunlu gerekçe (Mode 1 Advisory — Gerekçeli Onay) */}
      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        label="Manuel Onay Gerekçesi *"
        InputLabelProps={{ shrink: true }}
        placeholder="Örn: Operasyonel aciliyet / Müşteri zaman esnekliği sağladı..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={submitting}
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
        ℹ️ Bu işlem sistem denetim kaydına (Audit Log) kaydedilecektir.
      </MDTypography>
    </ConfirmDialogShell>
  );
}

export default ConflictOverrideModal;

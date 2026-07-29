/**
 * FEAT-010:FN-20 — <OverrideReasonDialog /> (spec v1.8, UNCERTAINTIES #20 ONAYLI).
 * Scorer #1 önerisi dışında araç seçildiğinde approve öncesi TEK soru sorar.
 * Sebep OPSİYONELdir — boş bırakılan override da başlı başına sinyaldir; bu
 * yüzden dialog approve'u engelleyemez, yalnızca zenginleştirir.
 */
import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { OVERRIDE_REASON_OPTIONS } from "services/dispatch/decisionLog";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string | null) => void;
}

export default function OverrideReasonDialog({ open, onCancel, onConfirm }: Props) {
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
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="xs">
      <DialogTitle>Öneri dışında araç seçtiniz</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2" mb={2}>
          Skor sıralamasının #1 önerisi yerine farklı bir araç atadınız. Sebebini
          belirtmek ister misiniz? (İsteğe bağlı — boş bırakabilirsiniz.)
        </MDTypography>
        <TextField
          select
          fullWidth
          label="Override sebebi (opsiyonel)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <MenuItem value="">— Belirtmek istemiyorum —</MenuItem>
          {OVERRIDE_REASON_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <MDButton variant="text" color="secondary" onClick={handleCancel}>
          Vazgeç
        </MDButton>
        <MDButton variant="gradient" color="success" onClick={handleConfirm}>
          Onayla ve Devam Et
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

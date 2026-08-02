/**
 * ConflictOverrideModal — BUG-1 Spec v3 Faz C (2026-08-02, Cem onaylı).
 *
 * Zaman penceresi çakışmasında (approve → HTTP 409 + conflict_metadata) açılan
 * MD2 PRO SERT MODAL. İki çıkış yolu:
 *   1. "Vazgeç" — atama yapılmaz, draft'lar draft kalır (backend rollback zaten yaptı).
 *   2. "Çakışmayı Kabul Et ve Ata" — ZORUNLU serbest-metin gerekçe ile Mode 1
 *      "Gerekçeli Onay": çağıran approve'u override:true + override_reason ile
 *      yeniden fırlatır; dönen overridden_conflicts FN-18 karar loguna
 *      conflict_metadata olarak, gerekçe override_comment olarak mühürlenir.
 *
 * Tema: dispatcher dark paleti (LiveFleetMap C sabitleriyle aynı aile),
 * 1px border, flat B2B — MD2 PRO Dialog deseni, yeni bileşen icat edilmedi.
 */
import { useEffect, useState } from "react";

import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import { ConflictMetadata } from "hooks/useTaskOptimization";

const C = {
  panelBg: "#1a2035",
  border: "#2c3454",
  danger: "#f44336",
  warnBg: "rgba(244,67,54,0.08)",
  accent: "#7C3AED",
  inputBg: "#131826",
  textMuted: "#8f9bb3",
  textFaint: "#65718c",
};

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

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: C.panelBg,
          border: `1px solid ${C.danger}`,
          borderRadius: "12px",
          backgroundImage: "none",
        },
      }}
    >
      {/* Başlık */}
      <MDBox display="flex" alignItems="center" gap={1} px={2.5} pt={2.5} pb={1}>
        <MDBox
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: C.warnBg,
            border: `1px solid ${C.danger}`,
          }}
        >
          <Icon sx={{ color: C.danger }}>warning_amber</Icon>
        </MDBox>
        <MDBox>
          <MDTypography variant="h6" fontWeight="bold" color="white" sx={{ lineHeight: 1.2 }}>
            Zaman Penceresi Çakışması
          </MDTypography>
          <MDTypography variant="caption" sx={{ color: C.textMuted }}>
            Atama engellendi — HTTP 409
          </MDTypography>
        </MDBox>
      </MDBox>

      <MDBox px={2.5} pb={2.5}>
        {/* Çakışma detayı */}
        <MDBox
          sx={{
            bgcolor: C.warnBg,
            border: `1px solid ${C.border}`,
            borderRadius: "10px",
            p: 1.5,
            mb: 1.5,
          }}
        >
          <MDTypography variant="button" color="white" sx={{ display: "block" }}>
            Bu araca belirtilen aralıkta atanmış görev var
            {conflict ? (
              <>
                {": "}
                <b style={{ fontFamily: "monospace" }}>{conflict.conflicting_task_no}</b>
              </>
            ) : (
              "."
            )}
          </MDTypography>
          {conflict && (
            <MDTypography variant="caption" sx={{ color: C.textMuted, display: "block", mt: 0.5 }}>
              Çakışma süresi: ~{conflict.overlap_minutes} dakika
            </MDTypography>
          )}
        </MDBox>

        {/* Zorunlu gerekçe (Mode 1 Advisory — Gerekçeli Onay) */}
        <MDTypography variant="caption" fontWeight="bold" color="white" sx={{ display: "block", mb: 0.5 }}>
          Override gerekçesi <span style={{ color: C.danger }}>*</span>
        </MDTypography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          placeholder="Neden çakışmaya rağmen atıyorsunuz? (zorunlu, min. 5 karakter)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: "white",
              fontSize: "13px",
              bgcolor: C.inputBg,
              "& fieldset": { borderColor: C.border },
              "&:hover fieldset": { borderColor: C.accent },
              "&.Mui-focused fieldset": { borderColor: C.accent },
            },
            "& .MuiInputBase-input::placeholder": { color: C.textFaint, opacity: 1 },
          }}
        />
        <MDTypography variant="caption" sx={{ color: C.textFaint, display: "block", mt: 0.5 }}>
          Gerekçe ve çakışma detayı karar loguna (audit trail / ML) mühürlenir.
        </MDTypography>

        <Divider sx={{ my: 1.5, borderColor: C.border }} />

        {/* Aksiyonlar */}
        <MDBox display="flex" gap={1}>
          <MDBox
            component="button"
            type="button"
            onClick={onCancel}
            disabled={submitting}
            sx={{
              flex: 1,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.textMuted,
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              fontSize: "13px",
              fontWeight: 600,
              "&:hover": { color: "#fff", borderColor: C.accent },
              "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            Vazgeç
          </MDBox>
          <MDBox
            component="button"
            type="button"
            onClick={() => reasonOk && onConfirm(reason.trim())}
            disabled={!reasonOk || submitting}
            sx={{
              flex: 2,
              border: "none",
              cursor: "pointer",
              borderRadius: "10px",
              py: 1,
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              background: `linear-gradient(135deg, ${C.danger}, #b71c1c)`,
              "&:hover": { filter: "brightness(1.08)" },
              "&:disabled": {
                opacity: 0.45,
                cursor: "not-allowed",
                filter: "none",
              },
            }}
          >
            {submitting ? "Atanıyor..." : "Çakışmayı Kabul Et ve Ata"}
          </MDBox>
        </MDBox>
      </MDBox>
    </Dialog>
  );
}

export default ConflictOverrideModal;

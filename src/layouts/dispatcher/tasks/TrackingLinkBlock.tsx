/**
 * Customer tracking link for one task.
 * POST/DELETE {AUTH_API_URL}/api/tasks/:id/public-link.
 * Closed tasks (completed, cancelled, withdrawn) stay disabled.
 */
import { useEffect, useState } from "react";

import Drawer from "@mui/material/Drawer";
import Icon from "@mui/material/Icon";

import { a11y } from "assets/theme/tokens";
import ConfirmDialogShell from "components/ConfirmDialogShell";
import DataState from "components/DataState";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { useNotifications } from "components/Notifications";
import { AUTH_API_URL } from "config/api";
import { useMaterialUIController } from "context";
import { formatDateTime, useT } from "i18n";
import { useAuthStore } from "store/useAuthStore";

const CLOSED_STATUS = new Set(["completed", "cancelled", "withdrawn"]);

type PendingOp = "create" | "revoke";

interface LinkView {
  url: string;
  expiresAt: string | null;
}

interface Props {
  open: boolean;
  taskId: string;
  taskNo: string;
  status?: string;
  onClose: () => void;
}

function isClosed(status: string | undefined): boolean {
  return CLOSED_STATUS.has(String(status || ""));
}

async function publicLinkRequest(
  method: "POST" | "DELETE",
  taskId: string,
  token: string | null
): Promise<LinkView | null> {
  const res = await fetch(`${AUTH_API_URL}/api/tasks/${encodeURIComponent(taskId)}/public-link`, {
    method,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  if (method === "DELETE") return null;
  const body: unknown = await res.json();
  const url = body && typeof body === "object" && "url" in body ? (body as { url?: unknown }).url : null;
  const expires =
    body && typeof body === "object" && "expires_at" in body
      ? (body as { expires_at?: unknown }).expires_at
      : null;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error(String(res.status || 500));
  }
  return {
    url,
    expiresAt: typeof expires === "string" ? expires : null,
  };
}

function TrackingLinkBlock({ open, taskId, taskNo, status, onClose }: Props): JSX.Element {
  const { t, lang } = useT();
  const { notifyToast } = useNotifications();
  const authToken = useAuthStore((s) => s.token);
  const [controller] = useMaterialUIController();
  const closed = isClosed(status);
  const [link, setLink] = useState<LinkView | null>(null);
  const [pending, setPending] = useState<PendingOp | null>(null);
  const [failedOp, setFailedOp] = useState<PendingOp | null>(null);
  const [errorStatus, setErrorStatus] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setLink(null);
    setPending(null);
    setFailedOp(null);
    setErrorStatus("");
    setConfirmOpen(false);
  }, [taskId]);

  const fail = (op: PendingOp, err: unknown) => {
    const code = err instanceof Error ? err.message : "";
    setFailedOp(op);
    setErrorStatus(code);
    setConfirmOpen(false);
    notifyToast({ type: "track_link_err", titleKey: "tasks.trackingFailed", severity: "high" });
  };

  const create = async () => {
    if (closed || pending) return;
    setPending("create");
    setFailedOp(null);
    try {
      const next = await publicLinkRequest("POST", taskId, authToken);
      setLink(next);
      notifyToast({ type: "track_link_ok", titleKey: "tasks.trackingReady", severity: "low" });
    } catch (err) {
      fail("create", err);
    } finally {
      setPending(null);
    }
  };

  const revoke = async () => {
    if (closed || pending) return;
    setPending("revoke");
    setFailedOp(null);
    try {
      await publicLinkRequest("DELETE", taskId, authToken);
      setLink(null);
      setConfirmOpen(false);
      notifyToast({ type: "track_link_revoked", titleKey: "tasks.trackingRevoked", severity: "low" });
    } catch (err) {
      fail("revoke", err);
    } finally {
      setPending(null);
    }
  };

  const copy = () => {
    if (!link || closed) return;
    const url = link.url;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      notifyToast({
        type: ok ? "track_link_copy" : "track_link_copy_err",
        titleKey: ok ? "tasks.trackingCopied" : "tasks.trackingCopyFailed",
        severity: ok ? "low" : "high",
      });
    };
    const write = navigator.clipboard?.writeText(url);
    if (!write) {
      finish(false);
      return;
    }
    void write.then(
      () => finish(true),
      () => finish(false)
    );
    window.setTimeout(() => finish(false), 1500);
  };

  const retry = () => {
    if (failedOp === "revoke") {
      void revoke();
      return;
    }
    void create();
  };

  const linkColor = controller.darkMode ? a11y.linkDark : a11y.linkLight;
  const titleId = "tracking-link-title";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: "min(100vw, 28rem)", maxWidth: "100vw", boxSizing: "border-box" },
        "aria-labelledby": titleId,
      }}
    >
      <MDBox p={2} display="flex" flexDirection="column" gap={2} minWidth={0}>
        <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <MDBox minWidth={0}>
            <MDTypography id={titleId} variant="h6" component="h3">
              {t("tasks.trackingTitle")}
            </MDTypography>
            <MDTypography variant="caption" noWrap title={taskNo || undefined} display="block">
              {taskNo || t("common.emptyDash")}
            </MDTypography>
          </MDBox>
          <MDButton
            variant="text"
            color="secondary"
            size="small"
            onClick={onClose}
            aria-label={t("tasks.trackingClose")}
            sx={{ minWidth: 0, px: 1 }}
          >
            <Icon aria-hidden>close</Icon>
          </MDButton>
        </MDBox>

        {closed && (
          <MDTypography variant="body2" role="status">
            {t("tasks.trackingClosed")}
          </MDTypography>
        )}

        <DataState
          status={failedOp ? "error" : "ready"}
          errorMessage={errorStatus ? t("common.errorWithMessage", { message: errorStatus }) : undefined}
          onRetry={failedOp ? retry : undefined}
        >
          <MDBox
            aria-busy={pending != null}
            display="flex"
            flexDirection="column"
            gap={1.5}
            minWidth={0}
          >
            {link && !closed ? (
              <MDBox display="flex" flexDirection="column" gap={1} minWidth={0}>
                <MDTypography
                  variant="body2"
                  sx={{ color: linkColor, wordBreak: "break-all", fontVariantNumeric: "tabular-nums" }}
                >
                  {link.url}
                </MDTypography>
                <MDTypography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {t("tasks.trackingExpires", { date: formatDateTime(link.expiresAt, lang) })}
                </MDTypography>
              </MDBox>
            ) : null}

            <MDBox display="flex" flexWrap="wrap" gap={1}>
              <MDButton
                variant="gradient"
                color="info"
                size="small"
                disabled={closed || pending != null || link != null}
                onClick={() => {
                  void create();
                }}
                sx={{ textTransform: "none" }}
              >
                {t("tasks.trackingCreate")}
              </MDButton>
              <MDButton
                variant="outlined"
                color="info"
                size="small"
                disabled={closed || pending != null || !link}
                onClick={() => {
                  void copy();
                }}
                sx={{ textTransform: "none" }}
              >
                {t("tasks.trackingCopy")}
              </MDButton>
              <MDButton
                variant="outlined"
                color="error"
                size="small"
                disabled={closed || pending != null || !link}
                onClick={() => setConfirmOpen(true)}
                sx={{ textTransform: "none" }}
              >
                {t("tasks.trackingRevoke")}
              </MDButton>
            </MDBox>
          </MDBox>
        </DataState>
      </MDBox>

      <ConfirmDialogShell
        open={confirmOpen}
        severity="danger"
        icon="link_off"
        title={t("tasks.trackingRevokeTitle")}
        subtitle={t("tasks.trackingRevokeBody")}
        confirmLabel={t("tasks.trackingRevokeConfirm")}
        submitting={pending === "revoke"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          void revoke();
        }}
      />
    </Drawer>
  );
}

export default TrackingLinkBlock;

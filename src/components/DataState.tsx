import Icon from "@mui/material/Icon";
import { map } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { formatRelative, useT } from "i18n";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

export type DataStateKind = "loading" | "empty" | "error" | "ready";

export interface DataStateProps {
  status: DataStateKind;
  stale?: boolean;
  staleWhen?: Date | number | string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyIcon?: string;
  emptyCtaLabel?: string;
  emptyCtaTo?: string;
  errorMessage?: string;
  children: ReactNode;
}

export function isDataStale(staleWhen: Date | number | string | null | undefined): boolean {
  if (staleWhen == null) return false;
  const t0 = typeof staleWhen === "number" ? staleWhen : new Date(staleWhen).getTime();
  if (!Number.isFinite(t0) || t0 <= 0) return false;
  return Date.now() - t0 > map.staleMs;
}

export function dataStateOf(opts: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}): DataStateKind {
  if (opts.isError) return "error";
  if (opts.isLoading) return "loading";
  if (opts.isEmpty) return "empty";
  return "ready";
}

/** Empty only when the query succeeded with zero rows — never on fetch failure / pause. */
export function listFetchState(q: {
  isLoading: boolean;
  isError: boolean;
  isPaused?: boolean;
  data: readonly unknown[] | undefined;
  error?: Error | string | null;
}): DataStateKind {
  const hasData = q.data !== undefined;
  const isError =
    Boolean(q.isError) ||
    Boolean(q.error) ||
    Boolean(q.isPaused && !hasData && !q.isLoading);
  return dataStateOf({
    isLoading: q.isLoading && !isError,
    isError,
    isEmpty: hasData && q.data.length === 0 && !isError,
  });
}

function DataState({
  status,
  stale,
  staleWhen,
  onRetry,
  emptyMessage,
  emptyIcon = "inbox",
  emptyCtaLabel,
  emptyCtaTo,
  errorMessage,
  children,
}: DataStateProps): JSX.Element {
  const { t, lang } = useT();
  const showStale = Boolean(stale ?? isDataStale(staleWhen)) && (status === "ready" || status === "loading");
  const detail = (errorMessage ?? "").trim();
  const [detailOpen, setDetailOpen] = useState(process.env.NODE_ENV !== "production");

  return (
    <MDBox>
      {showStale && (
        <MDBox role="status" px={2} py={1} mb={1} borderRadius="md" sx={{ bgcolor: "action.hover" }}>
          <MDTypography variant="caption" color="text">
            {t("dataState.stale", { when: formatRelative(staleWhen, Date.now(), lang) })}
          </MDTypography>
        </MDBox>
      )}

      {status === "error" && (
        <MDBox textAlign="center" py={6} role="alert">
          <Icon color="error" aria-hidden sx={{ fontSize: 40, mb: 1 }}>
            error_outline
          </Icon>
          <MDTypography variant="body2" mb={detail ? 0.5 : 2}>
            {t("dataState.error.title")}
          </MDTypography>
          {detail && (
            <MDBox mb={2}>
              <MDButton
                variant="text"
                color="secondary"
                size="small"
                onClick={() => setDetailOpen((open) => !open)}
                aria-expanded={detailOpen}
              >
                {t("dataState.error.detail")}
              </MDButton>
              {detailOpen && (
                <MDTypography variant="caption" color="text" display="block" mt={0.5}>
                  {detail}
                </MDTypography>
              )}
            </MDBox>
          )}
          {onRetry && (
            <MDButton variant="outlined" color="info" size="small" onClick={onRetry}>
              {t("dataState.retry")}
            </MDButton>
          )}
        </MDBox>
      )}

      {status === "empty" && (
        <MDBox textAlign="center" py={6} role="status">
          <Icon color="disabled" aria-hidden sx={{ fontSize: 40, mb: 1 }}>
            {emptyIcon}
          </Icon>
          <MDTypography variant="body2" mb={2}>
            {emptyMessage || t("dataState.empty")}
          </MDTypography>
          {emptyCtaLabel && emptyCtaTo && (
            <MDButton variant="gradient" color="info" size="small" component={Link} to={emptyCtaTo}>
              {emptyCtaLabel}
            </MDButton>
          )}
        </MDBox>
      )}

      {(status === "loading" || status === "ready") && (
        <MDBox aria-busy={status === "loading"} aria-label={status === "loading" ? t("dataState.loading") : undefined}>
          {children}
        </MDBox>
      )}
    </MDBox>
  );
}

export default DataState;

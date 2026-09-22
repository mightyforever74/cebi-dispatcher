import Icon from "@mui/material/Icon";
import { map } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { formatRelative, useT } from "i18n";
import type { ReactNode } from "react";
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
  if (opts.isLoading) return "loading";
  if (opts.isError) return "error";
  if (opts.isEmpty) return "empty";
  return "ready";
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
          <Icon color="error" sx={{ fontSize: 40, mb: 1 }}>
            error_outline
          </Icon>
          <MDTypography variant="body2" mb={2}>
            {errorMessage || t("dataState.error")}
          </MDTypography>
          {onRetry && (
            <MDButton variant="outlined" color="info" size="small" onClick={onRetry}>
              {t("dataState.retry")}
            </MDButton>
          )}
        </MDBox>
      )}

      {status === "empty" && (
        <MDBox textAlign="center" py={6} role="status">
          <Icon color="disabled" sx={{ fontSize: 40, mb: 1 }}>
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

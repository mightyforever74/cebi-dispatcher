/**
 * FEAT-010 Dilim 4 - Istisna Yonetimi sayfasi (FN-13 ExceptionStatusPanel
 * + FN-14 ResolutionActionPanel MVP + FN-12 MVP sayfa-ici "yeni olay" vurgusu).
 * D4: StatusChip + DataTable + DataState; toast/banner `useNotifications`.
 * D5: çöz modalı ConfirmDialogShell.
 */
import { useCallback, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ConfirmDialogShell from "components/ConfirmDialogShell";
import DataState, { isDataStale, listFetchState } from "components/DataState";
import DataTable, { type DataColumn, type DataRow } from "components/DataTable";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import StatusChip from "components/StatusChip";
import { useNotifications } from "components/Notifications";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { ExceptionEvent, ResolveAction } from "hooks/useExceptions";
import { breakpoints } from "assets/theme/tokens";
import { formatDateTime, useT, type TFunction, type TranslationKey } from "i18n";

const RESOLVE_OPTIONS: ResolveAction[] = ["manual_replan", "manual_reassign", "dismiss"];

function payloadSummary(e: ExceptionEvent, translate: TFunction): string {
  const p = e.detection_payload || {};
  const parts: string[] = [];
  if (p.task_no) parts.push(String(p.task_no));
  if (p.vehicle_plate) parts.push(String(p.vehicle_plate));
  if (p.eta_deviation_minutes) {
    parts.push(translate("exceptions.payloadDeviation", { n: Number(p.eta_deviation_minutes) }));
  }
  if (p.remaining_km) {
    parts.push(translate("exceptions.payloadRemaining", { n: Number(p.remaining_km) }));
  }
  if (p.distance_from_pickup_m) {
    parts.push(translate("exceptions.payloadPickup", { n: Number(p.distance_from_pickup_m) }));
  }
  if (p.silence_minutes_after_debounce) {
    parts.push(translate("exceptions.payloadSilent", { n: Number(p.silence_minutes_after_debounce) }));
  }
  if (p.city) parts.push(translate("exceptions.payloadRegion", { city: String(p.city) }));
  return parts.join(" · ") || "—";
}

function exceptionTypeLabel(type: string, translate: (key: TranslationKey) => string): string {
  const key = `status.exception.${type}` as TranslationKey;
  const label = translate(key);
  return label === key ? type : label;
}

function statusLabel(status: string, translate: (key: TranslationKey) => string): string {
  if (status === "open") return translate("exceptions.statusOpen");
  if (status === "acknowledged") return translate("exceptions.statusAcknowledged");
  if (status === "resolved") return translate("exceptions.statusResolved");
  return status;
}

export default function Exceptions(): JSX.Element {
  const { t, lang } = useT();
  const theme = useTheme();
  const iconOnly = useMediaQuery(theme.breakpoints.down(breakpoints.xl));
  const {
    exceptions,
    loading,
    error,
    newIds,
    lastOkAt,
    refresh,
    resolve,
  } = useNotifications();

  const [dialogFor, setDialogFor] = useState<ExceptionEvent | null>(null);
  const [action, setAction] = useState<ResolveAction>("dismiss");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    exceptions.forEach((e) => {
      c[e.severity] += 1;
    });
    return c;
  }, [exceptions]);

  const doAcknowledge = useCallback(async (e: ExceptionEvent) => {
    setActionError(null);
    try {
      await resolve(e.id, "acknowledge");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [resolve]);

  const doResolve = async () => {
    if (!dialogFor) return;
    setBusy(true);
    setActionError(null);
    try {
      await resolve(dialogFor.id, action, comment || undefined);
      setDialogFor(null);
      setComment("");
      setAction("dismiss");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const table = useMemo(() => {
    const columns: DataColumn[] = [
      { Header: t("exceptions.colType"), accessor: "type", minWidth: 140, truncate: true, primary: true },
      { Header: t("exceptions.colSeverity"), accessor: "severity", minWidth: 96, maxWidth: 120, primary: true },
      { Header: t("exceptions.colStatus"), accessor: "status", minWidth: 88, maxWidth: 110 },
      { Header: t("exceptions.colSummary"), accessor: "summary", minWidth: 160, flex: 1, truncate: true, primary: true },
      { Header: t("exceptions.colTime"), accessor: "time", minWidth: 120, maxWidth: 160 },
      { Header: t("exceptions.colActions"), accessor: "actions", minWidth: 230, maxWidth: 280 },
    ];

    const rows: DataRow[] = exceptions.map((e) => {
      const summary = payloadSummary(e, t);
      return {
        type: (
          <MDBox display="flex" alignItems="center" gap={0.75} title={exceptionTypeLabel(e.exception_type, t)}>
            {newIds.has(e.id) ? (
              <MDTypography variant="caption" color="error" fontWeight="bold">
                {t("exceptions.newDot")}
              </MDTypography>
            ) : null}
            <StatusChip kind="exception" value={e.exception_type} />
          </MDBox>
        ),
        severity: <StatusChip kind="alert" value={e.severity} />,
        status: (
          <MDTypography variant="caption" color="text">
            {statusLabel(e.status, t)}
          </MDTypography>
        ),
        summary: (
          <MDTypography variant="caption" color="text" noWrap title={summary}>
            {summary}
          </MDTypography>
        ),
        time: (
          <MDTypography variant="caption" color="text" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatDateTime(e.occurred_at, lang)}
          </MDTypography>
        ),
        actions: (
          <MDBox display="flex" gap={0.5} flexWrap="nowrap">
            {e.status === "open" && (
              <MDButton
                size="small"
                variant="outlined"
                color="info"
                onClick={() => void doAcknowledge(e)}
                aria-label={t("exceptions.acknowledge")}
                sx={{
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  ...(!iconOnly
                    ? {
                        px: "10px",
                        py: "6px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }
                    : {}),
                }}
              >
                <Icon fontSize="small" aria-hidden>
                  done
                </Icon>
                {iconOnly ? null : t("exceptions.acknowledge")}
              </MDButton>
            )}
            <MDButton
              size="small"
              variant="gradient"
              color="success"
              onClick={() => setDialogFor(e)}
              aria-label={t("exceptions.resolve")}
              sx={{
                textTransform: "none",
                whiteSpace: "nowrap",
                minWidth: 0,
                ...(!iconOnly
                  ? {
                      px: "10px",
                      py: "6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }
                  : {}),
              }}
            >
                <Icon fontSize="small" aria-hidden>
                  task_alt
                </Icon>
                {iconOnly ? null : t("exceptions.resolve")}
              </MDButton>
          </MDBox>
        ),
        id: e.id,
        _ariaLabel: summary,
      };
    });

    return { columns, rows };
  }, [exceptions, newIds, t, lang, doAcknowledge, iconOnly]);

  const state = listFetchState({
    isLoading: loading,
    isError: Boolean(error),
    data: loading ? undefined : exceptions,
    error,
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card>
          <MDBox p={3} display="flex" alignItems="center" justifyContent="space-between">
            <MDBox>
              <MDTypography variant="h5" component="h2">{t("exceptions.title")}</MDTypography>
              <MDTypography variant="caption" color="text">
                {t("exceptions.subtitle")}
              </MDTypography>
            </MDBox>
            <MDBox display="flex" gap={1} flexWrap="wrap">
              {(["critical", "high", "medium", "low"] as const).map((s) => (
                <MDBox key={s} display="flex" alignItems="center" gap={0.5}>
                  <StatusChip kind="alert" value={s} />
                  <MDTypography variant="caption">{counts[s]}</MDTypography>
                </MDBox>
              ))}
            </MDBox>
          </MDBox>
          {actionError && (
            <MDBox px={3} pb={1}>
              <MDTypography variant="caption" color="error">
                {t("common.errorWithMessage", { message: actionError })}
              </MDTypography>
            </MDBox>
          )}
          <DataState
            status={state}
            stale={isDataStale(lastOkAt)}
            staleWhen={lastOkAt}
            onRetry={() => {
              void refresh();
            }}
            emptyMessage={t("dataState.emptyExceptions")}
            emptyIcon="check_circle"
            errorMessage={error ?? undefined}
          >
            <DataTable
              table={table}
              loading={loading}
              ariaLabel={t("exceptions.title")}
              entriesPerPage={false}
              showTotalEntries={false}
              isSorted={false}
            />
          </DataState>
        </Card>
      </MDBox>

      <ConfirmDialogShell
        open={dialogFor !== null}
        severity="accent"
        icon="task_alt"
        title={t("exceptions.resolveTitle")}
        submitting={busy}
        confirmLabel={t("exceptions.resolveClose")}
        submittingLabel={t("exceptions.saving")}
        onCancel={() => {
          setDialogFor(null);
          setComment("");
          setAction("dismiss");
        }}
        onConfirm={() => {
          void doResolve();
        }}
        reason={{
          value: comment,
          onChange: setComment,
          label: t("exceptions.commentLabel"),
          helperText: t("exceptions.commentHint"),
        }}
      >
        <MDTypography variant="body2" mb={2}>
          {dialogFor ? exceptionTypeLabel(dialogFor.exception_type, t) : ""} —{" "}
          {dialogFor ? payloadSummary(dialogFor, t) : ""}
        </MDTypography>
        <TextField
          select
          fullWidth
          size="small"
          label={t("exceptions.actionLabel")}
          value={action}
          onChange={(ev) => setAction(ev.target.value as ResolveAction)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        >
          {RESOLVE_OPTIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {t(`exceptions.action.${value}` as TranslationKey)}
            </MenuItem>
          ))}
        </TextField>
      </ConfirmDialogShell>
    </DashboardLayout>
  );
}

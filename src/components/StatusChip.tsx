import Chip from "@mui/material/Chip";
import {
  status,
  type AlertSeverity,
  type DriverDutyStatus,
  type ExceptionType,
  type StatusColorSet,
  type TaskPriority,
  type TaskStatus,
  type VehicleConnectivityStatus,
  type VehicleOpsStatus,
} from "assets/theme/tokens";
import { useT, type TranslationKey } from "i18n";

export type StatusKind = "task" | "alert" | "vehicle" | "exception";

type Palette = Record<string, StatusColorSet>;

const VEHICLE_PALETTE: Palette = {
  ...status.vehicle,
  ...status.driver,
  ...status.vehicleOps,
};

const PALETTE: Record<StatusKind, Palette> = {
  task: status.task,
  alert: status.alert,
  vehicle: VEHICLE_PALETTE,
  exception: status.exception,
};

export function resolveStatusColors(kind: StatusKind, value: string): StatusColorSet {
  return PALETTE[kind][value] ?? status.unknown;
}

function labelKey(kind: StatusKind, value: string): TranslationKey {
  return `status.${kind}.${value}` as TranslationKey;
}

export function enumLabel(
  prefix: string,
  value: string | null | undefined,
  translate: (key: TranslationKey) => string
): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  const key = `${prefix}.${raw}` as TranslationKey;
  const label = translate(key);
  return label === key ? raw : label;
}

interface StatusChipProps {
  kind: StatusKind;
  value: string | null | undefined;
  size?: "sm" | "md";
}

function StatusChip({ kind, value, size = "sm" }: StatusChipProps): JSX.Element {
  const { t } = useT();
  const raw = (value ?? "").trim() || "unknown";
  const colors = resolveStatusColors(kind, raw);
  const key = labelKey(kind, raw);
  const translated = t(key);
  const hasLabel = translated !== key;
  const known = Boolean(PALETTE[kind][raw]);
  if (!known && !hasLabel && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[StatusChip] unknown ${kind} value:`, raw);
  }
  const label = hasLabel ? translated : raw;
  return (
    <Chip
      size={size === "sm" ? "small" : "medium"}
      label={label}
      title={raw}
      sx={{
        height: size === "sm" ? 20 : 24,
        fontSize: size === "sm" ? "10px" : "12px",
        fontWeight: 700,
        bgcolor: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

export function PriorityChip({ value }: { value: string | null | undefined }): JSX.Element {
  const { t } = useT();
  const raw = (value ?? "normal").trim() || "normal";
  const colors = status.priority[raw as TaskPriority] ?? status.unknown;
  const key = `status.priority.${raw}` as TranslationKey;
  const known = raw in status.priority;
  return (
    <Chip
      size="small"
      label={known ? t(key) : raw}
      title={raw}
      sx={{
        height: 20,
        fontSize: "10px",
        fontWeight: 700,
        bgcolor: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

export type {
  AlertSeverity,
  DriverDutyStatus,
  ExceptionType,
  TaskStatus,
  VehicleConnectivityStatus,
  VehicleOpsStatus,
};

export default StatusChip;

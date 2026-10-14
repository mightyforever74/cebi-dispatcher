/**
=========================================================
* TulipFleet Dispatcher — Task Optimization (VRP optimize/approve akisi)
=========================================================
* Faz 3, Part B. Gercek enterprise-api endpoint'lerine bagli:
*   POST /dispatcher/tasks/optimize
*   GET  /dispatcher/tasks/optimize/poll/:id (2sn'de bir otomatik polling)
*   POST /dispatcher/tasks/optimize/approve
* Sidenav'da GORUNMEZ; /dispatcher/tasks'taki "+ Nieuwe Taak" ile erisilir.
*
* ONEMLI: ROUTING_PROVIDER=mock. Mock, secilen araclari fiilen KULLANMAZ -
* available_vehicles her zaman sabit 4 test araci (Dobbe filosu). Mock poll
* sonucu task basina yalnizca {id, pickup_location, dropoff_location} doner
* (MockRoutingProvider.js kanitli) - kargo/skill/zaman verisi DONMEZ.
*
* UPGRADE (2026-07-20) - Decision Support Engine Phase 1:
* Scorer plugin chain (services/dispatch/scoring), Graceful Degradation:
* MEKAN + ZAMAN aktif; REGULASYON + KARGO kilitli. Round-robin ILK ATAMA
* paritesi korunur; siralama atamayi DEGISTIRMEZ. Dikey sirali arac listesi,
* Karar Notu Popover, flat B2B (soft shadow yasak). Telemetri REST snapshot'tan
* (useDispatchLocationSnapshot) vehicle_id ile BIREBIR eslesir.
*
* UPGRADE (2026-07-20, Strateji 3) - Logistics & Constraints + Frontend-State:
* GRUP A (capacity_required jsonb + skill_required text[]) backend'in GERCEK
* kolonlarina gider; GRUP B (direction/location_type/time_window) yalnizca
* frontend-state (submittedConstraints + taskConstraintsMap) - scorer'a beslenir.
* Tek kontrat: types/metadata.StrictTaskConstraints.
*
* UPGRADE (2026-07-22) - Form UX v2 Paket 1 (SIFIR yeni bagimlilik):
*   1. Zaman: datetime-local TextField -> MDDatePicker (sablonun kendi flatpickr
*      sarmalayicisi, package.json'da ZATEN var - kanitli) + hizli preset
*      chip'leri (Simdi / +1 saat / Bugun 17:00 / +2 saat / Yarin 09:00 / Temizle).
*      State string -> Date|null; ISO donusumu submit aninda (dateToIso).
*   2. Yon + Konum Tipi: Select -> ikonlu segmented ToggleButtonGroup
*      (2-3 secenekli alanlarda dropdown fazla tik; tek bakis + tek tik).
*   3. Hazmat + Yetkinlik: checkbox+Autocomplete -> dogrudan tiklanabilir
*      chip-grid (secili = filled). Hicbiri secili degil = "yok" - ayri
*      checkbox'a gerek kalmadi. Yetkinlikte serbest ekleme: kucuk input + add.
*   Flat B2B disiplini korundu (golge yok, bilgi-yogun). Secenek etiketleri
*   types/metadata sabitlerinden akar (tek kaynak, drift yok).
*   FIX (2026-07-22): flatpickr degeri DOM ref'iyle yazdigi icin MUI label
*   shrink olmuyordu (label ile deger UST USTE biniyordu - ekran goruntusu
*   kanitli). Cozum: input'a InputLabelProps { shrink: true }.
*
* BUG-1 Spec v3 Faz A+C (2026-08-02) - Zaman Penceresi Cakismasi:
*   - Faz A frontend bacagi: formdaki VRPTW baslangici (time_window_start)
*     approve payload'ina time_windows olarak tasinir; backend scheduled_start
*     olarak muhurler, estimated_end'i HERE/fallback ile hesaplar.
*   - Faz C: approve 409 doner -> ApproveConflictError yakalanir ->
*     ConflictOverrideModal (MD2 PRO sert modal) acilir. "Gerekceli Onay":
*     zorunlu serbest-metin gerekce ile override:true + override_reason
*     yeniden firlatilir; donen overridden_conflicts FN-18 karar loguna
*     conflict_metadata olarak, gerekce override_comment olarak muhurlenir.
=========================================================
*/

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

// @asseinfo/react-kanban (ADR-0001 §3.6)
import Board from "@asseinfo/react-kanban";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDDatePicker from "components/MDDatePicker";

// Konum arama (HERE Discover proxy)
import LocationSearchInput, { LocationValue } from "components/LocationSearchInput";
import { useNotifications } from "components/Notifications";
import { brand, dialog, paletteDark, paletteLight } from "assets/theme/tokens";

// Material Dashboard 2 PRO React context (dark mode)
import { useMaterialUIController } from "context";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Real API
import useVehicles, { EMPTY_VEHICLES, Vehicle } from "hooks/useVehicles";
import { EMPTY_ARRAY } from "utils/empty";
import {
  useSubmitOptimization,
  usePollOptimization,
  useApproveOptimization,
  OptimizeResultTask,
  VehicleAssignment,
  ApproveConflictError,
  ApproveConflict,
  ConflictMetadata,
  TimeWindow,
} from "hooks/useTaskOptimization";

// Canli telemetri snapshot'i (store bypass)
import useDispatchLocationSnapshot, {
  DispatchLocationFrame,
} from "hooks/useDispatchLocationSnapshot";
// Regulasyon Scorer'in Uyanisi (04.08) - assess veri kaynagi
import useComplianceAssessment from "hooks/useComplianceAssessment";
// UX turu (04.08) - mikro mesafe rozeti icin
import { haversineKm } from "services/dispatch/scoring/geo";
// KPI kartlari — analytics ile ayni MD2 PRO bileseni (el yapimi kart yasak)
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";
// Kisit listesi + Zaman Araligi — widgets sayfasiyla ayni tema bilesenleri
import DefaultItem from "examples/Items/DefaultItem";
import TimelineList from "examples/Timeline/TimelineList";
import TimelineItem from "examples/Timeline/TimelineItem";
import { deriveStatus } from "store/useVehicleStore";

// Decision Support Engine (Phase 1)
import { SCORERS, getScorer, rankVehicles } from "services/dispatch/scoring/registry";
import {
  RankingMode,
  ScoringTask,
  ScoringVehicleSnapshot,
} from "services/dispatch/scoring/types";
// FEAT-020 Phase 1.3b (Katman C) - statik/canli kapasite kaynak secimi
import { resolveCargoCapacity, VehicleCargoRow } from "services/dispatch/scoring/cargoCapacityResolver";

// Kisit sozlesmesi (form <-> scorer TEK gercek)
import {
  StrictTaskConstraints,
  TaskDirection,
  TaskLocationType,
  DIRECTION_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  HAZMAT_CLASS_OPTIONS,
  SKILL_OPTIONS,
  EMPTY_CONSTRAINTS,
} from "types/metadata";

// FEAT-010:FN-18/FN-20 - karar logu (ML-analiz veri temeli; best-effort, approve'u bloke etmez)
import { formatDateTime, formatDurationMinutes, formatNumber, parseLocaleNumber, useT, type TFunction, type TranslationKey } from "i18n";
import { useAuthStore } from "store/useAuthStore";
import { postDecisionLog } from "services/dispatch/decisionLog";
import OverrideReasonDialog from "components/OverrideReasonDialog";
// BUG-1 Faz C - zaman penceresi cakismasi sert modali (Gerekceli Onay)
import ConflictOverrideModal from "components/ConflictOverrideModal";
// BUG-2 - bulk fan-out onay kapisi (yalniz N>1 arac seciminde acilir)
import BulkConfirmDialog from "components/BulkConfirmDialog";

const SKILL_KEY: Record<string, TranslationKey> = {
  "ADR Lisansi": "optimize.skillAdr",
  "Soguk Zincir Tecrubesi": "optimize.skillCold",
  "Vinc / Kaldirma": "optimize.skillCrane",
  "Tank Konteyner": "optimize.skillTank",
};

function directionLabel(value: TaskDirection, translate: TFunction): string {
  return value === "inbound" ? translate("optimize.directionInbound") : translate("optimize.directionOutbound");
}

function locationLabel(value: TaskLocationType, translate: TFunction): string {
  if (value === "depot") return translate("optimize.locationDepot");
  if (value === "locker") return translate("optimize.locationLocker");
  return translate("optimize.locationCustomer");
}

function hazmatLabel(cls: string, translate: TFunction): string {
  const n = cls.replace(/\D/g, "");
  return n ? translate("optimize.hazmatClass", { n }) : cls;
}

function skillLabel(skill: string, translate: TFunction): string {
  const key = SKILL_KEY[skill];
  return key ? translate(key) : skill;
}

function scorerLabel(id: string, translate: TFunction): string {
  const key = `optimize.scorer${id.charAt(0).toUpperCase()}${id.slice(1)}` as TranslationKey;
  const label = translate(key);
  return label === key ? id : label;
}

const emptyLocation: LocationValue = { address: "", latitude: null, longitude: null };

interface KanbanCard {
  id: string;
  template: string;
}
/** UX turu (04.08): kolon basligi mikro rozeti — yalniz GERCEK veri varsa basilir. */
interface ColumnBadge {
  icon: string;
  text: string;
  tone: "good" | "warn" | "neutral";
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  scoreChip?: string;
  scoreMemo?: string;
  rank?: number;
  badges?: ColumnBadge[];
}
interface KanbanBoardData {
  columns: KanbanColumn[];
}

// Date|null -> ISO 8601 (UTC), bos ise null. (Form UX v2: state artik Date tutuyor.)
function dateToIso(d: Date | null): string | null {
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

// --- Zaman preset yardimcilari (Form UX v2) ---
function todayAt(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}
function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 3600 * 1000);
}
function tomorrowAt(hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Segmented toggle ikonlari (Material Icons; etiketler types/metadata'dan gelir)
const DIRECTION_ICONS: Record<TaskDirection, string> = {
  outbound: "local_shipping",
  inbound: "assignment_return",
};
const LOCTYPE_ICONS: Record<TaskLocationType, string> = {
  customer: "storefront",
  depot: "warehouse",
  locker: "inventory_2",
};

// Backend round-robin paritesi. Her zaman ORIJINAL available_vehicles
// sirasiyla cagrilir - skor siralamasi atamayi DEGISTIRMEZ.
function buildRoundRobinAssignments(
  tasks: OptimizeResultTask[],
  availableVehicles: string[]
): Map<string, string> {
  const assignments = new Map<string, string>();
  tasks.forEach((task, i) => {
    assignments.set(task.id, availableVehicles[i % availableVehicles.length]);
  });
  return assignments;
}

function buildBoard(
  tasks: OptimizeResultTask[],
  orderedVehicleIds: string[],
  vehicleLabels: Record<string, string>,
  assignments: Map<string, string>,
  scoreById: Map<string, { chip: string; memo: string; badges?: ColumnBadge[] }> | null
): KanbanBoardData {
  const columns: KanbanColumn[] = orderedVehicleIds.map((vehicleId, index) => {
    const score = scoreById?.get(vehicleId);
    return {
      id: vehicleId,
      title: vehicleLabels[vehicleId] || vehicleId.slice(0, 8),
      cards: [],
      scoreChip: score?.chip,
      scoreMemo: score?.memo,
      rank: score ? index + 1 : undefined,
      badges: score?.badges,
    };
  });
  const columnById = new Map(columns.map((c) => [c.id, c]));

  tasks.forEach((task) => {
    const vehicleId = assignments.get(task.id);
    const col = (vehicleId && columnById.get(vehicleId)) || columns[0];
    if (!col) return;
    const pickupAddr =
      task.pickup_location.address || `${task.pickup_location.lat},${task.pickup_location.lng}`;
    const dropoffAddr =
      task.dropoff_location.address || `${task.dropoff_location.lat},${task.dropoff_location.lng}`;
    col.cards.push({ id: task.id, template: `${pickupAddr} → ${dropoffAddr}` });
  });

  return { columns };
}

// Gorev kisitlari + Zaman Araligi — tema bilesenleriyle (04.08 UX turu):
// sol kart: DefaultItem satirlari (widgets/UpcomingEvents deseni),
// sag kart: TimelineList/TimelineItem (widgets/OrdersOverview deseni).
// Bos kisitlar GIZLI kalir; "Hazmat yok" aktif yokluk bilgisi olarak durur.
// Pencere girilmemisse "Belirtilmedi" yazilir (backend NOW() fallback
// kontrati — uydurma tarih basilmaz).
function ConstraintsSummary({
  c,
  darkMode,
}: {
  c: StrictTaskConstraints;
  darkMode: boolean;
}): JSX.Element {
  const { t } = useT();
  const cap = c.capacity_required;
  const ext = c.extended;
  const dirLabel = directionLabel(ext.direction, t);
  const locLabel = locationLabel(ext.location_type, t);
  const fmt = (iso: string | null) => (iso ? formatDateTime(iso) : null);
  const wStart = fmt(ext.time_window_start);
  const wEnd = fmt(ext.time_window_end);

  const rows: { icon: string; title: string; desc: string }[] = [
    { icon: "local_shipping", title: dirLabel, desc: t("optimize.fieldDirection") },
    { icon: "location_on", title: locLabel, desc: t("optimize.fieldLocationType") },
    ...(cap.volume_m3 != null
      ? [{ icon: "view_in_ar", title: t("optimize.volumeValue", { n: cap.volume_m3 }), desc: t("optimize.fieldVolume") }]
      : []),
    ...(cap.weight_kg != null
      ? [{ icon: "scale", title: t("optimize.weightValue", { n: cap.weight_kg }), desc: t("optimize.fieldWeight") }]
      : []),
    cap.hazmat_classes.length
      ? {
          icon: "science",
          title: t("optimize.hazmatAdr", { list: cap.hazmat_classes.map((cls) => hazmatLabel(cls, t)).join(", ") }),
          desc: t("optimize.fieldHazmat"),
        }
      : { icon: "science", title: t("optimize.hazmatNone"), desc: t("optimize.hazmatDeclaration") },
    ...(c.skill_required.length
      ? [
          {
            icon: "engineering",
            title: c.skill_required.map((s) => skillLabel(s, t)).join(", "),
            desc: t("optimize.fieldSkill"),
          },
        ]
      : []),
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 2 }}>
      <Grid item xs={12} md={7}>
        <Card sx={{ height: "100%" }}>
          <MDBox pt={2} px={2} lineHeight={1}>
            <MDTypography variant="h6" component="h3" fontWeight="medium">
              {t("optimize.constraintsCardTitle")}
            </MDTypography>
            <MDTypography variant="button" color="text" fontWeight="regular">
              {t("optimize.constraintsCardHint")}
            </MDTypography>
          </MDBox>
          <MDBox p={2}>
            {rows.map((r, i) => (
              <MDBox key={r.desc + r.title} mt={i === 0 ? 0 : 2.5}>
                <DefaultItem color="dark" icon={r.icon} title={r.title} description={r.desc} />
              </MDBox>
            ))}
          </MDBox>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <MDBox
          sx={{
            height: "100%",
            "& .MuiTypography-caption": {
              fontSize: "1.25rem",
              fontWeight: 700,
              color: paletteLight.white,
              lineHeight: 1.3,
              fontVariantNumeric: "tabular-nums",
            },
          }}
        >
          <TimelineList title={t("optimize.timeRange")} dark={darkMode}>
            <TimelineItem
              color="success"
              icon="play_arrow"
              title={t("optimize.start")}
              dateTime={wStart ?? t("optimize.unspecified")}
            />
            <TimelineItem
              color="error"
              icon="flag"
              title={t("optimize.end")}
              dateTime={wEnd ?? t("optimize.unspecified")}
              lastItem
            />
          </TimelineList>
        </MDBox>
      </Grid>
    </Grid>
  );
}

function VehicleRowHeader({
  column,
  darkMode,
}: {
  column: KanbanColumn;
  darkMode: boolean;
}): JSX.Element {
  // UX turu (04.08, Cem R2): Popover yerine satir-alti akordeon — z-index
  // savasi biter, alt siradaki araclar ASLA ortulmez.
  const [expanded, setExpanded] = useState(false);
  const { t } = useT();
  const { title, scoreChip, scoreMemo, rank, cards, badges } = column;
  const scoreNum = scoreChip ? Number(scoreChip) : null;
  // K-A (Cem onayli): >=80 yesil, 50-79 amber, <50 gri.
  const chipColor: "success" | "warning" | "default" =
    scoreNum !== null && scoreNum >= 80
      ? "success"
      : scoreNum !== null && scoreNum >= 50
      ? "warning"
      : "default";
  const toneColor = (tone: "good" | "warn" | "neutral"): "success" | "warning" | "default" =>
    tone === "good" ? "success" : tone === "warn" ? "warning" : "default";

  return (
    <>
      <MDBox
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        pb={1}
        sx={{
          borderBottom: darkMode ? `1px solid ${dialog.dark.border}` : `1px solid ${paletteLight.grey[300]}`,
        }}
      >
        <MDBox display="flex" alignItems="center" gap={1.5}>
          {rank !== undefined && (
            <MDTypography variant="button" fontWeight="bold" color="info">
              #{rank}
            </MDTypography>
          )}
          <MDTypography variant="h6" component="h4" fontWeight="bold" color={darkMode ? "white" : "dark"}>
            {title}
          </MDTypography>
          <MDTypography variant="caption" color="text">
            {t("optimize.taskCount", { count: cards.length })}
          </MDTypography>
        </MDBox>
        <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap" justifyContent="flex-end">
          {badges?.map((b) => (
            <Chip
              key={b.icon + b.text}
              icon={<Icon fontSize="small">{b.icon}</Icon>}
              label={b.text}
              size="small"
              variant="outlined"
              color={toneColor(b.tone)}
            />
          ))}
          {scoreChip && (
            <Chip
              label={`${scoreChip} / 100`}
              size="small"
              color={chipColor}
              sx={{ fontWeight: "bold" }}
            />
          )}
          {scoreMemo && (
            <IconButton
              size="small"
              onClick={() => setExpanded((v) => !v)}
              sx={{ color: darkMode ? dialog.dark.textMuted : "inherit" }}
            >
              <Icon fontSize="small">{expanded ? "expand_less" : "info_outlined"}</Icon>
            </IconButton>
          )}
        </MDBox>
      </MDBox>
      {scoreMemo && (
        <Collapse in={expanded}>
          <MDBox
            mt={1}
            p={1.5}
            sx={{
              borderRadius: "10px",
              border: darkMode ? `1px solid ${dialog.dark.border}` : `1px solid ${paletteLight.grey[300]}`,
              bgcolor: darkMode ? dialog.dark.cardWash : paletteLight.grey[100],
            }}
          >
            <MDTypography variant="button" fontWeight="bold" display="block" mb={0.5}>
              {t("optimize.smartNote")}
            </MDTypography>
            <MDTypography variant="caption" color="text">
              {scoreMemo}
            </MDTypography>
          </MDBox>
        </Collapse>
      )}
    </>
  );
}

function OptimizeTask(): JSX.Element {
  const { t, lang, locale } = useT();
  const { notifyToast } = useNotifications();
  const navigate = useNavigate();
  const { data: vehicles = EMPTY_VEHICLES, isLoading: loadingVehicles } = useVehicles();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const locationsQuery = useDispatchLocationSnapshot();

  const [pickup, setPickup] = useState<LocationValue>(emptyLocation);
  const [dropoff, setDropoff] = useState<LocationValue>(emptyLocation);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<{
    pickup?: string;
    dropoff?: string;
    vehicles?: string;
    volume?: string;
    weight?: string;
  }>({});
  const [jobId, setJobId] = useState<string | null>(null);
  // BUG-2: conflicts alani eklendi — kismi basari ozeti bu state'ten beslenir.
  const [approveSuccess, setApproveSuccess] = useState<{
    pushed: number;
    conflicts: ApproveConflict[];
  } | null>(null);
  // BUG-2: bulk onay kapisi + submit aninda muhurlenen fan-out arac listesi
  // (indeks eslemesi draft[i] -> arac[i] bu listeden okunur).
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const submittedFanoutRef = useRef<string[] | null>(null);

  // --- Logistics & Constraints form state (Strateji 3 + Form UX v2) ---
  const [direction, setDirection] = useState<TaskDirection>("outbound");
  const [locationType, setLocationType] = useState<TaskLocationType>("customer");
  const [volumeM3, setVolumeM3] = useState<string>(""); // input string; submit'te Number/null
  const [weightKg, setWeightKg] = useState<string>("");
  // Form UX v2: chip-grid - bos array = "yok" (ayri checkbox kalkti)
  const [hazmatClasses, setHazmatClasses] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState<string>("");
  // Form UX v2: flatpickr Date state (datetime-local string yerine)
  const [timeWindowStart, setTimeWindowStart] = useState<Date | null>(null);
  const [timeWindowEnd, setTimeWindowEnd] = useState<Date | null>(null);

  // Submit edilen kisitlar (Grup A + Grup B). Scorer bunu poll sonucu yerine
  // buradan okur (mock kisit donmuyor). Grup B yalnizca burada yasar.
  const [submittedConstraints, setSubmittedConstraints] =
    useState<StrictTaskConstraints | null>(null);
  // taskId -> kisit haritasi (onayli plan veri yapisi). result geldiginde
  // submittedConstraints ile doldurulur (form tek-task oldugu icin 1:1).
  const [taskConstraintsMap, setTaskConstraintsMap] = useState<
    Map<string, StrictTaskConstraints>
  >(new Map());

  // Kanban state
  const [initialBoard, setInitialBoard] = useState<KanbanBoardData | null>(null);
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map());
  const [rankingMode, setRankingMode] = useState<RankingMode>("spatial");
  const [boardEpoch, setBoardEpoch] = useState(0);

  const submitMutation = useSubmitOptimization();
  const pollQuery = usePollOptimization(jobId);
  const approveMutation = useApproveOptimization();

  // FEAT-010:FN-18 - karar logu: son siralama + override dialog state'i
  const token = useAuthStore((s) => s.token);
  const lastRankedRef = useRef<{ mode: RankingMode; ranked: ReturnType<typeof rankVehicles> } | null>(null);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  // BUG-1 Faz C: approve 409 (zaman penceresi cakismasi) sert modal state'i.
  // fn20Reason: ilk denemedeki arac-secimi override sebebi (FN-20) saklanir ki
  // "Gerekceli Onay" ile yeniden firlatista kaybolmasin.
  const [conflictPrompt, setConflictPrompt] = useState<{
    conflict: ConflictMetadata | null;
    fn20Reason: string | null;
  } | null>(null);

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleHazmat = (cls: string) => {
    setHazmatClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const toggleSkill = (s: string) => {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (!s) return;
    if (!skills.includes(s)) setSkills((prev) => [...prev, s]);
    setCustomSkill("");
  };

  const validLocation = (p: LocationValue) =>
    p.address.trim() !== "" && p.latitude !== null && p.longitude !== null;

  // Form state'inden StrictTaskConstraints uretir (tek kontrat).
  const decimalError = () =>
    t(locale.startsWith("en") ? "optimize.errorDecimalDot" : "optimize.errorDecimalComma");

  const collectConstraints = (): StrictTaskConstraints => {
    const volume = parseLocaleNumber(volumeM3, locale);
    const weight = parseLocaleNumber(weightKg, locale);
    return {
      capacity_required: {
        volume_m3: volume.ok ? volume.value : null,
        weight_kg: weight.ok ? weight.value : null,
        hazmat_classes: hazmatClasses,
      },
      skill_required: skills,
      extended: {
        direction,
        location_type: locationType,
        time_window_start: dateToIso(timeWindowStart),
        time_window_end: dateToIso(timeWindowEnd),
      },
    };
  };

  // BUG-2: gercek submit — fan-out ile arac basina 1 gorev kopyasi.
  // N=1'de fanout.map tek elemanli dizi uretir: eski payload BIT-BIT ayni.
  const doSubmit = () => {
    const constraints = collectConstraints();
    // Scorer bunu okur (Grup A + Grup B). Grup B backend'e GITMEZ.
    setSubmittedConstraints(constraints);

    const fanout = [...selectedVehicleIds];
    submittedFanoutRef.current = fanout;
    setBulkConfirmOpen(false);

    const taskInput = {
      pickup_location: {
        lat: pickup.latitude as number,
        lng: pickup.longitude as number,
        address: pickup.address,
      },
      dropoff_location: {
        lat: dropoff.latitude as number,
        lng: dropoff.longitude as number,
        address: dropoff.address,
      },
      // GRUP A - backend GERCEK kolonlara yazar (routes/tasks.js kanitli):
      // capacity_required jsonb'ye stringify, skill_required text[]'e array.
      capacity_required: constraints.capacity_required,
      skill_required: constraints.skill_required,
    };

    submitMutation.mutate(
      {
        tasks: fanout.map(() => taskInput),
        vehicles: selectedVehicleIds,
      },
      {
        onSuccess: (data) => {
          setJobId(data.jobId);
        },
        onError: () => {
          notifyToast({ type: "form_err", titleKey: "notifyForm.submitFailed", severity: "high" });
        },
      }
    );
  };

  const handleSubmit = () => {
    setFieldError({});
    setApproveSuccess(null);

    const next: {
      pickup?: string;
      dropoff?: string;
      vehicles?: string;
      volume?: string;
      weight?: string;
    } = {};
    if (!validLocation(pickup)) next.pickup = t("optimize.errorPickupDropoff");
    if (!validLocation(dropoff)) next.dropoff = t("optimize.errorPickupDropoff");
    if (selectedVehicleIds.length === 0) next.vehicles = t("optimize.errorVehicles");
    const volume = parseLocaleNumber(volumeM3, locale);
    const weight = parseLocaleNumber(weightKg, locale);
    if (!volume.ok) next.volume = decimalError();
    if (!weight.ok) next.weight = decimalError();
    if (next.pickup || next.dropoff || next.vehicles || next.volume || next.weight) {
      setFieldError(next);
      return;
    }

    // BUG-2 Bulk Guard: N>1 secimde onay kapisi. N=1 akisi degismeden devam.
    if (selectedVehicleIds.length > 1) {
      setBulkConfirmOpen(true);
      return;
    }
    doSubmit();
  };

  const status = pollQuery.data?.status;
  const isPolling = !!jobId && status !== "completed" && status !== "failed";
  const result = pollQuery.data?.result;

  // Regulasyon Scorer'in Uyanisi (04.08): dropoff noktasi + toplam mesafe ile
  // TEK assess cagrisi (form tek-task, kanitli). Sonuc buildSnapshots'ta
  // snapshot.compliance'a beslenir — scorer senkron kalir.
  const assessPoint =
    status === "completed" && result?.tasks && result.tasks.length > 0
      ? {
          lat: result.tasks[0].dropoff_location.lat,
          lng: result.tasks[0].dropoff_location.lng,
        }
      : null;
  const assessQuery = useComplianceAssessment(
    assessPoint,
    result?.available_vehicles ?? EMPTY_ARRAY,
    result ? result.summary.total_distance_meters / 1000 : null
  );

  const vehicleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach((v: Vehicle) => {
      map[v.id] = v.plate_no || v.id.slice(0, 8);
    });
    return map;
  }, [vehicles]);

  // FEAT-020 Phase 1.2 + 1.3b (Katman A statik + Katman C canli, 2026-10-13):
  // public.vehicles kargo kapasite kolonlari (Vehicle tipi [key:string]:any
  // gevsek tipli, optional chaining ile okunur). FN-3 KAPANDI (2026-10-13) —
  // enterprise-backend /api/dispatcher/vehicles artik statik VE canli
  // kolonlari + companies.cargo_capacity_tracking'i SELECT ediyor. Kaynak
  // secimi (statik mi canli mi) resolveCargoCapacity'de (cargoCapacityResolver.ts,
  // bkz. kendi testleri) — bu useMemo sadece cagiriyor, karar mantigi
  // scorer'dan tamamen ayri kaldi.
  const vehicleCargoCapacityById = useMemo(() => {
    const map: Record<string, ScoringVehicleSnapshot["cargoCapacity"]> = {};
    vehicles.forEach((v: Vehicle) => {
      const resolved = resolveCargoCapacity(v as VehicleCargoRow);
      if (resolved) map[v.id] = resolved;
    });
    return map;
  }, [vehicles]);

  // Draft task'lar -> scorer girdisi. constraints frontend-state'ten baglanir
  // (mock poll kisit donmuyor). Form tek-task oldugu icin submittedConstraints
  // tum donen task'lara atanir.
  const scoringTasks: ScoringTask[] = useMemo(() => {
    if (!result?.tasks) return [];
    return result.tasks.map((t: OptimizeResultTask) => ({
      id: t.id,
      pickup: t.pickup_location,
      dropoff: t.dropoff_location,
      constraints: submittedConstraints ?? undefined,
    }));
  }, [result, submittedConstraints]);

  const buildSnapshots = useCallback(
    (
      availableVehicles: string[],
      frames: DispatchLocationFrame[] | undefined
    ): ScoringVehicleSnapshot[] => {
      const frameByVehicleId = new Map((frames ?? EMPTY_ARRAY).map((f) => [f.vehicle_id, f]));
      return availableVehicles.map((vehicleId) => {
        const plate = vehicleLabels[vehicleId] || vehicleId.slice(0, 8);
        const frame = frameByVehicleId.get(vehicleId);
        return {
          id: vehicleId,
          plate,
          latitude: frame ? frame.latitude : null,
          longitude: frame ? frame.longitude : null,
          speedKmh: frame ? frame.speed : null,
          movementStatus: frame ? deriveStatus(frame.speed) : null,
          lastUpdate: frame ? frame.timestamp : null,
          // Regulasyon (04.08): assess satiri; yoksa null -> scorer 0.5 notr
          compliance: assessQuery.data?.byVehicle.get(vehicleId) ?? null,
          // FEAT-020 Phase 1.2: undefined kalirsa cargoScorer fallback'e duser.
          cargoCapacity: vehicleCargoCapacityById[vehicleId],
        };
      });
    },
    [vehicleLabels, assessQuery.data, vehicleCargoCapacityById]
  );

  const rebuildBoard = useCallback(
    (
      mode: RankingMode,
      currentAssignments: Map<string, string>,
      framesOverride?: DispatchLocationFrame[]
    ) => {
      if (!result?.tasks || result.tasks.length === 0) return;
      const frames = framesOverride ?? locationsQuery.data;
      const snapshots = buildSnapshots(result.available_vehicles, frames);
      const ranked = rankVehicles(mode, snapshots, scoringTasks);
      lastRankedRef.current = { mode, ranked }; // FN-18: approve aninda snapshot icin
      const orderedIds =
        ranked.length > 0 ? ranked.map((r) => r.vehicleId) : result.available_vehicles;
      // UX turu (04.08): mikro rozetler — mesafe yalniz telemetri varsa,
      // ZE durumu + heffing yalniz assess verisi geldiyse. Veri yoksa rozet
      // BASILMAZ (durustluk: uydurma metrik yok).
      const snapById = new Map(snapshots.map((s) => [s.id, s] as const));
      const scoreById =
        ranked.length > 0
          ? new Map(
              ranked.map((r) => {
                const s = snapById.get(r.vehicleId);
                const badges: ColumnBadge[] = [];
                if (s && s.latitude !== null && s.longitude !== null && scoringTasks[0]) {
                  const km = haversineKm(
                    s.latitude,
                    s.longitude,
                    scoringTasks[0].pickup.lat,
                    scoringTasks[0].pickup.lng
                  );
                  badges.push({
                    icon: "place",
                    text: t("common.distanceKm", { value: formatNumber(km, lang, { maximumFractionDigits: 1 }) }),
                    tone: "neutral",
                  });
                }
                const cRow = s?.compliance;
                if (cRow) {
                  if (
                    cRow.status === "compliant" ||
                    cRow.status === "exempt_auto" ||
                    cRow.status === "exempt_granted"
                  ) {
                    badges.push({ icon: "eco", text: t("optimize.zeCompliant"), tone: "good" });
                  } else if (cRow.status === "needs_exemption") {
                    badges.push({ icon: "report_problem", text: t("optimize.exemptionNeeded"), tone: "warn" });
                  } else if (cRow.status === "blocked") {
                    badges.push({ icon: "block", text: t("optimize.entryBlocked"), tone: "warn" });
                  }
                  if (cRow.heffing && cRow.heffing.matched) {
                    badges.push({
                      icon: "euro",
                      text: `€${cRow.heffing.total_charge.toFixed(2)}`,
                      tone: "neutral",
                    });
                  }
                }
                // FEAT-020 Phase 1.2 (FN-2): binary-gate kargo elenmesi — compliance
                // "entryBlocked" rozetiyle AYNI desen, yeni state/mimari gerekmedi.
                if (r.detail.eligible === false) {
                  badges.push({ icon: "block", text: t("optimize.cargoIneligible"), tone: "warn" });
                }
                return [
                  r.vehicleId,
                  { chip: `${Math.round(r.detail.value * 100)}`, memo: r.detail.memo, badges },
                ] as [string, { chip: string; memo: string; badges: ColumnBadge[] }];
              })
            )
          : null;
      setInitialBoard(buildBoard(result.tasks, orderedIds, vehicleLabels, currentAssignments, scoreById));
      setBoardEpoch((e) => e + 1);
    },
    [result, scoringTasks, vehicleLabels, buildSnapshots, locationsQuery.data, t, lang]
  );

  // Regulasyon (04.08): assess sonucu board kurulumundan SONRA gelirse
  // skor/memolar tazelensin — ref-gate ile yalniz veri degisiminde bir kez
  // (surukleme/epoch davranisina dokunulmaz).
  const lastAssessRef = useRef<unknown>(null);
  useEffect(() => {
    if (!assessQuery.data || assessQuery.data === lastAssessRef.current) return;
    lastAssessRef.current = assessQuery.data;
    if (initialBoard) rebuildBoard(rankingMode, assignments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessQuery.data]);

  useEffect(() => {
    if (
      status === "completed" &&
      result?.tasks &&
      result.tasks.length > 0 &&
      !initialBoard &&
      locationsQuery.isFetched
    ) {
      // BUG-6 fix (31.07): varsayilan atama = scorer #1 ONERISI (tek-task).
      // Eski davranis round-robin idi; scorer'in #1'i round-robin'den farkli
      // oldugu anda kullanici HICBIR SEYE dokunmadan "override" sayiliyordu
      // (sahte uyari + is_override=t kirliligi — 31.07 karar logu kaniti).
      // Simdi: dokunulmamis onay = chosen==recommended = is_override=f;
      // dialog yalniz kullanici karti SURUKLERSE acilir. Coklu-task fallback:
      // round-robin (Phase 1 form tek-task).
      let initialAssignments: Map<string, string>;
      const initSnapshots = buildSnapshots(result.available_vehicles, locationsQuery.data);
      const initRanked = rankVehicles(rankingMode, initSnapshots, scoringTasks);
      // BUG-2: fan-out varsa indeks eslemesi draft[i] -> arac[i] sabitlenir
      // (kopyalar birebir ozdes oldugu icin esleme backend sirasindan bagimsiz
      // gecerlidir). Kanban'da surukleme aynen acik kalir. Fanout araci
      // available_vehicles'ta yoksa o indeks round-robin'e duser (backend
      // approve tarafindaki ayni guvenlik agiyla parite).
      const fanout = submittedFanoutRef.current;
      if (result.tasks.length === 1 && initRanked.length > 0) {
        initialAssignments = new Map([[result.tasks[0].id, initRanked[0].vehicleId]]);
      } else if (fanout && result.tasks.length === fanout.length) {
        initialAssignments = new Map();
        result.tasks.forEach((t: OptimizeResultTask, idx: number) => {
          const vid = result.available_vehicles.includes(fanout[idx])
            ? fanout[idx]
            : result.available_vehicles[idx % result.available_vehicles.length];
          initialAssignments.set(t.id, vid);
        });
      } else {
        initialAssignments = buildRoundRobinAssignments(
          result.tasks,
          result.available_vehicles
        );
      }
      setAssignments(initialAssignments);
      // taskId -> kisit haritasi (onayli plan veri yapisi). Tek-task => 1:1.
      if (submittedConstraints) {
        const cmap = new Map<string, StrictTaskConstraints>();
        result.tasks.forEach((t: OptimizeResultTask) => cmap.set(t.id, submittedConstraints));
        setTaskConstraintsMap(cmap);
      }
      rebuildBoard(rankingMode, initialAssignments);
    }
  }, [status, result, initialBoard, rankingMode, rebuildBoard, locationsQuery.isFetched, locationsQuery.data, submittedConstraints, buildSnapshots, scoringTasks]);

  const handleModeChange = (_e: unknown, newMode: RankingMode | null) => {
    if (!newMode) return;
    const scorer = getScorer(newMode);
    if (!scorer || !scorer.available) return;
    setRankingMode(newMode);
    rebuildBoard(newMode, assignments);
  };

  const handleRefreshRanking = async () => {
    const res = await locationsQuery.refetch();
    rebuildBoard(rankingMode, assignments, res.data);
  };

  const handleCardDragEnd = (card: KanbanCard, _source: any, destination: any) => {
    if (!destination || !destination.toColumnId) return;
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(card.id, destination.toColumnId);
      return next;
    });
  };

  // FEAT-010:FN-18 - scorer #1 onerisi (siralama yoksa null; sahte deger uretilmez)
  const getRecommendedVehicleId = (): string | null => {
    const lr = lastRankedRef.current;
    return lr && lr.ranked.length > 0 ? lr.ranked[0].vehicleId : null;
  };

  const proceedApprove = (
    overrideReason: string | null,
    conflictReason: string | null = null
  ) => {
    if (!jobId) return;
    setOverrideDialogOpen(false);
    const vehicle_assignments: VehicleAssignment[] = Array.from(assignments.entries()).map(
      ([taskId, vehicleId]) => ({ taskId, vehicleId })
    );
    // BUG-1 Faz A (frontend bacagi): formdaki VRPTW baslangici approve'a tasinir;
    // backend scheduled_start = bu deger, estimated_end = HERE/fallback hesabi.
    // Pencere girilmemisse gonderilmez -> backend NOW() fallback'i (kontrat).
    const time_windows: TimeWindow[] = Array.from(taskConstraintsMap.entries())
      .filter(([, cst]) => cst.extended.time_window_start)
      .map(([taskId, cst]) => ({
        taskId,
        start: cst.extended.time_window_start as string,
      }));
    approveMutation.mutate(
      {
        routing_job_id: jobId,
        vehicle_assignments,
        ...(time_windows.length > 0 ? { time_windows } : {}),
        // BUG-1 Faz C: Mode 1 "Gerekceli Onay" - yalniz cakisma modalinin
        // onayindan gelir; normal akista override alanlari HIC gonderilmez.
        ...(conflictReason ? { override: true, override_reason: conflictReason } : {}),
      },
      {
        onSuccess: (data) => {
          setConflictPrompt(null);
          // BUG-2: birikimli sayac — kismi basari sonrasi "Gerekceli Onay"
          // retry'inda pushed toplanir; conflicts her zaman SON yanittan gelir
          // (override retry'inda backend bos doner -> ozet blok kapanir).
          setApproveSuccess((prev) => ({
            pushed: (prev?.pushed ?? 0) + data.pushed,
            conflicts: data.conflicts ?? [],
          }));
          notifyToast({
            type: "form_ok",
            titleKey: "notifyForm.approved",
            body: t("optimize.approved", { count: (0 + data.pushed) }),
          });
          // FEAT-010:FN-18 - karar logu, approve BASARISINDAN sonra, best-effort
          // (no-throw sozlesmesi postDecisionLog icinde; approve asla bloke olmaz).
          const lr = lastRankedRef.current;
          const recommended = getRecommendedVehicleId();
          const snapshot = lr
            ? lr.ranked.map((r, i) => ({
                vehicle_id: r.vehicleId,
                rank: i + 1,
                score: r.detail.value,
                memo: r.detail.memo,
                mode: lr.mode,
              }))
            : [];
          // BUG-1 Faz C: override ile gecilen cakismalar task bazinda eslestirilir
          // (approve yanitindaki overridden_conflicts -> draft_id === taskId).
          const conflictByTask = new Map(
            (data.overridden_conflicts ?? []).map((oc) => [oc.draft_id, oc])
          );
          // BUG-2 F1 (Cem onayli): karar logu YALNIZ push edilen gorevlere.
          // Draft kalanlara sahte "karar verildi" logu atilmaz; retry'da
          // onceden push edilenlere mukerrer log olusmaz.
          const pushedSet = new Set(data.tasks ?? []);
          vehicle_assignments.forEach(({ taskId, vehicleId }) => {
            if (!pushedSet.has(taskId)) return;
            const sealed = conflictByTask.get(taskId);
            postDecisionLog(token, {
              routing_job_id: jobId,
              dispatch_task_id: taskId,
              scorer_snapshot: snapshot,
              constraints_snapshot: taskConstraintsMap.get(taskId) ?? null,
              recommended_vehicle_id: recommended,
              chosen_vehicle_id: vehicleId,
              override_reason: overrideReason,
              // BUG-1 Faz C: cakisma muhru (audit/ML) + serbest gerekce
              // override_comment'te (SS6.4 enum'una dokunulmaz).
              conflict_metadata: sealed
                ? {
                    conflicting_task_no: sealed.conflicting_task_no,
                    overlap_minutes: sealed.overlap_minutes,
                  }
                : null,
              override_comment: sealed && conflictReason ? conflictReason : null,
            });
          });
        },
        onError: (err) => {
          // BUG-1 Faz C: 409 yapilandirilmis gelir -> sert modal acilir.
          if (err instanceof ApproveConflictError) {
            setConflictPrompt({
              conflict: err.conflict_metadata,
              fn20Reason: overrideReason,
            });
          }
        },
      }
    );
  };

  const handleApprove = () => {
    if (!jobId) return;
    const recommended = getRecommendedVehicleId();
    const hasOverride =
      recommended !== null &&
      Array.from(assignments.values()).some((vehicleId) => vehicleId !== recommended);
    if (hasOverride) {
      // FN-20: sebep OPSIYONEL (#20 ONAYLI) - dialog bos gecilebilir, approve engellenmez
      setOverrideDialogOpen(true);
      return;
    }
    proceedApprove(null);
  };

  const handleReset = () => {
    setPickup(emptyLocation);
    setDropoff(emptyLocation);
    setSelectedVehicleIds([]);
    setJobId(null);
    setApproveSuccess(null);
    setFieldError({});
    setInitialBoard(null);
    setAssignments(new Map());
    setRankingMode("spatial");
    // Logistics & Constraints reset (Form UX v2)
    setDirection(EMPTY_CONSTRAINTS.extended.direction);
    setLocationType(EMPTY_CONSTRAINTS.extended.location_type);
    setVolumeM3("");
    setWeightKg("");
    setHazmatClasses([]);
    setSkills([]);
    setCustomSkill("");
    setTimeWindowStart(null);
    setTimeWindowEnd(null);
    setSubmittedConstraints(null);
    setTaskConstraintsMap(new Map());
    setOverrideDialogOpen(false);
    setConflictPrompt(null);
    // BUG-2 temizligi
    setBulkConfirmOpen(false);
    submittedFanoutRef.current = null;
  };

  const summaryConstraints =
    submittedConstraints ??
    (taskConstraintsMap.size > 0 ? Array.from(taskConstraintsMap.values())[0] : null);

  // flatpickr ortak ayarlar (24 saat, 5 dk adim)
  const pickerOptions = {
    enableTime: true,
    time_24hr: true,
    dateFormat: "Y-m-d H:i",
    minuteIncrement: 5,
  };

  const fmtChip = (d: Date | null) => (d ? formatDateTime(d) : null);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <MDTypography variant="h5" component="h2">
            {t("optimize.title")}
          </MDTypography>
          <MDButton variant="outlined" color="dark" size="small" onClick={() => navigate("/dispatcher/tasks")}>
            {t("optimize.back")}
          </MDButton>
        </MDBox>

        <Alert severity="info" sx={{ mb: 3 }}>
          {t("optimize.mockBanner")}
        </Alert>

        {!jobId && (
          <Card sx={{ p: 3 }}>
            <MDTypography variant="h6" component="h3" mb={2}>
              {t("optimize.pickup")} *
            </MDTypography>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12}>
                <LocationSearchInput
                  label={t("optimize.pickupSearch")}
                  value={pickup}
                  onValueChange={setPickup}
                  required
                  error={Boolean(fieldError.pickup)}
                  helperText={fieldError.pickup}
                />
              </Grid>
            </Grid>

            <MDTypography variant="h6" component="h3" mb={2}>
              {t("optimize.dropoff")} *
            </MDTypography>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12}>
                <LocationSearchInput
                  label={t("optimize.dropoffSearch")}
                  value={dropoff}
                  onValueChange={setDropoff}
                  required
                  error={Boolean(fieldError.dropoff)}
                  helperText={fieldError.dropoff}
                />
              </Grid>
            </Grid>

            <MDTypography variant="h6" component="h3" mb={1}>
              {t("optimize.vehicles")} *
            </MDTypography>
            {loadingVehicles && <MDTypography variant="caption">{t("optimize.loadingVehicles")}</MDTypography>}
            <MDBox display="flex" flexWrap="wrap" gap={1} mb={1} role="group" aria-label={t("optimize.vehicles")}>
              {vehicles.map((v: Vehicle) => (
                <FormControlLabel
                  key={v.id}
                  control={
                    <Checkbox
                      checked={selectedVehicleIds.includes(v.id)}
                      onChange={() => toggleVehicle(v.id)}
                    />
                  }
                  label={v.plate_no || v.id}
                />
              ))}
            </MDBox>
            {fieldError.vehicles && (
              <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mb={2}>
                {fieldError.vehicles}
              </MDTypography>
            )}

            <Divider sx={{ my: 2 }} />

            <MDTypography variant="h6" component="h3" mb={0.5}>
              {t("optimize.constraintsTitle")}
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block" mb={2}>
              {t("optimize.constraintsHint")}
            </MDTypography>

            <Grid container spacing={2} mb={1}>
              <Grid item xs={12} md={5}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  {t("optimize.direction")}
                </MDTypography>
                <ToggleButtonGroup
                  value={direction}
                  exclusive
                  fullWidth
                  size="small"
                  onChange={(_e, v: TaskDirection | null) => v && setDirection(v)}
                >
                  {DIRECTION_OPTIONS.map((o) => (
                    <ToggleButton key={o.value} value={o.value} sx={{ textTransform: "none" }}>
                      <Icon sx={{ mr: 0.5 }} fontSize="small" aria-hidden>
                        {DIRECTION_ICONS[o.value]}
                      </Icon>
                      {directionLabel(o.value, t)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12} md={7}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  {t("optimize.locationType")}
                </MDTypography>
                <ToggleButtonGroup
                  value={locationType}
                  exclusive
                  fullWidth
                  size="small"
                  onChange={(_e, v: TaskLocationType | null) => v && setLocationType(v)}
                >
                  {LOCATION_TYPE_OPTIONS.map((o) => (
                    <ToggleButton key={o.value} value={o.value} sx={{ textTransform: "none" }}>
                      <Icon sx={{ mr: 0.5 }} fontSize="small" aria-hidden>
                        {LOCTYPE_ICONS[o.value]}
                      </Icon>
                      {locationLabel(o.value, t)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label={t("optimize.volume")}
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                  error={Boolean(fieldError.volume)}
                  helperText={fieldError.volume}
                  inputProps={{ inputMode: "decimal", min: 0, "aria-invalid": Boolean(fieldError.volume) || undefined }}
                  sx={{ "& input": { fontVariantNumeric: "tabular-nums" } }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label={t("optimize.weight")}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  error={Boolean(fieldError.weight)}
                  helperText={fieldError.weight}
                  inputProps={{ inputMode: "decimal", min: 0, "aria-invalid": Boolean(fieldError.weight) || undefined }}
                  sx={{ "& input": { fontVariantNumeric: "tabular-nums" } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  {t("optimize.hazmatTitle")}
                </MDTypography>
                <MDBox display="flex" flexWrap="wrap" gap={0.75}>
                  {HAZMAT_CLASS_OPTIONS.map((cls) => {
                    const selected = hazmatClasses.includes(cls);
                    return (
                      <Chip
                        key={cls}
                        label={hazmatLabel(cls, t)}
                        size="small"
                        clickable
                        color={selected ? "warning" : "default"}
                        variant={selected ? "filled" : "outlined"}
                        onClick={() => toggleHazmat(cls)}
                      />
                    );
                  })}
                </MDBox>
              </Grid>

              <Grid item xs={12}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  {t("optimize.skillsTitle")}
                </MDTypography>
                <MDBox display="flex" flexWrap="wrap" gap={0.75} alignItems="center">
                  {SKILL_OPTIONS.map((s) => {
                    const selected = skills.includes(s);
                    return (
                      <Chip
                        key={s}
                        label={skillLabel(s, t)}
                        size="small"
                        clickable
                        color={selected ? "info" : "default"}
                        variant={selected ? "filled" : "outlined"}
                        onClick={() => toggleSkill(s)}
                      />
                    );
                  })}
                  {skills
                    .filter((s) => !SKILL_OPTIONS.includes(s))
                    .map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        size="small"
                        color="info"
                        onDelete={() => toggleSkill(s)}
                      />
                    ))}
                  <TextField
                    size="small"
                    placeholder={t("optimize.skillPlaceholder")}
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSkill();
                      }
                    }}
                    sx={{ width: 190 }}
                  />
                  <IconButton size="small" onClick={addCustomSkill} aria-label={t("optimize.skillAddAria")}>
                    <Icon fontSize="small" aria-hidden>
                      add_circle_outline
                    </Icon>
                  </IconButton>
                </MDBox>
              </Grid>

              <Grid item xs={12} sm={6}>
                <MDDatePicker
                  value={timeWindowStart ?? ""}
                  onChange={(dates: Date[]) => setTimeWindowStart(dates[0] ?? null)}
                  options={pickerOptions}
                  input={{
                    label: t("optimize.windowStart"),
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                  }}
                />
                <MDBox display="flex" flexWrap="wrap" gap={0.5} mt={0.75}>
                  <Chip label={t("optimize.presetNow")} size="small" clickable variant="outlined" onClick={() => setTimeWindowStart(new Date())} />
                  <Chip label={t("optimize.presetPlus1h")} size="small" clickable variant="outlined" onClick={() => setTimeWindowStart(hoursFromNow(1))} />
                  {timeWindowStart && (
                    <Chip
                      label={t("optimize.selectedWhen", { when: fmtChip(timeWindowStart) ?? "" })}
                      size="small"
                      color="info"
                      onDelete={() => setTimeWindowStart(null)}
                    />
                  )}
                </MDBox>
              </Grid>

              <Grid item xs={12} sm={6}>
                <MDDatePicker
                  value={timeWindowEnd ?? ""}
                  onChange={(dates: Date[]) => setTimeWindowEnd(dates[0] ?? null)}
                  options={{ ...pickerOptions, minDate: timeWindowStart ?? undefined }}
                  input={{
                    label: t("optimize.windowEnd"),
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                  }}
                />
                <MDBox display="flex" flexWrap="wrap" gap={0.5} mt={0.75}>
                  <Chip label={t("optimize.presetToday17")} size="small" clickable variant="outlined" onClick={() => setTimeWindowEnd(todayAt(17))} />
                  <Chip label={t("optimize.presetPlus2h")} size="small" clickable variant="outlined" onClick={() => setTimeWindowEnd(hoursFromNow(2))} />
                  <Chip label={t("optimize.presetTomorrow09")} size="small" clickable variant="outlined" onClick={() => setTimeWindowEnd(tomorrowAt(9))} />
                  {timeWindowEnd && (
                    <Chip
                      label={t("optimize.selectedWhen", { when: fmtChip(timeWindowEnd) ?? "" })}
                      size="small"
                      color="info"
                      onDelete={() => setTimeWindowEnd(null)}
                    />
                  )}
                </MDBox>
              </Grid>
            </Grid>

            <MDBox mt={2}>
              {submitMutation.isError && (
                <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mb={2}>
                  {t("optimize.submitFailed")}
                </MDTypography>
              )}

              <MDButton
                variant="gradient"
                color="info"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? t("optimize.submitting") : t("optimize.submit")}
              </MDButton>
            </MDBox>
          </Card>
        )}

        {jobId && (
          <Card sx={{ p: 3 }}>
            <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <MDTypography variant="h6" component="h3">{t("optimize.jobTitle")}</MDTypography>
              <MDTypography
                variant="caption"
                title={jobId ? t("optimize.copyJobId", { id: jobId }) : ""}
                onClick={() => {
                  if (jobId && navigator.clipboard) {
                    navigator.clipboard.writeText(jobId).catch(() => {});
                  }
                }}
                sx={{
                  opacity: 0.45,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  "&:hover": { opacity: 0.85 },
                }}
              >
                #{jobId ? jobId.slice(0, 8) : ""}
              </MDTypography>
            </MDBox>

            {isPolling && (
              <MDBox display="flex" alignItems="center" gap={2} mb={2}>
                <CircularProgress size={20} />
                <MDTypography variant="body2">
                  {t("optimize.statusLine", { status: status || "submitted" })}
                </MDTypography>
              </MDBox>
            )}

            {status === "completed" && result && !approveSuccess && (
              <MDBox mb={2}>
                {/* UX (04.08): tema-standardi KPI kartlari (analytics ile ayni bilesen).
                    percentage'a sahte +% uydurulmaz — notr etiket. */}
                <MDBox display="flex" gap={3} mt={4} mb={2} flexWrap="wrap">
                  <MDBox sx={{ width: 240 }}>
                    <ComplexStatisticsCard
                      color="info"
                      icon="route"
                      title={t("optimize.kpiDistance")}
                      count={`${formatNumber(result.summary.total_distance_meters / 1000, lang, { maximumFractionDigits: 1 })} km`}
                      percentage={{ color: "secondary", amount: "", label: t("optimize.kpiDistanceHint") }}
                    />
                  </MDBox>
                  <MDBox sx={{ width: 240 }}>
                    <ComplexStatisticsCard
                      color="primary"
                      icon="schedule"
                      title={t("optimize.kpiDuration")}
                      count={formatDurationMinutes(Math.round(result.summary.total_duration_seconds / 60), lang)}
                      percentage={{ color: "secondary", amount: "", label: t("optimize.kpiDurationHint") }}
                    />
                  </MDBox>
                </MDBox>
                <Divider sx={{ my: 2 }} />

                {summaryConstraints && (
                  <ConstraintsSummary c={summaryConstraints} darkMode={darkMode} />
                )}

                {/* Avrupa Ipucu Katmani (hedef 4): NL-bbox disi advisory —
                    Mode 1 ruhu, blok yok, yalniz akilli uyari seridi. */}
                {assessQuery.data?.eu_hint && (
                  <MDBox
                    sx={{
                      border: `1px solid ${brand.primary}`,
                      bgcolor: dialog.accentBg,
                      borderRadius: "10px",
                      p: 1.5,
                      mb: 2,
                    }}
                  >
                    <MDTypography variant="caption" fontWeight="bold">
                      🇪🇺 {assessQuery.data.eu_hint}
                    </MDTypography>
                  </MDBox>
                )}

                {initialBoard ? (
                  <>
                    <MDBox display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={1}>
                      <MDTypography variant="button" fontWeight="bold">
                        {t("optimize.rankBy")}
                      </MDTypography>
                      {/* UX (04.08): notifications sayfasi deseni — renkli
                          gradyan butonlar; secili=dolu, digerleri=outlined,
                          kilitli scorer=secondary disabled. */}
                      <MDBox display="flex" gap={1} flexWrap="wrap">
                        {SCORERS.map((s) => {
                          const btnColor = (
                            {
                              spatial: "info",
                              temporal: "success",
                              compliance: "warning",
                              cargo: "secondary",
                            } as Record<string, "info" | "success" | "warning" | "secondary">
                          )[s.id] ?? "info";
                          return (
                            <MDButton
                              key={s.id}
                              size="small"
                              color={btnColor}
                              variant={rankingMode === s.id ? "gradient" : "outlined"}
                              disabled={!s.available}
                              onClick={() => handleModeChange(null, s.id as RankingMode)}
                            >
                              {s.available ? scorerLabel(s.id, t) : t("optimize.comingSoon", { label: scorerLabel(s.id, t) })}
                            </MDButton>
                          );
                        })}
                      </MDBox>
                      <MDButton
                        variant="outlined"
                        color="info"
                        size="small"
                        onClick={handleRefreshRanking}
                      >
                        {t("optimize.refreshRanking")}
                      </MDButton>
                    </MDBox>
                    <MDTypography variant="button" fontWeight="bold" display="block" mt={1.5} mb={2}>
                      {t("optimize.kanbanHint")}
                    </MDTypography>
                    <MDBox
                      position="relative"
                      mb={3}
                      sx={{
                        "& .react-kanban-board": {
                          display: "block !important",
                          overflowY: "visible !important",
                        },
                        "& .react-kanban-board > div": {
                          whiteSpace: "normal !important",
                          display: "flex",
                          flexDirection: "column",
                          width: "100%",
                        },
                        "& .react-kanban-column": {
                          width: "100% !important",
                          minWidth: "100% !important",
                          maxWidth: "100% !important",
                          margin: "0 0 12px 0 !important",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          backgroundColor: darkMode ? dialog.dark.cardWash : paletteLight.grey[100],
                          border: darkMode ? `1px solid ${dialog.dark.border}` : `1px solid ${paletteLight.grey[300]}`,
                          boxShadow: "none",
                        },
                      }}
                    >
                      <Board
                        key={`kanban-${boardEpoch}`}
                        initialBoard={initialBoard}
                        onCardDragEnd={handleCardDragEnd}
                        disableColumnDrag
                        renderColumnHeader={(column: KanbanColumn) => (
                          <VehicleRowHeader column={column} darkMode={darkMode} />
                        )}
                        renderCard={({ id, template }: KanbanCard) => (
                          <MDBox
                            key={id}
                            display="block"
                            bgColor={darkMode ? paletteDark.darkFocus : "white"}
                            color="text"
                            borderRadius="md"
                            mt={1}
                            py={1}
                            px={1.25}
                            sx={{
                              border: darkMode
                                ? `1px solid ${dialog.dark.border}`
                                : `1px solid ${paletteLight.grey[300]}`,
                              boxShadow: "none",
                              fontSize: ({ typography: { size } }: any) => size.sm,
                              cursor: "grab",
                            }}
                          >
                            <MDTypography
                              variant="caption"
                              color={darkMode ? "white" : "text"}
                              fontWeight="regular"
                            >
                              {template}
                            </MDTypography>
                          </MDBox>
                        )}
                      />
                    </MDBox>
                  </>
                ) : (
                  <MDTypography variant="button" fontWeight="bold" display="block" mb={1}>
                    {t("optimize.vehiclesAvailable", { count: result.available_vehicles.length })}
                  </MDTypography>
                )}

                {approveMutation.isError &&
                  !(approveMutation.error instanceof ApproveConflictError) && (
                    <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mb={2}>
                      {t("optimize.approveFailed")}
                    </MDTypography>
                  )}
                <MDButton
                  variant="gradient"
                  color="success"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? t("optimize.approving") : t("optimize.approve")}
                </MDButton>
              </MDBox>
            )}

            <OverrideReasonDialog
              open={overrideDialogOpen}
              /* K4 (04.08): secim vs oneri chip'leri — render aninda turetilir */
              chosenPlate={(() => {
                const rec = getRecommendedVehicleId();
                const vals = Array.from(assignments.values());
                const chosen = vals.find((v) => v !== rec) ?? vals[0];
                return chosen ? vehicleLabels[chosen] || chosen.slice(0, 8) : undefined;
              })()}
              recommendedPlate={(() => {
                const rec = getRecommendedVehicleId();
                return rec ? vehicleLabels[rec] || rec.slice(0, 8) : undefined;
              })()}
              onCancel={() => setOverrideDialogOpen(false)}
              onConfirm={(reason) => proceedApprove(reason)}
            />

            {/* BUG-1 Faz C: zaman penceresi cakismasi sert modali (MD2 PRO).
                Vazgec -> atama yok (backend rollback zaten yapti);
                Gerekceli Onay -> ayni payload + override:true + zorunlu gerekce. */}
            <ConflictOverrideModal
              open={conflictPrompt !== null}
              conflict={conflictPrompt?.conflict ?? null}
              submitting={approveMutation.isPending}
              onCancel={() => setConflictPrompt(null)}
              onConfirm={(reason) =>
                proceedApprove(conflictPrompt?.fn20Reason ?? null, reason)
              }
            />

            {approveSuccess && (
              <MDBox>
                <MDTypography variant="body2" color="success" fontWeight="bold" mb={2}>
                  {t("optimize.approved", { count: approveSuccess.pushed })}
                </MDTypography>
                {/* BUG-2: kismi basari — cakismaya takilip draft kalanlarin ozeti
                    + ayni routing_job_id ile override:true retry kapisi. */}
                {approveSuccess.conflicts.length > 0 && (
                  <MDBox mb={2}>
                    <MDTypography
                      variant="body2"
                      color="error"
                      fontWeight="bold"
                      mb={1}
                    >
                      {t("optimize.conflictsBlocked", { count: approveSuccess.conflicts.length })}
                    </MDTypography>
                    {approveSuccess.conflicts.map((c) => (
                      <MDTypography
                        key={c.draft_id}
                        variant="caption"
                        color="text"
                        display="block"
                      >
                        {c.conflict_metadata
                          ? t("optimize.conflictLine", {
                              plate: vehicleLabels[c.vehicle_id] || c.vehicle_id.slice(0, 8),
                              task: c.conflict_metadata.conflicting_task_no,
                              n: c.conflict_metadata.overlap_minutes,
                            })
                          : vehicleLabels[c.vehicle_id] || c.vehicle_id.slice(0, 8)}
                      </MDTypography>
                    ))}
                    <MDBox mt={1.5}>
                      <MDButton
                        variant="gradient"
                        color="error"
                        size="small"
                        disabled={approveMutation.isPending}
                        onClick={() =>
                          setConflictPrompt({
                            conflict:
                              approveSuccess.conflicts[0]?.conflict_metadata ??
                              null,
                            fn20Reason: null,
                          })
                        }
                      >
                        {t("optimize.overrideConflicts")}
                      </MDButton>
                    </MDBox>
                  </MDBox>
                )}
                <MDButton variant="gradient" color="info" onClick={handleReset}>
                  {t("optimize.createAnother")}
                </MDButton>
              </MDBox>
            )}

            {status === "failed" && (
              <MDTypography variant="body2" color="error" fontWeight="bold">
                {t("optimize.failed", {
                  error: pollQuery.data?.error || t("optimize.unknownError"),
                })}
              </MDTypography>
            )}
          </Card>
        )}

        {/* BUG-2: bulk fan-out onay kapisi. MUI Dialog portal'da render olur;
            form karti (!jobId) kapali/acik farketmez, her zaman erisilebilir. */}
        <BulkConfirmDialog
          open={bulkConfirmOpen}
          vehicles={selectedVehicleIds.map((id) => ({
            id,
            plate: vehicleLabels[id] || id.slice(0, 8),
          }))}
          submitting={submitMutation.isPending}
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={doSubmit}
        />
      </MDBox>
    </DashboardLayout>
  );
}

export default OptimizeTask;

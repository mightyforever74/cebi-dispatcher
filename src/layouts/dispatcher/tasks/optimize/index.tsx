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
import Popover from "@mui/material/Popover";
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

// Material Dashboard 2 PRO React context (dark mode)
import { useMaterialUIController } from "context";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Real API
import useVehicles, { Vehicle } from "hooks/useVehicles";
import {
  useSubmitOptimization,
  usePollOptimization,
  useApproveOptimization,
  OptimizeResultTask,
  VehicleAssignment,
} from "hooks/useTaskOptimization";

// Canli telemetri snapshot'i (store bypass)
import useDispatchLocationSnapshot, {
  DispatchLocationFrame,
} from "hooks/useDispatchLocationSnapshot";
import { deriveStatus } from "store/useVehicleStore";

// Decision Support Engine (Phase 1)
import { SCORERS, getScorer, rankVehicles } from "services/dispatch/scoring/registry";
import {
  RankingMode,
  ScoringTask,
  ScoringVehicleSnapshot,
} from "services/dispatch/scoring/types";

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
import { useAuthStore } from "store/useAuthStore";
import { postDecisionLog } from "services/dispatch/decisionLog";
import OverrideReasonDialog from "components/OverrideReasonDialog";

const emptyLocation: LocationValue = { address: "", latitude: null, longitude: null };

interface KanbanCard {
  id: string;
  template: string;
}
interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  scoreChip?: string;
  scoreMemo?: string;
  rank?: number;
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
  scoreById: Map<string, { chip: string; memo: string }> | null
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

// Gorev kisitlarinin kompakt ozeti (board ustunde, bilgi-yogun B2B satiri).
function ConstraintsSummary({
  c,
  darkMode,
}: {
  c: StrictTaskConstraints;
  darkMode: boolean;
}): JSX.Element {
  const cap = c.capacity_required;
  const ext = c.extended;
  const dirLabel =
    DIRECTION_OPTIONS.find((o) => o.value === ext.direction)?.label ?? ext.direction;
  const locLabel =
    LOCATION_TYPE_OPTIONS.find((o) => o.value === ext.location_type)?.label ?? ext.location_type;
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  const chips: string[] = [
    dirLabel,
    locLabel,
    cap.volume_m3 != null ? `${cap.volume_m3} m³` : "hacim —",
    cap.weight_kg != null ? `${cap.weight_kg} kg` : "agirlik —",
    cap.hazmat_classes.length ? `Hazmat: ${cap.hazmat_classes.join(", ")}` : "Hazmat yok",
    c.skill_required.length ? `Yetkinlik: ${c.skill_required.join(", ")}` : "Yetkinlik —",
    `Pencere: ${fmt(ext.time_window_start)} → ${fmt(ext.time_window_end)}`,
  ];

  return (
    <MDBox
      mb={2}
      p={1.5}
      sx={{
        borderRadius: "8px",
        border: darkMode ? "1px solid rgba(255,255,255,0.15)" : "1px solid #d2d6da",
        boxShadow: "none",
      }}
    >
      <MDTypography variant="caption" fontWeight="bold" display="block" mb={1}>
        Gorev kisitlari (Karar Destek Asistanina beslenen)
      </MDTypography>
      <MDBox display="flex" flexWrap="wrap" gap={0.75}>
        {chips.map((label) => (
          <Chip key={label} label={label} size="small" variant="outlined" />
        ))}
      </MDBox>
    </MDBox>
  );
}

function VehicleRowHeader({
  column,
  darkMode,
}: {
  column: KanbanColumn;
  darkMode: boolean;
}): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { title, scoreChip, scoreMemo, rank, cards } = column;

  return (
    <MDBox
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      pb={1}
      sx={{
        borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #d2d6da",
      }}
    >
      <MDBox display="flex" alignItems="center" gap={1.5}>
        {rank !== undefined && (
          <MDTypography variant="button" fontWeight="bold" color="info">
            #{rank}
          </MDTypography>
        )}
        <MDTypography variant="h6" fontWeight="bold" color={darkMode ? "white" : "dark"}>
          {title}
        </MDTypography>
        <MDTypography variant="caption" color="text">
          {cards.length} gorev
        </MDTypography>
      </MDBox>
      <MDBox display="flex" alignItems="center" gap={1}>
        {scoreChip && (
          <Chip
            label={scoreChip}
            size="small"
            color={Number(scoreChip) >= 50 ? "success" : "default"}
            sx={{ fontWeight: "bold" }}
          />
        )}
        {scoreMemo && (
          <>
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "inherit" }}
            >
              <Icon fontSize="small">info_outlined</Icon>
            </IconButton>
            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MDBox p={2} maxWidth={380}>
                <MDTypography variant="button" fontWeight="bold" display="block" mb={1}>
                  Akilli Karar Notu — {title}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  {scoreMemo}
                </MDTypography>
              </MDBox>
            </Popover>
          </>
        )}
      </MDBox>
    </MDBox>
  );
}

function OptimizeTask(): JSX.Element {
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const locationsQuery = useDispatchLocationSnapshot();

  const [pickup, setPickup] = useState<LocationValue>(emptyLocation);
  const [dropoff, setDropoff] = useState<LocationValue>(emptyLocation);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<{ pushed: number } | null>(null);

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
  const collectConstraints = (): StrictTaskConstraints => ({
    capacity_required: {
      volume_m3: volumeM3.trim() === "" ? null : Number(volumeM3),
      weight_kg: weightKg.trim() === "" ? null : Number(weightKg),
      hazmat_classes: hazmatClasses,
    },
    skill_required: skills,
    extended: {
      direction,
      location_type: locationType,
      time_window_start: dateToIso(timeWindowStart),
      time_window_end: dateToIso(timeWindowEnd),
    },
  });

  const handleSubmit = () => {
    setFormError("");
    setApproveSuccess(null);

    if (!validLocation(pickup) || !validLocation(dropoff)) {
      setFormError("Pickup and dropoff must be selected from the search suggestions.");
      return;
    }
    if (selectedVehicleIds.length === 0) {
      setFormError("Select at least one vehicle.");
      return;
    }

    const constraints = collectConstraints();
    // Scorer bunu okur (Grup A + Grup B). Grup B backend'e GITMEZ.
    setSubmittedConstraints(constraints);

    submitMutation.mutate(
      {
        tasks: [
          {
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
          },
        ],
        vehicles: selectedVehicleIds,
      },
      {
        onSuccess: (data) => {
          setJobId(data.jobId);
        },
      }
    );
  };

  const status = pollQuery.data?.status;
  const isPolling = !!jobId && status !== "completed" && status !== "failed";
  const result = pollQuery.data?.result;

  const vehicleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach((v: Vehicle) => {
      map[v.id] = v.plate_no || v.id.slice(0, 8);
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
      const frameByVehicleId = new Map((frames ?? []).map((f) => [f.vehicle_id, f]));
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
        };
      });
    },
    [vehicleLabels]
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
      const scoreById =
        ranked.length > 0
          ? new Map(
              ranked.map((r) => [
                r.vehicleId,
                { chip: `${Math.round(r.detail.value * 100)}`, memo: r.detail.memo },
              ])
            )
          : null;
      setInitialBoard(buildBoard(result.tasks, orderedIds, vehicleLabels, currentAssignments, scoreById));
      setBoardEpoch((e) => e + 1);
    },
    [result, scoringTasks, vehicleLabels, buildSnapshots, locationsQuery.data]
  );

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
      if (result.tasks.length === 1 && initRanked.length > 0) {
        initialAssignments = new Map([[result.tasks[0].id, initRanked[0].vehicleId]]);
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
  }, [status, result, initialBoard, rankingMode, rebuildBoard, locationsQuery.isFetched, submittedConstraints]);

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

  const proceedApprove = (overrideReason: string | null) => {
    if (!jobId) return;
    setOverrideDialogOpen(false);
    const vehicle_assignments: VehicleAssignment[] = Array.from(assignments.entries()).map(
      ([taskId, vehicleId]) => ({ taskId, vehicleId })
    );
    approveMutation.mutate(
      { routing_job_id: jobId, vehicle_assignments },
      {
        onSuccess: (data) => {
          setApproveSuccess({ pushed: data.pushed });
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
          vehicle_assignments.forEach(({ taskId, vehicleId }) => {
            postDecisionLog(token, {
              routing_job_id: jobId,
              dispatch_task_id: taskId,
              scorer_snapshot: snapshot,
              constraints_snapshot: taskConstraintsMap.get(taskId) ?? null,
              recommended_vehicle_id: recommended,
              chosen_vehicle_id: vehicleId,
              override_reason: overrideReason,
            });
          });
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
    setFormError("");
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
  };

  const inactiveScorers = SCORERS.filter((s) => !s.available);
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

  const fmtChip = (d: Date | null) =>
    d
      ? d.toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : null;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <MDTypography variant="h5">New Task — Route Optimization</MDTypography>
          <MDButton variant="outlined" color="dark" size="small" onClick={() => navigate("/dispatcher/tasks")}>
            back to tasks
          </MDButton>
        </MDBox>

        <Alert severity="info" sx={{ mb: 3 }}>
          Test mode active: the optimization engine is currently a mock (HERE Tour Planning
          integration is planned but not yet built). The initial vehicle layout below is
          simulated to match the backend, but you can drag any task to a different vehicle
          before approving.
        </Alert>

        {!jobId && (
          <Card sx={{ p: 3 }}>
            <MDTypography variant="h6" mb={2}>
              Pickup
            </MDTypography>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12}>
                <LocationSearchInput label="Search pickup address" value={pickup} onValueChange={setPickup} />
              </Grid>
            </Grid>

            <MDTypography variant="h6" mb={2}>
              Dropoff
            </MDTypography>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12}>
                <LocationSearchInput label="Search dropoff address" value={dropoff} onValueChange={setDropoff} />
              </Grid>
            </Grid>

            <MDTypography variant="h6" mb={1}>
              Vehicles
            </MDTypography>
            {loadingVehicles && <MDTypography variant="caption">Loading vehicles...</MDTypography>}
            <MDBox display="flex" flexWrap="wrap" gap={1} mb={3}>
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

            <Divider sx={{ my: 2 }} />

            {/* ===== Logistics & Constraints (Strateji 3 + Form UX v2) ===== */}
            <MDTypography variant="h6" mb={0.5}>
              Logistics &amp; Constraints
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block" mb={2}>
              Kapasite ve yetkinlik goreve muhurlenir (capacity_required jsonb + skill_required).
              Yon, konum tipi ve teslim penceresi bu oturumda Karar Destek Asistanina beslenir
              (frontend-state) — DB semasi degismez.
            </MDTypography>

            <Grid container spacing={2} mb={1}>
              {/* --- Yon: ikonlu segmented toggle (Form UX v2) --- */}
              <Grid item xs={12} md={5}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  Yon
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
                      <Icon sx={{ mr: 0.5 }} fontSize="small">
                        {DIRECTION_ICONS[o.value]}
                      </Icon>
                      {o.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              {/* --- Konum Tipi: ikonlu segmented toggle (Form UX v2) --- */}
              <Grid item xs={12} md={7}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  Konum Tipi
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
                      <Icon sx={{ mr: 0.5 }} fontSize="small">
                        {LOCTYPE_ICONS[o.value]}
                      </Icon>
                      {o.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Hacim (m³)"
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                  inputProps={{ min: 0, step: "0.1" }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Agirlik (kg)"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  inputProps={{ min: 0, step: "1" }}
                />
              </Grid>

              {/* --- Hazmat: tiklanabilir chip-grid (Form UX v2). Hicbiri secili = yok --- */}
              <Grid item xs={12} md={6}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  Hazmat siniflari (ADR) — secili yoksa tehlikeli madde yok
                </MDTypography>
                <MDBox display="flex" flexWrap="wrap" gap={0.75}>
                  {HAZMAT_CLASS_OPTIONS.map((cls) => {
                    const selected = hazmatClasses.includes(cls);
                    return (
                      <Chip
                        key={cls}
                        label={cls}
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

              {/* --- Yetkinlik: chip-grid + serbest ekleme (Form UX v2) --- */}
              <Grid item xs={12}>
                <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                  Surucu yetkinlikleri — secili yoksa yetkinlik aranmiyor
                </MDTypography>
                <MDBox display="flex" flexWrap="wrap" gap={0.75} alignItems="center">
                  {SKILL_OPTIONS.map((s) => {
                    const selected = skills.includes(s);
                    return (
                      <Chip
                        key={s}
                        label={s}
                        size="small"
                        clickable
                        color={selected ? "info" : "default"}
                        variant={selected ? "filled" : "outlined"}
                        onClick={() => toggleSkill(s)}
                      />
                    );
                  })}
                  {/* Ozel (listede olmayan) yetkinlikler - silinebilir */}
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
                    placeholder="Ozel yetkinlik ekle"
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
                  <IconButton size="small" onClick={addCustomSkill} aria-label="yetkinlik ekle">
                    <Icon fontSize="small">add_circle_outline</Icon>
                  </IconButton>
                </MDBox>
              </Grid>

              {/* --- VRPTW zaman penceresi: MDDatePicker + preset chip'ler (Form UX v2) --- */}
              <Grid item xs={12} sm={6}>
                <MDDatePicker
                  value={timeWindowStart ?? ""}
                  onChange={(dates: Date[]) => setTimeWindowStart(dates[0] ?? null)}
                  options={pickerOptions}
                  input={{
                    label: "Teslim penceresi baslangic (VRPTW)",
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                  }}
                />
                <MDBox display="flex" flexWrap="wrap" gap={0.5} mt={0.75}>
                  <Chip label="Simdi" size="small" clickable variant="outlined" onClick={() => setTimeWindowStart(new Date())} />
                  <Chip label="+1 saat" size="small" clickable variant="outlined" onClick={() => setTimeWindowStart(hoursFromNow(1))} />
                  {timeWindowStart && (
                    <Chip
                      label={`Secili: ${fmtChip(timeWindowStart)}`}
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
                    label: "Teslim penceresi bitis (VRPTW)",
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                  }}
                />
                <MDBox display="flex" flexWrap="wrap" gap={0.5} mt={0.75}>
                  <Chip label="Bugun 17:00" size="small" clickable variant="outlined" onClick={() => setTimeWindowEnd(todayAt(17))} />
                  <Chip label="+2 saat" size="small" clickable variant="outlined" onClick={() => setTimeWindowEnd(hoursFromNow(2))} />
                  <Chip label="Yarin 09:00" size="small" clickable variant="outlined" onClick={() => setTimeWindowEnd(tomorrowAt(9))} />
                  {timeWindowEnd && (
                    <Chip
                      label={`Secili: ${fmtChip(timeWindowEnd)}`}
                      size="small"
                      color="info"
                      onDelete={() => setTimeWindowEnd(null)}
                    />
                  )}
                </MDBox>
              </Grid>
            </Grid>

            <MDBox mt={2}>
              {formError && (
                <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mb={2}>
                  {formError}
                </MDTypography>
              )}
              {submitMutation.isError && (
                <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mb={2}>
                  Could not submit optimization — try again
                </MDTypography>
              )}

              <MDButton
                variant="gradient"
                color="info"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Optimize Route"}
              </MDButton>
            </MDBox>
          </Card>
        )}

        {jobId && (
          <Card sx={{ p: 3 }}>
            <MDTypography variant="h6" mb={2}>
              Optimization Job
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block" mb={2}>
              Job ID: {jobId}
            </MDTypography>

            {isPolling && (
              <MDBox display="flex" alignItems="center" gap={2} mb={2}>
                <CircularProgress size={20} />
                <MDTypography variant="body2">
                  Status: {status || "submitted"}...
                </MDTypography>
              </MDBox>
            )}

            {status === "completed" && result && !approveSuccess && (
              <MDBox mb={2}>
                <MDTypography variant="body2" mb={1}>
                  Total distance: {(result.summary.total_distance_meters / 1000).toFixed(1)} km
                </MDTypography>
                <MDTypography variant="body2" mb={2}>
                  Total duration: {Math.round(result.summary.total_duration_seconds / 60)} min
                </MDTypography>
                <Divider sx={{ my: 2 }} />

                {summaryConstraints && (
                  <ConstraintsSummary c={summaryConstraints} darkMode={darkMode} />
                )}

                {initialBoard ? (
                  <>
                    <MDBox display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={1}>
                      <MDTypography variant="button" fontWeight="bold">
                        Rank vehicles by
                      </MDTypography>
                      <ToggleButtonGroup
                        value={rankingMode}
                        exclusive
                        size="small"
                        onChange={handleModeChange}
                      >
                        {SCORERS.map((s) => (
                          <ToggleButton key={s.id} value={s.id} disabled={!s.available}>
                            {s.available ? s.label : `${s.label} (Phase 1.1 — Inactive)`}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                      <MDButton
                        variant="outlined"
                        color="info"
                        size="small"
                        onClick={handleRefreshRanking}
                      >
                        Siralamayi Guncelle
                      </MDButton>
                    </MDBox>
                    {inactiveScorers.map((s) => (
                      <MDTypography
                        key={s.id}
                        variant="caption"
                        color="text"
                        display="block"
                        mb={0.5}
                      >
                        {s.label}: {s.available === false ? s.reason : ""}
                      </MDTypography>
                    ))}

                    <MDTypography variant="button" fontWeight="bold" display="block" mt={1.5} mb={2}>
                      Vehicles are listed top to bottom, best match first for the selected
                      criterion. Drag a task onto another vehicle row to reassign it — ranking
                      never changes assignments; only you do.
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
                          backgroundColor: darkMode ? "rgba(255, 255, 255, 0.06)" : "#f8f9fa",
                          border: darkMode ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #d2d6da",
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
                            bgColor={darkMode ? "#2c3c58" : "white"}
                            color="text"
                            borderRadius="md"
                            mt={1}
                            py={1}
                            px={1.25}
                            sx={{
                              border: darkMode
                                ? "1px solid rgba(255, 255, 255, 0.2)"
                                : "1px solid #d2d6da",
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
                    Vehicles available for assignment ({result.available_vehicles.length})
                  </MDTypography>
                )}

                {approveMutation.isError && (
                  <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mb={2}>
                    Could not approve plan — try again
                  </MDTypography>
                )}
                <MDButton
                  variant="gradient"
                  color="success"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? "Approving..." : "Approve Plan"}
                </MDButton>
              </MDBox>
            )}

            <OverrideReasonDialog
              open={overrideDialogOpen}
              onCancel={() => setOverrideDialogOpen(false)}
              onConfirm={(reason) => proceedApprove(reason)}
            />

            {approveSuccess && (
              <MDBox>
                <MDTypography variant="body2" color="success" fontWeight="bold" mb={2}>
                  Plan approved — {approveSuccess.pushed} task(s) pushed to the fleet system.
                </MDTypography>
                <MDButton variant="gradient" color="info" onClick={handleReset}>
                  Create Another Task
                </MDButton>
              </MDBox>
            )}

            {status === "failed" && (
              <MDTypography variant="body2" color="error" fontWeight="bold">
                Optimization failed: {pollQuery.data?.error || "Unknown error"}
              </MDTypography>
            )}
          </Card>
        )}
      </MDBox>
    </DashboardLayout>
  );
}

export default OptimizeTask;

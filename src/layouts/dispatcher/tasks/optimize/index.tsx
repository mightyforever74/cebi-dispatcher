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
* "+ Nieuwe Taak" formu, VRP/Karar Destek kisitlariyla genisletildi. Onayli
* mimari hukum (sifir backend degisikligi):
*   - GRUP A (bugun DB'ye muhurlenir): capacity_required jsonb'sine volume_m3
*     + weight_kg + hazmat_classes paketlenip gonderilir; skill_required ham
*     array olarak gonderilir. Backend routes/tasks.js bunlari GERCEK kolonlara
*     yazar (kanitli).
*   - GRUP B (kolon YOK - backend'e GONDERILMEZ): direction, location_type,
*     time_window_start/end. Bunlar submit aninda submittedConstraints +
*     taskConstraintsMap<taskId, StrictTaskConstraints> icinde FRONTEND-STATE
*     olarak tutulur ve Scorer'a dogrudan beslenir.
*   - Scorer, kisitlari POLL SONUCUNDAN DEGIL bu frontend-state'ten okur
*     (mock zaten donmuyor). Zaman scorer'i time_window_end ile canli
*     feasibility siralar. Sayfa yenilenene kadar karar destek tam kapasite.
*   - Tum kisit verisi tek TypeScript kontratindan (types/metadata) akar -
*     form yazar, scorer okur, typo derlemede yakalanir.
=========================================================
*/

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// @asseinfo/react-kanban (ADR-0001 §3.6)
import Board from "@asseinfo/react-kanban";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
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

// datetime-local input degeri ("2026-07-20T14:30") -> ISO 8601 (UTC), bos ise null.
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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

  // --- Logistics & Constraints form state (Strateji 3) ---
  const [direction, setDirection] = useState<TaskDirection>("outbound");
  const [locationType, setLocationType] = useState<TaskLocationType>("customer");
  const [volumeM3, setVolumeM3] = useState<string>(""); // input string; submit'te Number/null
  const [weightKg, setWeightKg] = useState<string>("");
  const [hazmatNone, setHazmatNone] = useState<boolean>(true);
  const [hazmatClasses, setHazmatClasses] = useState<string[]>([]);
  const [noSkill, setNoSkill] = useState<boolean>(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [timeWindowStart, setTimeWindowStart] = useState<string>(""); // datetime-local
  const [timeWindowEnd, setTimeWindowEnd] = useState<string>("");

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

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const validLocation = (p: LocationValue) =>
    p.address.trim() !== "" && p.latitude !== null && p.longitude !== null;

  // Form state'inden StrictTaskConstraints uretir (tek kontrat).
  const collectConstraints = (): StrictTaskConstraints => ({
    capacity_required: {
      volume_m3: volumeM3.trim() === "" ? null : Number(volumeM3),
      weight_kg: weightKg.trim() === "" ? null : Number(weightKg),
      hazmat_classes: hazmatNone ? [] : hazmatClasses,
    },
    skill_required: noSkill ? [] : skills,
    extended: {
      direction,
      location_type: locationType,
      time_window_start: localToIso(timeWindowStart),
      time_window_end: localToIso(timeWindowEnd),
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
      const initialAssignments = buildRoundRobinAssignments(
        result.tasks,
        result.available_vehicles
      );
      setAssignments(initialAssignments);
      // taskId -> kisit haritasi (onayli plan veri yapisi). Tek-task => 1:1.
      if (submittedConstraints) {
        const cmap = new Map<string, StrictTaskConstraints>();
        result.tasks.forEach((t) => cmap.set(t.id, submittedConstraints));
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

  const handleApprove = () => {
    if (!jobId) return;
    const vehicle_assignments: VehicleAssignment[] = Array.from(assignments.entries()).map(
      ([taskId, vehicleId]) => ({ taskId, vehicleId })
    );
    approveMutation.mutate(
      { routing_job_id: jobId, vehicle_assignments },
      {
        onSuccess: (data) => {
          setApproveSuccess({ pushed: data.pushed });
        },
      }
    );
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
    // Logistics & Constraints reset
    setDirection(EMPTY_CONSTRAINTS.extended.direction);
    setLocationType(EMPTY_CONSTRAINTS.extended.location_type);
    setVolumeM3("");
    setWeightKg("");
    setHazmatNone(true);
    setHazmatClasses([]);
    setNoSkill(true);
    setSkills([]);
    setTimeWindowStart("");
    setTimeWindowEnd("");
    setSubmittedConstraints(null);
    setTaskConstraintsMap(new Map());
  };

  const inactiveScorers = SCORERS.filter((s) => !s.available);
  const summaryConstraints =
    submittedConstraints ??
    (taskConstraintsMap.size > 0 ? Array.from(taskConstraintsMap.values())[0] : null);

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

            {/* ===== Logistics & Constraints (Strateji 3) ===== */}
            <MDTypography variant="h6" mb={0.5}>
              Logistics &amp; Constraints
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block" mb={2}>
              Kapasite ve yetkinlik goreve muhurlenir (capacity_required jsonb + skill_required).
              Yon, konum tipi ve teslim penceresi bu oturumda Karar Destek Asistanina beslenir
              (frontend-state) — DB semasi degismez.
            </MDTypography>

            <Grid container spacing={2} mb={1}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="direction-label">Yon</InputLabel>
                  <Select
                    labelId="direction-label"
                    label="Yon"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as TaskDirection)}
                    sx={{ minHeight: 44 }}
                  >
                    {DIRECTION_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="loctype-label">Konum Tipi</InputLabel>
                  <Select
                    labelId="loctype-label"
                    label="Konum Tipi"
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value as TaskLocationType)}
                    sx={{ minHeight: 44 }}
                  >
                    {LOCATION_TYPE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hazmatNone}
                      onChange={(e) => {
                        setHazmatNone(e.target.checked);
                        if (e.target.checked) setHazmatClasses([]);
                      }}
                    />
                  }
                  label="Tehlikeli madde yok"
                />
                <Autocomplete
                  multiple
                  options={HAZMAT_CLASS_OPTIONS}
                  value={hazmatClasses}
                  onChange={(_e, v) => setHazmatClasses(v as string[])}
                  disabled={hazmatNone}
                  renderInput={(params) => (
                    <TextField {...params} label="Hazmat siniflari (ADR)" placeholder="Sinif sec" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={noSkill}
                      onChange={(e) => {
                        setNoSkill(e.target.checked);
                        if (e.target.checked) setSkills([]);
                      }}
                    />
                  }
                  label="Yetkinlik aranmiyor"
                />
                <Autocomplete
                  multiple
                  freeSolo
                  options={SKILL_OPTIONS}
                  value={skills}
                  onChange={(_e, v) => setSkills(v as string[])}
                  disabled={noSkill}
                  renderInput={(params) => (
                    <TextField {...params} label="Surucu yetkinlikleri" placeholder="Yetkinlik ekle" />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Teslim penceresi baslangic (VRPTW)"
                  value={timeWindowStart}
                  onChange={(e) => setTimeWindowStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Teslim penceresi bitis (VRPTW)"
                  value={timeWindowEnd}
                  onChange={(e) => setTimeWindowEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
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

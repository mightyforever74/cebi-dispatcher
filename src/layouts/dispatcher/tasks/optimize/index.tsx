/**
=========================================================
* TulipFleet Dispatcher — Task Optimization (VRP optimize/approve akisi)
=========================================================
* Faz 3, Part B. Gercek enterprise-api endpoint'lerine bagli:
*   POST /dispatcher/tasks/optimize
*   GET  /dispatcher/tasks/optimize/poll/:id (2sn'de bir otomatik polling)
*   POST /dispatcher/tasks/optimize/approve
* Sidenav'da GORUNMEZ (routes.tsx'te type/name/icon yok, sadece route+component) -
* /dispatcher/tasks sayfasindaki "Yeni Gorev Olustur" butonundan erisilir.
*
* ONEMLI: ROUTING_PROVIDER=mock (lib/routing/factory.js'te HERE entegrasyonu
* henuz yazilmadi, Temmuz 2026 icin planli). Mock, secilen araclari fiilen
* KULLANMAZ - available_vehicles her zaman sabit 4 test araci (Dobbe filosu).
*
* FIX (2026-07-18) - Plan Review Kanban (ADR-0005 §4.1/§7 + ADR-0001 §3.6):
* Backend round-robin atamasi frontend'de AYNEN simule edilip ilk yerlesim
* cizilir (Secenek B). Dispatcher karti surukleyip baska araca tasiyabilir;
* "Approve Plan" ile son yerlesim vehicle_assignments olarak gonderilir.
*
* UPGRADE (2026-07-20) - Decision Support Engine Phase 1 (onayli plan):
* Scorer plugin chain (services/dispatch/scoring), Graceful Degradation:
* MEKAN + ZAMAN aktif; REGULASYON + KARGO kilitli (Phase 1.1). Round-robin
* ILK ATAMA paritesi korunur; siralama atamayi DEGISTIRMEZ.
*
* REDESIGN (2026-07-20, UX standartlari) - Dikey Sirali Liste:
* Araclar yukaridan asagiya tam genislik satirlar (en uygun en uste).
* Karar Notu satirdaki info butonuyla acilan POPOVER'da. Soft shadow yasak,
* flat 1px border. Kutuphane inline style'lari (asseinfo/react-kanban
* Board/index.js kaynak kodundan kanitli) !important ile ezildi;
* direction='horizontal' Droppable yalnizca kolon surukleme icin oldugundan
* (disableColumnDrag kapali) kart tasima etkilenmez.
*
* FIX (2026-07-20, 3. tur) - "Mekan/Zaman degisince liste degismiyor":
* KOK NEDEN (koddan kanitli): skorlama, useVehicleStore uzerinden plaka
* eslemesiyle yapiliyordu; store'un applyLocationFrame -> resolveKey mantigi
* yalnizca MOCK SEED kayitlarini gunceller, eslesmeyen gercek filo
* frame'lerini sessizce atar ("if (!key) return state;"). Gercek plakalar
* (BX-TR-42 vb.) store'a hic giremeyince tum skorlar 0 kaliyor, esit
* skorlarla siralama da degismiyordu. COZUM: store bypass edildi -
* useDispatchLocationSnapshot, /api/dispatcher/locations/latest cevabini
* dogrudan okur; endpoint (routes/locations.js'ten kanitli) her satirda
* vehicle_id (public.vehicles.id UUID) dondurdugu icin eslesme artik
* available_vehicles UUID'leriyle BIREBIRDIR - plaka eslemesi kalkti.
* Ilk board kurulumu, snapshot fetch'i tamamlanmadan (isFetched) yapilmaz.
=========================================================
*/

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// @asseinfo/react-kanban (ADR-0001 §3.6'da karar verilmis, sablonla birlikte gelen kutuphane)
import Board from "@asseinfo/react-kanban";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
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

// Material Dashboard 2 PRO React context (dark mode - satir rengi icin)
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

// Canli telemetri snapshot'i (store bypass - FIX 3. tur, dosya basi aciklamasi)
import useDispatchLocationSnapshot, {
  DispatchLocationFrame,
} from "hooks/useDispatchLocationSnapshot";
// deriveStatus: store'un PURE yardimci fonksiyonu (store state'i KULLANILMIYOR)
import { deriveStatus } from "store/useVehicleStore";

// Decision Support Engine (Phase 1)
import { SCORERS, getScorer, rankVehicles } from "services/dispatch/scoring/registry";
import {
  RankingMode,
  ScoringTask,
  ScoringVehicleSnapshot,
} from "services/dispatch/scoring/types";

const emptyLocation: LocationValue = { address: "", latitude: null, longitude: null };

// Kanban kart/kolon tipleri (@asseinfo/react-kanban kendi TS tipi vermiyor,
// sablonun kendi ornek kodu da "any" kullaniyor - ayni desen izleniyor).
interface KanbanCard {
  id: string;
  template: string;
}
interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  // Decision Support: satir basligindaki skor chip'i + Karar Notu + sira no.
  scoreChip?: string;
  scoreMemo?: string;
  rank?: number;
}
interface KanbanBoardData {
  columns: KanbanColumn[];
}

// Backend round-robin paritesi (routes/tasks.js approve endpoint'i,
// "vehicleId = availableVehicles[i % availableVehicles.length]").
// DIKKAT: her zaman ORIJINAL available_vehicles sirasiyla cagrilir -
// skor siralamasi atamayi etkilemez, yalnizca satir dizilimini etkiler.
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

// Verili satir dizilimi + mevcut atamalarla boardu kurar. Skor bilgisi
// (chip/memo/rank) varsa satir basliklarina islenir.
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

// Arac satiri basligi: sira no + plaka + skor chip + Karar Notu POPOVER'i.
// Popover state'i satir bazinda lokal tutulur (renderColumnHeader render
// prop'u icinde hook kullanilamayacagi icin ayri bilesen olarak tanimli).
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

  // FIX (3. tur): telemetri store yerine dogrudan REST snapshot'tan okunur -
  // vehicle_id (UUID) ile birebir eslesme (dosya basi aciklamasina bak).
  const locationsQuery = useDispatchLocationSnapshot();

  const [pickup, setPickup] = useState<LocationValue>(emptyLocation);
  const [dropoff, setDropoff] = useState<LocationValue>(emptyLocation);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<{ pushed: number } | null>(null);

  // Kanban state: gorsel board (uncontrolled Board'a initialBoard olarak verilir)
  // + assignments (taskId -> vehicleId), approve isteginde asil gonderilen veri.
  const [initialBoard, setInitialBoard] = useState<KanbanBoardData | null>(null);
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map());

  // Decision Support: secili siralama modu + board remount sayaci.
  // boardEpoch yalnizca bilinçli yeniden dizmede artar (mode degisimi /
  // "Siralamayi Guncelle") - canli telemetri frame'leri remount TETIKLEMEZ.
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

  // FIX (2026-07-18, 3. tur): koordinatlar HERE'den (LocationSearchInput
  // secimi sonrasi) geliyor - manuel koordinat girisi/tahmini yok.
  const validLocation = (p: LocationValue) =>
    p.address.trim() !== "" && p.latitude !== null && p.longitude !== null;

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

  // vehicleId -> plaka etiketi lookup (useVehicles'tan)
  const vehicleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach((v: Vehicle) => {
      map[v.id] = v.plate_no || v.id.slice(0, 8);
    });
    return map;
  }, [vehicles]);

  // Optimize sonucundaki draft task'lar -> scorer girdisi.
  const scoringTasks: ScoringTask[] = useMemo(() => {
    if (!result?.tasks) return [];
    return result.tasks.map((t: OptimizeResultTask) => ({
      id: t.id,
      pickup: t.pickup_location,
      dropoff: t.dropoff_location,
    }));
  }, [result]);

  // REST snapshot frame'lerinden arac skorlama goruntusu. Eslesme,
  // routes/locations.js'in dondurdugu vehicle_id (UUID) ile BIREBIRDIR.
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

  // Boardu verilen modda, MEVCUT atamalari koruyarak yeniden kurar.
  // framesOverride: "Siralamayi Guncelle" refetch sonucunu, state guncellenmesini
  // beklemeden dogrudan kullanmak icin (react-query refetch() {data} dondurur).
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

  // result geldiginde board BIR KEZ kurulur:
  // 1) atamalar round-robin (backend paritesi, ORIJINAL available_vehicles sirasi)
  // 2) satirlar varsayilan modun (Mekan) skoruna gore dizilir.
  // locationsQuery.isFetched: snapshot fetch'i bitmeden kurulursa tum skorlar
  // 0 olurdu; basari/hata farketmeksizin ilk fetch tamamlaninca kurulur
  // (hata durumunda 0 skorla kurulur, sonsuz bekleme olmaz).
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
      rebuildBoard(rankingMode, initialAssignments);
    }
  }, [status, result, initialBoard, rankingMode, rebuildBoard, locationsQuery.isFetched]);

  // Filtre modu degisince satirlar yeni skorla yeniden dizilir (atamalar korunur).
  const handleModeChange = (_e: unknown, newMode: RankingMode | null) => {
    if (!newMode) return;
    const scorer = getScorer(newMode);
    if (!scorer || !scorer.available) return; // kilitli filtre - secilemez
    setRankingMode(newMode);
    rebuildBoard(newMode, assignments);
  };

  // "Siralamayi Guncelle": snapshot yeniden cekilir, taze frame'lerle
  // (state guncellemesi beklenmeden, refetch sonucu dogrudan) yeniden dizilir.
  const handleRefreshRanking = async () => {
    const res = await locationsQuery.refetch();
    rebuildBoard(rankingMode, assignments, res.data);
  };

  // Dispatcher bir karti baska bir araca (satira) surukleyince assignments guncellenir.
  // @asseinfo/react-kanban onCardDragEnd(card, source, destination) imzasi -
  // npm README + GitHub kaynagindan kanitli, destination undefined olabilir.
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
  };

  const inactiveScorers = SCORERS.filter((s) => !s.available);

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

                {initialBoard ? (
                  <>
                    {/* Decision Support: siralama modu filtreleri */}
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
                        // DIKEY SATIR DUZENI - kutuphanenin inline style'lari
                        // (Board/index.js'ten kanitli) !important ile ezilir:
                        // .react-kanban-board inline {display:flex, overflowY:hidden},
                        // icindeki sarmalayici div inline {whiteSpace:nowrap}.
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
                          // Flat B2B: soft shadow YASAK - duz zemin + 1px border.
                          backgroundColor: darkMode ? "rgba(255, 255, 255, 0.06)" : "#f8f9fa",
                          border: darkMode ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #d2d6da",
                          boxShadow: "none",
                        },
                      }}
                    >
                      {/* key=boardEpoch: Board uncontrolled (initialBoard) - mode degisimi /
                          manuel yenilemede bilinçli remount ile yeni dizilim uygulanir. */}
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
                              // Flat B2B: golge yok, 1px border.
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

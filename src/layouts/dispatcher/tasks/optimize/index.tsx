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
* FIX (2026-07-18) - Plan Review Kanban (ADR-0005 §4.1/§7 "Kanban view" +
* ADR-0001 §3.6 "React Kanban - drag-and-drop task assignment"):
* "completed" adiminda gercek bir Kanban board gosteriliyor. Backend'in
* round-robin atamasi frontend'de AYNEN simule edilip ilk yerlesim cizilir
* (Secenek B, bkz. ARCHITECTURE_DECISION_task-management-api-driven.md).
* Dispatcher karti surukleyip baska araca tasiyabilir; "Approve Plan" ile
* son yerlesim vehicle_assignments olarak gonderilir.
*
* UPGRADE (2026-07-20) - Decision Support Engine Phase 1 (onayli plan):
* Kanban, scorer plugin chain (services/dispatch/scoring) uzerine oturan
* bir Karar Destek Asistanina yukseltildi (Graceful Degradation):
*   - MEKAN + ZAMAN filtreleri AKTIF: canli telemetri (useVehicleStore,
*     plaka eslemesi) + haversine ile kolonlar skora gore dizilir.
*   - REGULASYON + KARGO filtreleri KILITLI (available:false + reason):
*     ZE-zone frontend endpoint'i ve kargo gereksinim alanlari (Phase 1.1 /
*     backlog) gelmeden sahte skor URETILMEZ.
*   - Kolon basliginda skor chip'i + Tooltip'te Akilli Karar Notu (memo).
*   - Round-robin ILK ATAMA paritesi korunur: atamalar orijinal
*     available_vehicles sirasiyla kurulur; skor SIRALAMASI yalnizca kolon
*     dizilimini degistirir, atamayi DEGISTIRMEZ.
*   - Drag stabilitesi: skor snapshot'i board kurulum aninda alinir; canli
*     her telemetri frame'inde remount YAPILMAZ. "Siralamayi Guncelle"
*     butonu, atamalari koruyarak boardu guncel telemetriyle yeniden dizer.
*   - Pre-drag kolon pasiflestirme (uygunsuz araci soluklastirma) BILEREK
*     Phase 1.1'e birakildi: eligibility verisi (kargo/uyum) olmadan bu
*     gorsellestirme uydurma olurdu. Altyapi hazir (ScoreDetail.eligible).
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
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Konum arama (HERE Discover proxy)
import LocationSearchInput, { LocationValue } from "components/LocationSearchInput";

// Material Dashboard 2 PRO React context (dark mode - Kanban kolon rengi icin)
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

// Canli telemetri (Sira 4.2/4.3 deseni yeniden kullanildi)
import { useLatestLocations } from "hooks/useLatestLocations";
import { useVehicleStore } from "store/useVehicleStore";

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
  // Decision Support: kolon basligindaki skor chip'i + Karar Notu.
  scoreChip?: string;
  scoreMemo?: string;
}
interface KanbanBoardData {
  columns: KanbanColumn[];
}

// Backend round-robin paritesi (routes/tasks.js approve endpoint'i,
// "vehicleId = availableVehicles[i % availableVehicles.length]").
// DIKKAT: her zaman ORIJINAL available_vehicles sirasiyla cagrilir -
// skor siralamasi atamayi etkilemez, yalnizca kolon dizilimini etkiler.
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

// Verili kolon dizilimi + mevcut atamalarla boardu kurar. Skor bilgisi
// (chip/memo) varsa kolon basliklarina islenir.
function buildBoard(
  tasks: OptimizeResultTask[],
  orderedVehicleIds: string[],
  vehicleLabels: Record<string, string>,
  assignments: Map<string, string>,
  scoreById: Map<string, { chip: string; memo: string }> | null
): KanbanBoardData {
  const columns: KanbanColumn[] = orderedVehicleIds.map((vehicleId) => {
    const score = scoreById?.get(vehicleId);
    return {
      id: vehicleId,
      title: vehicleLabels[vehicleId] || vehicleId.slice(0, 8),
      cards: [],
      scoreChip: score?.chip,
      scoreMemo: score?.memo,
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

function OptimizeTask(): JSX.Element {
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  // Sira 4.3 deseni: sayfa acilinca telemetri REST snapshot'i store'a yazilir
  // (MQTT akisi varsa applyLocationFrame stale-guard ile zaten birlesir).
  useLatestLocations();

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
    return result.tasks.map((t) => ({
      id: t.id,
      pickup: t.pickup_location,
      dropoff: t.dropoff_location,
    }));
  }, [result]);

  // Skorlama aninda (kurulum / manuel yenileme) telemetri store'undan
  // arac snapshot'lari cikarilir. IMPERATIVE getState: hook subscribe'i
  // her MQTT/REST frame'inde re-render + reorder tetiklerdi (drag'i bozar).
  // Store key'leri arac UUID'si DEGIL - eslesme PLAKA uzerinden yapilir
  // (useVehicleStore.resolveKey ile ayni mantik).
  const buildSnapshots = useCallback(
    (availableVehicles: string[]): ScoringVehicleSnapshot[] => {
      const telemetry = useVehicleStore.getState().vehicles;
      const telemetryList = Object.values(telemetry);
      return availableVehicles.map((vehicleId) => {
        const plate = vehicleLabels[vehicleId] || vehicleId.slice(0, 8);
        const frame = telemetryList.find((t) => t.plate === plate);
        return {
          id: vehicleId,
          plate,
          latitude: frame ? frame.latitude : null,
          longitude: frame ? frame.longitude : null,
          speedKmh: frame ? frame.speed_kmh : null,
          movementStatus: frame ? frame.status : null,
          lastUpdate: frame ? frame.last_update : null,
        };
      });
    },
    [vehicleLabels]
  );

  // Boardu verilen modda, MEVCUT atamalari koruyarak yeniden kurar.
  const rebuildBoard = useCallback(
    (mode: RankingMode, currentAssignments: Map<string, string>) => {
      if (!result?.tasks || result.tasks.length === 0) return;
      const snapshots = buildSnapshots(result.available_vehicles);
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
    [result, scoringTasks, vehicleLabels, buildSnapshots]
  );

  // result geldiginde board BIR KEZ kurulur:
  // 1) atamalar round-robin (backend paritesi, ORIJINAL available_vehicles sirasi)
  // 2) kolonlar varsayilan modun (Mekan) skoruna gore dizilir.
  useEffect(() => {
    if (status === "completed" && result?.tasks && result.tasks.length > 0 && !initialBoard) {
      const initialAssignments = buildRoundRobinAssignments(
        result.tasks,
        result.available_vehicles
      );
      setAssignments(initialAssignments);
      rebuildBoard(rankingMode, initialAssignments);
    }
  }, [status, result, initialBoard, rankingMode, rebuildBoard]);

  // Filtre modu degisince kolonlar yeni skorla yeniden dizilir (atamalar korunur).
  const handleModeChange = (_e: unknown, newMode: RankingMode | null) => {
    if (!newMode) return;
    const scorer = getScorer(newMode);
    if (!scorer || !scorer.available) return; // kilitli filtre - secilemez
    setRankingMode(newMode);
    rebuildBoard(newMode, assignments);
  };

  // Dispatcher bir karti baska bir araca (kolona) surukleyince assignments guncellenir.
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
                        onClick={() => rebuildBoard(rankingMode, assignments)}
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
                      Drag tasks between vehicles to adjust the plan — columns are ranked left to
                      right by the selected criterion (best match first). Ranking never changes
                      assignments; only you do, by dragging.
                    </MDTypography>
                    <MDBox
                      position="relative"
                      mb={3}
                      sx={{
                        "& .react-kanban-column": {
                          backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "#f0f2f5",
                          border: darkMode ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #d2d6da",
                          minWidth: "260px",
                          margin: "0 8px",
                          padding: "16px",
                          borderRadius: "12px",
                        },
                        "& .react-kanban-board": {
                          overflowX: "auto",
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
                        renderColumnHeader={({ title, scoreChip, scoreMemo }: KanbanColumn) => (
                          <MDBox
                            mb={1.5}
                            pb={1}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              borderBottom: darkMode
                                ? "1px solid rgba(255, 255, 255, 0.3)"
                                : "1px solid #d2d6da",
                            }}
                          >
                            <MDTypography
                              variant="h6"
                              fontWeight="bold"
                              color={darkMode ? "white" : "dark"}
                            >
                              {title}
                            </MDTypography>
                            {scoreChip && (
                              <Tooltip title={scoreMemo || ""} arrow placement="top">
                                <Chip
                                  label={scoreChip}
                                  size="small"
                                  color={Number(scoreChip) >= 50 ? "success" : "default"}
                                  sx={{ fontWeight: "bold", cursor: "help" }}
                                />
                              </Tooltip>
                            )}
                          </MDBox>
                        )}
                        renderCard={({ id, template }: KanbanCard) => (
                          <MDBox
                            key={id}
                            display="block"
                            bgColor={darkMode ? "#2c3c58" : "white"}
                            color="text"
                            borderRadius="lg"
                            mt={1.5}
                            py={1.25}
                            px={1.25}
                            sx={{
                              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
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

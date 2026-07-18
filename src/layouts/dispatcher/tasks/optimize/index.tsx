/**
=========================================================
* TulipFleet Dispatcher — Task Optimization (VRP optimize/approve akışı)
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
* "completed" adiminda artik sade metin yerine gercek bir Kanban board
* gosteriliyor. Backend'in round-robin atamasi (routes/tasks.js approve
* endpoint'i) frontend'de AYNEN simule edilip ilk yerlesim cizilir (Secenek B,
* bkz. ARCHITECTURE_DECISION_task-management-api-driven.md). Dispatcher
* karti surukleyip baska bir araca tasiyabilir; "Approve Plan" tiklaninca
* son yerlesim vehicle_assignments olarak backend'e gonderilir - backend bu
* listeyi VARSA kullanir, YOKSA (eski davranis) kendi round-robin'ine duser.
*
* FIX (2026-07-18, 2. tur) - Kolon basliklari GORUNMUYORDU: renderColumnHeader
* prop'u hic verilmemisti, kutuphane kendi cIplak/stilsiz varsayilan basligini
* render ediyordu (koyu temada okunmuyordu). Simdi MDTypography ile acikca
* render ediliyor + kolon arka plani daha kontrastli sabit bir renge (grey-900/
* grey-100) cekildi - theme'in "background.card"i bu ekranda yeterince
* kontrast olusturmuyordu (ekran goruntusunde kanitlandi).
=========================================================
*/

import { useState, useEffect, useMemo } from "react";
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
import { Theme } from "@mui/material/styles";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

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

interface PointInput {
  address: string;
  lat: string;
  lng: string;
}

const emptyPoint: PointInput = { address: "", lat: "", lng: "" };

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
}
interface KanbanBoardData {
  columns: KanbanColumn[];
}

// Optimize sonucundan (task'lar + musait araclar) ilk Kanban yerlesimini
// olusturur - backend'in round-robin mantigini (routes/tasks.js approve
// endpoint'i, "vehicleId = availableVehicles[i % availableVehicles.length]")
// frontend'de birebir simule eder.
function buildInitialBoard(
  tasks: OptimizeResultTask[],
  availableVehicles: string[],
  vehicleLabels: Record<string, string>
): KanbanBoardData {
  const columns: KanbanColumn[] = availableVehicles.map((vehicleId) => ({
    id: vehicleId,
    title: vehicleLabels[vehicleId] || vehicleId.slice(0, 8),
    cards: [],
  }));

  tasks.forEach((task, i) => {
    const col = columns[i % columns.length];
    const pickupAddr =
      task.pickup_location.address ||
      `${task.pickup_location.lat},${task.pickup_location.lng}`;
    const dropoffAddr =
      task.dropoff_location.address ||
      `${task.dropoff_location.lat},${task.dropoff_location.lng}`;
    col.cards.push({
      id: task.id,
      template: `${pickupAddr} → ${dropoffAddr}`,
    });
  });

  return { columns };
}

function OptimizeTask(): JSX.Element {
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const [pickup, setPickup] = useState<PointInput>(emptyPoint);
  const [dropoff, setDropoff] = useState<PointInput>(emptyPoint);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<{ pushed: number } | null>(null);

  // Kanban state: gorsel board (uncontrolled Board'a initialBoard olarak verilir)
  // + assignments (taskId -> vehicleId), approve isteginde asil gonderilen veri.
  const [initialBoard, setInitialBoard] = useState<KanbanBoardData | null>(null);
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map());

  const submitMutation = useSubmitOptimization();
  const pollQuery = usePollOptimization(jobId);
  const approveMutation = useApproveOptimization();

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const validPoint = (p: PointInput) =>
    p.address.trim() !== "" && p.lat.trim() !== "" && p.lng.trim() !== "" && !isNaN(Number(p.lat)) && !isNaN(Number(p.lng));

  const handleSubmit = () => {
    setFormError("");
    setApproveSuccess(null);

    if (!validPoint(pickup) || !validPoint(dropoff)) {
      setFormError("Pickup and dropoff need an address, latitude and longitude.");
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
              lat: Number(pickup.lat),
              lng: Number(pickup.lng),
              address: pickup.address,
            },
            dropoff_location: {
              lat: Number(dropoff.lat),
              lng: Number(dropoff.lng),
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

  // result geldiginde Kanban board'unu BIR KEZ olustur (round-robin simulasyonu)
  useEffect(() => {
    if (status === "completed" && result?.tasks && result.tasks.length > 0 && !initialBoard) {
      const board = buildInitialBoard(result.tasks, result.available_vehicles, vehicleLabels);
      setInitialBoard(board);

      const initialAssignments = new Map<string, string>();
      board.columns.forEach((col) => {
        col.cards.forEach((card) => {
          initialAssignments.set(card.id, col.id);
        });
      });
      setAssignments(initialAssignments);
    }
  }, [status, result, initialBoard, vehicleLabels]);

  // Dispatcher bir karti baska bir araca (kolona) surukleyince assignments guncellenir.
  // @asseinfo/react-kanban onCardDragEnd(card, source, destination) imzasi -
  // npm README + GitHub kaynagindan kanitli, destination undefined olabilir
  // (kart ayni yere birakilirsa).
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
    setPickup(emptyPoint);
    setDropoff(emptyPoint);
    setSelectedVehicleIds([]);
    setJobId(null);
    setApproveSuccess(null);
    setFormError("");
    setInitialBoard(null);
    setAssignments(new Map());
  };

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
              <Grid item xs={12} sm={6}>
                <MDInput
                  fullWidth
                  label="Address"
                  value={pickup.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPickup({ ...pickup, address: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <MDInput
                  fullWidth
                  label="Latitude"
                  value={pickup.lat}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPickup({ ...pickup, lat: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <MDInput
                  fullWidth
                  label="Longitude"
                  value={pickup.lng}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPickup({ ...pickup, lng: e.target.value })
                  }
                />
              </Grid>
            </Grid>

            <MDTypography variant="h6" mb={2}>
              Dropoff
            </MDTypography>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6}>
                <MDInput
                  fullWidth
                  label="Address"
                  value={dropoff.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDropoff({ ...dropoff, address: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <MDInput
                  fullWidth
                  label="Latitude"
                  value={dropoff.lat}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDropoff({ ...dropoff, lat: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <MDInput
                  fullWidth
                  label="Longitude"
                  value={dropoff.lng}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDropoff({ ...dropoff, lng: e.target.value })
                  }
                />
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
                    <MDTypography variant="button" fontWeight="bold" display="block" mb={2}>
                      Drag tasks between vehicles to adjust the plan
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
                      <Board
                        initialBoard={initialBoard}
                        onCardDragEnd={handleCardDragEnd}
                        disableColumnDrag
                        renderColumnHeader={({ title }: { title: string }) => (
                          <MDBox
                            mb={1.5}
                            pb={1}
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

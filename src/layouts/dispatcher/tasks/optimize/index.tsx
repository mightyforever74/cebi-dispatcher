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
* KULLANMAZ - approve asamasinda her zaman sabit 4 test araci (Dobbe filosu)
* arasinda round-robin dagitim yapar. Bu asagida acikca kullaniciya gosterilir.
=========================================================
*/

import { useState } from "react";
import { useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Real API
import useVehicles, { Vehicle } from "hooks/useVehicles";
import {
  useSubmitOptimization,
  usePollOptimization,
  useApproveOptimization,
} from "hooks/useTaskOptimization";

interface PointInput {
  address: string;
  lat: string;
  lng: string;
}

const emptyPoint: PointInput = { address: "", lat: "", lng: "" };

function OptimizeTask(): JSX.Element {
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();

  const [pickup, setPickup] = useState<PointInput>(emptyPoint);
  const [dropoff, setDropoff] = useState<PointInput>(emptyPoint);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<{ pushed: number } | null>(null);

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

  const handleApprove = () => {
    if (!jobId) return;
    approveMutation.mutate(
      { routing_job_id: jobId },
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
  };

  const status = pollQuery.data?.status;
  const isPolling = !!jobId && status !== "completed" && status !== "failed";
  const result = pollQuery.data?.result;

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
          integration is planned but not yet built). The final vehicle assignment always
          round-robins across 4 fixed test vehicles regardless of which vehicles you select
          below.
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
                <MDTypography variant="button" fontWeight="bold" display="block" mb={1}>
                  Vehicles available for assignment ({result.available_vehicles.length})
                </MDTypography>
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

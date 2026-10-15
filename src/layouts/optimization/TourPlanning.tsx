/**
 * TourPlanning — FEAT-001 "Quick Feasibility Check" sayfası (eski adı: "Smart
 * Route Optimization" — isim, sayfanın gerçek işlevini (taahhütsüz rota
 * mesafe/süre simülasyonu) daha dürüst yansıtması için 2026-10-15'te değişti).
 *
 * 2026-10-15, Cem onayı: önceki TourPlanningPlaceholder.tsx (kilitli,
 * "Phase 1.1 sprint'inde etkinleşecek" statik kartı) kaldırıldı — ADR-0014
 * §13'teki erteleme kararı bilinçli bir ürün kararıyla "Phase 1.1 / Müşteri
 * Öncesi Aktifleştirme" olarak revize edildi (bkz. docs/adr/ADR-0014, §13
 * Amendment 2026-10-15, güncellenmiş metin). Aynı "rozeti kaldır, gerçekten
 * canlı diye işaretle" kararı 4 gün önce TollAnalytics.tsx için de verilmişti
 * (bkz. o dosyanın başlık yorumu) — bu, ikinci uygulanışı.
 *
 * MİMARİ — SIFIR yeni backend route'u, SIFIR mevcut modül değişikliği:
 *   - IRoutingProvider kontratı zaten enterprise-backend'de var
 *     (lib/routing/factory.js -> HereTourPlanningProvider | MockRoutingProvider,
 *     ROUTING_PROVIDER env değişkeniyle seçilir — bu sayfa bunu DEĞİŞTİRMEZ).
 *   - submitVrp/pollVrp/fetchVrp için gerçek backend endpoint'leri ZATEN
 *     routes/tasks.js'te var: POST /dispatcher/tasks/optimize,
 *     GET /dispatcher/tasks/optimize/poll/:id. Bu sayfa, /dispatcher/tasks/
 *     optimize (Kanban/DSE scorer) sayfasının KULLANDIĞI AYNI
 *     hooks/useTaskOptimization.ts hook'larını import eder — o sayfanın
 *     kodu veya DSE scorer zinciri (SCORERS) HİÇ dokunulmaz, sadece hook'lar
 *     (jenerik fetch sarmalayıcıları, UI'a bağlı değil) yeniden kullanılır.
 *   - Serbest, görev-listesine bağlı olmayan form: N durak (pickup+dropoff,
 *     opsiyonel kapasite/skill) + araç seçimi -> aynı VRP kontratı.
 *   - Onay adımı (approve) BİLİNÇLİ OLARAK bu sayfaya EKLENMEDİ: approve,
 *     draft dispatch_tasks'ı gerçek araçlara push eder (public.tasks köprüsü)
 *     — bu sayfanın amacı rota ÖNİZLEME/planlama; gerçek sevkiyat onayı
 *     halen /dispatcher/tasks Kanban akışından yapılır (tek onay yolu,
 *     iki kopya UI değil).
 *
 * DÜRÜSTLÜK: computeMatrix implemente değil (ADR-0014 §13) — mesafe/süre
 * özeti (summary) her sağlayıcıda kuş uçuşu (haversine) kökenlidir. Gerçek
 * sağlayıcı (HERE) devreye girdiğinde dahi poll sonucu gerçek yol geometrisi
 * (polyline) TAŞIMAZ.
 *
 * KISA VADELİ ÇÖZÜM (2026-10-15, aynı gün ikinci tur, Cem kararı — tam
 * tartışma commit mesajında): pickup→dropoff düz kesik çizgi, operatörde
 * "rota hesaplanamamış" izlenimi yarattığı için haritadan TAMAMEN kaldırıldı
 * (bkz. TourPlanningMap.tsx). Yerine: (1) ziyaret sırasına göre NUMARALANMIŞ
 * duraklar (HERE'in gerçek `here_raw_solution.tours[].stops[]` sırası; Mock'ta
 * form giriş sırası), (2) sol panelde durak sırası + HERE'in hesapladığı
 * gerçek varış/çıkış saatlerini (`stop.time.arrival/departure`) gösteren bir
 * ETA tablosu — bu veri zaten `response_payload`'da vardı, hiç ek HERE çağrısı
 * gerektirmiyor. Gerçek yola oturan (road-snapped) çizgi (computeRoute/
 * computeMatrix, bacak başına ek ücretli HERE Routing v8 çağrısı gerektirir)
 * BİLİNÇLİ OLARAK ERTELENDİ — ADR-0014 §13'ün "Phase 2, müşteri bütçeli"
 * kararıyla aynı, bu oturumda tekrar onaylandı, override EDİLMEDİ.
 */
import { useCallback, useMemo, useState } from "react";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";

import DataState, { dataStateOf, type DataStateKind } from "components/DataState";
import LocationSearchInput, { LocationValue } from "components/LocationSearchInput";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import TourPlanningMap, { type MapRouteStop, type TourPlanningStopPoint } from "components/TourPlanningMap";
import { useMaterialUIController } from "context";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import useVehicles, { Vehicle } from "hooks/useVehicles";
import {
  useSubmitOptimization,
  usePollOptimization,
  type OptimizeTaskInput,
  type OptimizeResultTask,
  type HereRawSolution,
} from "hooks/useTaskOptimization";
import { useT } from "i18n";
import { HAZMAT_CLASS_OPTIONS, SKILL_OPTIONS } from "types/metadata";

// FIX (2026-10-15, ETA tablosu): bkz. dosya başlığındaki "KISA VADELİ ÇÖZÜM"
// notu. `tasks[i]` (OptimizePollResult.tasks) backend tarafında artık
// GARANTİ EDİLMİŞ olarak HERE'in `job-${i}` activity jobId'siyle aynı sırada
// (enterprise-backend routes/tasks.js task_id_sequence, 2026-10-15).
const JOB_ID_PATTERN = /^job-(\d+)$/;

interface EtaRow {
  order: number;
  kind: "pickup" | "dropoff" | "depot";
  address: string;
  lat: number;
  lng: number;
  arrivalIso: string;
  departureIso: string;
}

interface TourRouteData {
  tourIndex: number;
  vehicleId: string;
  rows: EtaRow[];
}

function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function formatTime(iso: string | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * HERE'in ham VRP çözümünü (tours[].stops[]) ETA tablosu + harita pinleri
 * için kullanılabilir bir şekle çevirir. `tasks` sırası job-N ile birebir
 * eşleşmek ZORUNDA (bkz. yukarıdaki JOB_ID_PATTERN notu) — bu artık backend
 * tarafında garanti ediliyor, burada yalnızca okunuyor.
 */
function buildTourRouteData(
  hereSolution: HereRawSolution | undefined,
  tasks: OptimizeResultTask[] | undefined
): TourRouteData[] {
  const tours = hereSolution?.tours;
  if (!Array.isArray(tours) || tours.length === 0) return [];

  return tours
    .filter((tour) => Array.isArray(tour.stops) && tour.stops.length > 0)
    .map((tour, tourIndex) => {
      const rows: EtaRow[] = tour.stops.map((stop, idx) => {
        const activity = stop.activities && stop.activities[0];
        const jobMatch = activity ? JOB_ID_PATTERN.exec(activity.jobId) : null;
        const task = jobMatch ? tasks?.[Number(jobMatch[1])] : undefined;

        let kind: EtaRow["kind"] = "depot";
        let address = formatCoord(stop.location.lat, stop.location.lng);
        if (activity?.type === "pickup") {
          kind = "pickup";
          address = task?.pickup_location.address || formatCoord(stop.location.lat, stop.location.lng);
        } else if (activity?.type === "delivery") {
          kind = "dropoff";
          address = task?.dropoff_location.address || formatCoord(stop.location.lat, stop.location.lng);
        }

        return {
          order: idx + 1,
          kind,
          address,
          lat: stop.location.lat,
          lng: stop.location.lng,
          arrivalIso: stop.time?.arrival,
          departureIso: stop.time?.departure,
        };
      });

      return { tourIndex, vehicleId: tour.typeId, rows };
    });
}

const emptyLocation: LocationValue = { address: "", latitude: null, longitude: null };

interface StopDraft {
  id: string;
  pickup: LocationValue;
  dropoff: LocationValue;
  volumeM3: string;
  weightKg: string;
  hazmatClasses: string[];
  skills: string[];
}

let stopSeq = 0;
function newStopId(): string {
  stopSeq += 1;
  return `stop-${Date.now()}-${stopSeq}`;
}

function emptyStop(): StopDraft {
  return {
    id: newStopId(),
    pickup: { ...emptyLocation },
    dropoff: { ...emptyLocation },
    volumeM3: "",
    weightKg: "",
    hazmatClasses: [],
    skills: [],
  };
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function stopIsReady(s: StopDraft): boolean {
  return (
    s.pickup.latitude != null &&
    s.pickup.longitude != null &&
    s.dropoff.latitude != null &&
    s.dropoff.longitude != null
  );
}

function TourPlanning(): JSX.Element {
  const { t, locale } = useT();
  const [controller] = useMaterialUIController();
  const darkMode = Boolean(controller.darkMode);

  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [stops, setStops] = useState<StopDraft[]>([emptyStop()]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = useSubmitOptimization();
  const poll = usePollOptimization(jobId);

  const toggleVehicle = useCallback((id: string) => {
    setSelectedVehicleIds((prev) => toggleInArray(prev, id));
  }, []);

  const updateStop = useCallback((id: string, patch: Partial<StopDraft>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const addStop = useCallback(() => setStops((prev) => [...prev, emptyStop()]), []);
  const removeStop = useCallback(
    (id: string) => setStops((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id))),
    []
  );

  const readyStops = useMemo(() => stops.filter(stopIsReady), [stops]);

  const handleSubmit = useCallback(() => {
    setFormError(null);

    if (readyStops.length === 0) {
      setFormError(t("tourPlanning.form.errorNoStops"));
      return;
    }
    if (selectedVehicleIds.length === 0) {
      setFormError(t("tourPlanning.form.errorNoVehicles"));
      return;
    }

    const tasks: OptimizeTaskInput[] = readyStops.map((s) => {
      const hazmat = s.hazmatClasses;
      const volume = s.volumeM3.trim() === "" ? null : Number(s.volumeM3);
      const weight = s.weightKg.trim() === "" ? null : Number(s.weightKg);
      const hasCapacity = volume != null || weight != null || hazmat.length > 0;

      return {
        pickup_location: {
          lat: s.pickup.latitude as number,
          lng: s.pickup.longitude as number,
          address: s.pickup.address || undefined,
        },
        dropoff_location: {
          lat: s.dropoff.latitude as number,
          lng: s.dropoff.longitude as number,
          address: s.dropoff.address || undefined,
        },
        capacity_required: hasCapacity
          ? { volume_m3: volume, weight_kg: weight, hazmat_classes: hazmat }
          : undefined,
        skill_required: s.skills.length > 0 ? s.skills : undefined,
      };
    });

    submit.mutate(
      { tasks, vehicles: selectedVehicleIds },
      {
        onSuccess: (res) => setJobId(res.jobId),
        onError: (err) => setFormError(err.message),
      }
    );
  }, [readyStops, selectedVehicleIds, submit, t]);

  const handleReset = useCallback(() => {
    setJobId(null);
    setFormError(null);
    setStops([emptyStop()]);
    setSelectedVehicleIds([]);
  }, []);

  // Form adımı: jobId henüz yok. Sonuç adımı: jobId var -> submit/poll
  // DataState'e akar (loading: gönderiliyor veya submitted/running; error:
  // mutation veya poll hatası, ya da backend status:"failed"; ready: completed).
  const resultState: DataStateKind | null = jobId
    ? dataStateOf({
        isLoading: poll.isLoading || poll.data?.status === "submitted" || poll.data?.status === "running",
        isError: poll.isError || poll.data?.status === "failed",
        isEmpty: false,
      })
    : null;

  const resultStops: TourPlanningStopPoint[] = useMemo(() => {
    const resultTasks = poll.data?.result?.tasks;
    if (!resultTasks) return [];
    return resultTasks.map((task: OptimizeResultTask) => ({
      id: task.id,
      pickup: task.pickup_location,
      dropoff: task.dropoff_location,
    }));
  }, [poll.data]);

  // FIX (2026-10-15, ETA tablosu + numaralı pin'ler): bkz. dosya başlığındaki
  // "KISA VADELİ ÇÖZÜM" notu. Mock'ta (veya eski/ham çözümü olmayan job'larda)
  // boş dizi döner — harita ve panel bunu zaten (TourPlanningMap fallback'i +
  // aşağıdaki mockNote) ele alıyor.
  const tourRoutes: TourRouteData[] = useMemo(
    () => buildTourRouteData(poll.data?.result?.here_raw_solution, poll.data?.result?.tasks),
    [poll.data]
  );
  const mapRouteStops: MapRouteStop[] = useMemo(
    () =>
      tourRoutes.flatMap((tour) =>
        tour.rows.map((row) => ({
          tourIndex: tour.tourIndex,
          order: row.order,
          lat: row.lat,
          lng: row.lng,
          kind: row.kind,
        }))
      ),
    [tourRoutes]
  );

  const summary = poll.data?.result?.summary;
  const solver = poll.data?.result?.solver;
  // FIX (2026-10-15, Cem canlı ROUTING_PROVIDER=here-tour denemesi): bu
  // metin önceden sabit "currently Mock" diyordu — hangi sağlayıcının
  // gerçekten çalıştığını yansıtmıyordu. Artık poll sonucundaki gerçek
  // `solver` alanına göre (backend: MockRoutingProvider "mock-optimization-
  // engine", HereTourPlanningProvider "here-tour-planning-v3") belirleniyor.
  const isMockSolver = solver ? solver.includes("mock") : null;
  const availableVehicles: string[] = poll.data?.result?.available_vehicles ?? [];
  const vehicleLabel = useCallback(
    (id: string) => vehicles.find((v: Vehicle) => v.id === id)?.plate_no || id,
    [vehicles]
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Alert severity="info" sx={{ mb: 2 }} icon={<Icon>info</Icon>}>
          {t("tourPlanning.mockBanner")}
        </Alert>

        {!jobId && (
          <Card sx={{ p: 3 }}>
            <MDTypography variant="h5" component="h1" mb={1}>
              {t("tourPlanning.title")}
            </MDTypography>
            <MDTypography variant="body2" color="text" mb={3}>
              {t("tourPlanning.form.intro")}
            </MDTypography>

            {stops.map((s, idx) => (
              <MDBox key={s.id} mb={3}>
                <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <MDTypography variant="h6" component="h2">
                    {t("tourPlanning.form.stopTitle", { n: String(idx + 1) })}
                  </MDTypography>
                  {stops.length > 1 && (
                    <IconButton
                      aria-label={t("tourPlanning.form.removeStop")}
                      size="small"
                      onClick={() => removeStop(s.id)}
                    >
                      <Icon>close</Icon>
                    </IconButton>
                  )}
                </MDBox>

                <Grid container spacing={2} mb={2}>
                  <Grid item xs={12} md={6}>
                    <LocationSearchInput
                      label={t("optimize.pickupSearch")}
                      value={s.pickup}
                      onValueChange={(v) => updateStop(s.id, { pickup: v })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <LocationSearchInput
                      label={t("optimize.dropoffSearch")}
                      value={s.dropoff}
                      onValueChange={(v) => updateStop(s.id, { dropoff: v })}
                      required
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2} mb={1}>
                  <Grid item xs={6} md={3}>
                    <TextField
                      type="number"
                      label={t("tourPlanning.form.volumeM3")}
                      value={s.volumeM3}
                      onChange={(e) => updateStop(s.id, { volumeM3: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      type="number"
                      label={t("tourPlanning.form.weightKg")}
                      value={s.weightKg}
                      onChange={(e) => updateStop(s.id, { weightKg: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MDBox display="flex" flexWrap="wrap" gap={0.5}>
                      {SKILL_OPTIONS.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          size="small"
                          color={s.skills.includes(skill) ? "info" : "default"}
                          onClick={() => updateStop(s.id, { skills: toggleInArray(s.skills, skill) })}
                        />
                      ))}
                    </MDBox>
                  </Grid>
                </Grid>

                <MDBox display="flex" flexWrap="wrap" gap={0.5}>
                  {HAZMAT_CLASS_OPTIONS.map((cls) => (
                    <Chip
                      key={cls}
                      label={cls}
                      size="small"
                      variant={s.hazmatClasses.includes(cls) ? "filled" : "outlined"}
                      color={s.hazmatClasses.includes(cls) ? "warning" : "default"}
                      onClick={() => updateStop(s.id, { hazmatClasses: toggleInArray(s.hazmatClasses, cls) })}
                    />
                  ))}
                </MDBox>

                {idx < stops.length - 1 && <Divider sx={{ mt: 3 }} />}
              </MDBox>
            ))}

            <MDButton variant="outlined" color="info" size="small" onClick={addStop} sx={{ mb: 3 }}>
              <Icon sx={{ mr: 0.5 }}>add</Icon>
              {t("tourPlanning.form.addStop")}
            </MDButton>

            <Divider sx={{ mb: 2 }} />

            <MDTypography variant="h6" component="h2" mb={1}>
              {t("optimize.vehicles")} *
            </MDTypography>
            {loadingVehicles && <MDTypography variant="caption">{t("optimize.loadingVehicles")}</MDTypography>}
            <MDBox display="flex" flexWrap="wrap" gap={1} mb={2} role="group" aria-label={t("optimize.vehicles")}>
              {vehicles.map((v: Vehicle) => (
                <FormControlLabel
                  key={v.id}
                  control={<Checkbox checked={selectedVehicleIds.includes(v.id)} onChange={() => toggleVehicle(v.id)} />}
                  label={v.plate_no || v.id}
                />
              ))}
            </MDBox>

            {formError && (
              <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mb={2}>
                {formError}
              </MDTypography>
            )}

            <MDButton
              variant="gradient"
              color="info"
              onClick={handleSubmit}
              disabled={submit.isPending}
            >
              {submit.isPending ? (
                <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
              ) : (
                <Icon sx={{ mr: 0.5 }}>route</Icon>
              )}
              {t("tourPlanning.form.submit")}
            </MDButton>
          </Card>
        )}

        {jobId && resultState && (
          <Card sx={{ p: 3 }}>
            <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <MDTypography variant="h5" component="h1">
                {t("tourPlanning.result.title")}
              </MDTypography>
              <MDButton variant="outlined" color="secondary" size="small" onClick={handleReset}>
                {t("tourPlanning.result.newPlan")}
              </MDButton>
            </MDBox>

            <DataState
              status={resultState}
              errorMessage={poll.error?.message || poll.data?.error || undefined}
              onRetry={() => poll.refetch()}
            >
              {resultState === "loading" && (
                <MDBox textAlign="center" py={4}>
                  <CircularProgress size={28} />
                  <MDTypography variant="body2" color="text" mt={2}>
                    {t("tourPlanning.result.polling")}
                  </MDTypography>
                </MDBox>
              )}

              {resultState === "ready" && (
                <>
                  <MDBox mb={2}>
                    <TourPlanningMap stops={resultStops} routeStops={mapRouteStops} darkMode={darkMode} />
                  </MDBox>

                  {tourRoutes.length > 0 ? (
                    <MDBox mb={2}>
                      <MDTypography variant="h6" component="h2" mb={1}>
                        {t("tourPlanning.result.eta.title")}
                      </MDTypography>
                      {tourRoutes.map((tour) => (
                        <MDBox key={tour.tourIndex} mb={tourRoutes.length > 1 ? 2 : 0}>
                          {tourRoutes.length > 1 && (
                            <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                              {t("tourPlanning.result.eta.vehicle")}: {vehicleLabel(tour.vehicleId)}
                            </MDTypography>
                          )}
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>{t("tourPlanning.result.eta.stop")}</TableCell>
                                <TableCell>{t("tourPlanning.result.eta.type")}</TableCell>
                                <TableCell>{t("tourPlanning.result.eta.address")}</TableCell>
                                <TableCell>{t("tourPlanning.result.eta.arrival")}</TableCell>
                                <TableCell>{t("tourPlanning.result.eta.departure")}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {tour.rows.map((row) => (
                                <TableRow key={row.order}>
                                  <TableCell>{row.order}</TableCell>
                                  <TableCell>
                                    {row.kind === "pickup" && t("tourPlanning.result.eta.typePickup")}
                                    {row.kind === "dropoff" && t("tourPlanning.result.eta.typeDropoff")}
                                    {row.kind === "depot" && t("tourPlanning.result.eta.typeDepot")}
                                  </TableCell>
                                  <TableCell>{row.address}</TableCell>
                                  <TableCell>{formatTime(row.arrivalIso, locale)}</TableCell>
                                  <TableCell>{formatTime(row.departureIso, locale)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </MDBox>
                      ))}
                    </MDBox>
                  ) : (
                    <MDTypography variant="caption" color="text" display="block" mb={2}>
                      {t("tourPlanning.result.eta.mockNote")}
                    </MDTypography>
                  )}

                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={12} md={4}>
                      <MDTypography variant="caption" fontWeight="bold" display="block">
                        {t("tourPlanning.result.distance")}
                      </MDTypography>
                      <MDTypography variant="body2">
                        {summary ? `${(summary.total_distance_meters / 1000).toFixed(1)} km` : "—"}
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <MDTypography variant="caption" fontWeight="bold" display="block">
                        {t("tourPlanning.result.duration")}
                      </MDTypography>
                      <MDTypography variant="body2">
                        {summary ? `${Math.round(summary.total_duration_seconds / 60)} min` : "—"}
                      </MDTypography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <MDTypography variant="caption" fontWeight="bold" display="block">
                        {t("tourPlanning.result.vehicles")}
                      </MDTypography>
                      <MDBox display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                        {availableVehicles.length === 0 && <MDTypography variant="body2">—</MDTypography>}
                        {availableVehicles.map((id) => (
                          <Chip key={id} size="small" label={vehicleLabel(id)} />
                        ))}
                      </MDBox>
                    </Grid>
                  </Grid>

                  <MDTypography variant="caption" fontWeight="bold" display="block">
                    {t("tourPlanning.result.solver")}:{" "}
                    <MDTypography component="span" variant="caption" color="text">
                      {isMockSolver === null
                        ? "—"
                        : isMockSolver
                          ? t("tourPlanning.result.solverMock")
                          : t("tourPlanning.result.solverHere")}
                    </MDTypography>
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    {isMockSolver === false
                      ? t("tourPlanning.result.distanceHintHere")
                      : t("tourPlanning.result.distanceHintMock")}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    {t("tourPlanning.result.approveHint")}
                  </MDTypography>
                </>
              )}
            </DataState>
          </Card>
        )}
      </MDBox>
    </DashboardLayout>
  );
}

export default TourPlanning;

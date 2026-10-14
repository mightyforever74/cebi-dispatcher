/**
 * FEAT-SaaS S3 — Page 1: Subscription & vehicle management (/subscription).
 * Spec: docs/FEAT-SAAS_self-service.md §2 Page 1 (05.08.2026, Cem reference).
 * Source pattern: ecommerce/products/new-product (Card+Grid+MD) —
 * stepper removed, single page: quota summary on top, increase form below.
 * Contracts (proven by S2-E1 smoke):
 *   GET  {ENTERPRISE}/api/subscription/quota    -> { quota: {...} }
 *   GET  {ENTERPRISE}/api/subscription/requests -> { requests: [...] }
 *   POST {ENTERPRISE}/api/subscription/requests  { request_type:'vehicle_increase',
 *        requested_amount, payment_note } -> 201 { request }
 * Honesty: package name is not hardcoded (subscription_tier is shown); no automatic
 * card charge / quota bump — PENDING_APPROVAL request only.
 */
import { useEffect, useState } from "react";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Alert from "@mui/material/Alert";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import { dialog } from "assets/theme/tokens";
import { ENTERPRISE_API_URL } from "config/api";
import { useMaterialUIController } from "context";
import { useT } from "i18n";
import { useAuthStore } from "store/useAuthStore";


interface QuotaData {
  name: string;
  max_vehicles: number;
  active_vehicles: number;
  subscription_tier: string | null;
  subscription_status: string | null;
}

interface SubRequest {
  id: string;
  request_type: string;
  requested_amount: number;
  status: string;
  created_at: string;
}

function SubscriptionPage(): JSX.Element {
  const { t } = useT();
  const [controller] = useMaterialUIController();
  const muted = controller.darkMode ? dialog.dark.textMuted : dialog.light.textMuted;
  const token = useAuthStore((s) => s.token);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [pending, setPending] = useState<SubRequest | null>(null);
  const [requestedVehicles, setRequestedVehicles] = useState<string>("5");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders: Record<string, string> = {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${ENTERPRISE_API_URL}/api/subscription/quota`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setQuota(data.quota))
      .catch(() => setError(t("plan.errorQuota")));
    fetch(`${ENTERPRISE_API_URL}/api/subscription/requests`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const p = (data.requests || []).find(
          (r: SubRequest) => r.status === "PENDING_APPROVAL" && r.request_type === "vehicle_increase"
        );
        if (p) setPending(p);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const amountOk = Number.isInteger(Number(requestedVehicles)) && Number(requestedVehicles) > 0;

  const handleSubmitRequest = async () => {
    if (!amountOk) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ENTERPRISE_API_URL}/api/subscription/requests`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          request_type: "vehicle_increase",
          requested_amount: Number(requestedVehicles),
          payment_note: paymentNote || null,
        }),
      });
      if (res.status === 201) {
        const data = await res.json();
        setPending(data.request);
      } else {
        const body = await res.json().catch(() => null);
        setError((body && body.message) || t("plan.errorSubmit"));
      }
    } catch (err) {
      setError(t("plan.errorNetwork"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={9} mt={4}>
        <Grid container justifyContent="center">
          <Grid item xs={12} lg={8}>
            <MDBox mb={4} textAlign="center">
              {/* D7-3 (4) (15 Eki 2026): axe heading-order — sayfa h1'i
                  (Breadcrumbs, component="h1") üstte zaten var; bu h2 olmalı.
                  Alttaki subtitle semantik başlık değil, component="p". */}
              <MDTypography variant="h3" component="h2" fontWeight="bold">
                {t("plan.title")}
              </MDTypography>
              <MDTypography
                variant="h6"
                component="p"
                fontWeight="regular"
                mt={1}
                sx={{ color: muted }}
              >
                {t("plan.subtitle")}
              </MDTypography>
            </MDBox>

            <Card sx={{ p: 3, mb: 4 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <MDBox display="flex" alignItems="center">
                    <MDBox
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      width="3rem"
                      height="3rem"
                      borderRadius="xl"
                      bgColor="info"
                      color="white"
                      mr={2}
                    >
                      <Icon fontSize="medium">directions_bus</Icon>
                    </MDBox>
                    <MDBox>
                      <MDTypography variant="button" fontWeight="regular" color="text">
                        {t("plan.activeQuota")}
                      </MDTypography>
                      {/* Bir KPI değeri, semantik başlık değil */}
                      <MDTypography variant="h4" component="p" fontWeight="bold">
                        {quota
                          ? t("plan.vehiclesCount", {
                              active: quota.active_vehicles,
                              max: quota.max_vehicles,
                            })
                          : t("plan.loading")}
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                </Grid>
                <Grid item xs={12} md={6}>
                  <MDBox display="flex" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                    <MDTypography variant="caption" color="text">
                      {t("plan.package")}{" "}
                      <b>{quota && quota.subscription_tier ? quota.subscription_tier : "—"}</b>
                      {quota && quota.subscription_status ? ` · ${quota.subscription_status}` : ""}
                    </MDTypography>
                  </MDBox>
                </Grid>
              </Grid>
            </Card>

            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" component="h3" fontWeight="bold" mb={2}>
                  {t("plan.requestTitle")}
                </MDTypography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {pending ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t("plan.pending", { count: pending.requested_amount })}
                  </Alert>
                ) : (
                  <MDBox component="form" role="form" mt={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <MDInput
                          fullWidth
                          type="number"
                          label={t("plan.amountLabel")}
                          value={requestedVehicles}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setRequestedVehicles(e.target.value)
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MDInput
                          fullWidth
                          type="text"
                          label={t("plan.noteLabel")}
                          placeholder={t("plan.notePlaceholder")}
                          value={paymentNote}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPaymentNote(e.target.value)
                          }
                        />
                      </Grid>
                    </Grid>

                    <MDBox display="flex" justifyContent="flex-end" mt={4}>
                      <MDButton
                        variant="gradient"
                        color="dark"
                        disabled={loading || !amountOk}
                        onClick={handleSubmitRequest}
                      >
                        {loading ? t("plan.submitting") : t("plan.submit")}
                      </MDButton>
                    </MDBox>
                  </MDBox>
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default SubscriptionPage;

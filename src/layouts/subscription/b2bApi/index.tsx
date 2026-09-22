/**
 * FEAT-SaaS S3 — Page 2: TulipFleet Connect (B2B API) (/subscription/b2b-api).
 * Spec: docs/FEAT-SAAS_self-service.md §2 Page 2 + scope seal (FEAT-Connect).
 * Honesty: no fake counters / simulated keys / live usage charts. The page
 * stays on a "coming soon" launch; the only real action is the api_package
 * pre-request (request_type='api_package', same subscription_requests flow).
 * Approval is deferred to the FEAT-Connect launch — stated on screen.
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


interface SubRequest {
  id: string;
  request_type: string;
  requested_amount: number;
  status: string;
  created_at: string;
}

function B2bApiPage(): JSX.Element {
  const { t } = useT();
  const [controller] = useMaterialUIController();
  const muted = controller.darkMode ? dialog.dark.textMuted : dialog.light.textMuted;
  const token = useAuthStore((s) => s.token);
  const [pending, setPending] = useState<SubRequest | null>(null);
  const [packageCount, setPackageCount] = useState<string>("1");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders: Record<string, string> = {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${ENTERPRISE_API_URL}/api/subscription/requests`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const p = (data.requests || []).find(
          (r: SubRequest) => r.status === "PENDING_APPROVAL" && r.request_type === "api_package"
        );
        if (p) setPending(p);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const countOk = Number.isInteger(Number(packageCount)) && Number(packageCount) > 0;

  const handleSubmit = async () => {
    if (!countOk) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ENTERPRISE_API_URL}/api/subscription/requests`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          request_type: "api_package",
          requested_amount: Number(packageCount),
          payment_note: paymentNote || null,
        }),
      });
      if (res.status === 201) {
        const data = await res.json();
        setPending(data.request);
      } else {
        const body = await res.json().catch(() => null);
        setError((body && body.message) || t("connect.errorSubmit"));
      }
    } catch (err) {
      setError(t("connect.errorNetwork"));
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
              <MDTypography variant="h3" fontWeight="bold">
                {t("connect.title")}
              </MDTypography>
              <MDTypography variant="h6" fontWeight="regular" mt={1} sx={{ color: muted }}>
                {t("connect.subtitle")}
              </MDTypography>
            </MDBox>

            <Card sx={{ p: 3, mb: 4 }}>
              <MDBox display="flex" alignItems="center">
                <MDBox
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  width="3rem"
                  height="3rem"
                  borderRadius="xl"
                  bgColor="warning"
                  color="white"
                  mr={2}
                >
                  <Icon fontSize="medium">rocket_launch</Icon>
                </MDBox>
                <MDBox>
                  <MDTypography variant="h5" fontWeight="bold">
                    {t("connect.launchTitle")}
                  </MDTypography>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    {t("connect.launchBody")}
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Card>

            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" fontWeight="bold" mb={1}>
                  {t("connect.requestTitle")}
                </MDTypography>
                <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={2}>
                  {t("connect.requestHint")}
                </MDTypography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {pending ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t("connect.pending", { count: pending.requested_amount })}
                  </Alert>
                ) : (
                  <MDBox component="form" role="form" mt={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <MDInput
                          fullWidth
                          type="number"
                          label={t("connect.countLabel")}
                          value={packageCount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPackageCount(e.target.value)
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MDInput
                          fullWidth
                          type="text"
                          label={t("connect.noteLabel")}
                          placeholder={t("connect.notePlaceholder")}
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
                        disabled={loading || !countOk}
                        onClick={handleSubmit}
                      >
                        {loading ? t("connect.submitting") : t("connect.submit")}
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

export default B2bApiPage;

/**
 * FEAT-SaaS S3 — Sayfa 2: TulipFleet Connect (B2B API) (/subscription/b2b-api).
 * Spec: docs/FEAT-SAAS_self-service.md §2 Sayfa 2 + Kapsam Muhru (FEAT-Connect).
 * DURUSTLUK: sahte sayac / simule key / canli kullanim grafigi YOK. Sayfa
 * "Yakinda" lansmaniyla durur; TEK gercek islev: api_package on-talebi
 * (request_type='api_package', ayni subscription_requests akisi, PENDING kalici).
 * Onay tarafi FEAT-Connect lansmanina ertelidir — ekranda acikca yazilir.
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

import { useAuthStore } from "store/useAuthStore";

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";

interface SubRequest {
  id: string;
  request_type: string;
  requested_amount: number;
  status: string;
  created_at: string;
}

function B2bApiPage(): JSX.Element {
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
        setError((body && body.message) || "Talep iletilirken bir hata olustu.");
      }
    } catch (err) {
      setError("Sunucuya ulasilamadi.");
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
            {/* Baslik */}
            <MDBox mb={4} textAlign="center">
              <MDTypography variant="h3" fontWeight="bold">
                TulipFleet Connect
              </MDTypography>
              <MDTypography variant="h6" fontWeight="regular" color="secondary" mt={1}>
                B2B API &amp; Entegrasyonlar — Zero-Emission Zone &amp; Vrachtwagenheffing servisi
              </MDTypography>
            </MDBox>

            {/* Lansman Banner — durust "Yakinda" */}
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
                    🚀 TulipFleet Europe ZE-Zone &amp; Toll API — Yakında Hizmetinizde
                  </MDTypography>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    PostGIS bölge denetimi (ST_Contains) ve Vrachtwagenheffing maliyet motoru,
                    FEAT-Connect lansmanıyla API anahtarı yönetimi ve kullanım panosuyla birlikte
                    açılacaktır. Bu sayfada canlı sayaç veya API anahtarı GÖSTERİLMEZ — servis
                    yayına alındığında burada gerçek verilerle görünecektir.
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Card>

            {/* On-Talep Formu — GERCEK akis (api_package) */}
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" fontWeight="bold" mb={1}>
                  Ek API Paketi Ön-Talebi
                </MDTypography>
                <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={2}>
                  Paket: <b>€49 / 50.000 sorgu</b>. Talebiniz kayıt altına alınır
                  (PENDING_APPROVAL); tahsis işlemi FEAT-Connect lansmanıyla birlikte
                  Supervizör onayından geçer.
                </MDTypography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {pending ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <b>⏳ Paket Talebiniz Onay Bekliyor:</b> {pending.requested_amount} adet API
                    paketi ön-talebiniz alınmıştır. FEAT-Connect lansmanıyla birlikte işleme
                    alınacaktır.
                  </Alert>
                ) : (
                  <MDBox component="form" role="form" mt={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <MDInput
                          fullWidth
                          type="number"
                          label="Paket Adedi"
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
                          label="Dekont No / Ödeme Bildirimi Notu"
                          placeholder="Örn: Dekont #TR-9483"
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
                        {loading ? "Gönderiliyor..." : "Ek Paket Talep Et"}
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

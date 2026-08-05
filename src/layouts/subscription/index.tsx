/**
 * FEAT-SaaS S3 — Sayfa 1: Abonelik & Arac Yonetimi (/subscription).
 * Spec: docs/FEAT-SAAS_self-service.md §2 Sayfa 1 (05.08.2026, Cem referans yapisi).
 * Kaynak desen: ecommerce/products/new-product (Card+Grid+MD bilesenleri) —
 * stepper kaldirildi, tek sayfa: ustte kota ozeti, altta artirim talebi formu.
 * Sozlesmeler (S2-E1 smoke'uyla kanitli):
 *   GET  {ENTERPRISE}/api/subscription/quota    -> { quota: {...} }
 *   GET  {ENTERPRISE}/api/subscription/requests -> { requests: [...] }
 *   POST {ENTERPRISE}/api/subscription/requests  { request_type:'vehicle_increase',
 *        requested_amount, payment_note } -> 201 { request }
 * Durustluk: paket adi hardcode edilmez (subscription_tier basilir); otomatik
 * kart cekimi/kota artisi YOK — yalniz PENDING_APPROVAL talebi.
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

  // Acilista: kota + mevcut PENDING talep (yenilemede durum kaybolmasin)
  useEffect(() => {
    if (!token) return;
    fetch(`${ENTERPRISE_API_URL}/api/subscription/quota`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setQuota(data.quota))
      .catch(() => setError("Kota bilgisi alinamadi."));
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
                Abonelik &amp; Araç Yönetimi
              </MDTypography>
              <MDTypography variant="h6" fontWeight="regular" color="secondary" mt={1}>
                Mevcut filo kotanızı görüntüleyin ve ek araç lisans talebinde bulunun.
              </MDTypography>
            </MDBox>

            {/* Kota & Durum Karti */}
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
                        Aktif Araç / Max Kota
                      </MDTypography>
                      <MDTypography variant="h4" fontWeight="bold">
                        {quota ? `${quota.active_vehicles} / ${quota.max_vehicles} Araç` : "Yükleniyor..."}
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                </Grid>
                <Grid item xs={12} md={6}>
                  <MDBox display="flex" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                    <MDTypography variant="caption" color="text">
                      Paket:{" "}
                      <b>{quota && quota.subscription_tier ? quota.subscription_tier : "—"}</b>
                      {quota && quota.subscription_status ? ` · ${quota.subscription_status}` : ""}
                    </MDTypography>
                  </MDBox>
                </Grid>
              </Grid>
            </Card>

            {/* Talep Formu Karti */}
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" fontWeight="bold" mb={2}>
                  Lisans / Araç Sayısı Artırım Talebi
                </MDTypography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {pending ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <b>⏳ Talebiniz İncelemede:</b> {pending.requested_amount} ek araç lisans
                    talebiniz Supervizör onayına sunulmuştur. Ödeme teyidinin ardından kotanız
                    güncellenecektir.
                  </Alert>
                ) : (
                  <MDBox component="form" role="form" mt={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <MDInput
                          fullWidth
                          type="number"
                          label="Talep Edilen Ek Araç Sayısı"
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
                          label="Dekont No / Ödeme Bildirimi Notu"
                          placeholder="Örn: Dekont #TR-9482"
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
                        {loading ? "Gönderiliyor..." : "Artırım Talebi Gönder"}
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

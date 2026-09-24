/**
 * FEAT-SaaS S4 — Sayfa 4: Musteri Detay & Yonetim (/admin/supervisor/customer-detail).
 * Kaynak desen: ecommerce/orders/order-details (Card ici sol/sag Grid bloklari).
 * Sol: bekleyen talepler (Onayla→approve APPROVED+kota+mail / Reddet→reject).
 *   api_package satirinda aksiyon DISABLED + "FEAT-Connect — Yakinda" rozeti
 *   (backend 422 sozlesmesinin durust UI yuzu).
 * Sag: MANUEL kota paneli — reason ZORUNLU (>=5kr), PUT .../companies/:id/quota
 *   audit muhruyle (quota_manual_update). D-S2: gate gecilmeden fetch yok.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDBadge from "components/MDBadge";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import { formatDateTime, useT } from "i18n";
import SupervisorGate from "layouts/supervisor/SupervisorGate";
import { SUPERVISOR_API_URL } from "layouts/supervisor/supervisorSession";

interface PendingReq {
  id: string;
  company_id: string;
  company_name: string;
  max_vehicles: number;
  active_vehicles: number;
  request_type: string;
  requested_amount: number;
  payment_note: string | null;
  created_at: string;
  requested_by_email: string | null;
}

function CustomerDetailContent({ saToken }: { saToken: string }): JSX.Element {
  const { t, lang } = useT();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get("companyId") || "";
  const [requests, setRequests] = useState<PendingReq[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  const [maxVehicles, setMaxVehicles] = useState<number | null>(null);
  const [activeVehicles, setActiveVehicles] = useState<number | null>(null);
  const [decisionNote, setDecisionNote] = useState<string>("");
  const [newMax, setNewMax] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [flash, setFlash] = useState<{ sev: "success" | "error"; msg: string } | null>(null);

  const headers = { Authorization: `Bearer ${saToken}`, "Content-Type": "application/json" };

  const load = () => {
    fetch(`${SUPERVISOR_API_URL}/api/superadmin/subscriptions/requests?status=PENDING_APPROVAL`, {
      headers,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const mine = (data.requests || []).filter((r: PendingReq) => r.company_id === companyId);
        setRequests(mine);
        if (mine.length > 0) {
          setCompanyName(mine[0].company_name);
          setMaxVehicles(mine[0].max_vehicles);
          setActiveVehicles(mine[0].active_vehicles);
        }
      })
      .catch(() => setFlash({ sev: "error", msg: t("supervisor.errorRequests") }));
    // When no request exists, company summary comes from the companies list
    fetch(`${SUPERVISOR_API_URL}/api/superadmin/companies`, { headers })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.companies || data.rows || [];
        const c = arr.find((x: any) => x.id === companyId);
        if (c) {
          setCompanyName(c.name);
          setMaxVehicles(c.max_vehicles);
          setActiveVehicles(Number(c.vehicle_count));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (companyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, saToken]);

  const decide = async (reqId: string, action: "approve" | "reject") => {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch(
        `${SUPERVISOR_API_URL}/api/superadmin/subscriptions/requests/${reqId}/${action}`,
        { method: "POST", headers, body: JSON.stringify({ decision_note: decisionNote || null }) }
      );
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setFlash({
          sev: "success",
          msg:
            action === "approve"
              ? t("supervisor.approved", { max: body.approved.new_max_vehicles })
              : t("supervisor.rejected"),
        });
        setDecisionNote("");
        load();
      } else {
        setFlash({
          sev: "error",
          msg: (body && body.message) || t("supervisor.actionFailed", { status: res.status }),
        });
      }
    } catch {
      setFlash({ sev: "error", msg: t("supervisor.errorNetwork") });
    } finally {
      setBusy(false);
    }
  };

  const manualOk =
    Number.isInteger(Number(newMax)) && Number(newMax) >= 0 && manualReason.trim().length >= 5;

  const manualUpdate = async () => {
    if (!manualOk) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch(
        `${SUPERVISOR_API_URL}/api/superadmin/subscriptions/companies/${companyId}/quota`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ max_vehicles: Number(newMax), reason: manualReason.trim() }),
        }
      );
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setFlash({
          sev: "success",
          msg: t("supervisor.quotaSealed", {
            old: body.updated.old_max_vehicles,
            new: body.updated.new_max_vehicles,
          }),
        });
        setNewMax("");
        setManualReason("");
        load();
      } else {
        setFlash({
          sev: "error",
          msg: (body && body.message) || t("supervisor.actionFailed", { status: res.status }),
        });
      }
    } catch {
      setFlash({ sev: "error", msg: t("supervisor.errorNetwork") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <MDBox my={6}>
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} lg={10}>
          <Card>
            {/* Header */}
            <MDBox pt={2} px={2} display="flex" justifyContent="space-between" alignItems="center">
              <MDBox>
                <MDTypography variant="h5" fontWeight="bold">
                  {companyName || t("supervisor.customerTitle")}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  {t("supervisor.vehiclesLine", {
                    active: activeVehicles ?? "—",
                    max: maxVehicles ?? "—",
                  })}{" "}
                  <span style={{ fontFamily: "monospace" }}>{companyId.slice(0, 8)}</span>
                </MDTypography>
              </MDBox>
              <MDBadge
                badgeContent={t("supervisor.pendingBadge", { count: requests.length })}
                color={requests.length > 0 ? "warning" : "secondary"}
                container
              />
            </MDBox>
            <Divider />
            {flash && (
              <MDBox px={2}>
                <Alert severity={flash.sev}>{flash.msg}</Alert>
              </MDBox>
            )}
            <MDBox pt={1} pb={3} px={2}>
              <Grid container spacing={3}>
                {/* SOL BLOK — bekleyen talepler */}
                <Grid item xs={12} md={7}>
                  <MDTypography variant="h6" fontWeight="bold" mb={1}>
                    {t("supervisor.pendingTitle")}
                  </MDTypography>
                  {requests.length === 0 && (
                    <MDTypography variant="button" color="text">
                      {t("supervisor.pendingEmpty")}
                    </MDTypography>
                  )}
                  {requests.map((r) => (
                    <Card key={r.id} sx={{ p: 2, mb: 2, border: "1px solid rgba(0,0,0,0.08)" }}>
                      <MDBox display="flex" justifyContent="space-between" alignItems="center">
                        <MDBox>
                          <MDTypography variant="button" fontWeight="bold" display="block">
                            {r.request_type === "vehicle_increase"
                              ? t("supervisor.vehicleQuota", { count: r.requested_amount })
                              : t("supervisor.apiPackage", { count: r.requested_amount })}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            {r.payment_note || t("supervisor.noPaymentNote")} ·{" "}
                            {formatDateTime(r.created_at, lang)} ·{" "}
                            {r.requested_by_email || "—"}
                          </MDTypography>
                        </MDBox>
                        {r.request_type === "vehicle_increase" ? (
                          <MDBox display="flex" gap={1}>
                            <MDButton
                              variant="gradient"
                              color="success"
                              size="small"
                              disabled={busy}
                              onClick={() => decide(r.id, "approve")}
                            >
                              {t("supervisor.approveQuota")}
                            </MDButton>
                            <MDButton
                              variant="outlined"
                              color="error"
                              size="small"
                              disabled={busy}
                              onClick={() => decide(r.id, "reject")}
                            >
                              {t("supervisor.reject")}
                            </MDButton>
                          </MDBox>
                        ) : (
                          <MDBadge badgeContent={t("supervisor.featConnectSoon")} color="secondary" container />
                        )}
                      </MDBox>
                    </Card>
                  ))}
                  <MDInput
                    fullWidth
                    label={t("supervisor.decisionNote")}
                    value={decisionNote}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDecisionNote(e.target.value)
                    }
                  />
                </Grid>

                {/* SAG BLOK — manuel kota paneli */}
                <Grid item xs={12} md={5}>
                  <Card sx={{ p: 2, bgcolor: "rgba(0,0,0,0.02)" }}>
                    <MDBox display="flex" alignItems="center" mb={1}>
                      <Icon sx={{ mr: 1 }}>tune</Icon>
                      <MDTypography variant="h6" fontWeight="bold">
                        {t("supervisor.manualTitle")}
                      </MDTypography>
                    </MDBox>
                    <MDTypography variant="caption" color="text" display="block" mb={2}>
                      {t("supervisor.manualHint", { max: maxVehicles ?? "—" })}
                    </MDTypography>
                    <MDBox mb={2}>
                      <MDInput
                        fullWidth
                        type="number"
                        label={t("supervisor.newQuota")}
                        value={newMax}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewMax(e.target.value)
                        }
                      />
                    </MDBox>
                    <MDBox mb={2}>
                      <MDInput
                        fullWidth
                        label={t("supervisor.reason")}
                        value={manualReason}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setManualReason(e.target.value)
                        }
                      />
                    </MDBox>
                    <MDButton
                      fullWidth
                      variant="gradient"
                      color="dark"
                      disabled={busy || !manualOk}
                      onClick={manualUpdate}
                    >
                      {t("supervisor.seal")}
                    </MDButton>
                  </Card>
                </Grid>
              </Grid>
            </MDBox>
          </Card>
        </Grid>
      </Grid>
    </MDBox>
  );
}

function CustomerDetailPage(): JSX.Element {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SupervisorGate>{(saToken) => <CustomerDetailContent saToken={saToken} />}</SupervisorGate>
      <Footer />
    </DashboardLayout>
  );
}

export default CustomerDetailPage;

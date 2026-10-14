/**
 * FEAT-SaaS S3 — Page 2: TulipFleet Connect (B2B API key dashboard).
 * /subscription/b2b-api.
 *
 * 2026-10-11 (Cem, B2B API Key Dashboard slice 4): REPLACES the old
 * "coming soon" pre-request flow (manual api_package subscription_request,
 * approved by hand). Per Cem's penetration-pricing strategy — frictionless,
 * credit-card self-serve, no budget-approval step — key creation/revocation
 * is now instant and self-service. The only usage gate left is
 * checkVehicleQuota at request time (tulipfleet-enterprise-backend,
 * lib/assessRoute.js), untouched by this page.
 *
 * Honesty (carried over from the page this replaces): no fabricated
 * per-key call-count/usage charts — the backend does not meter queries
 * per key, only last_used_at (see lib/apiKeys/*.js). What's shown here is
 * real: the key list (prefix/label/dates/status) and the real vehicle
 * quota (GET /api/subscription/quota, same contract SubscriptionPage uses).
 * The full plaintext key is shown exactly once, right after creation
 * (useApiKeys' `newKey`) — never re-displayed afterward.
 */
import { useEffect, useState } from "react";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDProgress from "components/MDProgress";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import { dialog } from "assets/theme/tokens";
import { ENTERPRISE_API_URL } from "config/api";
import { useMaterialUIController } from "context";
import { useT } from "i18n";
import { useAuthStore } from "store/useAuthStore";
import { useApiKeys } from "hooks/useApiKeys";

interface QuotaData {
  max_vehicles: number;
  active_vehicles: number;
  subscription_tier: string | null;
}

function B2bApiPage(): JSX.Element {
  const { t } = useT();
  const [controller] = useMaterialUIController();
  const muted = controller.darkMode ? dialog.dark.textMuted : dialog.light.textMuted;
  const token = useAuthStore((s) => s.token);

  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [label, setLabel] = useState<string>("");
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const {
    keys,
    loading,
    error,
    newKey,
    creating,
    createError,
    revokingId,
    createKey,
    revokeKey,
    dismissNewKey,
  } = useApiKeys();

  useEffect(() => {
    if (!token) return;
    fetch(`${ENTERPRISE_API_URL}/api/subscription/quota`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setQuota(data.quota))
      .catch(() => {});
  }, [token]);

  const quotaPct = quota && quota.max_vehicles > 0 ? Math.min(100, Math.round((quota.active_vehicles / quota.max_vehicles) * 100)) : 0;

  const handleCreate = async () => {
    await createKey(label.trim() || undefined);
    setLabel("");
  };

  const handleRevokeConfirmed = async (id: string) => {
    setConfirmRevokeId(null);
    await revokeKey(id);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={9} mt={4}>
        <Grid container justifyContent="center">
          <Grid item xs={12} lg={9}>
            <MDBox mb={4} textAlign="center">
              {/* D7-3 (4) (15 Eki 2026): axe heading-order — bkz. subscription/index.tsx aynı not. */}
              <MDTypography variant="h3" component="h2" fontWeight="bold">
                {t("connect.title")}
              </MDTypography>
              <MDTypography
                variant="h6"
                component="p"
                fontWeight="regular"
                mt={1}
                sx={{ color: muted }}
              >
                {t("connect.subtitle")}
              </MDTypography>
            </MDBox>

            {quota && (
              <Card sx={{ p: 3, mb: 4 }}>
                <MDTypography variant="h5" component="h3" fontWeight="bold" mb={1}>
                  {t("connect.quotaTitle")}
                </MDTypography>
                <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={2}>
                  {t("connect.quotaHint", { active: quota.active_vehicles, max: quota.max_vehicles })}
                </MDTypography>
                <MDProgress value={quotaPct} color={quotaPct >= 90 ? "error" : "info"} variant="gradient" />
              </Card>
            )}

            {newKey && (
              <Alert severity="success" onClose={dismissNewKey} sx={{ mb: 3 }}>
                <MDTypography variant="button" fontWeight="bold" display="block" mb={0.5}>
                  {t("connect.newKeyTitle")}
                </MDTypography>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  display="block"
                  mb={1}
                  sx={{ wordBreak: "break-all", fontFamily: "monospace" }}
                >
                  {newKey.key}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  {t("connect.newKeyWarning")}
                </MDTypography>
              </Alert>
            )}

            <Card sx={{ p: 3, mb: 4 }}>
              <MDTypography variant="h5" component="h3" fontWeight="bold" mb={1}>
                {t("connect.createTitle")}
              </MDTypography>
              <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={2}>
                {t("connect.createHint")}
              </MDTypography>

              {createError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {t("connect.errorSubmit")}
                </Alert>
              )}

              <MDBox display="flex" gap={2} flexWrap="wrap" alignItems="flex-start">
                <MDBox flexGrow={1} minWidth="240px">
                  <MDInput
                    fullWidth
                    type="text"
                    label={t("connect.labelField")}
                    placeholder={t("connect.labelPlaceholder")}
                    value={label}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
                  />
                </MDBox>
                <MDButton variant="gradient" color="dark" disabled={creating} onClick={handleCreate}>
                  {creating ? t("connect.creating") : t("connect.createButton")}
                </MDButton>
              </MDBox>
            </Card>

            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" component="h3" fontWeight="bold" mb={2}>
                  {t("connect.keysTitle")}
                </MDTypography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {t("connect.errorList")}
                  </Alert>
                )}

                {loading && (
                  <MDTypography variant="button" color="text">
                    {t("connect.loadingKeys")}
                  </MDTypography>
                )}

                {!loading && keys.length === 0 && (
                  <MDTypography variant="button" color="text">
                    {t("connect.emptyKeys")}
                  </MDTypography>
                )}

                {!loading && keys.length > 0 && (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("connect.colLabel")}</TableCell>
                        <TableCell>{t("connect.colPrefix")}</TableCell>
                        <TableCell>{t("connect.colCreated")}</TableCell>
                        <TableCell>{t("connect.colLastUsed")}</TableCell>
                        <TableCell>{t("connect.colStatus")}</TableCell>
                        <TableCell align="right">{t("connect.colAction")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {keys.map((k) => {
                        const isRevoked = !!k.revoked_at;
                        return (
                          <TableRow key={k.id}>
                            <TableCell>{k.label || t("connect.noLabel")}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace" }}>{k.key_prefix}…</TableCell>
                            <TableCell>{new Date(k.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : t("connect.neverUsed")}
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="caption" color={isRevoked ? "secondary" : "success"} fontWeight="bold">
                                {isRevoked ? t("connect.statusRevoked") : t("connect.statusActive")}
                              </MDTypography>
                            </TableCell>
                            <TableCell align="right">
                              {!isRevoked &&
                                (confirmRevokeId === k.id ? (
                                  <MDBox display="flex" gap={1} justifyContent="flex-end">
                                    <MDButton
                                      size="small"
                                      color="error"
                                      disabled={revokingId === k.id}
                                      onClick={() => handleRevokeConfirmed(k.id)}
                                    >
                                      {t("connect.confirmRevoke")}
                                    </MDButton>
                                    <MDButton size="small" color="secondary" onClick={() => setConfirmRevokeId(null)}>
                                      {t("connect.cancelRevoke")}
                                    </MDButton>
                                  </MDBox>
                                ) : (
                                  <IconButton size="small" onClick={() => setConfirmRevokeId(k.id)} aria-label={t("connect.revoke")}>
                                    <Icon fontSize="small">delete</Icon>
                                  </IconButton>
                                ))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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

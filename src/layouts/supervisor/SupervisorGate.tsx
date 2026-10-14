/**
 * SupervisorGate — D-S2 Durust Guvenlik Kapisi (05.08.2026, spec §3).
 * Gercek re-auth: /api/auth/login'e e-posta+parola → donen JWT payload'inda
 * role === 'super_admin' degilse RED. Gate gecilmeden cocuk render EDILMEZ →
 * hicbir veri fetch'i baslamaz. Token bellek-ici (yenilemede yeniden sorar).
 * Sahte/UI-only sifre modali YASAK — bu bilesen gercek 401/403 uzerinde calisir.
 */
import { useState } from "react";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Alert from "@mui/material/Alert";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";

import { useT } from "i18n";
import {
  SUPERVISOR_API_URL,
  getSupervisorToken,
  setSupervisorToken,
} from "layouts/supervisor/supervisorSession";

interface Props {
  children: (saToken: string) => JSX.Element;
}

function decodeRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

function SupervisorGate({ children }: Props): JSX.Element {
  const { t } = useT();
  const [token, setToken] = useState<string | null>(getSupervisorToken());
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SUPERVISOR_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(t("supervisor.gateAuthFailed"));
        return;
      }
      const data = await res.json();
      const saTok = data.token as string;
      if (decodeRole(saTok) !== "super_admin") {
        setError(t("supervisor.gateForbidden"));
        return;
      }
      setSupervisorToken(saTok);
      setToken(saTok);
    } catch {
      setError(t("supervisor.gateNetwork"));
    } finally {
      setLoading(false);
    }
  };

  if (token) return children(token);

  return (
    <Grid container justifyContent="center" mt={6}>
      <Grid item xs={12} md={5} lg={4}>
        <Card sx={{ p: 3 }}>
          <MDBox display="flex" alignItems="center" mb={2}>
            <MDBox
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="3rem"
              height="3rem"
              borderRadius="xl"
              bgColor="error"
              color="white"
              mr={2}
            >
              <Icon fontSize="medium">shield</Icon>
            </MDBox>
            <MDBox>
              {/* D7-3 (4) (15 Eki 2026): axe heading-order — bu ekran geçit
                  aşılana kadar SupervisorContent'in h2'sinin yerini alıyor,
                  aynı seviyede olmalı. */}
              <MDTypography variant="h5" component="h2" fontWeight="bold">
                {t("supervisor.gateTitle")}
              </MDTypography>
              <MDTypography variant="caption" color="text">
                {t("supervisor.gateHint")}
              </MDTypography>
            </MDBox>
          </MDBox>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <MDBox component="form" role="form">
            <MDBox mb={2}>
              <MDInput
                fullWidth
                type="email"
                label={t("supervisor.gateEmail")}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
            </MDBox>
            <MDBox mb={3}>
              <MDInput
                fullWidth
                type="password"
                label={t("supervisor.gatePassword")}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
            </MDBox>
            <MDButton
              fullWidth
              variant="gradient"
              color="error"
              disabled={loading || !email || !password}
              onClick={handleLogin}
            >
              {loading ? t("supervisor.gateSubmitting") : t("supervisor.gateSubmit")}
            </MDButton>
          </MDBox>
        </Card>
      </Grid>
    </Grid>
  );
}

export default SupervisorGate;

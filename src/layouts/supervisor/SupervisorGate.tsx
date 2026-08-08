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
        setError("Kimlik dogrulanamadi (401). E-posta/parola kontrol edin.");
        return;
      }
      const data = await res.json();
      const t = data.token as string;
      if (decodeRole(t) !== "super_admin") {
        setError("Bu panel yalniz Super Admin icindir (403).");
        return;
      }
      setSupervisorToken(t);
      setToken(t);
    } catch {
      setError("Sunucuya ulasilamadi.");
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
              <MDTypography variant="h5" fontWeight="bold">
                Supervizör Doğrulama
              </MDTypography>
              <MDTypography variant="caption" color="text">
                Super Admin kimliğinizle yeniden doğrulayın. Doğrulama olmadan
                müşteri verisi çekilmez.
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
                label="E-posta"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
            </MDBox>
            <MDBox mb={3}>
              <MDInput
                fullWidth
                type="password"
                label="Parola"
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
              {loading ? "Doğrulanıyor..." : "Doğrula ve Paneli Aç"}
            </MDButton>
          </MDBox>
        </Card>
      </Grid>
    </Grid>
  );
}

export default SupervisorGate;

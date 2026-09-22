/**
=========================================================
* Material Dashboard 2 PRO React TS - v1.0.2
=========================================================
* Product Page: https://www.creative-tim.com/product/material-dashboard-2-pro-react-ts
* Copyright 2023 Creative Tim (https://www.creative-tim.com)
Coded by www.creative-tim.com
=========================================================
*/

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Switch from "@mui/material/Switch";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";

// Authentication layout components
import BasicLayout from "layouts/authentication/components/BasicLayout";
import BrandBlock from "layouts/authentication/components/BrandBlock";

import { Link, useNavigate } from "react-router-dom";
import { useT } from "i18n";
import { useAuthStore } from "store/useAuthStore";
import { a11y, landing } from "assets/theme/tokens";
import LanguageSwitcher from "components/LanguageSwitcher";

function Basic(): JSX.Element {
  const { t } = useT();
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("demo@tulipfleet.com");
  const [password, setPassword] = useState<string>("Demo123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/dashboards/live-fleet-map");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.failed"));
      setLoading(false);
    }
  };

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  return (
    <>
      <MDBox position="fixed" top={16} right={16} zIndex={1300}>
        <LanguageSwitcher variant="login" />
      </MDBox>
      <BasicLayout>
      <Card>
        <BrandBlock />
        <MDBox px={3} pt={1} textAlign="center">
          <MDTypography variant="h6" component="p" fontWeight="medium">
            {t("login.title")}
          </MDTypography>
        </MDBox>
        <MDBox pt={2} pb={3} px={3}>
          <MDBox component="form" role="form">
            <MDBox mb={2}>
              <MDInput
                type="email"
                label={t("login.email")}
                fullWidth
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                InputLabelProps={{
                  sx: (theme: { palette: { mode: string } }) => ({
                    color: theme.palette.mode === "dark" ? landing.offwhite : landing.navyInk,
                    opacity: 1,
                    "&.Mui-focused": {
                      color: theme.palette.mode === "dark" ? landing.offwhite : landing.navyInk,
                    },
                  }),
                }}
              />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                type="password"
                label={t("login.password")}
                fullWidth
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                InputLabelProps={{
                  sx: (theme: { palette: { mode: string } }) => ({
                    color: theme.palette.mode === "dark" ? landing.offwhite : landing.navyInk,
                    opacity: 1,
                    "&.Mui-focused": {
                      color: theme.palette.mode === "dark" ? landing.offwhite : landing.navyInk,
                    },
                  }),
                }}
              />
            </MDBox>
            <MDBox mb={2} display="flex" justifyContent="flex-end">
              <MDTypography
                component={Link}
                to="/authentication/forgot-password"
                variant="button"
                color="inherit"
                fontWeight="medium"
                sx={(theme: { palette: { mode: string } }) => ({
                  color: theme.palette.mode === "dark" ? a11y.linkDark : a11y.linkLight,
                })}
              >
                {t("login.forgotPassword")}
              </MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" ml={-1}>
              <Switch
                checked={rememberMe}
                onChange={handleSetRememberMe}
                inputProps={{ "aria-labelledby": "login-remember-me" }}
              />
              <MDTypography
                id="login-remember-me"
                variant="button"
                fontWeight="regular"
                color="text"
                onClick={handleSetRememberMe}
                sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
              >
                &nbsp;&nbsp;{t("login.rememberMe")}
              </MDTypography>
            </MDBox>
            <MDBox mt={4} mb={1}>
              {error ? (
                <MDBox mb={1}>
                  <MDTypography variant="caption" color="error">
                    {error}
                  </MDTypography>
                </MDBox>
              ) : null}
              <MDButton
                variant="contained"
                fullWidth
                onClick={handleSignIn}
                disabled={loading}
                sx={{
                  backgroundColor: `${landing.emerald} !important`,
                  color: `${landing.navyInk} !important`,
                  "&:hover": { backgroundColor: `${landing.emerald} !important` },
                  "&:disabled": { color: `${landing.navyInk} !important`, opacity: 0.7 },
                }}
              >
                {loading ? t("login.submitting") : t("login.submit")}
              </MDButton>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
    </>
  );
}

export default Basic;

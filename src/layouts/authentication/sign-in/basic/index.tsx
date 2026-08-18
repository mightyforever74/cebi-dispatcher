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

// Images
import bgImage from "assets/images/bg-sign-in-basic.jpeg";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "store/useAuthStore";
function Basic(): JSX.Element {
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
      setError(e instanceof Error ? e.message : "Giriş başarısız");
      setLoading(false);
    }
  };

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  return (
    <BasicLayout image={bgImage}>
      <Card>
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="info"
          mx={2}
          mt={-3}
          p={2}
          mb={1}
          textAlign="center"
        >
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
            Sign in
          </MDTypography>
          <MDTypography display="block" variant="button" color="white" my={1}>
            TulipFleet Dispatcher
          </MDTypography>
        </MDBox>
        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form">
            <MDBox mb={2}>
              <MDInput
                type="email"
                label="Email"
                fullWidth
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
              />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                type="password"
                label="Password"
                fullWidth
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
              />
            </MDBox>
            <MDBox mb={2} display="flex" justifyContent="flex-end">
              <MDTypography
                component={Link}
                to="/authentication/forgot-password"
                variant="button"
                color="info"
                fontWeight="medium"
              >
                Şifremi unuttum
              </MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" ml={-1}>
              <Switch checked={rememberMe} onChange={handleSetRememberMe} />
              <MDTypography
                variant="button"
                fontWeight="regular"
                color="text"
                onClick={handleSetRememberMe}
                sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
              >
                &nbsp;&nbsp;Remember me
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
                variant="gradient"
                color="info"
                fullWidth
                onClick={handleSignIn}
                disabled={loading}
              >
                {loading ? "signing in..." : "sign in"}
              </MDButton>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default Basic;

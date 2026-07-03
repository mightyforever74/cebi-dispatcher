/**
=========================================================
* TulipFleet Dispatcher — Change Password
=========================================================
* Gercek API baglantisi: PUT /api/user/change-password.
* Requirements listesi mobil ChangePasswordScreen.js'ten kanitli gercek
* kurallarla degistirildi (ozel karakter/sayi kurallari MD2 demo idi, yoktu).
=========================================================
*/

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

// Real API
import { useChangePassword } from "hooks/useUserAccount";

function ChangePassword(): JSX.Element {
  const changePasswordMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const passwordRequirements = [
    "Min 6 characters",
    "New password and confirmation must match",
    "New password must be different from current password",
  ];

  const renderPasswordRequirements = passwordRequirements.map((item, key) => {
    const itemKey = `element-${key}`;
    return (
      <MDBox key={itemKey} component="li" color="text" fontSize="1.25rem" lineHeight={1}>
        <MDTypography variant="button" color="text" fontWeight="regular" verticalAlign="middle">
          {item}
        </MDTypography>
      </MDBox>
    );
  });

  const handleUpdate = () => {
    setFormError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setFormError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      setFormError("New password must be different from current password");
      return;
    }
    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      }
    );
  };

  return (
    <Card id="change-password">
      <MDBox p={3}>
        <MDTypography variant="h5">Change Password</MDTypography>
      </MDBox>
      <MDBox component="form" pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <MDInput
              fullWidth
              label="Current Password"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCurrentPassword(e.target.value)
              }
              inputProps={{ type: "password", autoComplete: "" }}
            />
          </Grid>
          <Grid item xs={12}>
            <MDInput
              fullWidth
              label="New Password"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              inputProps={{ type: "password", autoComplete: "" }}
            />
          </Grid>
          <Grid item xs={12}>
            <MDInput
              fullWidth
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              inputProps={{ type: "password", autoComplete: "" }}
            />
          </Grid>
        </Grid>
        {formError && (
          <MDBox mt={1}>
            <MDTypography variant="caption" color="error" fontWeight="bold">
              {formError}
            </MDTypography>
          </MDBox>
        )}
        {changePasswordMutation.isError && !formError && (
          <MDBox mt={1}>
            <MDTypography variant="caption" color="error" fontWeight="bold">
              Could not change password — check your current password
            </MDTypography>
          </MDBox>
        )}
        {changePasswordMutation.isSuccess && (
          <MDBox mt={1}>
            <MDTypography variant="caption" color="success" fontWeight="bold">
              Password updated
            </MDTypography>
          </MDBox>
        )}
        <MDBox mt={6} mb={1}>
          <MDTypography variant="h5">Password requirements</MDTypography>
        </MDBox>
        <MDBox mb={1}>
          <MDTypography variant="body2" color="text">
            Please follow this guide for a strong password
          </MDTypography>
        </MDBox>
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap">
          <MDBox component="ul" m={0} pl={3.25} mb={{ xs: 8, sm: 0 }}>
            {renderPasswordRequirements}
          </MDBox>
          <MDBox ml="auto">
            <MDButton
              variant="gradient"
              color="dark"
              size="small"
              onClick={handleUpdate}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "updating..." : "update password"}
            </MDButton>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default ChangePassword;

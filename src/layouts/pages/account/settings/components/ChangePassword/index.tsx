/**
 * TulipFleet Dispatcher — Change Password
 */
import { useState } from "react";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import { useNotifications } from "components/Notifications";
import { useChangePassword } from "hooks/useUserAccount";
import { useT } from "i18n";

function ChangePassword(): JSX.Element {
  const { t } = useT();
  const { notifyToast } = useNotifications();
  const changePasswordMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const requirements = [t("settings.reqMin"), t("settings.reqMatch"), t("settings.reqDifferent")];

  const handleUpdate = () => {
    setFormError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError(t("settings.allRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setFormError(t("settings.passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t("settings.passwordMismatch"));
      return;
    }
    if (currentPassword === newPassword) {
      setFormError(t("settings.passwordSame"));
      return;
    }
    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          notifyToast({ type: "form_ok", title: t("notifyForm.passwordUpdated") });
        },
        onError: () =>
          notifyToast({
            type: "form_err",
            title: t("settings.passwordFailed"),
            severity: "high",
          }),
      }
    );
  };

  return (
    <Card id="change-password">
      <MDBox p={3}>
        <MDTypography variant="h5" component="h2">
          {t("settings.passwordTitle")}
        </MDTypography>
      </MDBox>
      <MDBox component="form" pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <MDInput
              fullWidth
              label={t("settings.currentPassword")}
              value={currentPassword}
              required
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCurrentPassword(e.target.value)
              }
              inputProps={{ type: "password", autoComplete: "", "aria-required": true }}
            />
          </Grid>
          <Grid item xs={12}>
            <MDInput
              fullWidth
              label={t("settings.newPassword")}
              value={newPassword}
              required
              error={Boolean(formError)}
              helperText={formError || undefined}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              inputProps={{ type: "password", autoComplete: "", "aria-required": true }}
            />
          </Grid>
          <Grid item xs={12}>
            <MDInput
              fullWidth
              label={t("settings.confirmPassword")}
              value={confirmPassword}
              required
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              inputProps={{ type: "password", autoComplete: "", "aria-required": true }}
            />
          </Grid>
        </Grid>
        {changePasswordMutation.isError && !formError && (
          <MDBox mt={1}>
            <MDTypography variant="caption" color="error" fontWeight="bold">
              {t("settings.passwordFailed")}
            </MDTypography>
          </MDBox>
        )}
        <MDBox mt={6} mb={1}>
          <MDTypography variant="h5">{t("settings.passwordRequirements")}</MDTypography>
        </MDBox>
        <MDBox mb={1}>
          <MDTypography variant="body2" color="text">
            {t("settings.passwordGuide")}
          </MDTypography>
        </MDBox>
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap">
          <MDBox component="ul" m={0} pl={3.25} mb={{ xs: 8, sm: 0 }}>
            {requirements.map((item) => (
              <MDBox key={item} component="li" color="text" fontSize="1.25rem" lineHeight={1}>
                <MDTypography variant="button" color="text" fontWeight="regular" verticalAlign="middle">
                  {item}
                </MDTypography>
              </MDBox>
            ))}
          </MDBox>
          <MDBox ml="auto">
            <MDButton
              variant="gradient"
              color="dark"
              size="small"
              onClick={handleUpdate}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? t("settings.updating") : t("settings.updatePassword")}
            </MDButton>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default ChangePassword;

/**
 * TulipFleet Dispatcher — Basic Info
 */
import { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useNotifications } from "components/Notifications";
import FormField from "layouts/pages/account/components/FormField";
import { useUserProfile, useUpdateUserProfile } from "hooks/useUserAccount";
import { useT } from "i18n";

function BasicInfo(): JSX.Element {
  const { t } = useT();
  const { notifyToast } = useNotifications();
  const { data: profile, isLoading: loadingProfile } = useUserProfile();
  const saveMutation = useUpdateUserProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
  }, [profile]);

  const handleSave = () => {
    saveMutation.mutate(
      { firstName, lastName, phone },
      {
        onSuccess: () => notifyToast({ type: "form_ok", titleKey: "notifyForm.saved" }),
        onError: () =>
          notifyToast({ type: "form_err", titleKey: "notifyForm.saveFailed", severity: "high" }),
      }
    );
  };

  return (
    <Card id="basic-info" sx={{ overflow: "visible" }}>
      <MDBox p={3}>
        <MDTypography variant="h5" component="h2">
          {t("settings.basicTitle")}
        </MDTypography>
      </MDBox>
      <MDBox component="form" pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              label={t("settings.firstName")}
              placeholder={t("settings.firstName")}
              value={firstName}
              required
              helperText={t("settings.helpRequired")}
              inputProps={{ "aria-required": true }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label={t("settings.lastName")}
              placeholder={t("settings.lastName")}
              value={lastName}
              required
              helperText={t("settings.helpRequired")}
              inputProps={{ "aria-required": true }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label={t("settings.email")}
              placeholder="example@email.com"
              helperText={t("settings.helpEmail")}
              inputProps={{ type: "email" }}
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label={t("settings.phone")}
              placeholder="+31 6 00 000 000"
              helperText={t("settings.helpPhone")}
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <MDBox display="flex" alignItems="center" gap={2}>
              <MDButton
                variant="gradient"
                color="info"
                size="small"
                onClick={handleSave}
                disabled={saveMutation.isPending || loadingProfile}
              >
                {saveMutation.isPending ? t("settings.saving") : t("settings.save")}
              </MDButton>
              {saveMutation.isError && (
                <MDTypography variant="caption" color="error" fontWeight="bold">
                  {t("settings.saveFailed")}
                </MDTypography>
              )}
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
    </Card>
  );
}

export default BasicInfo;

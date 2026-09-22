/**
 * TulipFleet Dispatcher — Email & Notification Integration
 */
import { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useNotifications } from "components/Notifications";
import FormField from "layouts/pages/account/components/FormField";
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from "hooks/useNotificationPreferences";
import { useT } from "i18n";

type MailClient = "native" | "web";

interface AlertPrefs {
  zeZone: boolean;
  dispatchDelay: boolean;
  deviceOffline: boolean;
}

function EmailIntegration(): JSX.Element {
  const { t } = useT();
  const { notifyToast } = useNotifications();
  const { data: savedPrefs, isLoading: loadingPrefs } = useNotificationPreferences();
  const saveMutation = useSaveNotificationPreferences();

  const [email, setEmail] = useState("dispatcher@tulipfleet.nl");
  const [mailClient, setMailClient] = useState<MailClient>("native");
  const [alerts, setAlerts] = useState<AlertPrefs>({
    zeZone: true,
    dispatchDelay: false,
    deviceOffline: true,
  });

  useEffect(() => {
    if (!savedPrefs) return;
    setEmail(savedPrefs.notification_email);
    setMailClient(savedPrefs.mail_client);
    setAlerts({
      zeZone: savedPrefs.alert_ze_zone,
      dispatchDelay: savedPrefs.alert_dispatch_delay,
      deviceOffline: savedPrefs.alert_device_offline,
    });
  }, [savedPrefs]);

  const toggleAlert = (key: keyof AlertPrefs) => () =>
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    saveMutation.mutate(
      {
        notification_email: email,
        mail_client: mailClient,
        alert_ze_zone: alerts.zeZone,
        alert_dispatch_delay: alerts.dispatchDelay,
        alert_device_offline: alerts.deviceOffline,
      },
      {
        onSuccess: () => notifyToast({ type: "form_ok", titleKey: "notifyForm.saved" }),
        onError: () =>
          notifyToast({ type: "form_err", titleKey: "notifyForm.saveFailed", severity: "high" }),
      }
    );
  };

  return (
    <Card id="email-integration">
      <MDBox p={3} lineHeight={1}>
        <MDBox mb={1}>
          <MDTypography variant="h5" component="h2">
            {t("settings.emailTitle")}
          </MDTypography>
        </MDBox>
        <MDTypography variant="button" color="text">
          {t("settings.emailIntro")}
        </MDTypography>
      </MDBox>

      <MDBox pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <MDTypography variant="caption" color="text" fontWeight="regular" display="block" mb={1}>
              {t("settings.emailQuestion")}
            </MDTypography>
            <FormField
              label={t("settings.corporateEmail")}
              placeholder="dispatcher@tulipfleet.nl"
              value={email}
              required
              helperText={t("settings.helpCorporateEmail")}
              inputProps={{ type: "email", "aria-required": true }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <MDTypography variant="caption" color="text" fontWeight="regular" display="block" mb={1}>
              {t("settings.clientQuestion")}
            </MDTypography>
            <RadioGroup
              value={mailClient}
              onChange={(e) => setMailClient(e.target.value as MailClient)}
            >
              <FormControlLabel
                value="native"
                sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
                control={<Radio sx={{ mt: 0.25 }} />}
                label={
                  <MDTypography variant="button" fontWeight="regular" component="span">
                    {t("settings.clientNative")}
                  </MDTypography>
                }
              />
              <FormControlLabel
                value="web"
                sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
                control={<Radio sx={{ mt: 0.25 }} />}
                label={
                  <MDTypography variant="button" fontWeight="regular" component="span">
                    {t("settings.clientWeb")}
                  </MDTypography>
                }
              />
            </RadioGroup>
          </Grid>

          <Grid item xs={12}>
            <MDTypography variant="caption" color="text" fontWeight="regular" display="block" mb={1}>
              {t("settings.alertsQuestion")}
            </MDTypography>
            <MDBox display="flex" flexDirection="column">
              <FormControlLabel
                control={<Checkbox checked={alerts.zeZone} onChange={toggleAlert("zeZone")} />}
                label={t("settings.alertZe")}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={alerts.dispatchDelay}
                    onChange={toggleAlert("dispatchDelay")}
                  />
                }
                label={t("settings.alertDelay")}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={alerts.deviceOffline}
                    onChange={toggleAlert("deviceOffline")}
                  />
                }
                label={t("settings.alertOffline")}
              />
            </MDBox>
          </Grid>

          <Grid item xs={12}>
            <MDBox display="flex" alignItems="center" gap={2}>
              <MDButton
                variant="gradient"
                color="info"
                onClick={handleSave}
                disabled={saveMutation.isPending || loadingPrefs}
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

export default EmailIntegration;

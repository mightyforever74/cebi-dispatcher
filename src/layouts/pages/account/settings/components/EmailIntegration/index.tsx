/**
=========================================================
* TulipFleet Dispatcher — Email & Notification Integration
=========================================================
* Replaces /system/settings page's "Notifications" (MD2 demo) block.
* Connected to real API: GET/POST /api/dispatcher/notification-preferences.
=========================================================
*/

import { useState, useEffect } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Settings page components
import FormField from "layouts/pages/account/components/FormField";

// Real API — GET/POST /api/dispatcher/notification-preferences
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from "hooks/useNotificationPreferences";

type MailClient = "native" | "web";

interface AlertPrefs {
  zeZone: boolean;
  dispatchDelay: boolean;
  deviceOffline: boolean;
}

function EmailIntegration(): JSX.Element {
  const { data: savedPrefs, isLoading: loadingPrefs } = useNotificationPreferences();
  const saveMutation = useSaveNotificationPreferences();

  const [email, setEmail] = useState("dispatcher@tulipfleet.nl");
  const [mailClient, setMailClient] = useState<MailClient>("native");
  const [alerts, setAlerts] = useState<AlertPrefs>({
    zeZone: true,
    dispatchDelay: false,
    deviceOffline: true,
  });

  // Fill local edit-buffer once saved preferences arrive from backend.
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
    saveMutation.mutate({
      notification_email: email,
      mail_client: mailClient,
      alert_ze_zone: alerts.zeZone,
      alert_dispatch_delay: alerts.dispatchDelay,
      alert_device_offline: alerts.deviceOffline,
    });
  };

  return (
    <Card id="email-integration">
      <MDBox p={3} lineHeight={1}>
        <MDBox mb={1}>
          <MDTypography variant="h5">Email & Notification Integration</MDTypography>
        </MDBox>
        <MDTypography variant="button" color="text">
          Manage where and how system notifications and dispatch summaries are sent.
        </MDTypography>
      </MDBox>

      <MDBox pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <MDTypography
              variant="caption"
              color="text"
              fontWeight="regular"
              display="block"
              mb={1}
            >
              What is the main corporate email address for system notifications and dispatch
              summaries?
            </MDTypography>
            <FormField
              label="Corporate Email Address"
              placeholder="dispatcher@tulipfleet.nl"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              inputProps={{ type: "email" }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <MDTypography
              variant="caption"
              color="text"
              fontWeight="regular"
              display="block"
              mb={1}
            >
              Which email program would you like to open when clicking the message icon?
            </MDTypography>
            <RadioGroup
              value={mailClient}
              onChange={(e) => setMailClient(e.target.value as MailClient)}
            >
              <FormControlLabel
                value="native"
                control={<Radio />}
                label={
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon fontSize="small">mail</Icon>
                    <MDTypography variant="button" fontWeight="regular">
                      System Default (Outlook, Apple Mail, Windows Mail)
                    </MDTypography>
                  </MDBox>
                }
              />
              <FormControlLabel
                value="web"
                control={<Radio />}
                label={
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon fontSize="small">language</Icon>
                    <MDTypography variant="button" fontWeight="regular">
                      Web-Based (Gmail / Outlook Web)
                    </MDTypography>
                  </MDBox>
                }
              />
            </RadioGroup>
          </Grid>

          <Grid item xs={12}>
            <MDTypography
              variant="caption"
              color="text"
              fontWeight="regular"
              display="block"
              mb={1}
            >
              Select the critical situations where you want the messages icon to actively alert you
              in real time, not just show a count:
            </MDTypography>
            <MDBox display="flex" flexDirection="column">
              <FormControlLabel
                control={<Checkbox checked={alerts.zeZone} onChange={toggleAlert("zeZone")} />}
                label="Prepare an automatic mail draft when a vehicle commits a ZE-Zone (Zero Emission) violation"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={alerts.dispatchDelay}
                    onChange={toggleAlert("dispatchDelay")}
                  />
                }
                label="Alert if the driver does not confirm a newly assigned task within 10 minutes"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={alerts.deviceOffline}
                    onChange={toggleAlert("deviceOffline")}
                  />
                }
                label="Trigger a critical alert when the device (telemetry) connection is lost"
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
                {saveMutation.isPending ? "Saving..." : "Save"}
              </MDButton>
              {saveMutation.isSuccess && (
                <MDTypography variant="caption" color="success" fontWeight="bold">
                  Settings saved
                </MDTypography>
              )}
              {saveMutation.isError && (
                <MDTypography variant="caption" color="error" fontWeight="bold">
                  Could not save — try again
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

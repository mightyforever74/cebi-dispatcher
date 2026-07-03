/**
=========================================================
* TulipFleet Dispatcher — Basic Info
=========================================================
* Gercek API baglantisi: GET/PUT /api/user/profile (api.tulipfleet.com,
* CORS gercek curl testiyle dogrulandi: Allow-Origin *, Allow-Methods
* GET/PUT dahil hepsi acik). Not: sadece Phone degil First/Last/Email de
* ayni GET response'undan geliyor, hepsi gercek veriye baglandi.
=========================================================
*/

import { useState, useEffect } from "react";

// @material-ui core components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Settings page components
import FormField from "layouts/pages/account/components/FormField";

// Real API
import { useUserProfile, useUpdateUserProfile } from "hooks/useUserAccount";

function BasicInfo(): JSX.Element {
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
    saveMutation.mutate({ firstName, lastName, phone });
  };

  return (
    <Card id="basic-info" sx={{ overflow: "visible" }}>
      <MDBox p={3}>
        <MDTypography variant="h5">Basic Info</MDTypography>
      </MDBox>
      <MDBox component="form" pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              label="First Name"
              placeholder="First name"
              value={firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Last Name"
              placeholder="Last name"
              value={lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Email"
              placeholder="example@email.com"
              inputProps={{ type: "email" }}
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Phone Number"
              placeholder="+31 6 00 000 000"
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
                {saveMutation.isPending ? "Saving..." : "Save"}
              </MDButton>
              {saveMutation.isSuccess && (
                <MDTypography variant="caption" color="success" fontWeight="bold">
                  Saved
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

export default BasicInfo;

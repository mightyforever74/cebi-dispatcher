/**
=========================================================
* TulipFleet Dispatcher — Basic Info
=========================================================
* Demo temizligi (Sira 6): gender/birth-date, confirmation email,
* your location, language+skills kaldirildi (TulipFleet modelinde
* karsiligi yok). Phone Number: gercek users.phone'a baglama
* ayri bir is (CORS + response sekli dogrulanmadan yapilmadi).
=========================================================
*/

// @material-ui core components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Settings page components
import FormField from "layouts/pages/account/components/FormField";

function BasicInfo(): JSX.Element {
  return (
    <Card id="basic-info" sx={{ overflow: "visible" }}>
      <MDBox p={3}>
        <MDTypography variant="h5">Basic Info</MDTypography>
      </MDBox>
      <MDBox component="form" pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField label="First Name" placeholder="First name" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField label="Last Name" placeholder="Last name" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Email"
              placeholder="example@email.com"
              inputProps={{ type: "email" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Phone Number"
              placeholder="+31 6 00 000 000"
              inputProps={{ type: "number" }}
            />
          </Grid>
        </Grid>
      </MDBox>
    </Card>
  );
}

export default BasicInfo;

/**
=========================================================
* TulipFleet Dispatcher — Two-factor authentication (placeholder)
=========================================================
* 2FA henüz canlı değil. Kart durur; "Yakında" rozeti roadmap mavi (info).
=========================================================
*/

import Card from "@mui/material/Card";

import MDBadge from "components/MDBadge";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

function Authentication(): JSX.Element {
  return (
    <Card id="2fa" sx={{ overflow: "visible" }}>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" p={3}>
        <MDTypography variant="h5">İki adımlı doğrulama — Yakında</MDTypography>
        <MDBadge variant="contained" color="info" badgeContent="Yakında" container />
      </MDBox>
      <MDBox p={3}>
        <MDTypography variant="body2" color="text" mb={2}>
          Hesap koruması için iki adımlı doğrulama bu ekrandan açılacak. Şu an yapılandırma kapalı.
        </MDTypography>
        <MDBox display="flex" justifyContent="flex-end">
          <MDButton variant="outlined" color="dark" size="small" disabled>
            Yapılandır
          </MDButton>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default Authentication;

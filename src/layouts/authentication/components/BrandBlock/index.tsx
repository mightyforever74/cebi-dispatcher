/**
=========================================================
* TulipFleet Dispatcher — Auth BrandBlock
=========================================================
* D2 "Kabuk" (docs/UI_D2_REPORT.md, Adım 4): login/forgot-password kart
* başlığı. Logo `public/tulipfleet-logo.png` + display-font wordmark +
* sözlükten tagline. MD2 "info" gradient başlığı yok.
*/

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useT } from "i18n";

function BrandBlock(): JSX.Element {
  const { t } = useT();

  return (
    <MDBox textAlign="center" pt={3} pb={0.5} px={3}>
      <img
        src={`${process.env.PUBLIC_URL || ""}/tulipfleet-logo.png`}
        alt=""
        width={178}
        height={240}
        decoding="async"
        style={{ height: 48, width: "auto", marginBottom: 12, display: "inline-block" }}
      />
      <MDTypography
        variant="h4"
        component="h1"
        fontWeight="medium"
        sx={(theme: { typography: { h1: { fontFamily: string } } }) => ({
          fontFamily: theme.typography.h1.fontFamily,
        })}
      >
        {t("login.brand")}
      </MDTypography>
      <MDTypography variant="button" color="text" display="block" mt={0.5}>
        {t("login.tagline")}
      </MDTypography>
    </MDBox>
  );
}

export default BrandBlock;

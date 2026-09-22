/**
=========================================================
* TulipFleet Dispatcher — Dashboard Footer
=========================================================
* D2 "Kabuk" (docs/UI_D2_REPORT.md, Adım 3): tek satır, navyInk/navyFog;
* sol "© {year} TulipFleet B.V.", sağ Gizlilik/Şartlar + uygulama sürümü.
* Creative Tim/MD2 metinleri ve linkleri (Site/Abonelik/İletişim) kaldırıldı.
*/

import Link from "@mui/material/Link";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import typography from "assets/theme/base/typography";
import { landing } from "assets/theme/tokens";
import { useT } from "i18n";
// package.json version — tek kaynak (build-time; `resolveJsonModule`).
// eslint-disable-next-line import/extensions
import packageJson from "../../../package.json";

const appVersion = packageJson.version;

function Footer(): JSX.Element {
  const { t, lang } = useT();
  const { size } = typography;
  const year = new Date().getFullYear();

  return (
    <MDBox
      width="100%"
      display="flex"
      flexDirection={{ xs: "column", lg: "row" }}
      justifyContent="space-between"
      alignItems="center"
      gap={1}
      px={2.5}
      py={1.25}
      mt={2}
      borderRadius="lg"
      sx={{ backgroundColor: landing.navyInk }}
    >
      <MDTypography variant="button" fontWeight="medium" sx={{ color: landing.offwhite }}>
        © {year} TulipFleet B.V.
      </MDTypography>
      <MDBox
        component="ul"
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap={2.5}
        m={0}
        p={0}
        sx={{ listStyle: "none", fontSize: size.sm }}
      >
        <MDBox component="li" lineHeight={1}>
          <Link href={`https://tulipfleet.com/${lang}/privacy/`} target="_blank" rel="noreferrer">
            <MDTypography variant="button" fontWeight="regular" sx={{ color: landing.navyFog }}>
              {t("footer.privacy")}
            </MDTypography>
          </Link>
        </MDBox>
        <MDBox component="li" lineHeight={1}>
          <Link href={`https://tulipfleet.com/${lang}/terms/`} target="_blank" rel="noreferrer">
            <MDTypography variant="button" fontWeight="regular" sx={{ color: landing.navyFog }}>
              {t("footer.terms")}
            </MDTypography>
          </Link>
        </MDBox>
        <MDBox component="li" lineHeight={1}>
          <MDTypography variant="caption" fontWeight="regular" sx={{ color: landing.navyFog }}>
            v{appVersion}
          </MDTypography>
        </MDBox>
      </MDBox>
    </MDBox>
  );
}

Footer.defaultProps = {};

export default Footer;

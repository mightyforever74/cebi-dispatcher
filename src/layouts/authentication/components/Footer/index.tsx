/**
=========================================================
* TulipFleet Dispatcher — Auth Footer
=========================================================
*/

import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import { Theme } from "@mui/material/styles";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import typography from "assets/theme/base/typography";

function Footer({ light }: { light?: boolean }): JSX.Element {
  const { size } = typography;
  const linkColor = light ? "white" : "dark";

  return (
    <MDBox position="absolute" width="100%" bottom={0} py={4}>
      <Container>
        <MDBox
          width="100%"
          display="flex"
          flexDirection={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems="center"
          px={1.5}
        >
          <MDBox
            display="flex"
            justifyContent="center"
            alignItems="center"
            flexWrap="wrap"
            color={light ? "white" : "text"}
            fontSize={size.sm}
          >
            <Link href="https://tulipfleet.com" target="_blank" rel="noreferrer">
              <MDTypography variant="button" fontWeight="medium" color={linkColor}>
                © 2026 TulipFleet
              </MDTypography>
            </Link>
          </MDBox>
          <MDBox
            component="ul"
            sx={({ breakpoints }: Theme) => ({
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              listStyle: "none",
              mt: 3,
              mb: 0,
              p: 0,

              [breakpoints.up("lg")]: {
                mt: 0,
              },
            })}
          >
            <MDBox component="li" pr={2} lineHeight={1}>
              <Link href="https://tulipfleet.com" target="_blank" rel="noreferrer">
                <MDTypography variant="button" fontWeight="regular" color={linkColor}>
                  Site
                </MDTypography>
              </Link>
            </MDBox>
            <MDBox component="li" px={2} lineHeight={1}>
              <Link href="/subscription">
                <MDTypography variant="button" fontWeight="regular" color={linkColor}>
                  Subscription
                </MDTypography>
              </Link>
            </MDBox>
            <MDBox component="li" pl={2} lineHeight={1}>
              <Link href="mailto:info@tulipfleet.com">
                <MDTypography variant="button" fontWeight="regular" color={linkColor}>
                  Contact
                </MDTypography>
              </Link>
            </MDBox>
          </MDBox>
        </MDBox>
      </Container>
    </MDBox>
  );
}

Footer.defaultProps = {
  light: false,
};

export default Footer;

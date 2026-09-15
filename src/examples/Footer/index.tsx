/**
=========================================================
* TulipFleet Dispatcher — Dashboard Footer
=========================================================
*/

import Link from "@mui/material/Link";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useT } from "i18n";
import typography from "assets/theme/base/typography";

interface Props {
  company?: {
    href: string;
    name: string;
  };
  links?: {
    href: string;
    name: string;
  }[];
  [key: string]: unknown;
}

function Footer({ company, links }: Props): JSX.Element {
  const { t } = useT();
  const { href, name } = company;
  const { size } = typography;
  const resolvedLinks =
    links ??
    [
      { href: "https://tulipfleet.com", name: t("footer.site") },
      { href: "/subscription", name: t("footer.subscription") },
      { href: "mailto:info@tulipfleet.com", name: t("footer.contact") },
    ];

  const renderLinks = () =>
    resolvedLinks.map((link) => (
      <MDBox key={link.name} component="li" px={2} lineHeight={1}>
        <Link
          href={link.href}
          target={link.href.startsWith("http") ? "_blank" : undefined}
          rel={link.href.startsWith("http") ? "noreferrer" : undefined}
        >
          <MDTypography variant="button" fontWeight="regular" color="text">
            {link.name}
          </MDTypography>
        </Link>
      </MDBox>
    ));

  return (
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
        color="text"
        fontSize={size.sm}
        px={1.5}
      >
        <Link href={href} target="_blank" rel="noreferrer">
          <MDTypography variant="button" fontWeight="medium">
            © 2026 {name}
          </MDTypography>
        </Link>
      </MDBox>
      <MDBox
        component="ul"
        sx={({ breakpoints }) => ({
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
        {renderLinks()}
      </MDBox>
    </MDBox>
  );
}

Footer.defaultProps = {
  company: { href: "https://tulipfleet.com", name: "TulipFleet" },
};

export default Footer;

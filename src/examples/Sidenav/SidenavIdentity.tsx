import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import { landing } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useIdentityDisplay } from "hooks/useIdentityDisplay";

interface Props {
  miniSidenav: boolean;
  whiteSidenav: boolean;
  transparentSidenav: boolean;
}

function SidenavIdentity({ miniSidenav, whiteSidenav, transparentSidenav }: Props): JSX.Element {
  const id = useIdentityDisplay();
  const onNavy = !whiteSidenav && !transparentSidenav;
  const primaryColor = onNavy ? landing.offwhite : landing.navyFog700;
  const mutedColor = onNavy ? landing.navyFog : landing.navyFog700;

  if (miniSidenav) {
    return (
      <MDBox display="flex" justifyContent="center" px={1} pt={0.5} pb={0.5}>
        <Tooltip title={id.tooltip} placement="right">
          <MDBox
            display="flex"
            alignItems="center"
            justifyContent="center"
            role="img"
            aria-label={id.aria}
            sx={{ color: primaryColor, lineHeight: 0 }}
          >
            <Icon aria-hidden fontSize="small">
              account_circle
            </Icon>
          </MDBox>
        </Tooltip>
      </MDBox>
    );
  }

  return (
    <MDBox
      mt={1}
      minWidth={0}
      textAlign="left"
      role="group"
      aria-label={id.aria}
    >
      <MDTypography
        variant="button"
        fontWeight="medium"
        noWrap
        title={id.primary}
        sx={{
          display: "block",
          color: primaryColor,
          lineHeight: 1.25,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {id.primary}
      </MDTypography>
      {id.emailLine ? (
        <MDTypography
          variant="caption"
          noWrap
          title={id.emailLine}
          sx={{
            display: "block",
            color: mutedColor,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {id.emailLine}
        </MDTypography>
      ) : null}
      <MDTypography
        variant="caption"
        noWrap
        title={id.meta}
        sx={{
          display: "block",
          color: mutedColor,
          lineHeight: 1.25,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {id.meta}
      </MDTypography>
    </MDBox>
  );
}

export default SidenavIdentity;

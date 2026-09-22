/**
=========================================================
* Material Dashboard 2 PRO React TS - v1.0.2
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-2-pro-react-ts
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

// @mui material components
import Collapse from "@mui/material/Collapse";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Icon from "@mui/material/Icon";
import Link from "@mui/material/Link";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";

// Custom styles for the SidenavCollapse
import {
  collapseItem,
  collapseIconBox,
  collapseIcon,
  collapseText,
  collapseArrow,
} from "examples/Sidenav/styles/sidenavCollapse";

// Material Dashboard 2 PRO React context
import { useMaterialUIController } from "context";

// Declaring props types for SidenavCollapse
interface Props {
  icon: ReactNode;
  name: string;
  children?: ReactNode;
  active?: Boolean;
  noCollapse?: Boolean;
  open?: Boolean;
  to?: string;
  href?: string;
  [key: string]: any;
}

function SidenavCollapse({
  icon,
  name,
  children,
  active,
  noCollapse,
  open,
  to,
  href,
  ...rest
}: Props): JSX.Element {
  const [controller] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode } = controller;

  const itemInner = (
    <MDBox
      {...rest}
      sx={(theme: any) =>
        collapseItem(theme, { active, transparentSidenav, whiteSidenav, darkMode })
      }
    >
      <ListItemIcon
        sx={(theme) =>
          collapseIconBox(theme, { active, transparentSidenav, whiteSidenav, darkMode })
        }
      >
        {typeof icon === "string" ? (
          <Icon sx={(theme) => collapseIcon(theme, { active })}>{icon}</Icon>
        ) : (
          icon
        )}
      </ListItemIcon>

      <ListItemText
        primary={name}
        title={name}
        sx={(theme) =>
          collapseText(theme, {
            miniSidenav,
            transparentSidenav,
            whiteSidenav,
            active,
            darkMode,
          })
        }
      />

      <Icon
        sx={(theme) =>
          collapseArrow(theme, {
            noCollapse,
            transparentSidenav,
            whiteSidenav,
            miniSidenav,
            open,
            active,
            darkMode,
          })
        }
      >
        expand_less
      </Icon>
    </MDBox>
  );

  let itemBody: ReactNode = itemInner;
  if (href) {
    itemBody = (
      <Link href={href} target="_blank" rel="noreferrer" underline="none" sx={{ display: "block" }}>
        {itemInner}
      </Link>
    );
  } else if (to) {
    itemBody = (
      <NavLink
        to={to}
        style={{ textDecoration: "none", display: "block" }}
        aria-current={active ? "page" : undefined}
      >
        {itemInner}
      </NavLink>
    );
  }

  return (
    <ListItem component="li" disablePadding sx={{ display: "block" }}>
      {itemBody}
      {children ? (
        <Collapse in={Boolean(open)} unmountOnExit>
          {children}
        </Collapse>
      ) : null}
    </ListItem>
  );
}

// Declaring default props for SidenavCollapse
SidenavCollapse.defaultProps = {
  active: false,
  noCollapse: false,
  children: false,
  open: false,
};

export default SidenavCollapse;

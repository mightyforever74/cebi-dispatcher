/**
=========================================================
* TulipFleet Dispatcher — Auth BasicLayout
=========================================================
* D2 "Kabuk" (docs/UI_D2_REPORT.md, Adim 4): "Material Dashboard PRO"
* fotograf-arkaplani ve DefaultNavbar kromu yerine landing hero dili —
* navyInk gradient + glow token'i (D1 tokens.ts `landing`). Sahte pencere yok.
* Form yuzeyi (Card) opak kalir; dil secici sayfada ayri olarak durur.
*/

import { ReactNode } from "react";

import Grid from "@mui/material/Grid";

import MDBox from "components/MDBox";
import PageLayout from "examples/LayoutContainers/PageLayout";
import Footer from "layouts/authentication/components/Footer";
import { landing } from "assets/theme/tokens";

interface Props {
  children: ReactNode;
}

function BasicLayout({ children }: Props): JSX.Element {
  return (
    <PageLayout>
      <MDBox
        position="fixed"
        top={0}
        right={0}
        bottom={0}
        left={0}
        sx={{
          backgroundColor: landing.navyInk,
          backgroundImage: `radial-gradient(circle at 12% 18%, ${landing.navyElevated} 0%, transparent 42%), linear-gradient(160deg, ${landing.navy} 0%, ${landing.navyDeep} 45%, ${landing.navyInk} 100%)`,
        }}
      />
      <MDBox px={1} width="100%" height="100vh" mx="auto" position="relative" zIndex={1}>
        <Grid container spacing={1} justifyContent="center" alignItems="center" height="100%">
          <Grid item xs={11} sm={9} md={5} lg={4} xl={3}>
            {children}
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </PageLayout>
  );
}

export default BasicLayout;

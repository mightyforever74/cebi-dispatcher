/**
=========================================================
* TulipFleet Dispatcher — Settings BaseLayout
=========================================================
* D2 "Kabuk" (docs/UI_D2_REPORT.md, Adim 5): MD2 template sekmeleri
* (Messages / Social / Notifications / Backup) kaldirildi — hicbirinin
* icerigi yoktu (`tabValue` children'i filtrelemiyordu). Bu dosya yalniz
* `layouts/pages/account/settings` tarafindan kullaniliyor.
*/

import { ReactNode } from "react";

import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

interface Props {
  stickyNavbar?: boolean;
  children: ReactNode;
}

function BaseLayout({ stickyNavbar, children }: Props): JSX.Element {
  return (
    <DashboardLayout>
      <DashboardNavbar absolute={!stickyNavbar} />
      <MDBox mt={stickyNavbar ? 3 : 10}>{children}</MDBox>
      <Footer />
    </DashboardLayout>
  );
}

BaseLayout.defaultProps = {
  stickyNavbar: true,
};

export default BaseLayout;

/**
 * FEAT-SaaS S4 — Sayfa 3: Supervizör Komuta Merkezi (/admin/supervisor).
 * Kaynak desen: ecommerce/orders/order-list (DataTable + filtre menusu).
 * D-S2: SupervisorGate gecilmeden fetch YOK. Veri: superadmin/companies
 * (zengin liste) + subscriptions/requests (bekleyen sayaci) birlesimi.
 * "export csv" bu fazda cikarildi (islevsiz sus yasak); filtre menusu GERCEK
 * filtre: Tumu / Yalniz bekleyen talebi olanlar.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDBadge from "components/MDBadge";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import SupervisorGate from "layouts/supervisor/SupervisorGate";
import { SUPERVISOR_API_URL } from "layouts/supervisor/supervisorSession";

interface CompanyRow {
  id: string;
  name: string;
  country: string | null;
  tax_id: string | null;
  vehicle_count: number;
  max_vehicles: number;
  subscription_tier: string | null;
  subscription_status: string | null;
}

interface PendingReq {
  id: string;
  company_id: string;
  request_type: string;
}

function SupervisorContent({ saToken }: { saToken: string }): JSX.Element {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [pending, setPending] = useState<PendingReq[]>([]);
  const [pendingOnly, setPendingOnly] = useState<boolean>(false);
  const [menu, setMenu] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${saToken}` };

  useEffect(() => {
    fetch(`${SUPERVISOR_API_URL}/api/superadmin/companies`, { headers })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        // yanit zarfina toleransli adaptor (dizi / {companies} / {rows})
        const arr = Array.isArray(data) ? data : data.companies || data.rows || [];
        setCompanies(arr);
      })
      .catch(() => setError("Firma listesi alinamadi."));
    fetch(`${SUPERVISOR_API_URL}/api/superadmin/subscriptions/requests?status=PENDING_APPROVAL`, {
      headers,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setPending(data.requests || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saToken]);

  const pendingByCompany = useMemo(() => {
    const m = new Map<string, number>();
    pending.forEach((p) => m.set(p.company_id, (m.get(p.company_id) || 0) + 1));
    return m;
  }, [pending]);

  const table = useMemo(() => {
    const rows = companies
      .filter((c) => !pendingOnly || pendingByCompany.has(c.id))
      .map((c) => ({
        firma: c.name,
        ulke_vergi: `${c.country || "—"} · ${c.tax_id || "—"}`,
        arac: `${c.vehicle_count} / ${c.max_vehicles}`,
        abonelik: `${c.subscription_tier || "—"} · ${c.subscription_status || "—"}`,
        bekleyen: pendingByCompany.has(c.id) ? (
          <MDBadge
            badgeContent={`${pendingByCompany.get(c.id)} talep`}
            color="warning"
            size="sm"
            container
          />
        ) : (
          <MDTypography variant="caption" color="text">
            —
          </MDTypography>
        ),
        aksiyon: (
          <MDButton
            variant="outlined"
            color="info"
            size="small"
            onClick={() => navigate(`/admin/supervisor/customer-detail?companyId=${c.id}`)}
          >
            İncele
          </MDButton>
        ),
      }));
    return {
      columns: [
        { Header: "Firma", accessor: "firma", width: "22%" },
        { Header: "Ülke · Vergi No", accessor: "ulke_vergi" },
        { Header: "Araç (Aktif/Kota)", accessor: "arac" },
        { Header: "Abonelik", accessor: "abonelik" },
        { Header: "Bekleyen Talep", accessor: "bekleyen" },
        { Header: "Aksiyon", accessor: "aksiyon" },
      ],
      rows,
    };
  }, [companies, pendingOnly, pendingByCompany, navigate]);

  return (
    <MDBox my={3}>
      <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <MDBox>
          <MDTypography variant="h4" fontWeight="bold">
            🛡️ Supervizör Komuta Merkezi
          </MDTypography>
          <MDTypography variant="button" color="text">
            {companies.length} firma · {pending.length} bekleyen talep
          </MDTypography>
        </MDBox>
        <MDBox display="flex">
          <MDButton
            variant={menu ? "contained" : "outlined"}
            color="dark"
            onClick={(e: any) => setMenu(e.currentTarget)}
          >
            filtre&nbsp;<Icon>keyboard_arrow_down</Icon>
          </MDButton>
          <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} keepMounted>
            <MenuItem
              onClick={() => {
                setPendingOnly(false);
                setMenu(null);
              }}
            >
              Tüm firmalar
            </MenuItem>
            <MenuItem
              onClick={() => {
                setPendingOnly(true);
                setMenu(null);
              }}
            >
              Yalnız bekleyen talebi olanlar
            </MenuItem>
          </Menu>
        </MDBox>
      </MDBox>
      {error && (
        <MDTypography variant="button" color="error" display="block" mb={2}>
          {error}
        </MDTypography>
      )}
      <Card>
        <DataTable table={table} entriesPerPage={false} canSearch />
      </Card>
    </MDBox>
  );
}

function SupervisorPage(): JSX.Element {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SupervisorGate>{(saToken) => <SupervisorContent saToken={saToken} />}</SupervisorGate>
      <Footer />
    </DashboardLayout>
  );
}

export default SupervisorPage;

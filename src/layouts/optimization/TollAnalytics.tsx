/**
 * TollAnalytics — FEAT-008 FN-08 page, replacing the previous
 * TollAnalyticsPlaceholder (2026-10-11, Cem: "Rozeti kaldır, gerçekten
 * 'canlı' diye işaretle şimdi" — same honesty call already made on the
 * landing page's Connect section). The placeholder's old copy claimed this
 * would "activate when the HERE API goes live in July 2026" — no longer
 * true: FN-02/FN-07/FN-09 already compute real toll cost without HERE.
 *
 * Owns the date-range + groupBy controls; the actual report rendering is
 * CostBreakdownWidget (FN-08), which talks to the live
 * GET /api/dispatcher/reports/hgv-toll endpoint (FN-09) via useHgvTollReport.
 */
import { useMemo, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import CostBreakdownWidget from "components/CostBreakdownWidget";
import { HgvTollGroupBy } from "hooks/useHgvTollReport";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { useT } from "i18n";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: isoDate(from), to: isoDate(now) };
}

function TollAnalytics(): JSX.Element {
  const { t } = useT();
  const defaultRange = useMemo(currentMonthRange, []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [groupBy, setGroupBy] = useState<HgvTollGroupBy>("vehicle");

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card sx={{ mb: 3 }}>
          <MDBox p={3}>
            <MDTypography variant="h5" fontWeight="medium">
              {t("tollAnalytics.title")}
            </MDTypography>
            <MDBox mt={1} mb={2}>
              <MDTypography variant="body2" color="text">
                {t("tollAnalytics.body")}
              </MDTypography>
            </MDBox>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <MDInput
                  type="date"
                  label={t("tollAnalytics.controls.from")}
                  fullWidth
                  value={from}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <MDInput
                  type="date"
                  label={t("tollAnalytics.controls.to")}
                  fullWidth
                  value={to}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <MDTypography variant="caption" color="text" display="block" mb={0.5}>
                  {t("tollAnalytics.controls.groupBy")}
                </MDTypography>
                <Select
                  fullWidth
                  size="small"
                  value={groupBy}
                  onChange={(e: SelectChangeEvent) => setGroupBy(e.target.value as HgvTollGroupBy)}
                >
                  <MenuItem value="vehicle">{t("tollAnalytics.controls.groupByVehicle")}</MenuItem>
                  <MenuItem value="driver">{t("tollAnalytics.controls.groupByDriver")}</MenuItem>
                  <MenuItem value="day">{t("tollAnalytics.controls.groupByDay")}</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </MDBox>
        </Card>

        <CostBreakdownWidget from={from} to={to} groupBy={groupBy} />
      </MDBox>
    </DashboardLayout>
  );
}

export default TollAnalytics;

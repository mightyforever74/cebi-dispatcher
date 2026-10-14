/**
 * CostBreakdownWidget — FEAT-008 FN-08, "Reality Update" adapted (Cem,
 * 2026-10-11): reads the live GET /api/dispatcher/reports/hgv-toll report
 * (FN-09) via useHgvTollReport, instead of the never-built
 * enterprise.routing_jobs.cost_breakdown JSONB column the original spec
 * assumed. Per-row bars use the existing MDProgress component — no new
 * chart library dependency (ADR-0001 §3.6's "React ChartJS 2" plan was never
 * actually installed in this repo; a plain list + proportional bar is
 * enough for this first increment and needed nothing new).
 */
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDProgress from "components/MDProgress";
import { useT } from "i18n";
import { useHgvTollReport, HgvTollGroupBy } from "hooks/useHgvTollReport";

export interface CostBreakdownWidgetProps {
  from: string;
  to: string;
  groupBy?: HgvTollGroupBy;
}

function formatEur(value: number): string {
  return `€${value.toFixed(2)}`;
}

function CostBreakdownWidget({ from, to, groupBy = "vehicle" }: CostBreakdownWidgetProps): JSX.Element {
  const { t } = useT();
  const { data, isLoading, error } = useHgvTollReport(from, to, groupBy);

  if (isLoading) {
    return (
      <Card>
        <MDBox p={3} display="flex" alignItems="center" gap={1.5}>
          <CircularProgress size={20} />
          <MDTypography variant="button" color="text">
            {t("tollAnalytics.widget.loading")}
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <MDBox p={3}>
          <MDTypography variant="button" color="error">
            {t("tollAnalytics.widget.error")}
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  if (!data || data.breakdown.length === 0) {
    return (
      <Card>
        <MDBox p={3}>
          <MDTypography variant="button" color="text">
            {t("tollAnalytics.widget.empty")}
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  const maxTollEur = Math.max(...data.breakdown.map((row) => row.total_toll_eur), 0);
  const totalUnmatched = data.breakdown.reduce((sum, row) => sum + row.unmatched_count, 0);

  return (
    <Card>
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
          <MDBox>
            <MDTypography variant="caption" color="text">
              {t("tollAnalytics.widget.totalToll")}
            </MDTypography>
            {/* D7-3 (4) (15 Eki 2026): axe heading-order — bu üçü KPI değeri,
                semantik başlık değil (caption etiketlerin altındaki rakamlar). */}
            <MDTypography variant="h5" component="p" fontWeight="bold">
              {formatEur(data.total_toll_eur)}
            </MDTypography>
          </MDBox>
          <MDBox>
            <MDTypography variant="caption" color="text">
              {t("tollAnalytics.widget.totalKm")}
            </MDTypography>
            <MDTypography variant="h5" component="p" fontWeight="bold">
              {data.total_km.toFixed(1)} km
            </MDTypography>
          </MDBox>
          <MDBox>
            <MDTypography variant="caption" color="text">
              {t("tollAnalytics.widget.avgPerKm")}
            </MDTypography>
            <MDTypography variant="h5" component="p" fontWeight="bold">
              {data.avg_eur_per_km === null ? "—" : `€${data.avg_eur_per_km.toFixed(4)}`}
            </MDTypography>
          </MDBox>
        </MDBox>

        <MDBox display="flex" flexDirection="column" gap={1.5}>
          {data.breakdown.map((row) => (
            <MDBox key={row.key}>
              <MDBox display="flex" justifyContent="space-between" mb={0.5}>
                <MDTypography variant="button" fontWeight="medium">
                  {row.label}
                </MDTypography>
                <MDTypography variant="button" color="text">
                  {formatEur(row.total_toll_eur)} · {row.total_km.toFixed(1)} km
                </MDTypography>
              </MDBox>
              <MDProgress
                value={maxTollEur > 0 ? (row.total_toll_eur / maxTollEur) * 100 : 0}
                color={row.unmatched_count > 0 ? "warning" : "info"}
              />
            </MDBox>
          ))}
        </MDBox>

        {totalUnmatched > 0 && (
          <MDBox mt={2}>
            <MDTypography variant="caption" color="warning" fontWeight="medium">
              {t("tollAnalytics.widget.unmatchedNote", { count: totalUnmatched })}
            </MDTypography>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

export default CostBreakdownWidget;

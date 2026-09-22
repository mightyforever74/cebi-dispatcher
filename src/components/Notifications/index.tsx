import Icon from "@mui/material/Icon";
import { status } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDSnackbar from "components/MDSnackbar";
import MDTypography from "components/MDTypography";
import { useT } from "i18n";
import { useMemo } from "react";
import { useNotifications, type NotifyItem } from "./useNotifications";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Banner({ item }: { item: NotifyItem }) {
  const { t } = useT();
  const { dismissBanner, acknowledge } = useNotifications();
  const tone =
    item.severity === "critical" || item.type === "driver_offline" || item.type === "sos"
      ? status.alert.critical
      : status.alert.high;

  return (
    <MDBox
      role="alert"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      px={2}
      py={1.25}
      mb={1}
      borderRadius="md"
      sx={{
        bgcolor: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
      }}
    >
      <MDBox>
        <MDTypography variant="button" fontWeight="bold" sx={{ color: tone.fg }}>
          {item.title}
        </MDTypography>
        <MDTypography variant="caption" display="block" sx={{ color: tone.fg }}>
          {item.body}
        </MDTypography>
      </MDBox>
      <MDBox display="flex" gap={1} flexShrink={0}>
        {item.canAck && (
          <MDButton
            size="small"
            variant="outlined"
            color="info"
            onClick={() => {
              void acknowledge(item);
            }}
          >
            {t("notify.acknowledge")}
          </MDButton>
        )}
        <MDButton size="small" variant="text" color="dark" onClick={() => dismissBanner(item.id)}>
          {t("notify.dismiss")}
        </MDButton>
      </MDBox>
    </MDBox>
  );
}

function colorFor(item: NotifyItem): "error" | "warning" | "info" {
  if (item.severity === "critical" || item.severity === "high") return "error";
  if (item.severity === "medium") return "warning";
  return "info";
}

function NotificationHost(): JSX.Element {
  const { t } = useT();
  const { banners, toasts, dismissToast } = useNotifications();
  const reduced = useMemo(() => prefersReducedMotion(), []);

  return (
    <>
      {banners.length > 0 && (
        <MDBox px={3} pt={2}>
          {banners.map((item) => (
            <Banner key={item.id} item={item} />
          ))}
        </MDBox>
      )}
      {toasts.map((item, index) => (
        <MDSnackbar
          key={item.id}
          open
          color={colorFor(item)}
          icon={<Icon>notifications</Icon>}
          title={
            item.count > 1
              ? `${item.title} ${t("notify.toastCount", { count: item.count })}`
              : item.title
          }
          dateTime=""
          content={item.body}
          close={() => dismissToast(item.id)}
          bgWhite
          transitionDuration={reduced ? 0 : undefined}
          autoHideDuration={8000}
          onClose={() => dismissToast(item.id)}
          sx={{ bottom: { xs: 16 + index * 96, sm: 24 + index * 104 } }}
        />
      ))}
    </>
  );
}

export { NotificationsProvider, useNotifications } from "./useNotifications";
export default NotificationHost;

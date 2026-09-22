import Icon from "@mui/material/Icon";
import { density, status } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDSnackbar from "components/MDSnackbar";
import MDTypography from "components/MDTypography";
import { useT } from "i18n";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { MAX_VISIBLE_BANNERS, useNotifications, type NotifyItem } from "./useNotifications";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Banner({ item }: { item: NotifyItem }) {
  const { t } = useT();
  const { dismissBanner, acknowledge } = useNotifications();
  const tone =
    item.severity === "critical" || item.family === "driver_offline" || item.family === "sos"
      ? status.alert.critical
      : status.alert.high;
  const title =
    item.count > 1 ? `${item.title} ${t("notify.toastCount", { count: item.count })}` : item.title;

  return (
    <MDBox
      role="alert"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      px={2}
      py={1}
      mb={0.75}
      borderRadius="md"
      sx={{
        bgcolor: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
      }}
    >
      <MDBox minWidth={0}>
        <MDTypography variant="button" fontWeight="bold" noWrap sx={{ color: tone.fg }}>
          {title}
        </MDTypography>
        <MDTypography variant="caption" display="block" noWrap title={item.body} sx={{ color: tone.fg }}>
          {item.body}
        </MDTypography>
      </MDBox>
      <MDBox display="flex" gap={1} flexShrink={0}>
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

function NotificationHost(): JSX.Element | null {
  const { t } = useT();
  const { pathname } = useLocation();
  const { banners, toasts, dismissToast } = useNotifications();
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const overlay = pathname.includes("live-fleet-map");
  const visible = banners.slice(0, MAX_VISIBLE_BANNERS);
  const overflow = banners.length - visible.length;

  if (visible.length === 0 && toasts.length === 0) return null;

  return (
    <>
      {visible.length > 0 && (
        <MDBox
          px={overlay ? 2 : 0}
          pt={overlay ? 1 : 0}
          pb={overflow > 0 ? 0.5 : 0}
          sx={
            overlay
              ? {
                  position: "fixed",
                  top: density.navbar,
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  pointerEvents: "none",
                  "& > *": { pointerEvents: "auto" },
                }
              : undefined
          }
        >
          {visible.map((item) => (
            <Banner key={item.id} item={item} />
          ))}
          {overflow > 0 && (
            <MDTypography
              variant="caption"
              fontWeight="medium"
              component={Link}
              to="/dispatcher/exceptions"
              sx={{ display: "inline-block", px: 2, pb: 1, color: "info.main" }}
            >
              {t("notifications.moreToExceptions", { count: overflow })}
            </MDTypography>
          )}
        </MDBox>
      )}
      {toasts.map((item, index) => (
        <MDSnackbar
          key={item.id}
          open
          color={colorFor(item)}
          icon={
            <Icon aria-hidden>notifications</Icon>
          }
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

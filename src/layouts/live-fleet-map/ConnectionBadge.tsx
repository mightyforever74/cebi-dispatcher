import Chip from "@mui/material/Chip";
import { status } from "assets/theme/tokens";
import { useMaterialUIController } from "context";
import { formatRelative, useT } from "i18n";
import { mapChrome, type FleetLinkState } from "./mapChrome";

const BADGE_STATUS: Record<FleetLinkState, keyof typeof status.vehicle> = {
  live: "online",
  polling: "maintenance",
  stale: "stale",
  offline: "offline",
};

const TITLE_KEY: Record<
  FleetLinkState,
  "map.connection.liveTitle" | "map.connection.pollingTitle" | "map.connection.staleTitle" | "map.connection.offlineTitle"
> = {
  live: "map.connection.liveTitle",
  polling: "map.connection.pollingTitle",
  stale: "map.connection.staleTitle",
  offline: "map.connection.offlineTitle",
};

const LABEL_KEY: Record<
  FleetLinkState,
  "map.connection.live" | "map.connection.polling" | "map.connection.stale" | "map.connection.offline"
> = {
  live: "map.connection.live",
  polling: "map.connection.polling",
  stale: "map.connection.stale",
  offline: "map.connection.offline",
};

interface ConnectionBadgeProps {
  link: FleetLinkState;
  when: string | number | null;
  now: number;
  lang: "en" | "tr" | "nl";
}

function ConnectionBadge({ link, when, now, lang }: ConnectionBadgeProps): JSX.Element {
  const { t } = useT();
  const [controller] = useMaterialUIController();
  const chrome = mapChrome(controller.darkMode);
  const tone = status.vehicle[BADGE_STATUS[link]];
  const relative = formatRelative(when, now, lang);
  return (
    <Chip
      size="small"
      label={t(LABEL_KEY[link])}
      title={t(TITLE_KEY[link], { when: relative })}
      aria-label={t(TITLE_KEY[link], { when: relative })}
      sx={{
        height: 22,
        fontSize: "11px",
        fontWeight: 700,
        bgcolor: chrome.chipBg,
        color: chrome.textOnChip,
        border: `1px solid ${tone.border}`,
      }}
    />
  );
}

export default ConnectionBadge;

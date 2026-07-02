/**
=========================================================
* TulipFleet Dispatcher — GlassPanel
=========================================================
* Glass surface primitive (ADR-0001 design language v3).
*
* USE ONLY on static / low-motion backgrounds:
*   - right-hand detail panel (vehicle / task inspector)
*   - floating map overlays / control cards
*   - fixed control bars
* NEVER use on table rows or map markers: backdrop-filter is GPU-costly
* PER COMPOSITED LAYER, so one panel = fine, 200 rows/markers = jank.
*
* ownerState props:
*   - blur:     number   px blur radius              (default 16)
*   - tint:     "neutral" | "brand"                  (default "neutral")
*   - edge:     boolean  brand gradient edge-light    (default false)
*   - darkMode: boolean  dark-first surfaces          (default true)
*
* NOTE: brand hexes are inlined until ADR-0001 "option A" seals
* palette.gradients.primary as TulipFleet purple->orange. After A lands,
* replace BRAND_A / BRAND_B with palette.gradients.primary.main / .state.
*/

import Box from "@mui/material/Box";
import { styled, Theme } from "@mui/material/styles";

// TulipFleet brand (temporary inline — see NOTE above)
const BRAND_A = "#7C3AED"; // violet
const BRAND_B = "#FB7A1E"; // orange

interface GlassPanelOwnerState {
  blur?: number;
  tint?: "neutral" | "brand";
  edge?: boolean;
  darkMode?: boolean;
}

export interface GlassPanelProps {
  ownerState?: GlassPanelOwnerState;
}

const GlassPanel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "ownerState",
})<GlassPanelProps>(
  ({ theme, ownerState = {} }: { theme: Theme | any; ownerState?: GlassPanelOwnerState }) => {
    const { palette, functions, borders, boxShadows } = theme;
    const { rgba, linearGradient, pxToRem } = functions;
    const { borderRadius } = borders;
    // Prefer sealed brand token (ADR-0001 A); BRAND_A/B are the fallback.
    const brandA = palette.gradients?.brand?.main ?? BRAND_A;
    const brandB = palette.gradients?.brand?.state ?? BRAND_B;

    const { blur = 16, tint = "neutral", edge = false, darkMode = true } = ownerState;

    const surface = darkMode ? "#141A33" : palette.white.main;
    const background =
      tint === "brand"
        ? linearGradient(rgba(brandA, 0.1), rgba(surface, 0.66))
        : rgba(surface, darkMode ? 0.62 : 0.7);

    return {
      position: "relative",
      background,
      backdropFilter: `blur(${pxToRem(blur)}) saturate(140%)`,
      WebkitBackdropFilter: `blur(${pxToRem(blur)}) saturate(140%)`,
      border: `${pxToRem(1)} solid ${rgba(palette.white.main, darkMode ? 0.13 : 0.5)}`,
      borderRadius: borderRadius.xl,
      boxShadow: boxShadows.xxl,
      overflow: "hidden",

      // brand edge-light (the signature accent) — opt-in via edge
      ...(edge && {
        "&::before": {
          content: '""',
          position: "absolute",
          insetBlock: 0,
          left: 0,
          width: pxToRem(3),
          background: linearGradient(brandA, brandB),
        },
      }),

      // Low-power / unsupported browsers: solid translucent, no blur (no GPU compositing)
      "@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))": {
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        background: rgba(surface, 0.96),
      },
    };
  }
);

export default GlassPanel;

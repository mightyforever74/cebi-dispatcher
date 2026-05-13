# ADR-0006: Map Widget — Leaflet + react-leaflet

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Dispatcher Web UI map components               |
| **Related**       | ADR-0001 (Dispatcher UI), ADR-0005 (Dispatch workflow)                 |

---

## 1. Context

The Dispatcher Web UI requires interactive map rendering for several core screens:

- **Live Fleet Map.** Real-time vehicle markers updated from the MQTT-over-WSS stream; 50-500 markers per fleet, refreshed at sub-second cadence.
- **Plan Review.** Proposed multi-vehicle routes overlaid with origin/destination markers, time-window indicators, and per-vehicle polylines.
- **Vehicle Detail.** Historical track visualization for a single vehicle, with playback controls.
- **Geofence Management.** Drawing and editing polygon/circle geofences.

Two main candidates were considered:

1. **Mapbox GL JS** — premium-feeling vector tile renderer, paid SaaS (with a meaningful free tier), industry standard for many fleet products.
2. **Leaflet + react-leaflet** — open-source raster/vector tile renderer, free, MIT-licensed, mature ecosystem.

The decision was approached through the cost/risk lens established in earlier ADRs: minimum dependency surface, maximum optionality, decisions that don't get coupled to one another unnecessarily.

## 2. Decision

Adopt **Leaflet + react-leaflet** for Phase 1, with **Mapbox GL JS retained as an explicit upgrade option** for Phase 2 if Mode 2 (ADR-0005) or fleet sizes above 500 vehicles per dispatcher session push beyond Leaflet's comfortable performance envelope.

Tile source for Phase 1: **OpenStreetMap standard tiles** via a reputable mirror (e.g., OpenFreeMap, MapTiler free tier, or OpenStreetMap's own tile server with appropriate attribution and respect for usage policy).

## 3. Rationale

### 3.1 Why Leaflet is sufficient for Phase 1

- **Mode 1 dispatch workflow** (ADR-0005) does not require sub-100ms map redraw cycles. Dispatchers review proposals, modify by drag-and-drop in Kanban (not on the map), and approve. Map interactions are inspection-oriented, not action-oriented.
- **Fleet sizes** of 50-500 vehicles render comfortably on Leaflet with marker clustering enabled. Performance issues with Leaflet typically begin in the 2,000+ marker range.
- **Bundle size matters less than initial bundle size.** Leaflet (~40 KB gzipped) is materially smaller than Mapbox GL JS (~200+ KB), which is a useful win on dispatcher first-page-load for sales demos.
- **Open source, MIT-licensed.** Zero per-request costs, zero rate limits, zero SaaS account to maintain in the integration. License is unambiguously SaaS-compatible.

### 3.2 Why decouple map decision from solver decision

ADR-0002 selected HERE Tour Planning as the VRP solver. HERE also offers map tiles and a map JS SDK. The temptation is to consolidate on HERE for both — one vendor, one bill, one auth flow.

This consolidation is **explicitly rejected** for two reasons:

- **Vendor lock-in compounding.** If HERE prices change or service quality degrades, an all-HERE dependency forces simultaneous migration of routing **and** mapping. Decoupling means the routing dependency can be swapped (Section 8 of ADR-0002) without touching map code.
- **Optionality preservation.** The map layer rarely matters to customers; the routing engine often does. Spending optionality budget on the map (by locking it to HERE) wastes flexibility on the wrong axis.

### 3.3 Why not Mapbox GL JS today

Mapbox GL JS is a strong product and is industry-standard for many premium fleet tools. The case for adopting it today is real:

- Vector tiles render faster at high zoom levels.
- Native clustering and 3D extrusions are excellent.
- Polished aesthetic that helps B2B sales.

However:

- Free tier exists but maps to a paid relationship at scale (50,000 monthly map loads ≈ 1,500 dispatcher sessions). Reasonable, but introduces a future commercial conversation.
- Vendor lock-in: switching away from Mapbox requires rewriting map components.
- Polish-vs-performance asymmetry: dispatchers buying TulipFleet Enterprise are evaluating routing decisions, dispatch workflows, and reporting — not the smoothness of map zoom animation. Polish is welcome but not the deciding factor.

The deciding principle is the one Cem articulated at decision time: **"Map kararını solver kararından bağımsız tutar."** (Keeps the map decision independent of the solver decision.) Leaflet today, Mapbox tomorrow if measured need emerges.

### 3.4 Why tile source choice is a sub-decision

OpenStreetMap's own tile servers have **usage policies** that do not allow heavy-traffic commercial use. Production usage of OSM requires either:

- A paid tile provider that resells OSM data (MapTiler, Stadia Maps, OpenFreeMap, etc.).
- A self-hosted tile server.

Phase 1 starts with a paid tile provider's free tier (likely MapTiler — generous free tier and EU presence). Self-hosting tiles is a Phase 2+ optimization if costs warrant.

## 4. Architecture

```
+--------------------------------------------+
|  Dispatcher Web UI (Material Dashboard 2)  |
|                                            |
|  +-------------------------------------+   |
|  |  <MapContainer> (react-leaflet)     |   |
|  |    <TileLayer src=MapTiler />       |   |
|  |    <MarkerClusterGroup>             |   |
|  |      <VehicleMarker x N />          |   |
|  |    </MarkerClusterGroup>            |   |
|  |    <Polyline (route) />             |   |
|  |    <FeatureGroup (geofences) />     |   |
|  |  </MapContainer>                    |   |
|  +-----+-------------------------------+   |
|        |                                   |
|        | React state                       |
|        v                                   |
|  +-------------------------------------+   |
|  |  Vehicle positions store (Zustand)  |   |
|  +-----+-------------------------------+   |
|        |                                   |
|        | mqtt.js over WSS                  |
+--------+-----------------------------------+
         |
         v
  EMQX broker (ADR-0003 shared infra)
  topic: fleet/device/+/location
```

Key libraries:

- `leaflet@^1.9` — the core library.
- `react-leaflet@^4` — React wrapper.
- `react-leaflet-cluster` or `leaflet.markercluster` — marker clustering at scale.
- `leaflet-draw` (optional, Phase 2) — for geofence drawing in the dispatcher's geofence management UI.

## 5. Consequences

### 5.1 Positive

- Zero recurring map cost in Phase 1 (within free tier of tile provider).
- Smaller frontend bundle, faster cold load.
- Solver and map decisions remain independently swappable.
- Mature open-source ecosystem; plenty of plugins (heat maps, polyline editing, fullscreen control, etc.) with no vendor approval needed.

### 5.2 Negative / accepted trade-offs

- **Performance ceiling.** Beyond ~2,000 markers, Leaflet performance degrades visibly. Phase 1 fleet sizes do not exceed this. Mitigation: marker clustering, viewport-bound rendering, and the Mapbox escape hatch in Section 7.
- **Visual aesthetics.** Raster tiles look less crisp than vector. Mitigation: a quality tile provider (MapTiler vector tiles) recovers most of this gap.
- **3D / pitch / bearing.** Leaflet is 2D-only. Mapbox does 3D camera controls. Not needed for Phase 1 dispatcher workflows.
- **Plugin ecosystem variability.** Some Leaflet plugins are abandoned or React-unfriendly. Mitigation: stick to well-maintained ones; the listed dependencies above are all actively maintained as of mid-2026.

## 6. Implementation Notes

- **MapContainer key issue.** `react-leaflet`'s `<MapContainer>` does not respect changes to most props after mount. Pass a `key` that includes the relevant config to force remount on substantive changes (e.g., when switching tile providers).
- **MQTT-to-marker pipeline.** Subscribe to `fleet/device/+/location` on the dispatcher backend (or directly from the frontend via EMQX over WSS), normalize into a vehicle position store (Zustand), and let React reconcile markers. Avoid imperatively manipulating Leaflet layers from outside React.
- **Marker icon.** Use a custom SVG marker for vehicles with a color encoding (e.g., green = on plan, amber = behind, red = exception). Heading rotation via CSS transform.
- **Polyline rendering for routes.** When a plan is displayed, render one polyline per vehicle with a distinct color. Use HERE's returned shape points; do not re-snap to roads on the client.

## 7. Escape Hatch — When to Reconsider Mapbox GL JS

Migrate to Mapbox GL JS if **any** of the following becomes true:

- A single dispatcher routinely renders more than 1,500 vehicles or markers simultaneously and reports performance pain.
- A customer demands 3D / aerial / pitched views (fleet of cranes, aviation, ports).
- Mode 3 (agentic) requires real-time map animations beyond Leaflet's render budget.
- Phase 2 tile-provider costs unexpectedly exceed Mapbox commercial pricing.

The map-related component code is small (likely < 1,000 lines for Phase 1). Migration is a 1-2 week effort; not a multi-month refactor.

## 8. Open Questions

- **Tile provider selection.** MapTiler vs Stadia vs OpenFreeMap. Evaluate during Week 1 of UI implementation based on EU data residency, free-tier generosity, and tile aesthetic.
- **Offline / unstable connection handling.** Dispatchers will sometimes operate over flaky office WiFi. Investigate Leaflet's built-in tile caching and consider a service worker for offline map fallback. Defer.
- **Geofence editor.** `leaflet-draw` is the standard but is JavaScript-only with thin React bindings. Build a small React wrapper in Phase 2, or accept the raw plugin. Defer.

## 9. References

- Leaflet: <https://leafletjs.com/>
- react-leaflet: <https://react-leaflet.js.org/>
- Mapbox GL JS: <https://docs.mapbox.com/mapbox-gl-js/>
- OpenStreetMap usage policy: <https://operations.osmfoundation.org/policies/tiles/>
- MapTiler: <https://www.maptiler.com/>

---

## 10. Change Log

| Version | Date       | Author    | Change                                                                |
| ------- | ---------- | --------- | --------------------------------------------------------------------- |
| 1       | 2026-05-13 | Cem Bakir | Initial decision: Leaflet for Phase 1; Mapbox documented as upgrade.   |

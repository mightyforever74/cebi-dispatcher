# ADR-0001: Dispatcher Web UI Stack Selection

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 2 (supersedes v1 draft dated 2026-05-12)                               |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Dispatcher Web UI                              |
| **Supersedes**    | ADR-0001 v1 (proposed Material Dashboard 3 PRO React TS, before discovering the JSX/TS split) |
| **Related**       | ADR-0002 (VRP solver — TBD), ADR-0003 (Server topology — TBD), ADR-0004 (DB strategy — TBD), ADR-0005 (Phase 1 dispatch workflow — TBD) |

---

## 1. Context

TulipFleet is evolving from a driver- and admin-focused mobile/backend product into a full enterprise fleet management platform. The next product phase introduces **dispatcher-grade features**: multi-vehicle routing (VRP), real-time task assignment, dynamic re-optimization, and exception handling.

These features are unusable on a mobile form factor — dispatchers operate from 24–32″ monitors with keyboard, mouse, multi-window workflows, and frequently view 50–500 vehicles on a single live map. A dedicated **web-based dispatcher UI** is therefore required, separate from the existing React Native (Expo) mobile app used by drivers and admins.

Requirements for the dispatcher UI:

- Information-dense (hundreds of vehicles + tasks visible simultaneously)
- Real-time (sub-second updates from the existing MQTT event stream)
- Highly interactive (drag-and-drop task assignment, manual route adjustments, kanban-style workflow)
- Professional B2B aesthetic for the Dutch logistics market
- Maintainable by a one-person engineering team in the short term
- Compatible with TulipFleet's existing event-driven architecture (EMQX MQTT, Fastify backend, PostgreSQL/TimescaleDB)
- Legally clean for SaaS commercialization

## 2. Decision

Adopt a **hybrid two-template strategy** built on the React + MUI v5 stack, using two complementary Creative Tim products already available under the existing Company License:

- **Primary visual baseline:** Material Dashboard **3** PRO React (JSX, v2.4.0) — modern Material Design 3 aesthetic, latest layouts, latest example pages.
- **TypeScript foundation:** Material Dashboard **2** PRO React TS (v1.0.2) — TypeScript types, tsconfig, component typing patterns, type-safe theme primitives.

The final dispatcher codebase will be TypeScript-first. Where the two templates diverge, Material Dashboard 3 PRO React's newer designs win on UI, and Material Dashboard 2 PRO React TS's typing approach wins on engineering.

Underlying stack:

| Layer              | Choice                                                  |
| ------------------ | ------------------------------------------------------- |
| Framework          | React 18+                                               |
| Component library  | MUI v5 (Material-UI)                                    |
| Language           | TypeScript (non-negotiable)                             |
| Build tooling      | Vite (preferred) or Create-React-App as shipped         |
| Styling            | MUI `styled()` API + `sx` prop                          |
| Routing            | React Router v6                                         |
| Server state       | TanStack Query (React Query)                            |
| Client state       | Zustand (lightweight; revisit if complexity grows)      |
| Real-time          | `mqtt.js` over WSS to existing EMQX broker              |
| Map                | TBD in a follow-up ADR (Mapbox GL JS vs Leaflet)        |

## 3. Rationale

### 3.1 Why a template (not custom from scratch)

A one-person engineering team cannot afford 4–8 weeks building an admin shell, design tokens, table widgets, form library wiring, and dark mode from zero. A mature, well-maintained template collapses that work to a few days and protects engineering capacity for the features that actually differentiate TulipFleet — routing, dispatch, and dynamic re-optimization.

### 3.2 Why Material Dashboard (over alternatives in the same lifetime access)

The Creative Tim lifetime access already covers four React-based admin templates that were evaluated:

| Template                                | Verdict for dispatcher UI                                                |
| --------------------------------------- | ------------------------------------------------------------------------ |
| **Material Dashboard 3 PRO React**      | ✅ Selected (primary visual baseline)                                    |
| **Material Dashboard 2 PRO React TS**   | ✅ Selected (TypeScript foundation)                                      |
| Soft UI Dashboard PRO React             | ❌ Rejected — soft shadows / neumorphism fatiguing in information-dense ops UIs |
| NextJS Material Dashboard 2 PRO         | ❌ Rejected — SSR adds complexity for a logged-in dashboard, conflicts with existing Fastify backend, and complicates the real-time MQTT/WebSocket boundary |

### 3.3 Why a hybrid of two Material Dashboard versions (the JSX/TS split)

Creative Tim's portfolio has an asymmetry that became visible only after inspecting downloads:

- **Material Dashboard 3 PRO React** (v2.4.0) — newer aesthetic, latest example pages, ships in **JSX** only.
- **Material Dashboard 2 PRO React TS** (v1.0.2) — older aesthetic, ships in **TypeScript** already.

Material Dashboard 3 PRO React is documented as "also available for TypeScript" but the link points back to the **2 PRO TS** product. As of the time of this decision, there is **no Material Dashboard 3 PRO React TypeScript edition** distributed by Creative Tim. The pragmatic choices were therefore:

1. Use 3 PRO (JSX) and migrate to TypeScript ourselves — accepts a 1–2 day migration effort but keeps the modern aesthetic.
2. Use 2 PRO TS as-is — keeps TypeScript out of the box but locks the product into the older visual language.
3. **Hybrid: use both, take TS scaffolding from 2 PRO TS, take new layouts/components from 3 PRO** — accepts a moderate one-time integration effort to get the best of both.

Option 3 is selected. Both templates are owned outright under the same Company License (see Section 6), so there is no incremental licensing cost. The integration cost (porting selected 3 PRO components into the 2 PRO TS-typed shell) is bounded and one-time.

### 3.4 Why MUI (over Tailwind, Ant Design, or a custom design system)

| Alternative                       | Reason rejected                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tailwind-only admin templates     | Lower component density; more bespoke work to reach enterprise patterns (data tables, kanban)    |
| Ant Design                        | Strong library but more opinionated; harder to brand-customize; smaller TS-template marketplace  |
| shadcn/ui                         | Excellent quality but DIY assembly; appropriate for a later "polished" redesign, not the v1 push |
| Custom design system from scratch | Out of scope for a one-person team in current phase                                              |

MUI is the de facto standard for serious React admin applications: largest community, mature TypeScript typings, well-known performance characteristics at scale, and easy hiring for future contractors.

### 3.5 Why TypeScript is non-negotiable

Dispatcher software produces real-money operational decisions — route assignments that affect fuel cost, driver assignments that affect SLA, exception handling that affects customer satisfaction. Runtime type errors here have direct economic impact on TulipFleet customers and reputational impact on TulipFleet itself. TypeScript is a hard requirement, not a preference.

### 3.6 Bundled libraries directly relevant to dispatcher use cases

Both templates ship with the same supporting library set. The pieces directly relevant to dispatcher workflows:

| Bundled library      | Dispatcher use case                                        |
| -------------------- | ---------------------------------------------------------- |
| MUI v5 (200+ comps)  | Forms, modals, navigation, layout primitives               |
| React Table          | Vehicle / driver / task lists with sort, filter, paging    |
| **React Kanban**     | **Drag-and-drop task assignment to drivers**               |
| **Full Calendar**    | **Driver shift management, task scheduling**               |
| React ChartJS 2      | KPI dashboard, fuel and route trend visualizations         |
| Formik               | Task create/edit, geofence config, vehicle setup           |
| React Flatpickr      | Time-window selection for routing constraints              |
| Dropzone             | Bulk task import (CSV), document upload                    |
| ChromaJS             | Dynamic color scales for fleet heatmaps (heat per vehicle) |

The presence of **React Kanban + Full Calendar** in the bundle eliminates the need to separately integrate `dnd-kit`, `react-beautiful-dnd`, or a third-party calendar — these are direct enablers of the Phase 1 dispatcher workflow.

## 4. Consequences

### 4.1 Positive

- Time-to-first-demo measured in days, not weeks.
- Brand-consistent professional appearance matching the B2B sales context (Dutch logistics outreach to Dobbe, Deudekom, DAGO, Neele-Vat, etc.).
- Mature accessibility patterns inherited from MUI.
- Easy hiring: MUI + TypeScript is a common stack; future contractors onboard quickly.
- React Kanban + Calendar already cover the assignment UX without further library decisions.
- Zero incremental license cost — both products were already paid for under the existing Company License.
- TypeScript scaffolding inherited directly from Material Dashboard 2 PRO React TS, accelerating type-safety adoption.

### 4.2 Negative / accepted trade-offs

- **Hybrid integration overhead.** Combining two templates requires one-time porting effort (visual layouts from MD3, type definitions from MD2 TS). Estimated 1–3 days.
- **Material Design aesthetic.** The product will look recognizable as a Material-based admin out of the box. Mitigation: theme customization (palette, typography, spacing) once the first version ships; "TulipFleet purple/orange" palette can be defined in a single theme file.
- **MUI bundle size.** Non-trivial JS payload. Mitigation: tree-shaking via per-component imports, code-splitting per route, lazy loading for rarely-visited pages.
- **Template lock-in for shell components.** Sidenav, top nav, configurator are template-shaped. Mitigation: keep business logic in a separate `src/features/` directory; touch template-shaped code only for shell concerns.
- **Desktop-only design.** Acceptable: dispatcher UX is desktop-only by design. Drivers and admins continue using the existing React Native app.

## 5. Components NOT shipped with the templates (must be added)

Each of these will get its own ADR where the decision is non-trivial.

| Capability                        | Candidate                                                       | Notes                                                  |
| --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Map widget                        | Mapbox GL JS  *or*  Leaflet + react-leaflet                     | Will be decided in a follow-up ADR                     |
| Marker clustering                 | Built-in Mapbox cluster  *or*  `react-leaflet-cluster`          | Required for 100+ vehicles on screen                   |
| MQTT-over-WebSocket client        | `mqtt.js`                                                       | Standard, EMQX-compatible, already used in mobile app  |
| Real-time state management        | Zustand (lightweight) or Redux Toolkit                          | Starting with Zustand; revisit if complexity grows     |
| API client                        | TanStack Query (server state) + fetch/axios                     | Standard pattern                                       |
| Vite migration                    | If templates ship with CRA, migrate to Vite                     | Faster DX; CRA is effectively unmaintained             |

## 6. Licensing — VERIFIED ✅

Both Creative Tim products required for this decision have been confirmed under a SaaS-compatible license tier. Documented for legal record:

### 6.1 Material Dashboard 3 PRO React

| Field             | Value                                       |
| ----------------- | ------------------------------------------- |
| **Product**       | Material Dashboard 3 PRO React              |
| **License Tier**  | **Company License** ✅                       |
| **Version**       | 2.4.0                                       |
| **License ID**    | B49B-41AF-1BA8-34DF                         |
| **Reference No.** | 255683183                                   |
| **Order Date**    | 2025-06-03                                  |
| **SaaS use**      | Permitted — confirmed by Creative Tim's official license table for the Company tier |

### 6.2 Material Dashboard 2 PRO React TS

| Field             | Value                                       |
| ----------------- | ------------------------------------------- |
| **Product**       | Material Dashboard 2 PRO React TS           |
| **License Tier**  | **Company License** ✅                       |
| **Version**       | 1.0.2                                       |
| **License ID**    | B49B-41AF-1BA8-34DF (shared with MD3 PRO)   |
| **Reference No.** | 255683183 (shared)                          |
| **Order Date**    | 2025-06-03                                  |
| **SaaS use**      | Permitted — same Company License tier       |

Both products were acquired in the same order. Creative Tim's published terms for the Company License state: *"This license is compatible with SaaS-based projects."* No further action or upgrade is required to ship a SaaS product based on these templates.

### 6.3 Required artifacts in the repository

Before the first production deploy of the dispatcher application:

- [ ] Save screenshots of both license detail pages (the dashboard panels showing License ID and Reference No.) to `docs/legal/creative-tim-license-evidence/`.
- [ ] Save the invoice / order receipt PDF to the same directory.
- [ ] Add a `docs/legal/creative-tim-license.md` summarizing the above table for due-diligence audits (investors, acquirers).

## 7. Implementation Plan (high-level)

This ADR records the decision only. Implementation is tracked separately as engineering tasks.

**Week 1 — Bootstrap**

1. Create new private Git repository (suggested name: `tulipfleet-dispatcher`).
2. Initial commit: unmodified Material Dashboard 2 PRO React TS (the TypeScript foundation), tagged `vendor/material-dashboard-2-pro-react-ts-1.0.2`.
3. Second commit: vendor drop of Material Dashboard 3 PRO React (JSX) into a sibling folder `_vendor/md3-pro-jsx/`, tagged `vendor/material-dashboard-3-pro-react-2.4.0`. **This folder is reference-only**, not built; pages are copied from it into the TS shell on demand.
4. Run `npm install` and `npm start` in the TS shell, confirm the template demo runs locally.
5. Replace template logo, favicon, app title with TulipFleet branding.

**Week 2 — Architectural skeleton**

6. Configure path aliases, ESLint, Prettier, strict TS settings.
7. Add MQTT-over-WSS client wiring against the existing EMQX broker (test topic: `fleet/device/+/location`).
8. Add TanStack Query and a first API hook against `api.tulipfleet.com` (start with `GET /api/locations/latest`).
9. Decide ADR-0002 (map widget) and integrate the first **Live Fleet Map** screen.

**Week 3+ — Feature work begins**

10. Vehicle list page, driver list page, task list page (template tables, real data).
11. First Kanban-based task assignment view (copying React Kanban example from MD3 PRO).
12. Begin dispatch workflow per ADR-0005 (to be written).

## 8. Open Questions (deferred to subsequent ADRs)

- **ADR-0002:** VRP solver — OR-Tools (self-hosted Python worker) vs HERE Tour Planning (managed API)?
- **ADR-0003:** Server topology — new Hetzner CX42 + `enterprise-api.tulipfleet.com` subdomain vs single-server feature flag?
- **ADR-0004:** Database strategy — shared PostgreSQL with `company_id` tenant isolation vs separate database per environment?
- **ADR-0005:** Phase 1 dispatch workflow — manual-first (system suggests, dispatcher decides) vs semi-automated?
- **ADR-0006:** Map widget — Mapbox GL JS vs Leaflet + react-leaflet?

## 9. References

- Creative Tim product page (MD3 PRO React): <https://www.creative-tim.com/product/material-dashboard-pro-react>
- Creative Tim product page (MD2 PRO React TS): <https://www.creative-tim.com/product/material-dashboard-2-pro-react-ts>
- GitHub source mirror (MD3 PRO): <https://github.com/creativetimofficial/ct-material-dashboard-pro-react>
- Creative Tim license terms: <https://www.creative-tim.com/license>
- License Company tier confirmation (snapshot to be added to `docs/legal/`): in-account dashboard at `creative-tim.com/account/products`

---

## 10. Change Log

| Version | Date       | Author    | Change                                                                                       |
| ------- | ---------- | --------- | -------------------------------------------------------------------------------------------- |
| 1       | 2026-05-12 | Cem Bakir | Initial draft proposing Material Dashboard 3 PRO React TS as a single template; license verification listed as open item. |
| 2       | 2026-05-13 | Cem Bakir | Revised after discovering Creative Tim's JSX/TS split for the v3 line. Adopts hybrid two-template strategy (MD3 PRO React + MD2 PRO React TS). License now verified at Company tier with License ID B49B-41AF-1BA8-34DF documented. |

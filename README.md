# TulipFleet Dispatcher

Web-based dispatcher application for the TulipFleet enterprise fleet management platform. Built for real-time multi-vehicle routing, task assignment, and exception handling for fleets of 50–500 vehicles.

> ⚠️ **Status:** Early-stage scaffolding. Vendor template imported, no business features implemented yet.

---

## Stack

| Layer              | Choice                                        |
| ------------------ | --------------------------------------------- |
| Framework          | React 18 + TypeScript                         |
| Component library  | MUI v5 (Material-UI)                          |
| Base template      | Material Dashboard 2 PRO React TS v1.0.2 (Creative Tim, Company License) |
| Build tooling      | react-scripts 5.0.1 (CRA) — Vite migration planned |
| Routing            | React Router v6                               |
| Real-time          | mqtt.js over WSS → EMQX broker                |
| Backend            | Existing TulipFleet Fastify API (`api.tulipfleet.com`) |

See [`docs/adr/ADR-0001-dispatcher-ui-stack.md`](docs/adr/ADR-0001-dispatcher-ui-stack.md) for the full decision record on the UI stack.

---

## Local development

**Prerequisites:**
- Node.js 20 LTS (`node --version` → `v20.x.x`)
- npm 10+ (`npm --version`)

**Setup:**

```powershell
git clone https://github.com/mightyforever74/tulipfleet-dispatcher.git
cd tulipfleet-dispatcher
npm install
npm start
```

Opens `http://localhost:3000` in your default browser.

**Common scripts:**

| Command          | Purpose                              |
| ---------------- | ------------------------------------ |
| `npm start`      | Local dev server on port 3000        |
| `npm run build`  | Production build into `/build`       |
| `npm test`       | Jest test runner                     |

---
## Repository layout
.
├── docs/
│   ├── adr/                 # Architecture Decision Records
│   │   └── ADR-0001-*.md
│   └── template/            # Vendor template documentation (reference)
├── public/                  # Static assets, index.html
├── src/                     # Application source
│   ├── components/          # Reusable UI building blocks
│   ├── examples/            # Template-provided example components
│   ├── layouts/             # Page-level layouts
│   ├── assets/              # Theme tokens, images, fonts
│   └── ...
├── package.json
├── tsconfig.json
└── README.md

---

## Roadmap (high level)

- [x] Vendor template imported and running locally
- [ ] TulipFleet brand theming (palette, logo, favicon)
- [ ] Authentication wired against existing TulipFleet JWT endpoint
- [ ] Live Fleet Map screen (MQTT-over-WSS + map widget)
- [ ] Vehicle / Driver / Task list pages
- [ ] Task assignment Kanban view
- [ ] VRP-driven route suggestions (ADR-0002, TBD)
- [ ] Dynamic re-optimization on MQTT events

---

## License

This repository contains code derived from Creative Tim's **Material Dashboard 2 PRO React TS** template, used under a Creative Tim **Company License** (License ID: `B49B-41AF-1BA8-34DF`, Order Ref: `255683183`, Order Date: 2025-06-03). The Company License is compatible with SaaS-based products as confirmed by Creative Tim's published license terms.

Application code, business logic, and brand assets added on top of the template are © TulipFleet and not distributed under an open-source license.

---

## Contact

- **Owner:** Cem Bakir (Founder / Lead Engineer)
- **Backend repository:** `tulipfleet-backend` (private)
- **Mobile app repository:** `tulipfleet-mobile` (private)


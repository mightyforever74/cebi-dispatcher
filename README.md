TulipFleet Dispatcher

Web-based dispatcher application for the TulipFleet enterprise fleet management platform. Built for real-time multi-vehicle routing, task assignment, and exception handling for fleets of 50–500 vehicles.

⚠️ Status: Early-stage scaffolding. Vendor template imported, no business features implemented yet.

Vision & Product Philosophy

TulipFleet Dispatcher is not designed as a generic vendor-neutral dispatch SaaS. The platform is intentionally positioned as:

A dispatcher layer tightly integrated with the TulipFleet telematics ecosystem
A workflow-support system for real dispatchers and planners
A compliance-aware operational platform specialized for the Dutch and European logistics market
An advisory-first operational tool rather than a fully autonomous AI dispatcher

The architecture intentionally prioritizes:

Real operational visibility over speculative automation
Human-in-the-loop dispatch workflows
Customer-funded expansion rather than speculative connector development
Operational observability and measurable routing decisions
Gradual maturity progression (Advisory → Exception-based → Agentic)
Operational Philosophy

The project assumes that real-world logistics operations are heavily shaped by:

Dispatcher experience and operational memory
Customer-specific behaviors
Depot and loading-dock realities
Driver familiarity and trust
Municipal restrictions and compliance complexity
Human communication patterns outside the system

Because of this, the dispatcher is designed to augment planners rather than replace them.

Product Discovery Approach

Feature prioritization is not based on speculative ideas. Features are selected from:

Existing logistics operational patterns
Known dispatcher pain points
Dutch logistics compliance requirements
Multi-vehicle routing and fleet-management market analysis
SME logistics digitalization gaps
Observed telematics and planning workflows

Function specifications and ADRs are used to:

Define measurable operational hypotheses
Create traceable routing and planning behaviors
Identify operational bottlenecks through telemetry and workflow observation
Keep architectural decisions explicit and reversible

However, real dispatcher behavior remains the final validation layer. The platform intentionally ships in advisory mode first so that operational friction and planner behavior can shape future automation layers.

Why Advisory Mode First?

The project deliberately avoids immediate autonomous dispatching.

The first production objective is:

Better visibility
Faster planning
Reduced operational chaos
Improved route recommendations
Dispatcher assistance
Compliance awareness

—not replacing planners.

This approach reflects the operational reality that many logistics organizations still rely heavily on dispatcher intuition, phone coordination, and manual intervention.

Stack
Layer	Choice
Framework	React 18 + TypeScript
Component library	MUI v5 (Material-UI)
Base template	Material Dashboard 2 PRO React TS v1.0.2 (Creative Tim, Company License)
Build tooling	react-scripts 5.0.1 (CRA) — Vite migration planned
Routing	React Router v6
Real-time	mqtt.js over WSS → EMQX broker
Backend	Existing TulipFleet Fastify API (api.tulipfleet.com)

See docs/adr/ADR-0001-dispatcher-ui-stack.md for the full decision record on the UI stack.

Architecture & Decision Discipline

The project follows an ADR-driven architecture process.

Architecture Decision Records are used to:

Make strategic trade-offs explicit
Preserve future optionality
Prevent undocumented architectural drift
Define phase boundaries
Separate immediate MVP needs from future scalability decisions

Current major decision areas include:

Dispatcher UI stack
VRP/routing strategy
Database strategy
Dispatch workflow maturity model
Compliance architecture
Integration boundaries
ML strategy
Telematics integration philosophy

The roadmap intentionally uses phase-gating discipline:

Features advance based on operational evidence and customer demand
Third-party integrations are customer-funded
Advanced automation is deferred until operational maturity exists
Compliance infrastructure is built incrementally
Local development

Prerequisites:

Node.js 20 LTS (node --version → v20.x.x)
npm 10+ (npm --version)

Setup:

git clone https://github.com/mightyforever74/tulipfleet-dispatcher.git
cd tulipfleet-dispatcher
npm install
npm start

Opens http://localhost:3000 in your default browser.

Common scripts:

Command	Purpose
npm start	Local dev server on port 3000
npm run build	Production build into /build
npm test	Jest test runner
Repository layout

├── docs/ 
│ ├── adr/ # Architecture Decision Records │ 
│ └── ADR-0001-*.md
│ └── template/ # Vendor template documentation (reference) 
├── public/ # Static assets, index.html 
├── src/ # Application source 
│├── components/ # Reusable UI building blocks 
│├── examples/ # Template-provided example components
│── layouts/ # Page-level layouts 
│├── assets/ # Theme tokens, images, fonts 
│└── ... ├── package.json 
├── tsconfig.json 
└── README.md

Roadmap (high level)
Phase 1 — Advisory Dispatcher MVP


Phase 2 — Operational Intelligence


Phase 3 — Framework & Platform Maturity


Current MVP Priorities

The immediate product goal is not maximum automation.

The current execution priority is:

Real-time fleet visibility
Stable operational workflows
Dispatcher usability
Manual planning support
Reliable route assistance
Pilot customer onboarding
Operational feedback collection

The roadmap intentionally avoids premature optimization before observing real dispatcher usage patterns.

License

This repository contains code derived from Creative Tim's Material Dashboard 2 PRO React TS template, used under a Creative Tim Company License (License ID: B49B-41AF-1BA8-34DF, Order Ref: 255683183, Order Date: 2025-06-03). The Company License is compatible with SaaS-based products as confirmed by Creative Tim's published license terms.

Application code, business logic, and brand assets added on top of the template are © TulipFleet and not distributed under an open-source license.

Contact
Owner: Cem Bakir (Founder / Lead Engineer)
Backend repository: tulipfleet-backend (private)
Mobile app repository: tulipfleet-mobile (private)

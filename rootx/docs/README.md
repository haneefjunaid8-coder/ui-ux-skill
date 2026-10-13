# ROOT-X — Documentation Index

Deliverables for the ROOT-X campus delivery platform (UNIOSUN context). Numbers map to the founding brief's §37 list. Assumptions and unresolved decisions live in `19` and are normative across all documents.

| # | Document | Contents |
|---|---|---|
| 01 | [Product Requirements](01-prd.md) | problem, vision, personas, capabilities, metrics, hard constraints |
| 02 | [User Stories](02-user-stories.md) | stories with Given/When/Then acceptance criteria, mapped to tests |
| 03 | [Journeys & Permissions](03-journeys-permissions.md) | end-to-end journeys, permission matrix, state-machine gate permissions |
| 04 | [Information Architecture](04-information-architecture.md) | route map, navigation model, object model, edge states |
| 05 | [Wireframes & UI](05-wireframes-ui.md) | wireframe→polished evolution for key screens, interaction decisions |
| 06 | [Design System](06-design-system.md) | tokens, primitives, conventions, placeholder-brand policy, i18n readiness |
| 07 | [Architecture](07-architecture.md) | system diagram, rules-as-code layer, data flows, alternatives & trade-offs, scaling |
| 08 | [Database Schema](08-database-schema.md) | entity model, tables, migrations, retention, prototype parity |
| 09 | [API Specification](09-api-spec.md) | conventions, endpoint groups, examples (machine spec: `../api/openapi.yaml`) |
| 10 | [Auth & Authz](10-auth-authz.md) | identity, OTP+MFA flows, guest tokens, RBAC layers, anti-abuse |
| 11 | [Payments & Reconciliation](11-payments-reconciliation.md) | webhook discipline, ledger invariant, refunds, two-person settlement |
| 12 | [Mapping & Tracking](12-mapping-geofencing-tracking.md) | OSM stack, zones/geofencing, routing, freshness contract, privacy |
| 13 | [Security & Privacy](13-security-privacy.md) | STRIDE threat table, SDL, NDPR alignment, accessibility |
| 14 | [Safety Workflows](14-safety-incident-workflows.md) | hours policy, SOS, incident workflow, anti-abuse of safety systems |
| 15 | [Test Plan](15-test-plan.md) | automated suite map, manual matrix, production pyramid, gates |
| 16 | [Deployment](16-deployment.md) | environments, topology, env vars, procedure, rollback |
| 17 | [Backup & IR](17-backup-ir.md) | backup policy, restore drills, severity ladder, IR lifecycle |
| 18 | [Admin Docs](18-admin-docs.md) | roles, daily rhythm, review checklists, playbooks |
| 19 | [Assumptions, Risks, Decisions](19-assumptions-risks-decisions.md) | binding constraints, assumptions, open decisions, risks, decisions log |
| 20 | [Pilot & Launch Checklist](20-pilot-launch-checklist.md) | phase gates, definitions of done |

Also in this repository:

- `app/` — the working prototype (run `npm run dev`), with the tested rules engine in `app/src/engine/`
- `database/` — authoritative Postgres DDL + forward-only migrations
- `api/` — OpenAPI 3.1 specification

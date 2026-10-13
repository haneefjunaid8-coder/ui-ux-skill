# 09 — API Specification

Machine-readable spec: [`api/openapi.yaml`](../api/openapi.yaml) (OpenAPI 3.1). This document explains conventions and the endpoint groups; the YAML is authoritative for request/response shapes.

## 1. Conventions

- **Base:** `https://api.rootx.example/v1` (placeholder domain).
- **Auth:** `Authorization: Bearer <access-jwt>` (15 min) + refresh rotation. Guest endpoints take no auth.
- **IDs:** UUIDs for entities; human refs (`RX-0123`) for deliveries.
- **Money:** integer **kobo** everywhere (`amount_kobo: 150000` = ₦1,500).
- **Idempotency:** all POSTs that move money or create deliveries require an `Idempotency-Key` header.
- **Errors:** RFC 9457 problem+json — `{ type, title, status, detail, errors? }`.
- **Rate limits:** per-phone OTP (5/hour), per-user mutations (60/min), guest tracking (30/min). 429 with `Retry-After`.
- **Server-side rule enforcement:** every mutating endpoint re-validates state transitions, zone eligibility, safety hours, verification lockouts and payment state **in the API/rules layer** regardless of what the client sent (C-7, C-8).

## 2. Endpoint groups

### Auth (`/auth`)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/otp/request` | phone; registering payload for new users; returns nothing sensitive |
| POST | `/auth/otp/verify` | code → JWT pair, or `mfa_required` for admin/finance |
| POST | `/auth/mfa/verify` | second factor → JWT pair |
| POST | `/auth/refresh` | rotate refresh token |
| POST | `/auth/logout` | revoke session |

### Customers — deliveries (`/deliveries`)
| Method | Path | Notes |
|---|---|---|
| POST | `/deliveries/quote` | stops + package + transport → line items, total, ETA, eligibility verdict (no auth side effects) |
| POST | `/deliveries` | create (validates package, zones, safety window for scheduled) |
| GET | `/deliveries` | mine, filter by status/kind |
| GET | `/deliveries/{id}` | full detail incl. status history, codes (sender only) |
| POST | `/deliveries/{id}/pay` | method card/transfer/wallet + Idempotency-Key → payment intent |
| POST | `/deliveries/{id}/cancel` | reason; returns fee stage + refund preview; safety reasons waive fee |
| POST | `/deliveries/{id}/rate` | stars + tags + comment |
| POST | `/deliveries/{id}/problem` | open dispute case |
| POST | `/deliveries/{id}/tracking/rotate` | new token, old dies |
| POST | `/deliveries/{id}/tracking/revoke` | link dies immediately |

### Guest (`/track` — no auth)
| Method | Path | Notes |
|---|---|---|
| GET | `/track/{token}` | delivery-scoped view: status, map position, ETA; **no personal data**; 404 on revoked/expired |

### Riders (`/rider`)
| Method | Path | Notes |
|---|---|---|
| POST | `/rider/applications` | matric, ID document ref, emergency contact, transport, terms |
| GET | `/rider/applications/me` | status + decision notes |
| GET | `/rider/me` | profile (approved riders only) |
| PATCH | `/rider/me/availability` | on/off — always allowed, never penalised |
| GET | `/rider/offers` | active offers with rider-net breakdown |
| POST | `/rider/offers/{deliveryId}/accept` | single-assignment guarded |
| POST | `/rider/offers/{deliveryId}/decline` | no penalty |
| POST | `/rider/deliveries/{id}/code` | submit pickup/delivery code (attempts counted, lockouts enforced) |
| POST | `/rider/deliveries/{id}/action` | approach/arrive/depart/approach_dest/arrive_dest transitions |
| GET | `/rider/earnings` | pending/available + statements |
| POST | `/rider/payouts` | request above `payoutMinAmount` |
| POST | `/rider/sos` | always available, 24/7 (C-3) |

### Tracking stream
| | | |
|---|---|---|
| WS | `/ws/track/{deliveryId}` | sender/receiver live position; `stale: true` + `lastSeenAt` when old (C-8) |
| WS | `/ws/guest/{token}` | same, guest-scoped, revoked mid-stream closes the socket |

### Admin (`/admin` — role-gated, all audit-logged)
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/admin/overview` | admin | live map, queues, window phase |
| GET | `/admin/applications` | admin | queue + evidence refs (signed, short-lived URLs) |
| POST | `/admin/applications/{id}/decision` | admin | approve/reject, **note required** |
| GET | `/admin/deliveries` | admin | all, filters |
| GET/PATCH | `/admin/zones/{id}` | admin | activate/deactivate, inter-zone policy |
| PUT | `/admin/config/pricing` | admin | new config version (audit-logged, no deploy) |
| GET | `/admin/finance/ledgers` | admin, finance | invariant ✓/⚠ column |
| GET | `/admin/finance/reconciliation` | finance | gateway vs ledger stats |
| POST | `/admin/finance/settlement-runs` | finance | propose batch → `awaiting_approval` |
| POST | `/admin/finance/settlements/{id}/approve` | admin | two-person rule; 403 if proposer |
| POST | `/admin/finance/settlements/{id}/reject` | admin | reason required |
| GET | `/admin/finance/export.csv` | finance | statements |
| GET | `/admin/cases/disputes` | admin | with timelines |
| POST | `/admin/cases/disputes/{id}/resolve` | admin | outcome, refund, rider-share flag, **note required** |
| POST | `/admin/cases/incidents/{id}/resolve` | admin, security | **note required** |
| GET | `/admin/audit` | admin, finance, security | read-only, paginated |

### Webhooks (server-to-server, signature-verified)
| Method | Path | Notes |
|---|---|---|
| POST | `/webhooks/payments` | gateway callbacks; idempotent by key; **the only path** that marks payment succeeded |
| POST | `/webhooks/payouts` | payout provider confirmations |

## 3. Example — quote then create

```http
POST /v1/deliveries/quote
{
  "stops": [
    { "kind": "pickup", "landmark_id": "lm-market", "zone_id": "oke-baale" },
    { "kind": "dropoff", "landmark_id": "lm-hostel-a", "zone_id": "osogbo-campus",
      "receiver": { "name": "Ada", "phone": "0803..." } }
  ],
  "package": { "category": "groceries", "weight_kg": 9,
               "dimensions_cm": {"l":40,"w":30,"h":25}, "photos": ["objref://..."],
               "contents_declared": true, "fragile": true, "food": false,
               "declared_value_kobo": null, "quantity": 1 },
  "transport": "motorcycle",
  "timing": { "kind": "immediate" }
}
→ 200
{
  "eligible": false,
  "reason": "inter_zone_policy=intra_zone_only — market is in oke-baale, hostel A in osogbo-campus",
  "config_version": 7
}
```
(Server-side eligibility — the client never decides.)

## 4. Versioning and compatibility

- Path-versioned (`/v1`); additive changes only within v1; breaking changes → `/v2` with 6-month overlap.
- Deprecation headers `Sunset:` announced in the changelog.

## 5. Prototype parity

The prototype's reducer actions map 1:1 to these endpoints (`delivery/create` → `POST /deliveries`, `admin/settlementRun` → `POST /admin/finance/settlement-runs`, …) so the API layer is a thin transport translation over the same rules — validated by the same tests (`docs/15`).

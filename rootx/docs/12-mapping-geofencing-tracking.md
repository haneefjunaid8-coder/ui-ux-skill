# 12 — Mapping, Geofencing and Tracking Design

## 1. Mapping stack

| Layer | Choice | Rationale |
|---|---|---|
| Base data | **OpenStreetMap** | Open licence, strong Nigerian campus coverage, community-improvable; no per-request vendor cost; full control of geometry (C-2 needs exact campus boundaries) |
| Tiles | Self-hosted (Protomaps/PMTiles) or OSM-compliant provider | Cost control + offline-ability; provider TBD (`docs/19` U-5) |
| Routing | OSRM/Valhalla-class engine with campus path data | Walking/cycling routes, gate awareness |
| Geocoding | Local landmark registry + OSM Nominatim fallback | Campus places are landmarks, not street addresses |
| Client map | Leaflet/MapLibre behind the `SchematicMap` component interface | The prototype's schematic map implements the same props (points, polylines, zone polygons) — the swap is a renderer change |

**Prototype note:** the prototype renders a *schematic campus map* (zone polygons, landmarks, route polylines, rider chips) with the same component contract. This keeps zone geometry, geofencing logic and route behaviour testable without tile infrastructure; `unitsToKm` (1 unit = 10 m) is the projection seam.

## 2. Zones and geofencing (C-2)

- **Zones** = approved campus polygons + explicitly defined nearby student-township polygons (e.g., `osogbo-campus`, `oke-baale`). Zone geometry is admin-managed data, not code.
- **Inter-zone policy** is configurable: `intra_zone_only` (default — a run's pickup and dropoff must be in the same zone) or `same_campus` (runs may cross zones within one campus grouping). Inter-campus and statewide are **not offered**; there is no config value that enables them.
- **Server-side only:** eligibility is computed by `checkZoneEligibility` (rules layer) and the DB `point_zone()` function; the client shows the verdict but never makes it.
- Zone activation is instant: deactivating a zone stops new bookings/quotes for it; active deliveries continue to safe resolution.
- Multi-campus = new zone rows + landmarks + campus grouping. No code changes.

## 3. Route computation

1. Stops resolve to coordinates (landmark registry or map pin snapped to zone).
2. The router returns a path (polyline), distance and ETA per transport mode (`TRANSPORT_CAPS` speeds: foot 5, bicycle 12, motorcycle 22 km/h defaults — configurable).
3. The ETA feeds: quote display, safety-window feasibility (`now + ETA + handling + cutoff ≤ close`), matching radius, and the rider's progress model.
4. Schematic prototype: straight-line path over campus geometry with the same distance/ETA contracts.

## 4. Live tracking (C-4, C-8)

### 4.1 When location is shared
- Rider app shares location **only while an active run exists** and the OS-level permission is granted. Availability toggling does not share location; idle riders are never tracked.
- Customers see the assigned rider's position only between `rider_assigned` and `delivered`/`cancelled`.
- Guests see position only via a valid (unexpired, unrevoked) token.

### 4.2 Freshness contract (never lie)
- Every location write carries `at`; consumers render `stale = (now − at) > threshold` (default 60 s).
- The UI **must** show "last seen X min ago" and grey the marker when stale — presenting stale data as live is prohibited (C-8) and tested in the prototype (`locationIsStale`).
- Weak-network mode: WebSocket drops → 30 s polling fallback → offline banner. Positions never interpolate into the future; the map freezes honestly.

### 4.3 Guest links
- 128-bit unguessable tokens, stored hashed, expiring (48 h default), revocable, rotatable.
- The guest view exposes: status, map position (same freshness contract), ETA, rider first name + last initial + vehicle, delivery code entry. No phones, no addresses beyond the stop label, no history.

## 5. Matching geography

- Riders become eligible by zone (pickup zone = rider zone under the inter-zone policy), transport capacity vs package, fragile/high-value qualifications, availability and working hours.
- Offer radius: riders near the pickup (prototype: distance to pickup ≤ threshold; production: routing distance) rank higher via the matching score (rating, on-time, completed, proximity).
- Single assignment: an accept wins only if the delivery is still `offered_to_riders` (Redis lock + status guard in production; reducer guard in the prototype).

## 6. Privacy of location data

- Retention: points live 7 days post-run for dispute resolution, then deleted (aggregates only) — see `docs/13` §5.
- No location is written without an active run (enforced in the rider client + server rejects stray writes).
- Law-enforcement/campus-security disclosure only via the incident procedure with legal review (`docs/14`) — never ad-hoc.
- Opt-out: riders can complete runs with degraded sharing (app-level) — flagged to the customer as "location sharing limited".

## 7. Performance and scale targets

| Metric | Target |
|---|---|
| Location publish rate | 1 Hz active riders only; 0.2 Hz downsample to storage |
| Map tile cache hit | ≥ 95 % via CDN |
| Guest tracking page | < 50 KB critical path (no auth, no app shell) |
| Tracking WS connections | 10k concurrent per node (pilot needs < 200) |

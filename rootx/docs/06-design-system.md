# 06 — Design System

The design system is code: `rootx/app/src/ds/` (tokens, primitives) + `rootx/app/src/styles/`. It is **deliberately editable** — brand identity is not finalized (founding brief: no final logo/colors without a deliberate decision), so every visual constant is a token.

## 1. Design principles

1. **Honesty first** — states (live/stale, paid/processing, open/closed) are never faked or hidden.
2. **Campus scale** — dense information, thumb-reachable actions, one-hand rider flows.
3. **Quiet safety** — safety affordances are always present, never panic-inducing.
4. **Money is transparent** — every naira shown with its reason (line items, net vs gross).
5. **Editable identity** — all brand values are tokens; nothing visual is hard-coded.

## 2. Color tokens

```css
--root-50 … --root-900   /* primary ramp — CURRENT VALUES ARE PLACEHOLDERS */
--ink-1 … --ink-3         /* text ramp (AA contrast on surfaces) */
--bg, --surface, --surface-2
--line, --line-strong     /* borders */
--ok, --ok-bg             /* success */
--warn, --warn-bg         /* safety warning (6 PM), caution */
--danger, --danger-bg     /* errors, quiet-danger */
--info, --info-bg         /* neutral information */
--focus                  /* focus ring — never removed */
```

Statuses map to semantics, not colors: `success` → ok, `hold/warn` → warn, `error` → danger, `default/info` → info. The primary ramp is the only brand-dependent ramp; swapping it re-themes the whole product without touching components.

**Accessibility:** body text tokens meet WCAG AA (4.5:1) on their surfaces; large text and UI glyphs meet 3:1. Focus ring is always visible on interactive elements.

## 3. Typography

| Token | Face | Use |
|---|---|---|
| `--font-display` | Bricolage Grotesque Variable | headings, numbers that matter (fares, earnings) |
| `--font-body` | Plus Jakarta Sans Variable | UI text |
| `--font-mono` | JetBrains Mono Variable | codes (OTP/pickup/delivery), refs, tabular money |

Scale (`--text-*`): 2xs / xs / sm / base / md / lg / xl / 2xl. Numeric displays use tabular alignment so money columns never jitter.

## 4. Spacing, radius, elevation

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 (`--sp-1…6`); layout uses `.stack-sm|md|lg` and `.row|.row-between` utilities.
- Radius: 12 (cards) / 10 (inputs) / 999 (pills, chips).
- Elevation: flat-by-default; `--shadow-1` for floating (toasts, drawers); no decoration shadows.

## 5. Core primitives (`src/ds/index.tsx`)

| Component | Notes |
|---|---|
| `Button` | variants: `primary`, `secondary`, `ghost`, `quiet-danger`; sizes `sm|md|lg`; optional icon; loading state |
| `Card` | surface container; optional `pad`, `onClick` (becomes focusable button), `style` |
| `TextInput` / `CodeInput` | labelled, mono code entry with per-char boxes |
| `Banner` | tones: info/warn/danger/success; title + body; used for service window, payment states |
| `Toast` | transient confirmations via `ToastProvider`/`useToast()`; tones incl. info |
| `Pill` / `StatusPill` / `DeliveryStatusPill` | semantic chips; delivery statuses have a fixed color map |
| `Stepper` | linear progress for verification flows |
| `Stat` | label + value + optional delta (ops dashboards) |
| `Toggle` | availability-style switches |
| `Avatar` | initials-based (no photos of people in v1) |
| `Modal` / `Drawer` | focus-trapped overlays for confirmations and admin detail |
| `Icon` | lucide-react behind a shared `IconType` so all icon props typecheck uniformly |

## 6. Component conventions

- Every interactive element has: visible focus, keyboard activation, an accessible name.
- Destructive confirmations always via `Modal` with the consequence spelled out (e.g., cancellation fee stage, who refunds whom).
- Money is always `₦` + `toLocaleString()`; never bare numbers.
- Timestamps: relative when < 24 h ("14 min ago"), else date + time; always with the local timezone.
- Status history lists show **actor** (system / role / first name) — accountability is visual.

## 7. Motion

Only functional motion: 150–250 ms ease-out for overlays and toasts; no parallax, no celebratory loops. `prefers-reduced-motion` respected globally.

## 8. Brand placeholder policy

Logo: wordmark "ROOT-X" in display font — **placeholder**. Colors: current primary ramp is a neutral teal selected for prototyping; final palette requires a deliberate branding exercise (see `docs/19` A-2). Nothing in the product refers to UNIOSUN insignia; affiliation claims are prohibited until verified in writing.

## 9. Localization readiness

- English-first; all user-facing copy lives beside components in a single copy layer (no string interpolation of grammar).
- Dates/times via `toLocale*('en-NG')` — switchable.
- Currency is a token (`NGN`); formatting centralised in the ledger/bits helpers.
- RTL: layout uses logical properties where possible; full RTL audit deferred (documented in `docs/19` U-9).

## 10. Using the system

Prototype source of truth: `src/ds/index.tsx` (primitives) and `src/styles/tokens.css` (tokens). Changes to tokens propagate everywhere; changes to primitives require a visual pass over Overview, Create, ActiveDelivery and Finance (the four densest screens).

# Section Recipes — modern-3d-uiux-gpt3

The page is an ordered stack of ten sections. Copy the order; it is proven.

## 1. Blurred sticky navbar
`position: fixed; backdrop-filter: blur(14px); background: rgba(4,12,24,.72); border-bottom: 1px solid var(--color-line)`.
Left: logo (gradient 28px badge + heavy wordmark). Center/right: plain text links
(`--color-text`, white on hover). Right: primary "Open …" gradient button.
Mobile: hamburger → full-width dropdown panel.

## 2. Hero
Two zones: content column (left, max-width ~700px) + 3D scene (right ~60%,
behind content on mobile at ~35% opacity). Content, in order:
1. h1 with **one** gradient keyword — e.g. `Let's move something <gradient>amazing</gradient> across campus.`
2. Sub-paragraph (20px, `--color-text`, max 32rem).
3. Email capture: input (`--color-footer` bg, hairline border) + gradient button.
4. Social proof row: stacked overlapping avatars (28–34px, gradient-ring) + one line of text.

## 3. Values marquee
Immediately under the hero: `overflow: hidden` strip, hairline top/bottom
borders, items = uppercase 13px/700/`letter-spacing: .12em` value props
separated by gradient dots (✦). Two identical groups in a `width: max-content`
track animated `translateX(-50%)` 28s linear infinite; pause on hover.

## 4. "What is X" (3 + 4 grid)
Background: `--color-footer` + top radial glow. Two blocks:
- Row 1 — 3 columns of feature cards; the **middle card gets the full gradient
  background** (`--gradient-bar`, white text). Each card: gradient bar, 18px/800
  title, 14px explanation.
- Heading row — h1 left + short `p` right (space-between, baseline).
- Row 2 — 4 mini-features: bold white label + 12px blue line under.

## 5. Features grid (3 × 2)
Heading: h1 + sub-paragraph. Cards: panel surface, hairline border, 42px
gradient icon tile (white icon), 18px/800 title, 14px text. Wrap each card in
the 3D tilt component (≤ 9°) with cursor-following glare.

## 6. Possibility (split)
Left: floating CSS phone mock (40px radius shell, inner screen with a mini
product UI — animated SVG route, status chip, ETA, avatar row). Right:
`--color-subtext` eyebrow, h1 (homage line: "The possibilities are beyond your
imagination"), paragraph, arrow link. Float animation ±8px / 6s on the phone.

## 7. Stats row
4 columns, hairline separators. Numbers: 56px/800 `.gradient__text` + CountUp;
labels 14px `--color-text`. Numbers must be *true facts of the product*.

## 8. CTA banner
1px gradient shell → inner `--color-bg` panel, centered: 34–44px h1 with
gradient keyword, sub-line, gradient button. `margin: 4rem 6rem`.

## 9. Blog grid
Heading + 3 cards. Card: 140px art header (big icon on radial glow), then
date · tag meta row (12px, `--color-subtext` tag), 18px/800 title, 14px
excerpt, "Read full article →" (`--color-text`, arrow shifts on hover). Tilt.

## 10. Footer
`--color-footer`. Centered 44px+ gradient h1 + gradient button. 4 link columns
(bold white h4 + `--color-text` links, 14px). Bottom bar: hairline top border,
12px rgba text — **put disclaimers here** (concept/demo status, no-affiliation
note, credits).

## Ordering law
Navbar → Hero → Marquee → What → Features → Possibility → Stats → CTA → Blog →
Footer. Never two gradient-background sections adjacent; alternate bg / footer /
panel tones for rhythm.

---
name: modern-3d-uiux-gpt3
description: >
  Dark, gradient-forward, premium marketing-page design language (the
  "Modern UI/UX GPT-3" style popularized by JavaScript Mastery), extended with
  a 3D interactive layer: WebGL hero scenes (react-three-fiber), 3D tilt cards,
  scroll reveals, count-ups, marquees and cursor-reactive glow. Use when asked
  for "a beautiful modern landing page", "GPT-3 style UI", "premium dark
  marketing site", "3D interactive hero", or "dynamic animated UI/UX". For
  data-dense dashboards use ui-ux-design-pro instead.
---

# Modern 3D UI/UX — GPT-3 Style

## The language in one paragraph

A deep navy-black canvas (`#040C18`) lit by soft radial glows; **one**
purple→orange gradient (`#AE67FA → #F49867`) reserved for everything that
matters — headline keywords, accent bars, buttons; Manrope at heavy weights
with tight tracking; thin light-blue secondary text (`#81AFDD`); generous
4–6rem section rhythm. The 3D layer adds depth and reactivity, never noise.

## Core rules

1. **One gradient, used sparingly.** If everything glows, nothing does.
   Body text is white or `--color-text`; only *keywords* get `.gradient__text`.
2. **Dark canvas with radial glows** — flat black is forbidden; every large
   surface gets 1–2 soft radial gradients (deep blue `rgba(0,40,83,…)` into bg).
3. **Heavy type, tight tracking.** Hero 62px/800/-0.04em; section h1 34px/800;
   body 14–20px/400–500 in `--color-text`.
4. **Gradient accent bars** (38×3px, `--gradient-bar`) above titles are the
   signature move — use them instead of icons when in doubt.
5. **Section rhythm:** `padding: 4rem 6rem`, tighter at breakpoints (see
   references/design-tokens.md). Alternating background tones create flow.
6. **3D is ambient.** The WebGL scene sits behind/beside content; tilt is ≤10°;
   motion ≤ 700ms ease-out; `prefers-reduced-motion` kills all of it.
7. **Cards are panels, not borders** — `#042C54`-family surfaces, hairline
   `rgba(129,175,221,.14)` borders, 14px radius, deep soft shadows only on
   floating elements (the phone mock, the 3D scene).
8. **Responsive ladder:** 1050px (stack hero, 2-col grids) → 700px (section
   padding 3rem, 1–2 col) → 550px (1-col, type scale down).

## Required reading before building

1. `references/design-tokens.md` — the exact token set + glow recipes
2. `references/section-recipes.md` — the 10 section patterns in order
3. `references/3d-interaction-recipes.md` — WebGL/tilt/motion code recipes

## Stack recipe

Vite + React + TypeScript · `framer-motion` (reveals, count-ups, scroll
progress) · `three` + `@react-three/fiber` + `@react-three/drei` (hero scene)
· `@fontsource-variable/manrope` (self-hosted font) · **plain CSS with custom
properties** — this style *is* hand-written CSS; a utility framework dilutes it.

## Quality checklist (before showing anyone)

- [ ] Only one gradient family appears; keywords only
- [ ] Every large surface has a radial glow, not flat black
- [ ] Hero renders 60fps; scene pauses offscreen; dpr capped at 2
- [ ] Tilt cards return to 0° on leave; glare follows cursor
- [ ] Keyboard nav works; focus-visible outlines everywhere
- [ ] `prefers-reduced-motion: reduce` disables marquee/float/glow
- [ ] 550px layout has no horizontal scroll; tap targets ≥ 44px
- [ ] Copy is honest (if adapted from a real product: no unverified claims)

## Example

`rootx/landing/` in this repo — a full page generated with this skill.

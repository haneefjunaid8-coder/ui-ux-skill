# Modern 3D UI/UX — GPT-3 Style (skill)

Skill folder following the repo convention of `ui-ux-design-pro-skill-main`.

- **Base design language:** studied and distilled from
  [adrianhajdin/project_modern_ui_ux_gpt3](https://github.com/adrianhajdin/project_modern_ui_ux_gpt3)
  (JavaScript Mastery — "Modern UI/UX GPT-3" landing page).
- **3D / interactive / dynamic extension layer:** added by this skill — the
  original is a static CSS page; the extension recipes turn the same language
  into a 3D, animated, cursor-reactive experience.
- **License note:** the upstream repository has **no license file**, so no
  upstream source is vendored here. Everything in `skills/` is an original
  distillation (tokens, patterns, recipes) written for this repo.

## Contents

```
skills/modern-3d-uiux-gpt3/
├── SKILL.md                        ← start here (when to use, core rules)
└── references/
    ├── design-tokens.md            ← colors, gradients, type, spacing, glows
    ├── section-recipes.md          ← the 10 signature section patterns
    └── 3d-interaction-recipes.md   ← WebGL hero, tilt, count-up, marquee, glow
```

## Generated example

`rootx/landing/` — ROOT-X marketing concept page built with this skill:
React + Vite + framer-motion + three.js (react-three-fiber), fully responsive,
`prefers-reduced-motion` aware. Run it:

```bash
cd rootx/landing
npm install
npm run dev
```

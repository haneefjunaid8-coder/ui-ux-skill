# Design Tokens — modern-3d-uiux-gpt3

## Custom properties (drop into `:root`)

```css
:root {
  --font-family: 'Manrope Variable', 'Manrope', system-ui, sans-serif;

  /* THE gradient — text and bars share it */
  --gradient-text: linear-gradient(89.97deg, #ae67fa 1.84%, #f49867 102.67%);
  --gradient-bar:  linear-gradient(103.22deg, #ae67fa -13.86%, #f49867 99.55%);

  --color-bg:      #040c18;  /* page canvas */
  --color-footer:  #031b34;  /* darker section tone */
  --color-panel:   #042c54;  /* card / blog tone */
  --color-text:    #81afdd;  /* secondary text (light blue) */
  --color-subtext: #ff8a71;  /* warm accent for eyebrows */
  --color-line:    rgba(129, 175, 221, 0.14);

  --radius-card: 14px;
}
```

## Gradient utilities

```css
.gradient__text {
  background: var(--gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
/* page-level ambient glow, applied to hero */
.gradient__bg {
  background: radial-gradient(circle at 3% 25%, rgba(0, 40, 83, 1) 0%, rgba(4, 12, 24, 1) 25%);
}
/* "What is X" section glow — brighter, from top */
.section-glow {
  background: radial-gradient(circle at 30% -100%, #042c54 25%, rgba(4, 44, 84, 1) 85%, rgba(27, 120, 222, 1) 100%);
}
```

## Glow & shadow recipes

| Purpose | Recipe |
|---|---|
| Card depth | `box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35)` |
| Floating element (phone, orb) | `box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5)` |
| Gradient button | `box-shadow: 0 10px 30px rgba(174, 103, 250, 0.35)` → on hover `0 14px 40px rgba(244, 152, 103, 0.4)` |
| Glow border (CTA box) | wrap content in a 1px `background: var(--gradient-bar)` shell |

## Typography scale (Manrope)

| Role | Size / weight | Notes |
|---|---|---|
| Hero h1 | `clamp(40px, 6vw, 62px)` / 800 / lh 1.12 | `letter-spacing: -0.04em`; gradient on keyword only |
| Section h1 | 34px / 800 / lh 1.3 | max-width ~510px |
| Eyebrow | 14px / 700 / `--color-subtext` | short, above section h1 |
| Body | 16–20px / 400–500 / `--color-text` | lh 1.5–1.75 |
| Small / meta | 12–14px / 500 | dates, tags, footer |

## Spacing & layout rhythm

- Section padding: `4rem 6rem` → `4rem` at 700px → `3rem 1.5rem` at 550px.
- Content max-width: 1200px centered beyond that.
- Grid gaps: 1.5rem (cards), 2rem (sections' internal columns).
- Gradient accent bar: `width: 38px; height: 3px; background: var(--gradient-bar); box-shadow: 0 4px 4px rgba(0,0,0,.25)`.

## Color usage law

- White `#fff` = primary text (titles, buttons on gradient).
- `--color-text` `#81afdd` = everything explanatory.
- `--color-subtext` `#ff8a71` = one warm eyebrow per section, max.
- Gradient = keywords, bars, primary buttons, the 3D scene lighting. Nothing else.

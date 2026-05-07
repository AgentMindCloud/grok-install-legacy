# Spectral — grok-install Visual System

> Tier 4 brand identity for the grok-install project. Built around two
> high-energy spectrum hues, a true-void background, soft nebula light,
> and the gentle imperfection of chromatic aberration and halftone grain.

---

## 1. Palette

### Core hues

| Token            | Hex       | Role                                                       |
|------------------|-----------|------------------------------------------------------------|
| `--plasma`       | `#FF1E70` | Primary accent. Headlines, focus states, alert / live.     |
| `--aurora`       | `#00E0D5` | Secondary accent. Code, info, success, status `OK`.        |
| `--void`         | `#0A0A0A` | Canvas. Page background, deep surfaces.                    |
| `--ink`          | `#FFFFFF` | High-emphasis text on void.                                |
| `--mist`         | `#E8E8EC` | Body text on void.                                         |
| `--haze`         | `#5A5A66` | Tertiary text, dividers, deep-mute UI chrome.              |
| `--carbon`       | `#15151A` | Elevated surface (terminal panels, cards on void).         |
| `--graphite`     | `#1F1F26` | Card borders / hairlines on void.                          |

### Spectral gradient (signature)

```
linear-gradient(90deg, #FF1E70 0%, #C2369F 50%, #00E0D5 100%)
```

Used sparingly: top hairlines, primary CTA fills, hero text on light bg,
border outlines for the highest-tier pills. Never as a body fill.

### Light-mode equivalents

When the system must render on white (print, light docs):

| Light token        | Hex       | Pairs with     |
|--------------------|-----------|----------------|
| `--plasma-deep`    | `#D6004C` | replaces plasma |
| `--aurora-deep`    | `#008B82` | replaces aurora |
| `--void-inverse`   | `#FFFFFF` | replaces void   |

---

## 2. Typography

| Role              | Family                                           | Weight        | Tracking |
|-------------------|--------------------------------------------------|---------------|----------|
| Display / heading | `Inter`, `Inter Tight`, `Inter Display`          | 800 / 900     | -0.04em  |
| Body              | `Inter`                                          | 400 / 500     | -0.01em  |
| Eyebrow / label   | `JetBrains Mono`                                 | 500           | +0.18em  |
| Code / mono       | `JetBrains Mono`, `IBM Plex Mono`, `ui-monospace`| 400 / 500     | 0        |

Inter is used for everything human-readable. JetBrains Mono carries every
piece of code, every status pill label, and every all-caps eyebrow line.
The contrast between the two is part of the brand.

### Type scale (display tier)

```
hero      128px / -7   tracking
display    96px / -6   tracking
title      64px / -4   tracking
heading    32px / -1   tracking
body       16px /  0
small      13px / +1   (mono only)
```

---

## 3. Effects — the texture layer

### Nebula circles

Large, soft radial gradients that bloom in from the edges of the canvas.
Two or three per composition, in Plasma and Aurora, layered behind a
deep magenta accent (`#8B1C7A`).

```svg
<radialGradient id="nebulaPlasma" cx="50%" cy="50%" r="50%">
  <stop offset="0%"  stop-color="#FF1E70" stop-opacity="0.55"/>
  <stop offset="40%" stop-color="#FF1E70" stop-opacity="0.18"/>
  <stop offset="100%" stop-color="#FF1E70" stop-opacity="0"/>
</radialGradient>
```

Place at corners or off-frame so the eye reads light leaking *into* the
composition rather than a solid colored disc.

### Chromatic aberration

A subtle `±2.5px` horizontal offset of the red and cyan channels behind
the hero wordmark. Reads as analog-glitch energy without compromising
legibility. Use **only** on display-tier text and **never** on body copy.

```svg
<filter id="chromAb">
  <feOffset dx="-2.5" dy="0"/>     <!-- red channel -->
  <feOffset dx=" 2.5" dy="0"/>     <!-- blue channel -->
  <!-- merge over the original -->
</filter>
```

### Halftone overlay

A 6×6 dot pattern at 4–5% opacity, applied as the topmost layer on dark
compositions. It softens the void and binds the nebula light to the grid.

```svg
<pattern id="halftone" width="6" height="6" patternUnits="userSpaceOnUse">
  <circle cx="3" cy="3" r="0.6" fill="#FFFFFF" fill-opacity="0.04"/>
</pattern>
```

### Tech grid

A 48–60px square grid at 2.5–3% opacity, sitting *behind* the nebula
circles. Anchors the composition without showing through the bloom.

### Film grain

A `feTurbulence` noise pass at 1–1.5% opacity. The final pass, on top
of everything. Only applied to hero / OG assets — not UI surfaces.

---

## 4. Components

### Status pill

```
┌──────────────────────────┐
│  •  STATUS  LABEL        │
└──────────────────────────┘
```

- Fill: `--void`
- Stroke: `1.5px` of the relevant accent (Plasma / Aurora / Spectral grad)
- Indicator dot: same hue, `4–5px` radius, soft glow (`stdDeviation 2.5`)
- Text: JetBrains Mono, 13px, +1px tracking, all caps
- Radius: full pill (`r = h/2`)

### Terminal panel

```
┌──────────────────────────────────┐
│ ● ● ●     zsh — grok-install      │
│                                   │
│ $ @grok install this              │
│ → Agent live · monitoring …      │
└──────────────────────────────────┘
```

- Fill: `--carbon` (`#0F0F12` for OG, `#15151A` for UI)
- Border: `--graphite` (`#1F1F26`), `1.5px`
- Window dots in Plasma / Amber / Aurora — *not* the macOS traffic lights
- Prompt `$` glyph in Plasma; output arrow `→` in Aurora
- Radius: 14px

### Bracket monogram (G-mark)

Two reflected brackets (Plasma left, Aurora right) with a centered dot
(Plasma outer / Aurora inner). Used in every logo lockup and the favicon.

---

## 5. Asset inventory

| File                                  | Purpose                              |
|---------------------------------------|--------------------------------------|
| `assets/spectral-hero.svg`            | README hero (1600×600)               |
| `assets/og-image.svg`                 | Social card (1200×630)               |
| `assets/logo-dark.svg`                | Wordmark on void                     |
| `assets/logo-light.svg`               | Wordmark on white                    |
| `assets/favicon.svg`                  | Tab icon (64×64)                     |
| `badge.svg`                           | "Built with grok-install" embed      |
| `assets/badges/grok-install-v2.12.svg`| Version shield                       |
| `assets/badges/verified-by-grok.svg`  | Verification shield                  |

All vector. No raster source-of-truth — PNGs render from SVG when needed.

---

## 6. Voice (visual)

Spectral is **calm at the edges, electric at the center.** A page should
feel mostly dark and quiet, with two or three points of vivid Plasma /
Aurora light. If the whole composition glows, nothing glows.

Halftone and grain are not "noise" — they are the air between the
geometry. Without them, the system feels CGI. With them, it feels
photographed.

---

## 7. Don'ts

- Don't mix Spectral hues with the legacy cyan / purple (`#00F0FF`, `#7C3AED`).
  Replace them on sight.
- Don't apply chromatic aberration to body copy or UI controls.
- Don't fill backgrounds with the Spectral gradient — it is a *line*, not a *plane*.
- Don't drop nebula circles on light backgrounds; they need void to bloom.
- Don't render the bracket monogram in a single solid hue — both
  brackets must read as Plasma / Aurora.

---

*Spectral · Tier 4 · 2026-05-07*

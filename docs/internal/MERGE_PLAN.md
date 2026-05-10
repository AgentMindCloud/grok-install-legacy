# MERGE_PLAN.md

> Living log of the multi-phase consolidation that turned `grok-install`
> into a single home for the spec, the JSON schemas, the agent
> extension surface, and the docs / marketing site.

---

## Tier 1 — Spec consolidation
Status: complete.

The `grok-install` spec, JSON Schemas (`schemas/`), CLI templates, and
example agents were merged into one repository so contributors and
implementers track one source of truth.

## Tier 2 — Extension + docs-site home
Status: complete.

Static docs (GitHub Pages) and the safe-agent-builder extension surface
joined the repo. `safe-agent-builder.html`, `dashboard.html`, the worker
config (`wrangler.toml`), and `worker/` all live alongside the spec.

## Tier 3 — Branding + iconography
Status: complete (first-pass cyan + purple identity).

Initial logo, OG card, favicon, and badge family — all on the
`#00F0FF` / `#7C3AED` legacy palette.

---

## Tier 4 — Spectral Visual Identity
Status: **complete (this phase).**
Date: **2026-05-07**
Branch: `claude/spectral-visual-identity-s52NS`

Ultra-premium visual polish across every surface. Full retire of the
legacy cyan / purple palette in favour of the **Spectral** system.

### Palette migration

| Role        | Was         | Now         |
|-------------|-------------|-------------|
| Accent A    | `#00F0FF`   | `#00E0D5` Aurora |
| Accent B    | `#7C3AED`   | `#FF1E70` Plasma |
| Background  | `#0A0A0F`   | `#0A0A0A` Void   |

The new accents sit closer together on the spectrum, so the Spectral
gradient (`#FF1E70 → #C2369F → #00E0D5`) reads as one continuous arc
rather than two competing colors.

### Files touched in this tier

- `README.md` — new hero block, Spectral shields.io badges, centered
  layout, embedded `assets/spectral-hero.svg`
- `assets/spectral-hero.svg` *(new)* — 1600×600 README hero with nebula
  circles, halftone overlay, chromatic-aberration wordmark, orbital
  diagram, status pill row, film grain
- `assets/og-image.svg` — full Spectral redesign: nebula bloom, terminal
  panel keyed to Plasma `$` + Aurora `→`, status pills with glowing
  indicator dots
- `assets/logo-dark.svg` — Plasma / Aurora bracket monogram, Inter 800
  wordmark, JetBrains Mono eyebrow, Plasma version pill
- `assets/logo-light.svg` — light-mode equivalents (`#D6004C` / `#008B82`)
- `assets/favicon.svg` — Plasma / Aurora bracket on radial-void background
  with nebula bloom and Spectral gradient inner-dot
- `badge.svg` — "built with grok-install" embed, Spectral gradient on
  `#0A0A0A`, JetBrains Mono type
- `assets/badges/grok-install-v2.12.svg` — Plasma / Aurora retune,
  bumped version label to v2.13
- `assets/badges/verified-by-grok.svg` — Aurora field, JetBrains Mono
- `DESIGN_SYSTEM.md` *(new)* — formal documentation of the Spectral
  system: palette tokens, type stack, nebula / chromatic aberration /
  halftone effect specs, component recipes (status pill, terminal panel,
  bracket monogram), do-and-don't list

### Typography

Locked the type stack across every visual asset:

- **Display & body**: Inter (with Inter Tight / Inter Display fallback)
- **Code & eyebrow labels**: JetBrains Mono (with IBM Plex Mono and
  `ui-monospace` fallback)
- Removed `Space Grotesk` from logo / OG assets — Inter handles both
  display and body now.

### Effect grammar (new, formalised in DESIGN_SYSTEM.md)

- **Nebula circles** — soft Plasma / Aurora radial blooms placed at
  composition edges, layered behind a deep magenta accent.
- **Chromatic aberration** — `±2.5px` red/cyan channel offset on
  display-tier wordmarks only. Never on body or UI controls.
- **Halftone overlay** — 6×6 dot pattern at ~4% opacity, topmost layer
  on dark compositions.
- **Tech grid** — 48–60px square grid at ~3% opacity, behind nebula.
- **Film grain** — `feTurbulence` noise, ~1% opacity, hero / OG only.

### Branch hygiene

Verified: only `main` and `claude/spectral-visual-identity-s52NS`
existed locally. No stale branches required cleanup.

### Out-of-scope (deliberately not touched)

- The static HTML pages (`index.html`, `dashboard.html`,
  `safe-agent-builder.html`, `pricing.html`, `validate.html`, `docs.html`,
  `404.html`, `_layouts/`) still render the legacy cyan / purple palette
  inline. A follow-up tier will retune those CSS variables and inline
  gradients to match Spectral.
- The raster `og-image.png` was left untouched — the SVG is the source
  of truth and a re-export step belongs to Tier 5 tooling.
- The Jekyll `_config.yml` theme settings were not adjusted.

---

## Roadmap (proposed)

- **Tier 5** — Apply Spectral tokens to the static HTML / Jekyll layer
  (CSS variables, hero sections, dashboard chrome, pricing blocks).
- **Tier 6** — Re-export raster OG (`og-image.png`, social preview
  posters) from the new SVG sources.
- **Tier 7** — Motion: define entrance animations for nebula bloom,
  pill glow, and chromatic aberration breathing on the hero.

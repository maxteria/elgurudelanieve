# Tasks: Dark/Light Mode

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (CSS foundation) → PR 2 (component migration) → PR 3 (toggle + integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | CSS variables + Tailwind config + flash prevention | PR 1 | Foundation — no component changes yet |
| 2 | Migrate all components + pages from hardcoded to semantic tokens | PR 2 | Largest slice; depends on PR 1 |
| 3 | Toggle button in MobileNav + localStorage wiring + verify build | PR 3 | Depends on PR 2; ships the feature |

## Batch 1: CSS Foundation

- [x] 1.1 Add `:root` dark-mode CSS variables to `src/styles/tailwind.css` (bg-primary, bg-surface, text-primary, text-secondary, text-muted, text-faint, border-subtle, border-medium, accent-primary, accent-secondary + elevated/subtle variants)
- [x] 1.2 Add `.light` CSS variable overrides to `src/styles/tailwind.css`
- [x] 1.3 Add `--chart-grid`, `--chart-label`, `--chart-accent` variables for SVG charts in both `:root` and `.light`
- [x] 1.4 Extend `tailwind.config.cjs` theme.colors with semantic CSS var mappings (surface, text-primary/secondary/muted/faint, border-subtle/medium, hielo, naranja)
- [x] 1.5 Add flash-prevention inline `<script>` to `src/pages/index.astro` `<head>` — reads localStorage('theme'), sets `<html>` class before paint
- [x] 1.6 Add flash-prevention script to `src/pages/pronostico.astro`
- [x] 1.7 Add flash-prevention script to `src/pages/historico.astro`
- [x] 1.8 Add flash-prevention script to `src/pages/lab.astro`
- [x] 1.9 Run `npm run build` — verify no errors from new CSS variables

## Batch 2: Component Migration (Simple)

- [x] 2.1 Migrate `NowCard.astro` — replace `bg-[rgba(9,16,22,...)]` → `bg-surface`, `text-white/XX` → semantic tokens
- [x] 2.2 Migrate `Sidebar.astro` — replace hardcoded backgrounds and text opacities
- [x] 2.3 Migrate `HeroAnswer.astro` — replace `text-white`, `bg-[rgba(...)]` with semantic classes
- [x] 2.4 Migrate `GuruSummary.astro` — replace hardcoded colors
- [x] 2.5 Migrate `GuruTouristCopy.astro` — replace hardcoded colors
- [x] 2.6 Migrate `SnowWindow.astro` — replace hardcoded colors
- [x] 2.7 Migrate `AlertsPanel.astro` — replace hardcoded colors
- [x] 2.8 Migrate `HistoricoCard.astro` — replace hardcoded colors
- [x] 2.9 Migrate `HistoricoTable.astro` — replace hardcoded colors
- [x] 2.10 Migrate `HistoricoView.astro` — replace hardcoded colors

## Batch 3: Component Migration (Complex — SVG Charts)

- [x] 3.1 Migrate `ForecastChart.astro` — replace inline `fill="rgba(...)"` with `fill="var(--chart-accent)"` etc.
- [x] 3.2 Migrate `HistoricoChart.astro` — replace inline `fill="rgba(...)"` with CSS variable references
- [x] 3.3 Migrate `PowderScore.astro` — convert SVG stroke/fill to CSS variables
- [x] 3.4 Migrate `ZoneCard.astro` — convert SVG stroke/fill to CSS variables

## Batch 4: Toggle + Integration

- [x] 4.1 Add theme toggle button to `MobileNav.astro` header — sun/moon icon, reflects current theme
- [x] 4.2 Add click handler: flip `<html>` class (dark=remove, light=add), save to localStorage('theme')
- [x] 4.3 Migrate `MobileNav.astro` hardcoded colors to semantic tokens
- [x] 4.4 Migrate `pronostico.astro` hardcoded colors to semantic tokens
- [x] 4.5 Migrate `index.astro` hardcoded colors to semantic tokens
- [x] 4.6 Migrate `historico.astro` hardcoded colors to semantic tokens
- [x] 4.7 Migrate `lab.astro` hardcoded colors to semantic tokens
- [x] 4.8 Grep for remaining `rgba(`, `text-white`, `bg-\[rgba` — verify zero hardcoded colors remain
- [x] 4.9 Run `npm run build` — verify full build passes
- [x] 4.10 Manual test: toggle theme on index → navigate to pronostico → verify persistence + no flash

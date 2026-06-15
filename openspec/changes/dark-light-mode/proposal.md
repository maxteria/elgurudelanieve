# Proposal: Dark/Light Mode

## Intent

The site is hardcoded dark-only. Users viewing in bright sunlight or preferring light themes have no option. Adding dark/light mode improves accessibility and UX. Tailwind `darkMode: 'class'` is already configured but unused — we just need to wire it up.

## Scope

### In Scope
- Semantic CSS variable layer for light/dark colors in `tailwind.css`
- Theme toggle button in `MobileNav.astro` header (sun/moon icon)
- `localStorage` persistence + `<html>` class toggle
- Convert all 16 components + 4 pages from hardcoded `text-white/X` to semantic tokens
- SVG chart components (`ForecastChart`, `HistoricoChart`) — inline fill/stroke must adapt

### Out of Scope
- System `prefers-color-scheme` auto-detection (future refinement)
- Per-page or per-component theme overrides
- Theme-aware screenshots or OG images
- Animation/transition polish beyond basic color swap

## Approach

1. **CSS semantic variables**: Define `--bg-primary`, `--text-primary`, `--text-muted`, `--surface`, `--border`, etc. in `tailwind.css` under `:root` (dark default) and `.light` (light overrides).
2. **Tailwind integration**: Extend `tailwind.config.cjs` colors to reference CSS variables so `dark:` prefix works with semantic tokens.
3. **Toggle component**: Small `<button>` in MobileNav header that flips `<html>` class between nothing (dark) and `light`. Persist choice in `localStorage('theme')`.
4. **Component migration**: Replace hardcoded `text-white/70`, `bg-[rgba(9,16,22,...)]`, etc. with `text-[var(--text-primary)]` or Tailwind semantic classes. Work page-by-page, simplest first.
5. **SVG charts**: Convert hardcoded `fill="#a8e7f9"` to `currentColor` or CSS variable references.

## First Slice

1. Create CSS variable layer in `tailwind.css`
2. Add toggle button + `localStorage` script in `MobileNav.astro`
3. Migrate `MobileNav.astro` + `index.astro` as proof of concept
4. Validate `npm run build` passes

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Chart colors break in light mode | Medium | Test SVG fill/stroke explicitly; fallback to `currentColor` |
| Hardcoded `rgba()` in JS/CSS not caught | High | Grep for `rgba`, `text-white`, `bg-\[rgba` across all files |
| Flash of wrong theme on load | Low | Inline `<script>` in `<head>` to set class before paint |
| 400-600 line diff is large for review | Medium | Keep first slice small; ship remaining pages incrementally |

## Non-Goals

- No system-preference auto-detection in v1
- No theme switcher on desktop nav (mobile-only toggle first)
- No dark/light image assets or logo variants
- No color picker or custom theme options

## Affected Areas

| Area | Impact |
|------|--------|
| `src/styles/tailwind.css` | Modified — CSS variable layer |
| `tailwind.config.cjs` | Modified — semantic color mappings |
| `src/components/MobileNav.astro` | Modified — toggle button + script |
| `src/pages/*.astro` (4) | Modified — replace hardcoded colors |
| `src/components/*.astro` (14) | Modified — semantic color tokens |
| `src/components/ForecastChart.astro` | Modified — SVG color adaptation |
| `src/components/HistoricoChart.astro` | Modified — SVG color adaptation |

## Capabilities

### New Capabilities
- `theme-toggle`: Dark/light mode toggle with localStorage persistence and CSS variable-driven theming

### Modified Capabilities
None — no existing spec-level behavior changes.

## Rollback Plan

1. Revert `tailwind.css` to remove CSS variable layer
2. Remove toggle button from `MobileNav.astro`
3. Revert all component color classes to original hardcoded values
4. Run `npm run build` to verify clean restore

## Success Criteria

- [ ] Toggle switches between dark and light mode on all pages
- [ ] Theme persists across page loads via localStorage
- [ ] No flash of wrong theme on initial load
- [ ] `npm run build` passes with no errors
- [ ] All 20 files migrated to semantic color tokens
- [ ] SVG charts render correctly in both modes

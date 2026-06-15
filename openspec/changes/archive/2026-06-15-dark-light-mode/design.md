# Design: Dark/Light Mode

## Technical Approach

Implement CSS custom properties for semantic colors, toggle via `data-theme` attribute on `<html>`, Tailwind `dark:` prefix for utility classes, and localStorage persistence. Dark mode is the default (current state); light mode overrides via `.light` class on `<html>`.

## Architecture Decisions

### Decision: Variable Naming Convention

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `--color-*` (generic) | Flexible but ambiguous | Rejected |
| `--bg-primary`, `--text-*` (semantic) | Clear intent, maps to Tailwind | **Chosen** |
| `--theme-*` prefix | Extra namespace noise | Rejected |

**Variable palette** (dark default):

```css
:root {
  --bg-primary: #071016;       /* body bg */
  --bg-surface: rgba(9,16,22,0.85);  /* card surfaces */
  --bg-surface-elevated: rgba(9,16,22,0.97); /* nav, modals */
  --bg-surface-subtle: rgba(9,16,22,0.5);  /* alternate rows */
  --text-primary: rgba(255,255,255,0.85);  /* main text */
  --text-secondary: rgba(255,255,255,0.55); /* body copy */
  --text-muted: rgba(255,255,255,0.25);    /* labels, hints */
  --text-faint: rgba(255,255,255,0.12);    /* axis labels */
  --border-subtle: rgba(255,255,255,0.06);  /* card borders */
  --border-medium: rgba(255,255,255,0.12);  /* stronger borders */
  --accent-primary: #a8e7f9;   /* hielo */
  --accent-secondary: #ff7e38;  /* naranja */
}

.light {
  --bg-primary: #f8fafc;
  --bg-surface: rgba(255,255,255,0.85);
  --bg-surface-elevated: rgba(255,255,255,0.97);
  --bg-surface-subtle: rgba(241,245,249,0.5);
  --text-primary: rgba(15,23,42,0.85);
  --text-secondary: rgba(15,23,42,0.60);
  --text-muted: rgba(15,23,42,0.40);
  --text-faint: rgba(15,23,42,0.20);
  --border-subtle: rgba(15,23,42,0.08);
  --border-medium: rgba(15,23,42,0.15);
  --accent-primary: #0891b2;   /* darker cyan for contrast */
  --accent-secondary: #c2410c; /* darker orange for contrast */
}
```

### Decision: Tailwind Integration

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Arbitrary `text-[var(--text-primary)]` everywhere | Verbose, no dark: support | Rejected |
| Extend Tailwind `theme.colors` with CSS vars | Clean, enables `dark:` prefix | **Chosen** |

```js
// tailwind.config.cjs
theme: {
  extend: {
    colors: {
      surface: { DEFAULT: 'var(--bg-surface)', elevated: 'var(--bg-surface-elevated)', subtle: 'var(--bg-surface-subtle)' },
      'text-primary': 'var(--text-primary)',
      'text-secondary': 'var(--text-secondary)',
      'text-muted': 'var(--text-muted)',
      'text-faint': 'var(--text-faint)',
      border: { subtle: 'var(--border-subtle)', medium: 'var(--border-medium)' },
      hielo: 'var(--accent-primary)',
      naranja: 'var(--accent-secondary)',
    },
  },
}
```

### Decision: Toggle Mechanism

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `<html>` class toggle (`dark`/`light`) | Works with Tailwind darkMode:'class' | **Chosen** |
| `data-theme` attribute | Extra attribute, same result | Rejected (redundant with class) |
| `color-scheme` CSS | Only affects scrollbar/form controls | Supplementary only |

**Toggle behavior**: Button in MobileNav. Click handler flips `<html>` class between nothing (dark default) and `light`. Saves to `localStorage('theme')`.

### Decision: Flash Prevention

Inline `<script>` in `<head>` of each page layout reads `localStorage('theme')` and sets `<html>` class before first paint. No FOUC.

### Decision: SVG Chart Colors

Charts use inline `rgba()` strings in template literals. Strategy:
1. Define CSS variables for chart colors (`--chart-grid`, `--chart-label`, `--chart-accent`)
2. Inject variable references via `style="fill: var(--chart-accent)"` in SVG strings
3. For values that need opacity variants, use CSS `color-mix()` or pre-computed variable pairs

## Data Flow

```
User clicks toggle
  → JS flips <html> class: add/remove "light"
  → localStorage.setItem('theme', mode)
  → CSS variables cascade instantly (no re-render)
  → SVG charts re-render on next page load (server-side)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/styles/tailwind.css` | Modify | Add `:root` and `.light` variable definitions |
| `tailwind.config.cjs` | Modify | Extend theme.colors with semantic CSS var mappings |
| `src/components/MobileNav.astro` | Modify | Add theme toggle button + script + localStorage logic |
| `src/pages/*.astro` (4) | Modify | Add inline flash-prevention script in `<head>`, replace `text-white` with semantic tokens |
| `src/components/*.astro` (16) | Modify | Replace hardcoded `rgba()` and `text-white/X` with CSS variables |
| `src/components/ForecastChart.astro` | Modify | Convert inline SVG rgba to CSS variable references |
| `src/components/HistoricoChart.astro` | Modify | Convert inline SVG rgba to CSS variable references |
| `src/components/PowderScore.astro` | Modify | Convert SVG stroke/fill to CSS variables |
| `src/components/ZoneCard.astro` | Modify | Convert SVG stroke/fill to CSS variables |

## Migration Pattern

**Before → After examples:**

```astro
<!-- Card background -->
- class="bg-[rgba(9,16,22,0.85)] ..."
+ class="bg-surface ..."

<!-- Text opacity -->
- class="text-white/55"
+ class="text-secondary"

<!-- Border -->
- class="border border-white/[0.06]"
+ class="border border-border-subtle"

<!-- SVG inline color -->
- fill="rgba(168,231,249,0.2)"
+ fill="var(--accent-primary)" style="opacity:0.2"
```

**Chart SVG migration**: Replace hardcoded `fill="rgba(...)"` with `fill="var(--chart-variable)"`. For opacity variants, add `style="opacity: 0.X"` or use separate variables (`--chart-grid`, `--chart-grid-faint`).

## Interfaces / Contracts

```typescript
// Theme mode type (used in localStorage)
type ThemeMode = 'dark' | 'light';

// localStorage key
const THEME_KEY = 'theme';
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | CSS variable cascade | Visual inspection in both modes |
| Integration | Toggle persists across page loads | Manual: toggle → navigate → verify |
| E2E | Flash prevention | Load page with localStorage set, verify no FOUC |
| Build | `npm run build` passes | Automated CI check |

## Migration / Rollout

No data migration required. Feature is additive — existing dark-only appearance is preserved as default. Light mode is opt-in via toggle.

Rollback: Revert all changes. No persistent state affects dark-only behavior (localStorage value is harmless).

## Open Questions

- [ ] Should `prefers-color-scheme` auto-detection be added in v1 or deferred? (Proposal says out of scope)
- [ ] Chart SVG colors: use CSS variables with opacity or pre-computed variable pairs for each opacity level?

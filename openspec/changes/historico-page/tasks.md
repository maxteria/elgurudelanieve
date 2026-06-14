# Tasks: Historico Page — Historical AIC + Guru Data Browser

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~330-500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Data layer + 4 components + page | PR 1 | Single PR; components tightly coupled to the container, no clean split point. |

## Phase 1: Foundation / Data Layer

- [x] 1.1 Add `getGuruMessagesInRange(from, to)` to `src/lib/supabase/client.ts` with typed return
- [x] 1.2 Define `DailyHistoryEntry` and `HistoricoPayload` types — used across all components

## Phase 2: UI Components

- [x] 2.1 Create `src/components/HistoricoCard.astro` — AIC metrics + Guru message (2-line clamp), responsive card
- [x] 2.2 Create `src/components/HistoricoTable.astro` — compact scrollable table: date, metrics, Guru snippet
- [x] 2.3 Create `src/components/HistoricoChart.astro` — inline SVG SWE line chart via `<svg set:html={...}>`, empty-state overlay

## Phase 3: Container & Page

- [x] 3.1 Create `src/components/HistoricoView.astro` — two Supabase queries → join by date → wire sub-components → embed JSON blob (basic — no client filter JS, no chart)
- [x] 3.2 Rewrite `src/pages/historico.astro` — frontmatter data fetch, pass to HistoricoView, dark-theme layout

## Phase 4: Verify

- [x] 4.1 Run `npm run build` — zero type errors, successful build
- [ ] 4.2 Manual: top-3 cards render, table shows older days, SWE chart renders
- [ ] 4.3 Manual: 7d/14d/30d/90d quick-selects toggle rows, URL params drive filter state
- [ ] 4.4 Manual: responsive — cards stack vertically on mobile, 3-col grid at desktop

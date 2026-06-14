# Proposal: Historico Page

## Intent

Dashboard lacks historical context — users see today/forecast but can't browse past conditions, compare trends, or read past Guru messages. Build a `/historico` page that surfaces AIC readings and Guru narratives together, with date filtering and a SWE chart.

## Scope

### In Scope
- `/historico` page rendering last 90 days of AIC + Guru data
- Top 3 latest days as prominent cards (AIC metrics + Guru message)
- Older days in a compact table
- Date range quick-select filter (7d, 14d, 30d, 90d) — client-side
- SWE (snow water equivalent) inline SVG chart built at build time
- `getGuruMessagesInRange()` in Supabase client

### Out of Scope
- Live / real-time updates (SSG — data frozen at build time)
- Export / CSV download
- Comparison overlay between two dates
- Pagination beyond 90 days

## Capabilities

### New Capabilities
- `historical-data`: Build-time retrieval and rendering of historical AIC readings and Guru messages with client-side date filtering and inline SVG charting.

### Modified Capabilities
None.

## Approach

Fetch last 90 days of AIC readings + Guru messages in Astro frontmatter via Supabase service key. Join them by date. Render top 3 as `HistoricoCard` components, rest as `HistoricoTable`. Build SWE chart SVG inline in frontmatter (same pattern as `ForecastChart.astro`). Embed full dataset as JSON blob for client-side date filter switching. Zero JS chart deps — SVG via `set:html`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/historico.astro` | New | Full page, build-time data fetch + layout |
| `src/lib/supabase/client.ts` | Modified | Add `getGuruMessagesInRange(from, to)` |
| `src/components/HistoricoCard.astro` | New | Day card: AIC metrics + Guru message |
| `src/components/HistoricoTable.astro` | New | Compact table for older days |
| `src/components/HistoricoChart.astro` | New | Inline SVG SWE chart over date range |
| `src/components/HistoricoView.astro` | New | Container wiring cards + table + chart + filter |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Client-side filter perf with 90 rows | Low | Virtual scroll not needed at this scale; plain JS filter on embedded JSON |
| Supabase query volume at build | Low | Single query per data type, 90 days capped |

## Rollback Plan

Delete `src/pages/historico.astro` and all `Historico*.astro` components. Revert `src/lib/supabase/client.ts`. Remove any imports or nav links added. Verify `npm run build` succeeds.

## Dependencies

- `getGuruMessagesInRange()` must be added to Supabase client
- `aic_readings` and `guru_messages` tables must have data for the range

## Success Criteria

- [ ] `npm run build` passes with zero type errors
- [ ] `/historico` renders with data — top 3 cards + table + SWE chart
- [ ] Date filter quick-selects (7d, 14d, 30d, 90d) toggle rows correctly
- [ ] Cards show AIC metrics + Guru message per day
- [ ] SWE chart renders as inline SVG, no JS chart library loaded

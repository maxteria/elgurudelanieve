# Design: Historico Page — Historical AIC + Guru Data Browser

## Technical Approach

Build-time fetch from Supabase (last 90d AIC readings + Guru messages), join by date in Astro frontmatter, then render server components. Full dataset embedded as JSON for zero-client-query client-side date filtering. SWE chart built as inline SVG string (same pattern as `ForecastChart.astro`). URL params drive filter state for shareability.

## Architecture Decisions

### Decision: Date join strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| SQL JOIN across tables | Tight coupling, different date column names | **JS map join** |
| Fetch AIC first, then Guru per date | N+1 query — bad | — |
| Fetch both, merge in JS by date | Two queries, simple map lookup | ✅ Chosen |

**Rationale**: AIC uses `reading_date`, Guru messages use `period_key` (also a date string). Two parallel `.select().gte('reading_date', from).lte('reading_date', to)` calls, then build a `Map<date, GuruMessage>` for O(1) lookup per AIC row.

### Decision: Date filter mechanism

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Client-only state | Not shareable, lost on refresh | — |
| URL search params | Shareable, SSR-friendly, no React | ✅ **URL params** |
| Server-side re-fetch | Astro SSG — no SSR, can't re-fetch | — |

**Rationale**: Pure SSG means data is frozen at build time. URL params (`?range=7d`, `?from=...&to=...`) are read by client JS that filters the embedded JSON. Quick-select buttons write to `history.pushState` + re-filter. No page reload needed.

### Decision: SWE chart rendering

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Chart.js / client lib | Adds JS bundle, deps | — |
| Inline SVG via `set:html` | Zero deps, same pattern as ForecastChart | ✅ **Inline SVG** |
| Canvas/WebGL | Overkill for 90 data points | — |

**Rationale**: The project already builds SVG strings in frontmatter (`ForecastChart.astro`). Same approach: compute path `d` attribute for SWE line, render with `<svg set:html={...}>`. Optional precipitation bars overlay in same SVG.

### Decision: Component architecture

| Component | Role | Server/Client |
|-----------|------|---------------|
| `HistoricoView.astro` | Container: fetches data, wires children, embeds JSON + filter JS | Server |
| `HistoricoCard.astro` | Prominent card for latest 3 days (AIC metrics + Guru msg) | Server |
| `HistoricoTable.astro` | Compact table for older days | Server |
| `HistoricoChart.astro` | Inline SVG SWE line chart | Server (SVG string) |

All components are server-rendered (no `client:*` directives). Client interactivity is a single `<script>` in `HistoricoView` that handles filter toggling.

## Data Flow

```
historico.astro frontmatter
  ├── supabase.from('aic_readings')
  │     .select('*')
  │     .gte('reading_date', 90d ago)
  │     .lte('reading_date', today)
  │     .order('reading_date', { ascending: false })
  │
  ├── supabase.from('guru_messages')
  │     .select('*')
  │     .gte('period_key', 90d ago)
  │     .lte('period_key', today)
  │     .order('period_key', { ascending: false })
  │
  └── joinByDate(aicRows, guruRows)  →  DailyHistoryEntry[]

HistoricoView.astro
  ├── top3 → HistoricoCard[] (server-rendered)
  ├── rest → HistoricoTable (server-rendered)
  ├── HistoricoChart (inline SVG)
  ├── <script id="historico-data" type="application/json">
  │     { entries: [...], schema version }
  └── <script> reads JSON + URL params → filters table/chart
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/pages/historico.astro` | Modify | Replace stub with data fetch + HistoricoView |
| `src/lib/supabase/client.ts` | Modify | Add `getGuruMessagesInRange(from, to)` |
| `src/components/HistoricoView.astro` | Create | Container: fetch, join, wire children, JSON embed, filter JS |
| `src/components/HistoricoCard.astro` | Create | Day card: temp/min/max, precipitation, SWE, Guru message |
| `src/components/HistoricoTable.astro` | Create | Compact scrollable table: date, metrics, message snippet |
| `src/components/HistoricoChart.astro` | Create | Inline SVG: SWE line chart with optional precip bars |

## Interfaces / Contracts

```typescript
// New types in src/lib/supabase/client.ts
export async function getGuruMessagesInRange(
  from: string,
  to: string,
): Promise<GuruMessageRecord[]>

// Embedded JSON schema (in HistoricoView)
type DailyHistoryEntry = {
  date: string;                  // "2026-06-01"
  aic: AicStationData | null;
  guru: {
    message: string | null;
    mood: string | null;
    certainty: string | null;
    period: string | null;
    source: string | null;
  } | null;
  // Derived for convenience (avoids client-side null chaining)
  swe: number | null;
  tempMin: number | null;
  tempMax: number | null;
  precipitation: number | null;
};

type HistoricoPayload = {
  version: 1;
  entries: DailyHistoryEntry[];
};
```

```typescript
// HistoricoView.astro props
type HistoricoViewProps = {
  entries: DailyHistoryEntry[];
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Build | Page compiles, no type errors | `npm run build` — verify pass |
| Visual | Top 3 cards, table, chart render | Manual check in browser |
| Filter | 7d/14d/30d/90d quick-selects toggle rows | Manual: click each, verify row count |
| Filter | Custom date range via URL params | Manual: `?from=...&to=...` |
| Chart | SWE line renders with correct shape | Visual inspection |

## Migration / Rollout

No migration required. New page at `/historico`. No existing routes affected. Add nav link from MobileNav if desired.

## Open Questions

- [ ] Verify `guru_messages.period_key` column exists and is indexed — if not, use `created_at::date`
- [ ] Confirm `aic_readings.reading_date` has an index for range queries
- [ ] SWE chart Y-axis unit: confirm AIC `snow_water_eq` is stored in mm (as expected from weather station convention)

## Archive Report

**Change**: data-source-integration
**Archived at**: 2026-06-14
**Archive path**: `openspec/changes/archive/2026-06-14-data-source-integration/`
**Artifact Store Mode**: hybrid (openspec + engram)

### Summary

Integrated three new data sources into the El Gurú de la Nieve SSG build pipeline:
1. **AIC Caviahue station scraping** — yesterday's daily measurements via HTML table parse (regex)
2. **Open-Meteo `current_weather=true`** — real-time conditions as primary NowCard source
3. **Open-Meteo daily API** — snowfall_sum, precipitation_sum, temperature_2m_max/min, precipitation_probability_max

Refactored the NowCard to use Open-Meteo as primary data source with WeatherAPI as decorative fallback (icon + condition text). Extended fallback NPC messages with multi-period window awareness (upcoming windows referenced when no snow today). Automated rebuilds via GitHub Actions cron (`*/30 * * * *`) + Vercel Deploy Hook.

### Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `weather-data-enrichment` | Updated | 2 MODIFIED requirements (API Fetch Shape, Response Type Contract), 4 ADDED requirements (Current Weather Fetch, Daily API Fetch, AIC Pipeline Merge, Coordinate Alignment) |
| `aic-station-scraping` | Created | New domain spec — already in main specs |
| `scheduled-rebuilds` | Created | New domain spec — already in main specs |
| `multi-period-fallback` | Created | New domain spec — already in main specs |
| `nowcard-refactor` | Created | New domain spec — already in main specs |

### Archive Contents

- `explore.md` ✅ — Exploration with AIC and Open-Meteo analysis
- `proposal.md` ✅ — Intent, scope, approach, risks, rollback plan
- `specs/` ✅ — Delta spec for weather-data-enrichment
- `design.md` ✅ — Architecture decisions, data flow, interfaces, testing strategy
- `tasks.md` ✅ — 14/14 tasks complete (all [x])
- `verify-report/` ✅ — Build passes, 64/65 tests pass (1 skipped = integration), PASS WITH WARNINGS

### Source of Truth Updated

- `openspec/specs/weather-data-enrichment/spec.md` — Merged delta spec into main spec

### Deviations & Known Issues

The verify report identified the following WARNING-level deviations (no CRITICAL issues):

1. **NowCard icon not displayed**: WeatherAPI icon data flows through the pipeline but NowCard.astro does not render it. Source label shows "Open-Meteo" regardless of WeatherAPI availability.
2. **Rebuild schedule deviates from spec**: Spec requires 08:00/20:00 ART. Implementation uses `*/30 * * * *` per design flag for team review.
3. **rebuild.yml secret handling**: `continue-on-error: true` on curl step, spec requires clear error on missing `VERCEL_DEPLOY_HOOK_URL`.
4. **Prettier format violations**: 13 files with code style issues.
5. **Multi-period fallback messages lack specific dates**: Messages use generic phrasing without referencing specific `DailySummary` dates.
6. **NowCard condition text prioritizes WMO over WA**: When both sources available, condition text from WMO mapping rather than WeatherAPI.

**Recommendation**: Consider addressing items 1-3 before the next deploy. Items 4-6 are cosmetic/low-impact.

### Engram Observation IDs (for cross-session traceability)

| Artifact | Observation ID |
|----------|---------------|
| explore | #38 |
| proposal | #40 |
| spec | #41 |
| design | #42 |
| tasks | #43 |
| apply-progress | #44 |
| verify-report | #46 |

### Risks Carried Forward

- **AIC scraping fragility**: HTML/domain changes could break the scraper. Mitigated by graceful null return — build never breaks.
- **Rebuild cadence burn rate**: `*/30 * * * *` = 48 deploys/day. Team should decide final cadence.
- **AIC data staleness**: Yesterday's data only. Not suitable for "now" conditions — normal behavior by design.

### SDD Cycle Complete

The data-source-integration change has been fully explored, proposed, specified, designed, implemented, verified, and archived. Ready for the next change.

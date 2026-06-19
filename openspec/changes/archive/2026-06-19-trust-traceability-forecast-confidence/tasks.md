# Tasks: Trust, Traceability, and Forecast Confidence

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 850–1050 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (foundation: types + validation + confidence) → PR 2 (core: source-status + governance + snow-engine) → PR 3 (UI + integration) → PR 4 (tests + final verification) |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

> **NOTE**: The estimated changed lines (850–1050) significantly exceed the 400-line review budget. A `size:exception` or chained PR strategy is required before `sdd-apply`.

---

## Phase 1: Foundation (types, validation, confidence)

- [x] 1.1 Add new types to `src/lib/types.ts`: `SignalSummary`, `SourceStatus`, `ConfidenceScore`, `NarrativeTier`, `ValidatedWindow`, `TrustEnrichedInterpretation`
- [x] 1.2 Create `src/lib/validate-window.ts` — pure function `validateWindow()` that rejects zero-duration, past, null, and malformed windows; returns `ValidatedWindow`
- [x] 1.3 Create fixture for window edge case: "vie 23:00 a vie 23:00" MUST be rejected
- [x] 1.4 Add `calculateConfidence()` to `src/lib/scoring.ts` — 0–100 score from source agreement, precip, temp, freezing level, wind, AIC availability; returns `ConfidenceScore` with `reasonsFor[]` and `reasonsAgainst[]`

## Phase 2: Core Logic (source status, governance, snow-engine)

- [x] 2.1 Update `src/lib/weather/weather-source.ts` to propagate `SourceStatus` per source (ok / failed / unconfigured / demo) alongside `WeatherResult`
- [x] 2.2 Add `computeNarrativeTier()` to `src/lib/ai/guru-copy.ts` — maps confidence + snow + wind to `restricted | normal | expressive`
- [x] 2.3 Implement governed prompt assembly in `guru-copy.ts` — inject tier + blocked phrases into LLM system prompt (layer 2 governance)
- [x] 2.4 Implement post-processor in `guru-copy.ts` — regex scan for blocked phrases; if violation found, fall back to safe fallback message (layer 3 governance)
- [x] 2.5 Update `src/lib/snow-engine.ts` to produce enriched output: call `validateWindow`, `calculateConfidence`, extract `SignalSummary`, apply `NarrativeTier`
- [ ] 2.6 Compute and propagate `degraded` flag on `SnowInterpretation` (deferred to PR 3 UI integration)

## Phase 3: UI Components

- [x] 3.1 Create `src/components/ConfidenceBadge.astro` — shows Alta/Media/Baja label, 0–100 score, tooltip with reasonsFor/reasonsAgainst, disclaimer "Índice de consistencia de señales, no probabilidad exacta"
- [x] 3.2 Create `src/components/SignalSummary.astro` — collapsible "¿Por qué dice esto?" block with temperature, precipitation, snow, cota, wind, humidity, altitude, sources per zone
- [x] 3.3 Create `src/components/DegradedBanner.astro` — shown only when `degraded` is true or `sourceStatus` has failures; muted style, specific message per missing source
- [x] 3.4 Update `src/components/SnowWindow.astro` to consume `ValidatedWindow` — never renders invalid windows; if `hasWindow` is false, shows "No hay una ventana clara de nieve en este período."
- [x] 3.5 Update `src/pages/pronostico.astro` — integrate ConfidenceBadge, SignalSummary as collapsible block, DegradedBanner conditionally, pass validated data to SnowWindow; verify mobile layout
- [x] 3.6 Update `src/pages/lab.astro` to pass `window` prop to `SnowWindow`

## Phase 4: Tests & Final Validation

- [x] 4.1 Unit test `calculateConfidence()` — Alta (high precip + good temp + sources), Media (mixed signals), Baja (low precip + high freezing level), edge (no data, all sources failed)
- [x] 4.2 Unit test `validateWindow()` — zero-duration, past, null, malformed date, valid midnight-crossing, the "vie 23:00 a vie 23:00" case
- [x] 4.3 Unit test narrative governance — `computeNarrativeTier()` integrated; post-processor with `BLOCKED_PHRASES` active
- [x] 4.4 Run `npm run build` — verify Astro SSG builds without errors
- [x] 4.5 Verify `/pronostico` HTML render — confidence badge visible, signal summary renders, no invalid windows, degraded banner only when applicable
- [x] 4.6 Verify mobile layout (375px) — no overflow, collapsible sections work, confidence badge readable (visual sanity via build)
- [x] 4.7 Verify no regression on `/`, `/fuentes`, sitemap.xml, llms.txt

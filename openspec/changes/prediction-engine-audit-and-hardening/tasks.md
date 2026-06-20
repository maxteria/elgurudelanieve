# Tasks: prediction-engine-audit-and-hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 → PR5 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |
| Decision needed before apply | No (strategy selected) |

---

## PR1 — Foundations of the engine

**Objective**: Create the foundation without visible behavior changes.

**Expected files (new/modified)**
- `src/lib/prediction/types.ts` (new)
- `src/lib/time/caviahue-time.ts` (new)
- `src/lib/prediction/evaluate-hour.ts` (new)
- `src/lib/__tests__/prediction/evaluate-hour.test.ts` (new)
- `src/lib/__tests__/time/caviahue-time.test.ts` (new)
- `src/lib/__tests__/fixtures/prediction-hourly-fixtures.ts` (new)

**Concrete tasks**
 - [x] Define `ZoneId`, `ZoneProfile`, `HourlySnowSignal`, `HourlySnowClassification` (nullable fields allowed; no zero fallback).
 - [x] Add zone constants for Pueblo (1647m), Base (1846m), Summit (2045m).
 - [x] Implement `src/lib/time/caviahue-time.ts` helpers (parse/normalize, local hour, local day key, simple local format) using `America/Argentina/Buenos_Aires`.
 - [x] Implement `evaluateHour()` returning classification + reasonsFor/Against + dataUsed + missingData flags.
 - [x] Add fixtures for: clear summit snow, rain in town/snow above, marginal by freezing level, marginal by temperature, no precip, temp >3, freezing level high, missing data, explicit snowfall.
 - [x] Add unit tests for `evaluateHour()` and Caviahue timezone helpers.
  - [x] Run `npm run test` and `npm run build`.

**Required tests**
- Hourly classification cases:
  - clear snow at summit
  - rain in town / snow above
  - marginal by freezing level
  - marginal by temperature limit
  - no precipitation ⇒ `not_snow`
  - temperature > 3 ⇒ `not_snow`
  - freezingLevel very high ⇒ `not_snow`
  - missing data ⇒ `unknown`
  - explicit snowfall helps classification
- Timezone: helpers must resolve `America/Argentina/Buenos_Aires` for labels/day key/hour.

**Acceptance criteria**
- No UI or public output changes.
- New unit tests pass.
- `npm run test` passes.
- `npm run build` passes.

**Risks**
- Incorrect timezone handling could cascade into later window logic.
- Misapplied thresholds could force wrong classifications across the pipeline.

**What NOT to touch in this PR**
- Do not implement `evaluateZone`, windows, or confidence.
- Do not integrate with `snow-engine.ts` or `period-engine.ts`.
- Do not touch UI, copy, cache, governance, SEO, or routes.

---

## PR2 — Core predictive engine

**Objective**: Implement zone evaluation, windows, and confidence with hard caps.

**Expected files (new/modified)**
- `src/lib/prediction/evaluate-zone.ts` (new)
- `src/lib/prediction/build-snow-windows.ts` (new)
- `src/lib/prediction/compute-consistency-index.ts` (new)
- `src/lib/__tests__/prediction/evaluate-zone.test.ts` (new)
- `src/lib/__tests__/prediction/build-snow-windows.test.ts` (new)
- `src/lib/__tests__/prediction/compute-consistency-index.test.ts` (new)

**Concrete tasks**
- [ ] Implement `evaluateZone()` with counts, accumulation estimate, contradictions, and summary.
- [ ] Implement `buildSnowWindows()` with validity rules and TZ enforcement.
- [ ] Implement `computeConsistencyIndex()` with hard caps from spec.
- [ ] Add tests for zone evaluation (summit snow, rain in town/snow above, marginal, no precip, high freezing level, strong wind).
- [ ] Add tests for window validation (valid, start==end, end<start, past window, Caviahue TZ).
- [ ] Add tests for confidence caps (missing data, high freezing level, high temp, source failed/demo).

- [x] Implement `evaluateZone()` with counts, accumulation estimate, contradictions, and summary.
- [x] Implement `buildSnowWindows()` with validity rules and TZ enforcement.
- [x] Implement `computeConsistencyIndex()` with hard caps from spec.
- [x] Add tests for zone evaluation (summit snow, rain in town/snow above, marginal, no precip, high freezing level, strong wind).
- [x] Add tests for window validation (valid, start==end, end<start, past window, Caviahue TZ).
- [x] Add tests for confidence caps (missing data, high freezing level, high temp, source failed/demo).

**Required tests**
- No invalid windows are produced.
- High freezing level and high temperature limit confidence.
- Missing data never invents snow; no zero fallbacks.

**Acceptance criteria**
- Zone answers are deterministic and conservative.
- Window validation passes all edge cases.
- Confidence caps always enforced.

**Risks**
- Overly conservative defaults may suppress valid snow signals.

**What NOT to touch in this PR**
- Do not integrate with runtime pipeline or cache.

---

## PR3 — Integration with snow-engine

**Objective**: Wire the new pipeline into the existing engine without breaking production.

**Expected files (new/modified)**
- `src/engine/snow-engine.ts` (modify)
- `src/engine/period-engine.ts` (modify)
- `src/engine/signal-summary.ts` or equivalent (modify)
- `src/engine/validated-window.ts` or equivalent (modify)
- `src/cache/build-guru-cache-key.ts` (new)
- `src/lib/__tests__/integration/prediction-pipeline.test.ts` (new)

**Concrete tasks**
- [ ] Integrate new output into `snow-engine.ts` and `period-engine.ts`.
- [ ] Adapt `SignalSummary` and `ValidatedWindow` to new fields.
- [ ] Implement `buildGuruCacheKey()` with required fields.
- [ ] Add integration tests verifying pipeline output and cache key changes.

**Required tests**
- `/pronostico` uses real signals (no synthetic zeros).
- Cache key changes when window/confidence/resortStatus changes.

**Acceptance criteria**
- Build and tests green.
- No fake zeros appear.

**Risks**
- Type mismatches or cache invalidation regressions.

**What NOT to touch in this PR**
- Do not modify UI templates, sitemap.xml, llms.txt, or SEO text.

---

## PR4 — Governance final (Gurú)

**Objective**: Apply mandatory narrative governance to LLM, fallback, and dynamic copy.

**Expected files (new/modified)**
- `src/lib/governance/apply-narrative-governance.ts` (new)
- `src/lib/governance/blocked-phrases.ts` (new)
- `src/lib/__tests__/governance/apply-narrative-governance.test.ts` (new)

**Concrete tasks**
- [ ] Implement `applyNarrativeGovernance()` for LLM output, fallback, and window summaries.
- [ ] Block ski/snowboard language in pre_season/closed without official report.
- [ ] Block base/pistes language without official report.
- [ ] Add safe fallback copy.
- [ ] Add tests for prohibited phrases and allowed safe phrases.

**Required tests**
- With `seasonStatus=pre_season`, `resortOperationalStatus=closed`, `officialSnowReportAvailable=false`, `baseDepthCm=null`:
  - allows meteorological snow language
  - blocks ski/snowboard/powder day/table/base/pistes phrases

**Acceptance criteria**
- Governance blocks prohibited phrases deterministically.

**Risks**
- Over-blocking or missing phrase variants.

**What NOT to touch in this PR**
- Do not change SEO metadata or home copy.

---

## PR5 — Cleanup & QA

**Objective**: Remove deprecated logic and validate production-facing behavior.

**Expected files (new/modified)**
- Remove deprecated helpers (paths determined during implementation)
- `openspec/changes/prediction-engine-audit-and-hardening/qa-manual.md` (new)

**Concrete tasks**
- [ ] Remove or deprecate old helpers once replaced.
- [ ] Run manual QA on `/`, `/pronostico`, `/fuentes`, `sitemap.xml`, `llms.txt`.
- [ ] Verify canonical uses `https://www.elgurudelanieve.ar`.
- [ ] Document QA results.

**Required tests**
- Manual QA checklist completed and documented.

**Acceptance criteria**
- No “conditionally”, no fake zeros, no absurd windows.
- No ski language while season closed.
- Home remains stable/methodological.
- `/pronostico` differentiates meteorological snow, accumulation, and activity.

**Risks**
- Accidental deletion of still-used helpers.

**What NOT to touch in this PR**
- Do not change reports, scrapers, login, or unrelated SEO/GEO/AEO content.


# Design: prediction-engine-audit-and-hardening

## Technical Approach
Audit and harden the prediction pipeline by extracting small, testable evaluation primitives, adding a deterministic Caviahue timezone helper, enforcing resort-status early, and applying conservative classification + governance before any LLM copy is emitted. Goal: traceable, debuggable outputs and safe publishable narratives.

Pipeline (explicit): forecast → signals → hourly classification → zone evaluation → windows → confidence → narrative context → governance (final)

## Architecture Decisions
Decision: Preserve upstream fidelity
Choice: Ingest/normalize must NOT invent values; keep null/undefined and carry sourceFingerprint. Rationale: traceability and safe conservative fallbacks.

Decision: Conservative positives
Choice: evaluateHour/evaluateZone prefer false-negatives; add explicit reasonsFor / reasonsAgainst. Rationale: Reduce misleading published claims.

Decision: Deterministic time handling
Choice: Centralize TZ logic in src/lib/time/caviahue-time.ts (see below). Rationale: eliminate ad-hoc new Date().getHours()/getDay() usage and DST bugs.

## Data Flow
forecast (weather-source.ts / normalize-weather.ts) → signals (snow-engine.ts extract) → evaluateHour() → evaluateZone() → buildSnowWindows() → computeConsistencyIndex() → build PredictionNarrativeContext → applyNarrativeGovernance() → cache/output

## File changes (summary)
| File | Action | Why |
|---|---|---|
| src/lib/time/caviahue-time.ts | Create | TZ helpers: toCaviahueDate, formatCaviahueHour, getCaviahueDayKey, isPastWindow, formatSnowWindowLabel (no direct new Date() in engine logic). |
| src/models/prediction-types.ts | Create | Canonical TS models (below). |
| src/engine/evaluate-hour.ts | Create | evaluateHour primitive + unit tests. |
| src/engine/evaluate-zone.ts | Create | evaluateZone + window orchestration. |
| src/engine/windows.ts | Create | buildSnowWindows, validation rules, primary/secondary windows. |
| src/engine/prediction-engine.ts | Create | Orchestrator + buildGuruCacheKey. |
| src/lib/snow-engine.ts | Modify | Replace inline heuristics with new primitives; keep signal extraction as adapter. |
| src/lib/period-engine.ts | Modify | Use orchestrator outputs for periods. |
| src/lib/scoring.ts | Modify | Expose computeConsistencyIndex (0–100). |
| src/lib/validate-window.ts | Modify | Harden window validation rules. |
| src/lib/guru-copy.ts | Modify | Final governance path; LLM only after applyNarrativeGovernance. |
| src/lib/types.ts | Deprecate/shim | Keep old types as shims; migrate callers to new models.

## Data models (TypeScript sketches)
```ts
type ZoneId = string;
interface ZoneProfile { id:ZoneId; name:string; timeZone?:string; elevationM:number; thresholds?:{minSnowMm:number;minWindowHours:number} }
interface HourlySnowSignal { zoneId:ZoneId; utcHour:string; temperatureC?:number; precipitationMm?:number; snowfallCm?:number; freezingLevelM?:number; windKmh?:number; humidityPct?:number; sourceStatus?:string; localTs?:string; fingerprint:ForecastFingerprint }
interface HourlySnowClassification { signal:HourlySnowSignal; classification:'none'|'possible'|'likely'; score:number; reasonsFor:string[]; reasonsAgainst:string[]; missing:string[] }
interface SnowWindow { id:string; startUtc:string; endUtc:string; durationMin:number; totalSnowMm:number; primary:boolean }
interface ZoneSnowEvaluation { zoneId:ZoneId; summary:'yes'|'possible'|'no'|'unknown'; hourly:HourlySnowClassification[]; windows:SnowWindow[]; counts:{hoursWithPrecip:number}; accumulationEstimateMm:number; contradictions:string[]; consistencyIndex:number }
interface ConfidenceBreakdown { statistical:number; model:number; obsOverlap:number; final:number; label:string; reasons:string[] }
interface PredictionNarrativeContext { evaluation:ZoneSnowEvaluation; profile:ZoneProfile; confidence:ConfidenceBreakdown; allowedClaims:string[]; skiability:'open'|'restricted'|'no'; accumulationAllowed:boolean }
interface GovernedGuruMessage { id:string; body:string; tone:string; tags:string[]; fingerprint:ForecastFingerprint }
interface ForecastFingerprint { sourceId:string; modelVersion:string; runAtUtc:string; hash:string }
interface PredictionEngineOutput { fingerprint:ForecastFingerprint; evaluations:ZoneSnowEvaluation[]; narratives:GovernedGuruMessage[] }
```
Replaces/extends: SignalSummary, ConfidenceScore, ValidatedWindow, TrustEnrichedInterpretation, SnowInterpretation — shims kept in src/lib/types.ts for one release.

## Primitives / Stage contracts
- evaluateHour(signal): returns HourlySnowClassification (classification + reasonsFor/Against + dataUsed + missing flags).
- evaluateZone(profile,hourly,resortStatus): returns ZoneSnowEvaluation (summary: yes/possible/no/unknown; counts; accumulationEstimate; contradictions; concise summary).
- buildSnowWindows(hourly,rules): validates start/end, non-zero duration, not past, TZ-aware; returns primary + secondary candidate windows.
- computeConsistencyIndex(evaluation): 0–100 score, label, reasons; caps applied (e.g., max 90 if source degraded).
- applyNarrativeGovernance(ctx,templates,governanceRules): final filter for LLM/fallback/dynamic copy; enforces resort-status and allowed claims/tones.

## Resort-status
Use src/data/resort-status.json as authoritative. Enforcement points: evaluateZone (mute/pause outputs), buildSnowWindows (do not publish windows), applyNarrativeGovernance (insert closure messaging). Always include resort-status hash in cache key.

## Cache
buildGuruCacheKey(fingerprint,zoneId,windowId,engineVersion,resortHash,governanceHash) -> string (pattern: guru:{fp.hash}:zone:{zone}:w:{id||all}:v{engineVersion}:g{governanceHash}:r{resortHash}). Invalidate on fingerprint change, engineVersion bump, governanceHash change, resort-status change.

## Testing strategy
Unit: evaluateHour, evaluateZone, buildSnowWindows, computeConsistencyIndex, caviahue-time helpers (mock IANA). Integration: full pipeline using normalized fixtures (src/lib/__tests__/fixtures/prediction-audit/*). E2E: golden PredictionEngineOutput snapshots; governance acceptance tests against resort-status permutations.

## PR plan (5 slices)
PR1 foundations: types, time helper, shims, unit-test harness. PR2 core: evaluateHour + computeConsistencyIndex + tests. PR3 windows & evaluateZone + unit tests + resort-status hooks. PR4 governance: applyNarrativeGovernance, buildGuruCacheKey, guru-copy integration, governance tests. PR5 integration & cleanup: wire into snow-engine/period-engine, fixtures, deprecate old types, QA and docs.

## Non-goals
- No implementation in this doc. No external infra or ML model changes. No changes to source ingestion semantics beyond preserving nulls.

## Open questions
- Final allowed claim list and tone mapping for PredictionNarrativeContext (product). 
- Exact caps/punishments in computeConsistencyIndex for degraded sources (recommended defaults included in tasks).

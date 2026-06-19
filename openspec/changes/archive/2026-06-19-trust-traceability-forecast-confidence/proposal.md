# Proposal: Trust, Traceability, and Forecast Confidence

## Intent

El Gurú generates strong narrative but operates as a black box: users see conclusions without understanding the signals, confidence, or limitations behind them. This change adds a visible operational trust layer — traceability, confidence scoring, narrative governance, window validation, and degraded-mode indicators — so every forecast is explainable, auditable, and honest.

## Scope

### In Scope
- Signal traceability block on `/pronostico` showing temperature, precipitation, snow estimate, freezing level, wind, humidity, altitude analyzed, and sources used per period
- Confidence score (0–100 or Baja/Media/Alta) with documented rule-based explanation visible to the user
- Narrative governance rules that prevent exaggerated phrases ("paquetón", "powder day", "nevada fuerte") when data thresholds are not met
- Window validation guards preventing invalid windows (start=end, end<start, zero duration, malformed dates, wrong timezone)
- Degraded mode with honest user-visible messages when data sources fail (WeatherAPI, Open-Meteo, AIC)

### Out of Scope
- Forecast history / "dijimos vs pasó" — documented as future phase only
- Custom weather model or absolute accuracy promises
- Replacement of official parts (AIC, SMN, Defensa Civil, Cerro Caviahue)
- Login, user accounts, or monetization

## Capabilities

### New Capabilities
- `signal-traceability`: Per-reading signal summary with temperature, precipitation, snow estimate, freezing level, wind, humidity, altitude, and sources used
- `confidence-scoring`: 0–100 or category-based score with visible rule explanation
- `narrative-governance`: Hard thresholds limiting narrative intensity based on data confidence
- `window-validation`: Guards preventing display of invalid time windows
- `degraded-mode`: Honest degraded-status indicators when WeatherAPI, Open-Meteo, or AIC fail

### Modified Capabilities
None

## Approach

Introduce new types in `types.ts` for confidence metadata, signal summaries, and degraded status. Extend `snow-engine.ts` with confidence score calculation and signal extraction. Add governance layer in `guru-copy.ts` that wraps both LLM and fallback narrative. Add window validation in `scoring.ts` and degraded-mode flags in `weather-source.ts`. Create new UI components (`SignalSummary.astro`, `ConfidenceBadge.astro`, `DegradedBanner.astro`) and integrate them into `pronostico.astro`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/types.ts` | Modified | New types for confidence, traceability, degraded status |
| `src/lib/snow-engine.ts` | Modified | Add confidence score, signal extraction |
| `src/lib/scoring.ts` | Modified | Confidence score rules, window validation |
| `src/lib/guru-copy.ts` | Modified | Narrative governance wrapping LLM + fallback |
| `src/lib/weather/weather-source.ts` | Modified | Degraded mode flags per source |
| `src/components/SignalSummary.astro` | New | Signal traceability UI |
| `src/components/ConfidenceBadge.astro` | New | Confidence display |
| `src/components/DegradedBanner.astro` | New | Degraded mode indicator |
| `src/pages/pronostico.astro` | Modified | Integrate new components |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Narrative governance too restrictive kills local tone | Medium | Tiered rules: warning vs blocking; allow local tone within safe thresholds |
| Confidence score perceived as arbitrary | Medium | Show rule explanation in UI tooltip or footnote |
| Degraded mode adds pipeline complexity | Low | Simple boolean propagation, no complex state machine |

## Rollback Plan

Revert modified files (types.ts, snow-engine.ts, scoring.ts, guru-copy.ts, weather-source.ts, pronostico.astro); delete new components (SignalSummary, ConfidenceBadge, DegradedBanner); restore imports.

## Dependencies

None — all work stays within existing stack (Astro + Tailwind + TypeScript)

## Success Criteria

- [ ] `/pronostico` shows visible signal summary per period (today/tomorrow/sevenDays)
- [ ] Confidence score has documented rule explanation reachable from the UI
- [ ] LLM and fallback narrative both respect governance thresholds
- [ ] No invalid windows shown on any period
- [ ] Open-Meteo, WeatherAPI, or AIC failures show degraded indicator
- [ ] All changes compatible with Astro SSG build

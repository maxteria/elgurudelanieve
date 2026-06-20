# Prediction Engine — Audit & Hardening Specification

## Purpose
Provide deterministic, conservative rules for hourly snow classification, zone answers, windows, confidence, accumulation, narrative governance, skiability, caching and missing-data handling. Preference: false negatives over false positives.

## Definitions
- Meteorological snow: measured solid precipitation (snowfallCm or equivalent SWE). 
- Accumulated snow: summed snowfallCm over a validated window (cm). 
- Skiable snow: accumulated snow at Base used for operational ski guidance (see Skiability section).

## Zones (altitudes)
- Pueblo: 1647 m
- Base: 1846 m
- Summit: 2045 m

## Conservative behaviour
The system MUST prefer conservative outputs: when evidence is borderline, degrade to unknown or a lower-certainty label. (MUST NOT promote to snow_likely on ties.)

Scenario: conservative tie-break
- GIVEN conditions partially satisfy snow_marginal and snow_likely
- WHEN classifying
- THEN choose snow_marginal (or unknown) not snow_likely

## Hourly classification (enum)
Enum: snow_likely | snow_marginal | not_snow | unknown
Requirement: The system MUST classify each hour deterministically using the following rules:
- snow_likely IF (precipitationMm >= 0.2 OR snowfallCm >= 0.1) AND temperatureC <= 1.5 AND freezingLevelM <= zoneAltitudeM + 200.
- snow_marginal IF (precipitationMm >= 0.2 OR snowfallCm >= 0.1) AND ((temperatureC > 1.5 AND temperatureC <= 2.5) OR (freezingLevelM > zoneAltitudeM + 200 AND freezingLevelM <= zoneAltitudeM + 400)).
- not_snow IF (precipitationMm < 0.2 AND snowfallCm < 0.1) OR temperatureC > 3 OR freezingLevelM > zoneAltitudeM + 500.
- unknown IF temperatureC OR freezingLevelM is missing unless snowfallCm is explicitly provided (non-null). Incomplete critical data MUST yield unknown rather than guess.
Tie-break: when conditions partially match multiple labels, the system MUST select the lower-confidence label (unknown → snow_marginal → snow_likely).

Scenario: hourly happy path
- GIVEN precipitationMm=0.3, temperatureC=0.0, freezingLevelM <= zoneAltitudeM+200
- WHEN classifying the hour
- THEN result = snow_likely

Scenario: missing critical data
- GIVEN precipitationMm=0.3, temperatureC=null, snowfallCm=null
- WHEN classifying
- THEN result = unknown

## Zone answer rules (yes / possible / no / unknown)
Requirement: Zone-level answer MUST apply these deterministic rules:
- yes IF there are >=3 consecutive snow_likely hours OR accumulated snowfallCm >= 2.0 cm within the evaluated period, AND no strong contradictions (no hours with temperatureC > 3 or freezingLevelM > zoneAltitudeM + 500).
- possible IF 1–2 snow_likely hours OR multiple snow_marginal hours OR signals confined to higher sectors without clear base impact.
- no IF insufficient precipitation signal OR temperatures clearly too warm OR freezing level clearly above the zone for the period.
- unknown IF all hours are unknown.

Scenario: zone yes
- GIVEN 3 consecutive snow_likely hours
- WHEN evaluating zone period
- THEN zone_answer = yes

## Snow windows
Requirement: Windows MUST be validated in America/Argentina/Buenos_Aires timezone.
- A window is valid IF start and end are present, end > start, duration > 0, not fully in the past, AND window contains >=2 hours labeled snow_marginal or snow_likely.
- If invalid, system MUST return message: "No clear snow window in this period." and not report accumulation.

Scenario: invalid window
- GIVEN end <= start
- WHEN validating
- THEN message = "No clear snow window in this period."

## Timezone handling
All parsing, grouping, hourly labels and local-day boundaries MUST use America/Argentina/Buenos_Aires. Helpers MUST parse UTC inputs, assert tz, and produce utc_iso and local_iso fields. (MUST NOT use runtime system tz.)

Scenario: tz normalization
- GIVEN forecast timestamps in UTC
- WHEN processed
- THEN outputs include local_iso stamped in America/Argentina/Buenos_Aires

## Confidence (0–100)
Requirement: Confidence MUST be an integer 0–100 with labels: Low 0–44, Medium 45–74, High 75–100.
Hard caps (applied after scoring): missing temperature OR missing freezingLevel ⇒ max 45; insufficient precipitation ⇒ max 40 for snow; freezingLevelM > zoneAltitudeM + 500 ⇒ max 35; temperatureC > 3 ⇒ max 35; main source failure/demo w/o alternative ⇒ max 50.

Scenario: cap for missing data
- GIVEN missing temperature
- WHEN computing confidence
- THEN confidence <= 45

## Accumulation
MUST NOT assert accumulation when snowfallCm is absent, window duration short, temperatureC > 2.5, freezingLevelM above zone, or signal insufficient. Report accumulation only when reliable (numeric value) else null.

Scenario: accumulation blocked
- GIVEN snowfallCm=null OR temperatureC=3.0
- WHEN computing accumulation
- THEN accumulation = null

## Narrative & copy governance
Allowed short phrases: "signal of snow to monitor", "may add snow in higher sectors", "meteorological snow in formation", "not enough to claim skiable conditions", "check official report before planning ski/snowboard".
Prohibited phrases: "base consolidated", "excellent base", "powder day", "prepare/sharpen/store the skis", "ideal ski day".

Scenario: banned phrase
- GIVEN generated text contains "powder day"
- WHEN post-processing
- THEN text MUST be rewritten to an allowed template

## Skiability & resort integration
Ski recommendations MUST be allowed ONLY if seasonStatus in {open, partial} AND resortOperationalStatus in {open, partial} AND officialSnowReportAvailable = true AND baseDepthCm >= 30 AND no critical operational warnings. All ski guidance MUST include a disclaimer to check the official report.

Scenario: pre-season block
- GIVEN seasonStatus=pre_season AND officialSnowReportAvailable=false
- WHEN producing narrative
- THEN skiable recommendations are blocked; mention season not operational

## Cache key & invalidation
Cache key MUST include: date/period, mainAnswer.status, bestWindow.start,end, narrativeTier, confidence.label,value, seasonStatus, resortOperationalStatus, resortStatus.lastUpdatedAt, and a simple hash of forecast/signals. Any change to these fields MUST invalidate cached entry.

Scenario: cache invalidation
- GIVEN cached result with confidence=High
- WHEN confidence or bestWindow changes
- THEN cache entry MUST be invalidated and recomputed

## Missing-data policy
MUST NOT use 0 as fallback. Use null/undefined/"—" and propagate unknowns. 

Scenario: missing-data propagation
- GIVEN temperatureC is missing
- WHEN producing outputs
- THEN numeric fields must be null/"—" and top-level answers may be unknown

## Tests (required)
- Unit: hourly classification edges, missing critical data.
- Integration: zone evaluation cases, window validation, confidence caps, skiability rules, copy governance filters, cache invalidation triggers.

## Manual QA
- Verify pages: /, /pronostico, /fuentes, sitemap.xml, llms.txt. Ensure no fake zeros, no prohibited ski phrases when blocked, canonical https://www.elgurudelanieve.ar.

## Non-goals
- No UI redesign, no scraper, no login, no promise of absolute accuracy, not an official report.

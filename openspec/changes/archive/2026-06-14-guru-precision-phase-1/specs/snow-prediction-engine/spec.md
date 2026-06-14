# Delta for snow-prediction-engine

## ADDED Requirements

### Requirement: Wind Direction Scoring Bonus

The scoring engine MUST grant a bonus when wind direction is from the southwest (SW) or west (W).

#### Scenario: SW/W wind direction bonus

- GIVEN `wind_direction` is between 180° and 315° (SW through W)
- WHEN `calculatePowderScore()` evaluates an hour
- THEN +15 points MUST be added to that hour's score

#### Scenario: Non-SW/W wind direction

- GIVEN `wind_direction` is outside 180°–315°
- WHEN scoring evaluates
- THEN no wind direction bonus is applied

### Requirement: Cloud Cover Bonus

The scoring engine MUST grant a bonus when cloud cover exceeds 60%.

#### Scenario: High cloud cover bonus

- GIVEN `cloud_cover > 60`
- WHEN `calculatePowderScore()` evaluates that hour
- THEN +10 points MUST be added to that hour's score

### Requirement: Wind Gust Penalty

The scoring engine MUST apply a penalty when wind gusts exceed 50 km/h.

#### Scenario: Strong gust penalty

- GIVEN `wind_gusts > 50`
- WHEN `calculatePowderScore()` evaluates that hour
- THEN −8 points MUST be subtracted from that hour's score

### Requirement: Precipitation Probability Replaces Heuristic

The `getZoneAnswer()` and zone forecast MUST use `precipitation_probability` instead of the `snowChance()` heuristic function for zone-level snow certainty.

#### Scenario: Precip probability in zone forecast

- GIVEN `precipitation_probability` is available in the normalized forecast
- WHEN building `ZoneInterpretation.current`
- THEN `snowChance` MUST be set from `precipitation_probability` instead of calling `snowChance()`

#### Scenario: Heuristic preserved as fallback

- GIVEN `precipitation_probability` is missing or zero for all hours
- WHEN the engine cannot derive certainty from the new field
- THEN the `snowChance()` heuristic MAY be used as a fallback

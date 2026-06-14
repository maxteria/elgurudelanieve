# Delta for Lab UI Enrichment

## ADDED Requirements

### Requirement: ZoneCard Enriched Data Rows

ZoneCard (`src/components/ZoneCard.astro`) MUST display freezing level, humidity, and precipitation probability as additional data rows.

#### Scenario: Freezing level row

- GIVEN `zone.current.freezingLevel` is a number
- WHEN ZoneCard renders the data section (lines 68-103)
- THEN a row SHALL display "Cota de nieve" with `freezingLevel` formatted as `N.ÑNN m` or `>3000 m` for high values

#### Scenario: Humidity row

- GIVEN `zone.current.humidity` is a number
- WHEN ZoneCard renders
- THEN a row SHALL display "Humedad" with `humidity` formatted as `N%`

#### Scenario: Precipitation probability row

- GIVEN `zone.current.precipitationProbability` is a number
- WHEN ZoneCard renders
- THEN a row SHALL display "Prob. de precipitación" with value formatted as `N%`

#### Scenario: Missing data handling

- GIVEN any of the three new fields is null/undefined
- WHEN ZoneCard renders
- THEN the row for the missing field SHALL be omitted entirely
- AND the card SHALL NOT show "--" or broken values

### Requirement: Snow Depth Period Attribute

ZoneCard MUST add `data-period-zone-snowdepth` to the snow depth display element.

#### Scenario: Snow depth element has new attr

- GIVEN `current.snowDepth` is not undefined
- WHEN ZoneCard renders the snow depth row (line 94)
- THEN the snow depth value element SHALL have `data-period-zone-snowdepth`
- AND existing `data-period-zone-snow` on snowChance SHALL remain unchanged

### Requirement: Period Switching Snow Depth Update

`setActivePeriod()` in `lab.astro` JS (lines 315-475) MUST query and update `[data-period-zone-snowdepth]`.

#### Scenario: Snow depth updates on period switch

- GIVEN a period tab is clicked
- WHEN `setActivePeriod()` runs and iterates zone cards (lines 443-474)
- THEN the function SHALL query `card.querySelector('[data-period-zone-snowdepth]')` per card
- AND set `textContent` to the active period's `z.current.snowDepth` formatted value

#### Scenario: Existing zone updates preserved

- GIVEN `setActivePeriod()` now handles snowDepth
- WHEN the period switches
- THEN existing zone card updates (temp, feels, wind, snowChance, answer) SHALL still update correctly
- AND no previous behavior SHALL regress

### Requirement: GuruTouristCopy Import Fix

`GuruTouristCopy.astro` MUST import types from the correct path.

#### Scenario: Import resolves to lib

- GIVEN `src/components/GuruTouristCopy.astro` line 2
- WHEN the import statement is evaluated
- THEN the path SHALL be `'../../lib/ai/types'` (not `'./ai/types'`)
- AND `npm run build` SHALL pass with 0 TS errors

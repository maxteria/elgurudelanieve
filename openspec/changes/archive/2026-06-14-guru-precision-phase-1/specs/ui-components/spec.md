# Delta for ui-components

## ADDED Requirements

### Requirement: Snow Depth Display in Zone Cards

The system MUST render `snowDepth` per zone in `index.astro` and `lab.astro` zone cards.

#### Scenario: Snow depth in index.astro

- GIVEN `NormalizedZoneForecast` has `snowDepth` populated
- WHEN `index.astro` renders a zone card
- THEN the card MUST display `snowDepth` in centimeters with a label (e.g., "Nieve en pista: XXcm")

#### Scenario: Snow depth in lab.astro

- GIVEN `NormalizedZoneForecast` has `snowDepth` populated
- WHEN `lab.astro` renders a zone card
- THEN the card MUST display `snowDepth` in centimeters with a label

#### Scenario: Zero snow depth

- GIVEN `snowDepth` is 0
- WHEN the zone card renders
- THEN it MUST display "Sin nieve acumulada" or equivalent zero-state copy

#### Scenario: Missing snow depth gracefully handled

- GIVEN `snowDepth` is undefined or null
- WHEN the zone card renders
- THEN the snow depth section MUST be hidden (no broken layout)

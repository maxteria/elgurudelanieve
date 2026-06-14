# AIC History Display Specification

## Purpose

Display AIC station historical readings (last 7 entries from `normalized.aicHistory`) in a scrollable section on the LAB dashboard below the zone cards.

## Requirements

### Requirement: AIC Section Rendering

The LAB MUST render an AIC history section when `normalized.aicHistory` has valid entries.

#### Scenario: Data available

- GIVEN `normalized.aicHistory` is an array with `AicStationData` entries
- WHEN `lab.astro` renders
- THEN a section titled "Historial AIC" SHALL appear below the zone/forecast area
- AND the section SHALL show a table with rows for each entry

#### Scenario: Empty history

- GIVEN `normalized.aicHistory` is empty, null, or undefined
- WHEN the LAB renders
- THEN the AIC section SHALL display "Sin datos históricos" as fallback text
- AND SHALL NOT render a table

#### Scenario: Scrollable container

- GIVEN there are 7+ AIC entries
- WHEN the table renders
- THEN the container SHALL have `max-height` with `overflow-y: auto`
- AND all entries SHALL be reachable via scroll

### Requirement: Column Display

The AIC history table SHALL display key variables per row.

#### Scenario: Row columns

- GIVEN an `AicStationData` entry with all fields present
- WHEN rendered in the table
- THEN columns SHALL include: date, precipitation (mm), humidity (%), temp min/max (°C), wind speed/direction (km/h, °)
- AND `null` values SHALL display as "--"

#### Scenario: Table labeling

- GIVEN the table renders
- THEN each column SHALL have a header label
- AND headers SHALL be in Spanish ("Fecha", "Precip.", "Humedad", "T. mín", "T. máx", "Viento", "Dir.")

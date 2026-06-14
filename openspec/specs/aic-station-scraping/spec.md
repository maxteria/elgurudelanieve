# AIC Station Scraping Specification

## Purpose

Scrape yesterday's daily measurements from the AIC Caviahue station HTML table at build time. Provides ground-truth station data (humidity, precipitation, pressure, temp min/max, wind, snow water equivalent) as a secondary data source.

## Requirements

### Requirement: AIC HTML Table Parse

The system MUST fetch the AIC station page and parse the "Mediciones" HTML table via cheerio.

#### Scenario: Fetch and parse yesterday's data

- GIVEN the AIC site is reachable at `https://www.aic.gob.ar/sitio/estaciones-detalle?a=65`
- WHEN the build fetches the page and parses `#body_TabMediciones_TabMed0_grilla tr`
- THEN each row SHALL extract the variable name and its numeric value
- AND the result SHALL contain fields: humidity, precipitation, pressure, temp_min, temp_max, wind_speed_avg, wind_speed_max, wind_direction, snow_water_equivalent

#### Scenario: HTML structure change

- GIVEN the AIC page HTML has changed (missing expected table or selectors)
- WHEN parsing fails or yields zero rows
- THEN the system MUST return `null` — build continues without AIC data

### Requirement: Graceful Degradation

The system MUST NOT fail the build when AIC data is unavailable.

#### Scenario: AIC site unreachable

- GIVEN the AIC site returns 5xx or times out
- WHEN `fetchAicStationData()` is called
- THEN the function SHALL catch the error and return `null`
- AND the build MUST proceed without interruption

#### Scenario: Network timeout

- GIVEN the AIC request exceeds 10 seconds
- WHEN the request is aborted via AbortController
- THEN `fetchAicStationData()` SHALL return `null`

### Requirement: Data Freshness Contract

The AIC-reported values represent the previous day's daily averages (per AIC notice: "valores medios corresponden al promedio del día anterior").

#### Scenario: Yesterday's data label

- GIVEN AIC data is available
- WHEN the system stores the data
- THEN the date SHALL be labeled as yesterday's date in ISO format

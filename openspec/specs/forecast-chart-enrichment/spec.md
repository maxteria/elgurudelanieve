# Forecast Chart Enrichment Specification

## Purpose

Extend ForecastChart (`src/components/ForecastChart.astro`) to display all enriched weather variables — wind, precipitation, cloud cover, and freezing level — alongside existing temperature/cota charts for both hourly and daily views.

## Requirements

### Requirement: Hourly Enriched Variables

The hourly SVG chart MUST render precipitation bars, cloud cover dots, and wind direction arrows in addition to the existing temperature line and freezing level dashed line.

#### Scenario: Precipitation bars

- GIVEN hourly data with non-zero `precipitation` values
- WHEN `renderHourlyChart()` runs
- THEN vertical bars SHALL render below the temperature line proportional to precipitation (scaled to ph × 0.3 max height)
- AND bars SHALL use `rgba(168, 231, 249, 0.2)` fill

#### Scenario: Cloud cover dots

- GIVEN hourly data with `cloudCover` (0-100)
- WHEN the hourly chart renders
- THEN a small circle SHALL render near the bottom edge of each hour column
- AND circle opacity SHALL equal `cloudCover / 100`

#### Scenario: Wind arrows

- GIVEN hourly data with `windDir` (0-360)
- WHEN the hourly chart renders
- THEN a small arrow (`<path>` rotated by `windDir` degrees) SHALL appear above each time label
- AND arrows SHALL be under 8px to avoid visual density issues

#### Scenario: Missing enriched fields

- GIVEN `precipitation`, `cloudCover`, or `windDir` is null/undefined
- WHEN the chart renders
- THEN the respective enrichment SHALL be skipped (not crash)
- AND the chart SHALL still render temperature and freezing level normally

### Requirement: Daily Enriched Variables

The daily SVG chart MUST render average wind as a line and SHOULD render humidity/cloud cover on a secondary axis.

#### Scenario: Wind line

- GIVEN `DailySummary` includes `avgWind` and `maxWindGust`
- WHEN `renderDailyChart()` runs
- THEN a wind speed line SHALL render using `stroke="rgba(255,255,255,0.3)"` with markers for each day
- AND `maxWindGust` SHALL render as small cross markers

#### Scenario: Humidity axis

- GIVEN `DailySummary` includes `avgHumidity`
- WHEN the daily chart renders
- THEN a secondary right axis SHALL render with labels at 0%, 50%, 100%
- AND a thin line SHALL map `avgHumidity` to this axis

#### Scenario: Legend update

- GIVEN enriched variables are rendered
- WHEN the legend section renders
- THEN entries MUST include labels for wind (and optionally humidity)
- AND existing "Temperatura °C" and "Cota de nieve m" entries SHALL remain

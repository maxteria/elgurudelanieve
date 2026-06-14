# NowCard Refactor Specification

## Purpose

Refactor the NowCard data source: Open-Meteo `current_weather` becomes primary for temperature, wind, and weather code. WeatherAPI becomes a decorative fallback for icon and condition text when available.

## Requirements

### Requirement: Open-Meteo Primary Source

The system MUST use Open-Meteo `current_weather` as the primary data source for the NowCard when available.

#### Scenario: Open-Meteo current_weather available

- GIVEN Open-Meteo response includes valid `current_weather` data
- WHEN the NowCard is rendered
- THEN `temperature`, `wind speed`, and `weather_code` SHALL come from Open-Meteo `current_weather`
- AND the temperature SHALL display in °C
- AND the wind speed SHALL display in km/h

#### Scenario: Open-Meteo current_weather missing field

- GIVEN `current_weather` is available but a critical field is `null` or `undefined`
- WHEN rendering the NowCard
- THEN the system SHALL fall back to WeatherAPI for the missing field
- AND SHALL NOT block the card render

### Requirement: WeatherAPI Decorative Fallback

WeatherAPI SHALL provide icon URL and condition text when available, but MUST NOT be the primary data source.

#### Scenario: WeatherAPI available

- GIVEN a WeatherAPI key exists and returns valid data
- WHEN the NowCard renders
- THEN the `icon` and `condition text` SHALL come from WeatherAPI
- AND the card SHALL display "WeatherAPI" as the decorative source

#### Scenario: WeatherAPI unavailable

- GIVEN no WeatherAPI key or WeatherAPI fetch fails
- WHEN the NowCard renders
- THEN the card SHALL NOT display an icon or condition text
- AND the card SHALL display "Open-Meteo" as the source label
- AND the card MUST still render temperature and wind from Open-Meteo

### Requirement: WMO Weather Code Display

The NowCard SHALL display the WMO weather code mapping when WeatherAPI condition text is unavailable.

#### Scenario: WMO code visible

- GIVEN Open-Meteo `current_weather` has a `weathercode` value
- AND WeatherAPI condition text is absent
- WHEN the NowCard renders
- THEN the WMO code SHALL be mapped to a human-readable label (e.g., 0 → "Despejado")
- AND the label SHALL display in place of condition text

### Requirement: OpenMeteoCurrent Type

The system MUST define and export an `OpenMeteoCurrentWeather` type for the `current_weather` payload.

#### Scenario: Type validation

- GIVEN a valid `current_weather` JSON payload from Open-Meteo
- WHEN type-checked against `OpenMeteoCurrentWeather`
- THEN `temperature`, `windspeed`, `winddirection`, `weathercode`, `is_day`, `time` MUST be present

### Requirement: Wind Direction Display

The NowCard MUST display wind direction from `currentWeather.winddirection` when available.

#### Scenario: Direction from Open-Meteo

- GIVEN `currentWeather.winddirection` is a valid number (0–360)
- WHEN the NowCard renders the wind row
- THEN the wind speed display SHALL include a direction indicator (text + SVG arrow)
- AND direction text SHALL resolve to nearest 8-point compass: N, NE, E, SE, S, SW, W, NW
- AND a small `<path>` arrow SHALL rotate by `winddirection` degrees using SVG `transform`

#### Scenario: Direction unavailable

- GIVEN `currentWeather` is null or `winddirection` is null/undefined
- WHEN the NowCard renders
- THEN the wind row SHALL display wind speed without direction indicator
- AND SHALL NOT show an arrow SVG

#### Scenario: Compass resolution mapping

- GIVEN a `winddirection` value
- WHEN resolved to compass point
- THEN 0°/360° → N, 45° → NE, 90° → E, 135° → SE, 180° → S, 225° → SW, 270° → W, 315° → NW
- AND intermediate values SHALL use nearest neighbor (±22.5° tolerance per sector)

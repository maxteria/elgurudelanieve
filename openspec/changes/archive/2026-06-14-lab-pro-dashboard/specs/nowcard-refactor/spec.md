# Delta for NowCard Refactor

## ADDED Requirements

### Requirement: Wind Direction Display

The NowCard MUST display wind direction from `currentWeather.winddirection` when available.

#### Scenario: Direction from Open-Meteo

- GIVEN `currentWeather.winddirection` is a valid number (0–360)
- WHEN the NowCard renders the wind row (line 105-110)
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

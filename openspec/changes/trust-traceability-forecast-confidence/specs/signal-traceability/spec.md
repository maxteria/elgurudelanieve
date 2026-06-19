# Signal Traceability Specification

## Purpose

Users see the Guru's conclusion but not the data behind it. This spec defines a visible "¿Por qué dice esto?" block per period showing the signals, altitudes, and sources that drove each reading.

## Requirements

### Requirement: Signal Summary Display

The system MUST display a signal traceability block on `/pronostico` for each active period (today, tomorrow, sevenDays).

The block MUST show:
- Current or estimated temperature per zone (°C)
- Expected precipitation (mm)
- Estimated snowfall (cm) if available
- Freezing level / cota (m)
- Wind speed (km/h)
- Humidity (%) when relevant
- Altitudes analyzed: pueblo (~1647m), centro (~1846m), cumbre (~2045m)
- Sources used for this reading

#### Scenario: Full data available

- GIVEN all data sources are available (Open-Meteo, WeatherAPI, AIC)
- WHEN the user views `/pronostico` for any period
- THEN each period shows a signal block with all fields populated
- AND each field shows its source label

#### Scenario: Partial data available

- GIVEN AIC data is unavailable
- WHEN the signal block renders
- THEN AIC shows "AIC: no disponible"
- AND the other fields render normally

#### Scenario: Demo fallback active

- GIVEN the system is running in demo mode
- WHEN the signal block renders
- THEN all fields show "Demo" as the source

#### Scenario: All primary sources fail

- GIVEN Open-Meteo fetch failed and WeatherAPI also failed
- WHEN the signal block renders
- THEN the header reads "Datos limitados — las fuentes no respondieron completamente"

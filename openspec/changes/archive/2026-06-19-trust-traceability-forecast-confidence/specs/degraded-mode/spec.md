# Degraded Mode Specification

## Purpose

When external sources fail, the system currently falls back silently — users don't know data is partial. This spec defines honest degraded-status indicators so users understand the data's limitations.

## Requirements

### Requirement: Source Availability Tracking

The system MUST track the availability of each data source per page load.

#### Scenario: WeatherAPI unavailable

- GIVEN the WeatherAPI fetch failed (returned null or threw)
- WHEN the page renders on `/pronostico`
- THEN a banner or inline note shows "Condición actual: no disponible"
- AND the rest of the page renders normally

#### Scenario: Open-Meteo unavailable (demo fallback)

- GIVEN the Open-Meteo fetch failed
- AND the system falls back to demo data
- WHEN the page renders
- THEN a banner shows "Lectura parcial: usando datos de respaldo. Las fuentes primarias no respondieron."
- AND the existing demo badge already indicates simulated data

#### Scenario: AIC unavailable

- GIVEN the AIC scraper returned null or threw
- WHEN the page renders
- THEN an inline note at the signal traceability block shows "Validación AIC: no disponible"

#### Scenario: Multiple sources unavailable

- GIVEN Open-Meteo failed and WeatherAPI failed
- WHEN the page renders
- THEN a warning banner shows "Disponibilidad limitada — las fuentes meteorológicas no están respondiendo completamente."

### Requirement: Honest Data Display

The system MUST NOT invent or fabricate data when sources fail. Missing data MUST be indicated explicitly.

#### Scenario: All sources unavailable

- GIVEN all external sources failed
- WHEN the page renders
- THEN the page still renders with demo fallback data for layout
- AND a degraded-mode banner is visible at the top of the content area
- AND the banner uses muted colors, not alarming style

#### Scenario: Transient fetch glitch

- GIVEN a single fetch attempt fails (transient error)
- WHEN the page renders
- THEN the source indicator shows the same degraded state
- AND no distinction is made between transient and persistent failure (indistinguishable client-side)

#### Scenario: Demo mode is active

- GIVEN the system is in demo mode (via PUBLIC_WEATHER_MODE or ?demo param)
- WHEN the page renders
- THEN the existing demo badge shows "Demo — datos simulados"
- AND the degraded-mode banner is NOT shown (demo is intentional, not a failure)

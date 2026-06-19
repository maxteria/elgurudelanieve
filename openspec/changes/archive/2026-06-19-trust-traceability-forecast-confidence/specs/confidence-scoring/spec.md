# Confidence Scoring Specification

## Purpose

Certainty is currently a hidden label. This spec defines a visible confidence score (Alta / Media / Baja) per period with documented rules so users understand why the Guru rates each reading the way it does.

## Requirements

### Requirement: Confidence Score Calculation

The system MUST compute a confidence score per period. The score MUST be one of: Alta, Media, or Baja.

#### Scenario: High confidence

- GIVEN precipitation probability > 60% in at least one zone
- AND temperature < 2°C in that zone
- AND freezing level < zone altitude + 150m
- AND at least 2 sources available with consensus
- WHEN computing confidence
- THEN the score is Alta

#### Scenario: Medium confidence

- GIVEN precipitation probability between 30–60%
- OR temperature is at the freezing boundary (2–3°C)
- OR freezing level near zone altitude (±200m)
- OR sources partially disagree
- WHEN computing confidence
- THEN the score is Media

#### Scenario: Low confidence

- GIVEN precipitation probability < 30%
- OR temperature > 3°C
- OR freezing level > zone altitude + 300m
- OR single source available
- OR sources contradict each other
- WHEN computing confidence
- THEN the score is Baja

#### Scenario: Insufficient data

- GIVEN no hourly data exists for a period
- WHEN computing confidence
- THEN the score is Baja
- AND the explanation MUST state "Datos insuficientes para calcular confianza"

### Requirement: Confidence Explanation

The system MUST provide a visible rule explanation alongside the score.

#### Scenario: User taps confidence score

- GIVEN a confidence badge is displayed
- WHEN the user taps or hovers over the badge
- THEN a tooltip or footnote shows the specific rules that determined this score
- AND the explanation uses concrete values, e.g. "Confianza Media: precipitación 45%, temperatura 1.8°C, cota 1800m"

#### Scenario: Demo mode

- GIVEN the system is in demo mode
- WHEN confidence score is shown
- THEN the badge MUST also display a "Demo" indicator next to the score

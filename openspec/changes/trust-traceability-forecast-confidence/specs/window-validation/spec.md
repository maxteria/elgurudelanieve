# Window Validation Specification

## Purpose

Invalid time windows ("vie 23:00 a vie 23:00") destroy user trust. This spec defines guards that prevent display of malformed, zero-duration, or otherwise invalid bestWindow objects.

## Requirements

### Requirement: Pre-display Window Validation

The system MUST validate every bestWindow object before it reaches the SnowWindow component or any UI element. A window MUST be rejected if any of these conditions are true:

- fromTime equals toTime (zero duration)
- toTime is before fromTime (negative duration)
- fromTime or toTime are empty, null, or malformed ISO 8601 strings
- The window's datetime is inconsistent with Caviahue timezone (UTC-3)

Rejected windows MUST display: "No hay una ventana clara de nieve en este período."

#### Scenario: Zero-duration window

- GIVEN the powder score calculation produced a window where fromTime equals toTime
- WHEN the validation runs
- THEN the window is rejected
- AND the display shows "No hay una ventana clara de nieve en este período."

#### Scenario: Negative duration

- GIVEN toTime is before fromTime
- WHEN the validation runs
- THEN the window is rejected

#### Scenario: Malformed date string

- GIVEN fromTime is "undefined" or "invalid-date"
- WHEN the validation runs
- THEN the window is rejected

#### Scenario: Valid midnight crossing window

- GIVEN fromTime is "2026-06-19T23:00:00" and toTime is "2026-06-20T03:00:00"
- WHEN the validation runs
- THEN the window is accepted (crossing midnight is valid)
- AND the display shows the window normally

#### Scenario: Past window

- GIVEN the window's toTime is in the past (before current time)
- WHEN the validation runs
- THEN the window is rejected as expired
- AND the display shows "No hay una ventana clara de nieve en este período."

### Requirement: Type-Level Guard

The system MUST add a type-level guard so invalid windows cannot reach the SnowWindow component.

#### Scenario: Null window

- GIVEN snowWindow is null (no window found by scoring engine)
- WHEN passing data to SnowWindow
- THEN hasWindow is false
- AND SnowWindow renders the "no window" state

#### Scenario: Empty window

- GIVEN snowWindow exists but has empty fromTime or toTime
- WHEN the type guard runs
- THEN the window is treated as invalid
- AND the display shows the "no window" state

# Multi-Period Fallback Specification

## Purpose

Extend the fallback NPC message generator (`generateFallbackNpcMessage`) to communicate upcoming snow windows beyond the current period when there's no snow today.

## Requirements

### Requirement: Multi-Period Window Awareness

When `mainAnswer.status === 'no'` but a snow window exists in the next 3 days, the fallback MUST reference the upcoming window.

#### Scenario: No snow today, window this weekend

- GIVEN `mainAnswer.status` is `'no'`
- AND `bestWindow.hasWindow` is `true`
- AND the window start is within 3 days
- WHEN `generateFallbackNpcMessage()` is called
- THEN the returned message MUST mention the window dates (e.g., "del jueves al domingo")
- AND the message MUST NOT say "hoy no hay nada" without qualification

#### Scenario: No snow today, window beyond 3 days

- GIVEN `mainAnswer.status` is `'no'`
- AND `bestWindow.hasWindow` is `true`
- BUT the window starts more than 3 days away
- WHEN `generateFallbackNpcMessage()` is called
- THEN the message SHOULD mention the upcoming window with lower urgency
- AND the existing cold/dry fallbacks remain available as alternatives

### Requirement: Existing Fallback Preservation

The multi-period awareness MUST NOT break existing fallback paths for other statuses.

#### Scenario: Snow today — unchanged path

- GIVEN `mainAnswer.status` is `'yes'` and `bestWindow.hasWindow` is `true`
- WHEN `generateFallbackNpcMessage()` is called
- THEN the existing "¡Buena señal!" fallback message SHALL be returned unchanged

#### Scenario: Possible without window — unchanged path

- GIVEN `mainAnswer.status` is `'possible'` and `bestWindow.hasWindow` is `false`
- WHEN `generateFallbackNpcMessage()` is called
- THEN the existing "Veo señales pero no hay ventana clara" fallback SHALL be returned unchanged

### Requirement: GuruCopyInput Extension

The `GuruCopyInput` type MUST include forecast data for the next 3 days to enable multi-period lookup.

#### Scenario: NextDays window data available

- GIVEN `GuruCopyInput` includes `nextDays: DailySummary[]` with at least 3 entries
- WHEN evaluating fallback messages
- THEN the system SHALL use `nextDays` to detect upcoming windows beyond the current period

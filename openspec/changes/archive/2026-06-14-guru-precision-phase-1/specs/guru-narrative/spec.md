# Delta for guru-narrative

## ADDED Requirements

### Requirement: Enriched Input Data

The `GuruCopyInput` type and the Gemini user prompt MUST include the new enriched data fields.

#### Scenario: New fields in GuruCopyInput

- GIVEN `GuruCopyInput` is constructed from `SnowInterpretation`
- WHEN passed to `buildUserPrompt()`
- THEN the type MUST include `snowDepth`, `precipitationProbability`, and `weatherCode` per zone

#### Scenario: Gemini prompt includes snow depth

- GIVEN `buildUserPrompt()` generates the prompt
- WHEN the template renders zone data
- THEN each zone line MUST include `snowDepth` in cm (converted from meters)

#### Scenario: Precip probability drives certainty

- GIVEN `precipitationProbability` is available
- WHEN `GuruNpcOutput.certainty` is determined
- THEN the system MAY use `precipitationProbability` as a signal: ≥70% → `alta`, 40–69% → `media`, <40% → `baja`
- AND this MUST NOT override explicit Gemini output when Gemini responds successfully

### Requirement: Weather Code in Context

The Gemini prompt SHOULD include `weatherCode` (WMO code) as contextual information for richer narrative.

#### Scenario: Weather code description in prompt

- GIVEN `weatherCode` is available
- WHEN `buildUserPrompt()` renders
- THEN the prompt SHOULD include the WMO code alongside zone data
- AND the system prompt SHOULD map known WMO codes (e.g., 71–77 = snow, 51–57 = drizzle)

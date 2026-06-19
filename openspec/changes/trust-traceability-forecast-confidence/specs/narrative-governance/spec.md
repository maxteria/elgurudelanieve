# Narrative Governance Specification

## Purpose

Exaggerated phrases ("se viene un paquetón", "powder day") erode trust when data doesn't back them up. This spec defines hard rules that prevent the system from generating or displaying overstated narrative when data thresholds are not met.

## Requirements

### Requirement: Phrase Blocking Rules

The system MUST block specific exaggerated phrases when data thresholds are not met.

"se viene un paquetón" and "powder day" MUST NOT appear if:
- Confidence is Baja, OR
- PowderScore < 78, OR
- Freezing level > zone altitude + 300m, OR
- Wind > 45 km/h

"nevada fuerte" MUST NOT appear if:
- Confidence is Baja, OR
- Estimated snow < 3cm for that period

Any superlative or exaggerated claim MUST be blocked if confidence is Baja.

#### Scenario: Low confidence prevents exaggerated phrase

- GIVEN the LLM or fallback generator outputs "se viene un paquetón"
- BUT confidence is Baja or PowderScore < 78
- WHEN the governance layer runs
- THEN the governance layer replaces the message with a safe fallback
- AND the original phrase is never rendered

#### Scenario: High confidence allows phrase

- GIVEN confidence is Alta and PowderScore >= 78
- AND freezing level is favorable and wind is moderate
- WHEN the governance layer runs
- THEN the governance layer allows "se viene un paquetón" through
- AND the original message is rendered as-is

#### Scenario: LLM generates prohibited phrase

- GIVEN the LLM returns a message containing "powder day"
- BUT confidence is Media or Baja
- WHEN the governance layer runs
- THEN the system falls back to the safe fallback message for that period
- AND the violation is logged (not user-visible)

#### Scenario: Safe fallback maintains local tone

- GIVEN a phrase was blocked
- WHEN the safe fallback is selected
- THEN the fallback maintains warm, direct local tone
- BUT avoids any exaggerated or superlative language

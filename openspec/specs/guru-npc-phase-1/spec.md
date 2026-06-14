# Spec: Gurú NPC — Phase 1

## Change

**guru-npc-phase-1** — UI wiring and test coverage for structured NPC output.

## Assessment

**No behavioral spec required.** Phase 1 is pure implementation of an already-deployed AI layer change. See `openspec/changes/guru-npc-phase-1/spec-assessment.md` for the full rationale.

## Rationale

The core AI layer (`src/lib/ai/types.ts`, `src/lib/ai/guru-copy.ts`) was modified during the design phase to produce structured `GuruNpcOutput` instead of a flat string. Those changes:

- Introduce no new external API contracts
- Preserve `generateTouristCopy` as a deprecated re-export
- Maintain identical fallback behavior (8 decision branches, unchanged logic)
- Only change the **shape of what is returned** and **how the UI consumes it**

This phase completes the remaining work: rendering mood indicators, certainty bars, and tips in existing components, wiring pages, and adding test coverage.

## Implicit Contract

The component props define the de facto spec for this phase:

### `GuruNpcCard.astro`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `mood` | `GuruMood` | Yes | Mood state: excited, confident, cautious, warning, neutral |
| `certainty` | `GuruCertainty` | Yes | Certainty level: alta, media, baja |
| `message` | `string` | Yes | 2-3 sentence narrative from the Gurú |
| `tip` | `string \| null` | Yes | Optional actionable advice |
| `source` | `'ai' \| 'fallback'` | Yes | Message origin |
| `snowLabel` | `string \| undefined` | No | Period snow label (existing) |

### `GuruTouristCopy.astro`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `mood` | `GuruMood` | Yes | Mood state |
| `certainty` | `GuruCertainty` | Yes | Certainty level |
| `message` | `string` | Yes | Narrative text |
| `tip` | `string \| null` | Yes | Optional advice |
| `source` | `'ai' \| 'fallback'` | Yes | Message origin |

## Visual Contract

| Element | GuruNpcCard (hero) | GuruTouristCopy (compact) |
|---------|--------------------|---------------------------|
| Mood indicator | Colored dot/icon driven by `data-mood` attribute | Colored circle next to avatar driven by `data-mood` attribute |
| Certainty display | 3-segment bar (alta=3, media=2, baja=1) + text label | Text label next to source badge |
| Tip section | Compact callout below message (hidden when `null`) | Compact text below message (hidden when `null`) |

## Color Mapping

| Mood | Color | Hex |
|------|-------|-----|
| `excited` | Green | `#22c55e` |
| `confident` | Blue | `#60a5fa` |
| `cautious` | Amber | `#fbbf24` |
| `warning` | Red | `#ef4444` |
| `neutral` | Slate | `#94a3b8` |

## Success Criteria

1. GuruNpcCard renders mood dot, certainty bar, and tip when present
2. GuruTouristCopy renders mood dot (avatar circle color), certainty label, and tip when present
3. Components gracefully handle `tip: null` (no tip section rendered)
4. `src/pages/index.astro` wires new fields to both components
5. `src/pages/lab.astro` passes new fields to tourist component updates
6. Unit tests cover `extractJsonGuruResponse` (JSON parsing edge cases) and `generateFallbackNpcMessage` (all 8 branches)
7. `npm run build` passes with zero type errors

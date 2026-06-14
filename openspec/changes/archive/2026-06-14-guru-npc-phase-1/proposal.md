# Proposal: Gurú NPC — Phase 1

## Intent

The Gurú is currently a flat text generator — returns a plain string, no personality, no mood, no certainty indication. This phase transforms it into a structured character output (`GuruNpcOutput`) that unlocks mood awareness, certainty display, and contextual tips. Foundation for all future NPC phases.

## Scope

### In Scope
- `GuruNpcOutput` type: mood, certainty, message, tip, source
- Rewritten Gemini prompt: mountain guide identity + structured JSON output
- Safe JSON parser: `{...}` extraction, try/catch, structured fallback
- `guru-copy.ts` returns `GuruNpcOutput` instead of plain string
- `generateFallbackTouristCopy` returns same structured format
- `GuruNpcCard.astro`: mood indicator (color/icon), certainty bar, tip section
- `GuruTouristCopy.astro`: same treatment
- Unit tests for parser and fallback

### Out of Scope
- Visual NPC redesign (animations, reactive emblem) — Phase 2
- Time-of-day / confidence-based modulation — Phase 3
- System 1 + System 2 — Phase 4
- Memory / knowledge persistence — Phase 5
- Interactive Q&A — Phase 6

## Capabilities

### New Capabilities
None — pure implementation change. No spec-level requirements introduced.

### Modified Capabilities
None — no existing capabilities change behavior.

## Approach

1. Define `GuruNpcOutput` in `src/lib/ai/types.ts`
2. Rewrite Gemini prompt: character context ("30 winters in Caviahue"), structured JSON request, mood modulation by `powderScore` + `alerts`
3. Build JSON extractor: find `{...}`, `JSON.parse`, fallback to error format
4. Rename `fetchGuruCopy` → `generateGuruNpcMessage` returning `GuruNpcOutput`
5. Rewrite `generateFallbackTouristCopy` as `generateFallbackNpcMessage`
6. Update `GuruNpcCard.astro`: mood icon, certainty bar, tip
7. Update `GuruTouristCopy.astro`: same
8. Write tests for parser and fallback

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/ai/guru-copy.ts` | Modified | Return `GuruNpcOutput` |
| `src/lib/ai/types.ts` | New | `GuruNpcOutput` type |
| `src/components/guru/GuruNpcCard.astro` | Modified | Mood, certainty, tip |
| `src/components/GuruTouristCopy.astro` | Modified | Same |
| `src/pages/index.astro` | Modified | Wire new output |
| `src/pages/lab.astro` | Modified | Wire new output |
| `src/lib/__tests__/guru-npc.test.ts` | New | Parser + fallback tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gemini returns invalid/markdown-wrapped JSON | Medium | Robust `{...}` extraction + fallback same structure |
| 200 token budget tight with JSON | Medium | Increase to 300–400 |
| Gemini 429/timeout | Low | Fallback produces identical structure |

## Rollback

Revert the commit. Previous plain-text fallback and `generateTouristCopy` still work unchanged.

## Dependencies

None.

## Success Criteria

- [ ] `npx vitest run` passes (existing + new tests)
- [ ] `npm run build` passes
- [ ] GuruNpcCard shows mood, certainty indicator, and tip section
- [ ] Fallback produces same structured format without Gemini
- [ ] All 3 demo scenarios (seco / nieve / mixto) show appropriate moods

# Design: Gurú NPC — Phase 1

## Technical Approach

Structured character output (`GuruNpcOutput`) for the Gurú. The AI layer (types, JSON parser, fallback, Gemini prompt) is already implemented. This phase completes: UI rendering of mood/certainty/tip in components, page wiring, and test coverage.

## Architecture Decisions

### Decision: Mood→Color mapping (centralized)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Per-component CSS | Duplication, drift risk | ❌ |
| Tailwind `data-` attribute selectors in global CSS | Clean, component-agnostic, one source of truth | ✅ |

Map: `excited→#22c55e` (green), `confident→#60a5fa` (blue), `cautious→#fbbf24` (amber), `warning→#ef4444` (red), `neutral→#94a3b8` (slate).

### Decision: Certainty display

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Text labels only | Low visual impact | ❌ |
| Colored bar + text | Instant reading, accessible | ✅ |

3-segment bar: `alta`=3 filled, `media`=2 filled, `baja`=1 filled. Label alongside.

### Decision: Tip section

`tip: null` → no tip section rendered. `tip: string` → rendered as a compact callout below message. No animation in this phase.

### Decision: JSON parser strategy

Already implemented in `guru-copy.ts`: regex `{...}` extraction + `JSON.parse` + strict field validation with enum coercion (`VALID_MOODS`, `VALID_CERTAINTIES`). Fallback produces identical `GuruNpcOutput` shape.

## Data Flow

```
Snow Engine ──→ analyzeAllPeriods() ──→ PeriodInterpretations
                                              │
                                              ▼
    GuruCopyInput { period, powderScore, zones, alerts, bestWindow }
                                              │
                                              ▼
    generateGuruNpcMessage(data) ──→ Gemini API (JSON response)
         │                                       │
         │  (fail/429/no key)                    ▼
         └──→ generateFallbackNpcMessage()   extractJsonGuruResponse()
                                              │         │
                                              ▼         ▼
    GuruNpcOutput { mood, certainty, message, tip, source }
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
            GuruNpcCard.astro          GuruTouristCopy.astro       index/lab pages
            (hero, mood icon,          (compact, mood dot,         (pass all fields
             certainty bar, tip)        certainty bar, tip)         to components)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/ai/types.ts` | Already done | `GuruNpcOutput`, `GuruMood`, `GuruCertainty` |
| `src/lib/ai/guru-copy.ts` | Already done | Parser, fallback, Gemini prompt, main entry |
| `src/components/guru/GuruNpcCard.astro` | Modify | Add mood icon, certainty bar, tip section |
| `src/components/GuruTouristCopy.astro` | Modify | Add mood dot, certainty text, tip line |
| `src/pages/index.astro` | Modify | Destructure mood/certainty/tip, pass to components |
| `src/pages/lab.astro` | Modify | Update client-side wiring to include new fields |
| `src/lib/__tests__/guru-npc.test.ts` | Create | Unit tests for parser + fallback |

## Interfaces / Contracts

```typescript
// Already in src/lib/ai/types.ts:
type GuruMood = 'excited' | 'confident' | 'cautious' | 'warning' | 'neutral';
type GuruCertainty = 'alta' | 'media' | 'baja';
type GuruSource = 'ai' | 'fallback';

interface GuruNpcOutput {
  mood: GuruMood;
  certainty: GuruCertainty;
  message: string;        // 2-3 sentence narrative
  tip: string | null;     // actionable advice or null
  source: GuruSource;
}
```

Component props:
- `GuruNpcCard`: `{ mood, certainty, message, tip, source, snowLabel }`
- `GuruTouristCopy`: `{ mood, certainty, message, tip, source }`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `extractJsonGuruResponse` | Valid JSON, markdown-wrapped, missing fields, invalid enums, malformed |
| Unit | `generateFallbackNpcMessage` | All 8 decision branches (mixed, wind, no-snow+cota, cold-dry, no-snow-generic, yes+window, possible+window, possible) |
| Build | TypeScript + Astro | `npm run build` passes without type errors |

## Migration / Rollout

No migration required. `generateTouristCopy` is preserved as a deprecated re-export — existing callers continue working through the same entry point.

## Open Questions

None. The AI layer is already implemented; remaining work is pure UI wiring.

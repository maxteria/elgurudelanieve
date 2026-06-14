# Tasks: Gurú NPC — Phase 1

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300–350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: CSS Foundation

- [x] 1.1 Add `data-mood-excited`, `data-mood-confident`, `data-mood-cautious`, `data-mood-warning`, `data-mood-neutral` selectors in `src/styles/tailwind.css` with color mappings per design decision

## Phase 2: GuruNpcCard Component

- [x] 2.1 Update `src/components/guru/GuruNpcCard.astro` frontmatter to accept `mood`, `certainty`, `tip` props alongside existing `touristCopy` → `message`
- [x] 2.2 Add mood icon indicator (colored dot/icon driven by `data-mood` attribute)
- [x] 2.3 Add certainty bar (3-segment bar: `alta`=3 filled, `media`=2, `baja`=1 + label)
- [x] 2.4 Add tip section (rendered as compact callout when `tip` is not null)

## Phase 3: GuruTouristCopy Component

- [x] 3.1 Update `src/components/GuruTouristCopy.astro` frontmatter to accept `mood`, `certainty`, `tip` props alongside existing `touristCopy` → `message`
- [x] 3.2 Add mood dot (colored circle next to avatar driven by `data-mood` attribute)
- [x] 3.3 Add certainty text label next to source badge
- [x] 3.4 Add tip line (compact text below message, conditional on `tip !== null`)

## Phase 4: Page Wiring

- [x] 4.1 Update `src/pages/index.astro`: destructure `mood`, `certainty`, `message`, `tip`, `source` from `generateGuruNpcMessage` result; pass new props to `<GuruNpcCard>`
- [x] 4.2 Update `src/pages/lab.astro` server-side: include `mood`, `certainty`, `tip` in `periodDataJson`
- [x] 4.3 Update `src/pages/lab.astro` client JS: pass `mood`, `certainty`, `tip` to tourist component updates

## Phase 5: Tests

- [x] 5.1 Create `src/lib/__tests__/guru-npc.test.ts` with tests for `extractJsonGuruResponse`: valid JSON, markdown-wrapped, missing fields, invalid enums, malformed input
- [x] 5.2 Add tests for `generateFallbackNpcMessage`: all 8 decision branches (mixed, wind, no-snow+cota, cold-dry, no-snow-generic, yes+window, yes, possible+window, possible)
- [x] 5.3 Verify `npm run build` passes with no type errors

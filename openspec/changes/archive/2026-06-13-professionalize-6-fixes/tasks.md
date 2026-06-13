# Tasks: Professionalize + 6 Fixes

## Review Workload Forecast

| Field                   | Value      |
| ----------------------- | ---------- |
| Estimated changed lines | ~130       |
| 400-line budget risk    | Low        |
| Chained PRs recommended | No         |
| Suggested split         | Single PR  |
| Delivery strategy       | ask-always |
| Chain strategy          | pending    |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Tooling & Infrastructure

- [x] 1.1 Create `.editorconfig` with charset utf-8, indent 2 spaces, end_of_line lf
- [x] 1.2 Create `.prettierrc` with `semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `plugins: ['prettier-plugin-astro']`
- [x] 1.3 Install devDeps: `npm install -D vitest prettier prettier-plugin-astro`
- [x] 1.4 Add `"format": "prettier --write ."` script to `package.json`
- [x] 1.5 Add vitest config to `package.json` or `vitest.config.ts`
- [x] 1.6 Add `format-check` job to `.github/workflows/rebuild.yml` (runs `npx prettier --check .` before build)

## Phase 2: Bug Fixes

- [x] 2.1 Fix Cumbre altitude 2845→2045 in `src/pages/pronostico.astro` (line ~199 value + line ~373 zone label)
- [x] 2.2 Fix `src/components/SnowWindow.astro`: compute day labels from `from`/`to` props, remove hardcoded "Miércoles - Jueves"
- [x] 2.3 Update `src/pages/index.astro`: replace hardcoded tourist copy with `touristCopies.tomorrow` & `.sevenDays` from AI data

## Phase 3: Scoring Enhancement

- [x] 3.1 Write RED test: `src/lib/__tests__/scoring.test.ts` — `calculatePowderScore` with snowfall cm input expects specific value
- [x] 3.2 Add snowfall cm weight to `src/lib/scoring.ts`: integrate Open-Meteo `snowfall` field into `calculatePowderScore`
- [x] 3.3 Update GREEN test: verify test passes with actual snowfall-integrated scoring

## Phase 4: Cleanup

- [x] 4.1 Delete `src/lib/narrative.ts`
- [x] 4.2 Verify no remaining imports of `narrative` anywhere in `src/`

## Phase 5: Verification

- [x] 5.1 Run `npm run build` — verify zero errors
- [x] 5.2 Run `npx vitest run` — verify all scoring tests pass
- [x] 5.3 Run `npx prettier --check .` — verify all files formatted
- [x] 5.4 Verify Cumbre zone displays 2045m with correct temps/cota/wind in 3 demo scenarios (verified via source inspection + build)
- [x] 5.5 Verify SnowWindow shows computed day names (not hardcoded) (verified via source inspection)
- [x] 5.6 Verify home page shows AI-generated tourist copy for all periods (verified via source inspection)

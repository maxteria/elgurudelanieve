# Proposal: Professionalize + 6 Fixes

## Intent

Professionalize Caviahue's snow dashboard in one focused SDD cycle: fix critical data bugs, remove dead code, add test infrastructure, and integrate snowfall data into the scoring engine. Three pillars, six fixes, zero architecture overhaul.

## Scope

### In Scope

1. Fix Cumbre altitude: 2845m → 2045m in `pronostico.astro`
2. Fix SnowWindow days: compute from actual `from`/`to` data instead of hardcoded "Miércoles - Jueves"
3. Use AI-generated `touristCopies.tomorrow` & `.sevenDays` on home page (replace hardcoded text)
4. Delete dead code: `src/lib/narrative.ts` (unused, ships to prod)
5. Install Vitest + write first tests for `scoring.ts` (pure, deterministic)
6. Integrate Open-Meteo `snowfall` (cm) into scoring algorithm (currently ignored)
7. Tooling: Prettier + `prettier-plugin-astro`, `.editorconfig`, format script, CI format check

### Out of Scope

- Dual type system elimination (too large)
- Charts, CI/CD gates, retry/timeout, historical pipeline, ML models

## Capabilities

### New Capabilities

None — pure bug fixes, dead code removal, and test additions. No new spec-level behaviors.

### Modified Capabilities

None — no existing specs to modify. Scoring behavior changes internally (snowfall cm weight) but no spec-level requirement changes.

## Approach

Six independent surgical fixes, each in its own commit, one PR:

| #   | Fix                       | Commit                                                 | Est. Δ lines |
| --- | ------------------------- | ------------------------------------------------------ | ------------ |
| 1   | Altitude 2845→2045        | `fix: correct Cumbre altitude to 2045m`                | 2            |
| 2   | Dynamic SnowWindow days   | `fix: compute SnowWindow days from data`               | 4            |
| 3   | AI tourist copies on home | `fix: use AI-generated tourist copies for all periods` | ~10          |
| 4   | Delete narrative.ts       | `chore: remove unused narrative.ts`                    | −11          |
| 5   | Vitest + scoring tests    | `test: install Vitest, test calculatePowderScore`      | ~80          |
| 6   | Snowfall cm in scoring    | `feat: integrate snowfall cm into powder score`        | ~30          |
| 7   | Prettier + EditorConfig   | `chore: add Prettier, EditorConfig, format toolchain`  | ~15          |

TDD for #6: write test first (RED), add snowfall scoring (GREEN), refactor later.

## Affected Areas

| Area                                | Impact   | Description                                      |
| ----------------------------------- | -------- | ------------------------------------------------ |
| `src/pages/pronostico.astro`        | Modified | Altitude fix: line 199 + zone label line 373     |
| `src/components/SnowWindow.astro`   | Modified | Remove hardcoded days, compute via props         |
| `src/pages/index.astro`             | Modified | Replace hardcoded text with `touristCopies`      |
| `src/lib/narrative.ts`              | Removed  | Delete dead code                                 |
| `src/lib/scoring.ts`                | Modified | Add snowfall cm weight to scoring logic          |
| `src/lib/__tests__/scoring.test.ts` | New      | First unit tests                                 |
| `package.json`                      | Modified | Add vitest + prettier dev dependencies + scripts |
| `.editorconfig`                     | New      | Editor basic settings                            |
| `.prettierrc`                       | New      | Prettier config with Astro plugin                |
| `.github/workflows/rebuild.yml`     | Modified | Add format check to CI                           |

## Risks

| Risk                               | Likelihood | Mitigation                                                     |
| ---------------------------------- | ---------- | -------------------------------------------------------------- |
| Altitude fix changes data output   | Low        | Verify all 3 demo scenarios after fix                          |
| Snowfall cm scoring changes scores | Low        | Update scoring tests to lock expected values                   |
| Dead code removal breaks build     | Very Low   | Build will fail if anything imports it (test: `npm run build`) |

## Rollback Plan

Each fix is an independent commit. Revert individual commits as needed. No migration or data concerns — SSG rebuild on deploy.

## Dependencies

- `npm install -D vitest prettier prettier-plugin-astro`
- Existing Gemini API key for AI tourist copies

## Success Criteria

- [ ] `npm run build` passes with zero errors
- [ ] Cumbre zone shows 2045m (not 2845m) with correct temps/cota/wind
- [ ] SnowWindow displays computed day names, not hardcoded "Miércoles - Jueves"
- [ ] Home page shows dynamic AI text for all 4 periods (not hardcoded)
- [ ] `narrative.ts` deleted + no import errors
- [ ] `npx vitest run` passes with scoring tests
- [ ] Powder score reflects snowfall cm in demo "nieve" scenario
- [ ] `npm run format` formats all `.astro`, `.ts`, `.js`, `.mjs` files
- [ ] `.editorconfig` exists and matches project conventions
- [ ] CI checks format before build

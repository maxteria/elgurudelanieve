# Tasks: UX /pronostico — Confidence y tabla extendida

## T1: Refactor `forecast-periods.ts` — Caviahue timezone
- Import `getCaviahueDayKey` from `../time/caviahue-time`
- Group hourly entries by Caviahue day key instead of UTC
- Compute `todayKey` and `yesterdayKey` via `getCaviahueDayKey`
- Past-date filter: `dayKey < yesterdayKey → skip` (allows yesterday through)
- Limit to 7 days from start (yesterday or today)
- **Files**: `src/lib/forecast-periods.ts`
- **Test**: `npm test` passes, no new tests needed (data shape unchanged)

## T2: Refactor `pronostico.ts` — Caviahue today + AYER
- Import `getCaviahueDayKey` from `./time/caviahue-time`
- Replace `todayKey` calculation with `getCaviahueDayKey(new Date().toISOString())`
- Add `isYesterday` prop to `DayData` type
- In map loop: detect yesterday by comparing `day.date` with `yesterdayKey`
- If `isYesterday`, override `dayLabel` to `'AYER'` and skip `dayNum` (keep it for spacing)
- **Files**: `src/lib/pronostico.ts`
- **Test**: `npm test` passes

## T3: Update `ConfidenceBadge.astro` — UX labels
- Remove `{confidence.value}` from summary line
- Rename "En contra" → "Razones de la lectura"
- Show "Señales a favor" only if `reasonsFor.length > 0`
- If both arrays are empty, hide detail content entirely
- **Files**: `src/components/ConfidenceBadge.astro`
- **Test**: visual check on `/pronostico`

## T4: Update `SignalSummary.astro` — mensaje sin datos
- Replace "Explicación detallada no disponible para esta corrida" → "Señales meteorológicas: sin datos suficientes"
- **Files**: `src/components/SignalSummary.astro`
- **Test**: visual check on `/pronostico`

## T5: Verify build + tests
- Run `npm test` — all existing tests pass
- Run `npm run build` or equivalent — no type errors
- **Files**: none

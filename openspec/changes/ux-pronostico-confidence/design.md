# Design: UX /pronostico — Confidence y tabla extendida

## Files to modify

### 1. `src/lib/forecast-periods.ts`
- Replace `d.toISOString().slice(0,10)` grouping with `getCaviahueDayKey(h.time)`
- Replace `new Date()` for past-date filter with Caviahue-based comparison (string-compare day keys)
- Add AYER: set `minKey = yesterdayKey` so yesterday data passes the filter if it exists
- Limit to 7 days starting from AYER (if present) or HOY
- Import `getCaviahueDayKey` from `../lib/time/caviahue-time`

### 2. `src/lib/pronostico.ts`
- Replace `todayKey = new Date()` with `getCaviahueDayKey(new Date().toISOString())`
- Add `isYesterday` boolean to `DayData` type
- In `buildDaysData`, detect yesterday day and set `isYesterday = true`
- Update `formatDate`-equivalent or add check: if `isYesterday`, override `dayLabel` to 'AYER'
- Remove `toLocalDateKey` (unused after this change) or keep as dead code

### 3. `src/components/ConfidenceBadge.astro`
- Remove `{confidence.value}` from the summary line (numerical value hidden)
- Change "A favor" section: only show if `reasonsFor.length > 0`, label → "Señales a favor"
- Change "En contra" → "Razones de la lectura"
- If both arrays empty, hide the entire detail content

### 4. `src/components/SignalSummary.astro`
- Change "Explicación detallada no disponible para esta corrida" → "Señales meteorológicas: sin datos suficientes"

## Data flow
```
API hourly data
  → getSevenDayForecast (Caviahue grouping)
    → DailySummary[] with Caviahue-local dates
      → buildDaysData (Caviahue todayKey, AYER detection)
        → DayData[] (isToday, isYesterday flags)
          → Table render (labels: AYER / HOY / weekday)
```

## Edge cases
- **Midnight crossover**: If it's 00:30 Caviahue time, yesterday is still the current day's data for most users. The calendar day IS the boundary — yesterday is yesterday.
- **No AYER data**: API only returns forecast from today forward → table starts at HOY.
- **reasonsFor empty**: Only show "Razones de la lectura" section (reasonsAgainst).
- **Both reasons empty**: Collapse inner detail; only show the label line.

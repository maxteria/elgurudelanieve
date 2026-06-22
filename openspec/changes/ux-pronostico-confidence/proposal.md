# Proposal: UX /pronostico — Confidence y tabla extendida

## Intent
Corregir dos problemas de UX en `/pronostico` post-fix de confidence:
1. La tabla extendida no arranca en el día local correcto de Caviahue
2. El bloque de confianza muestra términos técnicos o contradictorios al usuario final

## Scope

### Issue A: Tabla extendida arranca en día incorrecto
**Problema**: `getSevenDayForecast()` en `forecast-periods.ts` y `buildDaysData()` en `pronostico.ts` usan `new Date()` (hora local del servidor) para determinar "hoy". El servidor puede estar en UTC u otra zona horaria ≠ `America/Argentina/Buenos_Aires`, causando que el día actual de Caviahue sea filtrado como "pasado".

**Fix**:
- Crear helper `getCaviahueNow()` que retorna la fecha actual en `America/Argentina/Buenos_Aires`
- Usarlo en `forecast-periods.ts` (filtro `if (d < now) continue` y `maxDate`)
- Usarlo en `pronostico.ts` (cálculo de `todayKey`)
- Si hay datos del día anterior al actual de Caviahue, rotular como "AYER"

### Issue B: Confianza UX incorrecta
**Problemas**:
1. `ConfidenceBadge` muestra `{value}` (ej: "Confianza Alta 100") — el número 100 es técnico/absoluto para el usuario final
2. "En contra" no corresponde cuando la razón es "Lectura consistente: sin condiciones de nieve" (no es una razón "en contra", es la lectura misma)
3. "A favor" / "En contra" es un framing binario que no refleja el índice de consistencia
4. "Explicación detallada no disponible" (SignalSummary) contradice que SÍ se muestra una razón en el ConfidenceBadge

**Fix**:
- Ocultar `confidence.value` en el badge público; mostrar solo label ("Confianza Alta / Media / Baja")
- Cambiar "En contra" → "Razones de la lectura" (neutral, refleja consistencia)
- Cambiar "A favor" → eliminarlo si `reasonsFor` está vacío; si hay contenido, rotular como "Señales a favor"
- Si `reasonsFor` y `reasonsAgainst` están ambos vacíos, mostrar mensaje claro o colapsar
- SignalSummary: cambiar "Explicación detallada no disponible para esta corrida" por algo que no contradiga el badge

### Non-goals
- No tocar el algoritmo CCI ni el scoring — ya están correctos
- No tocar Lab/debug (no existe vista de confidence ahí)
- No cambiar la lógica de negocio de forecast-periods más allá de la timezone

## Approach
1. Crear `src/lib/caviahue-time.ts` con helper `getCaviahueDate()` y `getCaviahueNow()`
2. Modificar `forecast-periods.ts`: usar Caviahue time para filtro de fechas
3. Modificar `pronostico.ts`: usar Caviahue time para `todayKey`
4. Modificar `ConfidenceBadge.astro`: ocultar valor numérico, renombrar labels
5. Modificar `SignalSummary.astro`: ajustar mensaje de "no disponible"
6. Tests existentes deben seguir pasando

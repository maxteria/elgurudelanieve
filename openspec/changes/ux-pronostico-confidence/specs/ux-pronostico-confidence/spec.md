# Spec: UX /pronostico — Confidence y tabla extendida

## Purpose
Corregir la UX del pronóstico extendido en `/pronostico` post-fix de confidence: la tabla debe reflejar el día calendario local de Caviahue, y el bloque de confianza debe mostrar términos legibles para el usuario final sin números técnicos ni etiquetas contradictorias.

## Requirements

### REQ-1: Tabla extendida usa calendario local de Caviahue
**La tabla de pronóstico extendido debe basar TODO cálculo de "hoy" en `America/Argentina/Buenos_Aires`, no en la zona horaria del servidor/build.**

- `getSevenDayForecast` debe agrupar datos horarios por fecha local de Caviahue usando `getCaviahueDayKey()` de `src/lib/time/caviahue-time.ts`
- El filtro de "fechas pasadas" debe usar Caviahue today como límite inferior
- `buildDaysData` debe calcular `todayKey` usando `getCaviahueDayKey(new Date())`
- `isToday` en cada columna de la tabla debe reflejar el día local de Caviahue

### REQ-2: AYER condicional
**Si existen datos reales del día anterior al actual (Caviahue), incluirlos al inicio de la tabla rotulados como "AYER".**

- Solo incluir AYER si hay registros horarios reales para ese `dayKey`
- No inventar ni rellenar datos de ayer
- Si no hay datos de ayer, arrancar directamente en HOY
- El label visual debe mostrar "AYER" reemplazando el nombre del día de semana

### REQ-3: Confidence sin número técnico en UI pública
**El badge de confianza no debe mostrar el valor numérico (0–100) en `/pronostico`.**

- Ocultar `confidence.value` en `ConfidenceBadge.astro` para usuarios finales
- Mostrar solo la etiqueta textual: "Confianza alta / Confianza media / Confianza baja"
- El número puede mostrarse en `/lab` si existe vista de debug, no en `/pronostico`

### REQ-4: Etiquetas de razones legibles
**Reemplazar el framing binario "A favor / En contra" por "Razones de la lectura".**

- Cambiar "A favor" → no mostrar si `reasonsFor` está vacío
- Cambiar "En contra" → "Razones de la lectura"
- Si ambos arreglos están vacíos, colapsar la sección de razones internas del detail
- El framing debe reflejar que es un índice de consistencia, no un debate a favor/en contra

### REQ-5: Sin mensajes contradictorios
**"Explicación detallada no disponible" no debe aparecer cuando SÍ hay razones visibles en el ConfidenceBadge.**

- Si el ConfidenceBadge muestra razones, SignalSummary no debe mostrar el mensaje contradictorio
- SignalSummary puede mostrar su contenido normal (tabla de señales por zona) si hay datos reales
- Si no hay señales reales, mostrar mensaje neutro tipo "Señales meteorológicas: sin datos suficientes"

### REQ-6: No tocar lógica de predicción
- No modificar `computeConsistencyIndex`, `calculateConfidence`, `evaluateHour`, ni ningún archivo en `src/lib/prediction/`
- No modificar `src/lib/scoring.ts`
- No modificar `src/lib/snow-engine.ts`
- No modificar `src/lib/master-verdict.ts`

## Scenarios

### Escenario 1: Tabla arranca correctamente en HOY
- GIVEN el servidor corre en UTC y son las 22:00 UTC (19:00 Arg)
- WHEN se renderiza `/pronostico`
- THEN la tabla arranca en la fecha calendario de Caviahue (no salta a mañana)
- THEN la columna "HOY" corresponde al día actual de Argentina

### Escenario 2: AYER condicional
- GIVEN hay datos horarios reales para ayer (Caviahue) en la respuesta de la API
- WHEN se renderiza la tabla
- THEN aparece una columna "AYER" al inicio
- THEN el label es "AYER" no el nombre del día de semana

- GIVEN NO hay datos de ayer en la respuesta de la API
- WHEN se renderiza la tabla
- THEN no aparece columna "AYER"
- THEN la tabla arranca directamente en HOY

### Escenario 3: Confidence sin número
- WHEN se abre `/pronostico`
- THEN el badge de confianza muestra "Confianza alta", no "Confianza Alta 100"
- THEN el valor numérico no aparece en el DOM visible

### Escenario 4: Razones legibles
- GIVEN el CCI retorna razones como "Lectura consistente: sin condiciones de nieve en el período"
- WHEN se despliega el detalle del ConfidenceBadge
- THEN el label es "Razones de la lectura", no "A favor / En contra"
- THEN el texto de la razón se muestra correctamente en español

### Escenario 5: Sin mensajes contradictorios
- GIVEN el ConfidenceBadge muestra razones de consistencia
- WHEN SignalSummary no tiene datos reales
- THEN NO aparece "Explicación detallada no disponible"
- THEN aparece "Señales meteorológicas: sin datos suficientes"

## Constraints
- Usar `getCaviahueDayKey()` existente en `src/lib/time/caviahue-time.ts` — NO crear otro helper
- Archivos a modificar: `forecast-periods.ts`, `pronostico.ts`, `ConfidenceBadge.astro`, `SignalSummary.astro`
- Archivos nuevos: ninguno (reforzar helper existente)
- Tests: los tests existentes deben seguir pasando. Agregar tests si hay lógica nueva extraíble.

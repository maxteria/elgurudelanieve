import type { HourlySnowClassification, HourlyClassificationLabel, ZoneProfile } from './types';
import type { SourceStatus } from '../types';

export interface ConsistencyIndexResult {
  value: number; // 0–100 integer
  label: 'Low' | 'Medium' | 'High';
  reasons: string[];
}

/**
 * Compute a **consistency** index (0–100) measuring how uniform the hourly
 * classifications are. Unlike a snow-signal score, this measures how much
 * the hourly evidence agrees on a single conclusion regardless of what that
 * conclusion is (snow, no-snow, marginal, unknown).
 *
 *   High   (≥75): nearly all hours agree on the same classification.
 *   Medium (45–74): mixed signals, a clear tendency exists.
 *   Low    (<45): strong disagreement, split group, or insufficient data.
 *
 * Caps (data-quality reductions):
 *   - Missing critical data in ≥1/3 of hours ⇒ max 45
 *   - Any missing critical data (<1/3) ⇒ max 60
 *   - Main source failed/demo without alternative ⇒ max 50
 *
 * Caps deliberately NOT applied here (already handled by evaluateHour):
 *   temperature > 3, freezing level >> zone, insufficient precipitation
 */
export function computeConsistencyIndex(
  hourly: HourlySnowClassification[],
  _zone: ZoneProfile,
  sourceStatus?: SourceStatus,
): ConsistencyIndexResult {
  // Defensive
  if (!hourly || hourly.length === 0) {
    return { value: 0, label: 'Low', reasons: ['Sin datos horarios para medir consistencia'] };
  }

  // Count per classification
  const counts: Record<HourlyClassificationLabel, number> = {
    snow_likely: 0,
    snow_marginal: 0,
    not_snow: 0,
    unknown: 0,
  };
  let missingDataCount = 0;

  for (const h of hourly) {
    counts[h.classification] = (counts[h.classification] || 0) + 1;
    if (h.missingData && h.missingData.length > 0) missingDataCount++;
  }

  // Find dominant classification
  const total = hourly.length;
  const dominant = (Object.entries(counts) as [HourlyClassificationLabel, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const dominantCount = dominant[1];
  const dominantLabel = dominant[0];
  const consistencyRatio = dominantCount / total;
  let score = Math.round(consistencyRatio * 100);

  const reasons: string[] = [];

  // Human-readable reason in Spanish based on dominant classification & consistency
  if (consistencyRatio >= 0.75) {
    switch (dominantLabel) {
      case 'not_snow':
        reasons.push('Lectura consistente: sin condiciones de nieve en el período');
        break;
      case 'snow_likely':
        reasons.push('Lectura consistente: condiciones favorables para nieve');
        break;
      case 'snow_marginal':
        reasons.push('Lectura mayoritariamente consistente con condiciones marginales');
        break;
      case 'unknown':
        reasons.push('Predominan horas sin clasificar — consistencia limitada');
        break;
    }
  } else if (consistencyRatio >= 0.5) {
    switch (dominantLabel) {
      case 'not_snow':
        reasons.push('Tendencia a condiciones desfavorables, con algunas horas a monitorear');
        break;
      case 'snow_likely':
        reasons.push('Tendencia favorable con algunas horas menos concluyentes');
        break;
      default:
        reasons.push('Señales mixtas: condiciones variables entre horas');
        break;
    }
  } else {
    reasons.push('Señales muy divididas entre las horas — no hay una lectura clara');
  }

  // Apply data-quality caps (the most restrictive wins)
  let cap = 100;

  // 1) Missing critical data
  const missingThreshold = Math.ceil(total / 3);
  if (missingDataCount >= missingThreshold) {
    cap = Math.min(cap, 45);
    reasons.push('Datos críticos faltantes en varias horas — límite 45');
  } else if (missingDataCount > 0) {
    cap = Math.min(cap, 60);
    reasons.push('Algunos datos críticos faltantes — límite 60');
  }

  // 2) Main source failure/demo without alternative ⇒ max 50
  if (sourceStatus) {
    const main = sourceStatus.openMeteo;
    const altOk = sourceStatus.weatherApi === 'ok' || sourceStatus.aic === 'ok';
    if ((main === 'failed' || main === 'demo') && !altOk) {
      cap = Math.min(cap, 50);
      reasons.push('Fuente meteorológica principal no disponible — límite 50');
    }
  }

  const finalValue = Math.min(score, cap);

  const label: ConsistencyIndexResult['label'] =
    finalValue >= 75 ? 'High' : finalValue >= 45 ? 'Medium' : 'Low';

  return { value: Math.round(finalValue), label, reasons };
}

export default computeConsistencyIndex;

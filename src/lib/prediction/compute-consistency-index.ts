import type { HourlySnowClassification, ZoneProfile } from './types';
import type { SourceStatus } from '../types';

export interface ConsistencyIndexResult {
  value: number; // 0-100 integer
  label: 'Low' | 'Medium' | 'High';
  reasons: string[];
}

/**
 * Compute a conservative consistency index (0–100) for a zone evaluation.
 * Applies hard caps as specified in the SDD:
 * - missing temperature OR missing freezingLevel ⇒ max 45
 * - insufficient precipitation ⇒ max 40 for snow
 * - freezingLevelM > zoneAltitudeM + 500 ⇒ max 35
 * - temperatureC > 3 ⇒ max 35
 * - main source failure/demo w/o alternative ⇒ max 50
 */
export function computeConsistencyIndex(
  hourly: HourlySnowClassification[],
  zone: ZoneProfile,
  sourceStatus?: SourceStatus,
): ConsistencyIndexResult {
  // Defensive
  if (!hourly || hourly.length === 0) {
    return { value: 0, label: 'Low', reasons: ['No hourly data to compute consistency'] };
  }

  // Baseline scoring: reward snow_likely, partial reward for snow_marginal, penalize not_snow/unknown
  const total = hourly.length;
  let score = 50; // neutral baseline
  let positivePoints = 0;
  let negativePoints = 0;
  let precipHours = 0;

  for (const h of hourly) {
    if (h.classification === 'snow_likely') {
      positivePoints += 2; // strong signal
    } else if (h.classification === 'snow_marginal') {
      positivePoints += 1; // weaker
    } else if (h.classification === 'not_snow') {
      negativePoints += 1;
    } else if (h.classification === 'unknown') {
      negativePoints += 1;
    }

    // Explicitly check known precipitation/snowfall values. Do NOT coerce null/undefined to 0.
    const precipVal = typeof h.signal.precipitationMm === 'number' ? h.signal.precipitationMm : null;
    const snowfallVal = typeof h.signal.snowfallCm === 'number' ? h.signal.snowfallCm : null;
    const hasSufficientPrecip =
      (precipVal !== null && precipVal >= 0.2) || (snowfallVal !== null && snowfallVal >= 0.1);
    if (hasSufficientPrecip) precipHours += 1;
  }

  // Collapse into a 0-100 scale (allow low values when signals are weak/negative)
  const ratio = positivePoints / (positivePoints + negativePoints || 1);
  const raw = Math.round(ratio * 100);
  score = Math.max(0, Math.min(100, raw));

  const reasons: string[] = [];
  if (positivePoints > negativePoints) reasons.push('Signal contains positive snow hours');
  if (negativePoints > positivePoints) reasons.push('More negative/unknown hours than positive');

  // Apply hard caps (the most restrictive wins)
  let cap = 100;

  // 1) missing temperature or freezingLevel ⇒ max 45
  const hasMissingCritical = hourly.some((h) => (h.missingData || []).length > 0);
  if (hasMissingCritical) {
    cap = Math.min(cap, 45);
    reasons.push('Missing critical data (temperature or freezing level) — applying cap 45');
  }

  // 2) insufficient precipitation ⇒ max 40 for snow
  // Only apply this cap when we actually observed precipitation data (known hours)
  const knownPrecipHours = hourly.reduce((c, h) => {
    const p = typeof h.signal.precipitationMm === 'number' ? h.signal.precipitationMm : null;
    const s = typeof h.signal.snowfallCm === 'number' ? h.signal.snowfallCm : null;
    return c + (p !== null || s !== null ? 1 : 0);
  }, 0);
  if (knownPrecipHours > 0 && precipHours === 0) {
    cap = Math.min(cap, 40);
    reasons.push('Insufficient precipitation signal — applying cap 40');
  }

  // 3) freezing level too high ⇒ max 35
  const freezingTooHigh = hourly.some(
    (h) => typeof h.signal.freezingLevelM === 'number' && h.signal.freezingLevelM > zone.elevationM + 500,
  );
  if (freezingTooHigh) {
    cap = Math.min(cap, 35);
    reasons.push('Freezing level above zone +500m — applying cap 35');
  }

  // 4) temperature too high ⇒ max 35
  const tempTooHigh = hourly.some(
    (h) => typeof h.signal.temperatureC === 'number' && h.signal.temperatureC > 3,
  );
  if (tempTooHigh) {
    cap = Math.min(cap, 35);
    reasons.push('Temperature > 3°C in the period — applying cap 35');
  }

  // 5) main source failure/demo w/o alternative ⇒ max 50
  if (sourceStatus) {
    const main = sourceStatus.openMeteo;
    const altOk = (sourceStatus.weatherApi === 'ok') || (sourceStatus.aic === 'ok');
    if ((main === 'failed' || main === 'demo') && !altOk) {
      cap = Math.min(cap, 50);
      reasons.push('Main source failed/demo and no alternative available — applying cap 50');
    }
  }

  const finalValue = Math.min(score, cap);

  const label: ConsistencyIndexResult['label'] =
    finalValue >= 75 ? 'High' : finalValue >= 45 ? 'Medium' : 'Low';

  return { value: Math.round(finalValue), label, reasons };
}

export default computeConsistencyIndex;

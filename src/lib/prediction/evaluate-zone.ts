import type {
  HourlySnowSignal,
  ZoneProfile,
  HourlySnowClassification,
} from './types';
import evaluateHour from './evaluate-hour';

export interface ZoneSnowEvaluation {
  zoneId: string;
  summary: 'yes' | 'possible' | 'no' | 'unknown';
  hourly: HourlySnowClassification[];
  counts: { hoursWithPrecip: number; snowLikely: number; snowMarginal: number };
  accumulationEstimateCm: number | null;
  contradictions: string[];
}

/**
 * Evaluate a zone across a series of hourly signals.
 * Conservative rules: prefer false negatives and surface contradictions.
 */
export function evaluateZone(profile: ZoneProfile, signals: HourlySnowSignal[]): ZoneSnowEvaluation {
  const hourly = signals.map((s) => evaluateHour(s, profile));

  const counts = { hoursWithPrecip: 0, snowLikely: 0, snowMarginal: 0 };
  let accumulationSum = 0;
  let anySnowfallReported = false;
  const contradictions: string[] = [];

  for (const h of hourly) {
    // Do not coerce missing precipitation to 0. Treat unknowns explicitly.
    const p = typeof h.signal.precipitationMm === 'number' ? h.signal.precipitationMm : null;
    const sfc = typeof h.signal.snowfallCm === 'number' ? h.signal.snowfallCm : null;
    if ((p !== null && p >= 0.2) || (sfc !== null && sfc >= 0.1)) counts.hoursWithPrecip += 1;
    if (h.classification === 'snow_likely') counts.snowLikely += 1;
    if (h.classification === 'snow_marginal') counts.snowMarginal += 1;
    if (sfc !== null && sfc !== undefined) {
      anySnowfallReported = true;
      accumulationSum += sfc;
    }
    // contradictions: warm hours during a snow signal
    if (h.signal.temperatureC !== undefined && h.signal.temperatureC !== null && h.signal.temperatureC > 3) {
      contradictions.push('Warm hour present (temp > 3°C)');
    }
    if (h.signal.freezingLevelM !== undefined && h.signal.freezingLevelM !== null && h.signal.freezingLevelM > profile.elevationM + 500) {
      contradictions.push('Freezing level well above zone (+500m)');
    }
  }

  // Detect longest consecutive snow_likely run
  let maxConsecLikely = 0;
  let cur = 0;
  for (const h of hourly) {
    if (h.classification === 'snow_likely') {
      cur += 1;
      maxConsecLikely = Math.max(maxConsecLikely, cur);
    } else {
      cur = 0;
    }
  }

  // Conservative accumulation rules: report accumulation only when snowfall reported
  // and there are no known blockers (known high temps or known very high freezing levels).
  let accumulationEstimateCm: number | null = null;
  if (anySnowfallReported) {
    // If any temperature is known and >2.5, block accumulation
    const anyKnownWarm = hourly.some(
      (h) => typeof h.signal.temperatureC === 'number' && h.signal.temperatureC > 2.5,
    );
    // If any freezing level is known and > zone + 500, block accumulation
    const anyKnownFreezingHigh = hourly.some(
      (h) => typeof h.signal.freezingLevelM === 'number' && h.signal.freezingLevelM > profile.elevationM + 500,
    );
    if (!anyKnownWarm && !anyKnownFreezingHigh) {
      accumulationEstimateCm = Math.round(accumulationSum * 10) / 10; // round to 0.1cm
    }
  }

  // Summary decision
  let summary: ZoneSnowEvaluation['summary'] = 'no';
  if (hourly.every((h) => h.classification === 'unknown')) {
    summary = 'unknown';
  } else if (maxConsecLikely >= 3 || (accumulationEstimateCm !== null && accumulationEstimateCm >= 2.0)) {
    // ensure no critical contradictions
    const hasCritical = hourly.some((h) =>
      (typeof h.signal.temperatureC === 'number' && h.signal.temperatureC > 3) ||
      (typeof h.signal.freezingLevelM === 'number' && h.signal.freezingLevelM > profile.elevationM + 500),
    );
    summary = hasCritical ? 'possible' : 'yes';
  } else if (counts.snowLikely >= 1 && counts.snowLikely <= 2) {
    summary = 'possible';
  } else if (counts.snowMarginal >= 2) {
    summary = 'possible';
  } else if (counts.snowMarginal >= 1 && accumulationEstimateCm !== null && accumulationEstimateCm > 0) {
    // explicit snowfall even when temp/freezing missing should surface as possible (conservative)
    summary = 'possible';
  } else if (counts.hoursWithPrecip === 0) {
    summary = 'no';
  } else {
    summary = 'no';
  }

  return {
    zoneId: profile.id,
    summary,
    hourly,
    counts,
    accumulationEstimateCm,
    contradictions: Array.from(new Set(contradictions)),
  };
}

export default evaluateZone;

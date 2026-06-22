import type { HourlyForecast, PowderScoreResult, ConfidenceScore, SourceStatus } from './types';
import type { ZoneProfile } from './prediction/types';
import evaluateHour from './prediction/evaluate-hour';
import computeConsistencyIndex from './prediction/compute-consistency-index';

export function calculatePowderScore(
  forecast: HourlyForecast[],
  altitude: number,
): PowderScoreResult {
  let maxScore = 0;
  let curStartIdx: number | null = null;

  for (let i = 0; i < forecast.length; i++) {
    const h = forecast[i];
    let score = 0;
    // Base snow: precip + cold enough + freezing level below zone + 150m
    if (h.precip > 0 && h.temp <= 2 && h.freezing_level <= altitude + 150) {
      score += 60;
      // Extra powder quality based on temperature
      if (h.temp <= -4) score += 30;
      else if (h.temp <= -2) score += 22;
      else if (h.temp <= 0) score += 12;
    }
    // Snowfall bonus: actual cm of accumulated snow is the strongest signal
    if (h.snowfall > 0 && h.temp <= 2 && h.freezing_level <= altitude + 150) {
      if (h.snowfall >= 3) score += 20;
      else if (h.snowfall >= 1.5) score += 14;
      else if (h.snowfall >= 0.5) score += 8;
      else score += 3;
    }
    // Wind bonus: moderate wind carries snow well
    if (h.wind >= 12 && h.wind <= 30) score += 8;
    else if (h.wind > 30 && h.wind <= 40) score += 4;
    // Wind penalty: too strong
    if (h.wind > 45) score -= 10;
    // Wind direction bonus: SW through W (180°–315°) → +15
    if (h.windDir >= 180 && h.windDir <= 315) score += 15;
    // Cloud cover bonus: >60% → +10
    if (h.cloudCover > 60) score += 10;
    // Wind gusts penalty: >50 km/h → −8
    if (h.windGusts > 50) score -= 8;
    // Warm penalty
    if (h.temp >= 3) score -= 5;
    if (score < 0) score = 0;
    if (score > maxScore) {
      maxScore = score;
      curStartIdx = i;
    }
  }
  if (maxScore > 100) maxScore = 100;

  let reason = '';
  if (maxScore >= 78) reason = 'Muy buenas condiciones para nieve polvo';
  else if (maxScore >= 60) reason = 'Buenas condiciones, nieve posible';
  else if (maxScore >= 35) reason = 'Condiciones regulares, nieve húmeda';
  else reason = 'Score bajo — sin condiciones para nieve polvo';

  let snowWindow: PowderScoreResult['snowWindow'] = null;
  if (maxScore >= 55 && curStartIdx !== null) {
    const endIdx = Math.min(curStartIdx + 4, forecast.length - 1);
    snowWindow = {
      fromTime: forecast[curStartIdx].time,
      toTime: forecast[endIdx].time,
    };
  }
  return { value: maxScore, reason, snowWindow };
}

/**
 * Calculate a confidence score (0–100) for a forecast period.
 * This is a SIGNAL CONSISTENCY index, NOT a probability of accuracy.
 * Based on: source agreement, precipitation probability, temperature,
 * freezing level, wind, and AIC availability.
 */
export function calculateConfidence(
  hourly: HourlyForecast[],
  sourceStatus: SourceStatus,
  altitude: number,
): ConfidenceScore {
  // Delegate to canonical prediction consistency index implementation.
  // Build HourlySnowSignal shapes and evaluate per-hour classification using
  // the refactored prediction engine helpers so computeConsistencyIndex is
  // the single source of truth for value and reasons.
  if (!hourly || hourly.length === 0) {
    // Keep legacy deterministic return shape while delegating reasons/value
    return { value: 0, label: 'Baja', reasonsFor: [], reasonsAgainst: ['No hourly data to compute consistency'] };
  }

  // Create a minimal ZoneProfile compatible object for the prediction helpers
  const zoneProfile: ZoneProfile = { id: 'legacy', name: 'legacy', elevationM: altitude };

  // Convert HourlyForecast -> HourlySnowSignal and evaluate per-hour
  const classifications = hourly.map((h) => {
    const signal = {
      utcHour: h.time,
      temperatureC: typeof h.temp === 'number' ? h.temp : null,
      precipitationMm: typeof h.precip === 'number' ? h.precip : null,
      snowfallCm: typeof h.snowfall === 'number' ? h.snowfall : null,
      freezingLevelM: typeof h.freezing_level === 'number' ? h.freezing_level : null,
      windKmh: typeof h.wind === 'number' ? h.wind : null,
      humidityPct: typeof h.humidity === 'number' ? h.humidity : null,
      sourceStatus: undefined,
    } as any;
    return evaluateHour(signal, zoneProfile);
  });

  const cci = computeConsistencyIndex(classifications, zoneProfile, sourceStatus);

  // Map CCI label -> localized ConfidenceScore label
  const label: ConfidenceScore['label'] = cci.label === 'High' ? 'Alta' : cci.label === 'Medium' ? 'Media' : 'Baja';

  // Expose CCI reasons as reasonsAgainst to preserve the decision trace; keep
  // reasonsFor empty (the CCI reasons are mixed by nature).
  return { value: cci.value, label, reasonsFor: [], reasonsAgainst: cci.reasons };
}

import type { HourlyForecast, PowderScoreResult, ConfidenceScore, SourceStatus } from './types';

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
  if (!hourly || hourly.length === 0) {
    return {
      value: 0,
      label: 'Baja',
      reasonsFor: [],
      reasonsAgainst: ['Datos insuficientes para calcular confianza'],
    };
  }

  let value = 50; // baseline neutral
  const reasonsFor: string[] = [];
  const reasonsAgainst: string[] = [];

  // 1. Source agreement (up to +20)
  if (sourceStatus.openMeteo === 'ok') {
    value += 10;
    reasonsFor.push('Open-Meteo disponible');
  } else {
    value -= 5;
    reasonsAgainst.push('Open-Meteo no disponible');
  }
  if (sourceStatus.weatherApi === 'ok') {
    value += 5;
    reasonsFor.push('WeatherAPI disponible');
  } else if (sourceStatus.weatherApi === 'failed') {
    reasonsAgainst.push('WeatherAPI no disponible');
  }
  if (sourceStatus.aic === 'ok') {
    value += 5;
    reasonsFor.push('Validación AIC disponible');
  } else if (sourceStatus.aic === 'failed') {
    reasonsAgainst.push('Falta validación AIC actualizada');
  }

  // 2. Precipitation probability (up to +20)
  const avgPrecipProb =
    hourly.reduce((s, h) => s + (h.precipitationProbability ?? 0), 0) /
    hourly.length;
  if (avgPrecipProb > 60) {
    value += 20;
    reasonsFor.push('Precipitación probable >60%');
  } else if (avgPrecipProb > 30) {
    value += 10;
    reasonsFor.push('Precipitación posible 30–60%');
  } else if (avgPrecipProb > 10) {
    value += 5;
  } else {
    value -= 10;
    reasonsAgainst.push('Precipitación baja <10%');
  }

  // 3. Temperature vs freezing threshold (up to +15)
  const avgTemp =
    hourly.reduce((s, h) => s + h.temp, 0) / hourly.length;
  if (avgTemp <= 1) {
    value += 15;
    reasonsFor.push('Temperatura favorable para nieve');
  } else if (avgTemp <= 3) {
    value += 5;
    reasonsFor.push('Temperatura cerca del límite');
  } else {
    value -= 15;
    reasonsAgainst.push('Temperatura alta para nieve');
  }

  // 4. Freezing level / cota (up to +10)
  const avgFreezing =
    hourly.reduce((s, h) => s + h.freezingLevel, 0) / hourly.length;
  if (avgFreezing <= altitude + 150) {
    value += 10;
    reasonsFor.push('Cota favorece sectores altos');
  } else if (avgFreezing <= altitude + 300) {
    // neutral — cota media
  } else {
    value -= 10;
    reasonsAgainst.push('Cota alta para acumulación');
  }

  // 5. Wind (penalty up to -10)
  const maxWind = Math.max(...hourly.map((h) => h.wind));
  if (maxWind > 45) {
    value -= 10;
    reasonsAgainst.push('Viento muy fuerte (>45 km/h)');
  } else if (maxWind > 30) {
    value -= 5;
    reasonsAgainst.push('Viento fuerte puede afectar acumulación');
  } else if (maxWind >= 12) {
    value += 3;
    reasonsFor.push('Viento moderado favorable');
  }

  // Clamp to [0, 100]
  value = Math.max(0, Math.min(100, value));

  const label: ConfidenceScore['label'] =
    value >= 65 ? 'Alta' : value >= 35 ? 'Media' : 'Baja';

  return { value, label, reasonsFor, reasonsAgainst };
}

import { HourlyForecast, PowderScoreResult } from './types';

export function calculatePowderScore(forecast: HourlyForecast[], altitude: number): PowderScoreResult {
  let maxScore = 0;
  let bestWindow: [number, number] | null = null;
  let curStart: number|null = null;

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
    // Wind bonus: moderate wind carries snow well
    if (h.wind >= 12 && h.wind <= 30) score += 8;
    else if (h.wind > 30 && h.wind <= 40) score += 4;
    // Wind penalty: too strong
    if (h.wind > 45) score -= 10;
    // Warm penalty
    if (h.temp >= 3) score -= 5;
    if (score < 0) score = 0;
    if (score > maxScore) {
      maxScore = score;
      curStart = h.hour;
    }
  }
  if (maxScore > 100) maxScore = 100;

  let reason = '';
  if (maxScore >= 78) reason = 'Muy buenas condiciones para nieve polvo';
  else if (maxScore >= 60) reason = 'Buenas condiciones, nieve posible';
  else if (maxScore >= 35) reason = 'Condiciones regulares, nieve húmeda';
  else reason = 'Score bajo — sin condiciones para nieve polvo';

  if (maxScore >= 55 && curStart !== null) {
    let end = Math.min(curStart + 4, 23);
    if (curStart <= 3 && end >= 23) end = 23;
    bestWindow = [curStart, end];
  }
  return { value: maxScore, reason, snowWindow: bestWindow };
}

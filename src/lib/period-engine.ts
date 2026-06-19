import type { NormalizedSnowForecast } from './weather/types';
import type {
  PeriodKey,
  PeriodInterpretations,
  SnowInterpretation,
  SourceStatus,
  ResortStatus,
} from './types';
import { getTodayForecast, getTomorrowForecast } from './forecast-periods';
import { analyzeWeather } from './snow-engine';
import { loadResortStatus } from './resort-status';

function filterByPeriod(
  normalized: NormalizedSnowForecast,
  period: PeriodKey,
): NormalizedSnowForecast {
  let filteredHourly;
  switch (period) {
    case 'today':
      filteredHourly = getTodayForecast(normalized.hourly);
      break;
    case 'tomorrow':
      filteredHourly = getTomorrowForecast(normalized.hourly);
      break;
    case 'sevenDays':
      filteredHourly = normalized.hourly;
      break;
  }

  return {
    ...normalized,
    hourly: filteredHourly.filter((h) => h.temp !== undefined),
  };
}

export function analyzeAllPeriods(
  normalized: NormalizedSnowForecast,
  sourceStatus?: SourceStatus,
  resortStatus?: ResortStatus,
): PeriodInterpretations {
  const periods: PeriodKey[] = ['today', 'tomorrow', 'sevenDays'];
  const result = {} as PeriodInterpretations;
  const status = resortStatus ?? loadResortStatus();

  for (const period of periods) {
    const periodNorm = filterByPeriod(normalized, period);
    result[period] = analyzeWeather(periodNorm, sourceStatus, status);
  }

  return result;
}

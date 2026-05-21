/*
  SMN se usa solo como contraste regional/debug.
  La estación más cercana disponible es Zapala, a ~143 km de Caviahue.
  No apto para NowCard, Powder Score, forecast, ventanas ni alertas.
*/

import type { SMNCurrent } from './smn-types';
import type { WeatherAPICurrent } from '../types';
import type { NormalizedSnowForecast } from '../types';

export type SourceComparison = {
  smn: SMNCurrent | null;
  weatherApi: WeatherAPICurrent | null;
  openMeteoVillageTemp: number | null;
  openMeteoUpdated: string | null;
  differences: {
    smnVsWeatherApi: number | null;
    smnVsOpenMeteo: number | null;
  };
};

export function compareSources(
  smn: SMNCurrent | null,
  weatherApi: WeatherAPICurrent | null,
  normalized: NormalizedSnowForecast | null
): SourceComparison {
  const villageTemp = normalized?.zones?.village?.temp ?? null;
  const updated = normalized?.updatedAt ?? null;

  const smnVsWeatherApi =
    smn?.temp != null && weatherApi?.temp != null
      ? Math.round((smn.temp - weatherApi.temp) * 10) / 10
      : null;

  const smnVsOpenMeteo =
    smn?.temp != null && villageTemp != null
      ? Math.round((smn.temp - villageTemp) * 10) / 10
      : null;

  return {
    smn,
    weatherApi,
    openMeteoVillageTemp: villageTemp,
    openMeteoUpdated: updated,
    differences: {
      smnVsWeatherApi,
      smnVsOpenMeteo,
    },
  };
}

export function logComparison(cmp: SourceComparison): void {
  if (!cmp.smn) return;

  const parts: string[] = [`[SMN] ${cmp.smn.stationName} (a ${cmp.smn.distanceKm} km)`];

  if (cmp.smn.temp != null) {
    parts.push(`temp: ${cmp.smn.temp}°C`);
  }
  if (cmp.smn.condition) {
    parts.push(`cond: ${cmp.smn.condition}`);
  }
  if (cmp.smn.humidity != null) {
    parts.push(`hum: ${cmp.smn.humidity}%`);
  }
  if (cmp.smn.wind != null) {
    parts.push(`viento: ${cmp.smn.wind} km/h ${cmp.smn.windDirection ?? ''}`);
  }

  if (cmp.differences.smnVsWeatherApi != null) {
    parts.push(`vs WeatherAPI: ${cmp.differences.smnVsWeatherApi > 0 ? '+' : ''}${cmp.differences.smnVsWeatherApi}°C`);
  }
  if (cmp.differences.smnVsOpenMeteo != null) {
    parts.push(`vs Open-Meteo Pueblo: ${cmp.differences.smnVsOpenMeteo > 0 ? '+' : ''}${cmp.differences.smnVsOpenMeteo}°C`);
  }

  console.info(parts.join(' · '));
}

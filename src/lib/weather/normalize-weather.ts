import {
  OpenMeteoResponse,
  ZONE_ELEVATIONS,
  CAVIAHUE_COORDS
} from './open-meteo-api';
import {
  NormalizedSnowForecast,
  NormalizedHourlyForecast,
  NormalizedZoneForecast,
  ZoneId
} from './types';

const LAPSE_RATE = 0.0065;

function windChill(temp: number, windKmh: number): number {
  if (windKmh < 4.8 || temp > 10) return temp;
  const v = windKmh * 0.27778;
  return 13.12 + 0.6215 * temp - 11.37 * Math.pow(v, 0.16) + 0.3965 * temp * Math.pow(v, 0.16);
}

function snowChance(temp: number, precip: number, freezingLevel: number, altitude: number): number {
  if (precip <= 0) return 0;
  if (freezingLevel <= altitude + 50) return 95;
  if (freezingLevel <= altitude + 150) return 80;
  if (temp <= 0 && freezingLevel <= altitude + 300) return 60;
  if (temp <= 2 && freezingLevel <= altitude + 500) return 40;
  return 15;
}

function estimateFeelsLike(temp: number, windKmh: number): number {
  const chill = windChill(temp, windKmh);
  return Math.round(chill);
}

export function normalizeOpenMeteoResponse(raw: OpenMeteoResponse): NormalizedSnowForecast {
  const hourly: NormalizedHourlyForecast[] = raw.hourly.time.map((time, i) => ({
    time,
    temp: Math.round(raw.hourly.temperature_2m[i] * 10) / 10,
    feelsLike: Math.round(raw.hourly.apparent_temperature[i] * 10) / 10,
    precipitation: Math.round(raw.hourly.precipitation[i] * 10) / 10,
    snowfall: Math.round(raw.hourly.snowfall[i] * 10) / 10,
    freezingLevel: Math.round(raw.hourly.freezinglevel_height[i]),
    wind: Math.round(raw.hourly.wind_speed_10m[i] * 10) / 10,
    windGusts: Math.round(raw.hourly.wind_gusts_10m[i] * 10) / 10,
    humidity: Math.round(raw.hourly.relative_humidity_2m[i]),
    cloudCover: Math.round(raw.hourly.cloud_cover[i])
  }));

  const now = new Date();
  const currentHour = now.getHours();
  const current = hourly.find(h => {
    const hDate = new Date(h.time);
    return hDate.getHours() === currentHour;
  }) || hourly[0];

  // Open-Meteo da temperatura 2m sobre el terreno a la elevación del modelo.
  // No da datos separados por zona; se deriva Mid/Top desde la temperatura base.
  // Se usa Pueblo como referencia base porque es la cota más cercana al terreno real
  // y porque la elevación del modelo Open-Meteo puede diferir de la real.
  const baseAlt = ZONE_ELEVATIONS.village;

  if (import.meta.env.DEV) {
    const horaUsada = currentHour;
    console.debug(
      `[Weather] hora=${horaUsada} | ` +
      `temp_original=${current.temp}°C | ` +
      `elevacion_modelo=${raw.elevation}m | ` +
      `elevacion_base=${baseAlt}m | ` +
      `dif_altitud=${Math.round(baseAlt - raw.elevation)}m`
    );
  }

  function makeZoneForecast(id: ZoneId, label: string, altitude: number): NormalizedZoneForecast {
    // Transferir temperatura desde elevación del modelo hasta la base (Pueblo)
    const transferToBase = ((baseAlt - raw.elevation) * LAPSE_RATE);
    const tempAtBase = Math.round((current.temp + transferToBase) * 10) / 10;
    // Luego ajustar desde base hasta la zona objetivo
    const zoneOffset = ((altitude - baseAlt) * LAPSE_RATE);
    const zoneTemp = Math.round((tempAtBase - zoneOffset) * 10) / 10;

    const zoneWind = Math.round(current.wind * (1 + 0.08 * ((altitude - baseAlt) / 100)));
    const zonePrecip = current.precipitation;
    const zoneFreezing = current.freezingLevel;
    const zoneFeelsLike = estimateFeelsLike(zoneTemp, zoneWind);
    const zoneSnowChance = snowChance(zoneTemp, zonePrecip, zoneFreezing, altitude);

    if (import.meta.env.DEV) {
      console.debug(
        `[Weather] ${label} alt=${altitude}m | ` +
        `temp_final=${zoneTemp}°C | ` +
        `transfer=${(transferToBase).toFixed(2)}°C | ` +
        `offset=${(-zoneOffset).toFixed(2)}°C`
      );
    }

    return {
      id,
      label,
      altitude,
      temp: zoneTemp,
      feelsLike: zoneFeelsLike,
      wind: zoneWind,
      precipitation: zonePrecip,
      snowChance: zoneSnowChance,
      freezingLevel: zoneFreezing
    };
  }

  return {
    updatedAt: now.toISOString(),
    location: {
      name: CAVIAHUE_COORDS.name,
      lat: raw.latitude,
      lon: raw.longitude
    },
    zones: {
      village: makeZoneForecast('village', 'Pueblo', ZONE_ELEVATIONS.village),
      mid: makeZoneForecast('mid', 'Centro', ZONE_ELEVATIONS.mid),
      top: makeZoneForecast('top', 'Cumbre', ZONE_ELEVATIONS.top)
    },
    hourly
  };
}

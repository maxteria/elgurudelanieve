export const CAVIAHUE_COORDS = {
  lat: -37.86,
  lon: -71.08,
  name: 'Caviahue',
};

export const ZONE_ELEVATIONS = {
  village: 1647,
  mid: 1846,
  top: 2045,
};

export type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    snowfall: number[];
    freezinglevel_height: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    relative_humidity_2m: number[];
    cloud_cover: number[];
    snow_depth: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  /** Open-Meteo current_weather=true response */
  current_weather?: {
    time: string;
    temperature: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
    weathercode: number;
    interval: number;
  };
  /** Open-Meteo daily= params response */
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    snowfall_sum: number[];
    precipitation_probability_max: number[];
  };
};

export function buildOpenMeteoUrl(
  lat: number,
  lon: number,
  options?: { forecastDays?: number; timezone?: string },
): string {
  const days = options?.forecastDays ?? 2;
  const tz = options?.timezone ?? 'auto';
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'snowfall',
      'freezinglevel_height',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'relative_humidity_2m',
      'cloud_cover',
      'snow_depth',
      'weather_code',
      'precipitation_probability',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'snowfall_sum',
      'precipitation_probability_max',
    ].join(','),
    current_weather: 'true',
    timezone: tz,
    forecast_days: days.toString(),
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  options?: { forecastDays?: number; timezone?: string },
): Promise<OpenMeteoResponse> {
  const url = buildOpenMeteoUrl(lat, lon, options);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export type WeatherAPICurrent = {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  cloudCover: number;
  updatedAt: string;
};

export type WeatherAPIResponse = {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current: {
    temp_c: number;
    feelslike_c: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    humidity: number;
    wind_kph: number;
    cloud: number;
    last_updated: string;
  };
};

const API_KEY_ENV = 'WEATHERAPI_KEY';

export function getWeatherAPIKey(): string | undefined {
  return (
    (import.meta.env[API_KEY_ENV] as string | undefined) ||
    process.env[API_KEY_ENV]
  );
}

export function buildWeatherAPIUrl(
  lat: number,
  lon: number,
  key: string,
): string {
  const params = new URLSearchParams({
    key,
    q: `${lat},${lon}`,
    lang: 'es',
  });
  return `https://api.weatherapi.com/v1/current.json?${params.toString()}`;
}

export async function fetchWeatherAPI(
  lat: number,
  lon: number,
  key: string,
): Promise<WeatherAPIResponse> {
  const url = buildWeatherAPIUrl(lat, lon, key);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`WeatherAPI error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function normalizeWeatherAPI(
  raw: WeatherAPIResponse,
): WeatherAPICurrent {
  return {
    temp: Math.round(raw.current.temp_c * 10) / 10,
    feelsLike: Math.round(raw.current.feelslike_c * 10) / 10,
    condition: raw.current.condition.text,
    icon: raw.current.condition.icon.startsWith('//')
      ? 'https:' + raw.current.condition.icon
      : raw.current.condition.icon,
    humidity: raw.current.humidity,
    wind: Math.round(raw.current.wind_kph * 10) / 10,
    cloudCover: raw.current.cloud,
    updatedAt: raw.current.last_updated,
  };
}

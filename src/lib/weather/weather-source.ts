import type { NormalizedSnowForecast, NormalizedZoneForecast, NormalizedHourlyForecast, WeatherAPICurrent } from './types';
import type { WeatherData } from '../types';
import type { SMNCurrent } from './smn';
import type { DemoSenario } from '../../data/demo-scenarios';
import { fetchOpenMeteo, CAVIAHUE_COORDS } from './open-meteo-api';
import { normalizeOpenMeteoResponse } from './normalize-weather';
import { normalizedToLegacy } from './convert-to-legacy';
import { fetchWeatherAPI, normalizeWeatherAPI, getWeatherAPIKey } from './weather-api';
import { fetchSMNCurrent } from './smn';
import { compareSources, logComparison } from './smn';
import mockData from '../../data/weather.mock.json';
import { getDemoScenarioData } from '../../data/demo-scenarios';

export type WeatherMode = 'real' | 'demo';
export type DataSource = 'open-meteo' | 'mock-demo' | 'mock-fallback';

export type WeatherResult = {
  data: WeatherData;
  normalized: NormalizedSnowForecast;
  weatherApi: WeatherAPICurrent | null;
  smn: SMNCurrent | null;
  source: DataSource;
};

function resolveMode(mode?: WeatherMode): WeatherMode {
  if (mode === 'demo') return 'demo';
  if (mode === 'real') return 'real';
  return 'real';
}

async function fetchWeatherAPICurrent(): Promise<WeatherAPICurrent | null> {
  const apiKey = getWeatherAPIKey();
  if (!apiKey) return null;
  try {
    const raw = await fetchWeatherAPI(CAVIAHUE_COORDS.lat, CAVIAHUE_COORDS.lon, apiKey);
    const current = normalizeWeatherAPI(raw);
    console.info(`[WeatherSource] WeatherAPI: ${current.temp}°C, ${current.condition}`);
    return current;
  } catch (err) {
    console.warn('[WeatherSource] WeatherAPI fetch failed');
    return null;
  }
}

function logTemperatureDiff(weatherApi: WeatherAPICurrent, normalized: NormalizedSnowForecast): void {
  const villageTemp = normalized.zones.village.temp;
  const diff = Math.abs(weatherApi.temp - villageTemp);
  if (diff > 2) {
    console.info(`[WeatherSource] Diferencia actual: WeatherAPI ${weatherApi.temp}°C vs Open-Meteo Pueblo ${villageTemp}°C (${Math.round(diff * 10) / 10}°C de diferencia)`);
  }
}

export async function getWeatherData(options?: { mode?: WeatherMode; scenario?: DemoSenario }): Promise<WeatherResult> {
  const activeMode = resolveMode(options?.mode);

  const [smn] = await Promise.all([fetchSMNCurrent()]);

  if (activeMode === 'demo') {
    const data = options?.scenario
      ? getDemoScenarioData(options.scenario)
      : (mockData as WeatherData);
    const scenarioLabel = options?.scenario ?? 'default';
    console.info(`[WeatherSource] Demo mode active — scenario: ${scenarioLabel}`);
    const normalized = legacyToNormalized(data);
    const weatherApi = await fetchWeatherAPICurrent();
    if (weatherApi) logTemperatureDiff(weatherApi, normalized);
    if (smn && normalized) {
      const cmp = compareSources(smn, weatherApi, normalized);
      logComparison(cmp);
    }
    return { data, normalized, weatherApi, smn, source: 'mock-demo' };
  }

  try {
    const [raw, weatherApi] = await Promise.all([
      fetchOpenMeteo(CAVIAHUE_COORDS.lat, CAVIAHUE_COORDS.lon, { forecastDays: 7 }),
      fetchWeatherAPICurrent(),
    ]);
    const normalized = normalizeOpenMeteoResponse(raw);
    const data = normalizedToLegacy(normalized);
    if (weatherApi) logTemperatureDiff(weatherApi, normalized);
    if (smn && normalized) {
      const cmp = compareSources(smn, weatherApi, normalized);
      logComparison(cmp);
    }
    return { data, normalized, weatherApi, smn, source: 'open-meteo' };
  } catch (err) {
    console.warn('[WeatherSource] Open-Meteo fetch failed, using mock fallback:', err);
    const data = mockData as WeatherData;
    const normalized = legacyToNormalized(data);
    const weatherApi = await fetchWeatherAPICurrent();
    if (weatherApi) logTemperatureDiff(weatherApi, normalized);
    if (smn && normalized) {
      const cmp = compareSources(smn, weatherApi, normalized);
      logComparison(cmp);
    }
    return { data, normalized, weatherApi, smn, source: 'mock-fallback' };
  }
}

function legacyToNormalized(data: WeatherData): NormalizedSnowForecast {
  const zones = data.zones;
  const village = zones.find(z => z.name === 'Pueblo')!;
  const mid = zones.find(z => z.name === 'Centro')!;
  const top = zones.find(z => z.name === 'Cumbre')!;

  const baseDate = data.updated || new Date().toISOString();
  const baseTime = new Date(baseDate);

  const hourly: NormalizedHourlyForecast[] = village.hourly.map((h, i) => ({
    time: new Date(baseTime.getFullYear(), baseTime.getMonth(), baseTime.getDate(), h.hour).toISOString(),
    temp: h.temp,
    feelsLike: h.feels_like,
    precipitation: h.precip,
    snowfall: 0,
    freezingLevel: h.freezing_level,
    wind: h.wind,
    windGusts: h.wind + 10,
    humidity: 60,
    cloudCover: 70
  }));

  function makeZone(f: typeof village): NormalizedZoneForecast {
    const first = f.hourly[0];
    return {
      id: f.name === 'Pueblo' ? 'village' : f.name === 'Centro' ? 'mid' : 'top',
      label: f.name,
      altitude: f.altitude,
      temp: first.temp,
      feelsLike: first.feels_like,
      wind: first.wind,
      precipitation: first.precip,
      snowChance: first.snow_prob,
      freezingLevel: first.freezing_level
    };
  }

  return {
    updatedAt: baseDate,
    location: { name: 'Caviahue', lat: -37.85, lon: -71.05 },
    zones: {
      village: makeZone(village),
      mid: makeZone(mid),
      top: makeZone(top)
    },
    hourly
  };
}

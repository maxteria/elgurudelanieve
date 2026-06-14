import type {
  NormalizedSnowForecast,
  NormalizedZoneForecast,
  NormalizedHourlyForecast,
  WeatherAPICurrent,
} from './types';
import type { SMNCurrent } from './smn';
import type { DemoSenario } from '../../data/demo-scenarios';
import { fetchOpenMeteo, CAVIAHUE_COORDS } from './open-meteo-api';
import { normalizeOpenMeteoResponse } from './normalize-weather';
import {
  fetchWeatherAPI,
  normalizeWeatherAPI,
  getWeatherAPIKey,
} from './weather-api';
import { fetchSMNCurrent } from './smn';
import { compareSources, logComparison } from './smn';
import { getDemoScenarioData } from '../../data/demo-scenarios';

export type WeatherMode = 'real' | 'demo';
export type DataSource = 'open-meteo' | 'mock-demo' | 'mock-fallback';

export type WeatherResult = {
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
    const raw = await fetchWeatherAPI(
      CAVIAHUE_COORDS.lat,
      CAVIAHUE_COORDS.lon,
      apiKey,
    );
    const current = normalizeWeatherAPI(raw);
    console.info(
      `[WeatherSource] WeatherAPI: ${current.temp}°C, ${current.condition}`,
    );
    return current;
  } catch (err) {
    console.warn('[WeatherSource] WeatherAPI fetch failed');
    return null;
  }
}

function logTemperatureDiff(
  weatherApi: WeatherAPICurrent,
  normalized: NormalizedSnowForecast,
): void {
  const villageTemp = normalized.zones.village.temp;
  const diff = Math.abs(weatherApi.temp - villageTemp);
  if (diff > 2) {
    console.info(
      `[WeatherSource] Diferencia actual: WeatherAPI ${weatherApi.temp}°C vs Open-Meteo Pueblo ${villageTemp}°C (${Math.round(diff * 10) / 10}°C de diferencia)`,
    );
  }
}

export async function getWeatherData(options?: {
  mode?: WeatherMode;
  scenario?: DemoSenario;
}): Promise<WeatherResult> {
  const activeMode = resolveMode(options?.mode);

  const [smn] = await Promise.all([fetchSMNCurrent()]);

  if (activeMode === 'demo') {
    const normalized = options?.scenario
      ? getDemoScenarioData(options.scenario)
      : getDemoScenarioData('nieve');
    const scenarioLabel = options?.scenario ?? 'nieve';
    console.info(
      `[WeatherSource] Demo mode active — scenario: ${scenarioLabel}`,
    );
    const weatherApi = await fetchWeatherAPICurrent();
    if (weatherApi) logTemperatureDiff(weatherApi, normalized);
    if (smn && normalized) {
      const cmp = compareSources(smn, weatherApi, normalized);
      logComparison(cmp);
    }
    return { normalized, weatherApi, smn, source: 'mock-demo' };
  }

  try {
    const [raw, weatherApi] = await Promise.all([
      fetchOpenMeteo(CAVIAHUE_COORDS.lat, CAVIAHUE_COORDS.lon, {
        forecastDays: 16,
      }),
      fetchWeatherAPICurrent(),
    ]);
    const normalized = normalizeOpenMeteoResponse(raw);
    if (weatherApi) logTemperatureDiff(weatherApi, normalized);
    if (smn && normalized) {
      const cmp = compareSources(smn, weatherApi, normalized);
      logComparison(cmp);
    }
    return { normalized, weatherApi, smn, source: 'open-meteo' };
  } catch (err) {
    console.warn(
      '[WeatherSource] Open-Meteo fetch failed, using demo fallback:',
      err,
    );
    const normalized = getDemoScenarioData('seco');
    const weatherApi = await fetchWeatherAPICurrent();
    if (weatherApi) logTemperatureDiff(weatherApi, normalized);
    if (smn && normalized) {
      const cmp = compareSources(smn, weatherApi, normalized);
      logComparison(cmp);
    }
    return { normalized, weatherApi, smn, source: 'mock-fallback' };
  }
}

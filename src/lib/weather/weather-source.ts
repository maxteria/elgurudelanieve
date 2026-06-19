import type {
  NormalizedSnowForecast,
  NormalizedZoneForecast,
  NormalizedHourlyForecast,
  WeatherAPICurrent,
} from './types';
import type { SMNCurrent } from './smn';
import type { DemoScenario } from '../../data/demo-scenarios';
import type { SourceStatus, SourceStatusValue } from '../types';
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
import { fetchAicStationData } from './sources/aic-scraper';
import {
  storeAicReading,
  getRecentAicReadings,
} from '../supabase/client';

export type WeatherMode = 'real' | 'demo';
export type DataSource = 'open-meteo' | 'mock-demo' | 'mock-fallback';

export type WeatherResult = {
  normalized: NormalizedSnowForecast;
  weatherApi: WeatherAPICurrent | null;
  smn: SMNCurrent | null;
  source: DataSource;
  sourceStatus: SourceStatus;
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
  scenario?: DemoScenario;
}): Promise<WeatherResult> {
  const activeMode = resolveMode(options?.mode);

  // SMN data fetched but not currently used - kept for future reference
  // const smn = await fetchSMNCurrent();
  const smn = null;

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
    return {
      normalized,
      weatherApi,
      smn,
      source: 'mock-demo',
      sourceStatus: { openMeteo: 'demo', weatherApi: weatherApi ? 'ok' : 'failed', aic: 'demo' },
    };
  }

  try {
    const [raw, weatherApi, aicData] = await Promise.all([
      fetchOpenMeteo(CAVIAHUE_COORDS.lat, CAVIAHUE_COORDS.lon, {
        forecastDays: 16,
      }),
      fetchWeatherAPICurrent(),
      fetchAicStationData(),
    ]);
    const normalized = normalizeOpenMeteoResponse(raw);
    // Merge AIC yesterday data if available (optional — build never breaks)
    if (aicData) {
      normalized.yesterday = aicData;
      console.info(
        `[WeatherSource] AIC yesterday: ${aicData.tempMin}°C / ${aicData.tempMax}°C`,
      );

      // Persist to Supabase (fire-and-forget style)
      storeAicReading({
        reading_date: aicData.date,
        station_name: aicData.stationName,
        humidity: aicData.humidity,
        precipitation: aicData.precipitation,
        pressure: aicData.pressure,
        temp_min: aicData.tempMin,
        temp_max: aicData.tempMax,
        wind_dir: aicData.windDir,
        wind_speed: aicData.windSpeed,
        wind_max: aicData.windMax,
        snow_water_eq: aicData.snowWaterEq,
      }).catch((err: unknown) =>
        console.warn('[WeatherSource] storeAicReading failed:', err),
      );

      // Load recent history for AI context
      const history = await getRecentAicReadings(7);
      if (history.length > 0) {
        normalized.aicHistory = history.map((r) => ({
          stationName: r.station_name,
          date: r.reading_date,
          humidity: r.humidity,
          precipitation: r.precipitation,
          pressure: r.pressure,
          tempMin: r.temp_min,
          tempMax: r.temp_max,
          windDir: r.wind_dir,
          windSpeed: r.wind_speed,
          windMax: r.wind_max,
          snowWaterEq: r.snow_water_eq,
          updatedAt: r.created_at ?? '',
        }));
        console.info(
          `[WeatherSource] Loaded ${history.length} AIC history records`,
        );
      }
    }
    if (weatherApi) logTemperatureDiff(weatherApi, normalized);
    if (smn && normalized) {
      const cmp = compareSources(smn, weatherApi, normalized);
      logComparison(cmp);
    }
    return {
      normalized,
      weatherApi,
      smn,
      source: 'open-meteo',
      sourceStatus: {
        openMeteo: 'ok',
        weatherApi: weatherApi ? 'ok' : 'failed',
        aic: aicData ? 'ok' : 'failed',
      },
    };
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
    return {
      normalized,
      weatherApi,
      smn,
      source: 'mock-fallback',
      sourceStatus: {
        openMeteo: 'failed',
        weatherApi: weatherApi ? 'ok' : 'failed',
        aic: 'failed',
      },
    };
  }
}

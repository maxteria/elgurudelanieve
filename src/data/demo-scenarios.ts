import type {
  NormalizedSnowForecast,
  NormalizedHourlyForecast,
  NormalizedZoneForecast,
} from '../lib/weather/types';

export type DemoScenario = 'seco' | 'nieve' | 'mixto';

const HOURS = 48;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function makeTime(hour: number): string {
  return `2026-05-20T${pad2(hour)}:00:00`;
}

function makeBaseHourly(
  baseTemp: number,
  precip: number,
  freezingLevel: number,
  humidity: number,
  wind: number,
  snowProb: number,
): NormalizedHourlyForecast[] {
  const hourly: NormalizedHourlyForecast[] = [];
  for (let h = 0; h < HOURS; h++) {
    const diurnal = Math.sin((((h % 24) - 6) * Math.PI) / 12) * 2;
    const temp = Math.round((baseTemp + diurnal) * 10) / 10;
    hourly.push({
      time: makeTime(h),
      temp,
      feelsLike: Math.round((temp - wind * 0.15) * 10) / 10,
      precipitation: precip,
      snowfall:
        precip > 0 && snowProb > 50 ? Math.round(precip * 0.8 * 10) / 10 : 0,
      freezingLevel: Math.round(freezingLevel + diurnal * 30),
      wind: Math.round(wind * 10) / 10,
      windDir: 180,
      windGusts: Math.round(wind * 1.4 * 10) / 10,
      humidity: Math.round(humidity),
      cloudCover: precip > 0 ? 80 : 40,
      snowDepth: precip > 0 ? 0.35 : 0.05,
      weatherCode: precip > 0 ? 71 : 0,
      precipitationProbability: precip > 0 ? snowProb : 0,
    });
  }
  return hourly;
}

function makeForecast(
  baseHourly: NormalizedHourlyForecast[],
  baseTemp: number,
  centerTemp: number,
  topTemp: number,
  precip: number,
  freezingLevel: number,
): NormalizedSnowForecast {
  const first = baseHourly[0];
  const wind = first.wind;

  function makeZone(
    id: 'village' | 'mid' | 'top',
    label: string,
    altitude: number,
    temp: number,
  ): NormalizedZoneForecast {
    return {
      id,
      label,
      altitude,
      temp: Math.round(temp * 10) / 10,
      feelsLike: Math.round((temp - wind * 0.15) * 10) / 10,
      wind,
      precipitation: precip,
      snowChance: precip > 0 && freezingLevel <= altitude + 150 ? 80 : 0,
      freezingLevel,
      humidity: first.humidity,
      snowDepth: first.snowDepth,
      weatherCode: first.weatherCode,
      precipitationProbability: first.precipitationProbability,
    };
  }

  return {
    updatedAt: '2026-05-20T12:00:00Z',
    location: { name: 'Caviahue', lat: -37.85, lon: -71.05 },
    zones: {
      village: makeZone('village', 'Pueblo (base)', 1647, baseTemp),
      mid: makeZone('mid', 'Centro (medio)', 1846, centerTemp),
      top: makeZone('top', 'Cumbre (alto)', 2045, topTemp),
    },
    hourly: baseHourly,
    yesterday: undefined,
    currentWeather: undefined,
    daily: undefined,
  };
}

function createSeco(): NormalizedSnowForecast {
  const hourly = makeBaseHourly(-0.5, 0, 3800, 65, 10, 0);
  return makeForecast(hourly, -0.5, -2, -3.5, 0, 3800);
}

function createNieve(): NormalizedSnowForecast {
  const hourly = makeBaseHourly(0.5, 1.2, 1580, 80, 8, 90);
  return makeForecast(hourly, 0.5, -1, -2.5, 1.2, 1580);
}

function createMixto(): NormalizedSnowForecast {
  const hourly = makeBaseHourly(2.5, 1.5, 1780, 75, 12, 70);
  return makeForecast(hourly, 2.5, 0.5, -1, 1.5, 1780);
}

export function getDemoScenarioData(
  scenario: DemoScenario,
): NormalizedSnowForecast {
  switch (scenario) {
    case 'seco':
      return createSeco();
    case 'nieve':
      return createNieve();
    case 'mixto':
      return createMixto();
  }
}

export function isValidScenario(s: string | null): s is DemoScenario {
  return s === 'seco' || s === 'nieve' || s === 'mixto';
}

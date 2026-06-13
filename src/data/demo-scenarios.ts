import type { WeatherData, HourlyForecast } from '../lib/types';

export type DemoSenario = 'seco' | 'nieve' | 'mixto';

const BASE_DATE = '2026-05-20T12:00:00Z';
const HOURS = 48;

function makeHourly(
  baseTemp: number,
  precip: number,
  freezingLevel: number,
  humidity: number,
  wind: number,
  snowProb: number,
): HourlyForecast[] {
  const hourly: HourlyForecast[] = [];
  for (let h = 0; h < HOURS; h++) {
    const diurnal = Math.sin((((h % 24) - 6) * Math.PI) / 12) * 2;
    hourly.push({
      hour: h,
      temp: Math.round((baseTemp + diurnal) * 10) / 10,
      feels_like: Math.round((baseTemp + diurnal - wind * 0.15) * 10) / 10,
      wind: Math.round(wind * 10) / 10,
      precip,
      snow_prob: precip > 0 ? snowProb : 0,
      freezing_level: Math.round(freezingLevel + diurnal * 30),
      humidity: Math.round(humidity),
    });
  }
  return hourly;
}

function makeData(
  puebloHourly: HourlyForecast[],
  centerTemp: number,
  topTemp: number,
): WeatherData {
  function makeZoneHours(
    baseHours: HourlyForecast[],
    offset: number,
    freezingLevel: number,
    precip: number,
  ): HourlyForecast[] {
    return baseHours.map((h, i) => {
      const zoneTemp = Math.round((h.temp - offset) * 10) / 10;
      return {
        hour: h.hour,
        temp: zoneTemp,
        feels_like: Math.round((zoneTemp - h.wind * 0.15) * 10) / 10,
        wind: h.wind,
        precip,
        snow_prob: precip > 0 ? 90 : 0,
        freezing_level: freezingLevel,
        humidity: h.humidity,
      };
    });
  }

  const centerFL = puebloHourly[0].freezing_level;
  const centerPrecip = puebloHourly[0].precip;
  const centerHours = makeZoneHours(
    puebloHourly,
    centerTemp - puebloHourly[0].temp,
    centerFL,
    centerPrecip,
  );
  const topHours = makeZoneHours(
    puebloHourly,
    topTemp - puebloHourly[0].temp,
    centerFL,
    centerPrecip,
  );

  return {
    updated: BASE_DATE,
    zones: [
      { name: 'Pueblo', altitude: 1647, hourly: puebloHourly },
      { name: 'Centro', altitude: 1846, hourly: centerHours },
      { name: 'Cumbre', altitude: 2045, hourly: topHours },
    ],
  };
}

function createSeco(): WeatherData {
  const pueblo = makeHourly(-0.5, 0, 3800, 65, 10, 0);
  return makeData(pueblo, -2, -3.5);
}

function createNieve(): WeatherData {
  const pueblo = makeHourly(0.5, 1.2, 1580, 80, 8, 90);
  return makeData(pueblo, -1, -2.5);
}

function createMixto(): WeatherData {
  const pueblo = makeHourly(2.5, 1.5, 1780, 75, 12, 70);
  return makeData(pueblo, 0.5, -1);
}

export function getDemoScenarioData(scenario: DemoSenario): WeatherData {
  switch (scenario) {
    case 'seco':
      return createSeco();
    case 'nieve':
      return createNieve();
    case 'mixto':
      return createMixto();
  }
}

export function isValidScenario(s: string | null): s is DemoSenario {
  return s === 'seco' || s === 'nieve' || s === 'mixto';
}

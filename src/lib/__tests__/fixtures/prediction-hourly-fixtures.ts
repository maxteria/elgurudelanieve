import type { HourlySnowSignal } from '../../prediction/types';
import { ZONE_PUEBLO, ZONE_BASE, ZONE_SUMMIT } from '../../prediction/types';

const baseDate = '2026-06-13T10:00:00Z';

export const clearSummitSnow: HourlySnowSignal = {
  zoneId: ZONE_SUMMIT.id,
  utcHour: '2026-06-13T10:00:00Z',
  temperatureC: -1.0,
  precipitationMm: 0.3,
  snowfallCm: 1.2,
  freezingLevelM: ZONE_SUMMIT.elevationM + 100,
};

export const rainInTownSnowAbove: HourlySnowSignal = {
  zoneId: ZONE_BASE.id,
  utcHour: '2026-06-13T11:00:00Z',
  temperatureC: 2.0,
  precipitationMm: 0.4,
  snowfallCm: 0,
  freezingLevelM: ZONE_BASE.elevationM + 600, // well above
};

export const marginalByFreezing: HourlySnowSignal = {
  zoneId: ZONE_BASE.id,
  utcHour: '2026-06-13T12:00:00Z',
  temperatureC: 0.5,
  precipitationMm: 0.25,
  snowfallCm: 0,
  freezingLevelM: ZONE_BASE.elevationM + 250, // between +200 and +400
};

export const marginalByTemperature: HourlySnowSignal = {
  zoneId: ZONE_BASE.id,
  utcHour: '2026-06-13T13:00:00Z',
  temperatureC: 2.0, // between 1.5 and 2.5
  precipitationMm: 0.3,
  snowfallCm: 0,
  freezingLevelM: ZONE_BASE.elevationM + 100,
};

export const noPrecip: HourlySnowSignal = {
  zoneId: ZONE_PUEBLO.id,
  utcHour: '2026-06-13T14:00:00Z',
  temperatureC: 0,
  precipitationMm: 0,
  snowfallCm: 0,
  freezingLevelM: ZONE_PUEBLO.elevationM + 100,
};

export const hotTemp: HourlySnowSignal = {
  zoneId: ZONE_PUEBLO.id,
  utcHour: '2026-06-13T15:00:00Z',
  temperatureC: 4.0,
  precipitationMm: 0.5,
  snowfallCm: 0,
  freezingLevelM: ZONE_PUEBLO.elevationM + 100,
};

export const veryHighFreezing: HourlySnowSignal = {
  zoneId: ZONE_BASE.id,
  utcHour: '2026-06-13T16:00:00Z',
  temperatureC: 0,
  precipitationMm: 0.5,
  snowfallCm: 0,
  freezingLevelM: ZONE_BASE.elevationM + 800,
};

export const missingData: HourlySnowSignal = {
  zoneId: ZONE_BASE.id,
  utcHour: '2026-06-13T17:00:00Z',
  temperatureC: undefined,
  precipitationMm: 0.3,
  snowfallCm: null,
  freezingLevelM: undefined,
};

export const explicitSnowfallNoTemp: HourlySnowSignal = {
  zoneId: ZONE_BASE.id,
  utcHour: '2026-06-13T18:00:00Z',
  temperatureC: undefined,
  precipitationMm: null,
  snowfallCm: 0.5,
  freezingLevelM: undefined,
};

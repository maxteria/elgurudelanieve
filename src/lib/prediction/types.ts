// Prediction engine foundational types (PR1)
export type ZoneId = string;

export interface ZoneProfile {
  id: ZoneId;
  name: string;
  elevationM: number;
  timeZone?: string; // optional override
}

export interface HourlySnowSignal {
  zoneId?: ZoneId;
  utcHour: string; // ISO timestamp in UTC for the hour (eg. 2026-06-13T10:00:00Z or without Z but parsable)
  temperatureC?: number | null;
  precipitationMm?: number | null;
  snowfallCm?: number | null;
  freezingLevelM?: number | null;
  // additional optional observational fields
  windKmh?: number | null;
  humidityPct?: number | null;
  sourceStatus?: string | null;
}

export type HourlyClassificationLabel =
  | 'snow_likely'
  | 'snow_marginal'
  | 'not_snow'
  | 'unknown';

export interface HourlySnowClassification {
  signal: HourlySnowSignal;
  classification: HourlyClassificationLabel;
  reasonsFor: string[];
  reasonsAgainst: string[];
  missingData: string[];
  dataUsed: {
    temperatureC?: number | null;
    precipitationMm?: number | null;
    snowfallCm?: number | null;
    freezingLevelM?: number | null;
  };
}

// Zone constants (PR1)
export const ZONE_PUEBLO: ZoneProfile = { id: 'pueblo', name: 'Pueblo', elevationM: 1647 };
export const ZONE_BASE: ZoneProfile = { id: 'base', name: 'Base', elevationM: 1846 };
export const ZONE_SUMMIT: ZoneProfile = { id: 'summit', name: 'Summit', elevationM: 2045 };

export const CAVIAHUE_TZ = 'America/Argentina/Buenos_Aires';

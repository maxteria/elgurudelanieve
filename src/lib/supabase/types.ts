import type { AicReading } from './client';

/**
 * A single day entry merging AIC reading + Guru message for the historico page.
 */
export type DailyHistoryEntry = {
  /** ISO date string "2026-06-01" */
  date: string;
  /** AIC station reading for that date, or null if only Guru data exists */
  aic: AicReading | null;
  /** Guru message for that date, or null if none */
  guru: {
    message: string | null;
    mood: string | null;
    certainty: string | null;
    period: string | null;
    source: string | null;
  } | null;
  /** Derived convenience field: snow_water_eq from AIC or null */
  swe: number | null;
  /** Derived convenience field: temp_min from AIC or null */
  tempMin: number | null;
  /** Derived convenience field: temp_max from AIC or null */
  tempMax: number | null;
  /** Derived convenience field: precipitation from AIC or null */
  precipitation: number | null;
};

/**
 * Full dataset payload embedded as JSON for client-side filtering.
 */
export type HistoricoPayload = {
  version: 1;
  entries: DailyHistoryEntry[];
};

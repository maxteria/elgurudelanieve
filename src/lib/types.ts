// Tipos centrales para forecast y motores
export interface HourlyForecast {
  time: string;
  hour: number;
  temp: number;
  feels_like: number;
  wind: number;
  windDir: number;
  cloudCover: number;
  windGusts: number;
  precip: number;
  snow_prob: number;
  freezing_level: number;
  humidity: number;
  snowfall: number;
  snowDepth: number;
  weatherCode: number;
  precipitationProbability: number;
}

export interface ZoneForecast {
  name: 'Pueblo' | 'Centro' | 'Cumbre';
  altitude: number;
  hourly: HourlyForecast[];
}

export interface WeatherData {
  updated: string;
  zones: ZoneForecast[];
}

export interface PowderScoreResult {
  value: number;
  reason: string;
  snowWindow: { fromTime: string; toTime: string } | null;
}

export interface Alert {
  type: 'viento' | 'lluvia' | 'ventana' | 'cota';
  message: string;
  level: 'info' | 'warning' | 'danger';
  zone?: 'Pueblo' | 'Centro' | 'Cumbre';
}

export interface ZoneInterpretation {
  id: 'village' | 'mid' | 'top';
  label: string;
  altitude: number;
  current: {
    temp: number | null;
    feelsLike: number | null;
    wind: number | null;
    precipitation: number | null;
    snowChance: number | null;
    freezingLevel: number | null;
    humidity: number | null;
    snowDepth: number | null;
    precipitationProbability: number | null;
    weatherCode: number | null;
  };
  answer: {
    status: 'yes' | 'possible' | 'no';
    label: string;
  };
  alerts: Alert[];
}

export type PeriodKey = 'today' | 'tomorrow' | 'sevenDays';

export type PeriodInterpretations = Record<PeriodKey, SnowInterpretation>;

export interface SnowInterpretation {
  mainAnswer: {
    status: 'yes' | 'possible' | 'no';
    label: string;
    description: string;
  };
  snowLabel:
    | 'sin nieve a la vista'
    | 'nevada débil'
    | 'nieve moderada'
    | 'linda nevada'
    | 'nevada importante';
  powderScore: {
    value: number;
    label: string;
    description: string;
  };
  zones: {
    village: ZoneInterpretation;
    mid: ZoneInterpretation;
    top: ZoneInterpretation;
  };
  bestWindow: {
    hasWindow: boolean;
    from?: string;
    to?: string;
    label: string;
    description: string;
  };
  alerts: Alert[];
  guruSummary: string;
  updated: string;
  weatherApi?: {
    temp: number;
    feelsLike: number;
    condition: string;
    icon: string;
    humidity: number;
    wind: number;
    cloudCover: number;
    updatedAt: string;
  };
  // ── Trust layer (optional, populated when sourceStatus is available) ──
  confidence?: ConfidenceScore;
  sourceStatus?: SourceStatus;
  signals?: SignalSummary;
  validatedWindow?: ValidatedWindow;
  narrativeTier?: NarrativeTier;
  degraded?: boolean;
  resortStatus?: ResortStatus;
}

// ─── Trust Layer Types ─────────────────────────────────────────────────────

/** Signal traceability per period — data that drove the Guru's conclusion */
export interface SignalSummary {
  temperature: { village: number; mid: number; top: number };
  precipitation: { village: number; mid: number; top: number };
  snowfall: { village: number | null; mid: number | null; top: number | null };
  freezingLevel: { village: number; mid: number; top: number };
  wind: { village: number; mid: number; top: number };
  humidity: { village: number | null; mid: number | null; top: number | null };
}

/** Availability status per data source */
export type SourceStatusValue = 'ok' | 'failed' | 'unconfigured' | 'demo';

export interface SourceStatus {
  openMeteo: SourceStatusValue;
  weatherApi: SourceStatusValue;
  aic: SourceStatusValue;
}

/** Confidence score with rule explanation */
export interface ConfidenceScore {
  value: number; // 0–100
  label: 'Alta' | 'Media' | 'Baja';
  reasonsFor: string[];
  reasonsAgainst: string[];
}

/** Narrative intensity tier based on data confidence */
export type NarrativeTier = 'restricted' | 'normal' | 'expressive';

/** A validated best-window that has passed all guards */
export interface ValidatedWindow {
  hasWindow: boolean;
  from?: string;
  to?: string;
  label: string;
  description: string;
}

/** Enriched interpretation with trust-layer metadata */
export interface TrustEnrichedInterpretation {
  signals: SignalSummary;
  confidence: ConfidenceScore;
  narrativeTier: NarrativeTier;
  validatedWindow: ValidatedWindow;
  sourceStatus: SourceStatus;
  degraded: boolean;
}

// ─── Resort Operational Status ─────────────────────────────────────────────

export type SeasonStatus =
  | 'pre_season'
  | 'open'
  | 'partial'
  | 'suspended'
  | 'closed'
  | 'unknown';

export type ResortOperationalStatus = 'open' | 'partial' | 'closed' | 'unknown';

export interface ResortStatus {
  seasonStatus: SeasonStatus;
  resortOperationalStatus: ResortOperationalStatus;
  officialSnowReportAvailable: boolean;
  baseDepthCm: number | null;
  liftsOpen: number | null;
  slopesOpen: number | null;
  lastUpdatedAt: string;
  updatedBy: 'local' | 'official' | 'manual';
  resortStatusSource: string;
  operationalWarnings: string[];
}

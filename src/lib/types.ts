// Tipos centrales para forecast y motores
export interface HourlyForecast {
  hour: number;
  temp: number;
  feels_like: number;
  wind: number;
  precip: number;
  snow_prob: number;
  freezing_level: number;
  humidity: number;
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
  snowWindow: [number, number] | null;
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
    temp: number;
    feelsLike: number;
    wind: number;
    precipitation: number;
    snowChance: number;
    freezingLevel: number;
    humidity: number;
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
  snowLabel: 'sin nieve a la vista' | 'nevada débil' | 'nieve moderada' | 'linda nevada' | 'se viene un paquetón';
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
}

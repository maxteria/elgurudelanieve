export type SMNWeatherConditionId = number;

export type SMNStationWeather = {
  humidity: number | null;
  pressure: number | null;
  st: number | null;
  visibility: number | null;
  wind_speed: number | null;
  id: SMNWeatherConditionId;
  description: string;
  temp: number;
  wing_deg: string;
  tempDesc: string;
};

export type SMNApiStation = {
  _id: string;
  dist: number;
  lid: number;
  fid: number;
  int_number: number;
  name: string;
  province: string;
  lat: string;
  lon: string;
  zoom: string;
  updated: number;
  weather: SMNStationWeather;
  forecast: unknown;
};

export type SMNApiResponse = SMNApiStation[];

export type SMNCurrent = {
  source: 'smn';
  stationName: string;
  stationId?: string;
  province?: string;
  lat?: number;
  lon?: number;
  altitude?: number;
  distanceKm: number;
  updatedAt?: string;
  temp?: number;
  feelsLike?: number;
  humidity?: number;
  pressure?: number;
  wind?: number;
  windDirection?: string;
  condition?: string;
  conditionId?: number;
  visibility?: number;
  raw?: unknown;
};

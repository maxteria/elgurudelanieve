export type ZoneId = 'village' | 'mid' | 'top';

export type NormalizedZoneForecast = {
  id: ZoneId;
  label: string;
  altitude: number;
  temp: number;
  feelsLike: number;
  wind: number;
  precipitation: number;
  snowChance: number;
  freezingLevel: number;
  humidity: number;
};

export type NormalizedHourlyForecast = {
  time: string;
  temp: number;
  feelsLike: number;
  precipitation: number;
  snowfall: number;
  freezingLevel: number;
  wind: number;
  windDir: number;
  windGusts: number;
  humidity: number;
  cloudCover: number;
};

export type DailySummary = {
  date: string;
  weekday: string;
  tempMin: number;
  tempMax: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  totalPrecip: number;
  totalSnow: number;
  avgWind: number;
  maxWindGust: number;
  avgHumidity: number;
  avgCloudCover: number;
  minFreezingLevel: number;
  snowHours: number;
  description: string;
};

export type WeatherAPICurrent = {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  cloudCover: number;
  updatedAt: string;
};

export type NormalizedSnowForecast = {
  updatedAt: string;
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  zones: {
    village: NormalizedZoneForecast;
    mid: NormalizedZoneForecast;
    top: NormalizedZoneForecast;
  };
  hourly: NormalizedHourlyForecast[];
};

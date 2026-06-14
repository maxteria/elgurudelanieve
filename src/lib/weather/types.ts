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
  snowDepth: number;
  weatherCode: number;
  precipitationProbability: number;
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
  snowDepth: number;
  weatherCode: number;
  precipitationProbability: number;
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

export type AicStationData = {
  stationName: string;
  date: string;
  humidity: number | null;
  precipitation: number | null;
  pressure: number | null;
  tempMin: number | null;
  tempMax: number | null;
  windDir: number | null;
  windSpeed: number | null;
  windMax: number | null;
  snowWaterEq: number | null;
  updatedAt: string;
};

export type OpenMeteoCurrentWeather = {
  time: string;
  temperature: number;
  windspeed: number;
  winddirection: number;
  isDay: number;
  weathercode: number;
};

export type OpenMeteoDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  snowfall_sum: number[];
  precipitation_probability_max: number[];
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
  yesterday?: AicStationData;
  aicHistory?: AicStationData[];
  currentWeather?: OpenMeteoCurrentWeather;
  daily?: OpenMeteoDaily;
};

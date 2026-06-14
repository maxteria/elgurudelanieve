import type { NormalizedHourlyForecast, DailySummary } from './weather/types';

const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

function parseLocalDate(time: string): Date {
  const d = new Date(time);
  return d;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isTomorrow(d: Date): boolean {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  );
}

export function getTodayForecast(
  hourly: NormalizedHourlyForecast[],
): NormalizedHourlyForecast[] {
  const now = new Date();
  return hourly.filter((h) => {
    const d = parseLocalDate(h.time);
    return isToday(d) && d >= now;
  });
}

export function getTomorrowForecast(
  hourly: NormalizedHourlyForecast[],
): NormalizedHourlyForecast[] {
  return hourly.filter((h) => {
    const d = parseLocalDate(h.time);
    return isTomorrow(d);
  });
}

export function getSevenDayForecast(
  hourly: NormalizedHourlyForecast[],
): DailySummary[] {
  const grouped = new Map<string, NormalizedHourlyForecast[]>();

  for (const h of hourly) {
    const d = parseLocalDate(h.time);
    const key = d.toISOString().slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(h);
  }

  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + 16);

  const summaries: DailySummary[] = [];

  for (const [dateStr, entries] of grouped) {
    const d = parseLocalDate(dateStr + 'T12:00:00');
    // skip past dates and beyond 16 days
    if (d < now) continue;
    if (d > maxDate) continue;

    const temps = entries.map((e) => e.temp);
    const feelsLikes = entries.map((e) => e.feelsLike);
    const winds = entries.map((e) => e.wind);
    const gusts = entries.map((e) => e.windGusts);
    const humidities = entries.map((e) => e.humidity);
    const clouds = entries.map((e) => e.cloudCover);
    const freezings = entries.map((e) => e.freezingLevel);
    const snowHours = entries.filter((e) => e.snowfall > 0).length;

    const totalPrecip = entries.reduce(
      (sum, e) => sum + Math.max(0, e.precipitation),
      0,
    );
    const totalSnow = entries.reduce(
      (sum, e) => sum + Math.max(0, e.snowfall),
      0,
    );

    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);
    const avg = (arr: number[]) =>
      Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;

    let description = '';
    if (totalSnow > 5) description = 'Nevadas significativas.';
    else if (totalSnow > 1) description = 'Nieve ligera a moderada.';
    else if (totalPrecip > 5) description = 'Lluvia probable, cota alta.';
    else if (totalPrecip > 0) description = 'Precipitaciones ligeras.';
    else description = 'Sin precipitación.';

    summaries.push({
      date: dateStr,
      weekday: WEEKDAYS[d.getDay()],
      tempMin: Math.round(tempMin * 10) / 10,
      tempMax: Math.round(tempMax * 10) / 10,
      feelsLikeMin: Math.round(Math.min(...feelsLikes) * 10) / 10,
      feelsLikeMax: Math.round(Math.max(...feelsLikes) * 10) / 10,
      totalPrecip: Math.round(totalPrecip * 10) / 10,
      totalSnow: Math.round(totalSnow * 10) / 10,
      avgWind: avg(winds),
      maxWindGust: Math.round(Math.max(...gusts) * 10) / 10,
      avgHumidity: Math.round(avg(humidities)),
      avgCloudCover: Math.round(avg(clouds)),
      minFreezingLevel: Math.round(Math.min(...freezings)),
      maxFreezingLevel: Math.round(Math.max(...freezings)),
      snowHours,
      description,
    });
  }

  return summaries.slice(0, 7);
}

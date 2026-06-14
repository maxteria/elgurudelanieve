/** Lapse rate: temperature drop per meter of altitude gain (°C/m) */
export const LAPSE_RATE = 0.0065;

/**
 * Wind chill calculation using the JAG/TI formula.
 * Returns the feels-like temperature in °C.
 */
export function windChill(temp: number, windKmh: number): number {
  if (windKmh < 4.8 || temp > 10) return temp;
  const v = windKmh * 0.27778;
  return (
    13.12 +
    0.6215 * temp -
    11.37 * Math.pow(v, 0.16) +
    0.3965 * temp * Math.pow(v, 0.16)
  );
}

/**
 * Estimate snow probability based on temperature, precipitation,
 * freezing level, and zone altitude.
 */
export function snowChance(
  temp: number,
  precip: number,
  freezingLevel: number,
  altitude: number,
): number {
  if (precip <= 0) return 0;
  if (freezingLevel <= altitude + 50) return 95;
  if (freezingLevel <= altitude + 150) return 80;
  if (temp <= 0 && freezingLevel <= altitude + 300) return 60;
  if (temp <= 2 && freezingLevel <= altitude + 500) return 40;
  return 15;
}

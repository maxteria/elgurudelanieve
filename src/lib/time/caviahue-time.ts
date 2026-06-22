const TZ = 'America/Argentina/Buenos_Aires';

function partsFor(date: Date) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return map;
}

// Strict, deterministic parsing helpers
function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isIsoWithTime(s: string) {
  // Accept ISO datetimes with HH:MM or HH:MM:SS(.sss) and optional timezone
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+\-]\d{2}:\d{2})?$/.test(s);
}

function hasTimeZoneDesignator(s: string) {
  return /[Zz]$|[+\-]\d{2}:\d{2}$/.test(s);
}

function parseIsoStringAsUtc(s: string): Date {
  // Accept only ISO-like strings. If a timezone designator is missing, treat it as UTC (append Z).
  if (isIsoWithTime(s)) {
    if (hasTimeZoneDesignator(s)) {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) throw new Error(`Invalid date string: ${s}`);
      return d;
    }
    const d = new Date(s + 'Z');
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date string: ${s}`);
    return d;
  }

  if (isIsoDateOnly(s)) {
    const d = new Date(s + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date string: ${s}`);
    return d;
  }

  throw new Error(
    `caviahue-time: unsupported date string format. Provide ISO date or ISO datetime. Received: ${s}`
  );
}

function toDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') return parseIsoStringAsUtc(dateInput);
  throw new TypeError('toDate expected string or Date');
}

export function toCaviahue(dateInput: string | Date) {
  const date = toDate(dateInput);
  const utcIso = date.toISOString();
  const p = partsFor(date);
  const localIso = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  const localHour = Number(p.hour);
  const localDayKey = `${p.year}-${p.month}-${p.day}`;
  return { utcIso, localIso, localHour, localDayKey, timeZone: TZ };
}

/**
 * Parse an ISO datetime string that is already in Caviahue (America/Argentina/Buenos_Aires) local time
 * and return the standard Caviahue components.
 *
 * Use this for sources like Open-Meteo which return timestamps in local time
 * WITHOUT a timezone suffix (e.g. "2026-06-22T10:00"). Unlike `toCaviahue()`,
 * this does NOT treat timezone-naive strings as UTC — it correctly interprets them
 * as Argentina local time (UTC-3).
 */
export function toCaviahueFromLocal(localIso: string) {
  const m = localIso.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/,
  );
  if (!m) {
    throw new Error(
      `caviahue-time: invalid local ISO. Expected "YYYY-MM-DDTHH:MM" format. Received: ${localIso}`,
    );
  }
  const [, year, month, day, hour, minute, second] = m;
  // The input is in America/Argentina/Buenos_Aires (UTC-3, no DST since 2009).
  // Construct the UTC equivalent by adding 3 hours, then let toCaviahue
  // extract the correct local components.
  // Date.UTC normalizes overflows automatically (e.g. hour 25 → next day 01:00 UTC).
  const utcDate = new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour) + 3,
      parseInt(minute),
      second ? parseInt(second) : 0,
    ),
  );
  return toCaviahue(utcDate);
}

export function formatCaviahueHour(dateInput: string | Date) {
  const { localHour } = toCaviahue(dateInput);
  return String(localHour).padStart(2, '0') + ':00';
}

export function getCaviahueDayKey(dateInput: string | Date) {
  return toCaviahue(dateInput).localDayKey;
}

export function isPastWindow(startUtc: string, endUtc: string) {
  // Compare using UTC timestamps to avoid runtime timezone assumptions.
  const nowUtc = Date.now();
  const end = parseIsoStringAsUtc(endUtc);
  return end.getTime() < nowUtc;
}

/**
 * Return epoch milliseconds for an ISO string or Date parsed as UTC.
 * Centralizes parsing so callers don't use new Date(string) directly.
 */
export function msFromIso(dateInput: string | Date): number {
  return toDate(dateInput).getTime();
}

/**
 * Create an ISO (toISOString) from epoch milliseconds.
 */
export function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Add hours to an ISO or Date and return an ISO string (UTC).
 */
export function addHoursToIso(dateInput: string | Date, hours: number): string {
  const ms = msFromIso(dateInput);
  return isoFromMs(ms + hours * 60 * 60 * 1000);
}

/**
 * Return the weekday index (0=Sun .. 6=Sat) for the Caviahue local date
 * corresponding to the provided time. Deterministic and TZ-safe.
 */
export function getCaviahueWeekdayIndex(dateInput: string | Date): number {
  // Use partsFor to extract the Caviahue local Y/M/D and compute weekday
  const date = toDate(dateInput);
  const p = partsFor(date);
  const y = Number(p.year);
  const m = Number(p.month);
  const d = Number(p.day);
  const ms = Date.UTC(y, m - 1, d);
  return new Date(ms).getUTCDay();
}

export default {
  toCaviahue,
  toCaviahueFromLocal,
  formatCaviahueHour,
  getCaviahueDayKey,
  isPastWindow,
  msFromIso,
  isoFromMs,
  addHoursToIso,
  getCaviahueWeekdayIndex,
};

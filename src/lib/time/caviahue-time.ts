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
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})?$/.test(s);
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

export default {
  toCaviahue,
  formatCaviahueHour,
  getCaviahueDayKey,
  isPastWindow,
};

import type { ValidatedWindow } from './types';
import caviahue from './time/caviahue-time';

const NO_WINDOW_MESSAGE = 'No hay una ventana clara de nieve en este período.';

function noWindow(): ValidatedWindow {
  return {
    hasWindow: false,
    label: 'Sin ventana definida',
    description: NO_WINDOW_MESSAGE,
  };
}

const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function formatWindowTime(isoTime: string): string {
  // Use caviahue timezone helpers so labels are deterministic and not
  // dependent on the runtime environment's TZ.
  const { localIso, localHour } = caviahue.toCaviahue(isoTime);
  // localIso is like YYYY-MM-DDTHH:MM:SS (no timezone designator). Append Z
  // and read weekday in UTC which corresponds to the Caviahue local date.
  const dayIndex = new Date(localIso + 'Z').getUTCDay();
  const day = WEEKDAY_SHORT[dayIndex];
  const hour = String(localHour).padStart(2, '0');
  return `${day} ${hour}:00`;
}

/**
 * Validate a raw snowWindow before it reaches the UI.
 * Rejects: null, empty, malformed dates, zero/negative duration, past windows.
 * Accepts: valid ISO dates with positive duration (including midnight-crossing).
 */
export function validateWindow(
  fromTime: string | null | undefined,
  toTime: string | null | undefined,
): ValidatedWindow {
  if (!fromTime || !toTime) return noWindow();

  // Parse strictly using caviahue helpers which enforce ISO formats and
  // treat timezone-less inputs as UTC. toCaviahue will throw on invalid
  // strings — catch and reject.
  let fromParts;
  let toParts;
  try {
    fromParts = caviahue.toCaviahue(fromTime);
    toParts = caviahue.toCaviahue(toTime);
  } catch (e) {
    return noWindow();
  }

  const fromMs = new Date(fromParts.utcIso).getTime();
  const toMs = new Date(toParts.utcIso).getTime();

  // Reject if negative or zero duration
  if (toMs <= fromMs) return noWindow();

  // Reject if window is entirely in the past
  if (toMs < Date.now()) return noWindow();

  const fromLabel = formatWindowTime(fromTime);
  const toLabel = formatWindowTime(toTime);

  return {
    hasWindow: true,
    // Preserve normalized UTC boundaries for cache / tracing
    startUtc: fromParts.utcIso,
    endUtc: toParts.utcIso,
    from: fromLabel,
    to: toLabel,
    label: `${fromLabel} a ${toLabel}`,
    description: 'Mejor acumulación prevista en ese período.',
  };
}

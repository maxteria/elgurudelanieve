import type { ValidatedWindow } from './types';

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
  const d = new Date(isoTime);
  const day = WEEKDAY_SHORT[d.getDay()];
  const hour = String(d.getHours()).padStart(2, '0');
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

  const from = new Date(fromTime);
  const to = new Date(toTime);

  // Reject if either date is invalid
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return noWindow();

  // Reject if negative or zero duration
  if (to.getTime() <= from.getTime()) return noWindow();

  // Reject if window is entirely in the past
  if (to.getTime() < Date.now()) return noWindow();

  const fromLabel = formatWindowTime(fromTime);
  const toLabel = formatWindowTime(toTime);

  return {
    hasWindow: true,
    from: fromLabel,
    to: toLabel,
    label: `${fromLabel} a ${toLabel}`,
    description: 'Mejor acumulación prevista en ese período.',
  };
}

import type { HourlySnowSignal, ZoneProfile } from './types';
import evaluateHour from './evaluate-hour';
import caviahue from '../time/caviahue-time';

export interface SnowWindow {
  startUtc: string;
  endUtc: string;
  fromLocalIso: string;
  toLocalIso: string;
  durationHours: number;
}

/**
 * Build candidate snow windows from hourly signals.
 * Rules:
 * - windows must contain >= 2 hours labeled snow_marginal or snow_likely
 * - validate start < end and duration > 0
 * - reject windows fully in the past
 * - timezone enforced using Caviahue helpers
 */
export function buildSnowWindows(signals: HourlySnowSignal[], profile: ZoneProfile) {
  if (!signals || signals.length === 0) {
    return { windows: [], message: 'No clear snow window in this period.' };
  }

  // Ensure signals sorted by utcHour
  const sorted = [...signals].sort((a, b) => new Date(a.utcHour).getTime() - new Date(b.utcHour).getTime());

  const classified = sorted.map((s) => ({
    signal: s,
    classification: evaluateHour(s, profile).classification,
    utcMs: new Date(s.utcHour).getTime(),
  }));

  const windows: SnowWindow[] = [];
  let runStartIdx: number | null = null;

  function pushWindow(startIdx: number, endIdx: number) {
    if (endIdx < startIdx) return;
    const runLen = endIdx - startIdx + 1;
    if (runLen < 2) return;
    const startUtc = classified[startIdx].signal.utcHour;
    const lastUtc = classified[endIdx].signal.utcHour;
    const endDate = new Date(lastUtc);
    endDate.setUTCHours(endDate.getUTCHours() + 1);
    const endUtc = endDate.toISOString();
    try {
      const startDate = new Date(startUtc);
      if (endDate.getTime() > startDate.getTime() && !caviahue.isPastWindow(startUtc, endUtc)) {
        const fromLocalIso = caviahue.toCaviahue(startUtc).localIso;
        const toLocalIso = caviahue.toCaviahue(endUtc).localIso;
        windows.push({
          startUtc,
          endUtc,
          fromLocalIso,
          toLocalIso,
          durationHours: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60),
        });
      }
    } catch {
      // skip malformed window
    }
  }

  for (let i = 0; i < classified.length; i++) {
    const isSnow = classified[i].classification === 'snow_likely' || classified[i].classification === 'snow_marginal';

    // Break runs on non-contiguous hours
    if (i > 0) {
      const prevMs = classified[i - 1].utcMs;
      const currMs = classified[i].utcMs;
      if (Number.isFinite(prevMs) && Number.isFinite(currMs) && currMs - prevMs > 60 * 60 * 1000) {
        if (runStartIdx !== null) {
          pushWindow(runStartIdx, i - 1);
          runStartIdx = null;
        }
      }
    }

    if (isSnow) {
      if (runStartIdx === null) runStartIdx = i;
    } else {
      if (runStartIdx !== null) {
        pushWindow(runStartIdx, i - 1);
        runStartIdx = null;
      }
    }
  }

  // flush tail run
  if (runStartIdx !== null) {
    pushWindow(runStartIdx, classified.length - 1);
  }

  if (windows.length === 0) return { windows: [], message: 'No clear snow window in this period.' };
  return { windows };
}

export default buildSnowWindows;

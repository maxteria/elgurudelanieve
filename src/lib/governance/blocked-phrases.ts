import type { NarrativeTier } from '../types';

/**
 * Blocked phrases by narrative tier. These are lightweight, conservative
 * patterns intended to catch high-risk marketing claims and imperative ski
 * instructions. Patterns are intentionally permissive and case-insensitive.
 */
export const BLOCKED_PHRASES: Record<NarrativeTier, RegExp[]> = {
  restricted: [
    /paquet[oó]n/i,
    /powder day/i,
    /p[oó]lvora/i,
    /\b(?:epico|épico)\b/i,
    /sub[ií] sin dudar/i,
    /nevad[ao] fuerte/i,
    /garantizad[ao]/i,
    /segur[oa] (?:que|de)/i,
    /imperdible/i,
    /no te lo pierdas/i,
    /ideal ski day/i,
  ],
  normal: [
    /paquet[oó]n/i,
    /powder day/i,
    /garantizad[ao]/i,
    /segur[oa] (?:que|de)/i,
    /ideal ski day/i,
  ],
  expressive: [],
};

/** English and Spanish ski-related phrases to block under restricted resort conditions */
export const SKI_PHRASES: RegExp[] = [
  /esqu[ií]\w*/i,
  /\bski\b/i,
  /\bsnowboard\b/i,
  /\btabla\b/i,
  /powder/i,
  /\bsub[ií]s?\b/i,
  /\bbajad[aeo]\b/i,
  /\bpista\b/i,
  /\bmedios?\b/i,
  /prepare(?: the)? skis?/i,
  /sharpen(?: the)? skis?/i,
  /store(?: the)? skis?/i,
  /prepare(?: your)? skis?/i,
  /sharpen(?: your)? skis?/i,
  /store(?: your)? skis?/i,
];

/** Phrases that claim a consolidated/excellent base */
export const BASE_PHRASES: RegExp[] = [
  /base consolidad[ao]/i,
  /base excelente/i,
  /base suficiente/i,
  /buena base/i,
  /base esquiable/i,
  /nieve esquiable/i,
  /base excellent/i,
  /consolidated base/i,
  /excellent base/i,
  /perfect corduroy/i,
];

/** Allowed meteorological phrases that should NOT be blocked even when ski
 * recommendations are restricted. These represent factual meteorological
 * statements (e.g., "meteorological snow in formation"). */
export const ALLOWED_METEO_PATTERNS: RegExp[] = [
  /nieve meteorol[oó]gica/i,
  /nieve en formaci[oó]n/i,
  /meteorological snow/i,
  /signal of snow to monitor/i,
  /may add snow in higher sectors/i,
  /not enough to claim skiable conditions/i,
  /check official report before planning ski(?:\/|\\s)?snowboard/i,
  /no esquiable/i,
];

export default BLOCKED_PHRASES;

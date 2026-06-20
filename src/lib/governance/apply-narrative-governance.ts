import type { GuruNpcOutput } from '../ai/types';
import type { NarrativeTier, ResortStatus } from '../types';
import {
  BLOCKED_PHRASES,
  SKI_PHRASES,
  BASE_PHRASES,
} from './blocked-phrases';

/** Minimum base depth for ski recommendations (kept in sync with guru-copy) */
const MIN_SKI_BASE_DEPTH_CM = 30;

/**
 * Conservative governance: when resortStatus is undefined or incomplete,
 * block ski/snowboard recommendations by default.
 */
export function isSkiRecommendationAllowed(resortStatus: ResortStatus | undefined): boolean {
  // Conservative default: without a valid status, do not allow recommendations
  if (!resortStatus) return false;

  const seasonOpen =
    resortStatus.seasonStatus === 'open' ||
    resortStatus.seasonStatus === 'partial';
  const resortOpen =
    resortStatus.resortOperationalStatus === 'open' ||
    resortStatus.resortOperationalStatus === 'partial';

  const baseOk =
    resortStatus.baseDepthCm !== null &&
    resortStatus.baseDepthCm >= MIN_SKI_BASE_DEPTH_CM;

  // Allow only when season and resort are operational (open/partial) and
  // there is a usable base depth value.
  return seasonOpen && resortOpen && baseOk;
}

export function isBaseClaimAllowed(resortStatus: ResortStatus | undefined): boolean {
  // Conservative default: without a valid status, do not allow base claims
  if (!resortStatus) return false;
  if (!resortStatus.officialSnowReportAvailable) return false;
  if (resortStatus.baseDepthCm === null || resortStatus.baseDepthCm < MIN_SKI_BASE_DEPTH_CM)
    return false;
  return true;
}

/**
 * Apply narrative governance rules to a GuruNpcOutput.
 * Returns the original output when allowed, or null when the output must be
 * blocked (caller should fallback to safe copy).
 */
export function applyNarrativeGovernance(
  output: GuruNpcOutput,
  tier: NarrativeTier,
  resortStatus?: ResortStatus,
): GuruNpcOutput | null {
  const text = `${output.message} ${output.tip ?? ''}`.toLowerCase();

  // 1) Block tier-level prohibited marketing phrases
  const prohibitedForTier = BLOCKED_PHRASES[tier] ?? [];
  for (const re of prohibitedForTier) {
    if (re.test(text)) {
      return null;
    }
  }

  // 2) Resort operational governance: block ski phrases when resort doesn't
  // permit ski recommendations
  if (!isSkiRecommendationAllowed(resortStatus)) {
    for (const re of SKI_PHRASES) {
      if (re.test(text)) return null;
    }
  }

  // 3) Block base claims when official report or base depth not available
  if (!isBaseClaimAllowed(resortStatus)) {
    for (const re of BASE_PHRASES) {
      if (re.test(text)) return null;
    }
  }

  // If we reached here, allow the output. Meteorological phrases remain allowed.
  return output;
}

export default applyNarrativeGovernance;

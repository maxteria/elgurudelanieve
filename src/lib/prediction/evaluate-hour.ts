import type {
  HourlySnowSignal,
  HourlySnowClassification,
  HourlyClassificationLabel,
  ZoneProfile,
} from './types';
import { ZONE_BASE } from './types';

/**
 * Evaluate a single hourly snow signal according to spec rules.
 * Returns classification, reasons, data used and missing-data flags.
 */
export function evaluateHour(
  signal: HourlySnowSignal,
  zoneProfile: ZoneProfile = ZONE_BASE,
): HourlySnowClassification {
  const reasonsFor: string[] = [];
  const reasonsAgainst: string[] = [];
  const missingData: string[] = [];

  const temp = signal.temperatureC ?? null;
  const precip = signal.precipitationMm ?? null;
  const snowfall = signal.snowfallCm ?? null;
  const freezing = signal.freezingLevelM ?? null;

  if (temp === null || temp === undefined) missingData.push('temperatureC');
  if (freezing === null || freezing === undefined) missingData.push('freezingLevelM');

  const dataUsed = {
    temperatureC: temp,
    precipitationMm: precip,
    snowfallCm: snowfall,
    freezingLevelM: freezing,
  };

  // Unknown rule: if temp OR freezing missing AND snowfall is NOT explicitly provided => unknown
  if ((temp === null || freezing === null) && (snowfall === null || snowfall === undefined)) {
    return {
      signal,
      classification: 'unknown',
      reasonsFor: [],
      reasonsAgainst: ['Missing critical data (temperature or freezing level)'],
      missingData,
      dataUsed,
    };
  }

  const zoneAlt = zoneProfile.elevationM;

  const matches: Record<HourlyClassificationLabel, boolean> = {
    unknown: false,
    not_snow: false,
    snow_marginal: false,
    snow_likely: false,
  };

  const hasPrecip = (precip !== null && precip >= 0.2) || (snowfall !== null && snowfall >= 0.1);
  if (hasPrecip) reasonsFor.push('Precipitation signal present');
  if (precip !== null && precip >= 0.2) reasonsFor.push('precipitationMm >= 0.2');
  if (snowfall !== null && snowfall >= 0.1) reasonsFor.push('snowfallCm >= 0.1');

  if (temp !== null && temp !== undefined) {
    if (temp <= 1.5) reasonsFor.push('temperatureC <= 1.5');
    else if (temp > 1.5 && temp <= 2.5) reasonsFor.push('temperatureC between 1.5 and 2.5');
    else if (temp > 3) reasonsAgainst.push('temperatureC > 3');
  }

  if (freezing !== null && freezing !== undefined) {
    if (freezing <= zoneAlt + 200) reasonsFor.push('freezingLevelM <= zoneAltitude + 200');
    else if (freezing > zoneAlt + 200 && freezing <= zoneAlt + 400)
      reasonsFor.push('freezingLevelM between zone+200 and zone+400');
    else if (freezing > zoneAlt + 500) reasonsAgainst.push('freezingLevelM > zoneAltitude + 500');
  }

  // not_snow conditions
  if ((precip === null || precip < 0.2) && (snowfall === null || snowfall < 0.1)) {
    matches.not_snow = true;
  }
  if (temp !== null && temp > 3) matches.not_snow = true;
  if (freezing !== null && freezing > zoneAlt + 500) matches.not_snow = true;

  // snow_likely
  if (
    hasPrecip &&
    temp !== null &&
    temp <= 1.5 &&
    freezing !== null &&
    freezing <= zoneAlt + 200
  ) {
    matches.snow_likely = true;
  }

  // snow_marginal
  if (
    hasPrecip &&
    ((temp !== null && temp > 1.5 && temp <= 2.5) ||
      (freezing !== null && freezing > zoneAlt + 200 && freezing <= zoneAlt + 400))
  ) {
    matches.snow_marginal = true;
  }

  // If multiple matches, select the lower-confidence label
  const rank: Record<HourlyClassificationLabel, number> = {
    unknown: 0,
    not_snow: 1,
    snow_marginal: 2,
    snow_likely: 3,
  };

  const matchedLabels = (Object.keys(matches) as HourlyClassificationLabel[]).filter(
    (k) => matches[k],
  );

  let final: HourlyClassificationLabel = 'unknown';
  if (matchedLabels.length === 0) {
    // If nothing matched: prefer conservative outcome but treat explicit snowfall as a positive signal
    if (snowfall !== null && snowfall >= 0.1) {
      final = 'snow_marginal';
    } else if (hasPrecip) {
      final = 'snow_marginal';
    } else {
      final = 'not_snow';
    }
  } else {
    // pick the label with the smallest rank (lower-confidence)
    matchedLabels.sort((a, b) => rank[a] - rank[b]);
    final = matchedLabels[0];
  }

  // Build concise reasonsFor/Against
  const finalReasonsFor = reasonsFor.slice(0, 5);
  const finalReasonsAgainst = reasonsAgainst.slice(0, 5);

  return {
    signal,
    classification: final,
    reasonsFor: finalReasonsFor,
    reasonsAgainst: finalReasonsAgainst,
    missingData,
    dataUsed,
  };
}

export default evaluateHour;

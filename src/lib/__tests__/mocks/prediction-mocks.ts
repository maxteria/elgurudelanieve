import type { HourlySnowClassification } from '../../prediction/types';

/**
 * Create a minimal synthetic HourlySnowClassification for testing.
 * Useful when we only care about the classification label and missingData fields.
 */
export function simulateClassification(
  label: HourlySnowClassification['classification'],
  missingData?: string[],
): HourlySnowClassification {
  return {
    signal: {
      zoneId: 'test',
      utcHour: '2026-06-01T12:00:00Z',
      temperatureC: null,
      precipitationMm: null,
      snowfallCm: null,
      freezingLevelM: null,
    },
    classification: label,
    reasonsFor: [],
    reasonsAgainst: [],
    missingData: missingData ?? [],
    dataUsed: {},
  };
}

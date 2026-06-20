import type {
  PeriodInterpretation,
  PeriodKey,
  PeriodInterpretations,
} from './types';

export interface MasterVerdict {
  /** Normalized snow label with forbidden phrases removed. */
  snowLabel: string;
  /** Short status label for the active period. */
  mainStatus: string;
  /** Human description of the period's snow signal. */
  mainDescription: string;
  /** Whether the current period has a detected snow window. */
  hasWindow: boolean;
  /** Window label if any. */
  windowLabel: string;
  /** Village freezing level (meters) or null. */
  freezingLevel: number | null;
  /** Cota classification. */
  cotaLabel: string;
  /** Conservative sky label based on cloud cover; never promises "despejado" when cloudy. */
  skyLabel: string;
  /** Whether the current period can promise clear skies. */
  isClearSky: boolean;
  /** Whether there is enough signal to mention snow at all. */
  hasSnowSignal: boolean;
  /** Season/resort status. */
  resortStatus: PeriodInterpretation['resortStatus'];
  /** Whether the resort season is considered open enough for ski language. */
  isSkiSeasonOpen: boolean;
  /** Whether current weather data is available. */
  hasCurrentData: boolean;
}

function normalizeSnowLabel(raw: string): string {
  return raw
    .replace(/se viene un paquetón/gi, 'nevada importante')
    .replace(/paquetón/gi, 'nevada importante');
}

function buildSkyLabel(cloudCover: number | undefined | null): string {
  if (cloudCover == null) return 'condición actual no disponible';
  if (cloudCover >= 80) return 'muy nublado';
  if (cloudCover >= 40) return 'parcialmente nublado';
  if (cloudCover >= 10) return 'algo nublado';
  return 'despejado';
}

export function buildMasterVerdict(
  periods: PeriodInterpretations,
  period: PeriodKey,
  currentCloudCover?: number | null,
): MasterVerdict {
  const p = periods[period];
  const freezingLevel = p.zones.village.current.freezingLevel ?? null;
  const cotaLabel =
    freezingLevel == null
      ? 'Cota no disponible'
      : freezingLevel >= 2600
        ? 'Cota alta'
        : freezingLevel >= 2200
          ? 'Cota justa'
          : 'Cota favorable';
  const skyLabel = buildSkyLabel(currentCloudCover);
  const isClearSky = currentCloudCover != null && currentCloudCover < 40;
  const hasSnowSignal = p.mainAnswer.status !== 'no';

  const seasonStatus = p.resortStatus?.seasonStatus;
  const isSkiSeasonOpen =
    seasonStatus === 'open' || seasonStatus === 'partial';

  return {
    snowLabel: normalizeSnowLabel(p.snowLabel),
    mainStatus: p.mainAnswer.status,
    mainDescription: p.mainAnswer.description,
    hasWindow: p.bestWindow.hasWindow,
    windowLabel: p.bestWindow.label,
    freezingLevel,
    cotaLabel,
    skyLabel,
    isClearSky,
    hasSnowSignal,
    resortStatus: p.resortStatus,
    isSkiSeasonOpen,
    hasCurrentData: currentCloudCover != null,
  };
}

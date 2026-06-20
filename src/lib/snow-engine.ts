import type { Alert } from './types';
import type { SnowInterpretation, ZoneInterpretation } from './types';
import type { SourceStatus, ConfidenceScore, NarrativeTier, ResortStatus } from './types';
import type {
  NormalizedSnowForecast,
  NormalizedHourlyForecast,
  NormalizedZoneForecast,
} from './weather/types';
import { calculatePowderScore, calculateConfidence } from './scoring';
import { validateWindow } from './validate-window';
import type { HourlyForecast } from './types';
import { LAPSE_RATE } from './weather/constants';
import { computeNarrativeTier } from './ai/guru-copy';
import { loadResortStatus } from './resort-status';

const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function formatWindowTime(isoTime: string): string {
  const d = new Date(isoTime);
  const day = WEEKDAY_SHORT[d.getDay()];
  const hour = String(d.getHours()).padStart(2, '0');
  return `${day} ${hour}:00`;
}

const ZONE_IDS: { id: 'village' | 'mid' | 'top'; label: string }[] = [
  { id: 'village', label: 'Pueblo (base)' },
  { id: 'mid', label: 'Centro (medio)' },
  { id: 'top', label: 'Cumbre (alto)' },
];

type SnowLabel =
  | 'sin nieve a la vista'
  | 'nevada débil'
  | 'nieve moderada'
  | 'linda nevada'
  | 'nevada importante';

function computeSnowLabel(
  mainStatus: 'yes' | 'possible' | 'no',
  powderScore: number,
  hasWindow: boolean,
): SnowLabel {
  if (mainStatus === 'no' || powderScore < 20) {
    return 'sin nieve a la vista';
  }
  if (powderScore >= 78 && hasWindow) {
    return 'nevada importante';
  }
  if (powderScore >= 55 || (mainStatus === 'yes' && hasWindow)) {
    return 'linda nevada';
  }
  if (powderScore >= 35 || (mainStatus === 'possible' && hasWindow)) {
    return 'nieve moderada';
  }
  return 'nevada débil';
}

/**
 * Extract SignalSummary from zone interpretations.
 */
function extractSignalSummary(
  zoneHourlies: Record<string, HourlyForecast[]>,
): {
  temperature: { village: number; mid: number; top: number };
  precipitation: { village: number; mid: number; top: number };
  snowfall: { village: number | null; mid: number | null; top: number | null };
  freezingLevel: { village: number; mid: number; top: number };
  wind: { village: number; mid: number; top: number };
  humidity: { village: number | null; mid: number | null; top: number | null };
} {
  const getZoneSignal = (zh: HourlyForecast[]) => {
    const first = zh[0];
    if (!first) return { temp: 0, precip: 0, snowfall: null, freezingLevel: 0, wind: 0, humidity: null };
    return {
      temp: first.temp,
      precip: first.precip,
      snowfall: first.snowfall ?? null,
      freezingLevel: first.freezing_level,
      wind: first.wind,
      humidity: first.humidity ?? null,
    };
  };

  return {
    temperature: {
      village: getZoneSignal(zoneHourlies.village).temp,
      mid: getZoneSignal(zoneHourlies.mid).temp,
      top: getZoneSignal(zoneHourlies.top).temp,
    },
    precipitation: {
      village: getZoneSignal(zoneHourlies.village).precip,
      mid: getZoneSignal(zoneHourlies.mid).precip,
      top: getZoneSignal(zoneHourlies.top).precip,
    },
    snowfall: {
      village: getZoneSignal(zoneHourlies.village).snowfall,
      mid: getZoneSignal(zoneHourlies.mid).snowfall,
      top: getZoneSignal(zoneHourlies.top).snowfall,
    },
    freezingLevel: {
      village: getZoneSignal(zoneHourlies.village).freezingLevel,
      mid: getZoneSignal(zoneHourlies.mid).freezingLevel,
      top: getZoneSignal(zoneHourlies.top).freezingLevel,
    },
    wind: {
      village: getZoneSignal(zoneHourlies.village).wind,
      mid: getZoneSignal(zoneHourlies.mid).wind,
      top: getZoneSignal(zoneHourlies.top).wind,
    },
    humidity: {
      village: getZoneSignal(zoneHourlies.village).humidity,
      mid: getZoneSignal(zoneHourlies.mid).humidity,
      top: getZoneSignal(zoneHourlies.top).humidity,
    },
  };
}

/** Compute zone-specific hourly forecast from base hourly + zone altitude */
function computeZoneHourly(
  baseHourly: NormalizedHourlyForecast[],
  zoneAlt: number,
  baseAlt: number,
): HourlyForecast[] {
  return baseHourly.map((h) => {
    const altDiff = zoneAlt - baseAlt;
    const tempDrop = altDiff * LAPSE_RATE;
    const zoneTemp = Math.round((h.temp - tempDrop) * 10) / 10;
    const zoneWind =
      Math.round(h.wind * (1 + 0.08 * (altDiff / 100)) * 10) / 10;

    return {
      time: h.time,
      hour: new Date(h.time).getHours(),
      temp: zoneTemp,
      feels_like: Math.round((h.feelsLike - tempDrop) * 10) / 10,
      wind: zoneWind,
      windDir: h.windDir,
      cloudCover: h.cloudCover,
      windGusts: h.windGusts,
      precip: h.precipitation,
      snow_prob: h.precipitationProbability ?? 0,
      freezing_level: h.freezingLevel,
      humidity: h.humidity,
      snowfall: h.snowfall,
      snowDepth: h.snowDepth,
      weatherCode: h.weatherCode,
      precipitationProbability: h.precipitationProbability,
    };
  });
}

function getZoneAnswer(
  hourly: HourlyForecast[],
  altitude: number,
): { status: 'yes' | 'possible' | 'no'; label: string } {
  const snowHours = hourly.filter(
    (h) => h.precip > 0 && h.temp <= 2 && h.freezing_level <= altitude + 150,
  );
  if (snowHours.length === 0)
    return { status: 'no', label: 'sin nieve a la vista' };
  const first = snowHours[0];
  if (first.hour === 0)
    return { status: 'yes', label: 'Señal de nieve presente' };
  return {
    status: 'possible',
    label: `Ventana desde las ${String(first.hour).padStart(2, '0')}:00`,
  };
}

function getMainAnswer(
  zones: [ZoneInterpretation, ZoneInterpretation, ZoneInterpretation],
): SnowInterpretation['mainAnswer'] {
  const best = zones.reduce((a, b) => {
    const order = { yes: 3, possible: 2, no: 1 };
    return order[a.answer.status] >= order[b.answer.status] ? a : b;
  });
  if (best.answer.status === 'yes')
    return {
      status: 'yes',
      label: 'linda nevada',
      description:
        'Condiciones para nevada en el período. Consultá ventanas y zonas.',
    };
  if (best.answer.status === 'possible')
    return {
      status: 'possible',
      label: 'nieve moderada',
      description:
        'Probabilidad de nevada. Condiciones conditionally favorables.',
    };
  return {
    status: 'no',
    label: 'sin nieve a la vista',
    description:
      'No hay precipitación suficiente ni cota favorable para una nevada clara.',
  };
}

function generateZoneAlerts(
  zoneHourly: HourlyForecast[],
  zoneName: string,
  zoneAltitude: number,
): Alert[] {
  const alerts: Alert[] = [];
  for (const h of zoneHourly) {
    if (h.wind > 40) {
      alerts.push({
        type: 'viento',
        level: 'danger',
        message: `Viento fuerte en ${zoneName.toLowerCase()} (${h.wind} km/h)`,
        zone: zoneName as Alert['zone'],
      });
      break;
    }
  }
  if (alerts.length === 0) {
    for (const h of zoneHourly.slice(0, 4)) {
      if (h.wind > 30) {
        alerts.push({
          type: 'viento',
          level: 'warning',
          message: `Viento moderado en ${zoneName.toLowerCase()}`,
          zone: zoneName as Alert['zone'],
        });
        break;
      }
    }
  }
  if (
    zoneHourly.some(
      (h) => h.freezing_level > zoneAltitude + 250 && h.precip > 0,
    )
  ) {
    alerts.push({
      type: 'lluvia',
      level: 'warning',
      message: 'Cota de nieve alta, lluvia posible en sectores bajos',
    });
  }
  return alerts;
}

function deduplicateAlerts(allZoneAlerts: Alert[][]): Alert[] {
  const result: Alert[] = [];
  const seen = new Set<string>();
  for (const alerts of allZoneAlerts) {
    for (const a of alerts) {
      const key = `${a.type}-${a.level}`;
      if (!seen.has(key) && result.length < 3) {
        result.push(a);
        seen.add(key);
      }
    }
  }
  return result;
}

function generateSummary(interp: SnowInterpretation): string {
  const v = interp.zones.village.current;
  const m = interp.zones.mid.current;
  const t = interp.zones.top.current;
  const maxWind = Math.max(v.wind, m.wind, t.wind);
  const mainStatus = interp.mainAnswer.status;
  const hasWindow = interp.bestWindow.hasWindow;
  const snowSignal =
    mainStatus === 'yes' ||
    (mainStatus === 'possible' && interp.powderScore.value >= 35);

  const rules: string[] = [];

  // Nieve probable en pueblo (regla 4)
  if (v.temp <= 1 && v.freezingLevel <= 1700 && v.precipitation >= 0.5) {
    rules.push('Hay condiciones para nevada en el pueblo.');
  }

  // Lluvia abajo / nieve arriba (regla 3)
  if (v.temp > 1.5 && m.temp <= 0.5 && v.precipitation > 0.5) {
    rules.push('Puede llover abajo y nevar mejor hacia centro/cumbre.');
  }

  // Nevada débil (regla 5) — solo si hay precipitación débil
  if (
    snowSignal &&
    v.precipitation >= 0.3 &&
    v.precipitation <= 1 &&
    v.temp <= 2
  ) {
    rules.push('Señal débil: podría haber nevada aislada o intermitente.');
  }

  // Frío seco (regla 1) — sin nieve a la vista
  if (
    mainStatus === 'no' &&
    v.temp <= 2 &&
    v.precipitation <= 0.2 &&
    v.humidity < 65
  ) {
    rules.push(
      'Frío seco. La temperatura acompaña, pero falta precipitación para una nevada clara.',
    );
  }

  // Cota favorable sin precipitación (regla 2) — sin nieve a la vista
  if (
    mainStatus === 'no' &&
    v.freezingLevel <= 1700 &&
    v.precipitation <= 0.2 &&
    rules.length === 0
  ) {
    rules.push('La cota acompaña, pero sin precipitación no hay nevada clara.');
  }

  // Viento complica (regla 6)
  if (maxWind >= 35) {
    rules.push(
      'El viento puede afectar la calidad percibida y la acumulación.',
    );
  }

  // Ventana de acumulación
  if (hasWindow) {
    rules.push(
      `Mejor ventana de acumulación: ${interp.bestWindow.from} a ${interp.bestWindow.to}.`,
    );
  }

  // Powder score alto
  if (interp.powderScore.value >= 70 && mainStatus !== 'no') {
    rules.push('Polvo asegurado para los fanáticos esta jornada.');
  }

  const hasContentRule = rules.length > 0;

  // Cota alta — siempre se agrega si aplica
  if (v.freezingLevel > 2500) {
    rules.push('La cota de nieve está alta para Caviahue.');
  }

  // Fallback — solo si no hay reglas de contenido (excluye cota alta)
  if (!hasContentRule) {
    if (mainStatus === 'no') {
      rules.unshift('Sin precipitación relevante. Jornada estable.');
    } else if (mainStatus === 'possible') {
      rules.unshift(
        'Probabilidad de nieve condicional a temperatura y precipitación.',
      );
    } else {
      rules.unshift('Condiciones favorables para nieve en sectores altos.');
    }
  }

  return rules.join(' ');
}

export function analyzeWeather(
  normalized: NormalizedSnowForecast,
  sourceStatus?: SourceStatus,
  resortStatus?: ResortStatus,
): SnowInterpretation {
  const baseAlt = normalized.zones.village.altitude;

  // Pre-compute zone-specific hourly arrays using lapse rate
  const zoneHourlies: Record<string, HourlyForecast[]> = {};
  for (const zoneId of ZONE_IDS) {
    const zone = normalized.zones[zoneId.id];
    zoneHourlies[zoneId.id] = computeZoneHourly(
      normalized.hourly,
      zone.altitude,
      baseAlt,
    );
  }

  const zoneInterpretations: [
    ZoneInterpretation,
    ZoneInterpretation,
    ZoneInterpretation,
  ] = ZONE_IDS.map((zoneId) => {
    const zone = normalized.zones[zoneId.id];
    const zh = zoneHourlies[zoneId.id];
    const answer = getZoneAnswer(zh, zone.altitude);
    const alerts = generateZoneAlerts(zh, zone.label, zone.altitude);
    const current = zh[0] ?? {
      temp: null,
      feels_like: null,
      wind: null,
      windDir: null,
      cloudCover: null,
      windGusts: null,
      precip: null,
      snow_prob: null,
      freezing_level: null,
      humidity: null,
      snowfall: null,
      snowDepth: null,
      weatherCode: null,
      precipitationProbability: null,
    };

    return {
      id: zoneId.id,
      label: zoneId.label,
      altitude: zone.altitude,
      current: {
        temp: current.temp,
        feelsLike: current.feels_like,
        wind: current.wind,
        precipitation: current.precip,
        snowChance: current.snow_prob,
        freezingLevel: current.freezing_level,
        humidity: current.humidity,
        snowDepth: current.snowDepth,
        precipitationProbability: current.precipitationProbability,
        weatherCode: current.weatherCode,
      },
      answer,
      alerts,
    };
  }) as [ZoneInterpretation, ZoneInterpretation, ZoneInterpretation];

  const allAlerts = deduplicateAlerts(zoneInterpretations.map((z) => z.alerts));

  // Find best zone for powder score calculation
  const bestZoneId = ZONE_IDS.reduce((a, b) => {
    const aZh = zoneHourlies[a.id];
    const aZone = normalized.zones[a.id];
    const aScore = aZh.some(
      (h) =>
        h.precip > 0 && h.temp <= 2 && h.freezing_level <= aZone.altitude + 150,
    )
      ? 1
      : 0;
    const bZh = zoneHourlies[b.id];
    const bZone = normalized.zones[b.id];
    const bScore = bZh.some(
      (h) =>
        h.precip > 0 && h.temp <= 2 && h.freezing_level <= bZone.altitude + 150,
    )
      ? 1
      : 0;
    return bScore > aScore ? b : a;
  });

  const bestZone = normalized.zones[bestZoneId.id];
  const bestZh = zoneHourlies[bestZoneId.id];

  const powder = calculatePowderScore(bestZh, bestZone.altitude);
  const mainAnswer = getMainAnswer(zoneInterpretations);

  // Use validateWindow instead of inline formatting
  let bestWindow: SnowInterpretation['bestWindow'] = {
    hasWindow: false,
    label: 'Sin ventana definida',
    description: 'No se identificó una ventana clara de acumulación.',
  };

  if (powder.snowWindow) {
    const validated = validateWindow(
      powder.snowWindow.fromTime,
      powder.snowWindow.toTime,
    );
    if (validated.hasWindow) {
      bestWindow = {
        hasWindow: true,
        from: validated.from,
        to: validated.to,
        label: validated.label,
        description: validated.description,
      };
    } else {
      bestWindow = {
        hasWindow: false,
        from: undefined,
        to: undefined,
        label: validated.label,
        description: validated.description,
      };
    }
  }

  let powderDescription = powder.reason;
  if (powder.value < 35) {
    const villagePrecip = zoneInterpretations[0].current.precipitation;
    if (villagePrecip != null && villagePrecip <= 0.2) {
      powderDescription = 'Score bajo — falta precipitación para acumulación.';
    } else {
      powderDescription =
        'Score bajo — condiciones no favorables para nieve polvo.';
    }
  }

  const interp: SnowInterpretation = {
    mainAnswer,
    snowLabel: computeSnowLabel(
      mainAnswer.status,
      powder.value,
      powder.snowWindow !== null,
    ),
    powderScore: {
      value: powder.value,
      label: powder.reason,
      description: powderDescription,
    },
    zones: {
      village: zoneInterpretations[0],
      mid: zoneInterpretations[1],
      top: zoneInterpretations[2],
    },
    bestWindow,
    alerts: allAlerts,
    guruSummary: '',
    updated: normalized.updatedAt,

    // Trust layer (optional fields)
    confidence: sourceStatus
      ? calculateConfidence(bestZh, sourceStatus, bestZone.altitude)
      : undefined,
    sourceStatus,
    signals: sourceStatus ? extractSignalSummary(zoneHourlies) : undefined,
    validatedWindow: bestWindow.hasWindow ? bestWindow : undefined,
    degraded: sourceStatus
      ? Object.values(sourceStatus).some(
          (s) => s === 'failed' || s === 'unconfigured',
        )
      : undefined,
    resortStatus: resortStatus ?? loadResortStatus(),
  };

  // Compute narrative tier from confidence + snow status + wind
  if (interp.confidence) {
    const maxWind = Math.max(
      ...Object.values(zoneHourlies).flat().map((h) => h.wind),
    );
    interp.narrativeTier = computeNarrativeTier(
      interp.confidence,
      interp.mainAnswer.status,
      maxWind,
    );
  }

  interp.guruSummary = generateSummary(interp);

  return interp;
}

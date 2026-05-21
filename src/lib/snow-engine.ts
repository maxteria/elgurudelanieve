import type { WeatherData, ZoneForecast, Alert } from './types';
import type { SnowInterpretation, ZoneInterpretation } from './types';
import { calculatePowderScore } from './scoring';

const ZONE_MAP: { name: ZoneForecast['name']; id: 'village' | 'mid' | 'top'; label: string }[] = [
    { name: 'Pueblo', id: 'village', label: 'Pueblo (base)' },
    { name: 'Centro', id: 'mid', label: 'Centro (medio)' },
    { name: 'Cumbre', id: 'top', label: 'Cumbre (alto)' }
];

function getZoneAnswer(hourly: WeatherData['zones'][0]['hourly'], altitude: number): { status: 'yes' | 'possible' | 'no'; label: string } {
  const snowHours = hourly.filter(h => h.precip > 0 && h.temp <= 2 && h.freezing_level <= altitude + 150);
  if (snowHours.length === 0) return { status: 'no', label: 'Sin señal de nieve' };
  const first = snowHours[0];
  if (first.hour === 0) return { status: 'yes', label: 'Señal de nieve presente' };
  return { status: 'possible', label: `Ventana desde las ${String(first.hour).padStart(2, '0')}:00` };
}

function getMainAnswer(zones: [ZoneInterpretation, ZoneInterpretation, ZoneInterpretation]): SnowInterpretation['mainAnswer'] {
  const best = zones.reduce((a, b) => {
    const order = { yes: 3, possible: 2, no: 1 };
    return order[a.answer.status] >= order[b.answer.status] ? a : b;
  });
  if (best.answer.status === 'yes') return { status: 'yes', label: 'SEÑAL DE NIEVE', description: 'Condiciones para nieve en el período. Consultá ventanas y zonas.' };
  if (best.answer.status === 'possible') return { status: 'possible', label: 'POSIBLE NIEVE', description: 'Probabilidad de nieve. Señal condicional a temperatura y precipitación.' };
  return { status: 'no', label: 'SIN SEÑAL', description: 'No hay precipitación suficiente ni cota favorable para una nevada clara.' };
}

function generateZoneAlerts(zone: ZoneForecast): Alert[] {
  const alerts: Alert[] = [];
  for (const h of zone.hourly) {
    if (h.wind > 40) {
      alerts.push({ type: 'viento', level: 'danger', message: `Viento fuerte en ${zone.name.toLowerCase()} (${h.wind} km/h)`, zone: zone.name });
      break;
    }
  }
  if (alerts.length === 0) {
    for (const h of zone.hourly.slice(0, 4)) {
      if (h.wind > 30) {
        alerts.push({ type: 'viento', level: 'warning', message: `Viento moderado en ${zone.name.toLowerCase()}`, zone: zone.name });
        break;
      }
    }
  }
  if (zone.hourly.some(h => h.freezing_level > zone.altitude + 250 && h.precip > 0)) {
    alerts.push({ type: 'lluvia', level: 'warning', message: 'Cota de nieve alta, lluvia posible en sectores bajos' });
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

  // Nevada débil (regla 5) — solo si hay señal de nieve
  if (snowSignal && v.precipitation >= 0.3 && v.precipitation <= 1 && v.temp <= 2) {
    rules.push('Señal débil: podría haber nevada aislada o intermitente.');
  }

  // Frío seco (regla 1) — sin señal de nieve
  if (mainStatus === 'no' && v.temp <= 2 && v.precipitation <= 0.2 && v.humidity < 65) {
    rules.push('Frío seco. La temperatura acompaña, pero falta precipitación para una nevada clara.');
  }

  // Cota favorable sin precipitación (regla 2) — sin señal de nieve
  if (mainStatus === 'no' && v.freezingLevel <= 1700 && v.precipitation <= 0.2 && rules.length === 0) {
    rules.push('La cota acompaña, pero sin precipitación no hay señal clara de nevada.');
  }

  // Viento complica (regla 6)
  if (maxWind >= 35) {
    rules.push('El viento puede afectar la calidad percibida y la acumulación.');
  }

  // Ventana de acumulación
  if (hasWindow) {
    rules.push(`Mejor ventana de acumulación: ${interp.bestWindow.from} a ${interp.bestWindow.to}.`);
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
      rules.unshift('Sin señal de precipitación significativa. Jornada estable.');
    } else if (mainStatus === 'possible') {
      rules.unshift('Probabilidad de nieve condicional a temperatura y precipitación.');
    } else {
      rules.unshift('Condiciones favorables para nieve en sectores altos.');
    }
  }

  return rules.join(' ');
}

export function analyzeWeather(data: WeatherData): SnowInterpretation {
  const rawZones = ZONE_MAP.map(m => data.zones.find(z => z.name === m.name)!).filter(Boolean);

  const zoneInterpretations: [ZoneInterpretation, ZoneInterpretation, ZoneInterpretation] = rawZones.map(z => {
    const answer = getZoneAnswer(z.hourly, z.altitude);
    const alerts = generateZoneAlerts(z);
    const current = z.hourly[0];

    return {
      id: ZONE_MAP.find(m => m.name === z.name)!.id,
      label: ZONE_MAP.find(m => m.name === z.name)!.label,
      altitude: z.altitude,
      current: {
        temp: current.temp,
        feelsLike: current.feels_like,
        wind: current.wind,
        precipitation: current.precip,
        snowChance: current.snow_prob,
        freezingLevel: current.freezing_level,
        humidity: current.humidity
      },
      answer,
      alerts
    };
  }) as [ZoneInterpretation, ZoneInterpretation, ZoneInterpretation];

  const allAlerts = deduplicateAlerts(zoneInterpretations.map(z => z.alerts));

  const bestZone = rawZones.reduce((a, b) => {
    const aScore = a.hourly.some(h => h.precip > 0 && h.temp <= 2 && h.freezing_level <= a.altitude + 150) ? 1 : 0;
    const bScore = b.hourly.some(h => h.precip > 0 && h.temp <= 2 && h.freezing_level <= b.altitude + 150) ? 1 : 0;
    return bScore > aScore ? b : a;
  });

  const powder = calculatePowderScore(bestZone.hourly, bestZone.altitude);
  const mainAnswer = getMainAnswer(zoneInterpretations);

  let bestWindow: SnowInterpretation['bestWindow'] = {
    hasWindow: false,
    label: 'Sin ventana definida',
    description: 'No se identificó una ventana clara de acumulación.'
  };

  if (powder.snowWindow) {
    const [from, to] = powder.snowWindow;
    bestWindow = {
      hasWindow: true,
      from: `${String(from).padStart(2, '0')}:00`,
      to: `${String(to).padStart(2, '0')}:00`,
      label: `${String(from).padStart(2, '0')}:00 a ${String(to).padStart(2, '0')}:00`,
      description: 'Mejor acumulación prevista en ese período.'
    };
  }

  let powderDescription = powder.reason;
  if (powder.value < 35) {
    const villagePrecip = zoneInterpretations[0].current.precipitation;
    if (villagePrecip <= 0.2) {
      powderDescription = 'Score bajo — falta precipitación para acumulación.';
    } else {
      powderDescription = 'Score bajo — condiciones no favorables para nieve polvo.';
    }
  }

  const interp: SnowInterpretation = {
    mainAnswer,
    powderScore: {
      value: powder.value,
      label: powder.reason,
      description: powderDescription
    },
    zones: {
      village: zoneInterpretations[0],
      mid: zoneInterpretations[1],
      top: zoneInterpretations[2]
    },
    bestWindow,
    alerts: allAlerts,
    guruSummary: '',
    updated: data.updated
  };

  interp.guruSummary = generateSummary(interp);

  return interp;
}

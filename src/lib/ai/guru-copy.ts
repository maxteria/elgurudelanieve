import type { SnowInterpretation, PeriodKey, NarrativeTier, ConfidenceScore, ResortStatus } from '../types';
import type { DailySummary, AicStationData } from '../weather/types';
import type { GuruNpcOutput, GuruMood, GuruCertainty } from './types';
import { getGuruMessagesInRange, storeGuruMessage } from '../supabase/client';
import { SITE_URL } from '../site';
import { applyNarrativeGovernance, isSkiRecommendationAllowed, isBaseClaimAllowed } from '../governance/apply-narrative-governance';

export type GuruCopyInput = {
  period: PeriodKey;
  mainAnswer: SnowInterpretation['mainAnswer'];
  powderScore: SnowInterpretation['powderScore'];
  bestWindow: SnowInterpretation['bestWindow'];
  alerts: SnowInterpretation['alerts'];
  zones: {
    village: SnowInterpretation['zones']['village'];
    mid: SnowInterpretation['zones']['mid'];
    top: SnowInterpretation['zones']['top'];
  };
  now?: SnowInterpretation['weatherApi'];
  nextDays?: DailySummary[];
  aicHistory?: AicStationData[];
  /** Narrative governance tier. If omitted, defaults to 'normal'. */
  narrativeTier?: NarrativeTier;
  /** Manual/local resort operational status. */
  resortStatus?: ResortStatus;
};

const LLM_KEY_ENV = 'OPENROUTER_API_KEY';
const LLM_MODEL = 'google/gemini-3.1-flash-lite';

// Cache Guru responses in Supabase for 2 hours
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

const VALID_MOODS: GuruMood[] = [
  'excited',
  'confident',
  'cautious',
  'warning',
  'neutral',
];

const VALID_CERTAINTIES: GuruCertainty[] = ['alta', 'media', 'baja'];

// ─── Narrative Governance ────────────────────────────────────────────────────

/** Blocked phrases per narrative tier. Layer 3 post-processor scans these. */
const BLOCKED_PHRASES: Record<NarrativeTier, RegExp[]> = {
  restricted: [
    /paquetón/i,
    /powder day/i,
    /pólvora/i,
    /épico/i,
    /subí sin dudar/i,
    /nevad(a|ón) fuerte/i,
    /garantizad[ao]/i,
    /segur[oa] (que|de)/i,
    /imperdible/i,
    /no te lo pierdas/i,
  ],
  normal: [
    /paquetón/i,
    /powder day/i,
    /garantizad[ao]/i,
    /segur[oa] (que|de)/i,
  ],
  expressive: [], // expressive has no blocked phrases (trusted tone)
};

/**
 * Compute the narrative governance tier based on confidence, snow status, and wind.
 *
 * - restricted: Baja confidence, or no-snow status, or extreme wind (>50 km/h)
 * - normal: Media confidence, or possible snow, or strong wind (35-50 km/h)
 * - expressive: Alta confidence AND yes/possible snow AND wind <= 35 km/h
 */
export function computeNarrativeTier(
  confidence: ConfidenceScore,
  mainStatus: 'yes' | 'possible' | 'no',
  maxWind: number,
): NarrativeTier {
  if (
    confidence.label === 'Baja' ||
    mainStatus === 'no' ||
    maxWind > 50
  ) {
    return 'restricted';
  }
  if (
    confidence.label === 'Alta' &&
    mainStatus !== 'no' &&
    maxWind <= 35
  ) {
    return 'expressive';
  }
  return 'normal';
}

// Resort operational governance helpers are centralized in
// src/lib/governance/apply-narrative-governance.ts and imported above.

/** Format resort status context for the LLM prompt. */
function buildResortStatusContext(
  resortStatus: ResortStatus | undefined,
): string {
  if (!resortStatus) {
    return 'Estado operativo del centro: no disponible. No menciones base esquiable ni recomiendas ski/snowboard.';
  }

  const lines = [
    `Temporada: ${resortStatus.seasonStatus}`,
    `Centro operativo: ${resortStatus.resortOperationalStatus}`,
    `Parte oficial disponible: ${resortStatus.officialSnowReportAvailable ? 'sí' : 'no'}`,
    `Base (cm): ${resortStatus.baseDepthCm ?? 'sin dato'}`,
    `Medios abiertos: ${resortStatus.liftsOpen ?? 0}`,
    `Pistas abiertas: ${resortStatus.slopesOpen ?? 0}`,
    `Fuente: ${resortStatus.resortStatusSource}`,
  ];

  if (resortStatus.operationalWarnings.length > 0) {
    lines.push(
      `Advertencias: ${resortStatus.operationalWarnings.join('; ')}`,
    );
  }

  const skiAllowed = isSkiRecommendationAllowed(resortStatus);
  const baseAllowed = isBaseClaimAllowed(resortStatus);

  lines.push(
    `Reglas de narrativa: ${skiAllowed ? 'Podés recomendar ski/snowboard con moderación y disclaimer.' : 'NO recomiendes ski/snowboard. Hablá solo de nieve meteorológica en formación.'}`,
  );
  lines.push(
    `Reglas de base: ${baseAllowed ? 'Podés mencionar base consolidada con disclaimer de verificar parte oficial.' : 'NO digas "base consolidada", "base excelente" ni afirmes condiciones esquiables.'}`,
  );

  return lines.join('\n');
}

/**
 * Layer 3b post-processor: enforce resort-operational governance.
 * Blocks ski/base claims when the resort status does not support them.
 */
export function postProcessResortGovernance(
  output: GuruNpcOutput,
  resortStatus: ResortStatus | undefined,
): GuruNpcOutput | null {
  const text = `${output.message} ${output.tip ?? ''}`.toLowerCase();

  const skiPhrases = [
    /esqui[aeáéíóú]/i,
    /ski/i,
    /snowboard/i,
    /tabla/i,
    /subí(?:s)?/i,
    /bajad[aeo]/i,
    /pista/i,
    /medios/i,
  ];

  const basePhrases = [
    /base consolidada/i,
    /base excelente/i,
    /base suficiente/i,
    /buena base/i,
    /base esquiable/i,
    /nieve esquiable/i,
  ];

  // Use centralized governance checks (conservative defaults when status missing)
  if (!isSkiRecommendationAllowed(resortStatus)) {
    for (const re of skiPhrases) {
      if (re.test(text)) {
        console.warn(
          `[Guru] Post-process blocked ski recommendation under resort status`,
        );
        return null;
      }
    }
  }

  if (!isBaseClaimAllowed(resortStatus)) {
    for (const re of basePhrases) {
      if (re.test(text)) {
        console.warn(
          `[Guru] Post-process blocked base claim under resort status`,
        );
        return null;
      }
    }
  }

  return output;
}

/**
 * Layer 3 post-processor: scan output for blocked phrases.
 * If a violation is found, return null to signal fallback to safe message.
 */
export function postProcessGuruMessage(
  output: GuruNpcOutput,
  tier: NarrativeTier,
): GuruNpcOutput | null {
  const patterns = BLOCKED_PHRASES[tier];
  if (!patterns || patterns.length === 0) return output;

  for (const re of patterns) {
    if (re.test(output.message)) {
      console.warn(
        `[Guru] Post-process blocked phrase "${re.source}" in tier "${tier}", falling back`,
      );
      return null;
    }
    if (output.tip && re.test(output.tip)) {
      console.warn(
        `[Guru] Post-process blocked phrase "${re.source}" in tip for tier "${tier}", falling back`,
      );
      return null;
    }
  }

  return output;
}

function getLlmKey(): string | undefined {
  // Local dev: Astro/Vite loads .env into import.meta.env
  // Vercel/CI: env vars are in process.env
  try {
    const metaKey = import.meta.env?.[LLM_KEY_ENV];
    if (metaKey) return metaKey;
  } catch {
    // import.meta.env not available (plain Node.js test runner, etc.)
  }
  return process.env[LLM_KEY_ENV];
}

// ─── JSON Parser ────────────────────────────────────────────────────────────

export function extractJsonGuruResponse(text: string): GuruNpcOutput | null {
  // Extract the first JSON block { ... } from markdown-wrapped or raw responses
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (
      typeof parsed.mood !== 'string' ||
      typeof parsed.certainty !== 'string' ||
      typeof parsed.message !== 'string'
    ) {
      return null;
    }

    const mood: GuruMood = VALID_MOODS.includes(parsed.mood)
      ? parsed.mood
      : 'neutral';
    const certainty: GuruCertainty = VALID_CERTAINTIES.includes(
      parsed.certainty,
    )
      ? parsed.certainty
      : 'baja';

    return {
      mood,
      certainty,
      message: parsed.message.trim(),
      tip: typeof parsed.tip === 'string' ? parsed.tip.trim() : null,
      source: 'ai',
    };
  } catch {
    return null;
  }
}

// ─── Fallback ───────────────────────────────────────────────────────────────

type Variant = { message: string; tip: string | null };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const NO_SNOW_HIGH_ALTITUDE: Variant[] = [
  {
    message:
      'Hoy no detecto nieve, rider. La montaña está fría pero seca. No te hagas ilusiones todavía: guardá la tabla para cuando los modelos confirmen humedad.',
    tip: 'Aprovechá para hacer mantenimiento y estar listo cuando llegue.',
  },
  {
    message:
      'No detecto pinta de que nieve, la cota está por las nubes. Humedad hay, pero no alcanza. Paciencia.',
    tip: 'Es buen momento para revisar cantos y ceras.',
  },
  {
    message:
      'Cerro seco y frío, sin onda para nieve. No te manijees al pedo — cuando cambie, te aviso.',
    tip: 'Andá calentando que en cualquier momento cae algo.',
  },
  {
    message:
      'La montaña está quieta, cota alta, sin precipitación. Día de manteca, no de nieve.',
    tip: 'Afilá la tabla y esperá la próxima.',
  },
];

const NO_SNOW_GENERIC: Variant[] = [
  {
    message:
      'Hoy no detecto nevada, la montaña está tranquila. Esperá que llegue moisture o no hay nada que hacer.',
    tip: 'Seguí mirando las actualizaciones, Caviahue cambia rápido.',
  },
  {
    message:
      'Sin blanco a la vista por ahora. La atmósfera no está dando señales, pero esto cambia en un par de horas.',
    tip: 'Dejá la tabla lista por si gira el viento.',
  },
];

const COLD_DRY: Variant[] = [
  {
    message:
      'Hace frío y seco, pero sin nieve. Buen día para recorrer y mirar el cerro desde abajo.',
    tip: 'Si querés recorrer, las vistas se ven amplias.',
  },
  {
    message:
      'Frío seco, cero humedad. La montaña está linda para caminar, no para deslizar.',
    tip: 'Aprovechá el día para conocer Caviahue.',
  },
];

const MIXED_PRECIP: Variant[] = [
  {
    message:
      'Abajo puede venir más húmedo que blanco, pero arriba la historia mejora. Centro y cumbre tienen mejor pinta para ver nieve.',
    tip: 'Si subís, llevá capa impermeable. Arriba puede estar firme.',
  },
  {
    message:
      'La cosa está dividida: abajo lluvia, arriba nieve. Si te animás a subir, arriba hay más chances de blanco.',
    tip: 'La clave está en la cota. Arriba de los 2000 mejora.',
  },
];

// ─── Multi-Period Fallback ───────────────────────────────────────────────────

const SNOW_SOON: Variant[] = [
  {
    message:
      'Hoy no cae nada, pero no te desconectes: los próximos días vienen con blanco. La montaña se está preparando.',
    tip: 'Dejá todo listo, que en un par de días puede haber buena nieve.',
  },
  {
    message:
      'Hoy está seco, pero los modelos marcan nieve en los próximos días. No es promesa, pero la señal es buena.',
    tip: 'Mantené el equipo a mano por si el viento gira.',
  },
];

const SNOW_LATER: Variant[] = [
  {
    message:
      'Hoy no detecto blanco, pero más adelante en la semana puede asomarse algo. Hay que tener paciencia.',
    tip: 'Seguí mirando las actualizaciones, Caviahue cambia rápido.',
  },
  {
    message:
      'Sin nieve por ahora. Los datos de más adelante muestran posibilidad, pero está lejos para afirmarlo.',
    tip: 'No te manijees. Si la señal se sostiene, los próximos días traen noticias.',
  },
];

/**
 * Check if nextDays has upcoming snowfall within a window.
 * Returns { daysUntil, totalSnow } or null if none found.
 */
function findNextSnowWindow(
  nextDays: DailySummary[] | undefined,
): { daysUntil: number; totalSnow: number } | null {
  if (!nextDays || nextDays.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const day of nextDays) {
    const date = new Date(day.date + 'T00:00:00');
    const diffMs = date.getTime() - today.getTime();
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) continue; // skip past days

    if (day.totalSnow > 0) {
      return { daysUntil, totalSnow: day.totalSnow };
    }
  }

  return null;
}

const WINDY: Variant[] = [
  {
    message:
      'Detecto viento importante. Puede haber nevada débil, pero el viento complica la experiencia en altura.',
    tip: 'Evitá las cotas más expuestas si querés tablar tranquilo.',
  },
  {
    message:
      'El viento está bravo allá arriba. Si hay nieve, va a volar — mejor buscar reparo en cotas medias.',
    tip: 'Andá abrigado y priorizá sectores con bosque.',
  },
];

export function generateFallbackNpcMessage(data: GuruCopyInput): GuruNpcOutput {
  const v = data.zones.village.current;
  const m = data.zones.mid.current;
  const t = data.zones.top.current;
  const mainStatus = data.mainAnswer.status;
  const hasWindow = data.bestWindow.hasWindow;
  const cotaAlta = v.freezingLevel > 2500;
  const hasWindAlert = data.alerts.some((a) => a.type === 'viento');
  const mixed = v.temp > 1.5 && m.temp <= 0.5 && v.precipitation > 0.5;

  // 1. Lluvia abajo / nieve arriba
  if (mixed) {
    const v = pick(MIXED_PRECIP);
    return { mood: 'cautious', certainty: 'media', ...v, source: 'fallback' };
  }

  // 2. Viento fuerte
  if (hasWindAlert && mainStatus !== 'no') {
    const v = pick(WINDY);
    return { mood: 'warning', certainty: 'alta', ...v, source: 'fallback' };
  }

  // 3. Multi-period fallback: status=no but snow in upcoming days
  if (mainStatus === 'no' && data.nextDays) {
    const window = findNextSnowWindow(data.nextDays);
    if (window && window.daysUntil <= 7 && window.daysUntil >= 1) {
      if (window.daysUntil <= 3) {
        // Snow in next 1-3 days: higher urgency
        const msg = pick(SNOW_SOON);
        return {
          mood: 'cautious',
          certainty: 'media',
          ...msg,
          source: 'fallback',
        };
      }
      // Snow in 4-7 days: lower urgency
      const msg = pick(SNOW_LATER);
      return { mood: 'neutral', certainty: 'baja', ...msg, source: 'fallback' };
    }
  }

  // 4. Sin nieve a la vista / cota alta
  if (mainStatus === 'no' && cotaAlta) {
    const v = pick(NO_SNOW_HIGH_ALTITUDE);
    return { mood: 'neutral', certainty: 'alta', ...v, source: 'fallback' };
  }

  // 5. Frío seco
  if (mainStatus === 'no' && v.precipitation <= 0.2 && v.temp <= 2) {
    const v = pick(COLD_DRY);
    return { mood: 'neutral', certainty: 'alta', ...v, source: 'fallback' };
  }

  // 6. Sin nieve a la vista genérico
  if (mainStatus === 'no') {
    const v = pick(NO_SNOW_GENERIC);
    return { mood: 'neutral', certainty: 'baja', ...v, source: 'fallback' };
  }

  const skiAllowed = isSkiRecommendationAllowed(data.resortStatus);
  const baseAllowed = isBaseClaimAllowed(data.resortStatus);

  // 7. Nieve probable (yes)
  if (mainStatus === 'yes' && hasWindow) {
    if (!skiAllowed) {
      return {
        mood: 'cautious',
        certainty: 'media',
        message: `Se detecta una ventana de nieve entre ${data.bestWindow.from} y ${data.bestWindow.to}. Es nieve meteorológica en formación, no significa que el centro esté esquiable.`,
        tip: 'Revisá el parte oficial antes de cualquier plan de montaña.',
        source: 'fallback',
      };
    }
    return {
      mood: 'confident',
      certainty: 'alta',
      message: `¡Buena señal! Si estás en Caviahue, mirá la ventana de ${data.bestWindow.from} a ${data.bestWindow.to}: ahí se arma.`,
      tip: 'Prepará el equipo y estate atento a esa ventana.',
      source: 'fallback',
    };
  }

  if (mainStatus === 'yes') {
    if (!skiAllowed) {
      return {
        mood: 'cautious',
        certainty: 'media',
        message:
          'Detecto nieve en formación. Las condiciones meteorológicas se dan, pero no implican que el centro esté operativo para ski.',
        tip: 'Revisá el parte oficial antes de salir.',
        source: 'fallback',
      };
    }
    return {
      mood: 'confident',
      certainty: 'media',
      message:
        'Detecto nieve posible. Las condiciones se están dando para los que buscan blanco arriba.',
      tip: 'Monitoreá la ventana de acumulación para afinar el timing.',
      source: 'fallback',
    };
  }

  // 8. Ventana clara (possible con ventana)
  if (mainStatus === 'possible' && hasWindow) {
    if (!skiAllowed) {
      return {
        mood: 'cautious',
        certainty: 'media',
        message: `Hay una ventana meteorológica entre ${data.bestWindow.from} y ${data.bestWindow.to}. Puede nevar, pero no indica que el centro esté esquiable.`,
        tip: 'Seguí el parte oficial para saber si abren medios.',
        source: 'fallback',
      };
    }
    return {
      mood: 'cautious',
      certainty: 'media',
      message: `Hay una ventana interesante entre ${data.bestWindow.from} y ${data.bestWindow.to}. Puede pasar algo, pero no guarantees.`,
      tip: 'No te confíes, pero estate listo por si se define.',
      source: 'fallback',
    };
  }

  // 9. Posible nieve sin ventana
  if (mainStatus === 'possible') {
    return {
      mood: 'cautious',
      certainty: 'baja',
      message:
        'Detecto señales pero no hay ventana clara. Quedate atento, puede cambiar rápido.',
      tip: 'Actualizá la página más tarde para ver si se forma ventana.',
      source: 'fallback',
    };
  }

  return {
    mood: 'neutral',
    certainty: 'baja',
    message: data.mainAnswer.description,
    tip: null,
    source: 'fallback',
  };
}

// ─── LLM Prompts ────────────────────────────────────────────────────────────

function buildNarrativeRules(tier: NarrativeTier): string {
  const base = `No digas "garantizado", "imposible", "seguro".
No uses tecnicismos: hPa, mm de acumulación.
Podés mencionar cota de nieve si ayuda a explicar la situación.
No inventes horarios fuera de la ventana marcada.
No inventes acumulación.`;

  if (tier === 'restricted') {
    return `${base}
Modo RESTRINGIDO activo. NO uses expresiones de alta confianza.
NO uses: "paquetón", "powder day", "pólvora", "épico", "subí sin dudar", "nevada fuerte", "garantizado", "imperdible".
Limitá el tono a informativo y cauto.
No prometas nieve bajo ninguna circunstancia.
Priorizá: "No hay señal clara", "Puede cambiar", "Seguí monitoreando".`;
  }

  if (tier === 'expressive') {
    return `${base}
Modo EXPRESIVO activo. Señales alineadas, podés usar más entusiasmo sin exagerar.
Evitá igual "garantizado" y "seguro".
Podés usar lenguaje como "linda nevada", "buena señal", "se viene algo lindo" con moderación.`;
  }

  // normal — default rules
  return `${base}
Modo NORMAL. Tono neutral-conservador.
No uses "paquetón" ni "powder day" ni "garantizado".
Podés mostrar optimismo moderado si hay señales, pero sin prometer.`;
}

function buildSystemPrompt(
  tier: NarrativeTier,
  resortStatus: ResortStatus | undefined,
): string {
  return `Sos El Gurú de la Nieve. Un guía de montaña que hace 30 inviernos que mira Caviahue. Conocés cada ladera, cada viento, cada cambio de temperatura.

Generá un objeto JSON con esta estructura exacta, sin markdown ni explicaciones adicionales:
{
  "mood": "excited" | "confident" | "cautious" | "warning" | "neutral",
  "certainty": "alta" | "media" | "baja",
  "message": "2 o 3 oraciones sobre las condiciones de nieve",
  "tip": "consejo corto y accionable, o null si no aplica"
}

Voz: directa, cálida, con autoridad. Nunca arrogante. Si estás seguro, decilo. Si no, decilo también.
Hablá siempre en primera persona ("Yo veo...", "No veo...", "Veo...").
No digas "el Gurú ve..." ni "el Gurú dice...".
No inventes datos. No contradigas el diagnóstico técnico.
No prometas nieve si no hay señal clara.

${buildNarrativeRules(tier)}

${buildResortStatusContext(resortStatus)}

Mirá SIEMPRE los "Próximos días" del diagnóstico. Si hoy está seco pero el pronóstico muestra nieve para los próximos 3 a 5 días, MENCIONALO con tono optimista pero sin prometer. Por ejemplo: "El jueves el cielo se pone a trabajar y empieza a cerrar para algo de acumulación", "Viene cambiando el panorama para el finde, ojo", "Recién hacia el jueves se arma algo". No te quedes solo en el presente si hay señal clara más adelante — dale esperanza al rider con mesura.

Códigos WMO de referencia:
- 0: Despejado
- 1–3: Mayormente despejado a parcialmente nublado
- 45–48: Niebla
- 51–57: Llovizna
- 61–67: Lluvia
- 71–77: Nevada
- 80–82: Chubascos
- 85–86: Chubascos de nieve
- 95–99: Tormenta

Reglas de modulación de mood:
- powderScore >= 70 y estado de nieve = yes → excited o confident
- powderScore 35-69 y estado de nieve = possible → cautious
- powderScore < 35 y estado de nieve = no → neutral
- Si hay alerta de peligro (viento, etc.) → warning

Reglas de certeza:
- Alta: probabilidad > 60% + cota de nieve baja + acumulación marcada
- Media: probabilidad 30-60% o cota media o señal mixta
- Baja: probabilidad < 30% o cota alta o ventana lejana (>3 días)

Respondé SOLO con el JSON, sin markdown, sin texto adicional.`;
}

function buildUserPrompt(data: GuruCopyInput): string {
  const toCm = (m: number | null | undefined): string => {
    if (m == null) return 'N/A';
    return `${Math.round(m * 100)}`;
  };
  const fmt = (n: number | null | undefined, unit: string): string =>
    n != null ? `${n}${unit}` : 'N/A';
  const zoneLines = [
    `- Pueblo (${fmt(data.zones.village.current.temp, '°C')}, ${fmt(data.zones.village.current.precipitation, 'mm')} precip, nieve: ${toCm(data.zones.village.current.snowDepth)}cm, cota: ${fmt(data.zones.village.current.freezingLevel, 'm')}, prob: ${fmt(data.zones.village.current.precipitationProbability, '%')})`,
    `- Centro (${fmt(data.zones.mid.current.temp, '°C')}, ${fmt(data.zones.mid.current.precipitation, 'mm')} precip, nieve: ${toCm(data.zones.mid.current.snowDepth)}cm, cota: ${fmt(data.zones.mid.current.freezingLevel, 'm')}, prob: ${fmt(data.zones.mid.current.precipitationProbability, '%')})`,
    `- Cumbre (${fmt(data.zones.top.current.temp, '°C')}, ${fmt(data.zones.top.current.precipitation, 'mm')} precip, nieve: ${toCm(data.zones.top.current.snowDepth)}cm, cota: ${fmt(data.zones.top.current.freezingLevel, 'm')}, prob: ${fmt(data.zones.top.current.precipitationProbability, '%')})`,
  ].join('\n');

  const diagnostics = [
    `Período: ${data.period}`,
    `Estado principal: ${data.mainAnswer.label}`,
    `Score de polvo: ${data.powderScore.value}/100`,
    `Estado de nieve: ${data.mainAnswer.status}`,
    `Ventana de acumulación: ${data.bestWindow.hasWindow ? `${data.bestWindow.from} a ${data.bestWindow.to}` : 'Sin ventana clara'}`,
    `Alertas: ${data.alerts.length > 0 ? data.alerts.map((a) => `${a.type}: ${a.message}`).join('; ') : 'Sin alertas'}`,
    data.now
      ? `Ahora en Caviahue: ${data.now.condition}, ${data.now.temp}°C`
      : null,
    data.zones.village.current.weatherCode != null
      ? `Código WMO: ${data.zones.village.current.weatherCode}`
      : null,
    data.nextDays && data.nextDays.length > 0
      ? `Próximos días: ${data.nextDays.map((d) => `${d.weekday}: ${d.totalSnow > 0 ? `${d.totalSnow}cm nieve` : 'sin nieve'} (${d.tempMin}°C/${d.tempMax}°C, ${d.avgWind}km/h viento)`).join(' | ')}`
      : null,
    data.aicHistory && data.aicHistory.length > 0
      ? `Historial AIC (últimos días): ${data.aicHistory.map((r) => `${r.date}: ${r.tempMin}°C/${r.tempMax}°C, humedad ${r.humidity}%, ${r.snowWaterEq !== null && r.snowWaterEq > 0 ? `SWE ${r.snowWaterEq}mm` : 'sin nieve'}`).join(' | ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const resortContext = buildResortStatusContext(data.resortStatus);

  return `Generá el JSON con el mensaje del Gurú basado en este diagnóstico:

${diagnostics}

Zonas:
${zoneLines}

Estado operativo del centro:
${resortContext}

Recordá: SOLO JSON, sin markdown, sin texto alrededor.`;
}

// ─── OpenRouter / LLM API Call ──────────────────────────────────────────────

async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': 'El Gurú de la Nieve',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 400,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[LLM] Rate limited');
      } else if (res.status === 401 || res.status === 403) {
        console.warn('[LLM] Invalid API key');
      } else {
        console.warn(`[LLM] HTTP ${res.status}`);
      }
      return null;
    }

    const json = await res.json();

    if (json?.error) {
      console.warn(`[LLM] API error: ${json.error.message}`);
      return null;
    }

    const text = json?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn('[LLM] Empty response');
      return null;
    }

    return text;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[LLM] Timeout (10s)');
    } else {
      console.warn('[LLM] Network error');
    }
    return null;
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Generate a cache key based on current date only.
 * The period is stored separately in the 'period' field.
 * Format: "2026-06-15"
 */
function getCacheDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function generateGuruNpcMessage(
  data: GuruCopyInput,
): Promise<GuruNpcOutput> {
  const tier = data.narrativeTier ?? 'normal';
  const cacheDate = getCacheDateKey();
  const cacheAge = Date.now() - CACHE_TTL_MS;
  const cutoffDate = new Date(cacheAge).toISOString();

  // Check cache first - look for this period + date combination
  try {
    const cached = await getGuruMessagesInRange(cacheDate, cacheDate);
    const recent = cached.find((r) => {
      const created = r.created_at ?? '';
      const matchesPeriod = r.period_key === data.period;
      return created > cutoffDate && matchesPeriod;
    });
    if (recent && recent.mood && recent.certainty && recent.message) {
      console.info(`[Guru] Cache hit for ${data.period}-${cacheDate}, applying governance`);

      const governed = applyNarrativeGovernance(
        {
          mood: recent.mood as GuruMood,
          certainty: recent.certainty as GuruCertainty,
          message: recent.message,
          tip: null,
          source: 'cache',
        },
        tier,
        data.resortStatus
      );

      if (!governed) {
        console.info('[Guru] Cached message blocked by governance, using fallback');
        return generateFallbackNpcMessage(data);
      }

      return governed;
    }
  } catch (err) {
    console.warn('[Guru] Cache read failed, falling through to LLM');
  }

  // Call LLM if no cache or cache miss
  const apiKey = getLlmKey();
  if (apiKey) {
    const systemPrompt = buildSystemPrompt(tier, data.resortStatus);
    const userPrompt = buildUserPrompt(data);
    const result = await callLlm(systemPrompt, userPrompt, apiKey);
    if (result) {
      const parsed = extractJsonGuruResponse(result);
      if (parsed) {
        // Layer 3: unified governance post-processor — blocks/approves AI output
        const governed = applyNarrativeGovernance(parsed, tier, data.resortStatus);
        if (!governed) {
          console.info('[Guru] Post-process/governance blocked output, using fallback');
          return generateFallbackNpcMessage(data);
        }
        // Store in cache for future builds
        try {
          await storeGuruMessage({
            period: cacheDate,
            period_key: data.period,
            mood: governed.mood,
            certainty: governed.certainty,
            message: governed.message,
            source: 'ai',
          });
        } catch (err) {
          console.warn('[Guru] Failed to cache response');
        }
        return governed;
      }
    }
  }

  return generateFallbackNpcMessage(data);
}

export function hasLlmKey(): boolean {
  return !!getLlmKey();
}

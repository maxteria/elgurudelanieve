import type { SnowInterpretation, PeriodKey } from '../types';
import type { GuruNpcOutput, GuruMood, GuruCertainty } from './types';

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
};

const GEMINI_KEY_ENV = 'GEMINI_API_KEY';

const VALID_MOODS: GuruMood[] = [
  'excited',
  'confident',
  'cautious',
  'warning',
  'neutral',
];

const VALID_CERTAINTIES: GuruCertainty[] = ['alta', 'media', 'baja'];

function getGeminiKey(): string | undefined {
  return process.env[GEMINI_KEY_ENV];
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
      'Hoy no veo nieve, rider. La montaña está fría pero seca. No te hagas ilusiones todavía: andá encerando la tabla.',
    tip: 'Aprovechá para hacer mantenimiento y estar listo cuando llegue.',
  },
  {
    message:
      'No hay señal de blanca, la cota está por las nubes. Paciencia, que Caviahue no te falla cuando llega la humedad.',
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
      'Hoy no veo nevada, la montaña está tranquila. Esperá que llegue moisture o no hay nada que hacer.',
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
      'Hace frío y seco, pero sin nieve. Buen día para andar ligero y mirar el cerro desde abajo.',
    tip: 'Si querés recorrer, las vistas están despejadas.',
  },
  {
    message:
      'Frío seco, cero humedad. La montaña está linda para caminar, no para deslizar.',
    tip: 'Aprovechá el día despejado para conocer Caviahue.',
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

const WINDY: Variant[] = [
  {
    message:
      'Veo viento importante. Puede haber nevada débil, pero el viento complica la experiencia en altura.',
    tip: 'Evitá las cotas más expuestas si querés tablar tranquilo.',
  },
  {
    message:
      'El viento está bravo allá arriba. Si hay nieve, va a volar — mejor buscar reparo en cotas medias.',
    tip: 'Andá abrigado y priorizá sectores con bosque.',
  },
];

export function generateFallbackNpcMessage(
  data: GuruCopyInput,
): GuruNpcOutput {
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

  // 3. Sin nieve a la vista / cota alta
  if (mainStatus === 'no' && cotaAlta) {
    const v = pick(NO_SNOW_HIGH_ALTITUDE);
    return { mood: 'neutral', certainty: 'alta', ...v, source: 'fallback' };
  }

  // 4. Frío seco
  if (mainStatus === 'no' && v.precipitation <= 0.2 && v.temp <= 2) {
    const v = pick(COLD_DRY);
    return { mood: 'neutral', certainty: 'alta', ...v, source: 'fallback' };
  }

  // 5. Sin nieve a la vista genérico
  if (mainStatus === 'no') {
    const v = pick(NO_SNOW_GENERIC);
    return { mood: 'neutral', certainty: 'baja', ...v, source: 'fallback' };
  }

  // 6. Nieve probable (yes)
  if (mainStatus === 'yes' && hasWindow) {
    return {
      mood: 'confident',
      certainty: 'alta',
      message: `¡Buena señal! Si estás en Caviahue, mirá la ventana de ${data.bestWindow.from} a ${data.bestWindow.to}: ahí se arma.`,
      tip: 'Prepará el equipo y estate atento a esa ventana.',
      source: 'fallback',
    };
  }

  if (mainStatus === 'yes') {
    return {
      mood: 'confident',
      certainty: 'media',
      message:
        'Veo nieve posible. Las condiciones se están dando para los que buscan blanco arriba.',
      tip: 'Monitoreá la ventana de acumulación para afinar el timing.',
      source: 'fallback',
    };
  }

  // 7. Ventana clara (possible con ventana)
  if (mainStatus === 'possible' && hasWindow) {
    return {
      mood: 'cautious',
      certainty: 'media',
      message: `Hay una ventana interesante entre ${data.bestWindow.from} y ${data.bestWindow.to}. Puede pasar algo, pero no guarantees.`,
      tip: 'No te confíes, pero estate listo por si se define.',
      source: 'fallback',
    };
  }

  // 8. Posible nieve sin ventana
  if (mainStatus === 'possible') {
    return {
      mood: 'cautious',
      certainty: 'baja',
      message:
        'Veo señales pero no hay ventana clara. Quedate atento, puede cambiar rápido.',
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

// ─── Gemini Prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
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
No uses "garantizado", "imposible", "seguro".
No uses tecnicismos: freezing level, mm, hPa.
No inventes horarios fuera de la ventana marcada.
No inventes acumulación.

Códigos WMO de referencia:
- 0: Cielo despejado
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

Respondé SOLO con el JSON, sin markdown, sin texto adicional.`;
}

function buildUserPrompt(data: GuruCopyInput): string {
  const toCm = (m: number | undefined): string => {
    if (m === undefined || m === null) return 'N/A';
    return `${Math.round(m * 100)}`;
  };
  const zoneLines = [
    `- Pueblo: ${data.zones.village.answer.label} (${data.zones.village.current.temp}°C, ${data.zones.village.current.precipitation}mm precip, nieve en pista: ${toCm(data.zones.village.current.snowDepth)}cm)`,
    `- Centro: ${data.zones.mid.answer.label} (${data.zones.mid.current.temp}°C, ${data.zones.mid.current.precipitation}mm precip, nieve en pista: ${toCm(data.zones.mid.current.snowDepth)}cm)`,
    `- Cumbre: ${data.zones.top.answer.label} (${data.zones.top.current.temp}°C, ${data.zones.top.current.precipitation}mm precip, nieve en pista: ${toCm(data.zones.top.current.snowDepth)}cm)`,
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
    data.zones.village.current.weatherCode !== undefined
      ? `Código WMO: ${data.zones.village.current.weatherCode}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `Generá el JSON con el mensaje del Gurú basado en este diagnóstico:

${diagnostics}

Zonas:
${zoneLines}

Recordá: SOLO JSON, sin markdown, sin texto alrededor.`;
}

// ─── Gemini API Call ────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generation_config: {
            maxOutputTokens: 400,
            temperature: 0.7,
            response_mime_type: 'application/json',
          },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[Gemini] Rate limited');
      } else if (res.status === 401) {
        console.warn('[Gemini] Invalid API key');
      } else {
        console.warn(`[Gemini] HTTP ${res.status}`);
      }
      return null;
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      console.warn('[Gemini] Empty response');
      return null;
    }

    return text;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[Gemini] Timeout (10s)');
    } else {
      console.warn('[Gemini] Network error');
    }
    return null;
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function generateGuruNpcMessage(
  data: GuruCopyInput,
): Promise<GuruNpcOutput> {
  const apiKey = getGeminiKey();

  if (apiKey) {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(data);
    const result = await callGemini(systemPrompt, userPrompt, apiKey);
    if (result) {
      const parsed = extractJsonGuruResponse(result);
      if (parsed) return parsed;
    }
  }

  return generateFallbackNpcMessage(data);
}

// ─── Backward-Compatible Re-export ──────────────────────────────────────────

/** @deprecated Use `generateGuruNpcMessage` instead. */
export const generateTouristCopy = generateGuruNpcMessage;

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}

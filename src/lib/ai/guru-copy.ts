import type { SnowInterpretation, PeriodKey } from '../types';

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

export type GuruCopyOutput = {
  touristCopy: string;
  source: 'ai' | 'fallback';
};

const GEMINI_KEY_ENV = 'GEMINI_API_KEY';

function getGeminiKey(): string | undefined {
  return process.env[GEMINI_KEY_ENV];
}

export function generateFallbackTouristCopy(data: GuruCopyInput): string {
  const v = data.zones.village.current;
  const m = data.zones.mid.current;
  const t = data.zones.top.current;
  const mainStatus = data.mainAnswer.status;
  const hasWindow = data.bestWindow.hasWindow;
  const cotaAlta = v.freezingLevel > 2500;
  const hasWindAlert = data.alerts.some(a => a.type === 'viento');
  const mixed = v.temp > 1.5 && m.temp <= 0.5 && v.precipitation > 0.5;

  // 1. Lluvia abajo / nieve arriba
  if (mixed) {
    return 'Abajo puede venir más húmedo que blanco, pero hacia arriba la historia mejora. Centro y cumbre tienen mejor pinta para ver nieve.';
  }

  // 2. Viento fuerte
  if (hasWindAlert && mainStatus !== 'no') {
    return 'El Gurú ve condiciones movidas. Puede haber nieve débil, pero el viento puede complicar la experiencia en montaña.';
  }

  // 3. Sin nieve a la vista / cota alta
  if (mainStatus === 'no' && cotaAlta) {
    return 'Hoy el Gurú no ve nieve clara. La montaña está tranquila y la cota viene alta, así que pinta más para paseo que para nevada.';
  }

  // 4. Frío seco
  if (mainStatus === 'no' && v.precipitation <= 0.2 && v.temp <= 2) {
    return 'Hace frío, pero falta humedad que caiga en serio. Buen día de abrigo y paisaje, no tanto de nieve nueva.';
  }

  // 5. Sin nieve a la vista genérico
  if (mainStatus === 'no') {
    return 'Hoy el Gurú no ve nevada clara. Poca señal de precipitación relevante, más tranquilo para pasear.';
  }

  // 6. Nieve probable (yes)
  if (mainStatus === 'yes' && hasWindow) {
    return `El Gurú ve buena señal de nevada. Si estás en Caviahue, prestá atención a la ventana de ${data.bestWindow.from} a ${data.bestWindow.to}: ahí puede estar lo mejor del día.`;
  }

  if (mainStatus === 'yes') {
    return 'El Gurú ve buena señal de nevada. Las condiciones están dadas para los que buscan blanco en la montaña.';
  }

  // 7. Ventana clara (possible con ventana)
  if (mainStatus === 'possible' && hasWindow) {
    return `Hay una ventana interesante para mirar la montaña: entre ${data.bestWindow.from} y ${data.bestWindow.to} se concentra lo mejor del día.`;
  }

  // 8. Posible nieve sin ventana
  if (mainStatus === 'possible') {
    return 'El Gurú ve condiciones posibles para nieve, pero no hay una ventana clara. Vale quedarse atento a cómo evoluciona el día.';
  }

  return data.mainAnswer.description;
}

function buildSystemPrompt(): string {
  return `Sos el Gurú de la Nieve de Caviahue, un asistente de montaña que habla claro y con personalidad.

Tu trabajo es generar un texto turístico corto (máximo 2 frases) basado en el diagnóstico meteorológico que te paso.

El texto tiene que responder mentalmente estas preguntas del turista:
- ¿Vale esperar nieve hoy?
- ¿Conviene subir?
- ¿Es más día de paseo?
- ¿Dónde tiene más sentido mirar: pueblo, centro o cumbre?

Reglas duras:
- No inventes datos.
- No contradigas el diagnóstico técnico.
- No prometas nieve si el estado principal no es "SEÑAL DE NIEVE".
- No uses "garantizado", "imposible", "seguro".
- No uses "radar" si no hay radar real.
- No uses tecnicismos: freezing level, mm, hPa, precipitación acumulada.
- No inventes horarios fuera de la ventana marcada.
- No inventes acumulación de nieve.

Estilo:
- Claro, cercano, de montaña, con personalidad.
- Español de Argentina.
- Sin sonar a app meteorológica genérica.
- Sin exagerar.

Ejemplos de los textos que generás:
- "Hoy el Gurú no ve nieve clara. La montaña está tranquila y la cota viene alta, así que pinta más para paseo que para nevada."
- "El Gurú ve buena señal de nieve. Si estás en Caviahue, prestá atención a la ventana marcada: ahí puede estar lo mejor del día."
- "Abajo puede venir más húmedo que blanco, pero hacia arriba la historia mejora. Centro y cumbre tienen mejor pinta para ver nieve."
- "Hace frío, pero falta humedad que caiga en serio. Buen día de abrigo y paisaje, no tanto de nieve nueva."`;
}

function buildUserPrompt(data: GuruCopyInput): string {
  const zoneLines = [
    `- Pueblo: ${data.zones.village.answer.label} (${data.zones.village.current.temp}°C, ${data.zones.village.current.precipitation}mm precip)`,
    `- Centro: ${data.zones.mid.answer.label} (${data.zones.mid.current.temp}°C, ${data.zones.mid.current.precipitation}mm precip)`,
    `- Cumbre: ${data.zones.top.answer.label} (${data.zones.top.current.temp}°C, ${data.zones.top.current.precipitation}mm precip)`,
  ].join('\n');

  const diagnostics = [
    `Período: ${data.period}`,
    `Estado principal: ${data.mainAnswer.label}`,
    `Score de polvo: ${data.powderScore.value}/100`,
    `Ventana de acumulación: ${data.bestWindow.hasWindow ? `${data.bestWindow.from} a ${data.bestWindow.to}` : 'Sin ventana clara'}`,
    `Alertas: ${data.alerts.length > 0 ? data.alerts.map(a => a.message).join('; ') : 'Sin alertas'}`,
    data.now ? `Ahora en Caviahue: ${data.now.condition}, ${data.now.temp}°C` : null
  ].filter(Boolean).join('\n');

  return `Generá el texto turístico para el dashboard basado en este diagnóstico:

${diagnostics}

Zonas:
${zoneLines}

Respondé solo con el texto turístico, sin explicaciones adicionales.`;
}

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generation_config: {
            maxOutputTokens: 200,
            temperature: 0.7
          }
        }),
        signal: controller.signal
      }
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

export async function generateTouristCopy(data: GuruCopyInput): Promise<GuruCopyOutput> {
  const apiKey = getGeminiKey();

  if (apiKey) {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(data);
    const result = await callGemini(systemPrompt, userPrompt, apiKey);
    if (result) {
      return { touristCopy: result, source: 'ai' };
    }
  }

  return { touristCopy: generateFallbackTouristCopy(data), source: 'fallback' };
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}

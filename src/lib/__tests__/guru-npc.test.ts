import { describe, it, expect } from 'vitest';
import {
  extractJsonGuruResponse,
  generateFallbackNpcMessage,
} from '../ai/guru-copy';
import type { GuruCopyInput } from '../ai/guru-copy';
import type { DailySummary } from '../weather/types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<GuruCopyInput> = {}): GuruCopyInput {
  return {
    period: 'today',
    mainAnswer: {
      status: 'no',
      label: 'Sin nieve',
      description: 'No precipitation expected',
    },
    powderScore: { value: 0, description: 'Dry', snowWindow: null },
    bestWindow: {
      hasWindow: false,
      from: null,
      to: null,
      label: 'Sin ventana',
      description: 'No accumulation window',
    },
    alerts: [],
    nextDays: [],
    zones: {
      village: {
        id: 'village',
        current: {
          temp: 0,
          feelsLike: -3,
          wind: 5,
          precipitation: 0,
          snowChance: 0,
          freezingLevel: 2000,
          humidity: 50,
          snowDepth: 0,
          precipitationProbability: 0,
          weatherCode: 0,
        },
        answer: { label: 'Seco', status: 'no', description: 'Dry' },
      },
      mid: {
        id: 'mid',
        current: {
          temp: -2,
          feelsLike: -6,
          wind: 8,
          precipitation: 0,
          snowChance: 0,
          freezingLevel: 1800,
          humidity: 60,
          snowDepth: 0,
          precipitationProbability: 0,
          weatherCode: 0,
        },
        answer: { label: 'Seco', status: 'no', description: 'Dry' },
      },
      top: {
        id: 'top',
        current: {
          temp: -5,
          feelsLike: -10,
          wind: 15,
          precipitation: 0,
          snowChance: 0,
          freezingLevel: 1500,
          humidity: 70,
          snowDepth: 0,
          precipitationProbability: 0,
          weatherCode: 0,
        },
        answer: { label: 'Seco', status: 'no', description: 'Dry' },
      },
    },
    ...overrides,
  };
}

// ─── extractJsonGuruResponse ───────────────────────────────────────────────

describe('extractJsonGuruResponse', () => {
  it('parses a valid JSON object', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        mood: 'excited',
        certainty: 'alta',
        message: 'Good snow today!',
        tip: 'Go ride!',
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.mood).toBe('excited');
    expect(result!.certainty).toBe('alta');
    expect(result!.message).toBe('Good snow today!');
    expect(result!.tip).toBe('Go ride!');
    expect(result!.source).toBe('ai');
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const result = extractJsonGuruResponse(
      'Here is the response:\n```json\n{"mood":"confident","certainty":"media","message":"Looking good","tip":"Be ready"}\n```',
    );
    expect(result).not.toBeNull();
    expect(result!.mood).toBe('confident');
    expect(result!.certainty).toBe('media');
    expect(result!.message).toBe('Looking good');
    expect(result!.tip).toBe('Be ready');
  });

  it('handles missing tip field (returns null)', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        mood: 'neutral',
        certainty: 'baja',
        message: 'No tip today',
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tip).toBeNull();
  });

  it('coerces invalid mood to neutral', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        mood: 'ecstatic',
        certainty: 'alta',
        message: 'Invalid mood test',
        tip: null,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.mood).toBe('neutral');
  });

  it('coerces invalid certainty to baja', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        mood: 'excited',
        certainty: 'superalta',
        message: 'Invalid certainty test',
        tip: null,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.certainty).toBe('baja');
  });

  it('returns null for missing mood field', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        certainty: 'alta',
        message: 'Missing mood',
      }),
    );
    expect(result).toBeNull();
  });

  it('returns null for missing certainty field', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        mood: 'excited',
        message: 'Missing certainty',
      }),
    );
    expect(result).toBeNull();
  });

  it('returns null for missing message field', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        mood: 'excited',
        certainty: 'alta',
      }),
    );
    expect(result).toBeNull();
  });

  it('returns null for malformed input (no JSON block)', () => {
    const result = extractJsonGuruResponse('This is plain text without JSON');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = extractJsonGuruResponse('');
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON syntax', () => {
    const result = extractJsonGuruResponse('{mood: excited}');
    expect(result).toBeNull();
  });

  it('trims whitespace from message and tip values', () => {
    const result = extractJsonGuruResponse(
      JSON.stringify({
        mood: 'cautious',
        certainty: 'media',
        message: '  Snow is coming   ',
        tip: '  Watch the window  ',
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.message).toBe('Snow is coming');
    expect(result!.tip).toBe('Watch the window');
  });
});

// ─── generateFallbackNpcMessage ───────────────────────────────────────────

describe('generateFallbackNpcMessage', () => {
  it('branch: mixed (lluvia abajo / nieve arriba)', () => {
    // v.temp > 1.5 && m.temp <= 0.5 && v.precipitation > 0.5
    const input = makeInput({
      zones: {
        village: {
          id: 'village',
          current: {
            temp: 3,
            feelsLike: 0,
            wind: 5,
            precipitation: 2,
            snowChance: 10,
            freezingLevel: 2200,
            humidity: 80,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: {
            label: 'Lluvia',
            status: 'possible',
            description: 'Rain possible',
          },
        },
        mid: {
          id: 'mid',
          current: {
            temp: 0,
            feelsLike: -4,
            wind: 10,
            precipitation: 1,
            snowChance: 40,
            freezingLevel: 1800,
            humidity: 75,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: {
            label: 'Nieve',
            status: 'possible',
            description: 'Snow possible',
          },
        },
        top: {
          id: 'top',
          current: {
            temp: -3,
            feelsLike: -8,
            wind: 15,
            precipitation: 0.5,
            snowChance: 60,
            freezingLevel: 1500,
            humidity: 80,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: {
            label: 'Nieve',
            status: 'possible',
            description: 'Snow possible',
          },
        },
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('cautious');
    expect(result.certainty).toBe('media');
    expect(result.source).toBe('fallback');
    expect(result.tip).not.toBeNull();
  });

  it('branch: wind (viento fuerte, mainStatus !== no)', () => {
    const input = makeInput({
      mainAnswer: {
        status: 'possible',
        label: 'Posible',
        description: 'Snow possible',
      },
      alerts: [
        {
          type: 'viento',
          message: 'Vientos fuertes en altura',
          severity: 'alta' as const,
        },
      ],
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('warning');
    expect(result.certainty).toBe('alta');
    expect(result.source).toBe('fallback');
  });

  it('branch: no-snow+cota (sin nieve / cota alta)', () => {
    // mainStatus === 'no' && cotaAlta (freezingLevel > 2500)
    const input = makeInput({
      mainAnswer: { status: 'no', label: 'Sin nieve', description: 'No snow' },
      zones: {
        village: {
          id: 'village',
          current: {
            temp: 5,
            feelsLike: 2,
            wind: 5,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 2800,
            humidity: 40,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
        mid: {
          id: 'mid',
          current: {
            temp: 2,
            feelsLike: -1,
            wind: 8,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 2600,
            humidity: 45,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
        top: {
          id: 'top',
          current: {
            temp: 0,
            feelsLike: -5,
            wind: 12,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 2400,
            humidity: 50,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('neutral');
    expect(result.certainty).toBe('alta');
    expect(result.source).toBe('fallback');
  });

  it('branch: cold-dry (frío seco, sin nieve)', () => {
    // mainStatus === 'no' && v.precipitation <= 0.2 && v.temp <= 2
    const input = makeInput({
      mainAnswer: { status: 'no', label: 'Sin nieve', description: 'No snow' },
      zones: {
        village: {
          id: 'village',
          current: {
            temp: 1,
            feelsLike: -2,
            wind: 5,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 2000,
            humidity: 45,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
        mid: {
          id: 'mid',
          current: {
            temp: -1,
            feelsLike: -5,
            wind: 8,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 1800,
            humidity: 50,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
        top: {
          id: 'top',
          current: {
            temp: -4,
            feelsLike: -9,
            wind: 12,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 1500,
            humidity: 55,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('neutral');
    expect(result.certainty).toBe('alta');
    // Should match cold-dry branch (not no-snow-generic which has baja certainty)
    expect(result.tip).toMatch(/vistas|despejado|Caviahue/);
  });

  it('branch: no-snow-generic (sin nieve genérico)', () => {
    // mainStatus === 'no' but NOT matching cold-dry or cotaAlta
    // Avoid cotaAlta: freezingLevel <= 2500
    // Avoid cold-dry: v.temp > 2 (so it falls through to generic no)
    const input = makeInput({
      mainAnswer: { status: 'no', label: 'Sin nieve', description: 'No snow' },
      zones: {
        village: {
          id: 'village',
          current: {
            temp: 8,
            feelsLike: 5,
            wind: 5,
            precipitation: 0.1,
            snowChance: 0,
            freezingLevel: 2000,
            humidity: 30,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
        mid: {
          id: 'mid',
          current: {
            temp: 5,
            feelsLike: 2,
            wind: 8,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 1800,
            humidity: 35,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
        top: {
          id: 'top',
          current: {
            temp: 3,
            feelsLike: -1,
            wind: 12,
            precipitation: 0,
            snowChance: 0,
            freezingLevel: 1600,
            humidity: 40,
            snowDepth: 0,
            precipitationProbability: 0,
            weatherCode: 0,
          },
          answer: { label: 'Seco', status: 'no', description: 'Dry' },
        },
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('neutral');
    expect(result.certainty).toBe('baja');
    expect(result.source).toBe('fallback');
  });

  it('branch: multi-period — snow soon (1-3 days, higher urgency)', () => {
    // mainStatus === 'no' + nextDays with snow in 1-3 days
    const tomorrow: DailySummary = {
      date: '2026-06-15',
      weekday: 'Mon',
      tempMin: -2,
      tempMax: 4,
      feelsLikeMin: -5,
      feelsLikeMax: 1,
      totalPrecip: 5,
      totalSnow: 3,
      avgWind: 10,
      maxWindGust: 20,
      avgHumidity: 70,
      avgCloudCover: 60,
      minFreezingLevel: 1800,
      snowHours: 6,
      description: 'Nevada',
    };
    const input = makeInput({
      nextDays: [tomorrow],
    });
    const result = generateFallbackNpcMessage(input);
    // Should hit SNOW_SOON: mood cautious, certainty media
    expect(result.mood).toBe('cautious');
    expect(result.certainty).toBe('media');
    expect(result.source).toBe('fallback');
    expect(result.tip).not.toBeNull();
  });

  it('branch: multi-period — snow later (4-7 days, lower urgency)', () => {
    // mainStatus === 'no' + nextDays with snow in 4+ days
    const day4: DailySummary = {
      date: '2026-06-18',
      weekday: 'Thu',
      tempMin: -1,
      tempMax: 5,
      feelsLikeMin: -4,
      feelsLikeMax: 2,
      totalPrecip: 4,
      totalSnow: 2,
      avgWind: 8,
      maxWindGust: 15,
      avgHumidity: 65,
      avgCloudCover: 50,
      minFreezingLevel: 1900,
      snowHours: 4,
      description: 'Nieve ligera',
    };
    const input = makeInput({
      nextDays: [day4],
    });
    const result = generateFallbackNpcMessage(input);
    // Should hit SNOW_LATER: mood neutral, certainty baja
    expect(result.mood).toBe('neutral');
    expect(result.certainty).toBe('baja');
    expect(result.source).toBe('fallback');
  });

  it('branch: multi-period — no snow in nextDays falls through to other branches', () => {
    // nextDays exists but all entries have totalSnow === 0
    const dryDay: DailySummary = {
      date: '2026-06-15',
      weekday: 'Mon',
      tempMin: 5,
      tempMax: 12,
      feelsLikeMin: 3,
      feelsLikeMax: 10,
      totalPrecip: 0,
      totalSnow: 0,
      avgWind: 5,
      maxWindGust: 8,
      avgHumidity: 30,
      avgCloudCover: 10,
      minFreezingLevel: 3000,
      snowHours: 0,
      description: 'Seco',
    };
    const input = makeInput({
      nextDays: [dryDay],
    });
    const result = generateFallbackNpcMessage(input);
    // Should NOT hit multi-period, should fall through to existing no-snow branches
    // cotaAlta: freezingLevel > 2500, village has freezingLevel 2000 (default makeInput)
    // Actually: v.freezingLevel is 2000 → not cotaAlta
    // v.precipitation is 0 → v.precipitation <= 0.2
    // v.temp is 0 → v.temp <= 2
    // So should hit cold-dry branch
    expect(result.source).toBe('fallback');
    expect(result.tip).toMatch(/vistas|despejado|Caviahue/);
  });

  it('branch: multi-period — undefined nextDays falls through to other branches', () => {
    // nextDays not provided
    const input = makeInput({
      nextDays: undefined,
    });
    const result = generateFallbackNpcMessage(input);
    // Should skip multi-period check, hit no-snow branches
    // v.freezingLevel: 2000 → not cotaAlta
    // v.precipitation: 0 → <= 0.2, v.temp: 0 → <= 2
    // So should hit cold-dry branch
    expect(result.source).toBe('fallback');
    expect(result.tip).toMatch(/vistas|despejado|Caviahue/);
  });

  it('branch: yes+window (nieve probable con ventana)', () => {
    const input = makeInput({
      mainAnswer: {
        status: 'yes',
        label: 'Nieve',
        description: 'Snow expected',
      },
      bestWindow: {
        hasWindow: true,
        from: '10:00',
        to: '14:00',
        label: 'Ventana',
        description: 'Best window 10-14',
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('confident');
    expect(result.certainty).toBe('alta');
    expect(result.source).toBe('fallback');
    expect(result.tip).not.toBeNull();
  });

  it('branch: yes (nieve probable sin ventana)', () => {
    const input = makeInput({
      mainAnswer: {
        status: 'yes',
        label: 'Nieve',
        description: 'Snow expected',
      },
      bestWindow: {
        hasWindow: false,
        from: null,
        to: null,
        label: 'Sin ventana',
        description: 'No clear window',
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('confident');
    expect(result.certainty).toBe('media');
    expect(result.source).toBe('fallback');
  });

  it('branch: possible+window (posible con ventana)', () => {
    const input = makeInput({
      mainAnswer: {
        status: 'possible',
        label: 'Posible',
        description: 'Snow possible',
      },
      bestWindow: {
        hasWindow: true,
        from: '12:00',
        to: '16:00',
        label: 'Ventana',
        description: 'Possible window 12-16',
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('cautious');
    expect(result.certainty).toBe('media');
    expect(result.source).toBe('fallback');
  });

  it('branch: possible (posible sin ventana)', () => {
    const input = makeInput({
      mainAnswer: {
        status: 'possible',
        label: 'Posible',
        description: 'Snow possible',
      },
      bestWindow: {
        hasWindow: false,
        from: null,
        to: null,
        label: 'Sin ventana',
        description: 'No clear window',
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('cautious');
    expect(result.certainty).toBe('baja');
    expect(result.source).toBe('fallback');
  });

  it('branch: wind does not apply when mainStatus is no', () => {
    // hasWindAlert with mainStatus 'no' should NOT trigger wind branch
    const input = makeInput({
      mainAnswer: { status: 'no', label: 'Sin nieve', description: 'No snow' },
      alerts: [
        { type: 'viento', message: 'Viento fuerte', severity: 'alta' as const },
      ],
    });
    const result = generateFallbackNpcMessage(input);
    // Should fall through to no-snow branches, not wind
    expect(result.mood).not.toBe('warning');
  });

  it('returns default for unknown status', () => {
    const input = makeInput({
      mainAnswer: {
        status: 'unknown' as any,
        label: '?',
        description: 'Unknown',
      },
    });
    const result = generateFallbackNpcMessage(input);
    expect(result.mood).toBe('neutral');
    expect(result.certainty).toBe('baja');
    expect(result.tip).toBeNull();
  });
});

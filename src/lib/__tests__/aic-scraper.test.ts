import { describe, it, expect } from 'vitest';
import {
  parseAicTable,
  parseNumericValue,
  parseUpdateDate,
} from '../weather/sources/aic-scraper';

// ─── parseNumericValue ──────────────────────────────────────────────────────

describe('parseNumericValue', () => {
  it('parses positive integer with unit', () => {
    expect(parseNumericValue('135.3 grados')).toBeCloseTo(135.3);
  });

  it('parses "0 mm"', () => {
    expect(parseNumericValue('0 mm')).toBe(0);
  });

  it('parses negative temperature', () => {
    expect(parseNumericValue('-2.06 C')).toBeCloseTo(-2.06);
  });

  it('parses decimal humidity', () => {
    expect(parseNumericValue('78.5 %')).toBeCloseTo(78.5);
  });

  it('returns null for empty string', () => {
    expect(parseNumericValue('')).toBeNull();
  });

  it('returns null for non-numeric text', () => {
    expect(parseNumericValue('N/A')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseNumericValue('   ')).toBeNull();
  });
});

// ─── parseUpdateDate ────────────────────────────────────────────────────────

describe('parseUpdateDate', () => {
  it('parses "(última actualización: 14/06/2026)"', () => {
    expect(parseUpdateDate('(última actualización: 14/06/2026)')).toBe(
      '2026-06-14',
    );
  });

  it('parses with leading text', () => {
    expect(
      parseUpdateDate('color:green;(última actualización: 01/01/2025)'),
    ).toBe('2025-01-01');
  });

  it('returns null for garbage text', () => {
    expect(parseUpdateDate('something else')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseUpdateDate('')).toBeNull();
  });
});

// ─── parseAicTable ──────────────────────────────────────────────────────────

describe('parseAicTable', () => {
  const validHtml = `<!DOCTYPE html>
<html>
<body>
  <div id="body_TabMediciones">
    <table>
      <tbody id="body_TabMediciones_TabMed0_grilla">
        <tr>
          <td>Dirección Media Viento</td>
          <td>135.3 grados</td>
        </tr>
        <tr>
          <td>Equivalente Agua Nieve</td>
          <td>12.5 mm</td>
        </tr>
        <tr>
          <td>Humedad Relativa Media Diaria</td>
          <td>78.5 %</td>
        </tr>
        <tr>
          <td>Precipitación Diaria</td>
          <td>5.0 mm</td>
        </tr>
        <tr>
          <td>Presión Atmosférica Media Diaria</td>
          <td>1013.2 hPa</td>
        </tr>
        <tr>
          <td>Temperatura Mínima Diaria</td>
          <td>-2.06 C</td>
        </tr>
        <tr>
          <td>Temperatura Máxima Diaria</td>
          <td>4.5 C</td>
        </tr>
        <tr>
          <td>Velocidad Media Diaria Viento</td>
          <td>10.2 km/h</td>
        </tr>
        <tr>
          <td>Velocidad Máxima Diaria Viento</td>
          <td>18.7 km/h</td>
        </tr>
        <tr style="color:green;">
          <td>(última actualización: 14/06/2026)</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

  it('parses a complete valid table', () => {
    const result = parseAicTable(validHtml);
    expect(result).not.toBeNull();
    expect(result!.stationName).toBe('CAVIAHUE');
    expect(result!.windDir).toBeCloseTo(135.3);
    expect(result!.snowWaterEq).toBeCloseTo(12.5);
    expect(result!.humidity).toBeCloseTo(78.5);
    expect(result!.precipitation).toBeCloseTo(5.0);
    expect(result!.pressure).toBeCloseTo(1013.2);
    expect(result!.tempMin).toBeCloseTo(-2.06);
    expect(result!.tempMax).toBeCloseTo(4.5);
    expect(result!.windSpeed).toBeCloseTo(10.2);
    expect(result!.windMax).toBeCloseTo(18.7);
    expect(result!.date).toBe('2026-06-14');
    expect(result!.updatedAt).toBe('2026-06-14');
  });

  it('returns null when table body is missing', () => {
    const result = parseAicTable(
      '<html><body><p>No table here</p></body></html>',
    );
    expect(result).toBeNull();
  });

  it('returns null for empty HTML', () => {
    const result = parseAicTable('');
    expect(result).toBeNull();
  });

  it('parses table with only update date (zero data fields)', () => {
    const html = `<tbody id="body_TabMediciones_TabMed0_grilla">
        <tr style="color:green;"><td>(última actualización: 14/06/2026)</td><td></td></tr>
      </tbody>`;
    expect(parseAicTable(html)).toBeNull();
  });

  it('parses partial data (only some fields present)', () => {
    const html = `<tbody id="body_TabMediciones_TabMed0_grilla">
        <tr><td>Temperatura Mínima Diaria</td><td>-1.5 C</td></tr>
        <tr><td>Temperatura Máxima Diaria</td><td>3.2 C</td></tr>
        <tr style="color:green;"><td>(última actualización: 13/06/2026)</td><td></td></tr>
      </tbody>`;
    const result = parseAicTable(html);
    expect(result).not.toBeNull();
    expect(result!.tempMin).toBeCloseTo(-1.5);
    expect(result!.tempMax).toBeCloseTo(3.2);
    // Other fields should be null
    expect(result!.humidity).toBeNull();
    expect(result!.precipitation).toBeNull();
    expect(result!.windSpeed).toBeNull();
    expect(result!.date).toBe('2026-06-13');
  });

  it('handles missing update date gracefully (uses yesterday)', () => {
    const html = `<tbody id="body_TabMediciones_TabMed0_grilla">
        <tr><td>Temperatura Mínima Diaria</td><td>0.5 C</td></tr>
        <tr><td>Temperatura Máxima Diaria</td><td>3.2 C</td></tr>
      </tbody>`;
    const result = parseAicTable(html);
    expect(result).not.toBeNull();
    expect(result!.tempMin).toBeCloseTo(0.5);
    expect(result!.tempMax).toBeCloseTo(3.2);
    // date should be yesterday (current date - 1)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expected = yesterday.toISOString().split('T')[0];
    expect(result!.date).toBe(expected);
  });
});

// ─── fetchAicStationData (integration check only) ──────────────────────────

describe('fetchAicStationData', () => {
  // Skip by default — this is an integration test that hits the real AIC server.
  // Run with: npx vitest run --reporter=verbose src/lib/__tests__/aic-scraper.test.ts
  // Or: npm test -- --reporter=verbose (will run all tests)
  it.skip('fetches and parses real AIC station data', async () => {
    const { fetchAicStationData } =
      await import('../weather/sources/aic-scraper');
    const result = await fetchAicStationData();
    expect(result).not.toBeNull();
    expect(result!.stationName).toBe('CAVIAHUE');
    // Should have at least some fields populated
    const fields: (keyof typeof result)[] = [
      'tempMin',
      'tempMax',
      'humidity',
      'windSpeed',
    ];
    const populated = fields.filter((f) => result![f] !== null);
    expect(populated.length).toBeGreaterThan(0);
    // Date should be yesterday or today
    expect(result!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

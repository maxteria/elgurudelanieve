import type { AicStationData } from '../types';

/**
 * Base URL for AIC station detail pages.
 * The `z` parameter is a deterministic hash of the station ID (a=65 = Caviahue).
 * Verified stable across independent requests.
 */
const AIC_DETAIL_URL =
  'https://www.aic.gob.ar/sitio/estaciones-detalle?a=65&z=1124793485';

const FETCH_TIMEOUT = 10_000;

/**
 * Spanish-to-field label mapping for the AIC Mediciones table.
 * Keys are the exact <td> label text from the ASP.NET WebForms table.
 */
const LABEL_MAP: Record<string, keyof AicStationData> = {
  'Dirección Media Viento': 'windDir',
  'Equivalente Agua Nieve': 'snowWaterEq',
  'Humedad Relativa Media Diaria': 'humidity',
  'Precipitación Diaria': 'precipitation',
  'Presión Atmosférica Media Diaria': 'pressure',
  'Temperatura Mínima Diaria': 'tempMin',
  'Temperatura Máxima Diaria': 'tempMax',
  'Velocidad Media Diaria Viento': 'windSpeed',
  'Velocidad Máxima Diaria Viento': 'windMax',
};

/**
 * Parse a numeric value string like "135.3 grados" or "0 mm" or "-2.06 C".
 * Extracts the leading number (may be negative, may be float).
 */
export function parseNumericValue(raw: string): number | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(-?[\d.]+)/);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse the last-updated date from the AIC table footer row.
 * Format: "(última actualización: dd/mm/yyyy)"
 */
export function parseUpdateDate(raw: string): string | null {
  const match = raw.match(/\(última actualización:\s*(\d{2}\/\d{2}\/\d{4})\)/);
  if (!match) return null;

  const [day, month, year] = match[1].split('/');
  // Return ISO date format (yyyy-mm-dd) as this represents yesterday's data
  return `${year}-${month}-${day}`;
}

/**
 * Parse the AIC Mediciones HTML table into AicStationData fields.
 *
 * Table structure (ASP.NET WebForms):
 *   <tbody id="body_TabMediciones_TabMed0_grilla">
 *     <tr><td>Dirección Media Viento</td><td>135.3 grados</td></tr>
 *     ...
 *     <tr style="color:green;"><td>(última actualización: 14/06/2026)</td><td></td></tr>
 *   </tbody>
 */
export function parseAicTable(html: string): AicStationData | null {
  // Extract the table body
  const tableMatch = html.match(
    /<tbody\s+id="body_TabMediciones_TabMed0_grilla"[^>]*>([\s\S]*?)<\/tbody>/i,
  );
  if (!tableMatch) return null;

  const tbody = tableMatch[1];

  // Extract all row groups (tr blocks)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[] = [];
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    rows.push(rowMatch[1]);
  }

  if (rows.length < 2) return null;

  const fields: Partial<AicStationData> = {
    stationName: 'CAVIAHUE',
  };
  let stationDate: string | null = null;

  for (const row of rows) {
    // Extract both <td> cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1].trim());
    }

    // Skip rows without exactly 2 cells or empty rows
    if (cells.length < 1) continue;

    const label = cells[0]?.trim();

    // Check for update date row
    if (label && label.includes('última actualización')) {
      stationDate = parseUpdateDate(label);
      continue;
    }

    // Map label to field
    if (label && LABEL_MAP[label]) {
      const fieldName = LABEL_MAP[label];
      const valueStr = cells[1]?.trim() ?? '';
      const numericValue = parseNumericValue(valueStr);
      (fields as Record<string, unknown>)[fieldName] = numericValue;
    }
  }

  // Use today's date minus 1 day as fallback if update date parsing fails
  if (!stationDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    stationDate = yesterday.toISOString().split('T')[0];
  }

  fields.date = stationDate;
  fields.updatedAt = stationDate;

  // Return null if we got zero meaningful fields
  const fieldCount = Object.keys(fields).filter(
    (k) =>
      k !== 'stationName' &&
      k !== 'date' &&
      k !== 'updatedAt' &&
      fields[k as keyof typeof fields] !== null,
  ).length;
  if (fieldCount === 0) return null;

  return {
    stationName: fields.stationName ?? 'CAVIAHUE',
    date: fields.date ?? '',
    humidity: fields.humidity ?? null,
    precipitation: fields.precipitation ?? null,
    pressure: fields.pressure ?? null,
    tempMin: fields.tempMin ?? null,
    tempMax: fields.tempMax ?? null,
    windDir: fields.windDir ?? null,
    windSpeed: fields.windSpeed ?? null,
    windMax: fields.windMax ?? null,
    snowWaterEq: fields.snowWaterEq ?? null,
    updatedAt: fields.updatedAt ?? '',
  };
}

/**
 * Fetch and parse yesterday's AIC station data for Caviahue.
 * Returns null on any failure (network error, timeout, parse error).
 *
 * Graceful degradation: build never fails on missing AIC data.
 */
export async function fetchAicStationData(): Promise<AicStationData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(AIC_DETAIL_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ElGuruDeLaNieve/1.0; +https://elgurudelanieve.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[AIC] HTTP ${res.status} — returning null`);
      return null;
    }

    const html = await res.text();
    const result = parseAicTable(html);

    if (!result) {
      console.warn(
        '[AIC] Parse returned null (table structure may have changed)',
      );
      return null;
    }

    console.info(
      `[AIC] Caviahue station data: ${result.tempMin}°C / ${result.tempMax}°C, ${result.humidity}% RH, SWE=${result.snowWaterEq}mm`,
    );
    return result;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[AIC] Timeout (10s) — returning null');
    } else {
      console.warn('[AIC] Fetch failed — returning null');
    }
    return null;
  }
}

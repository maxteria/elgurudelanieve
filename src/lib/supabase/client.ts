import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env?.SUPABASE_URL ??
  process.env.SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env?.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export type AicReading = {
  id?: number;
  created_at?: string;
  reading_date: string;
  station_name: string;
  humidity: number | null;
  precipitation: number | null;
  pressure: number | null;
  temp_min: number | null;
  temp_max: number | null;
  wind_dir: number | null;
  wind_speed: number | null;
  wind_max: number | null;
  snow_water_eq: number | null;
};

export type GuruMessageRecord = {
  id?: number;
  created_at?: string;
  period: string;
  period_key: string;
  mood: string | null;
  certainty: string | null;
  message: string | null;
  source: string | null;
};

/**
 * Store an AIC reading in Supabase.
 * Uses INSERT ON CONFLICT (reading_date) DO NOTHING so each day is stored once.
 */
export async function storeAicReading(
  reading: AicReading,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from('aic_readings')
    .upsert(reading, { onConflict: 'reading_date', ignoreDuplicates: false });

  if (error) {
    console.warn('[Supabase] storeAicReading error:', error.message);
    return false;
  }
  return true;
}

/**
 * Read the last N AIC readings ordered by date descending.
 */
export async function getRecentAicReadings(
  days: number = 7,
): Promise<AicReading[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('aic_readings')
    .select('*')
    .order('reading_date', { ascending: false })
    .limit(days);

  if (error) {
    console.warn('[Supabase] getRecentAicReadings error:', error.message);
    return [];
  }
  return (data ?? []) as AicReading[];
}

/**
 * Fetch Guru messages within a date range by period_key.
 */
export async function getGuruMessagesInRange(
  from: string,
  to: string,
): Promise<GuruMessageRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('guru_messages')
    .select('*')
    .gte('period_key', from)
    .lte('period_key', to)
    .order('period_key', { ascending: false });

  if (error) {
    console.warn('[Supabase] getGuruMessagesInRange error:', error.message);
    return [];
  }
  return (data ?? []) as GuruMessageRecord[];
}

/**
 * Store a Guru message record in Supabase.
 */
export async function storeGuruMessage(
  record: GuruMessageRecord,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.from('guru_messages').insert(record);
  if (error) {
    console.warn('[Supabase] storeGuruMessage error:', error.message);
    return false;
  }
  return true;
}

export default getSupabase;

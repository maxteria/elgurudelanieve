-- Migration: Document and harden guru_messages column contract
--
-- Column contract:
--   period     = cache date (DATE)
--   period_key = logical period key (TEXT): now, today, tomorrow, sevenDays
--
-- This migration is additive and safe. No data is deleted or transformed.

-- ── Ensure period_key is TEXT ─────────────────────────────────────────────────
-- The column already exists and is TEXT in production. This ALTER is a no-op
-- when the type already matches, but guarantees the contract going forward.
ALTER TABLE guru_messages
  ALTER COLUMN period_key TYPE TEXT
  USING period_key::TEXT;

-- ── Composite index ───────────────────────────────────────────────────────────
-- Speeds up the cache lookup pattern:
--   SELECT * FROM guru_messages WHERE period = '2026-06-23' AND period_key = 'today'
-- Also covers getGuruMessagesInRange which filters by period date range.
CREATE INDEX IF NOT EXISTS idx_guru_messages_period_key
  ON guru_messages (period, period_key);

-- ── Column comments ───────────────────────────────────────────────────────────
COMMENT ON COLUMN guru_messages.period IS 'Cache date (DATE), format YYYY-MM-DD.';
COMMENT ON COLUMN guru_messages.period_key IS 'Logical period key (TEXT): now, today, tomorrow, sevenDays.';
COMMENT ON COLUMN guru_messages.mood IS 'Narrative mood: excited, confident, cautious, warning, neutral.';
COMMENT ON COLUMN guru_messages.certainty IS 'Forecast certainty: alta, media, baja.';
COMMENT ON COLUMN guru_messages.source IS 'Origin: ai, fallback, cache.';

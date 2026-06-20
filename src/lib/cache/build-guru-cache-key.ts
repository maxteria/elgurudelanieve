/**
 * Build a deterministic cache key for Guru messages / prediction outputs.
 * Pattern (stable):
 *   guru:{fingerprintHash}:zone:{zoneId}:w:{windowId||all}:v{engineVersion}:g{governanceHash}:r{resortHash}
 *
 * Accepts either a fingerprint object with a `hash` property or a string.
 */
export function buildGuruCacheKey(
  fingerprint: { hash: string } | string | null | undefined,
  zoneId?: string | null,
  windowId?: string | null,
  engineVersion?: string | number | null,
  resortHash?: string | null,
  governanceHash?: string | null,
): string {
  const fpHash = typeof fingerprint === 'string' ? fingerprint : fingerprint?.hash ?? 'nofp';
  const zone = zoneId ?? 'all';
  const win = windowId ?? 'all';
  // Normalize engine version so the final key contains a single leading 'v'
  // Accept numbers or strings, strip any existing leading 'v' and default to '0'
  const rawVer = engineVersion != null ? String(engineVersion) : '0';
  const ver = rawVer.replace(/^v/i, '') || '0';
  const g = governanceHash ?? 'g0';
  const r = resortHash ?? 'r0';

  return `guru:${fpHash}:zone:${zone}:w:${win}:v${ver}:g${g}:r${r}`;
}

export default buildGuruCacheKey;

/**
 * Site origin used for canonical URLs, Open Graph, Twitter Card, and schema.
 *
 * The Vercel fallback is provisional until a custom domain is configured.
 * Set PUBLIC_SITE_URL in the environment to override it.
 */
export const SITE_URL =
  (import.meta.env.PUBLIC_SITE_URL as string | undefined) ||
  'https://elgurudelanieve.vercel.app';

/**
 * Site origin used for canonical URLs, Open Graph, Twitter Card, and schema.
 *
 * Set PUBLIC_SITE_URL in the environment to override it (e.g. for previews).
 */
export const SITE_URL =
  (import.meta.env.PUBLIC_SITE_URL as string | undefined) ||
  'https://www.elgurudelanieve.ar';

# Design: SEO / GEO / AEO Visibility Improvements

## Technical Approach

Implement two reusable Astro components — `HeadMeta.astro` and `SchemaOrg.astro` — and apply them to every public page. Align all URLs to a single no-trailing-slash convention. Add a `/fuentes` page for E-E-A-T and an AEO question/answer block on the homepage. Optimize `/pronostico` for the high-volume ES-AR queries "clima Caviahue" and "pronóstico Caviahue" while preserving the Guru's snow differentiation.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canonical convention | No trailing slash | Matches existing `MobileNav.astro` links and Astro static output; avoids duplicate-content risk. |
| Metadata component | `HeadMeta.astro` | Centralizes title, description, canonical, robots, Open Graph, and Twitter Card; reduces duplication across pages. |
| Schema component | `SchemaOrg.astro` | Injects one JSON-LD block with `Organization`, `WebSite`, and `Place`; easy to maintain and validate. |
| Trust page | `/fuentes` | Separates methodology/sources from the LAB's tool dashboard; linkable from institutional articles. |
| Place schema | Include Caviahue | Coordinates already exist in `CAVIAHUE_COORDS`; no invented data. |
| FAQ schema | Static questions only | Daily forecast answers would violate freshness expectations; FAQ schema limited to `/fuentes` and stable home questions. |
| `/pronostico` keywords | "clima Caviahue" + "pronóstico Caviahue" | Highest-volume, most relevant ES-AR demand per AnswerThePublic. |
| External authority | Ready, not official | `/pronostico` and `/fuentes` written so `caviahue-copahue.gob.ar` can link editorially without implying official status. |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/HeadMeta.astro` | Create | Reusable head metadata component. |
| `src/components/SchemaOrg.astro` | Create | Reusable JSON-LD schema component. |
| `src/pages/index.astro` | Modify | Use components; add AEO question/answer block. |
| `src/pages/pronostico.astro` | Modify | Use components; optimize title/description for clima/pronóstico; add "Estado del cerro Caviahue" section. |
| `src/pages/lab.astro` | Modify | Use components. |
| `src/pages/historico.astro` | Modify | Use components. |
| `src/pages/fuentes.astro` | Create | Sources, methodology, limits, Caviahue/Copahue context. |
| `src/components/MobileNav.astro` | Modify | Add `/fuentes` link. |
| `public/sitemap.xml` | Modify | No trailing slashes; add `/fuentes`. |
| `public/llms.txt` | Modify | Update URLs to no trailing slash; add `/fuentes`. |

## Interfaces / Contracts

### `HeadMeta.astro`

```astro
---
export interface Props {
  title: string;
  description: string;
  canonicalPath: string; // e.g., "/pronostico"
  ogType?: string;       // default "website"
  ogImage?: string;      // default "/og-image-v2.png"
}
---
```

Renders all standard meta tags. The canonical URL is built as `https://elgurudelanieve.vercel.app${canonicalPath}`.

### `SchemaOrg.astro`

No props. Imports `CAVIAHUE_COORDS` from `src/lib/weather/open-meteo-api.ts` and emits:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "name": "El Gurú de la Nieve", ... },
    { "@type": "WebSite", "name": "El Gurú de la Nieve", ... },
    { "@type": "Place", "name": "Caviahue, Neuquén, Argentina", ... }
  ]
}
```

`sameAs` in `Organization` is an empty array until real social profiles exist.

## Data Flow

No data flow changes. Components receive static props and render into `<head>`. `/fuentes` is a static page with no external data fetching.

## Content Outline

### `/pronostico`

- Title: `Clima y pronóstico de nieve en Caviahue | El Gurú de la Nieve`
- Description: includes "clima Caviahue", "pronóstico Caviahue", and the 3-cota interpretation.
- Add a visible "Estado del cerro Caviahue" section after the forecast table.

### `/fuentes`

- What is El Gurú de la Nieve.
- Data sources: Open-Meteo, WeatherAPI.com, AIC.
- How the Guru interprets models for Caviahue.
- Relationship to external tools: Windguru, Snow Forecast, Windy.
- Update frequency.
- Caviahue and Copahue context.
- Disclaimer: not an official replacement.

### Homepage AEO block

Eight `<h2>` questions with 40–60 word answers. Only the two static questions (sources and reliability) are candidates for FAQ schema.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Static build | All pages build without errors | `npm run build` |
| Meta tags | Title, description, canonical, OG, Twitter Card | Inspect generated HTML |
| Schema | Valid JSON-LD with Organization, WebSite, Place | Schema validator + manual inspection |
| URLs | No trailing-slash inconsistencies | Compare `sitemap.xml`, canonical tags, and navigation |
| Copy | No official-status claims | Manual review of `/pronostico` and `/fuentes` |

## Migration / Rollout

No migration required. This is a content and metadata change on a static site.

## Open Questions

- Does the project have real social profiles to populate `Organization.sameAs`?
- Should `/pronostico` include a specific anchor id (e.g., `#estado-del-cerro`) for institutional deep-linking?

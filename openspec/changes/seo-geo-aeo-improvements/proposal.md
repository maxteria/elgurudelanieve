# Proposal: SEO / GEO / AEO Visibility Improvements

## Intent

The audit of **El Gurú de la Nieve** found low discoverability scores:

- SEO: 5/10
- GEO: 4/10
- AEO: 3/10

The site already has a clean Astro static architecture and a recently created `llms.txt`, but it lacks consistent metadata, structured data, canonical strategy, and entity/trust signals that search engines and LLMs need to understand and cite the site.

This change resolves the audit findings without altering weather logic or the visual design.

## Keyword Intelligence / AnswerThePublic ES-AR

The AnswerThePublic dataset for "caviahue" in Spanish-Argentina shows that the most valuable search demand for El Gurú de la Nieve does not enter through generic "nieve Caviahue" queries. The strongest, most useful clusters are weather and forecast intent:

- `clima caviahue` (3.6K)
- `caviahue clima` (3.6K)
- `caviahue pronostico`
- `pronostico para caviahue`
- `caviahue tiempo`
- `caviahue hoy` (210)
- `caviahue nieve` (210)

Strategic decision: `/pronostico` should be optimized primarily for **"clima Caviahue"** and **"pronóstico Caviahue"**, and from there deliver the Guru's differentiated interpretation: snow status, snow forecast, altitude breakdown, wind, freezing level, and whether it is worth going up the mountain.

### Keyword clusters

1. **Clima / pronóstico / tiempo**
   - `clima caviahue`
   - `caviahue clima`
   - `caviahue pronostico`
   - `pronostico para caviahue`
   - `caviahue tiempo`
   - `clima caviahue 30 días`
   - `pronóstico extendido caviahue`
   - Target page: `/pronostico`

2. **Nieve / hoy / estado actual**
   - `caviahue nieve`
   - `caviahue hoy`
   - `caviahue tiene nieve`
   - `caviahue sin nieve`
   - `cuando nevo en caviahue`
   - `caviahue cuando nieva`
   - Impact: AEO questions on home and `/pronostico`.

3. **Ski / cerro / resort**
   - `caviahue ski`
   - `caviahue ski resort`
   - `caviahue pistas`
   - `caviahue centro de ski`
   - `caviahue estado de pistas`
   - `caviahue mapa de pistas`
   - `caviahue tarifas ski`
   - Impact: Add a "Estado del cerro Caviahue" section inside `/pronostico`; leave `/cerro-caviahue` as a future expansion.

4. **Caviahue + Copahue**
   - `caviahue copahue`
   - `caviahue y copahue`
   - `caviahue volcan`
   - `volcan copahue caviahue`
   - `caviahue y copahue es lo mismo`
   - `caviahue y copahue donde queda`
   - `significado caviahue y copahue`
   - Impact: Reinforce local territorial entity. Leave `/caviahue-y-copahue` as a future expansion.

5. **Herramientas climáticas / validación externa**
   - `windguru caviahue neuquen`
   - `caviahue windguru`
   - `windy caviahue`
   - `snow forecast caviahue 6 dias`
   - `snow forecast caviahue`
   - `caviahue webcam`
   - `webcams caviahue`
   - Impact: `/fuentes` must explain that the Guru interprets these signals for Caviahue rather than replacing them.

6. **Turismo invierno**
   - `caviahue en invierno`
   - `caviahue invierno`
   - `caviahue en julio`
   - `caviahue que hacer en invierno`
   - `que hacer en caviahue`
   - Impact: Context only; the site must not become a generic tourism guide.

### Discarded keywords

Cosmetics/skincare terms pollute the brand signal and are out of scope:

- `caviahue cremas`, `caviahue serum`, `caviahue protector solar`, `caviahue agua micelar`, `caviahue niacinamida`, `caviahue mineral face`, `caviahue vitamina c`, `caviahue dermocosmetica`

### Brand positioning

Use consistently: **"El Gurú de la Nieve — Caviahue"**. Avoid using "Caviahue" alone as the brand because it competes with tourism, cosmetics, lodging, and other entities.

## Scope

### In scope
- Consistent metadata (title, description, canonical, robots, Open Graph, Twitter Card) on all public pages.
- A single canonical URL convention (with or without trailing slash) used in sitemap, navigation, and canonical tags.
- JSON-LD structured data: Organization, WebSite, and evaluated Place for Caviahue.
- A page or section explaining who is behind the site, data sources, methodology, and limitations.
- AEO question/answer blocks on the homepage.
- Optional FAQ schema only for stable questions.

### Out of scope
- Changes to weather data pipelines or forecasting logic.
- Visual redesign.
- New social profiles or external link building.
- Multi-resort support.
- Generic tourism content for Caviahue.
- New landing pages such as `/cerro-caviahue` or `/caviahue-y-copahue` (future expansions only).

## Capabilities

- `seo-metadata`: Add/update head metadata across pages.
- `canonical-convention`: Define and apply a single trailing-slash convention.
- `structured-data`: Add JSON-LD schema markup.
- `geo-entity`: Strengthen entity and E-E-A-T signals.
- `aeo-content`: Add question/answer content for answer engines.

## Affected Areas

- `src/pages/index.astro`
- `src/pages/pronostico.astro`
- `src/pages/lab.astro`
- `src/pages/historico.astro`
- `src/components/MobileNav.astro`
- `public/sitemap.xml`
- `public/llms.txt`
- New component(s) for head metadata and JSON-LD.
- New page `/fuentes`.
- Future expansion pages (not implemented now): `/cerro-caviahue`, `/caviahue-y-copahue`.

## Risks

- Trailing-slash changes can create duplicate-content confusion if not applied consistently.
- Schema markup must not invent coordinates, authors, or social profiles.
- AEO answers should not become stale or generic; dynamic answers should reflect current model output.

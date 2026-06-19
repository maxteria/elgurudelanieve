# SPEC: SEO / GEO / AEO Visibility Improvements

## 1. Problem

The SEO/GEO/AEO audit of **El Gurú de la Nieve** produced the following scores:

| Dimension | Score | Status |
|-----------|-------|--------|
| SEO       | 5/10  | Incomplete metadata on inner pages; no schema markup. |
| GEO       | 4/10  | Weak E-E-A-T signals; brand entity not declared to crawlers/LLMs. |
| AEO       | 3/10  | No question/answer format for featured snippets or LLM citations. |

The homepage has reasonable metadata and Open Graph tags, but `/pronostico`, `/lab`, and `/historico` lack canonical URLs, descriptions, and social tags. The sitemap uses trailing slashes while navigation uses URLs without trailing slashes, creating duplicate-content risk. There is no structured data that explains the brand, the site, or the location.

## 2. Keyword Intelligence / AnswerThePublic ES-AR

Analysis of the AnswerThePublic dataset for "caviahue" (Spanish-Argentina) shows that the strongest, most useful demand enters through **weather and forecast queries**, not generic snow queries.

### Primary demand signals

| Keyword | Volume (ES-AR) | Intent |
|---------|----------------|--------|
| `clima caviahue` | 3.6K | Weather |
| `caviahue clima` | 3.6K | Weather |
| `caviahue hoy` | 210 | Current conditions |
| `caviahue nieve` | 210 | Snow status |

### Strategic implication

`/pronostico` **MUST** be optimized primarily for **"clima Caviahue"** and **"pronóstico Caviahue"**. The page title, description, Open Graph, and first heading **MUST** include these terms while preserving the Guru's differentiated snow interpretation.

### Keyword clusters

1. **Clima / pronóstico / tiempo** — target `/pronostico`.
   - `clima caviahue`
   - `caviahue clima`
   - `caviahue pronostico`
   - `pronostico para caviahue`
   - `caviahue tiempo`
   - `clima caviahue 30 días`
   - `pronóstico extendido caviahue`

2. **Nieve / hoy / estado actual** — target AEO blocks on `/` and `/pronostico`.
   - `caviahue nieve`
   - `caviahue hoy`
   - `caviahue tiene nieve`
   - `caviahue sin nieve`
   - `cuando nevo en caviahue`
   - `caviahue cuando nieva`

3. **Ski / cerro / resort** — add a "Estado del cerro Caviahue" section inside `/pronostico`; `/cerro-caviahue` remains a future expansion.
   - `caviahue ski`
   - `caviahue ski resort`
   - `caviahue pistas`
   - `caviahue centro de ski`
   - `caviahue estado de pistas`
   - `caviahue mapa de pistas`
   - `caviahue tarifas ski`

4. **Caviahue + Copahue** — reinforce local entity in `/fuentes`; `/caviahue-y-copahue` remains a future expansion.
   - `caviahue copahue`
   - `caviahue y copahue`
   - `caviahue volcan`
   - `volcan copahue caviahue`
   - `caviahue y copahue es lo mismo`
   - `caviahue y copahue donde queda`
   - `significado caviahue y copahue`

5. **Herramientas climáticas / validación externa** — address in `/fuentes` (Windguru, Snow Forecast, Open-Meteo, AIC).
   - `windguru caviahue neuquen`
   - `caviahue windguru`
   - `windy caviahue`
   - `snow forecast caviahue 6 dias`
   - `snow forecast caviahue`
   - `caviahue webcam`
   - `webcams caviahue`

6. **Turismo invierno** — context only; do not build generic tourism content.
   - `caviahue en invierno`
   - `caviahue invierno`
   - `caviahue en julio`
   - `caviahue que hacer en invierno`
   - `que hacer en caviahue`

### Discarded keywords

Cosmetics/skincare terms are out of scope because they belong to another entity and pollute the brand signal:

- `caviahue cremas`, `caviahue serum`, `caviahue protector solar`, `caviahue agua micelar`, `caviahue niacinamida`, `caviahue mineral face`, `caviahue vitamina c`, `caviahue dermocosmetica`.

### Brand positioning

The site **MUST** use the full brand phrase **"El Gurú de la Nieve — Caviahue"** consistently. It **MUST NOT** present "Caviahue" alone as the brand.

## 3. Objectives

- Provide complete, consistent metadata on every public page.
- Establish one canonical URL convention and align the sitemap, navigation, and canonical tags.
- Add machine-readable structured data for the brand, the website, and the location.
- Strengthen GEO/LLM signals by explaining who is behind the site, which sources are used, and what the limits are.
- Add concise, question-oriented content that answer engines can extract.
- Optimize `/pronostico` for "clima Caviahue" and "pronóstico Caviahue" while keeping the Guru's snow differentiation.
- Keep the implementation simple, reusable, and maintainable.

## 4. Non-objectives

- Changing weather data pipelines, forecasting logic, or UI design.
- Creating social media profiles or building external backlinks.
- Implementing multi-resort support or new data sources.
- Generating large, page-specific schema graphs beyond Organization, WebSite, and Place.
- Adding FAQ schema to answers that change daily (e.g., today's snow forecast).
- Building generic tourism content for Caviahue.
- Creating `/cerro-caviahue` or `/caviahue-y-copahue` landing pages in this phase.

## 5. Scope

### In scope
- Reusable head-metadata and JSON-LD components.
- Updates to `index.astro`, `pronostico.astro`, `lab.astro`, and `historico.astro`.
- Creation of a `/fuentes` page explaining sources, methodology, and trust signals.
- A "Estado del cerro Caviahue" section inside `/pronostico`.
- Updates to `MobileNav.astro`, `public/sitemap.xml`, and `public/llms.txt`.

### Out of scope
- Any new weather models or integrations.
- Visual redesign, dark/light mode, or layout changes.
- Blog, landing pages for individual ski elevations, or multi-language content.
- New pages for `/cerro-caviahue` or `/caviahue-y-copahue` (future expansion only).

## 6. Affected pages

| Page        | Why it changes |
|-------------|----------------|
| `/`         | Reuse head component, add AEO questions, add schema. |
| `/pronostico` | Add missing metadata, canonical, OG, schema; optimize for "clima Caviahue" and "pronóstico Caviahue"; add "Estado del cerro Caviahue" section. |
| `/lab`      | Add missing metadata, canonical, OG, schema. |
| `/historico` | Add missing metadata, canonical, OG, schema. |
| `/fuentes`  | New page for E-E-A-T, sources, methodology, and Caviahue/Copahue context. |
| `/cerro-caviahue` | Future expansion; not implemented in this phase. |
| `/caviahue-y-copahue` | Future expansion; not implemented in this phase. |

## 7. Functional requirements

### Requirement: Reusable metadata component

The system **MUST** provide a `HeadMeta.astro` component that renders the following tags based on props:

- `<title>`
- `<meta name="description">`
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical">`
- Open Graph tags: `og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:image`, `og:image:type`, `og:image:width`, `og:image:height`, `og:locale`
- Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Favicon, apple-touch-icon, theme-color, and webmanifest links.

#### Scenario: Default usage

- GIVEN a page passes `title`, `description`, and `canonicalPath`.
- WHEN the page is rendered.
- THEN all required head tags are present and the canonical uses `https://elgurudelanieve.vercel.app` as the origin.

### Requirement: Reusable JSON-LD component

The system **MUST** provide a `SchemaOrg.astro` component that injects a single `<script type="application/ld+json">` block containing:

- `Organization` schema for "El Gurú de la Nieve".
- `WebSite` schema for the domain.
- `Place` schema for Caviahue using coordinates from `CAVIAHUE_COORDS`.

#### Scenario: Build output

- GIVEN the component is used on a page.
- WHEN `astro build` runs.
- THEN the generated HTML contains valid JSON-LD with the three schema types.

### Requirement: Canonical URL convention

The system **MUST** use URLs **without trailing slashes** everywhere: navigation links, canonical tags, and sitemap entries.

#### Scenario: Consistency check

- GIVEN the canonical convention is documented as "no trailing slash".
- WHEN inspecting `MobileNav.astro`, canonical tags, and `sitemap.xml`.
- THEN all page URLs match the convention.

## 8. SEO requirements

### Requirement: Complete metadata on every public page

Every public page **MUST** have a unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph tags, Twitter Card tags, and a robots meta tag.

### Requirement: `/pronostico` keyword targeting

`/pronostico` **MUST** include the phrases **"clima Caviahue"** and **"pronóstico Caviahue"** in its `<title>`, `<meta name="description">`, Open Graph title/description, and first visible heading, without losing its snow-differentiation message.

### Requirement: Sitemap accuracy

The `public/sitemap.xml` file **MUST** list only existing pages and **MUST** use the canonical URL convention.

### Requirement: No duplicate URLs

The system **MUST NOT** create duplicate discoverable URLs for the same content through mixed trailing-slash conventions.

## 9. GEO / LLM discoverability requirements

### Requirement: Entity declaration

The system **MUST** declare the brand entity "El Gurú de la Nieve" through JSON-LD `Organization` schema and consistent naming across pages.

### Requirement: Trust and authority content

The system **MUST** publish a `/fuentes` page that explains:

- What the site is and who operates it.
- Which data sources are used (Open-Meteo, WeatherAPI.com, AIC).
- How often data is updated.
- A clear disclaimer that the site interprets models and does not replace official weather services.
- The relationship between Caviahue and Copahue (location context, not tourism guide).

### Requirement: Visible source attribution

The data sources **MUST** be visible to users, not only in `llms.txt`. `/fuentes` **MUST** mention Windguru, Snow Forecast, Open-Meteo, WeatherAPI, and AIC and explain that the Guru interprets them locally rather than replacing them.

### Requirement: Accurate place data

The `Place` schema **MUST** use the coordinates already defined in `src/lib/weather/open-meteo-api.ts` and **MUST NOT** invent location data.

### External Authority / Institutional Mention

The system **SHOULD** prepare `/pronostico` and `/fuentes` to be referenced by an editorial article on `caviahue-copahue.gob.ar` about climate, snow, mountain status, or winter travel preparation.

- `/fuentes` **MUST** explain sources, methodology, limits, and disclaimer in a professional tone.
- `/pronostico` **MUST** be linkable with anchor text such as "clima y pronóstico de nieve en Caviahue".
- All copy **MUST** avoid stating or implying that El Gurú de la Nieve is an official tool, unless that status is formally confirmed.
- The external mention **MUST** be positioned as a complementary local resource, not as a purchased authority signal.
- The goal of the mention is to reinforce territorial entity and public utility, not to manipulate rankings.

## 10. AEO requirements

### Requirement: Question-oriented headings on the homepage

The homepage **MUST** include a "Preguntas frecuentes" section with the following headings as `<h2>`:

- ¿Va a nevar en Caviahue hoy?
- ¿Hay nieve en Caviahue hoy?
- ¿Cuándo puede nevar en Caviahue?
- ¿En qué altura puede nevar?
- ¿Hay nieve en el pueblo o solo en el cerro?
- ¿Conviene subir al cerro Caviahue hoy?
- ¿Qué fuentes usa El Gurú de la Nieve?
- ¿Qué tan confiable es el pronóstico?

### Requirement: Direct answers

Each question **MUST** be followed by a direct answer of 40 to 60 words in plain Spanish.

### Requirement: Stable FAQ schema only

The system **MAY** add FAQ JSON-LD schema **ONLY** for questions whose answers do not change daily. Daily forecast answers **MUST NOT** be marked as FAQ schema.

## 11. Required structured data

| Schema type | Purpose | Source of data |
|-------------|---------|----------------|
| `Organization` | Brand entity | Site name and logo path |
| `WebSite` | Site entity | Site name and URL |
| `Place` | Location entity | `CAVIAHUE_COORDS` in `open-meteo-api.ts` |
| `FAQPage` (optional) | Static Q&A | `/fuentes` or homepage stable questions |

The system **MUST NOT** invent authors, social profiles, addresses, or official identifiers.

## 12. Pending technical decisions

The following decisions are now **taken** and must be implemented as specified:

| Decision | Choice | Justification |
|----------|--------|---------------|
| Canonical URL convention | No trailing slash | Aligns with existing navigation and Astro static output. |
| Metadata reuse | Create `HeadMeta.astro` | Avoids duplication and makes future changes consistent. |
| Schema reuse | Create `SchemaOrg.astro` | Keeps JSON-LD centralized and easy to maintain. |
| Trust/source page | Create `/fuentes` | The LAB already contains tools; `/fuentes` separates methodology from tools. |
| Place schema | Include Caviahue | Coordinates already exist in the codebase. |
| FAQ schema | Only for stable questions | Daily forecast answers would violate schema freshness expectations. |
| `/pronostico` primary keywords | "clima Caviahue" + "pronóstico Caviahue" | Highest-volume, most relevant demand in AnswerThePublic ES-AR. |
| `/cerro-caviahue` and `/caviahue-y-copahue` | Future expansion | Avoid scope creep; address demand inside existing pages first. |
| Brand phrase | "El Gurú de la Nieve — Caviahue" | "Caviahue" alone competes with cosmetics, tourism, and lodging entities. |

## 13. Acceptance criteria

### SEO

- [ ] `index.astro`, `pronostico.astro`, `lab.astro`, and `historico.astro` each have a unique title, description, canonical, OG, Twitter Card, and robots tag.
- [ ] `/pronostico` title and description include "clima Caviahue" and "pronóstico Caviahue".
- [ ] `sitemap.xml` contains only `/`, `/pronostico`, `/lab`, `/historico`, `/fuentes`, and `/llms.txt` without trailing slashes.
- [ ] No mixed trailing-slash URLs remain in navigation or canonicals.

### GEO

- [ ] `Organization`, `WebSite`, and `Place` JSON-LD appear on every public page.
- [ ] `/fuentes` explains the project, sources, update frequency, and disclaimer.
- [ ] `/fuentes` explains how the Guru relates to Windguru, Snow Forecast, Open-Meteo, WeatherAPI, and AIC.
- [ ] `/fuentes` provides Caviahue/Copahue context without becoming a tourism guide.
- [ ] `/fuentes` and `/pronostico` are ready for an editorial link from `caviahue-copahue.gob.ar` without claiming official status.
- [ ] No invented authors, addresses, or social profiles are present.

### AEO

- [ ] The homepage contains the eight question headings listed above.
- [ ] Each question has a direct answer of 40–60 words.
- [ ] FAQ schema, if added, is limited to stable questions.
- [ ] `/pronostico` includes a visible "Estado del cerro Caviahue" section.

### General

- [ ] `npm run build` completes without errors.
- [ ] Generated HTML contains valid JSON-LD and expected meta tags.

## 14. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Trailing-slash change causes temporary duplicate-content signals in search engines. | Medium | Apply the convention everywhere at once and keep redirects in mind for future hosting changes. |
| Schema markup is invalid or contains invented data. | High | Use only existing constants (`CAVIAHUE_COORDS`) and validate with a schema tester after deploy. |
| AEO answers become stale or too generic. | Medium | Tie dynamic answers to existing forecast data; keep static answers factual. |
| New `/fuentes` page is not linked from navigation. | Low | Add it to `MobileNav.astro`, sitemap, and `llms.txt`. |
| Keyword targeting dilutes the Guru brand into a generic weather site. | Medium | Keep the Guru's voice and snow-differentiation visible in every heading and answer. |

## 15. Validation plan

1. Run `npm run build` and confirm all five pages generate without errors.
2. Inspect generated HTML for each page and verify:
   - Title, description, canonical, OG, and Twitter Card tags.
   - JSON-LD `Organization`, `WebSite`, and `Place` blocks.
3. Validate JSON-LD syntax with an external schema validator.
4. Check `sitemap.xml` against the no-trailing-slash convention.
5. Verify `MobileNav.astro` links match the canonical convention.
6. Confirm `/fuentes` contains all required trust/sourcing content.
7. Confirm homepage FAQ section contains the eight specified questions with direct answers.
8. Confirm `/pronostico` includes "clima Caviahue" and "pronóstico Caviahue" in title, description, and first heading.

# Tasks: SEO / GEO / AEO Visibility Improvements

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Components + metadata refactor. PR 2: `/fuentes`, AEO, schema, sitemap/llms. |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Create reusable `HeadMeta.astro` and `SchemaOrg.astro`; update all page heads. | PR 1 | Base branch: `main`. |
| 2 | Create `/fuentes`, AEO block, `/pronostico` optimization, anchors, sitemap/llms. | PR 2 | Depends on PR 1 components. |

## Phase 1: Foundation

### 1.1 Create `HeadMeta.astro`

- **Objective**: Provide a reusable component for all head metadata.
- **Files**: `src/components/HeadMeta.astro`
- **Steps**:
  1. Define props: `title`, `description`, `canonicalPath`, optional `ogType`, optional `ogImage`.
  2. Render charset, viewport, title, description, robots, canonical, favicons, OG, Twitter Card, fonts.
  3. Build canonical as `https://elgurudelanieve.vercel.app${canonicalPath}`.
- **Acceptance**: Component renders all required tags when imported into a page.
- **Validation**: Inspect generated HTML of any page that uses it.

### 1.2 Create `SchemaOrg.astro`

- **Objective**: Inject JSON-LD structured data on every page.
- **Files**: `src/components/SchemaOrg.astro`
- **Steps**:
  1. Import `CAVIAHUE_COORDS` from `src/lib/weather/open-meteo-api.ts`.
  2. Emit `Organization`, `WebSite`, and `Place` schema in a single `<script type="application/ld+json">`.
  3. Omit `sameAs` (no real social profiles to reference).
- **Acceptance**: Valid JSON-LD appears in generated HTML for every page.
- **Validation**: `npm run build` + schema validator.

## Phase 2: Core Implementation

### 2.1 Update page metadata

- **Objective**: Apply `HeadMeta.astro` and `SchemaOrg.astro` to all public pages.
- **Files**: `src/pages/index.astro`, `src/pages/pronostico.astro`, `src/pages/lab.astro`, `src/pages/historico.astro`
- **Steps**:
  1. Import components.
  2. Replace existing `<head>` blocks with `<HeadMeta ... />` and `<SchemaOrg />`.
  3. Provide unique title/description/canonical for each page.
- **Acceptance**: Each page has unique title, description, canonical, OG, Twitter Card, robots, and JSON-LD.
- **Validation**: Build and inspect HTML for each route.

### 2.2 Optimize `/pronostico` for ES-AR keywords

- **Objective**: Target "clima Caviahue" and "pronóstico Caviahue".
- **Files**: `src/pages/pronostico.astro`
- **Steps**:
  1. Set title to include "Clima y pronóstico de nieve en Caviahue".
  2. Update description and first `<h1>` to mention "clima Caviahue" and "pronóstico Caviahue".
  3. Preserve the Guru's snow-differentiation message.
- **Acceptance**: Title, description, and first heading contain both target phrases naturally.
- **Validation**: String search in generated HTML.

### 2.3 Add "Estado del cerro Caviahue" section

- **Objective**: Create a linkable section for institutional references.
- **Files**: `src/pages/pronostico.astro`
- **Steps**:
  1. Add a section near the bottom of the page with `id="estado-del-cerro"`.
  2. Summarize current mountain/ski conditions based on available forecast data.
  3. Keep it visually consistent with the rest of the page.
- **Acceptance**: `/pronostico#estado-del-cerro` scrolls to a visible section.
- **Validation**: Build and open `/pronostico#estado-del-cerro`.

### 2.4 Add AEO question/answer block on homepage

- **Objective**: Provide direct answers to real ES-AR search questions.
- **Files**: `src/pages/index.astro`
- **Steps**:
  1. Add a "Preguntas frecuentes" section with eight `<h2>` questions.
  2. Write 40–60 word answers for each.
  3. Use existing forecast data for dynamic answers where possible.
- **Acceptance**: All eight questions are present with concise answers.
- **Validation**: Manual word-count and HTML inspection.

### 2.5 Create `/fuentes`

- **Objective**: Build the trust, sources, and methodology page.
- **Files**: `src/pages/fuentes.astro`
- **Steps**:
  1. Use `HeadMeta.astro` and `SchemaOrg.astro`.
  2. Add sections: what is the Guru, data sources, update frequency, Caviahue/Copahue context, relationship to external tools, disclaimer.
  3. Add anchors: `#fuentes-y-criterios` and `#disclaimer`.
- **Acceptance**: `/fuentes#fuentes-y-criterios` and `/fuentes#disclaimer` are reachable and contain the expected content.
- **Validation**: Build and open both anchors.

### 2.6 Add FAQPage schema for stable questions

- **Objective**: Markup static Q&A only.
- **Files**: `src/pages/fuentes.astro` or `src/pages/index.astro`
- **Steps**:
  1. Identify stable questions (sources, reliability, methodology).
  2. Add a second JSON-LD block with `FAQPage` schema for those questions only.
  3. Do not mark daily forecast answers as FAQ.
- **Acceptance**: `FAQPage` schema is present only for stable questions.
- **Validation**: Schema validator.

## Phase 3: Integration / Navigation

### 3.1 Update internal navigation

- **Objective**: Link to `/fuentes` from the main nav.
- **Files**: `src/components/MobileNav.astro`
- **Steps**:
  1. Add `fuentes` to the active-section type.
  2. Add a nav item labeled "Fuentes" linking to `/fuentes`.
- **Acceptance**: "Fuentes" appears in desktop and mobile nav.
- **Validation**: Snapshot of rendered nav.

### 3.2 Update `sitemap.xml`

- **Objective**: Reflect the no-trailing-slash convention and new page.
- **Files**: `public/sitemap.xml`
- **Steps**:
  1. List `/`, `/pronostico`, `/lab`, `/historico`, `/fuentes`, `/llms.txt` without trailing slashes.
  2. Remove any non-existent or future pages.
- **Acceptance**: Sitemap matches canonical URLs and navigation.
- **Validation**: XML parse + string compare with canonical tags.

### 3.3 Update `llms.txt`

- **Objective**: Keep the LLM discovery manifest accurate.
- **Files**: `public/llms.txt`
- **Steps**:
  1. Update page URLs to no trailing slash.
  2. Add `/fuentes`.
  3. Reinforce the "El Gurú de la Nieve — Caviahue" positioning.
- **Acceptance**: `llms.txt` lists all current pages and sources.
- **Validation**: Read file and compare against sitemap.

## Phase 4: Validation

### 4.1 Build and inspect

- **Objective**: Confirm all changes generate correctly.
- **Files**: `dist/*`
- **Steps**:
  1. Run `npm run build`.
  2. Inspect each page's HTML for title, description, canonical, OG, Twitter Card, JSON-LD.
- **Acceptance**: Build succeeds and expected tags are present on every page.
- **Validation**: `npm run build` + HTML inspection.

### 4.2 Validate anchors and internal links

- **Objective**: Ensure anchors and navigation work.
- **Files**: `dist/*`
- **Steps**:
  1. Open `/pronostico#estado-del-cerro`.
  2. Open `/fuentes#fuentes-y-criterios` and `/fuentes#disclaimer`.
  3. Verify `/fuentes` link in nav.
- **Acceptance**: All anchors scroll to the correct sections; all nav links reachable.
- **Validation**: Manual navigation or DOM inspection.

### 4.3 Validate schema

- **Objective**: Ensure JSON-LD is syntactically valid.
- **Files**: `dist/*`
- **Steps**:
  1. Extract JSON-LD from generated HTML.
  2. Validate with an external schema validator.
- **Acceptance**: No schema errors; Organization, WebSite, Place present; optional FAQPage valid.
- **Validation**: Schema validator tool.

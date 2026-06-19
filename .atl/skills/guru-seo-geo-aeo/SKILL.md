---
name: guru-seo-geo-aeo
description: "Trigger: SEO, GEO, AEO, LLM-ready, sitemap, robots.txt, llms.txt, structured data, search visibility for El Gurú de la Nieve. Audit and implement SEO/GEO/AEO improvements."
license: Apache-2.0
metadata:
  author: "gentle-ai"
  version: "1.0"
---

# Guru SEO/GEO/AEO Skill

## Activation Contract
Use this skill when the user asks about SEO, GEO, AEO, LLM-ready discoverability, sitemap, robots.txt, llms.txt, schema markup, canonical tags, meta descriptions, Open Graph, or search visibility for **El Gurú de la Nieve**.

## Hard Rules
- The site is **Astro v6 static**. Pages live in `src/pages/`. Public files live in `public/`.
- Real pages are: `/`, `/pronostico/`, `/lab/`, `/historico/`. Do not invent URLs for pages that do not exist.
- The brand entity is **El Gurú de la Nieve**, located in **Caviahue, Neuquén, Argentina**. Optimize for queries like "¿va a nevar en Caviahue?", "clima Caviahue", "nieve en Caviahue".
- Do not generate DOCX/PDF reports. Return findings as markdown inline or as project docs.
- Only add schema markup that matches real content. Prefer JSON-LD in Astro `<head>`.
- Keep sitemap aligned with existing pages only. Remove URLs that return 404.

## Decision Gates
| Need | Action |
|------|--------|
| Audit current state | Read `public/sitemap.xml`, `robots.txt`, `public/llms.txt`, all `src/pages/*.astro`, and key components. Check title, meta description, canonical, heading hierarchy, internal links, Open Graph, and schema. |
| Improve crawl/indexation | Update `sitemap.xml` and `robots.txt`; add self-referencing canonical tags; ensure `llms.txt` exists and is discoverable. |
| Improve GEO / LLM visibility | Strengthen E-E-A-T (who runs the site, why it is authoritative), entity clarity (Caviahue, Guru, ski resort), factual density, source citations, and the `llms.txt` manifest. |
| Improve AEO / snippets | Add concise direct answers (40-60 words) under question-phrased headings; add FAQ or HowTo JSON-LD only if the page truly answers step-by-step questions. |

## Execution Steps
1. Classify the request using the Decision Gates.
2. Read the relevant project files before proposing or applying changes.
3. Produce a short priority list: Critical / High / Medium / Quick Win, tied to actual observed signals.
4. Implement changes only when explicitly asked; otherwise present findings first.
5. After changes, verify with the project's build command and inspect generated HTML if possible.

## Output Contract
Return:
- Scope of the audit or task.
- Files/pages reviewed.
- Top 3 priorities.
- Specific findings with file and line evidence.
- Any files changed.

## References
- `src/pages/index.astro` — homepage, canonical example, Guru copy.
- `src/pages/pronostico.astro` — 3-cota forecast page.
- `src/pages/lab.astro` — tools and data dashboard.
- `src/pages/historico.astro` — historical archive.
- `public/sitemap.xml` — crawlable URL list.
- `robots.txt` — crawler directives.
- `public/llms.txt` — LLM discovery manifest.

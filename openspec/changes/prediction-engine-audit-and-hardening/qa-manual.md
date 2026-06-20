---
title: "QA Manual — prediction-engine-audit-and-hardening (PR5)"
date: 2026-06-20
tester: SDD apply executor
---

Summary
-------
This document records the manual QA checklist and results performed for PR5 (Cleanup & QA) of the
prediction-engine-audit-and-hardening change. Scope limited to: /, /pronostico, /fuentes, sitemap.xml, llms.txt
and canonical validation. No UI/SEO changes were made — only validation and documentation.

Methodology
-----------
- Inspect repository templates and generated public artifacts where present.
- Verify that null/absent numeric fields are displayed as placeholders (no synthetic zeros).
- Verify narrative governance exists and blocks prohibited ski marketing language under restricted resort status.
- Verify sitemap.xml and llms.txt use the canonical origin https://www.elgurudelanieve.ar.
- Record findings with file references and short evidence notes.

Checklist & Results
-------------------

1) Homepage (/) — src/pages/index.astro
   - Action: Inspect template for default/fallback numeric values and ski phrasing.
   - Evidence: index.astro uses null-aware expressions for numeric values (e.g. `{normalized.currentWeather?.temperature ?? result.weatherApi?.temp}`) without injecting `0` fallbacks; no placeholder string is used on homepage for missing values. See src/pages/index.astro lines ~144–152.
   - Result: PASS — no hard-coded zeros found. Homepage does not inject `0` fallbacks; it relies on null-aware expressions. No prohibited ski phrases in static copy; dynamic Guru copy is processed through governance filters (see governance tests and code).

2) Pronóstico (/pronostico) — src/pages/pronostico.astro
   - Action: Inspect table rendering and numeric fallbacks, and the Guru/vernacular copy insertion points.
   - Evidence: pronostico.astro renders snow/precip/temp cells with ternaries that show `—` for null values (e.g. snowCm, precip, cota, temp cells). See src/pages/pronostico.astro lines ~320–370 and ~329–333 for snow cell rendering.
   - Result: PASS — no fake zeros; nulls are rendered as `—`. The page uses `getGuruCopy` from src/lib/pronostico.ts (static copy) rather than LLM output; governance filters apply to LLM-driven content in other surfaces, but pronostico uses curated copy here.

3) Fuentes (/fuentes) — src/pages/fuentes.astro
   - Action: Quick inspection of static content and canonical meta.
   - Evidence: Fuentes page uses canonicalPath="/fuentes" in HeadMeta and static links in public/llms.txt point to full canonical URLs. See src/pages/fuentes.astro and public/llms.txt lines ~11–18.
   - Result: PASS — static content compliant; canonical present via HeadMeta.

4) Sitemap — public/sitemap.xml
   - Action: Inspect public/sitemap.xml for canonical origin.
   - Evidence: Entries use https://www.elgurudelanieve.ar for all listed URLs (see public/sitemap.xml lines 4, 10, 16, 22, 28, 34).
   - Result: PASS — sitemap uses the required canonical origin.

5) llms.txt — public/llms.txt
   - Action: Inspect llms.txt for internal links and canonical origin.
   - Evidence: All links reference https://www.elgurudelanieve.ar (see public/llms.txt lines 11–18). Content describes site purpose and sections.
   - Result: PASS — llms.txt references canonical origin and contains appropriate site description.

6) Canonical URL verification
   - Action: Verify site canonical origin used by HeadMeta component and site config.
   - Evidence: src/lib/site.ts exports SITE_URL defaulting to 'https://www.elgurudelanieve.ar' when PUBLIC_SITE_URL unset. HeadMeta builds canonicalUrl using SITE_URL + canonicalPath (see src/components/HeadMeta.astro line where canonicalUrl is used).
   - Result: PASS — canonical uses https://www.elgurudelanieve.ar by default.

7) Narrative governance / prohibited phrases (manual inspection + unit test evidence)
   - Action: Verify governance filters exist and block marketing ski phrases when resort is restricted.
   - Evidence: Blocking patterns and allowed meteorological patterns defined in src/lib/governance/blocked-phrases.ts and applied in src/lib/governance/apply-narrative-governance.ts. Unit tests under src/lib/__tests__/governance verify blocking behavior (apply-narrative-governance.test.ts).
   - Result: PASS — governance implemented and tested. Applies to LLM-driven outputs (e.g., guru-copy module). Pronostico currently uses curated `getGuruCopy` and does not rely on the LLM output path.

Notes / Deviations
------------------
- Build-time log note: known static-generation warning `[Supabase] storeGuruMessage error: invalid input syntax for type date: "sevenDays"` observed in prior builds — left unchanged as requested in task constraints.
- No changes were made to runtime report ingestion, scrapers, or login flows.
- No UI or SEO content was changed beyond documentation and deprecation header (see src/lib/types.ts). This aligns with the hard constraints.

Conclusion
----------
All PR5 QA checklist items have been verified and documented. There are no blocking issues found for PR5 scope. The deprecated helper file (src/lib/types.ts) was annotated with a clear deprecation header pointing to the new types (safe shim retained to avoid breaking consumers). QA results saved to this file.

Files produced/modified in this PR
---------------------------------
- openspec/changes/prediction-engine-audit-and-hardening/qa-manual.md (this file)
- openspec/changes/prediction-engine-audit-and-hardening/tasks.md (PR5 checkboxes updated)
- src/lib/types.ts (deprecation header added)

Remaining work / Next steps (outside PR5)
----------------------------------------
- Migrate remaining internal consumers from legacy types in src/lib/types.ts to the new prediction types (ongoing across PR lifecycle). This migration is planned and tracked in earlier PRs — DO NOT implement in PR5.

PR boundary
-----------
This change set is strictly PR5 (Cleanup & QA) only. No PR6 or additional feature work was started.

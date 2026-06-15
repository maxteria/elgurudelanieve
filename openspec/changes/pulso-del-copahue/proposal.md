# Proposal: El Pulso del Copahue

## Intent

Integrar monitoreo del Volcán Copahue en el dashboard existente, mostrando alerta oficial y traducción IA no alarmista. Complementa la info de nieve — no compite.

## Scope

### In Scope
- Scraper de estado OAVV/SEGEMAR (sitio oficial)
- Card "El Pulso del Copahue" en homepage
- Traducción educativa vía IA (nunca decide el estado)
- Aviso de ceniza VAAC/SMN
- Cámaras de monitoreo disponibles
- Disclaimer legal + fuente + fecha

### Out of Scope
- App separada o subdominio nuevo
- Predicción volcánica propia
- Mapa interactivo de riesgo
- Alertas push a usuarios

## Capabilities

### New Capabilities
- `volcano-monitoring`: Scraping OAVV, alert level display, AI translation, VAAC ash advisory, camera grid

### Modified Capabilities
None — entirely new domain.

## Approach

1. **Backend**: Servicio Astro server-side (`src/lib/volcano/`) con scraper OAVV + cache en Supabase (TTL configurable, ~30 min)
2. **Frontend**: Componente Astro `<PulsoCard>` en homepage + página `/volcan` dedicada
3. **IA**: Nuevo prompt `volcano-translator.ts` en `src/lib/ai/` — traduce boletín oficial, no decide alerta
4. **Datasources**: OAVV scrape → JSON, VAAC via SMN, cámaras como static config

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/volcano/` | New | Scraper, types, VAAC client, AI translator, cameras |
| `src/lib/ai/volcano-translator.ts` | New | Prompt para traducción educativa del reporte |
| `src/components/volcano/PulsoCard.astro` | New | Card principal del módulo |
| `src/components/volcano/CameraGrid.astro` | New | Grid de cámaras disponibles |
| `src/pages/index.astro` | Modified | Integrar PulsoCard debajo del Gurú |
| `src/pages/volcan.astro` | New | Página dedicada con detalle |
| `src/styles/tailwind.css` | Modified | Alert level color tokens (verde/amarillo/naranja/rojo) |
| `.env.example` | Modified | Agregar OAVV urls + VAAC config |
| `supabase/` | Modified | Tabla `volcano_reports` para cache |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OAVV cambia estructura HTML | Medium | Scraper con selectors documentados + fallback manual |
| IA alucina estado | Low | Prompt estricto: solo traduce, no decide. Post-validación contra nivel oficial |
| Contenido alarmante | Low | Revisión editorial + disclaimer visible. La IA nunca usa "peligro", "evacuar" sin fuente |

## Rollback Plan

- Revert cambios en `src/pages/index.astro` (eliminar import PulsoCard)
- Eliminar `src/lib/volcano/` y `src/components/volcano/`
- Revertir `.env.example` y `supabase/` cambios
- Sin efecto en datos de nieve existentes

## Dependencies

- OAVV/SEGEMAR: https://oavv.segemar.gob.ar/monitoreo-volcanico/copahue/
- SMN/VAAC: servicios meteorológicos existentes
- OpenRouter: mismo provider usado por guru-copy.ts

## Success Criteria

- [ ] PulsoCard muestra nivel de alerta actual sin errores
- [ ] Scraper OAVV resuelve en build-time (<5s)
- [ ] Traducción IA incluye disclaimer "Fuente oficial: OAVV"
- [ ] Fallback manual activo si OAVV no responde
- [ ] `npm run build` pasa con 0 errores type
- [ ] E2E visual: card no rompe layout mobile

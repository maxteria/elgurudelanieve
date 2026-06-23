# Session State — 2026-06-23

Estado actual del proyecto **El Gurú de la Nieve** antes de la auditoría integral `guru-codebase-quality-audit`.

---

## 1. Estado actual de producción

| Aspecto | Estado |
|---|---|
| **Dominio canónico** | `https://www.elgurudelanieve.ar` |
| **Redirect sin www** | ✅ 308 permanente a `www.elgurudelanieve.ar` |
| **`.com.ar`** | ❌ No responde (sin DNS/SSL). No bloqueante. |
| **Hosting** | Vercel, conectado a `origin/main` |
| **Último deploy** | Hotfix posterior a PR5 |
| **`/pronostico` visual** | ✅ Sin cartel rojo falso por datos incompletos. `Confianza Incompleta` usa estado neutro. Sin `— null`. Narrativa coherente con confianza/señales. |

---

## 2. Estado Supabase

### Migraciones aplicadas

- `20260622_forecast_snapshots.sql`

### Tablas activas

| Tabla | Propósito |
|---|---|
| `forecast_runs` | Corrida de snapshot (build hash, timestamp) |
| `forecast_hours` | Datos horarios por zona |
| `forecast_period_summaries` | Datos agregados por zona/periodo/fecha |

### Estado general

- Snapshots funcionando (3 runs del mismo build `d7773e4`)
- Histórico reconstruible desde `forecast_runs`
- Warnings de tablas inexistentes desaparecidos

### Warning pendiente (separado, no bloqueante)

```
storeGuruMessage error: invalid input syntax for type date: "sevenDays"
```

- Ocurre en `storeGuruMessage` cuando recibe `"sevenDays"` como fecha.
- No se corrige en esta sesión (ver sección 6).

---

## 3. Estado forecast-history-snapshots (cambio archivado)

| PR | Contenido | Estado |
|---|---|---|
| PR1 | Schema / tipos | ✅ Completo |
| PR2 | Escritura de snapshot | ✅ Completo |
| PR3 | Lectura histórico + AYER | ✅ Completo |
| PR4 | UI "Pronóstico guardado" | ✅ Completo |
| PR5 | Verify / archive | ✅ Completo |
| Hotfix `ca80d54` | Corrección post-PR5 | ✅ Completo |

---

## 4. Nota importante para la auditoría

### Múltiples `forecast_runs` del mismo build

Hay **3 `forecast_runs`** todos con el mismo `build_hash = d7773e4`.
Cada run tiene estructura completa (63 filas en `forecast_period_summaries`), pero esto debe auditarse como posible deuda:

- ¿Side effects durante build que disparan múltiples snapshots?
- ¿Duplicados de snapshots que no aportan valor?
- ¿Costo/crecimiento innecesario en Supabase?
- ¿Falta definición de "corrida oficial" por build?

---

## 5. Decisiones de producto ya tomadas

| Decisión | Detalle |
|---|---|
| **No reemplaza parte oficial** | El Gurú no intenta ser fuente oficial de partes de nieve |
| **Tipos de nieve** | Distinguir nieve meteorológica, acumulada y esquiable |
| **No recomendar sin verificar** | No sugerir ski/snowboard si temporada/estado operativo no corresponde |
| **Falta de datos ≠ baja confianza** | Datos incompletos no deben mostrar alarma |
| **Timezone Caviahue** | Pronóstico debe usar hora local de Caviahue, no timezone del servidor |
| **Histórico = pronóstico guardado** | El histórico almacena el pronóstico en el momento, no observación real |

---

## 6. No tocar ahora

| Item | Razón |
|---|---|
| `storeGuruMessage sevenDays` | No bloqueante, requiere spec |
| Refactor timezone | Scope separado, no urgente |
| SEO / GEO | Post-auditoría |
| Schema Supabase | Post-auditoría |
| Producción | Solo si se indica explícitamente |
| Código de producto | No durante auditoría |
| Migraciones | No durante auditoría |
| Datos en Supabase | No durante auditoría |

---

## 7. Contexto de sesión

- Auditar a fondo la salud técnica del proyecto.
- No implementar cambios, solo inspeccionar, medir, documentar y proponer.
- Producir `docs/guru-codebase-quality-audit.md` con hallazgos, riesgos, plan de acción y guardrails.

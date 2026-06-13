# El Gurú de la Nieve — Caviahue

Dashboard de condiciones de nieve para Caviahue, Patagonia Argentina.

## Modos de datos

### Modo real (default)

```bash
npm run build
```

- Consulta [Open-Meteo API](https://open-meteo.com/) durante el build
- Sin necesidad de API key
- Genera HTML estático con los últimos datos disponibles

### Modo demo

```bash
npm run build:demo
```

- Usa `weather.mock.json` como fuente
- Muestra datos simulados con nieve activa para testing visual
- Badge "Demo" visible en la interfaz

### Desarrollo local

```bash
npm run dev
# http://localhost:4321       → datos reales (Open-Meteo)
# http://localhost:4321/?demo=1 → datos demo (mock default)
```

## Estrategia de actualización (producción)

El sitio es **Astro estático** (SSG). Los datos se consultan en build-time. Para mantener los datos actualizados se requiere rebuild programado.

### Opción 1: GitHub Actions (recomendada)

```yaml
# .github/workflows/rebuild.yml
on:
  schedule:
    - cron: '0 * * * *' # cada 1 hora
  workflow_dispatch: # manual

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm run build:demo # build opcional para preview demo
```

### Opción 2: Deploy Hook externo

- **Cloudflare Pages**: configurar Deploy Hook → llamar vía cron cada hora
- **Vercel**: configurar Deploy Hook en dashboard → cron cada hora
- **Netlify**: Build hook → curl desde cron-job.org cada hora

### Opción 3: Servidor propio

```bash
# crontab (cada hora)
0 * * * * cd /ruta/al/proyecto && git pull && npm ci && npm run build && cp -r dist/* /var/www/html/
```

El build completo toma ~2 segundos, el costo de rebuild cada hora es despreciable.

## Scripts disponibles

| Comando              | Descripción                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Dev server con recarga en caliente           |
| `npm run build`      | Build producción (modo real, Open-Meteo)     |
| `npm run build:demo` | Build con datos mock (nieve activa simulada) |
| `npm run preview`    | Previsualizar build local                    |

## Modos de prueba

### Real

Usa Open-Meteo para forecast y WeatherAPI para estado actual.

```
URL: /
```

### Demo default

Usa el mock base existente (`weather.mock.json`).

```
URL: ?demo=1
```

### Demo seco

Escenario sin precipitación, cota alta y score bajo.

```
URL: ?demo=seco
```

- SIN SEÑAL DE NIEVE
- Score bajo
- Sin ventana clara
- "La cota de nieve está alta para Caviahue"

### Demo nieve

Escenario con temperatura favorable, cota baja y precipitación.

```
URL: ?demo=nieve
```

- SEÑAL DE NIEVE
- Score medio/alto
- Ventana clara
- "Hay condiciones para nevada en el pueblo"

### Demo mixto

Escenario con lluvia abajo y nieve hacia centro/cumbre.

```
URL: ?demo=mixto
```

- Pueblo sin señal clara
- Centro/cumbre con mejor señal
- "Puede llover abajo y nevar mejor hacia centro/cumbre"

---

## Checklist antes de tocar el motor

Antes de modificar `snow-engine.ts` o `scoring.ts`, validar:

```
npm run build
/
?demo=seco
?demo=nieve
?demo=mixto
```

Verificar:

- [ ] tabs Hoy / Mañana / 7 días funcionan
- [ ] NowCard sigue usando WeatherAPI
- [ ] SMN sigue fuera de UI
- [ ] No se rompen escenarios existentes

---

## Fuentes de datos

- **Primaria**: [Open-Meteo](https://open-meteo.com/) — gratuita, sin API key, datos del modelo GFS/ECMWF
- **NowCard**: [WeatherAPI](https://www.weatherapi.com/) — requiere API key en `.env`
- **Fallback**: `weather.mock.json` — datos locales para contingencia
- **SMN**: solo contraste regional (estación más cercana: Zapala a ~143 km)

## Stack

- [Astro](https://astro.build/) v6 (SSG)
- Tailwind CSS v4
- Open-Meteo API
- TypeScript

# Historical Data Specification

## Purpose

Build-time retrieval and rendering of historical AIC readings and Guru messages with client-side date filtering and inline SVG charting for the `/historico` page.

## Requirements

### Requirement: Build-Time Data Retrieval

The system MUST fetch the last 90 days of AIC readings and Guru messages during Astro SSG build via Supabase service key. The service key MUST NOT reach the client bundle.

#### Scenario: Full data fetch succeeds

- GIVEN Supabase contains AIC readings and Guru messages for the last 90 days
- WHEN `npm run build` executes
- THEN the server query returns joined day-by-day records
- AND the page renders with data from all available days

#### Scenario: Partial data (gaps in date range)

- GIVEN certain dates have no AIC readings or Guru messages
- WHEN the build fetches the 90-day window
- THEN missing dates render as empty states in cards/table
- AND the system does NOT fail the build

### Requirement: Day Cards — Top 3 Days

The system MUST render the latest 3 non-empty days as prominent cards. Each card SHALL display AIC metrics (temp, snow depth, SWE) and the Guru message (2-line clamp).

#### Scenario: Three days available

- GIVEN 3+ days of data exist
- WHEN `/historico` renders
- THEN the 3 latest days render as cards (vertical on mobile, grid on desktop)

#### Scenario: Fewer than 3 days available

- GIVEN only 1–2 days have data
- WHEN `/historico` renders
- THEN only available days render as cards (no placeholders)

### Requirement: Historical Data Table

The system MUST render days beyond the top 3 in a compact scrollable table. Each row SHALL include date, AIC metrics, and a Guru message excerpt.

#### Scenario: Full 90-day dataset

- GIVEN 90 days of data exist
- WHEN `/historico` renders
- THEN rows 4–90 appear in the table inside a scrollable container (no page-level scroll)

#### Scenario: Empty table (only 3 days total)

- GIVEN the dataset contains 3 or fewer days
- WHEN `/historico` renders
- THEN the table section displays "No older data" instead of an empty table

### Requirement: Client-Side Date Range Filter

The system MUST embed the full dataset as JSON in the page. Quick-select buttons (7d, 14d, 30d, 90d) MUST filter cards, table, and chart client-side without server round-trips.

#### Scenario: Quick-select 7d

- GIVEN the full 90-day dataset is embedded as JSON
- WHEN the user clicks "7d"
- THEN only the last 7 days appear in cards + table
- AND the SWE chart updates to match the filtered range

#### Scenario: 90d selected with fewer days available

- GIVEN the dataset has only 45 days
- WHEN the user clicks "90d"
- THEN all 45 available days render (no broken range)

### Requirement: Inline SVG SWE Chart

The system MUST generate an SVG chart for snow water equivalent at build time using Astro's `set:html` directive. The system MUST NOT load any JS charting library.

#### Scenario: Chart renders with SWE data

- GIVEN SWE readings exist for the date range
- WHEN `/historico` renders
- THEN an inline SVG displays axis labels and a SWE line or area

#### Scenario: No SWE data in range

- GIVEN no SWE readings exist for any date
- WHEN `/historico` renders
- THEN the SVG renders empty with "Sin datos" centered overlay

### Requirement: Mobile-First Styling

The page MUST use the existing dark theme design system: `bg-[rgba(9,16,22,0.6)]`, `border-white/[0.06]`, `rounded-xl`, `shadow-[0_4px_20px_rgba(0,0,0,0.35)]`. Cards MUST stack vertically on mobile and switch to a grid on desktop (breakpoint consistent with the rest of the site).

#### Scenario: Responsive layout

- GIVEN mobile viewport (375px)
- WHEN the page loads
- THEN cards stack vertically, table scrolls horizontally, no overflow

#### Scenario: Desktop grid

- GIVEN desktop viewport (1280px)
- WHEN the page loads
- THEN top-3 cards display in a 3-column grid

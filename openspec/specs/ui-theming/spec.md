# Theme Toggle Specification

## Purpose

Enables users to switch between dark and light themes. The toggle persists user preference to localStorage, sets a data-theme attribute on the HTML element, and drives all component colors through CSS custom properties.

## Requirements

### Requirement: Theme Toggle Control

The system SHALL provide a toggle button in the MobileNav header that switches between dark and light themes.

#### Scenario: Toggle renders in MobileNav

- GIVEN the MobileNav component is rendered
- WHEN the header is visible
- THEN a toggle button with sun/moon icon is displayed
- AND the icon reflects the current active theme

#### Scenario: Toggle switches from dark to light

- GIVEN the current theme is dark
- WHEN the user clicks the theme toggle
- THEN the page switches to light theme
- AND the HTML element receives data-theme="light"
- AND the choice is persisted to localStorage key 'theme' with value 'light'

#### Scenario: Toggle switches from light to dark

- GIVEN the current theme is light
- WHEN the user clicks the theme toggle
- THEN the page switches to dark theme
- AND the HTML element's data-theme attribute is removed
- AND the choice is persisted to localStorage key 'theme' with value 'dark'

#### Scenario: Theme persists across page loads

- GIVEN the user has previously selected light mode
- WHEN the page loads
- THEN the HTML element receives data-theme="light" before first paint
- AND no flash of wrong theme occurs

### Requirement: CSS Variable Theming

The system SHALL define all colors through CSS custom properties with dark as the default and light as an override.

#### Scenario: Dark theme defaults

- GIVEN the page has no data-theme attribute
- WHEN the :root CSS is applied
- THEN background colors use dark palette values
- AND text colors use light-on-dark palette values

#### Scenario: Light theme overrides

- GIVEN the HTML element has data-theme="light"
- WHEN the [data-theme="light"] CSS is applied
- THEN background colors use light palette values
- AND text colors use dark-on-light palette values

#### Scenario: Semantic token definitions

- GIVEN the CSS variable system is active
- WHEN the following semantic tokens are defined
  - --bg-base
  - --bg-surface
  - --text-primary
  - --text-secondary
  - --text-muted
  - --border-subtle
- THEN each component that uses these tokens renders correctly in both themes

### Requirement: Component Color Migration

The system SHALL replace all hardcoded color values with CSS variable references.

#### Scenario: No hardcoded rgba() or hex colors remain

- GIVEN the codebase is fully migrated
- WHEN searching for rgba(), hex colors (#), and hardcoded text-white/text-gray classes
- THEN zero matches are found in component or page files

#### Scenario: SVG charts use CSS variables

- GIVEN the ForecastChart or HistoricoChart component renders
- WHEN the page is in dark or light mode
- THEN SVG fill and stroke attributes reference CSS variables or currentColor
- AND chart colors match the active theme

#### Scenario: All components use semantic tokens

- GIVEN any component renders in light mode
- WHEN background, text, or border styling is applied
- THEN it uses semantic CSS variable references instead of hardcoded values

### Requirement: Flash Prevention

The system SHALL prevent flash of wrong theme on initial page load.

#### Scenario: Inline script in head sets theme before paint

- GIVEN the page is loading for the first time or on subsequent visits
- WHEN the browser parses the inline script in head
- THEN the script reads localStorage key 'theme'
- AND sets data-theme attribute on html before any other stylesheets are parsed
- AND no visible flash of the wrong theme occurs

#### Scenario: No theme stored defaults to dark

- GIVEN localStorage has no 'theme' key
- WHEN the page loads
- THEN the html element has no data-theme attribute
- AND the dark theme is displayed

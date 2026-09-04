---
name: BusEka
colors:
  surface: '#fbf8ff'
  surface-dim: '#d9d9e7'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ededfb'
  surface-container-high: '#e7e7f5'
  surface-container-highest: '#e1e1ef'
  on-surface: '#191b25'
  on-surface-variant: '#434656'
  inverse-surface: '#2e303a'
  inverse-on-surface: '#f0effe'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ced'
  primary: '#003ec7'
  on-primary: '#ffffff'
  primary-container: '#0052ff'
  on-primary-container: '#dfe3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006e2a'
  on-secondary: '#ffffff'
  secondary-container: '#5cfd80'
  on-secondary-container: '#00732c'
  tertiary: '#952200'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf3003'
  on-tertiary-container: '#ffddd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#69ff87'
  secondary-fixed-dim: '#3ce36a'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#00531e'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#891e00'
  background: '#fbf8ff'
  on-background: '#191b25'
  surface-variant: '#e1e1ef'
  live-green: '#00C853'
  live-green-bg: '#E8F8EE'
  stale-grey: '#94A3B8'
  warning-amber: '#F59E0B'
  warning-amber-bg: '#FEF3C7'
  error-red: '#EF4444'
  error-red-bg: '#FEE2E2'
  surface-light: '#F8FAFC'
  surface-dark: '#0F172A'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono-code:
    fontFamily: JetBrains Mono, monospace
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-min: 44px
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
---

## Brand & Style

This design system establishes a clean, utility-first aesthetic tailored for public transport tracking under constrained network and hardware conditions. The brand personality is grounded, highly reliable, and direct—prioritizing function, legibility, and speed over decorative elements. 

The visual style combines **Minimalism** with **High-Contrast Utility**, optimized for daily commuters and parents using budget Android devices on mobile data. Every pixel is purposeful: high contrast text ensures readability in direct sunlight, generous touch targets prevent mis-taps, and transparent information hierarchy builds immediate trust.

## Colors

The color palette is deliberately restrained to maximize contrast and convey live status instantly. 

- **Primary Blue (`#0052FF`):** Drives key interactive elements, active navigation states, and primary actions.
- **Live Green (`#00C853`):** Reserved exclusively for active statuses, live vehicle indicators, and success feedback.
- **Neutrals:** Crisp whites, deep slates, and accessible grays provide an unyielding structural foundation that scales seamlessly between light and dark modes.
- **Feedback Accents:** Amber and red are strictly deployed for system warnings, connection dropouts, and validation errors.

## Typography

Typography is systematic and utility-driven, utilizing **Inter** for exceptional rendering on low-density mobile screens. 

- Never clip localized text (Sinhala/Tamil); containers must flex vertically, allowing up to two lines for labels.
- Maintain strict type hierarchies: 20px semibold for section headings, 15px for primary body text, and 13px for metadata.

## Layout & Spacing

The layout model relies on a responsive mobile-first grid designed at a baseline of 360x640px, scaling cleanly up to 1440x900px without horizontal overflow.

- **Touch Targets:** All interactive elements must maintain a minimum bounding box of 44x44px.
- **Spacing Rhythm:** Built on a strict 4px/8px scale (`gutter-sm`, `gutter-md`, `gutter-lg`) to ensure consistent density across dense transit views.
- **Navigation Structure:** Below 768px, navigation is anchored to a fixed bottom bar with five items. Above 768px, it transforms into a top navigation bar incorporating the brand wordmark.

## Elevation & Depth

To maintain a fast, clean utility aesthetic on budget hardware, heavy drop shadows are intentionally avoided. 

- **Low-Contrast Outlines:** Surfaces, cards, and input boundaries rely on clean 1px borders (`border-slate-200` / `border-slate-800`) to define hierarchy.
- **Tonal Layering:** Depth is communicated through subtle background surface shifts rather than complex z-space layering, ensuring optimal rendering performance on low-end mobile processors.

## Shapes

A uniform corner radius of **12px** is applied across all containers, input fields, cards, and buttons. This creates a cohesive, approachable, and modern technical feel while avoiding overly soft pill shapes or rigid sharp corners.

## Components

- **Buttons:** Full-width or inline blocks with a minimum height of 44px, 12px border radius, and clear typographic hierarchy. Primary actions use solid primary blue or live green; secondary actions use clean 1px borders.
- **Input Fields:** Generous touch targets with 12px rounding, 1px neutral borders, and clear inline validation messaging featuring both color cues and icons.
- **Chips & Pills:** Compact filter elements and status indicators. Selected states use solid fills; unselected states use clean outlines. Status pills combine soft backgrounds with high-contrast text.
- **Cards & Bottom Sheets:** Structured containers featuring 12px rounding, 1px subtle borders, and optimized padding to handle dynamic content gracefully without layout shift.
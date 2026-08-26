---
name: Architectural Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#d8dae0'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3f9'
  surface-container: '#eceef3'
  surface-container-high: '#e7e8ee'
  surface-container-highest: '#e1e2e8'
  on-surface: '#191c20'
  on-surface-variant: '#45464d'
  inverse-surface: '#2e3135'
  inverse-on-surface: '#eff0f6'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#9af2c5'
  on-secondary-container: '#0c714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#9df4c8'
  secondary-fixed-dim: '#81d8ad'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#191c20'
  surface-variant: '#e1e2e8'
  surface-lowest: '#ffffff'
  surface-low: '#eff4ff'
  border-outline-variant: '#c6c6cd'
  text-muted: '#45464d'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter-desktop: 24px
  gutter-mobile: 16px
  margin-desktop: 32px
  margin-mobile: 16px
  table-row-compact: 8px
  table-row-standard: 12px
---

## Brand & Style

The design system is a high-performance framework defined by **Minimalism** and **Corporate Modernism**. It prioritizes architectural precision, visual restraint, and a "data-first" hierarchy. The brand personality is authoritative and sophisticated, moving away from decorative trends toward a calm, focused environment. 

The aesthetic is characterized by:
- **Visual Restraint:** Elimination of floating elements, shadows, and gradients.
- **Architectural Separation:** Structure is defined through 1px borders and tonal shifts between surfaces.
- **Information Density:** High utility on desktop for expert users, transitioning to clean simplicity on mobile.
- **Precision:** Perfect alignment of numeric data and tight typographic control.

## Colors

This system utilizes a professional, high-contrast but muted palette. The primary vehicle for hierarchy is tonal layering rather than depth.

- **Primary (#0f172a):** A deep navy used for branding, primary actions, and global navigation.
- **Secondary (#006c49):** A restrained green for positive actions and success states.
- **Neutrals:** `surface-lowest` (#ffffff) is the base background for main content containers to ensure maximum contrast. `surface-low` (#eff4ff) is used for secondary areas, sidebars, or section headers to provide subtle differentiation.
- **Borders:** `border-outline-variant` is the critical tool for separation. It must be used consistently to define boundaries without adding visual weight.

## Typography

The system relies exclusively on **Inter** for its neutral, functional clarity. The scale is deliberate, focusing on the 13-16px range for the majority of UI content to maintain high information density.

- **Numeric Data:** All financial views, tables, and IDs must use `font-variant-numeric: tabular-nums` to ensure perfect vertical alignment.
- **Headheaders:** Table headers use `label-caps` with tight letter spacing and a bold weight for clear structural anchoring.
- **Contrast:** Headings use the primary color (#0f172a), while secondary UI labels and body meta-data use `text-muted` (#45464d).

## Layout & Spacing

The layout model is a **fixed grid** system for desktop, moving to a fluid model for mobile.

- **Desktop Structure:** A 12-column grid with 24px gutters. Content is housed in containers defined by 1px borders. We avoid "floating" cards; instead, sections are separated by whitespace and subtle `border-outline-variant` lines.
- **Information Density:** On desktop, use "Compact" spacing (8px) for data-heavy views. On mobile, increase padding to "Standard" (12px) to ensure touch targets are accessible.
- **Grid Alignment:** All elements must align to a 4px baseline grid to maintain architectural precision.

## Elevation & Depth

This design system deliberately removes all soft shadows, gradients, and glassmorphism. Depth is strictly two-dimensional:

1.  **Level 0 (Base):** `surface-low` (#eff4ff) used for the background of the application.
2.  **Level 1 (Content):** `surface-lowest` (#ffffff) used for main content areas and table bodies.
3.  **Separation:** 1px solid `border-outline-variant` borders are used to separate Level 1 areas from the Level 0 background.
4.  **Interaction:** Elements do not "lift" on hover. Instead, hover states are indicated by subtle background color shifts (e.g., a table row changing to `surface-low`).

## Shapes

The shape language is sharp and precise.
- **Components:** Buttons and input fields use a minimal 4px (`rounded-sm`) radius.
- **Containers:** Large content areas and tables should have 4px corners or be completely sharp (0px) if they are edge-to-edge.
- **Badges:** Small status indicators may use a pill-shape to distinguish them from interactive buttons, but the default preference is for rectangular precision.

## Components

### Tables
- **Structural Style:** No outer borders. Use 1px `border-outline-variant` for horizontal row dividers only. 
- **Headers:** `surface-low` background, bold `label-caps` text, right-aligned for numeric columns.
- **Cells:** Use `numeric-data` for all values to ensure alignment.

### Buttons
- **Primary:** Solid `#0f172a` background with white text. 4px radius. 
- **Secondary:** 1px `border-outline-variant` outline, no background, primary color text.
- **Style:** Strictly flat. No gradients or shadows.

### Input Fields
- **Default:** 1px `border-outline-variant` border, `#ffffff` background. 
- **Focus:** 1px primary navy border. No soft outer glow; use a crisp 1px offset if a ring is required.

### Cards & Containers
- Cards are no longer "floating." They should be treated as sections of the grid, defined by a 1px border and an optional `surface-lowest` background. 
- Use generous, consistent internal padding (24px) to create breathing room.
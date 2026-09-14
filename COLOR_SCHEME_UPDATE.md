# Workforce One - Indigo Color Scheme Update

## Overview
Successfully transformed the entire UI from an emerald/teal color scheme to a modern indigo/blue-grey palette.

## CSS Variables Updated (`:root` in app.css)

### Primary/Brand Colors
| Variable | Old Value (Emerald) | New Value (Indigo) |
|----------|-------------------|-------------------|
| `--ink` | `oklch(24% .035 190)` (dark teal-navy) | `oklch(25% .02 250)` (slate-800) |
| `--ink-2` | `oklch(31% .045 190)` (dark teal-navy) | `oklch(32% .025 250)` (slate-700) |
| `--emerald` | `oklch(48% .13 163)` (emerald green) | `oklch(55% .15 265)` (indigo-600) |
| `--emerald-dark` | `oklch(39% .11 163)` (dark emerald) | `oklch(45% .13 265)` (indigo-700) |
| `--emerald-soft` | `oklch(94% .04 163)` (very light green) | `oklch(96% .02 265)` (indigo-50) |
| `--mint` | `oklch(94% .035 163)` (light mint green) | `oklch(95% .03 265)` (indigo-100) |

### Neutral/Layout Colors
| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `--paper` | `oklch(99% .005 95)` (near-white warm) | `oklch(99% .003 250)` (near-white cool) |
| `--canvas` | `oklch(97% .008 100)` (warm white) | `oklch(97% .005 250)` (slate-50) |
| `--line` | `oklch(88% .018 160)` (light teal-grey) | `oklch(90% .01 250)` (slate-200) |
| `--muted` | `oklch(47% .035 170)` (medium teal-grey) | `oklch(55% .02 250)` (slate-500) |
| `--warm` | `#f4ede1` (warm cream/beige) | `#eef2f6` (cool blue-grey cream) |

### Semantic Colors (Unchanged)
| Variable | Value | Notes |
|----------|-------|-------|
| `--warning` | `oklch(55% .14 65)` → `oklch(55% .14 65)` | Amber - kept for contrast |
| `--danger` | `oklch(50% .16 25)` | Red - kept consistent |

### Supporting Tokens
| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `--shadow` | `rgba(17,43,43,.06)` | `rgba(30,41,59,.06)` |
| `--focus-ring` | `rgba(8,112,79,.2)` | `rgba(79,70,229,.2)` |
| `--surface-shadow` | `rgba(11,31,42,...)` | `rgba(30,41,59,...)` |

## Hardcoded Color Replacements

### Emerald/Green Family → Indigo
- `rgba(8,127,91,*)` → `rgba(79,70,229,*)` (primary indigo in rgba)
- `rgba(8,112,79,*)` → `rgba(79,70,229,*)` (emerald variant)
- `#087f5b` → `#4f46e5` (emerald hex)
- `#065e44` → `#4338ca` (dark emerald hex)

### Light Green Backgrounds → Light Indigo
- `#edf5f1`, `#edf6f2`, `#eef6f2` → `#eef2ff` (indigo-50)
- `#f2f8f5`, `#f3f8f5`, `#f3f6f4`, `#f3f7f4` → `#f5f7ff` (indigo-100)
- `#f8f9f6`, `#f8faf7` → `#f8fafc` (slate-50)

### Teal-Grey Neutrals → Blue-Grey
- `#eceee9`, `#edf0ec`, `#eef0eb` → `#eef1f5`
- `#e2e7e2`, `#e5ece8`, `#e8edef` → `#e8ecf2`
- `#d9dfda`, `#dce9e3`, `#dce4e0` → `#dce3ea` / `#dce8f4`
- `#bbc3bd`, `#ccd2cd`, `#cbd2cd` → `#c5d1e0` / `#d4dce8`
- `#aeb9b3`, `#b4c3bc` → `#b5c3d9`

### Sidebar Colors (Teal → Blue-Grey)
- `#a8b9b8` → `#a3afc1` (nav link text)
- `#617a78` → `#7e8ba3` (nav label)
- `#68817f` → `#8796b5` (account small text)
- `#52615d`, `#72807c` → `#606d83` / `#7e8ba3`

### Bright Accent Dots (Cyan-Green → Bright Indigo)
- `#5de0ae`, `#42d3a1`, `#78d7b6` → `#a5b4fc` (indigo-300)
- `rgba(93,224,174,*)`, `rgba(66,211,161,*)` → `rgba(165,180,252,*)`

### Dark Surface Accents
- `#92c9b8`, `#89cbb5`, `#7dd6b6` → `#a5b4fc` (light indigo)
- `#91a5a3`, `#9cb1af`, `#9fb3b1`, `#9bb0ae`, `#aec0be` → `#a3afc1` / `#b5c3d9`
- `#8da39f`, `#849b98`, `#7b918f` → `#a3afc1`
- `#66807d`, `#496360` → `#7e8ba3` / `#606d83`

### Guide/Card Borders
- `#5b7776` → `#6874a3` (guide border)
- `#35535a` → `#3d4865` (scan ring border)
- `#b8decf` → `#c7d7f5` (finalised banner border)

### Table Backgrounds
- `#f6f6f1`, `#fafbf9` → `#f8fafc`

### Warm Banners (Beige → Cool Blue-Grey)
- `#e7d8c3` → `#d4dce8` (border)
- `#9e6d27`, `#776b5d`, `#85602b` → `#7e8ba3` / `#64748b`

### Shadow/Ink Tones
- `rgba(17,43,43,*)` → `rgba(30,41,59,*)` (dark shadows)
- `rgba(11,31,42,*)` → `rgba(30,41,59,*)` (surface shadows)

## Files Modified

### CSS Files
1. **`/app/app.css`** - Main design system file (454 lines)
   - Updated `:root` CSS variables (lines 3-31)
   - Replaced ~80 hardcoded color values throughout

2. **`/app/features/attendance/attendance.css`** - Feature-specific styles
   - Updated emerald/teal colors to indigo
   - Updated neutral greys to blue-grey

### TSX Files
3. **`/app/features/leave/leave-ui.tsx`** - Single hardcoded background color
   - Line 1728: `#eceee9` → `#eef1f5`

## Color Palette Summary

### New Indigo Palette
**Primary Brand**
- Indigo-600: `#4f46e5` / `oklch(55% .15 265)` - Primary actions, buttons, active states
- Indigo-700: `#4338ca` / `oklch(45% .13 265)` - Hover states, darker accents
- Indigo-300: `#a5b4fc` - Bright accents, live dots, focus indicators
- Indigo-100: `#e0e7ff` / `oklch(95% .03 265)` - Light hover backgrounds
- Indigo-50: `#eef2ff` / `oklch(96% .02 265)` - Very light backgrounds

**Blue-Grey Neutrals (Slate)**
- Slate-800: `#1e293b` / `oklch(25% .02 250)` - Primary text, dark surfaces
- Slate-700: `#334155` / `oklch(32% .025 250)` - Darker surfaces
- Slate-500: `#64748b` / `oklch(55% .02 250)` - Secondary text, muted content
- Slate-200: `#e2e8f0` / `oklch(90% .01 250)` - Borders, dividers
- Slate-50: `#f8fafc` / `oklch(97% .005 250)` - Page backgrounds

**Semantic (Kept)**
- Warning: Amber `#d97706`
- Danger: Red `#dc2626`

## Design Impact

### What Changed
✓ All emerald/teal greens → Modern indigo/purple
✓ All teal-grey neutrals → Cool blue-grey (slate)
✓ Warm cream accents → Cool blue-grey cream
✓ Green focus rings → Indigo focus rings
✓ Sidebar navigation colors now blue-grey themed
✓ All hover states and active states use indigo
✓ Login page gradient uses indigo
✓ Badges and notifications use indigo backgrounds

### What Stayed the Same
✓ Warning colors (amber/orange) - for contrast
✓ Danger/error colors (red) - for consistency
✓ Layout structure and spacing
✓ Border radiuses and shadows (adjusted tones only)
✓ Typography and component architecture

## Visual Aesthetic
**Before:** Dark teal/forest green palette with Scandinavian/professional HR feel
**After:** Modern indigo/blue-grey palette with contemporary SaaS aesthetic - professional, trustworthy, tech-forward

## Browser Compatibility
All colors use modern CSS (oklch color space) supported in:
- Chrome/Edge 111+
- Safari 15.4+
- Firefox 113+

Fallback: Browsers display closest sRGB equivalent automatically.

## Testing Recommendations
1. Test in development mode to see live changes
2. Verify focus states on form inputs (indigo ring)
3. Check sidebar active navigation (indigo background)
4. Verify button hover states (darker indigo)
5. Check notification badges (indigo backgrounds)
6. Test toast notifications (indigo success states)
7. Verify status dots (approved/active states in indigo)

## Rollback
To rollback, restore the `:root` variables to original emerald/teal values:
```css
--emerald: oklch(48% .13 163);
--emerald-dark: oklch(39% .11 163);
--mint: oklch(94% .035 163);
```
Then run the color replacement script in reverse.

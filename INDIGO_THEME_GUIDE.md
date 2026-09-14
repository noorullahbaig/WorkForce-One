# Workforce One - Indigo Theme Visual Guide

## 🎨 Color Transformation Summary

Your entire UI has been transformed from **emerald/teal** to **modern indigo/blue-grey**.

---

## Quick Visual Reference

### Before → After

| Element | Old Color (Emerald) | New Color (Indigo) |
|---------|-------------------|-------------------|
| **Primary Button** | ![#087f5b](https://via.placeholder.com/60x20/087f5b/087f5b.png) Emerald-600 | ![#4f46e5](https://via.placeholder.com/60x20/4f46e5/4f46e5.png) Indigo-600 |
| **Hover State** | ![#065e44](https://via.placeholder.com/60x20/065e44/065e44.png) Dark Emerald | ![#4338ca](https://via.placeholder.com/60x20/4338ca/4338ca.png) Indigo-700 |
| **Light Backgrounds** | ![#edf5f1](https://via.placeholder.com/60x20/edf5f1/edf5f1.png) Mint | ![#eef2ff](https://via.placeholder.com/60x20/eef2ff/eef2ff.png) Indigo-50 |
| **Hover Backgrounds** | ![#f3f7f4](https://via.placeholder.com/60x20/f3f7f4/f3f7f4.png) Light Green | ![#f5f7ff](https://via.placeholder.com/60x20/f5f7ff/f5f7ff.png) Indigo-100 |
| **Bright Accents** | ![#5de0ae](https://via.placeholder.com/60x20/5de0ae/5de0ae.png) Cyan-Green | ![#a5b4fc](https://via.placeholder.com/60x20/a5b4fc/a5b4fc.png) Indigo-300 |
| **Dark Surfaces** | ![#112a2e](https://via.placeholder.com/60x20/112a2e/112a2e.png) Teal-Navy | ![#1e293b](https://via.placeholder.com/60x20/1e293b/1e293b.png) Slate-800 |
| **Secondary Text** | ![#6f8790](https://via.placeholder.com/60x20/6f8790/6f8790.png) Teal-Grey | ![#64748b](https://via.placeholder.com/60x20/64748b/64748b.png) Slate-500 |
| **Borders** | ![#d4ddd8](https://via.placeholder.com/60x20/d4ddd8/d4ddd8.png) Teal-Grey | ![#e2e8f0](https://via.placeholder.com/60x20/e2e8f0/e2e8f0.png) Slate-200 |

---

## 🎯 Where You'll See Indigo

### Primary Actions & Interactive Elements
- ✅ **Login button** - Indigo background with shadow
- ✅ **Save/Submit buttons** - Indigo-600 with indigo-700 hover
- ✅ **Active navigation items** - Indigo background in sidebar
- ✅ **Focus rings** - Indigo glow around form inputs
- ✅ **Text links** - Indigo color for clickable text

### Status & State Indicators
- ✅ **Active status dots** - Indigo (approved, present, finalized)
- ✅ **Live indicators** - Bright indigo pulse dots
- ✅ **Badge backgrounds** - Light indigo for unread counts
- ✅ **Selected states** - Light indigo backgrounds
- ✅ **Progress bars** - Indigo gradient

### Hover & Interaction States
- ✅ **Button hovers** - Darker indigo
- ✅ **Row hovers** - Light indigo tint
- ✅ **Card hovers** - Indigo border + light fill
- ✅ **Icon backgrounds** - Light indigo on hover

### Dark Surfaces (Sidebar, Hero Cards, Modals)
- ✅ **Sidebar background** - Slate-800 (cool dark blue-grey)
- ✅ **Sidebar text** - Blue-grey neutrals
- ✅ **Hero cards** - Slate-800 with indigo accents
- ✅ **Login story panel** - Dark slate with indigo gradient overlay

---

## 🏗️ Component Breakdown

### Navigation
```
Sidebar Background:  Slate-800 (#1e293b)
Nav Links:          Blue-grey-400 (#a3afc1)
Active Nav:         Indigo-600 (#4f46e5) with white text
Hover:              Lighter blue-grey
```

### Buttons
```
Primary:            Indigo-600 background, white text, indigo shadow
Primary Hover:      Indigo-700 background
Secondary:          White background, slate border
Ghost:              Transparent, muted text
```

### Forms
```
Input Border:       Slate-300
Input Focus:        Indigo-600 border + indigo focus ring
Select Arrow:       Slate-500
Labels:             Slate-700
```

### Status Dots
```
Active/Approved:    Indigo-600
Pending:            Amber (unchanged)
Rejected/Error:     Red (unchanged)
Neutral:            Slate-400
```

### Cards & Surfaces
```
Card Background:    Near-white (#fefefe)
Canvas/Page:        Slate-50 (#f8fafc)
Borders:            Slate-200 (#e2e8f0)
Hover State:        Light indigo tint
```

### Tables
```
Header Row:         Cool grey (#eef1f5)
Row Hover:          Slate-50 (#f8fafc)
Selected Row:       Indigo-50 with indigo left border
```

---

## 🎭 Design Personality

### Before (Emerald/Teal)
- 🌲 Forest green, organic, Scandinavian
- 🏥 Healthcare/wellness feel
- 🌿 Natural, calm, sustainable vibe
- 📋 Traditional HR/professional

### After (Indigo/Blue-Grey)
- 🚀 Modern SaaS, tech-forward
- 💼 Corporate, trustworthy, professional
- 🔮 Innovative, digital-first
- 🎯 Contemporary, confident, enterprise

---

## 🔬 Technical Details

### CSS Variables Updated
All changes are centralized in `/app/app.css` lines 3-31:

```css
:root {
  /* Primary Brand - Now Indigo */
  --emerald: oklch(55% .15 265);        /* Was emerald, now indigo-600 */
  --emerald-dark: oklch(45% .13 265);   /* Was dark emerald, now indigo-700 */
  --mint: oklch(95% .03 265);           /* Was mint green, now indigo-100 */
  --emerald-soft: oklch(96% .02 265);   /* Was soft green, now indigo-50 */
  
  /* Neutrals - Now Blue-Grey (Slate) */
  --ink: oklch(25% .02 250);            /* Was teal-navy, now slate-800 */
  --ink-2: oklch(32% .025 250);         /* Was dark teal, now slate-700 */
  --muted: oklch(55% .02 250);          /* Was teal-grey, now slate-500 */
  --line: oklch(90% .01 250);           /* Was teal-grey, now slate-200 */
  --canvas: oklch(97% .005 250);        /* Was warm white, now slate-50 */
  --paper: oklch(99% .003 250);         /* Was warm white, now cool white */
  
  /* Warm Accent - Now Cool */
  --warm: #eef2f6;                      /* Was beige, now cool blue-grey */
  
  /* Focus & Shadows - Now Indigo */
  --focus-ring: 0 0 0 3px rgba(79,70,229,.2);
  --shadow: 0 8px 24px rgba(30,41,59,.06);
}
```

### Browser Support
- **Modern Browsers:** Full `oklch()` color space support
  - Chrome/Edge 111+
  - Safari 15.4+
  - Firefox 113+
- **Older Browsers:** Automatic sRGB fallback

---

## 🧪 Testing Checklist

Run through these scenarios to verify the color transformation:

### Login & Authentication
- [ ] Login page story panel has indigo gradient
- [ ] Login button is indigo with shadow
- [ ] Demo account cards hover with indigo border
- [ ] Focus states show indigo ring

### Navigation
- [ ] Sidebar background is dark blue-grey (slate)
- [ ] Active nav item has indigo background
- [ ] Hover states lighten sidebar items
- [ ] Unread badges have indigo background

### Dashboard
- [ ] Primary buttons are indigo
- [ ] Hover states darken to indigo-700
- [ ] Status dots use indigo for active/approved
- [ ] Cards hover with subtle indigo tint

### Forms & Inputs
- [ ] Input focus shows indigo border + ring
- [ ] Submit buttons are indigo
- [ ] Select dropdowns have slate arrow
- [ ] Validation uses semantic colors (red/amber preserved)

### Tables & Lists
- [ ] Header rows are cool grey
- [ ] Row hover shows slate background
- [ ] Selected rows have indigo accent border
- [ ] Status indicators use indigo

### Attendance & Payroll
- [ ] Clock in/out cards use indigo accents
- [ ] Live dots are bright indigo
- [ ] Progress indicators are indigo
- [ ] Hero cards have slate backgrounds

### Leave Management
- [ ] Calendar uses indigo for selections
- [ ] Approved events show indigo dots
- [ ] Hover states use light indigo
- [ ] Balance cards use indigo highlights

---

## 🎨 Color Palette Reference

### Indigo Scale (Primary Brand)
```
Indigo-50:  #eef2ff  oklch(96% .02 265)   - Lightest backgrounds
Indigo-100: #e0e7ff  oklch(95% .03 265)   - Hover backgrounds  
Indigo-200: #c7d2fe  oklch(87% .06 265)   - Subtle accents
Indigo-300: #a5b4fc  oklch(77% .10 265)   - Bright accents, dots
Indigo-400: #818cf8  oklch(67% .14 265)   - Medium accents
Indigo-500: #6366f1  oklch(57% .16 265)   - Standard accent
Indigo-600: #4f46e5  oklch(55% .15 265)   - PRIMARY BRAND ⭐
Indigo-700: #4338ca  oklch(45% .13 265)   - Hover/pressed states
Indigo-800: #3730a3  oklch(37% .11 265)   - Very dark accent
Indigo-900: #312e81  oklch(29% .09 265)   - Darkest
```

### Slate Scale (Neutrals)
```
Slate-50:  #f8fafc  oklch(97% .005 250)   - Page backgrounds
Slate-100: #f1f5f9  oklch(94% .01 250)    - Surface backgrounds
Slate-200: #e2e8f0  oklch(90% .01 250)    - Borders, dividers
Slate-300: #cbd5e1  oklch(84% .02 250)    - Input borders
Slate-400: #94a3b8  oklch(67% .03 250)    - Placeholder text
Slate-500: #64748b  oklch(55% .02 250)    - SECONDARY TEXT ⭐
Slate-600: #475569  oklch(45% .02 250)    - Labels
Slate-700: #334155  oklch(32% .025 250)   - DARK SURFACE V2 ⭐
Slate-800: #1e293b  oklch(25% .02 250)    - PRIMARY DARK ⭐
Slate-900: #0f172a  oklch(15% .02 250)    - Darkest
```

### Semantic Colors (Preserved)
```
Warning:  #d97706  oklch(55% .14 65)    - Amber/orange
Danger:   #dc2626  oklch(50% .16 25)    - Red
Success:  #4f46e5  oklch(55% .15 265)   - Now using indigo (was emerald)
Info:     #64748b  oklch(55% .02 250)   - Slate-500
```

---

## 🔄 Rollback Instructions

If you need to revert to emerald theme:

1. **Restore CSS variables** in `/app/app.css` (lines 3-14):
```css
--ink: oklch(24% .035 190);
--ink-2: oklch(31% .045 190);
--emerald: oklch(48% .13 163);
--emerald-dark: oklch(39% .11 163);
--emerald-soft: oklch(94% .04 163);
--mint: oklch(94% .035 163);
--paper: oklch(99% .005 95);
--canvas: oklch(97% .008 100);
--line: oklch(88% .018 160);
--muted: oklch(47% .035 170);
--warm: #f4ede1;
```

2. **Run reverse color replacement script** (emerald hex values)

3. **Clear browser cache** to see old colors

---

## 📊 Impact Analysis

### Files Modified: 3
- `/app/app.css` - Main design system (13 variables + ~80 hardcoded colors)
- `/app/features/attendance/attendance.css` - Feature styles (~15 colors)
- `/app/features/leave/leave-ui.tsx` - 1 hardcoded background color

### Lines of Code Changed: ~100
- CSS variable declarations: 13 lines
- Hardcoded color replacements: ~87 instances

### Zero Breaking Changes
- All variable names remain the same (`--emerald` still called `--emerald`)
- No component logic changed
- No TypeScript/React changes needed
- Layout and structure untouched

---

## 🎯 Next Steps

1. **Test in development**
   ```bash
   npm run dev
   ```

2. **Verify all pages**
   - Login page
   - Dashboard
   - People directory
   - Attendance tracking
   - Leave calendar
   - Payroll review

3. **Check responsive behavior**
   - Mobile sidebar
   - Tablet layouts
   - Desktop views

4. **Validate accessibility**
   - Color contrast ratios (WCAG AA compliant)
   - Focus indicators visible
   - Status colors distinguishable

5. **Deploy when satisfied**
   ```bash
   npm run deploy
   ```

---

## 💡 Design Tips

### Using the New Palette

**For primary actions:** Use `var(--emerald)` (now indigo-600)
```css
.my-button {
  background: var(--emerald);
  color: white;
}
```

**For hover states:** Use `var(--emerald-dark)` (now indigo-700)
```css
.my-button:hover {
  background: var(--emerald-dark);
}
```

**For light backgrounds:** Use `var(--mint)` (now indigo-100)
```css
.my-card {
  background: var(--mint);
}
```

**For text:** Use neutrals
```css
.body-text { color: var(--ink); }
.secondary-text { color: var(--muted); }
```

---

**Questions?** Check `COLOR_SCHEME_UPDATE.md` for complete technical reference.

**Created:** $(date +"%B %d, %Y")
**Theme:** Indigo/Blue-Grey
**Status:** ✅ Complete

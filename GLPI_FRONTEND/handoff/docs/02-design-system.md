# Design System — Summit GLPI

Sistema de diseño extraído del logo de **Summit Consulting** (navy + teal).
Todo el código de referencia está en `designs/styles/`.

---

## 🎨 Color

### Tokens principales

| Token | Hex | Uso |
|---|---|---|
| `--navy-900` | `#0a2032` | Texto principal en superficies oscuras |
| `--navy-800` | `#0e2e44` | **Sidebar fondo** |
| `--navy-700` | `#143f5c` | **Primary** · botones · links · acentos |
| `--navy-600` | `#1c5478` | Hover de primary |
| `--navy-100` | `#e2edf3` | Fondo sutil |
| `--navy-50`  | `#f1f6f9` | Fondo seleccionado en filas |
| **`--teal-500`** | **`#5aafb8`** | **Acento secundario** · el "it" del logo |
| `--teal-700` | `#2b8a93` | Hover de teal |
| `--teal-100` | `#d6ecee` | Fondo de chips/badges teal |

### Neutrales (cool grey)

```
ink-900 #0d1b26  → texto principal
ink-800 #1a2b38  → texto secundario
ink-700 #2c3e4d  → labels
ink-600 #4a5d6d  → texto descriptivo
ink-500 #6c7e8d  → muted
ink-400 #94a3b1  → placeholder
ink-300 #b8c4cf  → divisores fuertes
ink-200 #d8e0e7  → bordes
ink-100 #ebeff3  → divisores
ink-50  #f5f7f9  → fondo de table headers
canvas  #fafbfc  → fondo de página
surface #ffffff  → fondo de cards
```

### Status (semánticos)

| | 700 | 500 | 100 | 50 |
|---|---|---|---|---|
| **Success** | `#18794e` | `#2faa6f` | `#d6f1e1` | `#ecf8f1` |
| **Danger**  | `#b42318` | `#f04438` | `#fde2e0` | `#fef3f2` |
| **Warn**    | `#b54708` | `#f79009` | `#fef0c7` | `#fffaeb` |
| **Info**    | `#175cd3` | `#2e90fa` | `#d1e9ff` | `#eff8ff` |

### Mapeo a catálogos

Los `catalog_item` traen su propio `color`. Mapea así en el componente Badge:

```typescript
const statusClass = {
  OPEN:        'is-open',       // info
  IN_PROGRESS: 'is-progress',   // warn
  PENDING:     'is-pending',
  WAITING:     'is-waiting',
  RESOLVED:    'is-resolved',   // success
  CLOSED:      'is-closed',     // neutral
  CANCELLED:   'is-cancelled',  // danger
};
```

---

## 🔤 Tipografía

### Familias

| Uso | Familia | Fallback |
|---|---|---|
| UI / Texto | **Plus Jakarta Sans** | `Inter, system-ui, sans-serif` |
| IDs, códigos, MAC, IP | **JetBrains Mono** | `SF Mono, Menlo, monospace` |

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Escala

| Token | Tamaño | Line height | Uso |
|---|---|---|---|
| `--t-2xs` | 11px | 1.4 | Captions, hints |
| `--t-xs`  | 12px | 1.45 | Metadata, labels |
| `--t-sm`  | 13px | 1.5 | Body, tablas |
| `--t-md`  | 14px | 1.5 | Body principal |
| `--t-lg`  | 16px | 1.5 | Texto destacado |
| `--t-xl`  | 18px | 1.4 | Subtítulos |
| `--t-2xl` | 22px | 1.2 | Page title |
| `--t-3xl` | 28px | 1.15 | Stat values |
| `--t-4xl` | 32px | 1.15 | Hero |

Pesos: **400 / 500 / 600 / 700 / 800**.
NUNCA uses `font-weight: bold` literal (renderiza inconsistente).

### Letter spacing

- Headlines (≥22px): `-0.018em`
- Stat values: `-0.02em`
- Uppercase labels: `+0.04em` o `+0.06em`

---

## 📐 Espaciado

Base de 4px. Escala:

```
--s-1   4px
--s-2   8px
--s-3  12px
--s-4  16px
--s-5  20px
--s-6  24px
--s-7  32px
--s-8  40px
--s-9  48px
--s-10 64px
```

Reglas:

- Padding interno de cards: `20px` (compact) o `24px` (normal).
- Gaps entre cards: `16px`.
- Padding de páginas: `22px 28px 32px`.

---

## 🟦 Border radius

```
--r-xs    4px   chips pequeños
--r-sm    6px   inputs sm, badges
--r-md    8px   botones, inputs, chips
--r-lg   12px   cards
--r-xl   16px   modales, dialogs
--r-full 999px  pills, avatars
```

NO uses valores intermedios (5px, 10px, 14px).

---

## 🌫️ Sombras

```
--sh-xs  0 1px 2px rgba(13,27,38,.04)        cards default
--sh-sm  0 1px 2px / 0 1px 3px rgba(...)     cards con hover
--sh-md  0 4px 12px-2px / 0 2px 6px-2px      menús, dropdowns
--sh-lg  0 16px 32px-8px / 0 4px 12px-2px    modales, drawers
```

---

## 🧩 Componentes base

### Botones

| Variante | Background | Texto | Uso |
|---|---|---|---|
| `primary` | `navy-700` | white | Acción principal |
| `secondary` | white + border `ink-200` | `navy-700` | Acción secundaria |
| `teal` | `teal-500` | white | Acción positiva (Resolver) |
| `danger` | `danger-600` | white | Eliminar, destructivo |
| `ghost` | transparent | `ink-700` | Acción terciaria |

Tamaños: `sm 30px` · `md 36px` (default) · `lg 44px`.

### Inputs

- Altura 38px (default), 32px (compact), 42px (auth).
- Border `ink-200` · radius `--r-md`.
- Focus: border `navy-700` + ring `rgba(20,63,92,.12) 3px`.
- Con icono izquierdo: padding-left 36px.

### Badges

Pill `999px`, height 22px, font 11.5px, weight 600.
Las variantes están mapeadas en `components.css` por `is-{status}`.

### Tablas

- Header `ink-50` + uppercase + 11.5px + letter-spacing 0.04em.
- Row hover: `navy-50`.
- Border 1px `ink-100` entre filas, 1px `ink-200` arriba/abajo de la tabla.
- Border radius solo en las esquinas externas.

---

## 🧭 App shell

### Sidebar

- Width 240px (expanded) · 64px (collapsed).
- Background `navy-800`.
- Sección activa: gradient `teal-500` 22%→6% + `box-shadow: inset 2px 0 0 teal-500`.
- Texto links: `#bccbd6` · activo: `#fff`.
- Contadores: pill `rgba(255,255,255,.1)` con texto `#cce0eb`.

### Topbar

- Height 60px.
- Background `white` + border-bottom `ink-200`.
- Crumbs en izquierda, search en centro (max 420px), tenant + acciones en derecha.

---

## 🎯 Iconos

Usa **Lucide** (`lucide-angular`). Tamaño default 18px, stroke 1.7.

Mapeo de íconos a módulos en sidebar:

```
dashboard  → LayoutGrid
tickets    → TicketCheck
assets     → Package
kb         → BookOpen
contracts  → FileText
reports    → BarChart3
users      → Users
tenants    → Building2
catalogs   → Tag
config     → Settings
audit      → Shield
```

---

## ✨ Animaciones / motion

- Transiciones default: `.15s ease-out`.
- Hover states: solo cambio de color/sombra, NO transform.
- Skeletons: shimmer de 1.5s con gradient `ink-100 → ink-50`.
- Page transitions: fade 100ms.

NO uses bounces, NO scale al hover en botones, NO carousels.

---

## ❌ Anti-patterns (NO hacer)

- Gradients vibrantes (excepto headers de hero y avatars).
- Drop shadows con blur > 32px.
- Border-left accent colors en cards (estética IA slop).
- Emojis en UI (excepto onboarding/dashboard tipo "👋").
- Más de 2 colores de acento en una pantalla.
- Sticky elements innecesarios.
- Animaciones de skeleton brillantes/de neón.

---

## 📦 Conversión a SCSS

Crea `web/src/styles/`:

```
tokens.scss        ← convertir de designs/styles/tokens.css
components.scss    ← buttons, badges, cards, tables, inputs
shell.scss         ← sidebar, topbar, page layout
utilities.scss    ← helpers (row, col, gap, muted, strong)
_mixins.scss       ← @mixin button-variant, @mixin badge-variant
```

Importa desde `angular.json`:

```json
"styles": [
  "src/styles/tokens.scss",
  "src/styles/components.scss",
  "src/styles/shell.scss",
  "src/styles/utilities.scss"
]
```

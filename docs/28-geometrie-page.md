# Commit 28 — Geometry Figures Reference Page

## 🇬🇧 English

### What Was Added

A dedicated **Geometry Figures** page (`GeometriePage`) that acts as a visual reference for the standard Romanian school geometry curriculum. Accessible via the triangle (△) icon in the toolbar.

### Sections

| Tab                    | Content                                                  |
| ---------------------- | -------------------------------------------------------- |
| **Figuri plane**       | 10 plane figures with area & perimeter formulas          |
| **Corpuri geometrice** | 8 solids with lateral area, total area & volume formulas |

### Plane Figures (Figuri plane)

| Figure               | Formulas shown                        |
| -------------------- | ------------------------------------- |
| Triunghi             | A = b·h/2, A = b·c·sin u/2, P = a+b+c |
| Triunghi dreptunghic | A = c₁·c₂/2, A = i·h/2, Pitagora      |
| Triunghi echilateral | A = l²√3/4, P = 3l, h = l√3/2         |
| Pătrat               | A = l², P = 4l, d = l√2               |
| Dreptunghi           | A = l·L, P = 2(l+L), d = √(l²+L²)     |
| Paralelogram         | A = b·h, A = a·b·sin u, P = 2(a+b)    |
| Romb                 | A = d₁·d₂/2, A = l²·sin u, P = 4l     |
| Trapez               | A = (B+b)·h/2, A = lₘ·h               |
| Cerc                 | A = πR², L = 2πR                      |
| Sector circular      | A = πR²·α/360°, arc l = πR·α/180°     |

### Solid Figures (Corpuri geometrice)

| Solid                       | Formulas shown                                    |
| --------------------------- | ------------------------------------------------- |
| Cub                         | Al = 6l², V = l³, d = l√3                         |
| Paralelipipedul dreptunghic | Al = 2(ab+bh+ah), V = a·b·h                       |
| Prismă dreaptă              | Al = Pb·h, At = Al+2Ab, V = Ab·h                  |
| Piramidă regulată           | Al = Pb·ap/2, At = Al+Ab, V = Ab·h/3              |
| Sferă                       | A = 4πR², V = 4πR³/3                              |
| Cilindru                    | Al = 2πRh, At = 2πR(R+h), V = πR²h                |
| Con                         | Al = πRG, At = πR(R+G), V = πR²h/3                |
| Trunchi de con              | Al = π(R+r)G, At = Al+πR²+πr², V = πh(R²+r²+Rr)/3 |

### SVG Drawings

Each figure is drawn with inline SVG using a consistent color code:

| Color                 | Meaning                     |
| --------------------- | --------------------------- |
| Deep blue `#1e40af`   | Shape outline               |
| Red `#dc2626`         | Heights / altitudes         |
| Green `#16a34a`       | Diagonals / midlines        |
| Amber `#d97706`       | Angle arcs and labels       |
| Gray dashed `#94a3b8` | Hidden / construction lines |

Reusable SVG helpers:

- `RightAngleMark` — small square at perpendicular corners
- `Lbl` — italic serif label
- `AngleArc` — arc segment for angle indicators

### Card Layout

Each figure card has:

1. **Colored header** — accent color varies by figure family (blue for triangles, teal for solids, etc.)
2. **SVG diagram** — labeled, color-coded, on a light background
3. **Formula section** — label = expression, displayed in a clean two-column format

The grid uses `repeat(auto-fill, minmax(200px, 1fr))` so it works on all screen sizes.

### Integration

- New `Page` type: `'geometrie'`
- Lazy-loaded chunk: `GeometriePage-*.js` (~21 kB)
- Toolbar button: `IconGeometrie` (triangle with inner circle)
- Prop: `onOpenGeometrie?: () => void` added to `CanvasBoardProps`

### Files Added / Changed

| File                               | Change                       |
| ---------------------------------- | ---------------------------- |
| `src/components/GeometriePage.tsx` | New component (created)      |
| `src/App.tsx`                      | New page route + lazy import |
| `src/components/CanvasBoard.tsx`   | New prop + toolbar button    |

---

## 🇷🇴 Română

### Ce s-a adăugat

O pagină separată **Figuri geometrice** (`GeometriePage`) cu desene SVG și formule pentru curriculum-ul de matematică din școala românească. Se deschide prin butonul △ din toolbar.

### Secțiuni

- **Figuri plane** — 10 figuri cu formule de arie și perimetru
- **Corpuri geometrice** — 8 solide cu arie laterală, totală și volum

### Coduri de culori în SVG-uri

| Culoare         | Semnificație                    |
| --------------- | ------------------------------- |
| Albastru închis | Conturul figurii                |
| Roșu            | Înălțimi și altitudini          |
| Verde           | Diagonale, linii mijlocii       |
| Chihlimbar      | Arce de unghi și etichete unghi |
| Gri punctat     | Linii ascunse / de construcție  |

### Layout

Grila responsivă (`auto-fill minmax 200px`) se adaptează automat de la ecrane mici la desktop. Fiecare card are antet colorat (culoare distinctă per familie de figuri), desen SVG și formule.

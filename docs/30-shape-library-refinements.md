# Commit 30 — Shape Library Refinements (commits 58a1e6b → e5aedb1)

## 🇬🇧 English

### Overview

A series of iterative improvements to the geometric shape library made across four commits
after the initial GeomStyle launch, covering visual fidelity, curriculum completeness, and
UX polish.

---

### 30-A — 3D Solid SVGs redrawn to textbook reference style (58a1e6b)

The 3D shape SVGs in the **Geometry reference page** were redrawn to match standard Romanian
textbook conventions:

| Shape             | What changed                                                                   |
| ----------------- | ------------------------------------------------------------------------------ |
| Cub / Paralipiped | Visible edges blue solid, hidden edges gray dashed, space diagonals red dashed |
| Sferă             | Front/back equator halves distinguished; red diameter A-O-B with dot           |
| Cilindru          | Axis O′-O red dashed; top radius + centre dots in red                          |
| Con               | Axis V-O red dashed; base radius red solid; G label (centre of gravity)        |
| Trunchi de con    | Both base centres with red dots; red dashed axis                               |
| Piramidă          | Centre O with red dot; apothem to M; height h labelled                         |

All 3D solids now show full vertex label sets (A, B, C, D, A′, B′, C′, D′, V, O, M) using
a shared `VLbl` helper function.

---

### 30-B — All grades 1-12 figures added to canvas shape picker (4ddb2a7)

Eight new `GeomKind` values were added, completing the school curriculum from grade 1 to 12:

| New kind          | Shape                       | Curriculum level |
| ----------------- | --------------------------- | ---------------- |
| `circle-geom`     | Cerc (canvas version)       | gr. 5            |
| `square-geom`     | Pătrat (canvas version)     | gr. 3            |
| `rect-geom`       | Dreptunghi (canvas version) | gr. 3            |
| `ellipse`         | Elipsă                      | gr. 11           |
| `pyramid-tri`     | Piramidă triunghiulară      | gr. 8            |
| `prism-sq`        | Prismă patrulateră          | gr. 8            |
| `frustum-pyramid` | Trunchi de piramidă         | gr. 9            |
| `frustum-cone`    | Trunchi de con              | gr. 10           |

Shared decoration helpers were added to `shapes/index.ts`:

```typescript
decVertex(ctx, label, x, y, fontSize); // letter label near a vertex
decDot(ctx, x, y); // filled circle (centre point)
decAxis(ctx, x1, y1, x2, y2); // red dashed axis line (3D)
decRed(ctx, x1, y1, x2, y2); // red solid segment
```

All shapes gained vertex labels (A, B, C, D…) and respond to all four `GeomStyle` flags.

---

### 30-C — Shape library refined for curriculum accuracy (6cc4905)

**Shapes added:**

| Kind         | Name (RO)              | Why added                                 |
| ------------ | ---------------------- | ----------------------------------------- |
| `tri-acute`  | Triunghi ascuțitunghic | Distinct from equilateral/right — gr. 5-6 |
| `tri-obtuse` | Triunghi obtuzunghic   | Completes the triangle family             |
| `kite`       | Zmeu / Deltoid         | Quadrilateral family — gr. 7              |
| `parabola`   | Parabolă               | Conics — gr. 11                           |
| `hyperbola`  | Hiperbolă              | Conics — gr. 12                           |

**Shapes removed:** `heptagon` (not in curriculum), `tetrahedron` (redundant with `pyramid-tri`).

**Canvas improvements:**

- Color palette: 10 distinct colors on a 5×2 grid; white gets an inner shadow so it's visible
  on a white background
- Eraser size now tracks the pen-size buttons (5/10/20/40 px radius) instead of a fixed size
- Eraser cursor circle resizes with pen size

---

### 30-D — Bigger shape icons with text labels in picker (e5aedb1 + 15f5c59)

**Icon size:** 40 → 48 px per button.

**Text label:** Each button now shows the shape name below the icon:

```tsx
<div style={{ fontSize: 9, marginTop: 2, textAlign: 'center' }}>{shape.label}</div>
```

This eliminates the need to hover for a tooltip — all shapes are immediately identifiable.

**Panel min-width** raised from 280 → 320 px to accommodate the wider buttons.

**Label visibility fixes (15f5c59):**

```typescript
// Before: unbounded — could reach 28px+ on large shapes
const fs = Math.min(hw, hh) * 0.13;

// After: capped at 16px
const fs = Math.min(16, Math.min(hw, hh) * 0.13);

// vs offset: clamp to 10-15px (was min 5, too small)
const vs = Math.max(10, Math.min(15, fs * 1.2));
```

Also fixed:

- Parallelogram `a` label moved outside the left edge (was inside the shape)
- Parabola focus formula: `aP` instead of `Math.abs(aP)` so F plots above the vertex
- Right triangle C vertex shifted left by `vs` to clear the corner edge

---

## 🇷🇴 Română

### Rezumat

O serie de îmbunătățiri iterative aduse bibliotecii de forme geometrice după lansarea inițială a GeomStyle:

**58a1e6b** — SVG-urile corpurilor 3D redesenate în stilul manualelor (muchii vizibile/ascunse distincte, axe roșii, etichete vârfuri complete).

**4ddb2a7** — 8 forme noi pentru clasele 1-12: elipsă, piramidă triunghiulară, prismă patrulateră, trunchi de piramidă/con, cerc/pătrat/dreptunghi pentru canvas. Toți itemii au etichete vârfuri și răspund la cele 4 toggle-uri GeomStyle.

**6cc4905** — 5 forme adăugate (triunghi ascuțitunghic/obtuzunghic, zmeu, parabolă, hiperbolă), 2 eliminate (heptagon, tetraedru). Paletă de culori îmbunătățită, guma de șters urmărește dimensiunea stiloului.

**e5aedb1 + 15f5c59** — Iconițe mai mari (48px), etichete text sub fiecare formă, lățime panou 320px. Dimensiunea fontului pentru etichete limitată la 16px, offset-ul `vs` limitat la 10-15px, poziționare fixată pentru paralelogram, parabolă și triunghi dreptunghic.

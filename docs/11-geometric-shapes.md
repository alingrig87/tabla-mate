# Commit 11 — 37 Geometric Shapes with Oblique 3D Projection

## 🇬🇧 English

### Requirements

Mathematics students need precise geometric shapes beyond simple lines and circles:

- 28 flat shapes: line types (segment, ray, angle), triangles, quadrilaterals, regular polygons, circles
- 9 solid 3D shapes: cube, cuboid, prisms, pyramid, tetrahedron, cone, cylinder, sphere
- Hidden edges drawn as dashed lines on 3D shapes
- Shapes panel with grouped thumbnails, each showing a live mini-canvas preview
- Same drag-to-place interaction as other shape tools

### What Was Implemented

**New file: `src/shapes/index.ts`**

- `GeomKind` — union type of 37 shape name strings
- `GeomItem` — `DrawItem` variant with `kind: 'geom'` + `geomKind: GeomKind`
- `SHAPE_GROUPS` — data-driven array for the panel UI (6 groups, 37 shapes)
- `drawGeom()` — main dispatch function, draws any shape given a bounding box
- `drawGeomPreview()` — wraps `drawGeom` with `globalAlpha + setLineDash` for drag preview
- Helper functions: `poly()`, `regularPts()`, `arrowHead()`, `rightAngleMark()`, `ob()`, `face3()`

**Updated `CanvasBoard.tsx`:**

- Import from `../shapes`
- `GeomItem` added to `DrawItem` union
- `drawItem` new `case 'geom'`
- `hitTest` new `case 'geom'` (bounding-box test)
- `drawHighlight` new `case 'geom'`
- `redrawAll` accepts optional `geomPreview` parameter
- `ShapeIcon` mini-canvas component (renders one shape at 40×40 px)
- `activeGeom` state + `activeGeomRef` (selected shape kind)
- `showShapes` panel state
- Geom handling in `pointerDown`, `pointerMove`, `pointerUp`
- `IconShapes` SVG icon + Shapes button in toolbar
- Shapes panel JSX with `SHAPE_GROUPS` loop + `ShapeIcon` buttons

### Concepts Explained

#### `src/shapes/index.ts` — a dedicated module

The shapes library is extracted to its own file rather than staying in `CanvasBoard.tsx`.
This keeps the main component file from growing to 2000+ lines and makes the shapes
independently importable (e.g., for thumbnail rendering).

```typescript
// src/shapes/index.ts exports:
export type GeomKind = 'segment' | 'ray' | ... ; // 37 names
export interface GeomItem { kind: 'geom'; geomKind: GeomKind; ... }
export const SHAPE_GROUPS: ShapeGroup[];
export function drawGeom(ctx, kind, color, lw, x1, y1, x2, y2): void;
export function drawGeomPreview(ctx, kind, color, lw, x1, y1, x2, y2): void;
```

#### Canvas path API for complex polygons

Every shape is drawn using the Canvas 2D path primitives:

```typescript
// poly() — draw a closed polygon through an array of [x,y] points
function poly(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath(); // draws the final line back to start
  ctx.stroke();
}

// Usage:
poly(ctx, [
  [cx, T],
  [R, B],
  [L, B],
]); // isosceles triangle
```

`closePath()` draws a straight line back to the last `moveTo` point — equivalent to
`lineTo(pts[0][0], pts[0][1])` but guaranteed to connect cleanly at the join.

#### `regularPts(n, cx, cy, r, offset)` — regular polygon vertices

```typescript
function regularPts(n, cx, cy, r, offset = 0): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (2 * Math.PI * i) / n; // angle for vertex i
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

// Pentagon (5 vertices, starting at top = -π/2):
poly(ctx, regularPts(5, cx, cy, r, -Math.PI / 2));
```

The formula divides the full circle (2π radians) into `n` equal parts. `offset` rotates
the shape — `-Math.PI/2` starts at the top (12 o'clock) instead of the right (3 o'clock).

`Array.from({ length: n }, mapFn)` creates an array of `n` elements by calling `mapFn(undefined, index)` for each index. Equivalent to a `for` loop building an array.

#### Oblique projection for 3D shapes

3D shapes are drawn using **oblique (cabinet) projection** — a classic technical drawing
technique that approximates 3D without a full 3D matrix:

```
screen_x = local_x + local_z × DX
screen_y = local_y - local_z × DY
```

Where `DX = 0.65` and `DY = 0.38` give a right-and-up 30° perspective depth direction.

```typescript
const DX = 0.65,
  DY = 0.38;

// ob(ox, oy, lx, ly, lz): local coords → screen coords
function ob(ox, oy, lx, ly, lz): [number, number] {
  return [ox + lx + lz * DX, oy + ly - lz * DY];
}

// Cube: 8 vertices, front face at lz=0, back face at lz=depth
const frontTopLeft = ob(cx, cy, -s, -s, 0);
const backTopLeft = ob(cx, cy, -s, -s, s * 2);
```

Oblique projection preserves true shape on the front face (no foreshortening), making
it easy to draw accurate cross-sections for mathematical diagrams.

#### `ShapeIcon` — mini-canvas component

```tsx
function ShapeIcon({ kind }: { kind: GeomKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    c.width = 40 * dpr;
    c.height = 40 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 40, 40);
    drawGeom(ctx, kind, '#333', 1.5, 4, 4, 36, 36);
  }, [kind]);
  return <canvas ref={ref} style={{ width: 40, height: 40 }} />;
}
```

Each `ShapeIcon` is a React component that renders a `<canvas>` and draws the shape
in a `useEffect`. The `useEffect` runs after mount (when `ref.current` is populated)
and whenever `kind` changes. This pattern — "render a canvas, draw in useEffect" — is
the standard way to imperatively draw into a React-managed canvas element.

#### `SHAPE_GROUPS` — data-driven UI

```typescript
export const SHAPE_GROUPS: ShapeGroup[] = [
  {
    label: 'Linii & Unghiuri',
    shapes: [
      { kind: 'segment', label: 'Segment' },
      { kind: 'ray', label: 'Semidreaptă' },
      { kind: 'angle', label: 'Unghi' },
    ],
  },
  // ... 5 more groups
];
```

The panel UI is generated entirely from this data array — no hardcoded JSX per shape:

```tsx
{
  SHAPE_GROUPS.map((group) => (
    <div key={group.label}>
      <div>{group.label}</div>
      {group.shapes.map(({ kind, label }) => (
        <button key={kind} onClick={() => setActiveGeom(kind)}>
          <ShapeIcon kind={kind} />
        </button>
      ))}
    </div>
  ));
}
```

Adding a new shape requires only adding one entry to `SHAPE_GROUPS` and a case in
`drawGeom` — the UI, thumbnails, and tooltips update automatically.

---

## 🇷🇴 Română

### Cerințe

Elevii de matematică au nevoie de forme geometrice precise:

- 28 forme plane: linii, triunghiuri, patrulater, poligoane regulate, cercuri
- 9 corpuri 3D: cub, paralelipiped, prisme, piramidă, tetraedru, con, cilindru, sferă
- Muchiile ascunse desenate cu linii întrerupte
- Panou cu thumbnails grupate, fiecare cu preview mini-canvas live

### Ce s-a implementat

**Fișier nou: `src/shapes/index.ts`**

- `GeomKind` — tip union cu 37 de nume de forme
- `GeomItem` — variantă `DrawItem` cu `kind: 'geom'` + `geomKind: GeomKind`
- `SHAPE_GROUPS` — array data-driven pentru UI-ul panoului
- `drawGeom()` — funcție principală de dispatch, desenează orice formă după bounding box
- `drawGeomPreview()` — înfășoară `drawGeom` cu `globalAlpha + setLineDash` pentru preview drag
- Funcții helper: `poly()`, `regularPts()`, `arrowHead()`, `rightAngleMark()`, `ob()`, `face3()`

### Concepte explicate

#### Canvas path API pentru poligoane complexe

```typescript
function poly(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  ctx.stroke();
}
```

`closePath()` desenează linia finală înapoi la punctul de start — garantează o
joncțiune curată la colț.

#### `regularPts(n, cx, cy, r, offset)` — vârfurile poligonului regulat

```typescript
const a = offset + (2 * Math.PI * i) / n; // unghi pentru vârful i
return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
```

Formula împarte cercul complet (2π radiani) în `n` părți egale. `offset = -Math.PI/2`
rotește forma astfel încât să înceapă sus (ora 12) în loc de dreapta (ora 3).

#### Proiecție oblică pentru corpuri 3D

```
screen_x = local_x + local_z × 0.65
screen_y = local_y - local_z × 0.38
```

Tehnica clasică de desen tehnic — aproximează 3D fără matrice complete. Păstrează
forma adevărată pe fața din față, ceea ce facilitează cross-secțiuni precise pentru
diagrame matematice.

#### `ShapeIcon` — componentă mini-canvas

```tsx
function ShapeIcon({ kind }: { kind: GeomKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Desenăm în canvas după montare
    drawGeom(ctx, kind, '#333', 1.5, 4, 4, 36, 36);
  }, [kind]);
  return <canvas ref={ref} style={{ width: 40, height: 40 }} />;
}
```

Pattern standard: `<canvas>` React-managed, desenare imperativă în `useEffect`.

#### `SHAPE_GROUPS` — UI data-driven

UI-ul panoului este generat complet din array-ul de date — fără JSX hardcodat per formă.
Adăugarea unei forme noi necesită doar o intrare în `SHAPE_GROUPS` și un `case` în `drawGeom`.

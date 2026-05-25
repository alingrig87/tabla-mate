# Commit 05 — Shape Tools: Line, Rectangle, Ellipse with Live Preview

## 🇬🇧 English

### Requirements

Beyond freehand drawing, users need precise geometric shapes:

- **Line**: drag from point A to point B
- **Rectangle**: drag to define bounding box
- **Ellipse / Circle**: drag to define bounding box (ellipse fitted inside)
- **Live preview**: see the shape while dragging, before releasing
- Ignore accidental micro-drags (< 3px) that look like misclicks

### What Was Implemented

**New types:** `ShapeItem` (stores two corner points `x1,y1,x2,y2`), `ShapePreview`

**New functions:**

- `drawShapePreview()` — dashed ghost shape during drag
- Updated `redrawAll()` — accepts optional `preview` parameter

**Updated `pointerDown/Move/Up`** to dispatch on `toolRef.current`:

- Shapes record drag start in `startRef`
- Preview redraws on every `pointerMove`
- Final shape committed on `pointerUp`

**New state:** `tool: PenTool` + `toolRef` (toolbar wired in commit 07)

### Concepts Explained

#### The drag interaction pattern

Every shape tool follows the same three-step dance:

```
pointerDown  →  record startRef = current position
pointerMove  →  redrawAll(items) + drawPreview(start → current)
pointerUp    →  commit new ShapeItem(start, end) to items list
```

This pattern is used by all professional drawing apps (Figma, Photoshop, etc.). The key insight:
the preview is **ephemeral** (not stored) — only the final item is committed.

#### `startRef` — why a ref, not state

```typescript
const startRef = useRef<Point>({ x: 0, y: 0 });
// Set in pointerDown:
startRef.current = pos;
// Read in pointerMove and pointerUp:
const { x: x1, y: y1 } = startRef.current;
```

`startRef` needs to be readable in pointer event handlers without causing re-renders. Using
`useState` would work but waste renders. A `useRef` updates instantly and never triggers React.

#### `ctx.setLineDash([6, 4])` — dashed preview line

```typescript
ctx.setLineDash([6, 4]); // 6px drawn, 4px gap, repeating
ctx.strokeRect(x1, y1, w, h);
```

`setLineDash` takes an array of alternating drawn/gap lengths. After drawing, call
`ctx.setLineDash([])` (or `ctx.save()/restore()`) to reset to a solid line.

The dashed style signals "this is a preview, not a committed shape."

#### `ctx.strokeRect(x, y, width, height)`

Strokes a rectangle in one call. Width/height can be negative (if the user drags
up-left rather than down-right) — `strokeRect` handles that correctly.

Equivalent to:

```typescript
ctx.beginPath();
ctx.rect(x, y, width, height);
ctx.stroke();
```

#### `ctx.ellipse(cx, cy, rx, ry, rotation, startAngle, endAngle)`

Draws an ellipse (or circle if rx === ry). Parameters:

```typescript
ctx.ellipse(
  cx,
  cy, // center point
  rx || 1, // x-radius (|| 1 prevents zero-radius error)
  ry || 1, // y-radius
  0, // rotation in radians
  0, // start angle (0 = 3 o'clock)
  Math.PI * 2 // end angle (full circle)
);
ctx.stroke();
```

We calculate the center from the two drag corners:

```typescript
const cx = (x1 + x2) / 2;
const cy = (y1 + y2) / 2;
const rx = Math.abs(x2 - x1) / 2;
const ry = Math.abs(y2 - y1) / 2;
```

#### Ignoring tiny drags

```typescript
if (Math.abs(pos.x - x1) < 3 && Math.abs(pos.y - y1) < 3) {
  redrawAll(ctx, items); // clear preview, nothing committed
  return;
}
```

A drag smaller than 3 CSS pixels is likely a misclick, not an intentional shape. We discard it
and wipe the preview. Without this, every click would create a zero-size shape.

#### Tool state: `tool` + `toolRef`

```typescript
const [tool, setTool] = useState<PenTool>('pen');
const toolRef = useRef<PenTool>('pen');

useEffect(() => {
  toolRef.current = tool; // keep ref in sync when state changes
}, [tool]);
```

We need both:

- `tool` (state) — for React re-renders (e.g., to highlight the active toolbar button)
- `toolRef` (ref) — for pointer event handlers that need the current value instantly

This is the same dual pattern as `items`/`itemsRef` from commit 04.

---

## 🇷🇴 Română

### Cerințe

Pe lângă desenul liber, utilizatorii au nevoie de forme geometrice precise:

- **Linie, Dreptunghi, Elipsă**: drag pentru a defini forma
- **Preview live**: utilizatorul vede forma în timp ce trage, înainte să elibereze
- Ignorarea micro-drag-urilor accidentale (< 3px)

### Ce s-a implementat

Tipuri noi: `ShapeItem` (stochează colțurile `x1,y1,x2,y2`), `ShapePreview`.

Funcție nouă `drawShapePreview()` cu linie întreruptă (dashed). `redrawAll()` acceptă acum un
parametru opțional `preview`. Pointer events actualizate pentru a dispatch pe `toolRef.current`.

### Concepte explicate

#### Pattern-ul interacțiunii drag

Fiecare tool de formă urmează același dans în trei pași:

```
pointerDown  →  înregistrăm startRef = poziția curentă
pointerMove  →  redrawAll(items) + drawPreview(start → current)
pointerUp    →  commit ShapeItem(start, end) în lista de items
```

Preview-ul este **efemer** (nu se stochează) — doar itemul final se comite.

#### `ctx.setLineDash([6, 4])` — linie întreruptă pentru preview

```typescript
ctx.setLineDash([6, 4]); // 6px desenat, 4px spațiu, repetat
```

Linia întreruptă semnalează „aceasta este un preview, nu o formă comisă".

#### `ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)`

Desenăm o elipsă calculând centrul și razele din cele două colțuri drag:

```typescript
const cx = (x1 + x2) / 2; // centru X
const cy = (y1 + y2) / 2; // centru Y
const rx = Math.abs(x2 - x1) / 2; // raza X
const ry = Math.abs(y2 - y1) / 2; // raza Y
```

#### Starea tool-ului: `tool` + `toolRef`

Avem nevoie de ambele: `tool` (state) pentru re-render-urile React (ex: evidențierea butonului
activ din toolbar), `toolRef` (ref) pentru event handler-ele de pointer care au nevoie de
valoarea curentă instant.

# Commit 10 — Smart Eraser with Geometry Hit-Detection

## 🇬🇧 English

### Requirements

The eraser must be precise — it should remove entire drawing items by clicking on them:

- Moving the eraser over an item shows a **red highlight** preview
- Clicking an item **removes it** entirely (not pixel-level erasing)
- Dragging the eraser removes multiple items in one sweep
- The entire drag counts as **one undo entry** (not one per erased item)
- Custom circular cursor replaces the default arrow when eraser is active

### What Was Implemented

**New module-level functions:**

- `distSeg(px, py, ax, ay, bx, by)` — point-to-segment distance via parametric projection
- `hitTest(item, px, py, tol)` — per-shape hit detection (pen polyline, shapes, text)
- `drawHighlight(ctx, item)` — translucent red overlay drawn on top of the hovered item

**New eraser state in component:**

- `eraserPos` — screen position driving the CSS circle cursor
- `hoveredIdxRef` — index of currently highlighted item (−1 = none)
- `preEraseSnapshotRef` — items snapshot taken at start of drag (for single undo entry)

**New eraser helper functions:**

- `findTopHit(px, py)` — finds topmost item under cursor
- `updateEraserHover(pos)` — updates highlight without committing
- `eraseAt(pos)` — removes topmost hit item, updates `itemsRef` directly

**Updated pointer handlers:**

- `pointerMove` — dispatches to eraser path first (updates cursor + hover/erase)
- `pointerDown` — starts erase session, clears `preEraseSnapshotRef`
- `pointerUp` — commits single undo entry from the saved snapshot
- `pointerLeave` — clears hover highlight and cursor on canvas exit

### Concepts Explained

#### Point-to-segment distance — parametric projection

To hit-test a pen stroke (a polyline of many segments), we need the distance from the
cursor to each segment. The formula uses **parametric projection**:

```typescript
function distSeg(px, py, ax, ay, bx, by): number {
  const dx = bx - ax,
    dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay); // degenerate: segment is a point

  // t: where on the segment is the closest point? (0 = at A, 1 = at B)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));

  // Closest point on segment: A + t*(B-A)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
```

The dot product `((px-ax)*dx + (py-ay)*dy) / len2` projects the cursor onto the line
through A→B. Clamping `t` to `[0, 1]` ensures we stay on the segment, not the infinite
line. The result is the Euclidean distance to the closest point on the segment.

#### Hit-test per shape type

Each shape type uses a different geometric test:

| Shape            | Hit test strategy                                     |
| ---------------- | ----------------------------------------------------- |
| `pen` (polyline) | Distance to each segment < `tol + lineWidth/2`        |
| `line`           | Single `distSeg` call                                 |
| `rect`           | Distance to any of the 4 edges                        |
| `circle`         | Normalized ellipse equation — distance from perimeter |
| `text`           | AABB (axis-aligned bounding box) approximation        |

The ellipse test:

```typescript
// Normalize: map the ellipse to a unit circle
const dx = (px - cx) / rx,
  dy = (py - cy) / ry;
// Distance from the ellipse perimeter ≈ |√(dx²+dy²) - 1| × min(rx, ry)
Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry) < tol + item.width / 2;
```

For a point exactly on the ellipse, `√(dx²+dy²) = 1`, so the expression is `0 × minR = 0`.

#### Custom cursor — `cursor: none` + positioned `<div>`

```typescript
// Canvas: hide the default cursor
cursor: tool === 'eraser' ? 'none' : 'crosshair'

// Custom circle overlay:
{tool === 'eraser' && eraserPos && (
  <div style={{
    position: 'fixed',
    left: eraserPos.x - ERASER_RADIUS,  // center the circle on the cursor
    top:  eraserPos.y - ERASER_RADIUS,
    width:  ERASER_RADIUS * 2,
    height: ERASER_RADIUS * 2,
    borderRadius: '50%',
    border: '2px solid #ef4444',
    background: 'rgba(239,68,68,0.08)',
    pointerEvents: 'none',  // don't block pointer events on the canvas
  }} />
)}
```

`pointerEvents: none` on the overlay div is critical — without it, the div would
intercept pointer events, preventing `onPointerMove` on the canvas from firing.

The circle position is updated in `pointerMove`:

```typescript
setEraserPos({ x: sp.x, y: sp.y }); // screen coords for CSS position:fixed
```

#### One undo entry for an entire erase drag

```typescript
const preEraseSnapshotRef = useRef<DrawItem[] | null>(null);

// pointerDown (eraser):
preEraseSnapshotRef.current = null; // start fresh session

// eraseAt():
if (!preEraseSnapshotRef.current) {
  preEraseSnapshotRef.current = itemsRef.current; // save snapshot ONCE at drag start
}
itemsRef.current = itemsRef.current.filter((_, i) => i !== idx); // remove item

// pointerUp (eraser):
if (preEraseSnapshotRef.current !== null) {
  undoRef.current.push(preEraseSnapshotRef.current); // push ONE snapshot
  setItems(itemsRef.current); // commit final state to React
}
```

Without this pattern, erasing 5 items in one drag would push 5 entries to the undo
stack, requiring 5 Ctrl+Z presses to undo a single gesture. Instead, one Ctrl+Z
restores all items erased in the drag.

#### `drawHighlight` — red overlay using `globalAlpha`

```typescript
function drawHighlight(ctx, item) {
  ctx.save();
  ctx.globalAlpha = 0.55; // 55% opacity — original is still visible underneath
  ctx.strokeStyle = '#ef4444'; // red
  ctx.lineWidth = item.width + 6; // slightly thicker than original
  // ... draw the same shape path
  ctx.restore();
}
```

`globalAlpha` sets the opacity for all subsequent drawing operations until `ctx.restore()`.
It stacks: if the canvas already has a shape at 100% opacity, drawing with `globalAlpha = 0.55`
renders the highlight at 55% on top — the user sees both.

#### Updating `itemsRef` directly during erase (without `setItems`)

```typescript
// In eraseAt():
itemsRef.current = next; // ← direct ref mutation, no React re-render
redrawAll(getCtx(), next); // ← immediate canvas update
```

During a drag, calling `setItems(next)` on every erased item would cause many React
re-renders per frame — slow and visually glitchy. Instead we:

1. Mutate `itemsRef.current` directly (like a regular JS variable)
2. Call `redrawAll` imperatively to update the canvas immediately
3. Call `setItems(itemsRef.current)` **once** in `pointerUp` to sync React state

This is the trade-off of the dual `items`/`itemsRef` pattern: use `itemsRef` for
performance-critical imperative updates; use `setItems` to trigger React re-renders
when the UI needs to reflect the change.

---

## 🇷🇴 Română

### Cerințe

Radiera trebuie să fie precisă — elimină întregi items de desen la click:

- Hover peste un item → **evidențiere roșie** preview
- Click → item **eliminat** complet (nu ștergere la nivel de pixel)
- Drag → elimină mai multe items într-o singură mișcare
- Întregul drag = **o singură intrare undo** (nu câte una per item șters)
- Cursor circular custom când radiera este activă

### Ce s-a implementat

**Funcții noi la nivel de modul:**

- `distSeg()` — distanța de la un punct la un segment (proiecție parametrică)
- `hitTest()` — detecție per tip de formă (polilinii pen, forme geometrice, text)
- `drawHighlight()` — overlay roșu translucent peste itemul hoverat

**State nou în componentă:**

- `eraserPos` — poziția ecran care conduce cercul CSS cursor
- `hoveredIdxRef` — indexul itemului evidențiat curent (-1 = niciunul)
- `preEraseSnapshotRef` — snapshot la începutul drag-ului (pentru o singură intrare undo)

### Concepte explicate

#### Distanța punct-la-segment — proiecție parametrică

```typescript
function distSeg(px, py, ax, ay, bx, by): number {
  const dx = bx - ax,
    dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay); // segment degenerat

  // t: unde pe segment se află cel mai apropiat punct? (0=la A, 1=la B)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
```

Produsul scalar proiectează cursorul pe dreapta A→B. Fixarea lui `t` la `[0,1]`
ne menține pe segment. Rezultatul este distanța euclidiană la cel mai apropiat punct.

#### Cursor custom — `cursor: none` + `<div>` poziționat

```typescript
// Canvas: ascunde cursorul implicit
cursor: tool === 'eraser' ? 'none' : 'crosshair'

// Cerc overlay:
<div style={{
  position: 'fixed',
  left: eraserPos.x - ERASER_RADIUS,
  top: eraserPos.y - ERASER_RADIUS,
  width: ERASER_RADIUS * 2,
  height: ERASER_RADIUS * 2,
  borderRadius: '50%',
  border: '2px solid #ef4444',
  pointerEvents: 'none', // nu bloca evenimentele pe canvas
}} />
```

`pointerEvents: none` pe div-ul overlay este critic — fără el, div-ul ar intercepta
evenimentele de pointer, prevenind `onPointerMove` pe canvas.

#### O singură intrare undo pentru un drag complet de ștergere

```typescript
// La începutul drag-ului: snapshot salvat O SINGURĂ DATĂ
if (!preEraseSnapshotRef.current) {
  preEraseSnapshotRef.current = itemsRef.current;
}

// La pointerUp: push UN SINGUR snapshot în undoRef
undoRef.current.push(preEraseSnapshotRef.current);
setItems(itemsRef.current); // sincronizare React la final
```

Fără acest pattern, ștergerea a 5 items ar împinge 5 intrări în stiva undo —
necesitând 5 apăsări Ctrl+Z pentru a anula un singur gest.

#### Actualizarea `itemsRef` direct (fără `setItems`)

În `eraseAt()`, mutăm `itemsRef.current` direct și apelăm `redrawAll` imperativ.
Aceasta evită re-render-urile React la fiecare item șters în drag.
Apelăm `setItems` o singură dată în `pointerUp` pentru a sincroniza state-ul React.

# Commit 12 — Infinite Canvas with Pan, Zoom, and Move Tool

## 🇬🇧 English

### Requirements

A whiteboard needs to feel infinite — students should be able to draw anywhere:

- **Two-finger scroll** (trackpad) pans the canvas
- **Pinch-to-zoom** (trackpad) or **Ctrl+Wheel** (mouse) zooms centered on the cursor
- **Move tool** in the toolbar enables drag-to-pan with grab/grabbing cursor
- **Zoom controls** on the right edge: zoom-in, zoom-%, zoom-out, reset-view buttons
- All existing tools (pen, shapes, text, eraser) work correctly at any zoom and pan
- Hit-testing for the eraser stays accurate regardless of zoom level

### What Was Implemented

**Updated `redrawAll()`:**

- New parameters: `pan: Point` and `scale: number`
- Uses `ctx.resetTransform()` to clear, then `ctx.scale(dpr * scale, dpr * scale)` + `ctx.translate(-pan.x, -pan.y)` to set the world transform
- The world transform stays active after the function returns — incremental pen strokes drawn immediately after draw correctly in world space

**New state in component:**

- `panRef` — world-coordinate position of the viewport top-left corner
- `scaleRef` — current zoom factor (1 = 100%)
- `zoom` — state mirror of `scaleRef` for React re-renders (drives the % display)
- `isPanningRef` / `isPanning` — tracks whether a pan drag is in progress (drives `grab`/`grabbing` cursor)
- `panStartRef` — screen position at the start of a pan drag
- `panOriginRef` — `panRef.current` value at the start of a pan drag

**New component-scoped `redraw()` helper:**

- Wraps `redrawAll` with current `panRef.current` / `scaleRef.current`
- Replaces all internal `redrawAll(...)` call sites

**New functions:**

- `applyZoom(newScale, cx, cy)` — zoom centered on screen point (cx, cy)
- `zoomIn()` / `zoomOut()` — snap to nearest `ZOOM_STEPS` level toward viewport centre
- `resetView()` — pan = (0,0), scale = 1

**New `useEffect` — wheel event:**

- `ctrlKey` → zoom (pinch or Ctrl+Wheel)
- otherwise → pan (trackpad scroll or mouse wheel)
- Registered with `{ passive: false }` to allow `preventDefault()`

**Updated `getPos()`:**

```typescript
x: s.x / scaleRef.current + panRef.current.x;
y: s.y / scaleRef.current + panRef.current.y;
```

**Updated `findTopHit()`:**

- Tolerance = `ERASER_RADIUS / scaleRef.current` (world units) so the eraser circle stays a constant size in screen pixels at all zoom levels

**New JSX:**

- `IconMove`, `IconZoomIn`, `IconZoomOut`, `IconHome` — inline SVG icons
- Move button in toolbar + `grab`/`grabbing` cursor on canvas
- Zoom controls vertical pill on the right edge
- `ZOOM_STEPS` constant: `[0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4]`

---

### Concepts Explained

#### World coordinates vs screen coordinates

The canvas has two coordinate systems:

| System     | Origin                             | Unit       | Used for                     |
| ---------- | ---------------------------------- | ---------- | ---------------------------- |
| **Screen** | canvas top-left                    | CSS pixel  | pointer events, CSS overlays |
| **World**  | canvas origin at scale=1 pan=(0,0) | world unit | stored items, hit-testing    |

Conversion formulas:

```
screen → world:   world = screen / scale + pan
world → screen:   screen = (world − pan) × scale
```

At scale=1, pan=(0,0) they are identical. When zoomed in (scale=2) and panned (pan=(100,50)):
a world point at (150, 80) appears at screen position ((150−100)×2, (80−50)×2) = (100, 60) CSS pixels.

#### Canvas transform stack: `resetTransform`, `scale`, `translate`

```typescript
ctx.resetTransform(); // identity matrix — device pixels
ctx.clearRect(0, 0, canvas.width, canvas.height); // clear physical pixels
ctx.scale(dpr * scale, dpr * scale); // 1. apply DPR + zoom
ctx.translate(-pan.x, -pan.y); // 2. apply pan offset
// From here, drawing at world (wx, wy) places pixels at:
//   physical_x = (wx − pan.x) × dpr × scale
```

Why **scale before translate**? In canvas 2D the matrix accumulates left-to-right.
`scale(s); translate(-px, -py)` builds matrix:

```
| s   0   -s·px |
| 0   s   -s·py |
| 0   0    1    |
```

A world point `(wx, wy)` maps to `((wx − px)·s, (wy − py)·s)` device pixels — correct.

If you reversed the order (`translate` then `scale`), the translation would be in
device pixels instead of world units, giving the wrong result when zoomed.

#### Zoom centered on the cursor — keeping the pivot point fixed

When zooming, the point under the cursor should stay under the cursor.
Mathematically: the world point at the cursor must remain at the same screen position.

```
Before zoom:  world_x = screen_x / oldScale + oldPan.x
After zoom:   world_x = screen_x / newScale + newPan.x

Setting them equal:
  newPan.x = screen_x / oldScale + oldPan.x − screen_x / newScale
```

```typescript
function applyZoom(newScale: number, cx: number, cy: number) {
  const oldScale = scaleRef.current;
  const oldPan = panRef.current;
  scaleRef.current = newScale;
  panRef.current = {
    x: cx / oldScale + oldPan.x - cx / newScale,
    y: cy / oldScale + oldPan.y - cy / newScale,
  };
}
```

Without this correction, zooming would always zoom toward the origin (0,0),
not toward the cursor — a disorienting experience.

#### `WheelEvent.ctrlKey` — detecting pinch-to-zoom on trackpads

Trackpad gesture handling in browsers:

| Gesture            | `ctrlKey` | `deltaX`          | `deltaY`        |
| ------------------ | --------- | ----------------- | --------------- |
| Two-finger scroll  | `false`   | horizontal scroll | vertical scroll |
| Pinch-to-zoom      | `true`    | 0                 | zoom delta      |
| Mouse wheel        | `false`   | 0                 | scroll delta    |
| Ctrl + mouse wheel | `true`    | 0                 | zoom delta      |

The browser synthesises `ctrlKey=true` for pinch gestures so the same code
handles both pinch (trackpad) and Ctrl+Wheel (mouse):

```typescript
if (e.ctrlKey) {
  // zoom: deltaY < 0 = pinch-out / zoom in
  const delta = -e.deltaY * 0.005;
  applyZoom(scaleRef.current * (1 + delta), cx, cy);
} else {
  // pan: both deltaX and deltaY contribute
  panRef.current = {
    x: panRef.current.x + e.deltaX / scaleRef.current,
    y: panRef.current.y + e.deltaY / scaleRef.current,
  };
}
```

Pan delta is divided by `scaleRef.current` to convert screen pixels to world units
— so panning always feels like the same physical distance regardless of zoom level.

#### `{ passive: false }` on the wheel listener

```typescript
canvas.addEventListener('wheel', onWheel, { passive: false });
```

By default, `wheel` listeners are passive (they can't call `preventDefault`).
This is a browser optimisation — it lets the browser scroll the page immediately
without waiting for the listener to run. For our canvas, we need `preventDefault()`
to stop the page from scrolling when the user scrolls over it. `passive: false`
opts out of that optimisation.

**Important**: this cannot be done with React's `onWheel` prop — React attaches
wheel listeners as passive by default in React 17+. We must use `addEventListener`
in a `useEffect` with the `{ passive: false }` option.

#### Scale-adjusted eraser tolerance

```typescript
function findTopHit(px: number, py: number): number {
  const tol = ERASER_RADIUS / scaleRef.current; // world-space tolerance
  ...
}
```

`ERASER_RADIUS = 20` is in screen pixels. At scale=2 (zoomed in 2×), 20 screen pixels =
10 world units. At scale=0.5 (zoomed out 2×), 20 screen pixels = 40 world units.

Without the division, the eraser radius would grow 2× in screen size when zoomed in —
the circle overlay (always 20 CSS px) would no longer match the actual hit area.

#### Move tool: pan via pointer drag

```typescript
// pointerDown (move tool):
panStartRef.current = getScreenPos(e); // record start position
panOriginRef.current = { ...panRef.current }; // record pan at drag start

// pointerMove (move tool):
panRef.current = {
  x: panOriginRef.current.x - (sp.x - panStartRef.current.x) / scaleRef.current,
  y: panOriginRef.current.y - (sp.y - panStartRef.current.y) / scaleRef.current,
};
```

Using `panOriginRef` (the pan value at drag start) instead of accumulating deltas
prevents drift — if the pointer teleports (e.g., touch cancel/resume), the canvas
snaps to the correct position rather than accumulating error.

The screen delta is divided by `scaleRef.current` to convert to world units.

#### Why `redrawAll` no longer uses `ctx.save()/ctx.restore()`

Previously:

```typescript
ctx.save();
ctx.resetTransform();
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.restore(); // ← restores old transform
items.forEach(...); // draws with OLD transform
```

The old pattern restored whatever transform existed before `redrawAll` was called.
This was fine when the only transform was the initial `ctx.scale(dpr, dpr)` from
the resize handler.

Now `redrawAll` is the single source of truth for the canvas transform. It sets
`scale(dpr * scale); translate(-pan.x, -pan.y)` and leaves it active. Incremental
pen strokes drawn directly on the context after `redrawAll` inherit the correct
transform automatically — no need to re-apply it per stroke.

Each `drawItem` / `drawShapePreview` still uses its own `ctx.save()/restore()` to
isolate styling (strokeStyle, lineWidth, etc.) from other items.

---

## 🇷🇴 Română

### Cerințe

Un whiteboard trebuie să se simtă infinit:

- **Scroll cu două degete** (trackpad) → pan
- **Pinch-to-zoom** (trackpad) sau **Ctrl+Wheel** (mouse) → zoom centrat pe cursor
- **Tool Move** în toolbar → drag-to-pan cu cursor grab/grabbing
- **Controale zoom** pe marginea dreaptă: zoom-in, procentaj, zoom-out, reset
- Toate toolurile funcționează corect la orice zoom și pan

### Ce s-a implementat

**`redrawAll()` actualizat:**

- Parametri noi: `pan: Point`, `scale: number`
- `ctx.resetTransform()` → șterge, `ctx.scale(dpr * scale, dpr * scale)` + `ctx.translate(-pan.x, -pan.y)` → setează transformul world
- Transformul rămâne activ după funcție — trăsăturile de pen incrementale desenate imediat după sunt corect plasate

**State nou în componentă:**

- `panRef` — poziția world a colțului stânga-sus al viewport-ului
- `scaleRef` — factorul de zoom curent
- `zoom` — oglindă state a `scaleRef` (afișează procentajul)
- `isPanningRef` / `isPanning` — urmărește dacă un drag de pan e în curs (cursor grab/grabbing)

**Helper `redraw()` nou:**

Înfășoară `redrawAll` cu `panRef.current` / `scaleRef.current` curente.
Înlocuiește toate site-urile de apel intern `redrawAll(...)`.

### Concepte explicate

#### Coordonate world vs coordonate ecran

```
ecran → world:   world = ecran / scale + pan
world → ecran:   ecran = (world − pan) × scale
```

La scale=1, pan=(0,0) sunt identice. La zoom 2× și pan (100, 50):
un punct world la (150, 80) apare la ecran ((150−100)×2, (80−50)×2) = (100, 60) px CSS.

#### Transformul canvas: `resetTransform`, `scale`, `translate`

```typescript
ctx.resetTransform();
ctx.clearRect(0, 0, canvas.width, canvas.height); // ștergere în pixeli fizici
ctx.scale(dpr * scale, dpr * scale); // 1. DPR + zoom
ctx.translate(-pan.x, -pan.y); // 2. offset pan
// De acum, desenând la (wx, wy) world → pixeli fizici: (wx − pan.x) × dpr × scale
```

**De ce scale înainte de translate?** Matricea acumulată este:

```
| s   0   -s·px |    → punct world (wx, wy) → screen ((wx−px)·s, (wy−py)·s) ✓
| 0   s   -s·py |
```

Inversând ordinea, translația ar fi în pixeli device, nu în unități world — greșit la zoom.

#### Zoom centrat pe cursor

```typescript
newPan.x = screen_x / oldScale + oldPan.x − screen_x / newScale
```

Punctul world sub cursor trebuie să rămână la aceeași poziție ecran după zoom.

#### `WheelEvent.ctrlKey` — detectarea pinch-to-zoom pe trackpad

Browserul sintetizează `ctrlKey=true` pentru gesturile de pinch pe trackpad.
Același cod tratează atât pinch (trackpad) cât și Ctrl+Wheel (mouse).

```typescript
canvas.addEventListener('wheel', onWheel, { passive: false });
// { passive: false } necesar pentru a putea apela e.preventDefault()
```

React atașează listener-ele `onWheel` ca pasive implicit în React 17+ —
trebuie să folosim `addEventListener` direct cu `{ passive: false }`.

#### Toleranța radierului ajustată la zoom

```typescript
const tol = ERASER_RADIUS / scaleRef.current; // toleranță în spațiu world
```

`ERASER_RADIUS = 20` px ecran. La scale=2, 20 px ecran = 10 unități world.
Fără împărțire, cercul vizual al radierului nu s-ar mai potrivi cu zona de hit reală.

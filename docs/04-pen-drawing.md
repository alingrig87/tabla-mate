# Commit 04 — Freehand Pen Drawing with Pointer Events API

## 🇬🇧 English

### Requirements

The first drawing tool must:

- Let the user draw smooth freehand strokes with mouse or touch
- Keep drawing even if the pointer briefly leaves the canvas
- Store completed strokes so they survive re-renders (the canvas bitmap is wiped on resize)
- Draw efficiently during the drag (no full redraw every mouse move)

### What Was Implemented

**New in `src/components/CanvasBoard.tsx`:**

| Addition                             | Purpose                                                 |
| ------------------------------------ | ------------------------------------------------------- |
| `Point`, `PenItem`, `DrawItem` types | Data model for drawing items                            |
| `drawItem()`                         | Renders a single `DrawItem` on the context              |
| `redrawAll()`                        | Clears canvas and redraws all items from scratch        |
| `items` state + `itemsRef` ref       | Persistent item list (React state + instant-access ref) |
| `isDrawingRef`, `currentPenRef`      | Track active stroke without re-renders                  |
| `pointerDown/Move/Up`                | Handle the full drag interaction                        |
| `commit()`                           | Save completed stroke to item list                      |
| `setPointerCapture()`                | Keep events flowing even off-canvas                     |

### Concepts Explained

#### Pointer Events API vs Mouse Events

The `PointerEvent` API unifies mouse, touch, and stylus input into one event model:

```
Mouse:   mousedown → mousemove → mouseup
Touch:   touchstart → touchmove → touchend
Stylus:  (also PointerEvent)

Pointer: pointerdown → pointermove → pointerup  ← one API for all
```

We use `onPointerDown`, `onPointerMove`, `onPointerUp` on the canvas instead of mouse/touch
events. This means the whiteboard works identically with a mouse, finger, or Apple Pencil.

#### `setPointerCapture` — drawing off-canvas

```typescript
(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
```

Normally, if you drag fast and the cursor leaves the canvas element, `pointermove` events stop
firing (the browser sends them to whatever element the cursor is over). `setPointerCapture`
**locks** all pointer events for that pointer ID to this element until `pointerup` fires. Result:
drawing continues smoothly even during fast strokes.

#### `useRef` for drawing state — the stale closure problem

```typescript
const isDrawingRef = useRef(false);
const currentPenRef = useRef<PenItem | null>(null);
```

Why refs instead of state for these? Event handlers in React can capture **stale values** of
state. If we used `const [isDrawing, setIsDrawing] = useState(false)`, the `pointerMove`
function would always see `isDrawing = false` (the value at the time it was created), because
event handlers are not recreated on every render in this pattern.

Refs always give you the **current** value — no stale closures.

#### The `itemsRef` + `items` dual pattern

```typescript
const [items, setItems] = useState<DrawItem[]>([]);
const itemsRef = useRef<DrawItem[]>([]);

// Sync them in a useEffect:
useEffect(() => {
  itemsRef.current = items;
  redrawAll(ctx, items);
}, [items]);
```

- `items` (state) — triggers React re-renders, drives the official truth
- `itemsRef` (ref) — can be read instantly inside event handlers without stale closure issues

We need both: state for React's rendering system, ref for pointer event handlers.

#### `redrawAll` — the declarative canvas pattern

Canvas is **imperative** (you issue drawing commands) but we manage it **declaratively**
(the canvas always reflects `items`). The `redrawAll` function is the bridge:

```typescript
function redrawAll(ctx, items) {
  ctx.resetTransform();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // wipe everything
  items.forEach((item) => drawItem(ctx, item)); // redraw from data
}
```

`ctx.resetTransform()` before clearing is important: if any transforms (scale, translate) are
active, `clearRect` might not clear the whole canvas. Reset puts us back to identity.

This pattern is like React's virtual DOM for canvas: **state → canvas**, not imperative mutations.

#### Efficient drawing during drag — segment-by-segment

During `pointerMove`, we **don't** call `redrawAll` (that would be slow for hundreds of existing
items). Instead, we draw only the **latest segment** directly:

```typescript
// Draw only from prev point to current point
ctx.beginPath();
ctx.moveTo(prev.x, prev.y);
ctx.lineTo(pos.x, pos.y);
ctx.stroke();
```

Only on `pointerUp` do we call `commit()` → `setItems()` → `redrawAll()` (once, not per pixel).

#### Canvas path API

```typescript
ctx.strokeStyle = '#1a1a1a'; // line color
ctx.lineWidth = 3; // thickness in CSS pixels
ctx.lineJoin = 'round'; // how corners look where lines meet
ctx.lineCap = 'round'; // how line ends look (round = no sharp tips)
ctx.beginPath(); // start a new path (doesn't draw yet)
ctx.moveTo(x1, y1); // lift pen and move to start
ctx.lineTo(x2, y2); // draw line to next point
ctx.stroke(); // actually paint the path
```

`lineJoin: 'round'` and `lineCap: 'round'` together give smooth, natural-looking strokes.

#### Discriminated union types

```typescript
type DrawItem = PenItem;
// Later becomes:
// type DrawItem = PenItem | ShapeItem | TextItem | GeomItem | ImageItem;
```

Each item has a `kind` property that TypeScript uses to **narrow** the type in `switch` statements:

```typescript
switch (item.kind) {
  case 'pen': // TypeScript knows item is PenItem here
    item.points; // ✓ accessible
    break;
}
```

This is called a **discriminated union** — the `kind` discriminates which variant we have.

---

## 🇷🇴 Română

### Cerințe

Primul tool de desenat trebuie să:

- Permită utilizatorului să deseneze trăsături libere cu mouse sau touch
- Continue desenarea chiar dacă pointer-ul iese momentan din canvas
- Stocheze trăsăturile completate pentru a supraviețui re-render-urilor
- Deseneze eficient în timpul drag-ului (fără redraw complet la fiecare mișcare)

### Ce s-a implementat

Tipuri noi: `Point`, `PenItem`, `DrawItem`; funcții: `drawItem()`, `redrawAll()`; stare:
`items` + `itemsRef`; refs: `isDrawingRef`, `currentPenRef`; handlers: `pointerDown/Move/Up`.

### Concepte explicate

#### Pointer Events API vs Mouse Events

`PointerEvent` unifică mouse, touch și stylus într-un singur model de evenimente:

- `onPointerDown`, `onPointerMove`, `onPointerUp` funcționează cu mouse, deget sau Apple Pencil
- Înlocuiesc `mousedown/mousemove/mouseup` și `touchstart/touchmove/touchend`

#### `setPointerCapture` — desenat în afara canvas-ului

```typescript
(e.target as HTMLElement).setPointerCapture(e.pointerId);
```

Fără aceasta, dacă mișcăm cursorul rapid și iese din canvas, evenimentele `pointermove` se
opresc. `setPointerCapture` **blochează** toate evenimentele de pointer pentru acel ID la
elementul nostru până la `pointerup`. Rezultat: desenarea continuă fără întreruperi.

#### `useRef` pentru starea de desenat — problema stale closure

Event handler-ele React pot captura **valori vechi** (stale) din state. Dacă am folosi
`useState` pentru `isDrawing`, `pointerMove` ar vedea mereu `isDrawing = false` (valoarea
de la momentul creării). Ref-urile dau întotdeauna **valoarea curentă**.

#### Pattern-ul dual `itemsRef` + `items`

- `items` (state) — declanșează re-render-uri React, este sursa oficială de adevăr
- `itemsRef` (ref) — poate fi citit instant în event handler-e fără stale closures

Avem nevoie de amândouă: state pentru sistemul de randare React, ref pentru pointer events.

#### `redrawAll` — pattern-ul canvas declarativ

Canvas este **imperativ** (emiți comenzi de desenat) dar îl gestionăm **declarativ**
(canvas-ul reflectă mereu `items`). `redrawAll` este puntea: șterge totul și redesenează din date.

#### Desenat eficient în timpul drag-ului

În `pointerMove`, nu apelăm `redrawAll` (ar fi lent cu sute de items existente). Desenăm
doar **ultimul segment** direct pe context. Abia la `pointerUp` apelăm `commit()` → `setItems()`
→ `redrawAll()` (o singură dată, nu per pixel).

#### Tipuri union discriminate

```typescript
type DrawItem = PenItem; // va deveni: PenItem | ShapeItem | TextItem | ...
```

Fiecare item are o proprietate `kind` pe care TypeScript o folosește pentru a **restrânge**
tipul în instrucțiunile `switch`. Aceasta se numește **discriminated union**.

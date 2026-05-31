# Commit 31 — Square & Circle Constraint + Primary Pointer Guard

## 🇬🇧 English

### Problem

Two related drawing bugs:

1. **Rectangle tool allowed non-square shapes** — users could drag to any aspect ratio, creating rectangles instead of the intended square.
2. **Circle tool allowed ovals** — the bounding-box approach let `rx ≠ ry`, producing ellipses rather than perfect circles.
3. **Multi-pointer devices** could fire multiple `pointerdown` events simultaneously, causing stacked duplicate shapes from a single gesture.

### What Was Fixed

#### `constrainToSquare` helper

```typescript
function constrainToSquare(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const size = Math.min(Math.abs(dx), Math.abs(dy));
  return { x2: x1 + size * (dx >= 0 ? 1 : -1), y2: y1 + size * (dy >= 0 ? 1 : -1) };
}
```

Takes the **smaller** of the two drag dimensions and forces both `|x2-x1|` and `|y2-y1|` to equal it.
Preserving the sign of `dx`/`dy` means the shape still expands in the direction the user dragged:
top-right, bottom-left, etc.

Applied in **both** `pointerMove` (live preview) and `pointerUp` (committed item) for `rect` and `circle` tools.

#### Circle drawing: `arc` instead of `ellipse`

```typescript
// Before — ellipse with independent rx, ry
ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);

// After — true circle with single radius
const r = Math.abs(item.x2 - item.x1) / 2;
ctx.arc(cx, cy, r || 1, 0, Math.PI * 2);
```

Since `constrainToSquare` guarantees `|x2-x1| == |y2-y1|`, we only need one radius. Using
`ctx.arc` makes the intent explicit and avoids any floating-point mismatch between the two axes.

#### Primary pointer guard

```typescript
function pointerDown(e: React.PointerEvent) {
  if (!e.isPrimary) return;   // ignore secondary touch / stylus contacts
  ...
}
```

`PointerEvent.isPrimary` is `true` only for the first active contact of a given pointer type
(left mouse button, first finger, etc.). Adding this guard prevents a second simultaneous
touch or an accidental palm contact from starting a second drawing session and stacking a
duplicate shape on top of the first.

### Concepts Explained

#### Why `Math.min` over `Math.max` for the constraint

Using `Math.max` would expand the shape beyond what the user's shorter drag covers — the shape
would visually overflow the drag gesture. `Math.min` keeps the square or circle inscribed
within the actual drag rectangle, matching user expectation.

#### `e.isPrimary` vs `e.button === 0`

`e.button` distinguishes left/right/middle mouse buttons but is `0` for all touch contacts.
`e.isPrimary` correctly handles multi-touch: the first finger is primary, subsequent ones are not.
For mixed (mouse + touch) devices, each pointer type tracks its own primary independently.

---

## 🇷🇴 Română

### Problema

- Tool-ul **pătrat** permitea dreptunghiuri de orice proporție.
- Tool-ul **cerc** producea elipse (rx ≠ ry).
- Pe dispozitive multi-touch, mai multe `pointerdown` simultane creeau forme duplicate suprapuse.

### Ce s-a rezolvat

**`constrainToSquare`** — ia dimensiunea minimă dintre cele două axe de drag și forțează
`|x2-x1| == |y2-y1|`, păstrând direcția (stânga/dreapta, sus/jos).

**Cercul** — înlocuit `ctx.ellipse(rx, ry)` cu `ctx.arc(r)`, r calculat doar pe axa X
(garantat egală cu Y după constraint).

**`e.isPrimary`** — guard la începutul `pointerDown` care ignoră orice al doilea contact
simultan (deget suplimentar, palmă), prevenind crearea de forme duplicate.

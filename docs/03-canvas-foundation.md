# Commit 03 — Blank Interactive Canvas with HiDPI Scaling

## 🇬🇧 English

### Requirements

The whiteboard needs a full-screen drawing surface that:

- Fills the entire browser viewport
- Renders crisp on both standard (96 DPI) and high-density (Retina, 192+ DPI) screens
- Adjusts automatically when the window is resized
- Blocks browser default touch behaviors (scroll, pinch-zoom) so our own gestures work later

### What Was Implemented

A minimal `CanvasBoard` component with:

- A full-screen `<canvas>` element covering the viewport
- A `useEffect` that initialises canvas dimensions on mount and on every resize
- **HiDPI scaling** using `window.devicePixelRatio`
- A cleanup function that removes the resize listener when the component unmounts

**Files modified:**

- `src/components/CanvasBoard.tsx` — new component (canvas init only)
- `src/App.tsx` — renders `<CanvasBoard />` directly

### Concepts Explained

#### `<canvas>` vs SVG vs DOM for drawing

| Approach      | Best for                                      | Not ideal for                      |
| ------------- | --------------------------------------------- | ---------------------------------- |
| **Canvas 2D** | Pixel-level control, many objects, animations | Text selection, accessibility      |
| **SVG**       | Scalable shapes, interactable elements        | Thousands of objects (performance) |
| **DOM / CSS** | UI components, forms, text                    | Free-form drawing                  |

We use `<canvas>` because a whiteboard needs **pixel-level control** and will contain hundreds
of strokes. SVG would create thousands of DOM elements; Canvas keeps everything as pixels.

#### `devicePixelRatio` (DPR) — the HiDPI problem

A CSS pixel is **not** always one physical pixel. On a MacBook Retina screen, one CSS pixel = 4
physical pixels (DPR = 2). Without correction, the canvas bitmap is only half the resolution
needed, and the browser stretches it → blurry text and lines.

**The fix:**

```typescript
const dpr = window.devicePixelRatio || 1; // e.g. 2 on Retina

// Set the PHYSICAL pixel dimensions of the bitmap
canvas.width = canvas.offsetWidth * dpr; // e.g. 1600 physical px
canvas.height = canvas.offsetHeight * dpr; // e.g. 900 physical px

// Scale the drawing context so we still draw in CSS pixels
ctx.scale(dpr, dpr);
// Now ctx.fillRect(0, 0, 100, 100) fills a 100×100 CSS pixel area
// which is 200×200 physical pixels — crisp on Retina!
```

The canvas CSS size (`style.width/height`) stays at 100% of the viewport. Only the internal
bitmap resolution changes.

#### `useRef` — why not `useState` for the canvas element

```typescript
const canvasRef = useRef<HTMLCanvasElement | null>(null);
```

`useRef` stores a mutable value that **does not trigger a re-render** when changed. We use it
for the canvas element because:

1. We never need to re-render when the canvas reference changes
2. We need to access it imperatively (call `getContext('2d')`, set `width`, etc.)
3. `useState` would cause unnecessary re-renders

The generic type `<HTMLCanvasElement | null>` tells TypeScript what the ref holds (null before
the element mounts, then the actual element).

#### `useEffect` — side effects and cleanup

```typescript
useEffect(() => {
  // runs after the component mounts and after each render where deps changed
  window.addEventListener('resize', resize);

  return () => {
    // cleanup: runs before the component unmounts (or before next effect run)
    window.removeEventListener('resize', resize);
  };
}, []); // empty deps array = run once on mount, cleanup on unmount
```

The empty dependency array `[]` means the effect runs **once** (on mount). The returned function
is the **cleanup** — without it, we'd leak event listeners every time the component re-mounts.

#### `position: fixed; inset: 0`

```css
position: fixed; /* positioned relative to the viewport, not document */
inset: 0; /* shorthand for top:0; right:0; bottom:0; left:0 */
width: 100%;
height: 100%;
```

`position: fixed` keeps the canvas covering the full viewport even when the document is taller
than the screen. `inset: 0` is a modern shorthand supported in all modern browsers.

#### `touchAction: 'none'`

Without this, the browser intercepts touch events (for scrolling, pinch-zoom). Setting
`touch-action: none` on the canvas tells the browser: "this element handles all touch events
itself — don't interfere." This is **required** for pointer events to work correctly on mobile.

---

## 🇷🇴 Română

### Cerințe

Tabla are nevoie de o suprafață de desenat full-screen care:

- Umple întreg viewport-ul browserului
- Randează clar pe ecrane standard (96 DPI) și high-density (Retina, 192+ DPI)
- Se ajustează automat când fereastra se redimensionează
- Blochează comportamentele touch implicite ale browserului

### Ce s-a implementat

O componentă minimală `CanvasBoard` cu:

- Un element `<canvas>` full-screen care acoperă viewport-ul
- Un `useEffect` care inițializează dimensiunile canvas-ului la mount și la fiecare resize
- **Scalare HiDPI** folosind `window.devicePixelRatio`
- O funcție de cleanup care elimină event listener-ul la unmount

### Concepte explicate

#### `<canvas>` vs SVG vs DOM

Folosim `<canvas>` deoarece o tablă albă necesită **control la nivel de pixel** și va conține
sute de trăsături. SVG ar crea mii de elemente DOM; Canvas le păstrează pe toate ca pixeli.

#### `devicePixelRatio` (DPR) — problema HiDPI

Un pixel CSS **nu** este întotdeauna un pixel fizic. Pe un MacBook Retina, un pixel CSS = 4
pixeli fizici (DPR = 2). Fără corecție, bitmap-ul canvas-ului are doar jumătate din rezoluția
necesară, iar browserul îl întinde → text și linii neclare (blur).

**Soluția:**

```typescript
const dpr = window.devicePixelRatio || 1; // ex. 2 pe Retina

canvas.width = canvas.offsetWidth * dpr; // dimensiuni fizice ale bitmap-ului
canvas.height = canvas.offsetHeight * dpr;

ctx.scale(dpr, dpr); // scalăm contextul să rămânem în coordonate CSS
```

#### `useRef` — de ce nu `useState` pentru canvas

`useRef` stochează o valoare mutabilă care **nu declanșează re-render** când se schimbă.
Îl folosim pentru elementul canvas deoarece:

1. Nu avem nevoie de re-render când referința se schimbă
2. Trebuie să accesăm elementul imperativ (apelăm `getContext('2d')`, setăm `width`, etc.)

#### `useEffect` cu cleanup

```typescript
useEffect(() => {
  window.addEventListener('resize', resize);
  return () => window.removeEventListener('resize', resize); // cleanup
}, []); // [] = rulează o singură dată la mount
```

Array-ul de dependențe gol `[]` face efectul să ruleze **o singură dată** la mount. Funcția
returnată este **cleanup** — fără ea, am pierde event listener-uri la fiecare re-mount.

#### `touchAction: 'none'`

Fără acest atribut, browserul interceptează evenimentele touch (pentru scroll, pinch-zoom).
Setând `touch-action: none` pe canvas, îi spunem browserului să nu interfereze cu evenimentele
noastre de pointer — **obligatoriu** pentru ca gesturile să funcționeze pe mobil.

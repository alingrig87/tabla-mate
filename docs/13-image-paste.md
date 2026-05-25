# Commit 13 — Image Paste from Clipboard (Ctrl+V / ⌘V)

## 🇬🇧 English

### Requirements

Students need to paste screenshots and diagrams onto the canvas:

- **Ctrl+V / ⌘V** anywhere on the page pastes an image from the clipboard
- A **Paste toolbar button** triggers the same action via the Clipboard API
- Pasted images are auto-scaled to fit within 600×450 world units
- Images are placed centred on the current viewport
- Pasted images can be **erased** like any other item (AABB hit-test)
- Images survive **undo/redo** correctly

### What Was Implemented

**New `ImageItem` interface:**

```typescript
interface ImageItem {
  kind: 'image';
  id: string; // crypto.randomUUID() — used as cache key
  dataURL: string; // base64 PNG/JPEG — serialisable, survives undo snapshots
  x: number; // world coords of the top-left corner
  y: number;
  w: number; // display size in world units
  h: number;
}
```

**Module-level image cache:**

```typescript
const _imgCache = new Map<string, HTMLImageElement>();
```

**Module-level last-render snapshot** (for async `onLoad` callbacks):

```typescript
let _lastCtx: CanvasRenderingContext2D | null = null;
let _lastItems: DrawItem[] = [];
let _lastPan: Point = { x: 0, y: 0 };
let _lastScale = 1;
```

Updated at the top of every `redrawAll()` call.

**`preloadImg(item)`** — returns cached `HTMLImageElement`, or starts loading:

```typescript
function preloadImg(item: ImageItem): HTMLImageElement {
  if (_imgCache.has(item.id)) return _imgCache.get(item.id)!;
  const img = new Image();
  img.onload = () => {
    if (_lastCtx) redrawAll(_lastCtx, _lastItems, _lastPan, _lastScale);
  };
  img.src = item.dataURL;
  _imgCache.set(item.id, img);
  return img;
}
```

**`drawItem` — `'image'` case:**

```typescript
case 'image': {
  const img = preloadImg(item);
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, item.x, item.y, item.w, item.h);
  }
  break;
}
```

**`pasteImageBlob(blob)`** — converts a `Blob` to a committed `ImageItem`:

```typescript
function pasteImageBlob(blob: Blob) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataURL = reader.result as string;
    const img = new Image();
    img.onload = () => {
      // auto-scale to fit 600×450 world units
      const ratio = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      // place at viewport centre in world coords
      const cx = canvas.offsetWidth / 2 / scaleRef.current + panRef.current.x;
      const id = crypto.randomUUID();
      const item: ImageItem = { kind: 'image', id, dataURL, x: cx - w / 2, y: cy - h / 2, w, h };
      _imgCache.set(id, img); // pre-populate — image already decoded
      commit([...itemsRef.current, item]);
    };
    img.src = dataURL;
  };
  reader.readAsDataURL(blob);
}
```

**`pasteFromClipboard()`** — async Clipboard API (toolbar button):

```typescript
async function pasteFromClipboard() {
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((t) => t.startsWith('image/'));
    if (imageType) {
      const blob = await item.getType(imageType);
      pasteImageBlob(blob);
      return;
    }
  }
}
```

**`paste` window event** (Ctrl+V / ⌘V):

```typescript
useEffect(() => {
  const onPaste = (e: ClipboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    const file = Array.from(e.clipboardData?.items ?? [])
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();
    if (file) {
      e.preventDefault();
      pasteImageBlob(file);
    }
  };
  window.addEventListener('paste', onPaste);
  return () => window.removeEventListener('paste', onPaste);
}, []);
```

---

### Concepts Explained

#### `ClipboardEvent` vs `navigator.clipboard.read()` — two clipboard APIs

| Feature         | `ClipboardEvent` (paste event)        | `navigator.clipboard.read()`         |
| --------------- | ------------------------------------- | ------------------------------------ |
| Trigger         | User presses Ctrl+V                   | Programmatic (button click)          |
| Permission      | None needed                           | Requires `clipboard-read` permission |
| Context         | Works on `http://`                    | Requires HTTPS or `localhost`        |
| Timing          | Synchronous access to `clipboardData` | Async (`await`)                      |
| Browser support | Universal                             | Chrome 86+, Firefox 127+             |

Both paths lead to a `Blob`, which we then process with `FileReader`.

We use both: the `ClipboardEvent` handles Ctrl+V anywhere on the page, while
`navigator.clipboard.read()` handles the toolbar button where no keyboard event fires.

#### `FileReader.readAsDataURL()` — Blob → base64 data URL

```typescript
const reader = new FileReader();
reader.onload = () => {
  const dataURL = reader.result as string; // "data:image/png;base64,iVBORw0KGgo..."
};
reader.readAsDataURL(blob); // triggers onload when done
```

`FileReader` converts binary data (a `Blob` or `File`) to text formats asynchronously.
`readAsDataURL` produces a **base64-encoded data URL**: a string that embeds the entire
image as text. It looks like `data:<mime>;base64,<base64-data>`.

Why base64? Because our `DrawItem` objects are plain JavaScript values stored in arrays.
A `Blob` is a binary object that cannot be JSON-serialised or stored in an array snapshot.
A data URL is a plain string — it survives `[...items]` spreading, undo stack pushes, and
future `JSON.stringify` if we add save/load.

Trade-off: a 100KB PNG becomes ~133KB as base64 (33% overhead). For typical whiteboard
images (screenshots, diagrams) this is acceptable.

#### `Image()` constructor and the `complete` / `naturalWidth` check

```typescript
const img = new Image(); // equivalent to document.createElement('img')
img.onload = () => {
  /* image is decoded and ready */
};
img.src = dataURL; // starts the async decode
```

Setting `img.src` starts decoding asynchronously. `img.complete` is `true` when done.
`img.naturalWidth > 0` confirms the decode succeeded (vs. a broken image where
`complete = true` but `naturalWidth = 0`).

When drawing: `ctx.drawImage(img, x, y, w, h)` fails silently if called before
`img.complete` — which is why we check both properties before drawing.

#### Module-level `Map` as image cache — why not `useState`

```typescript
const _imgCache = new Map<string, HTMLImageElement>();
```

An `HTMLImageElement` cannot live in React state because:

1. React state is a plain JS value — `HTMLImageElement` has non-serialisable internal state
2. `setState` triggers a re-render, which re-runs the component function, but `drawItem`
   is called from within `redrawAll`, not from React's render cycle

The `Map` lives at module scope: it is created once when the module is imported and
persists for the lifetime of the page. It survives React re-renders, undo/redo stack
changes, and component remounts (if the component ever unmounts and remounts, the cache
is still warm).

The cache key is `item.id` (a UUID). Each distinct `ImageItem` has a unique id, so
multiple pastes of the same image each get their own cache entry.

#### `crypto.randomUUID()` — collision-free IDs

```typescript
const id = crypto.randomUUID(); // "550e8400-e29b-41d4-a716-446655440000"
```

`crypto.randomUUID()` generates a version-4 UUID using cryptographically strong random
numbers. With 122 random bits, the probability of a collision across all IDs ever
generated is astronomically small. Available in all modern browsers and Node.js 19+.

Why not `Math.random()` or `Date.now()`? Both can collide: `Math.random()` has only 53
bits of entropy, and `Date.now()` repeats if two pastes happen within the same millisecond.

#### `_last*` module variables — triggering redraws from async callbacks

`preloadImg`'s `onLoad` callback runs asynchronously — after the current call stack has
unwound. By then, the component's `panRef`, `scaleRef`, and `itemsRef` are still correct
(refs don't go stale), but `drawItem` is a module-level function with no access to them.

Solution: store the last `redrawAll` arguments in module-level variables, updated at the
top of every `redrawAll` call:

```typescript
let _lastCtx: CanvasRenderingContext2D | null = null;
let _lastItems: DrawItem[] = [];
let _lastPan: Point = { x: 0, y: 0 };
let _lastScale = 1;

function redrawAll(ctx, items, pan, scale, ...) {
  _lastCtx = ctx; _lastItems = items; _lastPan = pan; _lastScale = scale;
  // ...
}
```

When `img.onload` fires, it calls `redrawAll(_lastCtx, _lastItems, _lastPan, _lastScale)`.
Because nothing mutates these between the `preloadImg` call and the `onLoad` callback
(JS is single-threaded), the redraw sees exactly the correct current state.

#### data URL vs Object URL — trade-offs

|               | Data URL                         | Object URL (`URL.createObjectURL`) |
| ------------- | -------------------------------- | ---------------------------------- |
| Storage       | String (in JS heap)              | Blob kept alive by browser         |
| Size overhead | +33% (base64)                    | Zero                               |
| Lifetime      | Lives as long as the string      | Must be explicitly revoked         |
| Serialisable  | ✓ `JSON.stringify`, localStorage | ✗ (page-scoped, not serialisable)  |
| Undo/redo     | ✓ survives snapshot spreading    | ✗ revocation breaks past snapshots |

We use **data URLs** because images must survive undo stack snapshots. Each snapshot is
an `items` array spread (`[...items]`). An Object URL would need to stay alive for every
snapshot that references it — complex lifecycle management. A data URL is just a string,
so it's automatically copied and survives indefinitely.

---

## 🇷🇴 Română

### Cerințe

Elevii trebuie să poată lipi capturi de ecran și diagrame pe canvas:

- **Ctrl+V / ⌘V** oriunde pe pagină lipește o imagine din clipboard
- **Buton Paste** în toolbar declanșează aceeași acțiune via Clipboard API
- Imaginile sunt auto-scalate pentru a se încadra în 600×450 unități world
- Imaginile supraviețuiesc corect undo/redo

### Ce s-a implementat

**`ImageItem`** — stochează imaginea ca data URL (string serializabil).

**`_imgCache`** — `Map<string, HTMLImageElement>` la nivel de modul, persistent între re-render-uri și snapshot-uri undo.

**`_last*` variabile de modul** — actualizate la fiecare `redrawAll`, permit callback-ului async `onLoad` să retriggereze redesenarea.

**`preloadImg(item)`** — returnează `HTMLImageElement` din cache sau pornește încărcarea asincronă.

**`pasteImageBlob(blob)`** — `FileReader.readAsDataURL` → Image → auto-scale → `commit()`

**Efect `paste`** pe window — interceptează Ctrl+V fără a necesita permisiunea clipboard-read.

### Concepte explicate

#### `ClipboardEvent` vs `navigator.clipboard.read()`

| Caracteristică | `ClipboardEvent`         | `clipboard.read()`  |
| -------------- | ------------------------ | ------------------- |
| Declanșare     | Ctrl+V al utilizatorului | Programatic (buton) |
| Permisiune     | Niciuna                  | `clipboard-read`    |
| Context HTTPS  | Nu necesar               | Necesar             |

#### `FileReader.readAsDataURL()` — Blob → base64

```typescript
reader.onload = () => {
  const dataURL = reader.result as string; // "data:image/png;base64,..."
};
reader.readAsDataURL(blob);
```

Convertește date binare în string base64. Overhead: +33% față de dimensiunea originală.
Avantaj: string pur — serializabil, supraviețuiește spreading-ului din snapshot-uri undo.

#### Map la nivel de modul vs `useState`

`HTMLImageElement` nu poate trăi în state React — nu este serializabil.
Map-ul de modul este creat o singură dată la importul modulului și persistă pe durata
de viață a paginii, supraviețuind re-render-urilor, undo/redo și remount-urilor.

#### data URL vs Object URL

Folosim **data URL** deoarece imaginile trebuie să supraviețuiască snapshot-urilor din
stiva undo. Un Object URL ar trebui revocat manual și nu supraviețuiește serializării.

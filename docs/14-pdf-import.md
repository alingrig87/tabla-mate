# Commit 14 — PDF Import with Dynamic pdf.js Loading

## 🇬🇧 English

### Requirements

Students need to load exam papers directly onto the canvas:

- A **PDF button** in the toolbar opens a panel with:
  - "Open from disk" — picks a local `.pdf` file
  - A list of **preset exam PDFs** (EN VIII, 2022–2026) with Subiect + Barem buttons
- Each PDF page is rendered onto the canvas as an **image**, stacked vertically
- PDF rendering happens **off the main thread** via a Web Worker
- The ~2 MB pdf.js library is loaded **lazily** — only when the user opens a PDF
- A **spinner** replaces the PDF icon while loading

### What Was Implemented

**New files:**

- `src/data/subiecte.ts` — `SubiectInfo` interface + `SUBIECTE` array (10 presets)
- `public/pdf.worker.min.mjs` — pdf.js Web Worker (served as static asset)

**New state in component:**

- `showPdfPanel` — PDF panel visibility
- `pdfLoading` — spinner toggle
- `fileInputRef` — hidden `<input type="file" accept=".pdf">`

**`loadPDF(source: File | string)`:**

```typescript
const loadPDF = useCallback(async (source: File | string) => {
  setPdfLoading(true);
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const data =
    source instanceof File
      ? await source.arrayBuffer()
      : await fetch(source).then((r) => r.arrayBuffer());

  const pdf = await getDocument({ data }).promise;
  const targetW = canvas.offsetWidth - 40;
  const newItems: ImageItem[] = [];
  let yOff = panRef.current.y + 20;

  for (let pg = 1; pg <= pdf.numPages; pg++) {
    const page = await pdf.getPage(pg);
    const vp0 = page.getViewport({ scale: 1 });
    const sc = targetW / vp0.width;
    const vp = page.getViewport({ scale: sc });

    const oc = document.createElement('canvas'); // off-screen canvas
    oc.width = Math.round(vp.width);
    oc.height = Math.round(vp.height);
    await page.render({ canvas: oc, viewport: vp }).promise;

    const dataURL = oc.toDataURL('image/jpeg', 0.92);
    const id = crypto.randomUUID();
    // Pre-warm image cache with onLoad redraw
    const img = new Image();
    img.onload = () => {
      if (_lastCtx) redrawAll(_lastCtx, _lastItems, _lastPan, _lastScale);
    };
    img.src = dataURL;
    _imgCache.set(id, img);

    newItems.push({ kind: 'image', id, dataURL, x: xOff, y: yOff, w: oc.width, h: oc.height });
    yOff += oc.height + 16;
  }
  commit([...itemsRef.current, ...newItems]);
}, []);
```

**New JSX:**

- `IconPdf` SVG icon; toolbar button shows spinner (`<animateTransform>`) while loading
- Hidden `<input type="file" accept=".pdf">` — triggered by `fileInputRef.current?.click()`
- PDF panel with "Open from disk" + `SUBIECTE.map(...)` list

---

### Concepts Explained

#### Dynamic `import()` — lazy loading and code splitting

```typescript
const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
```

Static `import` (at the top of the file) always loads the module when the file loads.
Dynamic `import()` is a **Promise** — it loads the module **on demand**, at runtime.

Vite automatically code-splits dynamic imports into separate chunks in the build:

```
dist/assets/
  index-xxx.js        ← main app (~50 KB)
  pdfjs-dist-xxx.js   ← lazy chunk (~2 MB, only loaded when PDF button is used)
```

This means the initial page load stays fast — users who never import a PDF never
download the 2 MB pdf.js library.

#### pdf.js v5 API

```typescript
// 1. Get the PDF document object
const pdf = await getDocument({ data: arrayBuffer }).promise;

// 2. Get a specific page (1-indexed)
const page = await pdf.getPage(1);

// 3. Calculate viewport (size and rotation)
const viewport = page.getViewport({ scale: 1.5 });

// 4. Render page onto a canvas
await page.render({ canvas: offscreenCanvas, viewport }).promise;
```

The `pdf.getPage` and `page.render` calls are both `async` — they run the actual
PDF parsing and rendering in the Web Worker, returning Promises when done.

#### Web Worker — off-main-thread rendering

A **Web Worker** is a JavaScript file that runs in a background thread, separate from
the main UI thread. PDF parsing is CPU-intensive — doing it on the main thread would
freeze the UI (no scrolling, no interaction) for seconds.

```typescript
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

This tells pdf.js where to find its worker script. The file must be served at a
stable URL — we place it in `public/` so Vite serves it as-is at `/pdf.worker.min.mjs`.

Why `.mjs`? Modern ECMAScript module format, required by pdf.js v5. Older versions
used `.js` with `importScripts`.

#### Off-screen canvas — rendering without a DOM node

```typescript
const oc = document.createElement('canvas');
// NOT appended to document.body — it's an in-memory canvas
oc.width = Math.round(vp.width);
oc.height = Math.round(vp.height);
await page.render({ canvas: oc, viewport: vp }).promise;
const dataURL = oc.toDataURL('image/jpeg', 0.92);
```

An off-screen canvas is created with `document.createElement('canvas')` but never
appended to the DOM. It's a pixel buffer in memory. We render the PDF page into it,
then extract the data URL to store as an `ImageItem`.

`canvas.toDataURL('image/jpeg', 0.92)` serialises the canvas pixels to a JPEG at 92%
quality. JPEG is lossy (vs PNG lossless) but ~3× smaller for typical document pages.
92% quality preserves text readability while reducing file size.

#### `ArrayBuffer` vs `Blob` vs `File` — binary data hierarchy

| Type          | Description                                 | Source                                        |
| ------------- | ------------------------------------------- | --------------------------------------------- |
| `ArrayBuffer` | Raw binary buffer — just bytes, no metadata | `File.arrayBuffer()`, `fetch().arrayBuffer()` |
| `Blob`        | Binary data + MIME type                     | `ClipboardItem.getType()`, `fetch().blob()`   |
| `File`        | `Blob` + filename + lastModified            | `<input type="file">`, drag-and-drop          |

pdf.js `getDocument({ data })` expects an `ArrayBuffer`. We convert using:

- `File.arrayBuffer()` — for files picked from disk
- `fetch(url).then(r => r.arrayBuffer())` — for preset URLs

#### `fileInputRef.current?.click()` — programmatic file picker

```typescript
const fileInputRef = useRef<HTMLInputElement | null>(null);

// Trigger native OS file picker from a custom button:
<button onClick={() => fileInputRef.current?.click()}>
  📂 Open from disk…
</button>

// Hidden input that receives the file:
<input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
  onChange={(e) => { const f = e.target.files?.[0]; if (f) loadPDF(f); }} />
```

The `<input type="file">` triggers the native OS file picker when clicked. We hide it
with `display: none` and trigger it programmatically from a styled button. The `.click()`
method on the DOM element opens the picker without any visible `<input>` on screen.

`e.target.value = ''` after reading the file resets the input — this ensures the
`onChange` fires again if the user selects the same file a second time.

#### `useCallback` with `[]` deps for async functions

```typescript
const loadPDF = useCallback(async (source: File | string) => { ... }, []);
```

`useCallback(fn, [])` keeps the same function reference across all re-renders.
This matters because `loadPDF` is passed to JSX `onClick` handlers and to the
`paste` event listener (indirectly). Without `useCallback`, each re-render would
create a new function object, potentially re-registering event listeners.

The `[]` dependency array works because `loadPDF` only accesses `ref.current` values
and module-level variables (`_imgCache`, `_lastCtx`, etc.) — none of which cause the
function to become stale.

#### SVG `<animateTransform>` — CSS-free spinner

```jsx
<svg ...>
  <path d="M12 2v4M12 18v4...">
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 12 12"
      to="360 12 12"
      dur="1s"
      repeatCount="indefinite"
    />
  </path>
</svg>
```

`<animateTransform>` is part of the SVG animation spec (SMIL). It rotates the parent
element continuously. `from="0 12 12"` and `to="360 12 12"` rotate from 0° to 360°
around the centre point (12, 12) of the 24×24 viewBox. No CSS required.

---

## 🇷🇴 Română

### Cerințe

Elevii trebuie să poată încărca subiecte de examen direct pe canvas:

- Buton PDF în toolbar → panel cu "Deschide de pe disc" + lista subiecte presetate EN VIII
- Fiecare pagină PDF e randată ca `ImageItem` pe canvas
- Biblioteca pdf.js (~2 MB) se încarcă **lazy** — doar când se folosește

### Ce s-a implementat

**`src/data/subiecte.ts`** — `SubiectInfo` + `SUBIECTE` (10 subiecte 2022–2026).

**`public/pdf.worker.min.mjs`** — worker pdf.js servit ca asset static.

**`loadPDF(source)`** — `useCallback` async:

1. `await import('pdfjs-dist')` — încărcare lazy
2. `getDocument({ data })` — parsare PDF în worker
3. Pentru fiecare pagină: `page.render({ canvas: oc })` pe canvas off-screen
4. `oc.toDataURL('image/jpeg', 0.92)` → `ImageItem` → pre-populate cache
5. `commit([...items, ...newItems])`

### Concepte explicate

#### `import()` dinamic — lazy loading și code splitting

```typescript
const { getDocument } = await import('pdfjs-dist');
```

Import static = modul încărcat la pornire. Import dinamic = Promise, modul încărcat la cerere.
Vite split automat chunk-ul `pdfjs-dist` (~2 MB) separat de bundle-ul principal.

#### pdf.js v5 API

```typescript
const pdf = await getDocument({ data: arrayBuffer }).promise; // document
const page = await pdf.getPage(1); // pagina 1
const vp = page.getViewport({ scale: 1.5 }); // viewport
await page.render({ canvas: oc, viewport: vp }).promise; // randare
```

Parsarea și randarea se fac în Web Worker — nu blochează thread-ul UI.

#### Canvas off-screen

```typescript
const oc = document.createElement('canvas');
// NU adăugat în DOM — buffer în memorie
await page.render({ canvas: oc, viewport: vp }).promise;
const dataURL = oc.toDataURL('image/jpeg', 0.92); // JPEG 92% calitate
```

JPEG în loc de PNG: ~3× mai mic pentru pagini de text, calitate suficientă la 92%.

#### `ArrayBuffer` vs `Blob` vs `File`

- `File` (disc) → `.arrayBuffer()` → `ArrayBuffer` pentru `getDocument`
- URL preset → `fetch(url).then(r => r.arrayBuffer())` → `ArrayBuffer`

#### `fileInputRef.current?.click()` — file picker programmatic

`<input type="file" style={{ display: 'none' }}>` ascuns, declanșat din buton custom.
`e.target.value = ''` resetează input-ul pentru re-selecție același fișier.

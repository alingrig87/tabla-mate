# Commit 17 — Exam Papers Viewer with PDF iframe

## 🇬🇧 English

### Requirements

Students need to read official exam papers and answer keys directly in the app:

- A **sidebar** lists all available papers grouped by year
- Clicking a paper loads it in the main viewer
- A **toggle** switches between the exam paper (subiect) and answer key (barem)
- A **download button** saves the PDF to disk
- Papers without an answer key show a warning icon; the barem toggle is disabled
- A statistics bar shows the total count of papers, keys, and years covered
- The **exam papers button** in the whiteboard toolbar opens this page
- Navigating to a different paper **resets the scroll position** of the PDF viewer

### What Was Implemented

**New `src/components/SubiectePage.tsx`** (280 lines):

```typescript
interface SubiectEntry {
  id: string;
  year: number;
  variant: string;
  subiectUrl: string;
  baremUrl: string | null; // null = no answer key available
  label: string;
}

const SUBIECTE: SubiectEntry[] = [
  { id: '2022_var01', year: 2022, variant: 'Varianta 1',
    subiectUrl: '/subiecte/en8/2022_var01_subiect.pdf',
    baremUrl: '/subiecte/en8/2022_var01_barem.pdf', ... },
  // ... 10 entries total, 2022–2026
];
```

Core state:

```typescript
const [selected, setSelected] = useState<SubiectEntry>(SUBIECTE[0]);
const [viewMode, setViewMode] = useState<'subiect' | 'barem'>('subiect');

const currentUrl =
  viewMode === 'barem' && selected.baremUrl ? selected.baremUrl : selected.subiectUrl;
```

PDF rendering via `<iframe>`:

```tsx
<iframe
  key={currentUrl} // remounts when URL changes → resets scroll
  src={currentUrl}
  style={{ flex: 1, border: 'none' }}
  title={`${selected.label} - ${viewMode}`}
/>
```

Download link:

```tsx
<a href={currentUrl} download>
  ⬇ Descarcă
</a>
```

**Updated `src/App.tsx`:**

```typescript
const SubiectePage = lazy(() => import('./components/SubiectePage'));
type Page = 'board' | 'formulas' | 'subiecte';
```

**Updated `src/components/CanvasBoard.tsx`:**

```typescript
interface CanvasBoardProps {
  onOpenFormulas?: () => void;
  onOpenSubiecte?: () => void; // ← new
}
```

`IconSubiecte` SVG (checkmark in a box — represents a completed exam):

```tsx
const IconSubiecte = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
```

**New `public/subiecte/en8/*.pdf`** — 19 exam PDFs (2022–2026) served as static assets.

---

### Concepts Explained

#### `<iframe src="...">` — browser-native PDF viewer

```tsx
<iframe src="/subiecte/en8/2024_var02_subiect.pdf" style={{ flex: 1, border: 'none' }} />
```

The browser has a built-in PDF viewer (Chrome's PDFium, Firefox's PDF.js, Safari's
PDFKit). Setting `src` to a `.pdf` URL activates it automatically — no library needed.

**When to use `<iframe>` vs a JS PDF renderer:**

| Feature        | `<iframe>` (native viewer) | pdf.js (JS renderer)           |
| -------------- | -------------------------- | ------------------------------ |
| Implementation | Zero code                  | ~50 lines (see commit 14)      |
| Customisation  | None — browser UI          | Full control                   |
| Text selection | ✓ native                   | Requires text layer            |
| Printing       | ✓ native Ctrl+P            | Manual                         |
| Bundle size    | 0 KB                       | ~2 MB lazy chunk               |
| Use case       | Display + read             | Import to canvas, manipulation |

This component uses `<iframe>` because the goal is reading/printing — not importing
pages onto the canvas (that's commit 14).

#### `key` prop to force remount

```tsx
<iframe key={currentUrl} src={currentUrl} />
```

React normally reuses DOM elements between renders and just updates their props.
For an `<iframe>`, changing `src` updates the URL but does **not** reset scroll position.
The reader's scroll stays where it was in the previous document.

Setting `key={currentUrl}` tells React: "when `currentUrl` changes, this is a
**different** element — unmount the old one and mount a fresh one." The fresh iframe
starts from the top of the new PDF.

This is the standard React pattern for forcing a controlled reset of any stateful
DOM element (inputs, iframes, videos, canvas).

#### `<a href="..." download>` — file download link

```tsx
<a href={currentUrl} download>
  ⬇ Descarcă
</a>
```

The `download` attribute on an `<a>` tells the browser to download the resource
instead of navigating to it. Without `download`, clicking the link would open the PDF
in the same tab. With `download`, the browser opens the OS Save dialog.

`download` can also take a filename value: `download="exam_2024.pdf"` — though this
is ignored for cross-origin URLs (same-origin only).

#### Static file serving in Vite

Files placed in `public/` are served at the root URL as-is:

```
public/subiecte/en8/2024_var02_subiect.pdf
→ served at: http://localhost:5173/subiecte/en8/2024_var02_subiect.pdf
```

Vite copies the entire `public/` directory to `dist/` during `npm run build` without
transformation or hashing. This means the URLs are stable and predictable — ideal for
PDF files that are referenced by hardcoded strings in `SUBIECTE`.

**`public/` vs `src/assets/`:**

| Location      | Import style               | URL                      | Hashed in build? |
| ------------- | -------------------------- | ------------------------ | ---------------- |
| `src/assets/` | `import url from './file'` | `/assets/file-abc123.js` | ✓ cache-busted   |
| `public/`     | URL string `'/file'`       | `/file`                  | ✗ stable URL     |

PDFs and the pdf.js worker go in `public/` because they need stable URLs.
Images imported into components go in `src/assets/` for cache-busting.

#### Data grouping — filtering by year

```typescript
const YEARS = [2022, 2023, 2024, 2025, 2026];

{YEARS.map((year) => {
  const items = SUBIECTE.filter((s) => s.year === year);
  if (!items.length) return null; // skip years with no papers
  return (
    <div key={year}>
      <div>{year}</div>
      {items.map((item) => <button key={item.id}>...</button>)}
    </div>
  );
})}
```

This renders the papers grouped by year without needing to sort or restructure the
flat `SUBIECTE` array. `YEARS` is the canonical year order — if a year has no papers,
`return null` skips the group.

An alternative would be to build a `Map<number, SubiectEntry[]>` first, but for 10
items and 5 years, a filter per year is simpler and fast enough.

#### `null | string` for optional data

```typescript
baremUrl: string | null;
```

TypeScript union with `null` explicitly marks "this field may not exist". Using
`string | undefined` would also work, but `null` is conventional for "intentionally
absent data" (vs `undefined` for "was never set").

```typescript
// Safe access: the toggle button is disabled when baremUrl is null
<button disabled={!selected.baremUrl}>✅ Barem</button>

// currentUrl falls back to subiect when baremUrl is null
const currentUrl =
  viewMode === 'barem' && selected.baremUrl ? selected.baremUrl : selected.subiectUrl;
```

#### Shared `PageLoader` component in `App.tsx`

```tsx
function PageLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}
```

Rather than repeating the `<Suspense>` block for each lazy page, `PageLoader` wraps
it once. Both `FormulaPage` and `SubiectePage` use the same loading spinner.

`React.ReactNode` is the type for "anything React can render" — JSX elements,
strings, arrays, fragments, portals, or `null`.

---

## 🇷🇴 Română

### Cerințe

Elevii trebuie să citească subiecte și bareme direct în aplicație:

- Sidebar cu lista subiectelor grupate pe an
- Toggle subiect / barem
- Buton descarcă PDF
- Statistici (subiecte, bareme, ani)

### Ce s-a implementat

**`src/components/SubiectePage.tsx`** (280 linii):

- `SubiectEntry` — interfață cu `id`, `year`, `variant`, `subiectUrl`, `baremUrl | null`
- `SUBIECTE` — 10 intrări, 2022–2026
- `useState<SubiectEntry>` + `useState<'subiect' | 'barem'>`
- `<iframe key={currentUrl}>` — vizualizator nativ PDF

**`src/App.tsx`** — `SubiectePage` adăugat ca pagină lazy, `Page` extins cu `'subiecte'`.

**`src/components/CanvasBoard.tsx`** — prop `onOpenSubiecte` + `<IconSubiecte />` în toolbar.

**`public/subiecte/en8/*.pdf`** — 19 fișiere PDF copiate ca asset-uri statice.

### Concepte explicate

#### `<iframe>` — viewer PDF nativ

Browser-ul are un viewer PDF integrat. `src` = URL → PDF se afișează automat, zero cod.
Avantaje: selecție text, printare. Dezavantaje: zero personalizare.
Opus `pdf.js` (commit 14) care e folosit pentru importul pe canvas.

#### `key` prop pentru reset forțat

```tsx
<iframe key={currentUrl} src={currentUrl} />
```

Când `key` se schimbă, React demontează elementul vechi și montează unul nou.
Resetează poziția de scroll. Pattern standard pentru orice element DOM cu stare
(input, iframe, video, canvas) care trebuie reinițializat la schimbare.

#### `<a download>` — descărcare fișier

Atributul `download` pe un `<a>` declanșează dialogul OS de salvare în loc de navigare.

#### Fișiere statice în Vite

`public/` → copiat as-is în `dist/` → URL stabil fără hash.
`src/assets/` → importat cu `import` → URL cu hash (cache-busting).
PDF-urile merg în `public/` pentru URL-uri stabile.

#### `PageLoader` — wrapper `Suspense` reutilizabil

```tsx
function PageLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}
```

Evită repetarea blocului `<Suspense>` pentru fiecare pagină lazy.
`React.ReactNode` = orice poate randa React (JSX, string, array, null).

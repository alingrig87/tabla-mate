# Commit 16 — Multi-Page App Routing with React.lazy and Suspense

## 🇬🇧 English

### Requirements

The whiteboard needs a way to open the formula reference page and return to the canvas:

- A **book icon** in the toolbar opens the formula reference page
- The formula page has a **Back** button to return to the whiteboard
- The formula bundle (~284 KB) must **not** be downloaded on initial page load
- A **loading spinner** shows while the formula chunk is being fetched
- Navigation is purely client-side — no URL changes, no page reloads

### What Was Implemented

**Updated `src/App.tsx`:**

```tsx
import { useState, Suspense, lazy } from 'react';
import CanvasBoard from './components/CanvasBoard';

// React.lazy: FormulaPage (~284 KB) is loaded on demand, not on initial page load.
// The bundle for CanvasBoard stays small — formulas are only fetched when the user
// navigates to that page.
const FormulaPage = lazy(() => import('./components/FormulaPage'));

// Discriminated union type — all possible page names.
// TypeScript exhaustively checks every branch against this type.
type Page = 'board' | 'formulas';

export default function App(): JSX.Element {
  // useState<Page> acts as a client-side router.
  // No URL changes — purely in-memory navigation.
  const [page, setPage] = useState<Page>('board');

  if (page === 'formulas')
    return (
      <Suspense
        fallback={
          <div style={{ background: '#0b0d14', color: '#818cf8' }}>Se încarcă formulele…</div>
        }
      >
        <FormulaPage onBack={() => setPage('board')} />
      </Suspense>
    );

  return <CanvasBoard onOpenFormulas={() => setPage('formulas')} />;
}
```

**Updated `src/components/CanvasBoard.tsx`:**

```tsx
interface CanvasBoardProps {
  onOpenFormulas?: () => void;
}

export default function CanvasBoard({ onOpenFormulas }: CanvasBoardProps): JSX.Element {
  // ...
  return (
    <>
      {/* ... canvas ... */}
      <div>
        {' '}
        {/* toolbar */}
        {/* ... other buttons ... */}
        {onOpenFormulas && (
          <>
            <Divider />
            <PillBtn onClick={onOpenFormulas} title="Formule matematice (IX–XII)">
              <IconFormulas />
            </PillBtn>
          </>
        )}
      </div>
    </>
  );
}
```

---

### Concepts Explained

#### Client-side routing without React Router

React Router is the standard library for URL-based navigation in React apps.
But it isn't always necessary. This app has only two pages and no requirements for:

- **Deep links** — users don't share URLs to specific pages
- **Browser history** — Back button support isn't needed
- **URL parameters** — no data is encoded in the path

For this case, `useState<Page>('board')` acting as a state machine is the right tool.
It's simpler, has zero dependencies, and is trivial to understand.

**When to use React Router instead:**

- The app has 5+ pages or nested layouts
- Users bookmark or share URLs
- The browser's Back button should work
- SEO matters (search engines crawl URLs)

#### `React.lazy` — deferred component loading

```typescript
const FormulaPage = lazy(() => import('./components/FormulaPage'));
```

`React.lazy` takes a function that returns a dynamic `import()` promise.
The component is not loaded until it's first rendered.

In the build output, Vite code-splits this into a separate chunk:

```
dist/assets/
  index-xxx.js           ← main bundle (~224 KB, loads on every visit)
  FormulaPage-xxx.js     ← lazy chunk (~284 KB, only loads when formulas page opens)
```

A user who only uses the whiteboard never downloads the 284 KB formula bundle.

**`React.lazy` limitations:**

- Only works with **default exports** — `export default function FormulaPage`
- Only works in **client-side rendering** — no server-side rendering support
- The lazy component must be wrapped in `<Suspense>`

#### `<Suspense>` — handling async rendering

```tsx
<Suspense fallback={<LoadingSpinner />}>
  <FormulaPage />
</Suspense>
```

`<Suspense>` is React's mechanism for handling components that aren't ready yet.
When a lazy component is loading, React "suspends" — it renders the `fallback` instead.

Once the chunk finishes downloading and the component is ready, React automatically
replaces the fallback with the real component — no manual state management needed.

The fallback matches the formula page's dark indigo theme (`background: '#0b0d14'`)
so the transition from loading → loaded looks seamless rather than jarring.

#### Props as navigation callbacks

```tsx
// Parent passes down a callback:
<CanvasBoard onOpenFormulas={() => setPage('formulas')} />

// Child calls it when the button is clicked:
<PillBtn onClick={onOpenFormulas}>...</PillBtn>

// Destination page passes back a callback to return:
<FormulaPage onBack={() => setPage('board')} />
```

This is **prop drilling** — passing callbacks from parent to child. It works cleanly
when the component tree is shallow (App → CanvasBoard, App → FormulaPage).

The alternative is **Context** — a shared store accessible without prop passing.
Context is the right choice when callbacks need to pass through 3+ levels of the tree.
For 2 levels, props are simpler and more explicit.

#### Discriminated union for page type

```typescript
type Page = 'board' | 'formulas';
const [page, setPage] = useState<Page>('board');
```

Typing the state as a string literal union (rather than `string`) gives two benefits:

1. TypeScript rejects invalid values: `setPage('settings')` → compile error
2. `if`/`switch` branches are exhaustively checked — the compiler warns if a case is missing

This is the **discriminated union** pattern applied to routing state.

#### Optional prop with conditional render

```tsx
interface CanvasBoardProps {
  onOpenFormulas?: () => void; // the ? makes it optional
}

{
  onOpenFormulas && (
    <>
      <Divider />
      <PillBtn onClick={onOpenFormulas}>
        <IconFormulas />
      </PillBtn>
    </>
  );
}
```

The prop is marked optional (`?`) so `CanvasBoard` can be used in isolation (e.g., in
tests or other apps) without providing a formulas navigation callback. The button only
renders when the parent passes the prop — if `onOpenFormulas` is `undefined`, the
`&&` short-circuits and nothing is rendered.

This keeps `CanvasBoard` loosely coupled — it knows nothing about the formula page,
only that "someone gave me a callback to call when the formulas button is clicked."

#### Removing unused React import

Before React 17, every file using JSX required:

```typescript
import React from 'react'; // needed by JSX transform
```

React 17 introduced the **new JSX transform**. With `"jsx": "react-jsx"` in
`tsconfig.json`, the build tools automatically inject the JSX runtime — no manual
`React` import needed.

Leaving `import React from 'react'` in files that don't use `React.*` directly
triggers an ESLint `no-unused-vars` warning. Removing it keeps imports clean.

---

## 🇷🇴 Română

### Cerințe

Tabla trebuie să poată deschide pagina cu formule și să revină la canvas:

- Buton cu iconiță de carte în toolbar → pagina cu formule
- Butonul "Înapoi" din pagina cu formule → întoarcere la tablă
- Bundle-ul formulelor (~284 KB) nu se descarcă la încărcarea inițială a paginii
- Spinner în timp ce chunk-ul formulelor se descarcă

### Ce s-a implementat

**`src/App.tsx`** — `useState<Page>` ca router intern + `React.lazy` + `Suspense`.

**`src/components/CanvasBoard.tsx`** — prop opțional `onOpenFormulas?: () => void` +
buton `<IconFormulas />` în toolbar, afișat doar când prop-ul e furnizat.

### Concepte explicate

#### Routing fără React Router

`useState<Page>('board')` funcționează ca o mașină de stări pentru navigare.
Potrivit pentru aplicații cu 2–4 pagini, fără deep links sau back button.
React Router e necesar când: sunt 5+ pagini, URL-urile se împart cu alții, SEO contează.

#### `React.lazy` — loading la cerere

```typescript
const FormulaPage = lazy(() => import('./components/FormulaPage'));
```

Vite separă automat `FormulaPage` într-un chunk distinct (`~284 KB`).
Chunk-ul se descarcă **doar** când utilizatorul navighează la pagina cu formule.

Limitări: funcționează doar cu `export default`, nu cu SSR.

#### `<Suspense>` — UI în timpul încărcării

```tsx
<Suspense fallback={<Spinner />}>
  <FormulaPage />
</Suspense>
```

React afișează `fallback` cât timp chunk-ul se descarcă. Când componenta e gata,
React înlocuiește automat spinner-ul cu componenta reală.

#### Props ca callback-uri de navigare

```tsx
<CanvasBoard onOpenFormulas={() => setPage('formulas')} />
<FormulaPage onBack={() => setPage('board')} />
```

**Prop drilling** — callback-urile sunt pasate de la părinte la copil.
Funcționează bine la 2 niveluri de adâncime. Context e mai potrivit la 3+ niveluri.

#### Union discriminat pentru pagini

```typescript
type Page = 'board' | 'formulas';
```

TypeScript respinge valori invalide (`setPage('xyz')` → eroare la compilare) și
verifică exhaustivitate în ramuri `if`/`switch`.

#### Import `React` nu mai este necesar

Cu `"jsx": "react-jsx"` în `tsconfig.json` (React 17+), JSX transform-ul e injectat
automat. `import React from 'react'` în fișiere care nu folosesc `React.*` direct
declanșează un warning ESLint `no-unused-vars`.

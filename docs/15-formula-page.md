# Commit 15 — Math Formula Reference Page with KaTeX

## 🇬🇧 English

### Requirements

Students need a searchable reference of all formulas for grades IX–XII:

- Formulas grouped by **class** (IX / X / XI / XII) and **chapter**
- Each formula rendered as beautiful **mathematical notation** (LaTeX)
- **Full-text search** across all classes simultaneously
- **Copy LaTeX** button on each formula card
- Sidebar with class tabs + chapter navigation (scrolls into view)
- Dark indigo theme distinct from the whiteboard

### What Was Implemented

**New `src/data/formulas.ts`** (928 lines):

```typescript
interface Formula {
  id: string;
  title: string;
  latex: string;
  note?: string;
  display?: boolean;
}
interface Chapter {
  title: string;
  formulas: Formula[];
}
interface ClassData {
  cls: string;
  label: string;
  chapters: Chapter[];
}

export const FORMULA_DATA: ClassData[] = [
  /* IX, X, XI, XII */
];
```

**New `src/components/FormulaPage.tsx`** (637 lines):

- `KTex` — renders a LaTeX string via `katex.renderToString()` with `useMemo`
- `FormulaCard` — title + KaTeX output + "Copy LaTeX" button + optional note
- Sidebar: class tabs + chapter list with `scrollIntoView`
- Search bar: filters across all classes with `.toLowerCase().includes()`
- `dangerouslySetInnerHTML` for KaTeX HTML output

---

### Concepts Explained

#### KaTeX — lightweight LaTeX renderer

```typescript
import katex from 'katex';
import 'katex/dist/katex.min.css';

const html = katex.renderToString('\\frac{a}{b}', {
  displayMode: true, // block equation (vs inline)
  throwOnError: false, // silently show red error instead of throwing
});
```

KaTeX renders mathematical LaTeX notation to HTML. It's faster than MathJax
(synchronous, no WASM) and produces pixel-perfect output.

`renderToString` returns an HTML string. `throwOnError: false` means invalid
LaTeX shows a red error in-place rather than crashing the component.

`displayMode: true` renders as a block equation (centred, larger operators like Σ and ∫).
`displayMode: false` (inline) renders as text-height formula.

#### `dangerouslySetInnerHTML` — injecting trusted HTML

```tsx
function KTex({ latex, display = false }: { latex: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(latex, { displayMode: display, throwOnError: false }),
    [latex, display]
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
```

`dangerouslySetInnerHTML` sets the `innerHTML` of a DOM element directly.
React named it "dangerous" to discourage careless use — injecting user-supplied HTML
creates XSS (cross-site scripting) vulnerabilities if the content isn't sanitised.

**When is it safe?**

- The HTML comes from **KaTeX** — a well-audited library that only produces
  mathematical markup (no `<script>`, no event handlers).
- The `latex` string comes from our own `formulas.ts` file — it's not user input.

`dangerouslySetInnerHTML` is the correct tool when you have trusted HTML from a
known-good source and need to inject it into React's virtual DOM.

#### `useMemo` — memoising expensive computation

```typescript
const html = useMemo(
  () => katex.renderToString(latex, { displayMode: display, throwOnError: false }),
  [latex, display]
);
```

`useMemo(fn, deps)` runs `fn` on the first render and re-runs it only when a
dependency in `deps` changes. Between re-renders where `latex` and `display` are
the same, the memoised value is returned immediately — no KaTeX re-render.

This matters because the formula page may show 200+ formulas. Without `useMemo`,
every React re-render (e.g., typing in the search box) would re-compute all 200
KaTeX strings. With `useMemo`, they're computed once and cached.

**`useMemo` vs `useCallback`:**

```typescript
useMemo(() => expensiveValue, deps); // memoises the RETURN VALUE
useCallback(() => someFunction, deps); // memoises the FUNCTION ITSELF
// useCallback(fn, deps) ≡ useMemo(() => fn, deps)
```

#### `navigator.clipboard.writeText()` — async clipboard write

```typescript
<button onClick={() => navigator.clipboard.writeText(formula.latex)}>
  Copy LaTeX
</button>
```

`navigator.clipboard.writeText(text)` writes a string to the system clipboard
asynchronously. Returns a `Promise<void>` — we don't need to `await` it here
since there's no follow-up action needed on success.

Unlike `clipboard.read()` (commit 13), `writeText()` does **not** require a
permission prompt — it only needs the page to be in focus and HTTPS/localhost.

#### Data-driven UI — `formulas.ts` as a "database"

```typescript
FORMULA_DATA.map((classData) =>
  classData.chapters.map((chapter) =>
    chapter.formulas.map((f) => <FormulaCard key={f.id} formula={f} />)
  )
)
```

The entire formula browser is generated from the data array. Adding a new formula
means adding one object to `formulas.ts` — no JSX changes needed.

This is the **data-driven UI** pattern: separate data from presentation. The data
layer (`formulas.ts`) knows nothing about React; the presentation layer
(`FormulaPage.tsx`) knows nothing about specific formulas.

#### Search pattern — filtering nested arrays

```typescript
const results = FORMULA_DATA.flatMap((classData) =>
  classData.chapters.flatMap((chapter) =>
    chapter.formulas
      .filter(
        (f) =>
          f.title.toLowerCase().includes(query.toLowerCase()) ||
          f.latex.toLowerCase().includes(query.toLowerCase()) ||
          f.note?.toLowerCase().includes(query.toLowerCase())
      )
      .map((f) => ({ ...f, cls: classData.cls, chapter: chapter.title }))
  )
);
```

`Array.flatMap(fn)` = `Array.map(fn).flat()` — maps and flattens one level.
Useful for transforming nested arrays into a flat results list.

The `?.` optional chaining in `f.note?.toLowerCase()` safely handles the case
where `note` is `undefined` — equivalent to `f.note ? f.note.toLowerCase() : undefined`.

#### `element.scrollIntoView()` — smooth sidebar navigation

```typescript
const ref = useRef<HTMLDivElement>(null);

function scrollToChapter() {
  ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

`scrollIntoView({ behavior: 'smooth' })` animates the scroll instead of jumping.
`block: 'start'` aligns the element with the top of the visible area.

This is used by sidebar chapter buttons to jump to the corresponding section.

---

## 🇷🇴 Română

### Cerințe

Elevii au nevoie de o referință cu toate formulele pentru clasele IX–XII:

- Formule grupate pe clasă și capitol
- Redare LaTeX ca notație matematică frumoasă via KaTeX
- Căutare full-text în toate clasele simultan
- Buton "Copiază LaTeX"

### Ce s-a implementat

**`src/data/formulas.ts`** (928 linii) — `Formula`, `Chapter`, `ClassData` + `FORMULA_DATA`.

**`src/components/FormulaPage.tsx`** (637 linii):

- `KTex` — `katex.renderToString()` + `useMemo` + `dangerouslySetInnerHTML`
- `FormulaCard` — card cu titlu, formulă, notă, buton copiere
- Sidebar cu tab-uri clase + navigare capitole cu `scrollIntoView`
- Căutare cu `.toLowerCase().includes(query)`

### Concepte explicate

#### KaTeX — renderer LaTeX sincron

```typescript
const html = katex.renderToString('\\frac{a}{b}', {
  displayMode: true, // ecuație bloc (vs inline)
  throwOnError: false, // eroare roșie în loc de excepție
});
```

Mai rapid decât MathJax (sincron, fără WASM), output pixel-perfect.

#### `dangerouslySetInnerHTML` — HTML de încredere

```tsx
<span dangerouslySetInnerHTML={{ __html: html }} />
```

Safe deoarece HTML-ul vine din KaTeX (librărie auditată), nu din input utilizator.
React numește prop-ul „dangerous" pentru a descuraja utilizarea neglijentă — XSS
riscă dacă HTML-ul provine din input utilizator nesanitizat.

#### `useMemo` — memoizarea calculelor costisitoare

```typescript
const html = useMemo(
  () => katex.renderToString(latex, { displayMode: display }),
  [latex, display] // re-calculează doar dacă aceste valori se schimbă
);
```

200+ formule pe pagină — fără memoizare, fiecare apăsare de tastă în search
ar re-calcula toate string-urile KaTeX. Cu `useMemo`, se calculează o singură dată.

#### `navigator.clipboard.writeText()` — scriere clipboard

```typescript
navigator.clipboard.writeText(formula.latex);
```

Nu necesită permisiune (spre deosebire de `clipboard.read()`). Doar pagina trebuie
să fie în focus și pe HTTPS/localhost.

#### Pattern data-driven UI

Date (`formulas.ts`) separate de prezentare (`FormulaPage.tsx`).
Adăugarea unei formule noi = un obiect în `formulas.ts`, fără schimbări JSX.

#### `Array.flatMap` + filtrare nested

```typescript
FORMULA_DATA.flatMap((cls) =>
  cls.chapters.flatMap((ch) => ch.formulas.filter((f) => f.title.toLowerCase().includes(query)))
);
```

`flatMap(fn)` = `map(fn).flat()` — transformă și aplatizează array-uri nested.

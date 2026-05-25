# Commit 19 — Random Test Generator with Fisher-Yates Shuffle

## 🇬🇧 English

### Requirements

Students want to practice with randomised exam papers:

- Select which **years** to draw problems from (multi-select)
- Choose **how many problems** per section (S.I: 1–6, S.II: 1–6, S.III: 1–5)
- Live count of **available problems** per section (updates as year filter changes)
- **Generate** picks random problems and shows them section by section
- Each problem card is **collapsible** — click to expand and see the image
- **Regenerate** button shuffles a new set without changing the configuration
- Back to configuration with the ← Config button

### What Was Implemented

**New `src/components/TestGenerator.tsx`** (280 lines).

**Updated `src/App.tsx`:** added `'test'` page + `TestGenerator` lazy import.

**Updated `src/components/SubiectePage.tsx`** navigation: `onOpenTest` callback now wired.

```typescript
import problemsData from '../../public/problems/problems.json';
const ALL: Problem[] = problemsData as Problem[];
```

Core algorithms:

```typescript
// Fisher-Yates shuffle — O(n), unbiased
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; // copy — never mutate input
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // swap
  }
  return a;
}

function pick<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
```

State:

```typescript
const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set(YEARS));
const [counts, setCounts] = useState({ I: 6, II: 6, III: 5 });
const [mode, setMode] = useState<'config' | 'test'>('config');
const [testProblems, setTestProblems] = useState<{ section: string; problems: Problem[] }[]>([]);

// useMemo: pool only recomputed when selectedYears changes
const pool = useMemo(() => ALL.filter((p) => selectedYears.has(p.year)), [selectedYears]);

// available per section — derived from pool
const available = useMemo(
  () => ({
    I: pool.filter((p) => p.section === 'I').length,
    II: pool.filter((p) => p.section === 'II').length,
    III: pool.filter((p) => p.section === 'III').length,
  }),
  [pool]
);

// generate — stable reference via useCallback
const generate = useCallback(() => {
  const sections = ['I', 'II', 'III'].map((sec) => {
    const candidates = pool.filter((p) => p.section === sec);
    const picked = pick(candidates, Math.min(counts[sec], candidates.length));
    picked.sort((a, b) => a.prob_nr - b.prob_nr);
    return { section: sec, problems: picked };
  });
  setTestProblems(sections);
  setMode('test');
}, [pool, counts]);
```

`ProblemCard` component:

```tsx
function ProblemCard({ prob }: { prob: Problem }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)}>
        {prob.year} · Var. {prob.variant} · S.{prob.section} nr.{prob.prob_nr}
        {open ? '▲' : '▼'}
      </button>
      {open && <img src={`/problems/${prob.imgFile}`} loading="lazy" />}
    </div>
  );
}
```

---

### Concepts Explained

#### Fisher-Yates shuffle — the unbiased algorithm

```typescript
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

**Why not `arr.sort(() => Math.random() - 0.5)`?**

`Array.sort` is comparison-based. The algorithm calls the comparator a total of
`O(n log n)` times to sort `n` elements. But there are `n!` possible permutations.
For `n = 5`, `n! = 120` permutations but `sort` only makes ~12 comparisons — it
cannot give every permutation equal probability.

Fisher-Yates works by iterating from the last element to the first. At each position
`i`, it picks a random index `j` from `0..i` (inclusive) and swaps `a[i]` with `a[j]`.
This produces each of the `n!` permutations with exactly equal probability because
each element has exactly 1/i chance of being placed at each remaining position.

**Destructuring swap:**

```typescript
[a[i], a[j]] = [a[j], a[i]];
```

This is equivalent to:

```typescript
const tmp = a[i];
a[i] = a[j];
a[j] = tmp;
```

#### `Set<number>` for multi-select state

```typescript
const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set(YEARS));

const toggleYear = (y: number) => {
  setSelectedYears((prev) => {
    const next = new Set(prev); // copy — Sets are mutable objects, never mutate state
    if (next.has(y)) {
      if (next.size > 1) next.delete(y); // at least one year must remain
    } else {
      next.add(y);
    }
    return next; // returning a new Set triggers re-render
  });
};
```

`Set` is the right data structure here:

- `has(y)` — O(1) membership check (vs `array.includes()` which is O(n))
- `add(y)` / `delete(y)` — O(1) operations
- `size` — O(1) count

**Why copy the Set?** React uses object identity to detect state changes.
If we mutated the existing Set in place (`prev.add(y)`) and returned it,
`Object.is(prev, next)` would be `true` (same reference) and React would
not re-render. We must return a new Set object.

#### `useMemo` — filtered pool and derived counts

```typescript
const pool = useMemo(() => ALL.filter((p) => selectedYears.has(p.year)), [selectedYears]);

const available = useMemo(
  () => ({
    I: pool.filter((p) => p.section === 'I').length,
    II: pool.filter((p) => p.section === 'II').length,
    III: pool.filter((p) => p.section === 'III').length,
  }),
  [pool]
);
```

`useMemo(() => value, deps)` re-computes `value` only when `deps` change.

Without `useMemo`, `pool` would be recomputed on every render — including renders
caused by the count buttons, which don't change `selectedYears`. With `useMemo`,
the 180-item filter runs only when the year selection actually changes.

`available` depends on `pool`, not `selectedYears` directly — the dependency chain is:

```
selectedYears → pool → available
```

This is the **derived state pattern**: `available` is not stored in `useState`
because it can always be computed from `pool`. Storing derived state in `useState`
creates synchronisation bugs (two sources of truth that can diverge).

#### `useCallback` for the generate function

```typescript
const generate = useCallback(() => {
  // ... uses pool and counts
}, [pool, counts]);
```

`useCallback(fn, deps)` returns the same function reference between renders
unless `deps` change. Without `useCallback`, every render would create a new
function object — this matters because `generate` is also called by the
Regenerate button, and a stable reference avoids unnecessary re-renders of
child components that receive it as a prop.

`useCallback(fn, deps)` ≡ `useMemo(() => fn, deps)` — they're the same hook,
just with different return conventions (`useCallback` returns the function itself,
`useMemo` returns whatever `fn` returns).

#### Generic `shuffle<T>` — TypeScript generics

```typescript
function shuffle<T>(arr: T[]): T[] {
```

The `<T>` makes `shuffle` work with any array type. TypeScript infers `T` at each
call site:

```typescript
shuffle<Problem>(candidates); // explicit
shuffle(candidates); // T inferred as Problem[]
```

Without generics, we'd need a separate `shuffleProblems`, `shuffleStrings`, etc.
Generics let one implementation work correctly for all element types.

#### `loading="lazy"` — deferred image loading

```tsx
<img src={`/problems/${prob.imgFile}`} loading="lazy" />
```

`loading="lazy"` tells the browser not to load the image until it enters (or is
close to) the viewport. Without it, all 180 problem images would start loading
simultaneously when the test is generated — causing a flood of network requests
and slow rendering.

With `loading="lazy"` + collapsible cards, images only load when the user expands
a card, reducing network usage dramatically.

#### Two-screen UI with `Mode` state machine

```typescript
type Mode = 'config' | 'test';
const [mode, setMode] = useState<Mode>('config');

if (mode === 'config') return <ConfigScreen />;
return <TestScreen />;
```

Rather than rendering both screens and hiding one with `display: none`, we render
only the active screen. This keeps the component tree small and avoids unnecessary
DOM work (the test grid isn't rendered while configuring).

The `mode` state machine is a micro-version of the `Page` router in `App.tsx` —
the same pattern applied within a single component.

---

## 🇷🇴 Română

### Cerințe

Elevi doresc să exerseze cu teste randomizate: selecție ani, număr probleme per secțiune,
generare aleatorie, carduri colapsabile cu imagini.

### Ce s-a implementat

**`src/components/TestGenerator.tsx`** (280 linii).

**`src/App.tsx`** — `'test'` adăugat la `Page`, `TestGenerator` lazy import.

### Concepte explicate

#### Fisher-Yates — shuffle nedeformat

```typescript
for (let i = a.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [a[i], a[j]] = [a[j], a[i]];
}
```

`sort(() => Math.random() - 0.5)` e deformat: `sort` face O(n log n) comparații
dar există `n!` permutări — nu poate da probabilitate egală fiecăreia.
Fisher-Yates: la fiecare poziție `i`, alege aleator din `0..i` → distribuție uniformă.

#### `Set<number>` pentru multi-select

`has()` / `add()` / `delete()` = O(1). La toggle, se creează un nou Set (nu mutăm
state-ul existent — React compară prin identitate de referință).

#### `useMemo` — stare derivată

```
selectedYears → pool → available
```

`pool` se recalculează doar când `selectedYears` se schimbă (nu la fiecare render).
`available` e stare derivată din `pool` — nu e stocată în `useState`.

#### `useCallback` — referință stabilă pentru funcție

`useCallback(fn, deps)` ≡ `useMemo(() => fn, deps)`.
`generate` e recreat doar când `pool` sau `counts` se schimbă.

#### Generic `shuffle<T>`

`<T>` face funcția să lucreze cu orice tip de array — TypeScript deduce `T` la fiecare call site.

#### `loading="lazy"` — imagini la cerere

Imaginile se încarcă doar când cardul e în viewport (sau aproape de el).
Fără lazy loading, 180 imagini s-ar descărca simultan la generarea testului.

# Commit 20 — Problems Review Gallery with Multi-Dimensional Filtering

## 🇬🇧 English

### Requirements

Students want to browse all extracted problems in a visual gallery with filtering:

- Filter by **section** (all / S.I / S.II / S.III)
- Filter by **variant** (specific year + variant combination)
- Three **zoom levels**: compact (320px), normal (520px), large (760px)
- Problems grouped by **(year, variant, section)** with colour-coded section headers
- **Live counter** showing how many problems match the current filters
- `loading="eager"` — all visible images load immediately (review mode, not lazy)

### What Was Implemented

**New `src/components/ProblemsReview.tsx`** (270 lines).

**Updated `src/App.tsx`:** added `'review'` page + `ProblemsReview` lazy import.

**Updated `src/components/SubiectePage.tsx`:** `onOpenReview` callback now wired.

```typescript
// Deduplication pattern: Map key = composite string → unique (year, variant) pairs
const variants = Array.from(
  new Map(ALL.map((p) => [`${p.year}_${p.variant}`, { year: p.year, variant: p.variant }])).values()
).sort((a, b) => a.year - b.year || a.variant.localeCompare(b.variant));
```

Grouping in a single pass:

```typescript
type Group = {
  key: string;
  year: number;
  variant: string;
  section: 'I' | 'II' | 'III';
  problems: Problem[];
};
const groups: Group[] = [];
const seen = new Map<string, Group>();

for (const p of filtered) {
  const key = `${p.year}_${p.variant}_${p.section}`;
  if (!seen.has(key)) {
    const g: Group = { key, year: p.year, variant: p.variant, section: p.section, problems: [] };
    seen.set(key, g);
    groups.push(g);
  }
  seen.get(key)!.problems.push(p);
}
```

Dynamic CSS grid column width from zoom state:

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${imgWidth}px, 1fr))`,
}}>
```

Color-coded section theme object:

```typescript
const SECTION_COLORS = {
  I: { bg: '#1a2744', border: '#3b5bdb', text: '#74c0fc' }, // blue
  II: { bg: '#1a2e1a', border: '#2f9e44', text: '#69db7c' }, // green
  III: { bg: '#2d1f0e', border: '#e67700', text: '#ffa94d' }, // orange
};
```

---

### Concepts Explained

#### `Map` for grouping — building groups in a single pass

```typescript
const seen = new Map<string, Group>();

for (const p of filtered) {
  const key = `${p.year}_${p.variant}_${p.section}`;
  if (!seen.has(key)) {
    const g: Group = { key, ..., problems: [] };
    seen.set(key, g);
    groups.push(g);           // maintain insertion order
  }
  seen.get(key)!.problems.push(p);
}
```

This is the standard **group-by** pattern in JavaScript. Instead of:

- Sorting first (O(n log n) then a linear scan), or
- Using `reduce` (readable but creates many intermediate objects)

We use a `Map` as a lookup table: `O(1)` per element, `O(n)` total.

The `groups` array preserves insertion order (order of first encounter in `filtered`),
which gives the natural data order: sorted by year → variant → section.

`!` (non-null assertion) after `seen.get(key)` is safe because we just inserted it —
TypeScript doesn't know this, so we assert with `!` to avoid `| undefined` error.

#### `Array.from(new Map(...).values())` — deduplication pattern

```typescript
const variants = Array.from(
  new Map(ALL.map((p) => [`${p.year}_${p.variant}`, { year: p.year, variant: p.variant }])).values()
);
```

Step by step:

1. `ALL.map(...)` → array of `[key, value]` tuples (e.g., `['2022_var01', {year:2022, variant:'var01'}]`)
2. `new Map(tuples)` → Map where duplicate keys overwrite — effectively deduplicates
3. `.values()` → iterator of unique values
4. `Array.from(...)` → converts iterator to an array

This is more concise than a `Set` + `filter` approach and preserves the value objects.

#### Multi-filter composition with `&&`

```typescript
const filtered = ALL.filter((p) => {
  if (filterSection !== 'all' && p.section !== filterSection) return false;
  if (filterVariant !== 'all' && `${p.year}_${p.variant}` !== filterVariant) return false;
  return true;
});
```

Each filter condition is an early `return false` — if any condition fails, the
element is excluded. The `if (filter !== 'all' && ...)` guard means "only apply
this filter when it's not set to 'all'". Adding a third filter is one more `if`.

This is the **guard clause** pattern (also called "early return" or "fail fast").
It's more readable than a nested ternary or a long `&&` chain.

#### CSS Grid `auto-fill` + `minmax` — responsive image grid

```css
grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
```

- `auto-fill`: fill the row with as many columns as possible
- `minmax(520px, 1fr)`: each column is at least 520px wide, but grows to fill available space

The result: on a 1200px-wide screen, `1200 / 520 ≈ 2.3` → **2 columns** (each ~600px).
On a 2400px screen → **4 columns** (each ~600px). On a 480px screen → **1 column** (480px).

Changing `zoom` state changes `imgWidth` (320 / 520 / 760 px), which is injected into
the `gridTemplateColumns` style. The grid automatically reflows with the new minimum.

This is a pure CSS responsive layout — no JavaScript breakpoints or media queries needed.

#### Color-coded UI — objects as theme maps

```typescript
const SECTION_COLORS = {
  I:   { bg: '#1a2744', border: '#3b5bdb', text: '#74c0fc' },
  II:  { bg: '#1a2e1a', border: '#2f9e44', text: '#69db7c' },
  III: { bg: '#2d1f0e', border: '#e67700', text: '#ffa94d' },
};

// Usage:
const c = SECTION_COLORS[group.section];
<div style={{ background: c.bg, borderColor: c.border }}>
  <span style={{ color: c.text }}>...</span>
</div>
```

`SECTION_COLORS` is a **lookup object** (also called a theme map or dispatch table).
It maps each section to a set of design tokens. This avoids a `switch` statement and
makes the relationship between section and color explicit and type-safe:

```typescript
// TypeScript: SECTION_COLORS['I'] → { bg: string; border: string; text: string }
// SECTION_COLORS['IV'] → TypeScript error
```

#### Reusable `Chip` component

```tsx
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#4f46e5' : '#252840',
        color: active ? '#e0e7ff' : '#718096',
        // ...
      }}
    >
      {children}
    </button>
  );
}
```

`Chip` is a **controlled component** — it receives `active` as a prop and renders
accordingly. It has no internal state. The parent owns the active state:

```tsx
<Chip active={filterSection === 'I'} onClick={() => setFilterSection('I')}>
  S.I
</Chip>
```

`ReactNode` as the `children` type accepts: JSX elements, strings, numbers, arrays,
fragments, `null`, and `undefined`. It's the widest "renderable content" type in React.

---

## 🇷🇴 Română

### Cerințe

Galerie vizuală cu toate problemele extrase, cu filtrare multi-dimensională.

### Ce s-a implementat

**`src/components/ProblemsReview.tsx`** (270 linii).

**`src/App.tsx`** — `'review'` adăugat la `Page`, `ProblemsReview` lazy import.

### Concepte explicate

#### `Map` pentru grupare — un singur parcurs

```typescript
for (const p of filtered) {
  const key = `${p.year}_${p.variant}_${p.section}`;
  if (!seen.has(key)) {
    seen.set(key, newGroup);
    groups.push(newGroup);
  }
  seen.get(key)!.problems.push(p);
}
```

Pattern standard group-by: `Map` ca lookup table, O(1) per element, O(n) total.
`groups` menține ordinea de inserare (ordinea naturală din date).

#### `Array.from(new Map(...).values())` — deduplicare

1. `map()` → perechi `[key, value]`
2. `new Map(perechi)` → cheile duplicate suprascriu (deduplicare)
3. `.values()` → iterator valori unice
4. `Array.from()` → array

#### Filtre compuse cu `&&`

```typescript
if (filterSection !== 'all' && p.section !== filterSection) return false;
if (filterVariant !== 'all' && p.variant !== ...) return false;
return true;
```

Pattern **guard clause** (early return): exclude elementul dacă orice condiție eșuează.
Guard `filter !== 'all'` dezactivează filtrul când e setat pe „toate".

#### CSS Grid `auto-fill` + `minmax` — grid responsiv

```css
grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
```

Lățimea minimă a coloanei e setată dinamic din state (`zoom`).
Nu sunt necesare breakpoint-uri JS sau media queries.

#### Obiecte ca hărți de teme (theme maps)

```typescript
const SECTION_COLORS = { I: {...}, II: {...}, III: {...} };
const c = SECTION_COLORS[group.section]; // lookup O(1), type-safe
```

Alternativă la `switch` — mai concis, type-safe, ușor de extins.

#### Componenta `Chip` controlată

```tsx
<Chip active={filterSection === 'I'} onClick={() => setFilterSection('I')}>
  S.I
</Chip>
```

Componentă fără stare internă — starea `active` e deținută de parent.
`ReactNode` = tip pentru orice poate randa React (JSX, string, number, null, etc.).

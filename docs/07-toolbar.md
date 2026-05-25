# Commit 07 — Floating Toolbar with SVG Icon Buttons

## 🇬🇧 English

### Requirements

The drawing tools need a visible UI so users can switch between them:

- A floating pill-shaped toolbar centered at the top of the screen
- Buttons for: Pen, Line, Rectangle, Ellipse, Text
- Undo and Redo buttons (with disabled state when stack is empty)
- Active tool visually highlighted (dark background)
- Hover effect on inactive buttons
- Toolbar never shrinks or breaks to a new line

### What Was Implemented

**New components:**

- `PillBtn` — reusable circular icon button with active/disabled/hover states
- `Divider` — thin vertical separator between button groups

**New SVG icons:** `IconPen`, `IconLine`, `IconRect`, `IconCircle`, `IconText`,
`IconUndo`, `IconRedo` — all inline, no external files

**Toolbar JSX:** floating `<div>` with `position: fixed`, centered via
`left: 50%; transform: translateX(-50%)`

**Undo/Redo logic (basic):** `undoRef`, `redoRef` stacks; `commit()` now pushes
to undo; keyboard shortcuts added in commit 09

### Concepts Explained

#### Inline SVG in React

SVG icons are written directly in JSX, not imported from files:

```tsx
const IconPen = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);
```

Key SVG attributes:

- `viewBox="0 0 24 24"` — the internal coordinate space (0–24 units). The `width`/`height`
  CSS attributes scale it to actual pixels. This makes icons look the same at any size.
- `fill="none"` — no fill; only the stroke outline is drawn
- `stroke="currentColor"` — inherits the CSS `color` property of the parent element
- `strokeLinecap="round"` — line ends are rounded (not flat or square)
- `strokeLinejoin="round"` — where two lines meet at a corner, the join is rounded

#### `currentColor` — inheriting text color

```css
/* Without currentColor — hardcoded, can't change with CSS */
stroke="#1a1a1a"

/* With currentColor — inherits from the element's CSS color */
stroke="currentColor"
```

`currentColor` is a CSS keyword that resolves to the element's current `color` value.
This makes icons themeable:

```tsx
<button style={{ color: active ? '#fff' : '#333' }}>
  <IconPen /> {/* stroke inherits: white when active, dark gray otherwise */}
</button>
```

No conditional logic needed — the icon color flips automatically when the button color changes.

#### `PillBtn` — reusable component with props interface

```tsx
function PillBtn({
  active,
  onClick,
  children,
  disabled,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) { ... }
```

TypeScript interfaces for props enforce that:

- `active` is a boolean (not a string `"true"`)
- `children` can be any renderable React content
- `title` is optional (adds the browser tooltip on hover)

`React.ReactNode` is the broadest type for children — it accepts strings, numbers, JSX
elements, arrays, `null`, etc.

#### Hover without CSS — `onMouseEnter` / `onMouseLeave`

```tsx
onMouseEnter={(e) => {
  if (!active && !disabled)
    (e.currentTarget as HTMLElement).style.background = '#f0f0f0';
}}
onMouseLeave={(e) => {
  if (!active && !disabled)
    (e.currentTarget as HTMLElement).style.background = 'transparent';
}}
```

We mutate the element's `style` directly instead of using CSS `:hover` because:

1. The default background depends on React state (`active` → dark / normal → transparent)
2. A CSS `:hover` rule would override the active background, requiring specificity tricks
3. Inline `onMouse*` handlers let us keep the logic close to the component state

Note `e.currentTarget` (the element the handler is attached to) vs `e.target`
(the element that was actually clicked — could be a child `<svg>`).

#### Centering a floating bar — `left: 50%; transform: translateX(-50%)`

```css
position: fixed;
top: 14px;
left: 50%; /* left edge at center of screen */
transform: translateX(-50%); /* shift left by half the element's own width */
```

`left: 50%` positions the element's **left edge** at the center of its containing block
(the viewport, for `position: fixed`). Since we want the element's **center** at the
viewport center, we shift it back by half its own width using `translateX(-50%)`.

This works even when the toolbar's width is unknown or changes dynamically — `50%` in
`transform` always refers to the element's own width, not the parent's.

#### `flexShrink: 0` — preventing toolbar collapse

```tsx
style={{ flexShrink: 0 }}   // on PillBtn
```

When a flex container doesn't have enough space, flex items shrink by default (`flexShrink: 1`).
Setting `flexShrink: 0` prevents an item from shrinking below its natural size. Applied to
every button, it ensures the toolbar never collapses or clips its icons on small screens.

#### `userSelect: 'none'` — no text selection on toolbar clicks

```css
user-select: none;
```

Without this, rapidly clicking toolbar buttons would select the button label text (or the SVG),
producing an ugly blue highlight. `userSelect: none` disables text selection on the element
and all its children.

#### Undo/Redo stack pattern

```typescript
const undoRef = useRef<DrawItem[][]>([]); // stack of past states
const redoRef = useRef<DrawItem[][]>([]); // stack of future states

function commit(next: DrawItem[]) {
  undoRef.current = [...undoRef.current, itemsRef.current]; // push current to undo
  redoRef.current = []; // any new draw clears the redo stack
  setCanUndo(true);
  setCanRedo(false);
  setItems(next);
}
```

Each entry in `undoRef` is a **full snapshot** of `items` at that point. When undo is called:

- Pop the top snapshot from `undoRef` → that becomes the new items
- Push the current items onto `redoRef`

This is the **memento pattern**: store complete state snapshots, not diffs. Simple and correct
at the cost of some memory (each snapshot is a new array, but array elements are shared).

---

## 🇷🇴 Română

### Cerințe

Toolurile de desenat au nevoie de o interfață vizibilă pentru a comuta între ele:

- O bară flotantă în formă de pastilă, centrată în partea de sus a ecranului
- Butoane pentru: Pen, Linie, Dreptunghi, Elipsă, Text
- Butoane Undo și Redo (dezactivate când stiva e goală)
- Tool-ul activ evidențiat vizual (fundal închis)
- Efect hover pe butoanele inactive

### Ce s-a implementat

**Componente noi:**

- `PillBtn` — buton circular reutilizabil cu stări active/disabled/hover
- `Divider` — separator vertical subțire între grupuri de butoane

**Icone SVG inline:** `IconPen`, `IconLine`, `IconRect`, `IconCircle`, `IconText`,
`IconUndo`, `IconRedo` — toate inline, fără fișiere externe

**JSX toolbar:** `<div>` flotant cu `position: fixed`, centrat cu
`left: 50%; transform: translateX(-50%)`

**Logică Undo/Redo (de bază):** `undoRef`, `redoRef`; shortcut-uri keyboard în commit 09

### Concepte explicate

#### SVG inline în React

Iconele SVG sunt scrise direct în JSX, nu importate din fișiere:

```tsx
const IconPen = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="..." />
  </svg>
);
```

Atribute cheie SVG:

- `viewBox="0 0 24 24"` — spațiul de coordonate intern (0–24 unități)
- `fill="none"` — fără umplere; doar conturul stroke
- `stroke="currentColor"` — moștenește proprietatea CSS `color` a părintelui
- `strokeLinecap/strokeLinejoin="round"` — capetele/colțurile liniilor sunt rotunjite

#### `currentColor` — moștenirea culorii text

```css
stroke="currentColor"  /* se rezolvă la valoarea CSS color a elementului */
```

`currentColor` face iconele tematizabile automat:

```tsx
<button style={{ color: active ? '#fff' : '#333' }}>
  <IconPen /> {/* stroke moștenire: alb când activ, gri închis altfel */}
</button>
```

Nu e nevoie de logică condițională — culoarea iconiței se schimbă automat.

#### `PillBtn` — componentă reutilizabilă cu interfață de props

```tsx
function PillBtn({ active, onClick, children, disabled, title }: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) { ... }
```

TypeScript impune că `active` este boolean, `children` poate fi orice conținut React
(`React.ReactNode`), iar `title` este opțional (adaugă tooltip nativ la hover).

#### Hover fără CSS — `onMouseEnter` / `onMouseLeave`

Mutăm direct `style.background` al elementului pentru că fundalul implicit depinde de
state-ul React (`active` → închis / normal → transparent). O regulă CSS `:hover` ar
suprascrie fundalul activ.

`e.currentTarget` = elementul pe care e atașat handler-ul; `e.target` = elementul care
a primit click-ul (ar putea fi un `<svg>` copil).

#### Centrarea barei flotante — `left: 50%; transform: translateX(-50%)`

```css
position: fixed;
top: 14px;
left: 50%; /* marginea stângă la centrul viewport-ului */
transform: translateX(-50%); /* deplasare cu jumătate din lățimea proprie */
```

`left: 50%` plasează **marginea stângă** a elementului la centrul viewport-ului. Trebuie
să deplasăm cu jumătate din lățimea proprie → `translateX(-50%)`. Funcționează chiar
dacă lățimea toolbar-ului se schimbă dinamic.

#### Pattern-ul stivei Undo/Redo

```typescript
function commit(next: DrawItem[]) {
  undoRef.current = [...undoRef.current, itemsRef.current]; // push stare curentă
  redoRef.current = []; // orice desen nou șterge stiva redo
  setItems(next);
}
```

Fiecare intrare din `undoRef` este un **snapshot complet** al `items` la acel moment.
La undo: pop din `undoRef` → devine noile items; push curent în `redoRef`.

Acesta este **pattern-ul memento**: stochezi snapshot-uri complete, nu diff-uri. Simplu
și corect, cu costul unui pic mai mult memorie.

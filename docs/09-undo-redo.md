# Commit 09 — Undo and Redo with Keyboard Shortcuts

## 🇬🇧 English

### Requirements

Users need to be able to reverse mistakes and redo undone actions:

- **Ctrl+Z** (Windows/Linux) / **⌘Z** (Mac) — undo last action
- **Ctrl+Y** or **Ctrl+Shift+Z** — redo
- **Escape** — close any open panels
- Undo/Redo toolbar buttons reflect the available state (disabled when stack is empty)
- Keyboard shortcuts don't interfere with typing in text inputs

### What Was Implemented

**Upgraded:**

- `undo()` and `redo()` converted to `useCallback` (stable function references)
- New `useEffect` subscribes `keydown` on `window`, with `[undo, redo]` deps
- `Escape` key inlines `setShowColorPanel(false)` to avoid closure deps

**The undo/redo system was already started in commit 07** (stacks + buttons). This
commit completes it by adding keyboard control and stable function references.

### Concepts Explained

#### `useCallback` — memoizing functions

```typescript
const undo = useCallback(() => {
  if (!undoRef.current.length) return;
  // ... pop undo stack, push redo, setItems
}, []); // empty deps: this function never needs to be recreated
```

`useCallback(fn, deps)` returns the **same function reference** across re-renders,
as long as none of the `deps` change. Without it, `undo` would be a brand-new function
object on every render — which causes downstream `useEffect` to re-subscribe every time.

**`useCallback` vs `useMemo`:**

- `useMemo(fn, deps)` — memoizes the **return value** of `fn`
- `useCallback(fn, deps)` — memoizes `fn` **itself** (the function reference)
- `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`

Both only make a difference when the result is used in dependency arrays or passed to
React.memo children. For functions only called in event handlers, they don't matter much.

#### Keyboard events on `window` — `useEffect` with cleanup

```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return; // don't intercept while typing
    const ctrl = e.ctrlKey || e.metaKey; // ⌘ on Mac = metaKey
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
    if (e.key === 'Escape') setShowColorPanel(false);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey); // cleanup!
}, [undo, redo]);
```

Why `window` instead of the canvas? The canvas only receives keyboard events when it
has focus. The user is likely focused on a toolbar button or the text input — `window`
catches keyboard events regardless of focus.

#### `e.ctrlKey || e.metaKey` — cross-platform modifier keys

```typescript
const ctrl = e.ctrlKey || e.metaKey;
```

| Platform        | Undo shortcut | Key property         |
| --------------- | ------------- | -------------------- |
| Windows / Linux | Ctrl+Z        | `e.ctrlKey === true` |
| macOS           | ⌘Z            | `e.metaKey === true` |

`metaKey` on Mac is the Command key (⌘). On Windows, it's the Windows key — but users
don't typically use Windows key shortcuts in web apps. This pattern is the standard
way to write cross-platform Ctrl/⌘ shortcuts.

#### `e.preventDefault()` — stopping the browser's built-in undo

Without `e.preventDefault()`, Ctrl+Z in a browser would trigger the browser's own
undo (which would undo changes in form inputs, not our canvas). We call `preventDefault`
to take full control of the shortcut.

Important: `preventDefault` does **not** stop the event from propagating to parent
elements. For that, use `e.stopPropagation()`. But here we don't need it.

#### `e.target instanceof HTMLInputElement` — not intercepting while typing

```typescript
if (e.target instanceof HTMLInputElement) return;
```

When the user is typing in the text overlay input, we don't want Ctrl+Z to undo
a canvas stroke — the browser's default undo (reverting the typed character) is more
useful. This check skips our handler when the focused element is a text input.

`instanceof` is a JavaScript operator that checks if an object is an instance of a
class (or inherits from it). `HTMLInputElement` is the DOM class for `<input>` elements.

#### The undo stack — memento pattern

```typescript
const undoRef = useRef<DrawItem[][]>([]); // stack: each entry is a full items snapshot

function commit(next: DrawItem[]) {
  undoRef.current = [...undoRef.current, itemsRef.current]; // push current state
  redoRef.current = []; // new action clears redo history
  setItems(next);
}

const undo = useCallback(() => {
  const prev = undoRef.current.at(-1); // peek
  redoRef.current.push(itemsRef.current); // save current to redo
  undoRef.current = undoRef.current.slice(0, -1); // pop undo
  setItems(prev);
}, []);
```

This is the **memento pattern**: each state change stores a complete snapshot. Pros:

- Simple to implement and understand
- Undo/redo in O(1) — just swap arrays
- No need to track "inverse operations"

Cons: memory proportional to history depth × items count. For thousands of items
and deep history, diff-based approaches (like storing just what changed) save memory.
For typical use (dozens of strokes), full snapshots are fine — array element references
are shared, not cloned.

#### Why `useRef` for the undo/redo stacks (not `useState`)

```typescript
const undoRef = useRef<DrawItem[][]>([]);
const redoRef = useRef<DrawItem[][]>([]);
```

We need to push/pop from these stacks **inside event handlers and callbacks** without
triggering re-renders. If they were `useState`, every push/pop would cause a re-render.
The _only_ thing users need to see change is `canUndo` / `canRedo` (to enable/disable
buttons) — and those are real state, updated after the stack mutation.

---

## 🇷🇴 Română

### Cerințe

Utilizatorii au nevoie să reverseze greșelile și să re-aplice acțiunile anulate:

- **Ctrl+Z** — undo; **Ctrl+Y** / **Ctrl+Shift+Z** — redo
- **Escape** — închide panourile deschise
- Butoanele din toolbar reflectă disponibilitatea (dezactivate când stiva e goală)
- Shortcut-urile nu interferează cu tastarea în text inputs

### Ce s-a implementat

**Actualizat:**

- `undo()` și `redo()` convertite la `useCallback` (referințe stabile de funcții)
- Nou `useEffect` subscrie `keydown` pe `window`, cu deps `[undo, redo]`
- Tasta `Escape` apelează inline `setShowColorPanel(false)`

### Concepte explicate

#### `useCallback` — memoizarea funcțiilor

```typescript
const undo = useCallback(() => {
  // ... logica undo
}, []); // deps goale: funcția nu trebuie recreată niciodată
```

`useCallback(fn, deps)` returnează **aceeași referință de funcție** la re-render-uri,
atât timp cât niciunul din `deps` nu se schimbă. Fără el, `undo` ar fi un obiect de
funcție nou la fiecare render — ceea ce determină `useEffect`-ul dependent să se
re-subscrie la fiecare render.

**`useCallback` vs `useMemo`:**

- `useMemo(fn, deps)` — memoizează **valoarea returnată** de `fn`
- `useCallback(fn, deps)` — memoizează `fn` **însuși** (referința funcției)

#### Evenimente keyboard pe `window` — `useEffect` cu cleanup

```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return; // nu intercepta la tastare
    const ctrl = e.ctrlKey || e.metaKey; // ⌘ pe Mac = metaKey
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // ...
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey); // cleanup!
}, [undo, redo]);
```

De ce `window` în loc de canvas? Canvas-ul primește keyboard events doar când are focus.
`window` captează toate keyboard events indiferent de focus.

#### `e.ctrlKey || e.metaKey` — modificatori cross-platform

| Platformă       | Shortcut | Proprietate          |
| --------------- | -------- | -------------------- |
| Windows / Linux | Ctrl+Z   | `e.ctrlKey === true` |
| macOS           | ⌘Z       | `e.metaKey === true` |

`metaKey` pe Mac = tasta Command (⌘). Acest pattern este modul standard de a scrie
shortcut-uri Ctrl/⌘ cross-platform.

#### `e.preventDefault()` — oprirea undo-ului nativ al browserului

Fără `e.preventDefault()`, Ctrl+Z ar declanșa undo-ul propriu al browserului
(ar reverta schimbările în form inputs, nu pe canvas-ul nostru).

#### `e.target instanceof HTMLInputElement` — nu intercepta la tastare

```typescript
if (e.target instanceof HTMLInputElement) return;
```

Când utilizatorul tastează în input-ul de text overlay, nu vrem ca Ctrl+Z să anuleze
o trăsătură canvas — undo-ul nativ al browserului (care revine ultimul caracter tastat)
este mai util acolo.

#### Stiva undo — pattern-ul memento

```typescript
const undoRef = useRef<DrawItem[][]>([]); // stivă de snapshot-uri complete

function commit(next: DrawItem[]) {
  undoRef.current = [...undoRef.current, itemsRef.current]; // push starea curentă
  redoRef.current = []; // orice acțiune nouă șterge istoricul redo
  setItems(next);
}
```

**Pattern-ul memento**: fiecare schimbare de stare stochează un snapshot complet.
Avantaje: simplu, undo/redo în O(1).
Dezavantaje: memorie proporțională cu adâncimea istoricului × numărul de items.
Pentru utilizare tipică (zeci de trăsături), snapshot-urile complete sunt fine —
referințele la elementele array-ului sunt partajate, nu clonate.

#### De ce `useRef` pentru stivele undo/redo (nu `useState`)

Avem nevoie să facem push/pop în aceste stive **în interiorul event handlers și
callback-urilor** fără a declanșa re-render-uri. Singurul lucru pe care utilizatorii
trebuie să îl vadă schimbând este `canUndo` / `canRedo` (pentru a activa/dezactiva
butoanele) — iar acelea sunt state real, actualizate după mutația stivei.

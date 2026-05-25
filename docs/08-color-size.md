# Commit 08 — Color Palette Panel and Stroke Size Selector

## 🇬🇧 English

### Requirements

All drawing tools should respect a chosen color and stroke width:

- A **color dot** in the toolbar shows the current color and opens a panel on click
- 9 preset colors + a native color picker for any custom color
- 4 stroke size options (2, 4, 8, 16 px) with visual preview dots
- Selected color/size visually indicated in the panel
- Panel closes when the user clicks the canvas

### What Was Implemented

**New constants:**

- `PALETTE` — array of 9 preset color hex strings
- `PEN_SIZES` — array of `[2, 4, 8, 16]` stroke widths

**New state:**

- `color` / `colorRef` — current stroke color (state + ref mirror)
- `penSize` / `penSizeRef` — current stroke width (state + ref mirror)
- `showColorPanel` — panel visibility toggle

**Updated:**

- `pointerDown` calls `closePopovers()` to dismiss the panel on canvas click
- `commit*` functions now use `colorRef.current` and `penSizeRef.current`
- Color dot button in toolbar JSX

### Concepts Explained

#### The ref-mirrors-state pattern — stale closures in event handlers

This pattern appears for every piece of state used in pointer event handlers:

```typescript
const [color, setColor] = useState('#1a1a1a');
const colorRef = useRef('#1a1a1a');

useEffect(() => {
  colorRef.current = color; // keep ref in sync when state changes
}, [color]);
```

**Why both?**

- `color` (state) — React needs this to re-render the UI (toolbar color dot, active
  highlights in the panel). Without it, picking a new color wouldn't update the dot.
- `colorRef` (ref) — pointer event handlers (like `pointerDown` / `pointerMove`) are
  created once and not recreated on every re-render. Without a ref, they'd capture
  the _initial_ value of `color` and never see updates (the stale closure problem).

The same pattern applies to `penSizeRef`, `toolRef`, `itemsRef` — any state that
event handlers need to read in real time.

```typescript
// In pointerDown — reads the CURRENT color via ref, not the stale closure value
currentPenRef.current = {
  kind: 'pen',
  color: colorRef.current, // ✓ always the latest
  width: penSizeRef.current,
  points: [pos],
};
```

#### `<input type="color">` — native color picker

```html
<input type="color" value="#1a1a1a" onChange="{...}" />
```

The browser renders a native OS color picker. Key properties:

- `value` must be a 6-digit hex string: `#rrggbb` (e.g. `#e53e3e`). Shorter forms
  like `#e53` are **not** supported.
- The `change` event fires when the user closes the picker (not live on drag).
  Use `input` event for live updates if needed.
- CSS styling is limited — you can set `width`, `height`, `border-radius`, but the
  picker popup itself is OS-controlled.

```typescript
<input
  type="color"
  value={color}                         // controlled: always shows current color
  onChange={(e) => setColor(e.target.value)}  // e.target.value is always #rrggbb
/>
```

#### Panel toggle pattern

```typescript
const [showColorPanel, setShowColorPanel] = useState(false);

// Toggle on button click:
onClick={() => setShowColorPanel(v => !v)}

// Close on canvas interaction:
function closePopovers() {
  setShowColorPanel(false);
}
// called at the top of pointerDown
```

The toggle (`v => !v`) uses the functional update form of `setX` — passing a function
instead of a value. React calls it with the **current** state value as `v`, so even if
multiple clicks fire before the re-render, the final value is correct. This is safer
than `setShowColorPanel(!showColorPanel)`, which captures a potentially stale value.

#### `data-toolbar` / `data-panel` attributes as click-outside selectors

```typescript
// On the toolbar:
<div data-toolbar ...>

// On the color panel:
<div data-panel ...>

// A more sophisticated "click outside to close" would use:
function handleDocumentClick(e: MouseEvent) {
  const el = e.target as HTMLElement;
  if (!el.closest('[data-panel]') && !el.closest('[data-toolbar]')) {
    closePopovers();
  }
}
```

We use `data-*` attributes as semantic markers instead of class names for targeting
elements in "click outside" detection. The `closest()` DOM method walks up the ancestor
chain checking if any ancestor matches the selector — perfect for detecting whether
a click landed inside or outside a component.

In this commit we use the simpler approach (canvas `pointerDown` closes panels), but
the `data-panel` / `data-toolbar` attributes are placed for future use.

#### `<input type="color">` value format — #rrggbb only

The color input always returns a **lowercase 6-digit hex** string:

- `"#e53e3e"` ✓ valid
- `"#E53E3E"` — input normalizes to lowercase
- `"rgb(229, 62, 62)"` — NOT returned; always hex
- `"#e53"` — NOT valid as a value prop

If you need to display a color name or different format, convert after receiving the hex.

#### Why colors are strings, not objects

Storing color as `string` (`'#e53e3e'`) rather than `{ r: 229, g: 62, b: 62 }`:

- Canvas API expects strings: `ctx.strokeStyle = '#e53e3e'`
- `<input type="color">` returns strings
- Simple equality comparison: `c === color` instead of `deepEqual(c, color)`
- Easier JSON serialization (for future save/load)

---

## 🇷🇴 Română

### Cerințe

Toate toolurile de desenat ar trebui să respecte culoarea și grosimea stroke-ului alese:

- Un **punct colorat** în toolbar arată culoarea curentă și deschide un panou la click
- 9 culori presetate + un color picker nativ pentru orice culoare customă
- 4 opțiuni de dimensiune stroke (2, 4, 8, 16 px) cu puncte de preview vizual
- Culoarea/dimensiunea selectată indicată vizual în panou
- Panoul se închide când utilizatorul dă click pe canvas

### Ce s-a implementat

**Constante noi:**

- `PALETTE` — array de 9 string-uri hex de culori presetate
- `PEN_SIZES` — array `[2, 4, 8, 16]` de grosimi stroke

**State nou:**

- `color` / `colorRef` — culoarea curentă a stroke-ului (state + ref mirror)
- `penSize` / `penSizeRef` — grosimea curentă a stroke-ului
- `showColorPanel` — toggle vizibilitate panou

**Actualizat:**

- `pointerDown` apelează `closePopovers()` la click pe canvas
- Funcțiile `commit*` folosesc acum `colorRef.current` și `penSizeRef.current`
- Buton punct color în toolbar JSX

### Concepte explicate

#### Pattern-ul ref-oglindă-state — stale closures în event handlers

```typescript
const [color, setColor] = useState('#1a1a1a');
const colorRef = useRef('#1a1a1a');

useEffect(() => {
  colorRef.current = color; // sincronizăm ref când state-ul se schimbă
}, [color]);
```

**De ce ambele?**

- `color` (state) — React are nevoie pentru re-render (punctul color din toolbar,
  evidențierea în panou). Fără el, schimbarea culorii nu ar actualiza UI-ul.
- `colorRef` (ref) — handler-ele de pointer events sunt create o singură dată și
  nu sunt recreate la fiecare re-render. Fără ref, ar captura valoarea _inițială_
  a `color` și nu ar vedea niciodată actualizările (problema stale closure).

#### `<input type="color">` — color picker nativ

```html
<input type="color" value="#1a1a1a" onChange="{...}" />
```

Browserul randează un color picker nativ OS. Proprietăți cheie:

- `value` trebuie să fie un string hex de 6 cifre: `#rrggbb`
- Evenimentul `change` se declanșează când utilizatorul închide picker-ul
- Stilizarea CSS este limitată; popup-ul picker-ului este controlat de OS

```typescript
onChange={(e) => setColor(e.target.value)}  // e.target.value este mereu #rrggbb
```

#### Pattern-ul toggle de panou

```typescript
// Toggle la click pe buton:
onClick={() => setShowColorPanel(v => !v)}  // forma funcțională

// Închidere la interacțiunea cu canvas-ul:
function closePopovers() { setShowColorPanel(false); }
```

Forma funcțională `v => !v` este mai sigură decât `!showColorPanel` deoarece React
apelează funcția cu valoarea **curentă** a state-ului, evitând captarea unei valori stale.

#### De ce culorile sunt string-uri, nu obiecte

Stocăm culoarea ca `string` (`'#e53e3e'`) nu ca `{ r: 229, g: 62, b: 62 }`:

- Canvas API acceptă string-uri: `ctx.strokeStyle = '#e53e3e'`
- `<input type="color">` returnează string-uri
- Comparație simplă de egalitate: `c === color`
- Serializare JSON mai ușoară (pentru viitoarea funcționalitate save/load)

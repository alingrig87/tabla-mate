# Commit 06 — Text Tool with Coordinate-Aware Input Overlay

## 🇬🇧 English

### Requirements

Users need to add typed text annotations anywhere on the whiteboard:

- Click anywhere to place a text cursor at that position
- An `<input>` overlay appears so the user can type
- Press **Enter** to commit the text to the canvas
- Press **Escape** to cancel without drawing anything
- Clicking elsewhere while editing commits the current text and opens a new cursor
- Text must align visually: the top of the letters touches the click point

### What Was Implemented

**New types:**

- `TextItem` — stores world position (`x`, `y`), font size, color, and content
- `TextCursor` — tracks the active text input; holds **both** world coords (`x`, `y`) and screen coords (`sx`, `sy`)

**New constant:** `TEXT_FONT_SIZE = 24`

**New functions:**

- `commitText(tc)` — draws `TextItem` to canvas or discards if empty, clears overlay

**Updated:**

- `drawItem()` — new `case 'text'` using `ctx.fillText`
- `PenTool` union — added `'text'`
- `pointerDown` — handles text cursor placement
- JSX — renders `<input>` overlay when `textCursor` is non-null

### Concepts Explained

#### World coordinates vs screen coordinates

The canvas uses a **world coordinate system**: as you pan and zoom (added in commit 12),
the same point on the canvas moves to different pixel positions on screen.

```
screen_x = (world_x - pan.x) * scale
world_x  = screen_x / scale + pan.x
```

For **drawing** (`ctx.fillText`), we need **world coordinates** — where the text lives
permanently in the canvas space.

For the **CSS overlay** (`position: fixed; left: ...; top: ...`), we need **screen
coordinates** — the pixel position relative to the viewport.

`TextCursor` stores both:

```typescript
interface TextCursor {
  x: number; // world coords — for ctx.fillText(content, x, y)
  y: number;
  sx: number; // screen coords — for style={{ left: sx, top: sy }}
  sy: number;
  value: string;
}
```

In `pointerDown`:

```typescript
const pos = getPos(e); // world coords (via pan/zoom formula)
const sp = getScreenPos(e); // screen coords (raw CSS pixels)
setTextCursor({ x: pos.x, y: pos.y, sx: sp.x, sy: sp.y, value: '' });
```

Without this separation, the input box would visually drift away from the click point
after any pan or zoom.

#### `position: fixed` vs `position: absolute` for overlays

```css
/* fixed — positioned relative to the VIEWPORT */
position: fixed;
left: 240px; /* 240 CSS pixels from the left edge of the screen */
top: 180px;

/* absolute — positioned relative to the nearest positioned ancestor */
position: absolute;
left: 240px; /* 240px from the nearest ancestor with position: relative/absolute */
```

We use `position: fixed` because:

1. The canvas is `position: fixed; inset: 0` — it fills the viewport
2. `getScreenPos()` returns coords relative to the viewport
3. The input must appear exactly where the user clicked in **viewport space**

`position: absolute` would require knowing the scroll offset and the offset of
the nearest positioned ancestor, which is unnecessary complexity.

#### `ctx.fillText(text, x, y)` and `ctx.font`

```typescript
ctx.fillStyle = '#1a1a1a'; // text color
ctx.font = '24px sans-serif'; // size + family — CSS font shorthand
ctx.textBaseline = 'top'; // y is the TOP of the text (not the baseline)
ctx.fillText('Hello world', x, y); // draw at (x, y)
```

`ctx.font` accepts the CSS font shorthand: `'italic bold 18px Georgia'`.
Common values: `'16px monospace'`, `'bold 24px sans-serif'`.

#### `textBaseline` — vertical text alignment

```
textBaseline: 'alphabetic'  ← default: y is the baseline (bottom of capital letters)
textBaseline: 'top'         ← y is the top of the em-box
textBaseline: 'middle'      ← y is the vertical center
textBaseline: 'bottom'      ← y is the bottom of the descenders
```

We use `'top'` so the text's top edge aligns exactly with where the user clicked.
With the default `'alphabetic'`, text would appear _above_ the click point (the baseline
would be at y, so the visible top would be ~20px higher).

#### Controlled input in React

```typescript
<input
  value={textCursor.value}                         // React controls the value
  onChange={(e) => setTextCursor({                 // update state on every keystroke
    ...textCursor,
    value: e.target.value
  })}
/>
```

A **controlled component** means React's state is the single source of truth for
the input's value. Every keystroke fires `onChange`, which updates the state, which
re-renders the input. This is the standard React pattern for form inputs.

An **uncontrolled component** would use `useRef` + `ref.current.value` — React
doesn't track the value, and you read it only when needed (e.g., on submit). Simpler,
but harder to validate or transform in real time.

#### `autoFocus` — automatic focus on mount

```html
<input autofocus ... />
```

When the `<input>` mounts (i.e., when `textCursor` goes from `null` to a value),
`autoFocus` tells the browser to immediately focus it. Without this, the user would
have to click the input to start typing.

`autoFocus` works reliably for elements that appear via conditional rendering. For
elements that exist but are hidden (e.g., `display: none`), use `ref.current.focus()`
in a `useEffect` instead.

#### `onBlur` — committing when the user clicks away

```typescript
onBlur={() => commitText(textCursor)}
```

`onBlur` fires when the input loses focus — for example, when the user clicks elsewhere
on the canvas. We use this to automatically commit the text so the user doesn't have to
press Enter explicitly. Combined with the `pointerDown` check:

```typescript
// pointerDown (text tool):
if (textCursor) commitText(textCursor); // commit before placing new cursor
setTextCursor({ x: pos.x, y: pos.y, sx: sp.x, sy: sp.y, value: '' });
```

This creates a natural flow: click → type → click elsewhere → text committed, new cursor placed.

---

## 🇷🇴 Română

### Cerințe

Utilizatorii au nevoie să adauge text oriunde pe tablă:

- Click oriunde plasează un cursor de text
- Un `<input>` overlay apare pentru tastare
- **Enter** comite textul pe canvas; **Escape** anulează
- Click în altă parte comite textul curent și plasează un cursor nou
- Literele să fie aliniate vizual cu punctul de click

### Ce s-a implementat

**Tipuri noi:**

- `TextItem` — stochează poziția în coordonate lume (`x`, `y`), font size, culoare, conținut
- `TextCursor` — urmărește input-ul activ; conține atât coordonate lume (`x`, `y`), cât și coordonate ecran (`sx`, `sy`)

**Constantă nouă:** `TEXT_FONT_SIZE = 24`

**Funcție nouă:** `commitText(tc)` — desenează `TextItem` sau discardează dacă gol, șterge overlay-ul

**Actualizat:**

- `drawItem()` — `case 'text'` cu `ctx.fillText`
- Uniunea `PenTool` — adăugat `'text'`
- `pointerDown` — gestionează plasarea cursorului de text
- JSX — randează `<input>` overlay când `textCursor` nu e null

### Concepte explicate

#### Coordonate lume vs coordonate ecran

Canvas-ul folosește un **sistem de coordonate lume**: când pan-ezi sau zoomezi (commit 12),
același punct de pe canvas se mută la alte poziții pe ecran.

```
screen_x = (world_x - pan.x) * scale
world_x  = screen_x / scale + pan.x
```

- Pentru **desenat** (`ctx.fillText`) → coordonate lume
- Pentru **overlay-ul CSS** (`position: fixed`) → coordonate ecran

`TextCursor` le stochează pe ambele:

```typescript
interface TextCursor {
  x: number; // coordonate lume — pentru ctx.fillText(content, x, y)
  y: number;
  sx: number; // coordonate ecran — pentru style={{ left: sx, top: sy }}
  sy: number;
  value: string;
}
```

Fără această separare, input-ul ar fi vizual deplasat față de punctul de click după orice
pan sau zoom.

#### `position: fixed` vs `position: absolute` pentru overlay-uri

Folosim `position: fixed` deoarece:

1. Canvas-ul este `position: fixed; inset: 0` — umple viewport-ul
2. `getScreenPos()` returnează coordonate relative la viewport
3. Input-ul trebuie să apară exact unde a dat click utilizatorul în spațiul viewport

#### `ctx.fillText` și `ctx.font`

```typescript
ctx.fillStyle = '#1a1a1a';
ctx.font = '24px sans-serif'; // scurtătură CSS pentru font
ctx.textBaseline = 'top'; // y = marginea superioară a textului
ctx.fillText('Bună ziua', x, y);
```

#### `textBaseline` — alinierea verticală a textului

```
'alphabetic'  ← implicit: y = linia de bază (sub literele majuscule)
'top'         ← y = marginea superioară a em-box-ului
'middle'      ← y = centrul vertical
'bottom'      ← y = marginea inferioară
```

Folosim `'top'` ca marginea superioară a textului să coincidă exact cu punctul de click.
Cu `'alphabetic'`, textul ar apărea _deasupra_ punctului de click (linia de bază ar fi la y).

#### Input controlat în React

```typescript
<input
  value={textCursor.value}
  onChange={(e) => setTextCursor({ ...textCursor, value: e.target.value })}
/>
```

O **componentă controlată** înseamnă că state-ul React este singura sursă de adevăr
pentru valoarea input-ului. Fiecare tastă declanșează `onChange` → actualizează state-ul
→ re-randează input-ul. Acesta este pattern-ul standard React pentru formulare.

#### `autoFocus` — focus automat la montare

```html
<input autofocus ... />
```

Când `<input>` se montează (când `textCursor` trece de la `null` la o valoare),
`autoFocus` spune browserului să îl focuseze imediat. Fără acesta, utilizatorul
ar trebui să dea click pe input pentru a începe tastarea.

#### `onBlur` — comiterea la click în altă parte

```typescript
onBlur={() => commitText(textCursor)}
```

`onBlur` se declanșează când input-ul pierde focusul — de exemplu, când utilizatorul
dă click în altă parte pe canvas. Astfel textul se comite automat fără ca utilizatorul
să apese Enter.

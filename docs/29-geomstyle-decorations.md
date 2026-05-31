# Commit 29 — GeomStyle: Decoration Toggles for Geometric Shapes

## 🇬🇧 English

### What Was Added

Four **decoration toggle buttons** inside the shapes panel that layer visual annotations on top of any drawn geometric shape:

| Button  | Decoration | Color | What it draws                            |
| ------- | ---------- | ----- | ---------------------------------------- |
| **h**   | Height     | Red   | Altitude line + right-angle foot mark    |
| **∠**   | Angle      | Amber | Arc at the relevant vertex               |
| **abc** | Labels     | Dark  | Vertex letters (A, B, C…) and side names |
| **d**   | Diagonal   | Green | Dashed diagonal or midline               |

Toggles are **per-session**: they affect all shapes placed after the toggle, and are stored in each `GeomItem` at draw time.

### Architecture

**`src/shapes/index.ts`**

```typescript
export interface GeomStyle {
  height?: boolean; // red altitude + right-angle mark
  angle?: boolean; // amber arc at vertex
  labels?: boolean; // A/B/C vertex labels, a/b/c side labels
  diagonal?: boolean; // green dashed diagonal / midline
}
```

Each `GeomItem` gains an optional `style?: GeomStyle`. When `drawGeom()` is called it reads these flags and calls the matching decoration helper:

| Helper      | Draws                                        |
| ----------- | -------------------------------------------- |
| `decHeight` | Dashed red line from vertex to base + ⌐ mark |
| `decAngle`  | Arc inside the angle, amber stroke           |
| `decVertex` | Letter near a vertex at fixed visual size    |
| `decDiag`   | Dashed green line across the bounding box    |

**`src/components/CanvasBoard.tsx`**

```typescript
const [geomStyle, setGeomStyle] = useState<GeomStyle>({
  height: true,
  angle: true,
  labels: true,
  diagonal: true,
});
const geomStyleRef = useRef<GeomStyle>(geomStyle);
```

`geomStyleRef` is kept in sync with `geomStyle` via a `useEffect`. Pointer handlers read from the ref (no stale closure), UI buttons read from state (React re-render).

When a shape is placed, the current style is **snapshotted** into the item:

```typescript
commit([...itemsRef.current, {
  kind: 'geom',
  geomKind: activeGeomRef.current,
  style: { ...geomStyleRef.current },   // snapshot, not reference
  ...
}]);
```

Spreading `geomStyleRef.current` clones the object so future toggle changes don't retroactively modify already-placed shapes.

### Concepts Explained

#### Why snapshot instead of reference

If we stored `style: geomStyleRef.current` (the live object), toggling a button later would silently change the appearance of every previously placed shape because they'd all share the same object. Spreading (`{ ...obj }`) creates a shallow copy that freezes the decoration state at placement time.

#### Decoration color tokens

```typescript
const DEC_HEIGHT = '#dc2626'; // red
const DEC_ANGLE = '#d97706'; // amber
const DEC_LABEL = '#0f172a'; // near-black
const DEC_DIAG = '#16a34a'; // green
```

Each decoration type has its own fixed color regardless of the shape's stroke color, so they are always visually distinguishable.

#### Right-angle mark (`decHeight`)

```typescript
// Small square at the foot of the altitude, rotated to match the base
ctx.beginPath();
ctx.moveTo(fx + nx * sq, fy + ny * sq);
ctx.lineTo(fx + nx * sq - ny * sq, fy + ny * sq + nx * sq);
ctx.lineTo(fx - ny * sq, fy + nx * sq);
ctx.stroke();
```

The `n` vector is the unit normal to the base segment. Rotating it 90° gives the perpendicular direction needed to draw the two legs of the right-angle mark.

---

## 🇷🇴 Română

### Ce s-a adăugat

Patru butoane **toggle** în panoul de forme care adaugă adnotări vizuale pe figurile geometrice desenate:

| Buton   | Decorație | Culoare    | Ce desenează                                |
| ------- | --------- | ---------- | ------------------------------------------- |
| **h**   | Înălțime  | Roșu       | Linie de înălțime + marcaj unghi drept      |
| **∠**   | Unghi     | Chihlimbar | Arc la vârful relevant                      |
| **abc** | Etichete  | Închis     | Litere vârfuri (A, B, C…) și laturi         |
| **d**   | Diagonală | Verde      | Diagonală sau linie medie cu linie punctată |

Toggle-urile sunt **per-sesiune**: afectează toate figurile plasate după schimbare, fiecare `GeomItem` stochând o copie a stilului activ la momentul plasării.

### Arhitectură

`GeomStyle` e un obiect cu 4 câmpuri booleene opționale. `geomStyleRef` urmărește starea curentă fără închideri stale. La plasarea figurii, stilul e copiat (`{ ...geomStyleRef.current }`) în item — astfel, toggle-urile ulterioare nu modifică figurile deja desenate.

Fiecare decorație are propriul helper (`decHeight`, `decAngle`, `decVertex`, `decDiag`) și propria culoare fixă, independent de culoarea figurii.

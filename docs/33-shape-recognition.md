# Commit 33 — Freehand Shape Recognition (Line & Circle)

## 🇬🇧 English

### What Was Added

The pen tool now **automatically recognizes** when a freehand stroke looks like a straight
line or a circle and replaces it with the clean geometric version — the same item that the
dedicated line/circle tools would produce.

| You draw…                 | Gets replaced with…                        |
| ------------------------- | ------------------------------------------ |
| A roughly straight stroke | A pixel-perfect straight line (`LineItem`) |
| A roughly closed loop     | A perfect circle (`CircleItem`)            |
| Anything else             | The original freehand stroke (unchanged)   |

---

### Algorithm

Recognition runs in `pointerUp`, after the stroke is complete, inside `recognizeShape()`.

#### Minimum conditions

```typescript
if (points.length < 8) return null; // too few samples — likely a tap
if (strokeLen < 20) return null; // chord too short — likely a dot or tap
```

#### Line detection

```typescript
// Max perpendicular distance from each point to the chord p0→pN
const dev = |dy·px − dx·py + pN.x·p0.y − pN.y·p0.x| / strokeLen;
if (maxDev < strokeLen * 0.12) → line
```

The formula is the standard **point-to-line distance**. If every sample point is within
12 % of the chord length from the chord, the stroke is straight enough to call a line.

The threshold 12 % was chosen empirically: it accepts hand-drawn "straight" lines (which
have natural wobble) while rejecting gentle curves and shallow arcs.

#### Circle detection

```typescript
// 1. Centroid
cx = mean(points.x);  cy = mean(points.y);

// 2. Mean radius and its standard deviation
meanR = mean(dist(p, centroid) for p in points);
stdR  = stddev(dist(p, centroid) for p in points);

// 3. Closed-stroke check: start and end are close relative to radius
closeDist = dist(p0, pN);

if (stdR / meanR < 0.22 && closeDist < meanR * 1.1) → circle
```

`stdR / meanR` is the **coefficient of variation** of the radius. A perfect circle has 0;
a hand-drawn circle typically scores 0.05–0.18. The threshold 0.22 accepts slightly oval
loops while rejecting parabolas, arcs, and spirals.

`closeDist < meanR * 1.1` ensures the stroke is closed (the user drew a full loop, not
just an arc).

When recognized as a circle, the bounding-box corners are computed from the centroid and
mean radius, producing a perfect circle item:

```typescript
{ kind: 'circle', x1: cx - meanR, y1: cy - meanR, x2: cx + meanR, y2: cy + meanR }
```

---

### Integration with the existing architecture

`recognizeShape` is a **pure module-level function** — no React state, no side effects.
It receives an array of `{x, y}` points and returns either a `RecognizedShape` descriptor
or `null`.

In `pointerUp`:

```typescript
const recognized = recognizeShape(stroke.points);
if (recognized) {
  commit([
    ...itemsRef.current,
    {
      kind: recognized.kind, // 'line' or 'circle'
      id: crypto.randomUUID(),
      color: stroke.color,
      width: stroke.width,
      x1: recognized.x1,
      y1: recognized.y1,
      x2: recognized.x2,
      y2: recognized.y2,
    },
  ]);
} else {
  commit([...itemsRef.current, stroke]); // keep freehand
}
```

The recognized item is an ordinary `LineItem` or `CircleItem` — it participates in undo,
redo, eraser, select/move, and Firestore sync exactly like any shape drawn with the
dedicated tool.

---

### Thresholds and tuning

| Threshold    | Value         | Meaning                              |
| ------------ | ------------- | ------------------------------------ |
| `minPoints`  | 8             | Fewer points = tap, not a stroke     |
| `minChord`   | 20 px (world) | Shorter chord = dot or tiny jot      |
| `lineDev`    | 12 % of chord | Max acceptable wobble for a line     |
| `circleCV`   | 0.22          | Max radius coefficient of variation  |
| `closeRatio` | 1.1 × meanR   | Max gap between stroke start and end |

To make recognition **stricter** (fewer false positives): lower `lineDev` and `circleCV`.
To make it **more lenient** (accept rougher drawings): raise them.

---

## 🇷🇴 Română

### Ce s-a adăugat

Tool-ul pen recunoaște automat când un stroke liber arată ca o linie dreaptă sau un cerc și
îl înlocuiește cu versiunea geometrică curată.

### Algoritmul

Recunoașterea rulează în `pointerUp`, după ce stroke-ul este complet.

**Linie** — calculează distanța perpendicuară maximă de la fiecare punct la coarda
`p0→pN`. Dacă aceasta e sub 12 % din lungimea coardei, stroke-ul e suficient de drept.

**Cerc** — calculează centroidul tuturor punctelor, raza medie față de centroid și deviația
standard a razelor. Dacă coeficientul de variație (std/medie) < 0,22 și stroke-ul e
aproximativ închis (distanța start→end < 1,1 × raza medie), se înlocuiește cu un cerc perfect.

Itemul rezultat (linie sau cerc) este identic cu cel creat de tool-urile dedicate — participă
la undo/redo, radieră, selectare și sincronizare Firestore exact la fel.

# Commit 32 — Pen Stroke Smoothing with Quadratic Bézier Curves

## 🇬🇧 English

### Problem

The pen tool drew strokes as a series of straight line segments (`lineTo`), producing a
characteristic jagged, polygonal look — especially noticeable at low mouse sampling rates
or when drawing slowly.

### Solution: Midpoint Quadratic Bézier

Instead of connecting each sampled point directly, the midpoint algorithm interpolates smooth
curves between consecutive points.

**Key insight:** the midpoint between two adjacent sample points is used as the _through_
point of each curve, while the actual sample point becomes the _control_ point.

```
 pts[i-1]   mid(i-1, i)   pts[i]   mid(i, i+1)   pts[i+1]
     ●─────────────────────●──────────────────────●
                  ↑                      ↑
            anchor point           anchor point
                        ↑
                  control point
```

Each `quadraticCurveTo(pts[i], midpoint(i, i+1))` draws a smooth curve that:

- **Starts** at `midpoint(i-1, i)` (where the previous segment ended)
- **Ends** at `midpoint(i, i+1)` (where the next segment will start)
- **Bends toward** `pts[i]` without passing through it exactly

Because both the start and end of each segment are midpoints, adjacent curves share their
endpoints perfectly — no gaps or overlaps.

### Implementation

**`drawItem` (committed strokes):**

```typescript
case 'pen': {
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y); // single segment stays straight
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }
  ctx.stroke();
}
```

The final `lineTo` to the last point ensures the stroke ends exactly where the user lifted
the pen, not at the last midpoint.

**`pointerMove` (live/incremental drawing):**

```typescript
if (n === 2) {
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
} else {
  const mx1 = (pts[n - 3].x + pts[n - 2].x) / 2,
    my1 = (pts[n - 3].y + pts[n - 2].y) / 2;
  const mx2 = (pts[n - 2].x + pts[n - 1].x) / 2,
    my2 = (pts[n - 2].y + pts[n - 1].y) / 2;
  ctx.moveTo(mx1, my1);
  ctx.quadraticCurveTo(pts[n - 2].x, pts[n - 2].y, mx2, my2);
}
```

Each new mouse point adds only **one bezier segment** to the canvas — the same incremental
approach as before, but producing a curved segment instead of a straight one. This preserves
the performance optimization: the full canvas is not redrawn on every mouse move.

### Visual Result

| Before                                | After                                        |
| ------------------------------------- | -------------------------------------------- |
| Jagged polygonal path                 | Smooth flowing curve                         |
| Visible vertices at each sample point | Invisible — curve flows through neighborhood |
| Writing looks scratchy                | Writing looks natural / pen-like             |

### Why not cubic Bézier?

Cubic bézier (`bezierCurveTo`) offers more control (two control points per segment) but
requires computing tangent vectors at each point — more complex and no meaningful quality
difference at typical mouse sampling rates (50-100 points/second). Quadratic gives 95% of
the visual improvement at a fraction of the complexity.

---

## 🇷🇴 Română

### Problema

Tool-ul pen desena linii drepte între punctele eșantionate de mouse, producând un aspect
zimțat, poligonal.

### Soluția: Bézier quadratic pe puncte de mijloc

Algoritmul folosește **punctul de mijloc** dintre două puncte consecutive ca punct de trecere
al curbei, iar punctul efectiv al mouse-ului ca punct de control.

Fiecare segment `quadraticCurveTo(pts[i], midpoint(i, i+1))`:

- pornește de la `midpoint(i-1, i)` (unde s-a terminat segmentul anterior)
- se termină la `midpoint(i, i+1)` (unde va porni cel următor)
- se îndoaie spre `pts[i]` fără a trece exact prin el

Deoarece ambele capete ale fiecărui segment sunt puncte de mijloc, curbele adiacente
se îmbină perfect, fără goluri sau suprapuneri.

**Desenare live** (în `pointerMove`): fiecare punct nou adaugă un singur segment bézier
incremental pe canvas — aceeași optimizare de performanță ca înainte, dar curbe.

**Stroke comis** (în `drawItem`): întregul path e redesenat cu bézier la fiecare redraw,
rezultând un scris fluid și natural.

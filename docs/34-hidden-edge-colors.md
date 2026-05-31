# Commit 34 — Hidden Edges Use Reference-Page Gray on 3D Solids

## 🇬🇧 English

### Problem

3D solids drawn on the canvas had hidden (dashed) edges in the same color as visible edges —
the only distinction was the dash pattern. The **Geometry reference page** (`GeometriePage`)
uses a distinct slate-gray (`#94a3b8`) for hidden edges, making visible and hidden edges
immediately distinguishable even in black-and-white printouts.

### What Changed

**`src/shapes/index.ts`**

Added a shared constant that mirrors the reference page's hidden-edge color:

```typescript
const HIDDEN = '#94a3b8'; // slate-gray — matches GeometriePage C.hidden
```

`edge3` and `face3` now apply `HIDDEN` color + dashing together, making each call
self-contained:

```typescript
function edge3(ctx, a, b, hidden = false) {
  ctx.save();
  if (hidden) {
    ctx.strokeStyle = HIDDEN;
    ctx.setLineDash([4, 4]);
  }
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
}

function face3(ctx, pts, hidden = false) {
  ctx.save();
  if (hidden) {
    ctx.strokeStyle = HIDDEN;
    ctx.setLineDash([4, 4]);
  }
  poly(ctx, pts);
  ctx.restore();
}
```

The `ctx.save()/ctx.restore()` wrapper means these helpers are fully self-contained — the
`hidden` flag controls both color and dash in one place, and callers no longer need to
manage `ctx.setLineDash` externally.

### Shapes affected

All 3D solids in `SHAPE_GROUPS` (Geometrie în spațiu):

| Shape                  | Hidden elements fixed                    |
| ---------------------- | ---------------------------------------- |
| Cub                    | 3 back edges (A-D, D-C, D-D′)            |
| Paralelipiped          | 3 back edges                             |
| Prismă triunghiulară   | Back face + 2 lateral hidden edges       |
| Prismă patrulateră     | 3 back edges                             |
| Prismă hexagonală      | 2 hidden lateral edges                   |
| Piramidă triunghiulară | Hidden face (A-C-V)                      |
| Piramidă patrulateră   | 2 hidden edges + 1 hidden face           |
| Trunchi piramidă       | 5 hidden edges                           |
| Con                    | Back half of base ellipse                |
| Trunchi de con         | Back half of bottom base ellipse         |
| Cilindru               | Back half of bottom base ellipse         |
| Sferă                  | Back equator half + full meridian circle |

### What did NOT change

The **main edge color** continues to use the user's selected palette color. To match the
reference page exactly, select the deep-blue (`#1e40af`) from the palette before placing
a 3D solid.

---

## 🇷🇴 Română

### Problema

Muchiile ascunse ale corpurilor 3D de pe canvas erau desenate cu aceeași culoare ca muchiile
vizibile — singura diferență era linia punctată. Pagina de referință de geometrie folosește
gri-ardezie (`#94a3b8`) pentru muchiile ascunse, exact ca în manuale.

### Ce s-a schimbat

Constantă nouă `HIDDEN = '#94a3b8'`. Funcțiile `edge3` și `face3` aplică acum automat
`HIDDEN` + linie punctată când `hidden=true`, folosind `ctx.save()/ctx.restore()` pentru
a fi complet auto-contained.

Toate cele 12 corpuri geometrice 3D au muchiile/fețele ascunse marcate explicit cu `hidden=true`,
eliminând blocurile `ctx.setLineDash([4,4]); ...; ctx.setLineDash([])` împrăștiate.

Culoarea conturului principal continuă să urmeze paleta utilizatorului — selectând albastrul
`#1e40af` din paletă, corpurile vor arăta identic cu cele din pagina de formule.

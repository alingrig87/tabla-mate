// ─── Types ────────────────────────────────────────────────────────────────────

export type GeomKind =
  // Linii & unghiuri
  | 'segment'
  | 'ray'
  | 'angle'
  // Triunghiuri
  | 'tri-right'
  | 'tri-equilateral'
  | 'tri-isosceles'
  | 'tri-scalene'
  | 'tri-acute'
  | 'tri-obtuse'
  // Patrulater
  | 'square-geom'
  | 'rect-geom'
  | 'rhombus'
  | 'parallelogram'
  | 'trapezoid'
  | 'trap-right'
  | 'trap-isosceles'
  | 'kite'
  // Poligoane regulate
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  // Cercuri & conice
  | 'circle-geom'
  | 'arc'
  | 'sector'
  | 'annulus'
  | 'ellipse'
  | 'parabola'
  | 'hyperbola'
  // 3D
  | 'cube'
  | 'cuboid'
  | 'prism-tri'
  | 'prism-sq'
  | 'prism-hex'
  | 'pyramid-tri'
  | 'pyramid-sq'
  | 'frustum-pyramid'
  | 'cone'
  | 'frustum-cone'
  | 'cylinder'
  | 'sphere';

/**
 * Decoration toggles for a drawn geometric figure.
 * Each flag adds a layer of visual annotation on top of the base outline.
 */
export interface GeomStyle {
  /** Draw altitude / height line in red with a right-angle mark */
  height?: boolean;
  /** Draw angle arc at the relevant vertex in amber */
  angle?: boolean;
  /** Render dimension + vertex labels next to each element */
  labels?: boolean;
  /** Draw diagonal or midline in green dashed */
  diagonal?: boolean;
}

export interface GeomItem {
  kind: 'geom';
  id: string;
  geomKind: GeomKind;
  color: string;
  width: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  style?: GeomStyle;
}

export interface ShapeGroup {
  label: string;
  shapes: { kind: GeomKind; label: string }[];
}

export const SHAPE_GROUPS: ShapeGroup[] = [
  {
    label: 'Linii & Unghiuri',
    shapes: [
      { kind: 'segment', label: 'Segment' },
      { kind: 'ray', label: 'Semidreaptă' },
      { kind: 'angle', label: 'Unghi' },
    ],
  },
  {
    label: 'Triunghiuri',
    shapes: [
      { kind: 'tri-right', label: 'Dreptunghic' },
      { kind: 'tri-acute', label: 'Ascuțitunghic' },
      { kind: 'tri-obtuse', label: 'Obtuzunghic' },
      { kind: 'tri-equilateral', label: 'Echilateral' },
      { kind: 'tri-isosceles', label: 'Isoscel' },
      { kind: 'tri-scalene', label: 'Oarecare' },
    ],
  },
  {
    label: 'Patrulater',
    shapes: [
      { kind: 'square-geom', label: 'Pătrat' },
      { kind: 'rect-geom', label: 'Dreptunghi' },
      { kind: 'rhombus', label: 'Romb' },
      { kind: 'parallelogram', label: 'Paralelogram' },
      { kind: 'kite', label: 'Deltoid' },
      { kind: 'trapezoid', label: 'Trapez' },
      { kind: 'trap-right', label: 'Trapez dreptunghic' },
      { kind: 'trap-isosceles', label: 'Trapez isoscel' },
    ],
  },
  {
    label: 'Poligoane regulate',
    shapes: [
      { kind: 'pentagon', label: 'Pentagon' },
      { kind: 'hexagon', label: 'Hexagon' },
      { kind: 'octagon', label: 'Octogon' },
    ],
  },
  {
    label: 'Cercuri & Conice',
    shapes: [
      { kind: 'circle-geom', label: 'Cerc' },
      { kind: 'arc', label: 'Arc de cerc' },
      { kind: 'sector', label: 'Sector' },
      { kind: 'annulus', label: 'Coroană circ.' },
      { kind: 'ellipse', label: 'Elipsă' },
      { kind: 'parabola', label: 'Parabolă' },
      { kind: 'hyperbola', label: 'Hiperbolă' },
    ],
  },
  {
    label: 'Geometrie în spațiu',
    shapes: [
      { kind: 'cube', label: 'Cub' },
      { kind: 'cuboid', label: 'Paralelipiped' },
      { kind: 'prism-tri', label: 'Prismă △' },
      { kind: 'prism-sq', label: 'Prismă □' },
      { kind: 'prism-hex', label: 'Prismă ⬡' },
      { kind: 'pyramid-tri', label: 'Piramidă △' },
      { kind: 'pyramid-sq', label: 'Piramidă □' },
      { kind: 'frustum-pyramid', label: 'Trunchi piramidă' },
      { kind: 'cone', label: 'Con' },
      { kind: 'frustum-cone', label: 'Trunchi con' },
      { kind: 'cylinder', label: 'Cilindru' },
      { kind: 'sphere', label: 'Sferă' },
    ],
  },
];

// ─── Geometry helpers ─────────────────────────────────────────────────────────

type Pt = [number, number];

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], close = true) {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  ctx.stroke();
}

function regularPts(n: number, cx: number, cy: number, r: number, offset = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

function arrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const L = Math.max(10, Math.hypot(x2 - x1, y2 - y1) * 0.12);
  ctx.beginPath();
  ctx.moveTo(x2 - L * Math.cos(a - 0.38), y2 - L * Math.sin(a - 0.38));
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - L * Math.cos(a + 0.38), y2 - L * Math.sin(a + 0.38));
  ctx.stroke();
}

function rightAngleMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  sq: number
) {
  ctx.beginPath();
  ctx.moveTo(x + dx * sq, y);
  ctx.lineTo(x + dx * sq, y + dy * sq);
  ctx.lineTo(x, y + dy * sq);
  ctx.stroke();
}

// Oblique projection: depth goes upper-right at ~30°
const DX = 0.65;
const DY = 0.38;

function ob(ox: number, oy: number, lx: number, ly: number, lz: number): Pt {
  return [ox + lx + lz * DX, oy + ly - lz * DY];
}

function face3(ctx: CanvasRenderingContext2D, pts: Pt[], dashed = false) {
  if (dashed) ctx.setLineDash([4, 4]);
  poly(ctx, pts);
  if (dashed) ctx.setLineDash([]);
}

function edge3(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, dashed = false) {
  if (dashed) ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  if (dashed) ctx.setLineDash([]);
}

// ─── Decoration colour tokens ─────────────────────────────────────────────────

const DEC_HEIGHT = '#dc2626'; // red   — altitudini
const DEC_ANGLE = '#d97706'; // amber — unghiuri
const DEC_LABEL = '#0f172a'; // dark  — etichete
const DEC_DIAG = '#16a34a'; // green — diagonale

// ─── Decoration helpers ───────────────────────────────────────────────────────

/** Dashed red altitude line with right-angle mark at foot */
function decHeight(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  footX: number,
  footY: number,
  lw: number,
  sq: number,
  markDx = 1,
  markDy = -1
) {
  ctx.save();
  ctx.strokeStyle = DEC_HEIGHT;
  ctx.lineWidth = Math.max(0.8, lw * 0.65);
  ctx.lineCap = 'round';
  ctx.setLineDash([Math.max(4, sq * 0.9), Math.max(3, sq * 0.65)]);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(footX, footY);
  ctx.stroke();
  ctx.setLineDash([]);
  rightAngleMark(ctx, footX, footY, markDx, markDy, Math.max(3, sq * 0.7));
  ctx.restore();
}

/** Amber angle arc */
function decAngle(
  ctx: CanvasRenderingContext2D,
  vx: number,
  vy: number,
  arcR: number,
  a1: number,
  a2: number,
  ccw = false
) {
  ctx.save();
  ctx.strokeStyle = DEC_ANGLE;
  ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.65);
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(vx, vy, arcR, a1, a2, ccw);
  ctx.stroke();
  ctx.restore();
}

/** Italic serif dimension label (a, b, h, R, …) */
function decLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  fs: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `italic ${fs}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.setLineDash([]);
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Bold vertex label (A, B, V, O, …) */
function decVertex(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fv: number,
  color = DEC_LABEL
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold ${fv}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.setLineDash([]);
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Filled red dot at a point (for centre O, apex, etc.) */
function decDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.fillStyle = DEC_HEIGHT;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Dashed green diagonal/midline */
function decDiag(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lw: number
) {
  ctx.save();
  ctx.strokeStyle = DEC_DIAG;
  ctx.lineWidth = Math.max(0.8, lw * 0.65);
  ctx.lineCap = 'round';
  ctx.setLineDash([Math.max(4, lw * 2), Math.max(3, lw * 1.5)]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Dashed red axis line (for 3D solids, no right-angle mark) */
function decAxis(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lw: number
) {
  ctx.save();
  ctx.strokeStyle = DEC_HEIGHT;
  ctx.lineWidth = Math.max(0.8, lw * 0.65);
  ctx.lineCap = 'round';
  ctx.setLineDash([Math.max(4, lw * 2), Math.max(3, lw * 1.5)]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Solid red line (for radius, diameter) */
function decRed(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lw: number
) {
  ctx.save();
  ctx.strokeStyle = DEC_HEIGHT;
  ctx.lineWidth = Math.max(0.8, lw * 0.65);
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// ─── Main draw function ────────────────────────────────────────────────────────

export function drawGeom(
  ctx: CanvasRenderingContext2D,
  kind: GeomKind,
  color: string,
  lw: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style?: GeomStyle
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const L = Math.min(x1, x2),
    R = Math.max(x1, x2);
  const T = Math.min(y1, y2),
    B = Math.max(y1, y2);
  const cx = (L + R) / 2,
    cy = (T + B) / 2;
  const hw = (R - L) / 2,
    hh = (B - T) / 2;
  const r = Math.min(hw, hh);
  const sq = Math.max(4, lw * 4);
  const fs = Math.min(16, Math.max(7, Math.min(hw, hh) * 0.15)); // dimension label size, capped at 16px
  const fv = fs; // vertex label size
  const vs = Math.min(15, Math.max(10, fv * 1.2)); // offset from vertex, 10-15px range

  switch (kind) {
    // ── LINII & UNGHIURI ──────────────────────────────────────────────────────

    case 'segment':
      ctx.beginPath();
      ctx.moveTo(L, cy);
      ctx.lineTo(R, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L, cy - sq * 1.2);
      ctx.lineTo(L, cy + sq * 1.2);
      ctx.moveTo(R, cy - sq * 1.2);
      ctx.lineTo(R, cy + sq * 1.2);
      ctx.stroke();
      if (style?.labels) {
        decVertex(ctx, 'A', L, cy - vs * 2, fv);
        decVertex(ctx, 'B', R, cy - vs * 2, fv);
        decLabel(ctx, 'l', cx, cy - vs * 1.5, DEC_LABEL, fs);
      }
      break;

    case 'ray':
      ctx.beginPath();
      ctx.moveTo(L, cy);
      ctx.lineTo(R, cy);
      ctx.stroke();
      arrowHead(ctx, L, cy, R, cy);
      ctx.beginPath();
      ctx.moveTo(L, cy - sq * 1.2);
      ctx.lineTo(L, cy + sq * 1.2);
      ctx.stroke();
      if (style?.labels) {
        decVertex(ctx, 'O', L, cy - vs * 2, fv);
        decVertex(ctx, 'A', R, cy - vs * 2, fv);
      }
      break;

    case 'angle': {
      const arm = Math.min(hw, hh) * 1.6;
      ctx.beginPath();
      ctx.moveTo(L, B);
      ctx.lineTo(L + arm, B);
      ctx.stroke();
      arrowHead(ctx, L, B, L + arm, B);
      ctx.beginPath();
      ctx.moveTo(L, B);
      ctx.lineTo(L + arm * 0.707, B - arm * 0.707);
      ctx.stroke();
      arrowHead(ctx, L, B, L + arm * 0.707, B - arm * 0.707);
      ctx.beginPath();
      ctx.arc(L, B, arm * 0.32, -Math.PI / 4, 0);
      ctx.stroke();
      if (style?.labels) {
        decLabel(ctx, 'α', L + arm * 0.38, B - arm * 0.16, DEC_ANGLE, fs);
        decVertex(ctx, 'O', L - vs, B + vs * 0.5, fv);
      }
      break;
    }

    // ── TRIUNGHIURI ───────────────────────────────────────────────────────────

    case 'tri-right': {
      // A(L,B) right-angle, B(R,B) bottom-right, C(L,T) top-left
      poly(ctx, [
        [L, B],
        [R, B],
        [L, T],
      ]);
      rightAngleMark(ctx, L, B, 1, -1, sq);
      if (style?.height) {
        const bxh = R,
          byh = B,
          cxh = L,
          cyh = T;
        const ddx = cxh - bxh,
          ddy = cyh - byh,
          ll2 = ddx * ddx + ddy * ddy;
        const tt = ((L - bxh) * ddx + (B - byh) * ddy) / ll2;
        const footX = bxh + tt * ddx,
          footY = byh + tt * ddy;
        const rot = Math.atan2(ddy, ddx);
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.setLineDash([Math.max(4, sq * 0.9), Math.max(3, sq * 0.65)]);
        ctx.beginPath();
        ctx.moveTo(L, B);
        ctx.lineTo(footX, footY);
        ctx.stroke();
        ctx.setLineDash([]);
        const sq2 = Math.max(3, sq * 0.7);
        const nx = Math.cos(rot + Math.PI / 2) * sq2,
          ny = Math.sin(rot + Math.PI / 2) * sq2;
        const ex2 = Math.cos(rot) * sq2,
          ey2 = Math.sin(rot) * sq2;
        ctx.beginPath();
        ctx.moveTo(footX + nx, footY + ny);
        ctx.lineTo(footX + nx + ex2, footY + ny + ey2);
        ctx.lineTo(footX + ex2, footY + ey2);
        ctx.stroke();
        ctx.restore();
        if (style?.labels)
          decLabel(ctx, 'h', (L + footX) / 2 - fs, (B + footY) / 2, DEC_HEIGHT, fs);
      }
      if (style?.angle) {
        decAngle(ctx, R, B, r * 0.28, Math.PI, Math.PI + Math.PI * 0.4);
        if (style?.labels) decLabel(ctx, 'u', R - r * 0.32, B - r * 0.14, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'c₁', L - fs * 1.4, cy, DEC_DIAG, fs);
        decLabel(ctx, 'c₂', cx, B + fs * 1.4, DEC_DIAG, fs);
        decLabel(ctx, 'i', cx + fs * 0.9, cy - fs * 0.4, color, fs);
        decVertex(ctx, 'A', L - vs, B + vs * 0.7, fv);
        decVertex(ctx, 'B', R + vs, B + vs * 0.7, fv);
        decVertex(ctx, 'C', L - vs, T - vs * 0.7, fv);
      }
      break;
    }

    case 'tri-equilateral': {
      const hE = r * Math.sqrt(3);
      const ax = cx,
        ay = cy - (hE * 2) / 3;
      const bxE = cx + r,
        byE = cy + hE / 3;
      const exE = cx - r,
        eyE = cy + hE / 3;
      poly(ctx, [
        [ax, ay],
        [bxE, byE],
        [exE, eyE],
      ]);
      if (style?.height) {
        decHeight(ctx, ax, ay, cx, byE, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 0.9, (ay + byE) / 2, DEC_HEIGHT, fs);
      }
      if (style?.angle) {
        decAngle(ctx, bxE, byE, r * 0.28, Math.PI + 0.35, Math.PI + Math.PI / 3 - 0.1);
        if (style?.labels)
          decLabel(ctx, '60°', bxE - r * 0.38, byE - r * 0.18, DEC_ANGLE, fs * 0.85);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', (ax + exE) / 2 - fs * 0.8, (ay + eyE) / 2, color, fs);
        decLabel(ctx, 'l', (ax + bxE) / 2 + fs * 0.8, (ay + byE) / 2, color, fs);
        decLabel(ctx, 'l', cx, byE + fs * 1.2, color, fs);
        decVertex(ctx, 'A', ax, ay - vs, fv);
        decVertex(ctx, 'B', bxE + vs, byE + vs * 0.5, fv);
        decVertex(ctx, 'C', exE - vs, eyE + vs * 0.5, fv);
      }
      break;
    }

    case 'tri-isosceles': {
      const ax = cx,
        ay = T,
        bxI = R,
        byI = B,
        exI = L,
        eyI = B;
      poly(ctx, [
        [ax, ay],
        [bxI, byI],
        [exI, eyI],
      ]);
      if (style?.height) {
        decHeight(ctx, ax, ay, cx, B, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 0.9, cy, DEC_HEIGHT, fs);
      }
      if (style?.angle) {
        const a1 = Math.atan2(ay - byI, ax - bxI);
        const a2 = Math.atan2(eyI - byI, exI - bxI);
        decAngle(ctx, bxI, byI, r * 0.3, a2, a1);
        if (style?.labels) decLabel(ctx, 'u', bxI - r * 0.38, byI - r * 0.16, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', (ax + exI) / 2 - fs * 0.9, (ay + eyI) / 2, color, fs);
        decLabel(ctx, 'l', (ax + bxI) / 2 + fs * 0.9, (ay + byI) / 2, color, fs);
        decLabel(ctx, 'b', cx, B + fs * 1.2, color, fs);
        decVertex(ctx, 'A', ax, ay - vs, fv);
        decVertex(ctx, 'B', bxI + vs, byI + vs * 0.5, fv);
        decVertex(ctx, 'C', exI - vs, eyI + vs * 0.5, fv);
      }
      break;
    }

    case 'tri-scalene': {
      const apexX = L + hw * 0.35;
      poly(ctx, [
        [apexX, T],
        [R, B],
        [L, B],
      ]);
      if (style?.height) {
        decHeight(ctx, apexX, T, apexX, B, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', apexX + fs * 0.9, cy, DEC_HEIGHT, fs);
      }
      if (style?.angle) {
        const a1 = Math.atan2(T - B, apexX - R);
        const a2 = Math.atan2(B - B, L - R);
        decAngle(ctx, R, B, r * 0.28, a2, a1);
        if (style?.labels) decLabel(ctx, 'u', R - r * 0.35, B - r * 0.14, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (L + apexX) / 2 - fs * 0.9, (B + T) / 2, color, fs);
        decLabel(ctx, 'c', (R + apexX) / 2 + fs * 0.9, (B + T) / 2, color, fs);
        decLabel(ctx, 'b', cx, B + fs * 1.2, color, fs);
        decVertex(ctx, 'A', apexX, T - vs, fv);
        decVertex(ctx, 'B', R + vs, B + vs * 0.5, fv);
        decVertex(ctx, 'C', L - vs, B + vs * 0.5, fv);
      }
      break;
    }

    case 'tri-acute': {
      // Scalene acute triangle — all three angles clearly < 90°
      const p1: Pt = [cx + hw * 0.08, T + hh * 0.06]; // A — apex, near top
      const p2: Pt = [R - hw * 0.07, B]; // B — bottom right
      const p3: Pt = [L + hw * 0.04, B - hh * 0.12]; // C — bottom left, slightly raised
      poly(ctx, [p1, p2, p3]);
      if (style?.angle) {
        const aAB = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
        const aAC = Math.atan2(p3[1] - p1[1], p3[0] - p1[0]);
        decAngle(ctx, p1[0], p1[1], r * 0.22, aAB, aAC, false);
        if (style?.labels) decLabel(ctx, 'α', p1[0] - r * 0.06, p1[1] + r * 0.2, DEC_ANGLE, fs);
      }
      if (style?.height) {
        decHeight(ctx, p1[0], p1[1], p1[0], p2[1], lw, sq, 1, -1);
        if (style?.labels)
          decLabel(ctx, 'h', p1[0] + fs * 0.9, (p1[1] + p2[1]) / 2, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (p2[0] + p3[0]) / 2, p2[1] + fs * 1.3, color, fs);
        decLabel(ctx, 'b', (p1[0] + p3[0]) / 2 - fs, (p1[1] + p3[1]) / 2, color, fs);
        decLabel(ctx, 'c', (p1[0] + p2[0]) / 2 + fs, (p1[1] + p2[1]) / 2, color, fs);
        decVertex(ctx, 'A', p1[0], p1[1] - vs * 0.8, fv);
        decVertex(ctx, 'B', p2[0] + vs, p2[1] + vs * 0.5, fv);
        decVertex(ctx, 'C', p3[0] - vs, p3[1] + vs * 0.5, fv);
      }
      break;
    }

    case 'tri-obtuse': {
      // Obtuse angle at A (left vertex) — clearly > 90°
      const p1: Pt = [L + hw * 0.12, cy + hh * 0.18]; // A — obtuse vertex, left-center
      const p2: Pt = [R - hw * 0.05, B - hh * 0.05]; // B — bottom right
      const p3: Pt = [cx - hw * 0.1, T + hh * 0.12]; // C — upper center-left
      poly(ctx, [p1, p2, p3]);
      if (style?.angle) {
        const aAB = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
        const aAC = Math.atan2(p3[1] - p1[1], p3[0] - p1[0]);
        // obtuse arc: ccw=true draws the larger (> 90°) arc between the two arms
        decAngle(ctx, p1[0], p1[1], r * 0.22, aAB, aAC, true);
        if (style?.labels) decLabel(ctx, 'α', p1[0] + r * 0.26, p1[1] - r * 0.05, DEC_ANGLE, fs);
      }
      if (style?.height) {
        // foot of altitude from C to AB
        const dx = p2[0] - p1[0],
          dy = p2[1] - p1[1];
        const t = ((p3[0] - p1[0]) * dx + (p3[1] - p1[1]) * dy) / (dx * dx + dy * dy);
        const fx = p1[0] + t * dx,
          fy = p1[1] + t * dy;
        decAxis(ctx, p3[0], p3[1], fx, fy, lw);
        if (style?.labels)
          decLabel(ctx, 'h', (p3[0] + fx) / 2 + fs, (p3[1] + fy) / 2, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (p2[0] + p3[0]) / 2 + fs * 0.8, (p2[1] + p3[1]) / 2, color, fs);
        decLabel(ctx, 'b', (p1[0] + p3[0]) / 2 - fs, (p1[1] + p3[1]) / 2, color, fs);
        decLabel(ctx, 'c', (p1[0] + p2[0]) / 2, p1[1] + fs * 1.3, color, fs);
        decVertex(ctx, 'A', p1[0] - vs * 0.8, p1[1] + vs * 0.5, fv);
        decVertex(ctx, 'B', p2[0] + vs, p2[1] + vs * 0.5, fv);
        decVertex(ctx, 'C', p3[0] - vs * 0.3, p3[1] - vs * 0.8, fv);
      }
      break;
    }

    // ── PATRULATER ────────────────────────────────────────────────────────────

    case 'square-geom': {
      ctx.strokeRect(L, T, R - L, B - T);
      if (style?.diagonal) {
        decDiag(ctx, L, T, R, B, lw);
        if (style?.labels) decLabel(ctx, 'd', cx + fs * 0.9, cy - fs * 0.9, DEC_DIAG, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', cx, B + fs * 1.2, color, fs);
        decLabel(ctx, 'l', L - fs * 1.1, cy, color, fs);
        decVertex(ctx, 'D', L - vs, T - vs * 0.5, fv);
        decVertex(ctx, 'C', R + vs, T - vs * 0.5, fv);
        decVertex(ctx, 'B', R + vs, B + vs * 0.5, fv);
        decVertex(ctx, 'A', L - vs, B + vs * 0.5, fv);
      }
      break;
    }

    case 'rect-geom': {
      ctx.strokeRect(L, T, R - L, B - T);
      if (style?.diagonal) {
        decDiag(ctx, L, T, R, B, lw);
        if (style?.labels) decLabel(ctx, 'd', cx + fs * 0.9, cy - fs * 0.9, DEC_DIAG, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'L', cx, B + fs * 1.2, color, fs);
        decLabel(ctx, 'l', L - fs * 1.1, cy, color, fs);
        decVertex(ctx, 'D', L - vs, T - vs * 0.5, fv);
        decVertex(ctx, 'C', R + vs, T - vs * 0.5, fv);
        decVertex(ctx, 'B', R + vs, B + vs * 0.5, fv);
        decVertex(ctx, 'A', L - vs, B + vs * 0.5, fv);
      }
      break;
    }

    case 'rhombus': {
      // A(top) B(right) C(bottom) D(left)
      poly(ctx, [
        [cx, T],
        [R, cy],
        [cx, B],
        [L, cy],
      ]);
      if (style?.diagonal) {
        decDiag(ctx, cx, T, cx, B, lw);
        decDiag(ctx, L, cy, R, cy, lw);
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.beginPath();
        ctx.moveTo(cx, cy - sq * 0.6);
        ctx.lineTo(cx + sq * 0.6, cy - sq * 0.6);
        ctx.lineTo(cx + sq * 0.6, cy);
        ctx.stroke();
        ctx.restore();
        if (style?.labels) {
          decLabel(ctx, 'd₁', cx + fs * 1.0, (T + cy) / 2, DEC_DIAG, fs);
          decLabel(ctx, 'd₂', (cx + R) / 2, cy - fs * 1.0, DEC_DIAG, fs);
        }
      }
      if (style?.angle) {
        decAngle(ctx, R, cy, r * 0.28, Math.PI * 0.6, Math.PI * 1.4);
        if (style?.labels) decLabel(ctx, 'u', R - r * 0.36, cy, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', (cx + L) / 2 - fs * 0.6, (cy + T) / 2, color, fs);
        decVertex(ctx, 'A', cx, T - vs * 0.7, fv);
        decVertex(ctx, 'B', R + vs, cy, fv);
        decVertex(ctx, 'C', cx, B + vs * 0.7, fv);
        decVertex(ctx, 'D', L - vs, cy, fv);
      }
      break;
    }

    case 'parallelogram': {
      // D(L+sk,T) C(R,T) B(R-sk,B) A(L,B)
      const sk = hw * 0.3;
      poly(ctx, [
        [L + sk, T],
        [R, T],
        [R - sk, B],
        [L, B],
      ]);
      if (style?.height) {
        decHeight(ctx, L + sk, T, L + sk, B, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', L + sk + fs * 0.9, cy, DEC_HEIGHT, fs);
      }
      if (style?.angle) {
        const a1 = Math.atan2(T - B, sk);
        decAngle(ctx, L, B, r * 0.3, 0, a1, true);
        if (style?.labels) decLabel(ctx, 'u', L + r * 0.32, B - r * 0.13, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'b', cx, B + fs * 1.2, color, fs);
        decLabel(ctx, 'a', L - fs * 1.3, cy, color, fs);
        decVertex(ctx, 'D', L + sk - vs * 0.5, T - vs * 0.6, fv);
        decVertex(ctx, 'C', R + vs, T - vs * 0.6, fv);
        decVertex(ctx, 'B', R - sk + vs * 0.5, B + vs * 0.6, fv);
        decVertex(ctx, 'A', L - vs, B + vs * 0.6, fv);
      }
      break;
    }

    case 'trapezoid': {
      const ins = hw * 0.22;
      const topL = L + ins,
        topR = R - ins * 1.5;
      poly(ctx, [
        [topL, T],
        [topR, T],
        [R, B],
        [L, B],
      ]);
      if (style?.height) {
        decHeight(ctx, topL, T, topL, B, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', topL + fs * 0.9, cy, DEC_HEIGHT, fs);
      }
      if (style?.diagonal) {
        const mlL = (L + topL) / 2,
          mlR = (R + topR) / 2;
        decDiag(ctx, mlL, cy, mlR, cy, lw);
        if (style?.labels) decLabel(ctx, 'lₘ', (mlL + mlR) / 2, cy - fs * 1.1, DEC_DIAG, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', cx, B + fs * 1.4, color, fs);
        decLabel(ctx, 'b', (topL + topR) / 2, T - fs * 1.6, color, fs);
        decVertex(ctx, 'D', topL - vs * 0.5, T - vs * 0.6, fv);
        decVertex(ctx, 'C', topR + vs * 0.5, T - vs * 0.6, fv);
        decVertex(ctx, 'B', R + vs, B + vs * 0.6, fv);
        decVertex(ctx, 'A', L - vs, B + vs * 0.6, fv);
      }
      break;
    }

    case 'trap-right': {
      const ins = hw * 0.35;
      poly(ctx, [
        [L, T],
        [R - ins, T],
        [R, B],
        [L, B],
      ]);
      rightAngleMark(ctx, L, T, 1, 1, sq);
      rightAngleMark(ctx, L, B, 1, -1, sq);
      if (style?.height) {
        decHeight(ctx, L, T, L, B, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', L + fs * 1.0, cy, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', cx, B + fs * 1.4, color, fs);
        decLabel(ctx, 'b', (L + R - ins) / 2, T - fs * 1.6, color, fs);
        decVertex(ctx, 'D', L - vs, T - vs * 0.6, fv);
        decVertex(ctx, 'C', R - ins + vs, T - vs * 0.6, fv);
        decVertex(ctx, 'B', R + vs, B + vs * 0.6, fv);
        decVertex(ctx, 'A', L - vs, B + vs * 0.6, fv);
      }
      break;
    }

    case 'trap-isosceles': {
      const ins = hw * 0.28;
      poly(ctx, [
        [L + ins, T],
        [R - ins, T],
        [R, B],
        [L, B],
      ]);
      if (style?.height) {
        decHeight(ctx, cx, T, cx, B, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 0.9, cy, DEC_HEIGHT, fs);
      }
      if (style?.diagonal) {
        const mlL = (L + L + ins) / 2,
          mlR = (R + R - ins) / 2;
        decDiag(ctx, mlL, cy, mlR, cy, lw);
        if (style?.labels) decLabel(ctx, 'lₘ', cx, cy - fs * 1.1, DEC_DIAG, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', cx, B + fs * 1.4, color, fs);
        decLabel(ctx, 'b', cx, T - fs * 1.6, color, fs);
        decVertex(ctx, 'D', L + ins - vs * 0.5, T - vs * 0.6, fv);
        decVertex(ctx, 'C', R - ins + vs * 0.5, T - vs * 0.6, fv);
        decVertex(ctx, 'B', R + vs, B + vs * 0.6, fv);
        decVertex(ctx, 'A', L - vs, B + vs * 0.6, fv);
      }
      break;
    }

    case 'kite': {
      // Deltoid (zmeu): two pairs of adjacent equal sides, symmetric about vertical axis
      // D = top, A = left, C = bottom, B = right  (spine = D-C, short axis = A-B)
      const kD: Pt = [cx, T + hh * 0.12]; // top vertex (acute)
      const kA: Pt = [L + hw * 0.1, cy - hh * 0.12]; // left vertex
      const kC: Pt = [cx, B - hh * 0.06]; // bottom vertex (obtuse)
      const kB: Pt = [R - hw * 0.1, cy - hh * 0.12]; // right vertex (symmetric to A)
      poly(ctx, [kD, kB, kC, kA]);
      if (style?.diagonal) {
        // spine (main diagonal D-C)
        decDiag(ctx, kD[0], kD[1], kC[0], kC[1], lw);
        // short diagonal A-B (perpendicular to spine)
        decDiag(ctx, kA[0], kA[1], kB[0], kB[1], lw);
        // right-angle mark at intersection
        const ix = cx,
          iy = cy - hh * 0.12; // where A-B meets D-C
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.beginPath();
        ctx.moveTo(ix + sq * 0.5, iy);
        ctx.lineTo(ix + sq * 0.5, iy - sq * 0.5);
        ctx.lineTo(ix, iy - sq * 0.5);
        ctx.stroke();
        ctx.restore();
        if (style?.labels) {
          decLabel(ctx, 'd₁', cx + fs * 1.0, (kD[1] + kC[1]) / 2, DEC_DIAG, fs);
          decLabel(ctx, 'd₂', (kA[0] + cx) / 2, kA[1] - fs * 1.0, DEC_DIAG, fs);
        }
      }
      if (style?.angle) {
        const aDC_B = Math.atan2(kB[1] - kD[1], kB[0] - kD[0]);
        const aDC_A = Math.atan2(kA[1] - kD[1], kA[0] - kD[0]);
        decAngle(ctx, kD[0], kD[1], r * 0.2, aDC_B, aDC_A, true);
        if (style?.labels) decLabel(ctx, 'α', kD[0], kD[1] + r * 0.22, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'p', (kD[0] + kA[0]) / 2 - fs * 0.8, (kD[1] + kA[1]) / 2, color, fs);
        decLabel(ctx, 'q', (kA[0] + kC[0]) / 2 - fs * 0.8, (kA[1] + kC[1]) / 2, color, fs);
        decVertex(ctx, 'D', kD[0], kD[1] - vs * 0.7, fv);
        decVertex(ctx, 'A', kA[0] - vs, kA[1], fv);
        decVertex(ctx, 'C', kC[0], kC[1] + vs * 0.7, fv);
        decVertex(ctx, 'B', kB[0] + vs, kB[1], fv);
      }
      break;
    }

    // ── POLIGOANE REGULATE ────────────────────────────────────────────────────

    case 'pentagon': {
      const pts5 = regularPts(5, cx, cy, r, -Math.PI / 2);
      poly(ctx, pts5);
      if (style?.labels) {
        decLabel(ctx, 'l', cx + r + fs, cy, color, fs);
        ['A', 'B', 'C', 'D', 'E'].forEach((lbl, i) => {
          const [px, py] = pts5[i];
          const ox = (px - cx) * 0.22,
            oy = (py - cy) * 0.22;
          decVertex(
            ctx,
            lbl,
            px + ox + Math.sign(ox) * vs * 0.4,
            py + oy + Math.sign(oy) * vs * 0.4,
            fv * 0.9
          );
        });
      }
      break;
    }
    case 'hexagon': {
      const pts6 = regularPts(6, cx, cy, r, 0);
      poly(ctx, pts6);
      if (style?.labels) {
        decLabel(ctx, 'l', cx + r + fs, cy, color, fs);
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach((lbl, i) => {
          const [px, py] = pts6[i];
          const ox = (px - cx) * 0.22,
            oy = (py - cy) * 0.22;
          decVertex(
            ctx,
            lbl,
            px + ox + Math.sign(ox) * vs * 0.4,
            py + oy + Math.sign(oy) * vs * 0.4,
            fv * 0.9
          );
        });
      }
      break;
    }
    case 'octagon':
      poly(ctx, regularPts(8, cx, cy, r, Math.PI / 8));
      if (style?.labels) decLabel(ctx, 'l', cx + r + fs, cy, color, fs);
      break;

    // ── CERCURI & CONICE ──────────────────────────────────────────────────────

    case 'circle-geom': {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      if (style?.labels) {
        // dashed diameter A-O-B
        decAxis(ctx, cx - r, cy, cx + r, cy, lw);
        decDot(ctx, cx, cy, Math.max(2, lw * 1.5));
        decVertex(ctx, 'O', cx, cy - vs * 0.9, fv);
        decVertex(ctx, 'A', cx - r - vs, cy, fv);
        decVertex(ctx, 'B', cx + r + vs, cy, fv);
        decLabel(ctx, 'R', cx + r / 2, cy - fs * 1.0, DEC_HEIGHT, fs);
      }
      break;
    }

    case 'arc':
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();
      if (style?.labels) {
        decRed(ctx, cx, cy, cx + r, cy, lw);
        decLabel(ctx, 'R', cx + r / 2, cy - fs * 1.0, DEC_HEIGHT, fs);
      }
      break;

    case 'sector':
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 4);
      ctx.closePath();
      ctx.stroke();
      if (style?.angle) {
        decAngle(ctx, cx, cy, r * 0.32, -Math.PI / 2, Math.PI / 4);
        if (style?.labels) decLabel(ctx, 'α', cx + r * 0.18, cy - r * 0.14, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decDot(ctx, cx, cy, Math.max(2, lw * 1.5));
        decLabel(ctx, 'R', cx + r * 0.54, cy - r * 0.54, DEC_HEIGHT, fs);
        decVertex(ctx, 'O', cx - vs, cy + vs * 0.4, fv);
      }
      break;

    case 'annulus':
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      if (style?.labels) {
        decDot(ctx, cx, cy, Math.max(2, lw * 1.5));
        decLabel(ctx, 'R', cx + (r + r * 0.52) / 2, cy - fs * 0.8, DEC_HEIGHT, fs);
        decLabel(ctx, 'r', cx + r * 0.26, cy - fs * 0.8, DEC_LABEL, fs);
        decVertex(ctx, 'O', cx - vs * 0.6, cy - vs * 0.6, fv);
      }
      break;

    case 'ellipse': {
      // a = semi-major (horizontal), b = semi-minor (vertical)
      const a = hw * 0.9,
        b = hh * 0.75;
      ctx.beginPath();
      ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (style?.labels) {
        // semi-axes
        decRed(ctx, cx, cy, cx + a, cy, lw);
        decRed(ctx, cx, cy, cx, cy - b, lw);
        decDot(ctx, cx, cy, Math.max(2, lw * 1.5));
        decLabel(ctx, 'a', cx + a / 2, cy + fs * 1.1, DEC_HEIGHT, fs);
        decLabel(ctx, 'b', cx - fs * 1.1, cy - b / 2, DEC_HEIGHT, fs);
        decVertex(ctx, 'O', cx, cy + vs * 0.7, fv);
        decVertex(ctx, 'A', cx - a - vs, cy, fv);
        decVertex(ctx, 'B', cx + a + vs, cy, fv);
        decVertex(ctx, 'C', cx, cy - b - vs * 0.6, fv);
        decVertex(ctx, 'D', cx, cy + b + vs * 0.6, fv);
      }
      break;
    }

    case 'parabola': {
      // y = a·x² opening upward, vertex at bottom-center
      const vx = cx,
        vy = B - hh * 0.06;
      const aP = (T + hh * 0.04 - vy) / (hw * hw); // so curve reaches near top at ±hw
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const x = L + ((R - L) * i) / 80;
        const y = vy + aP * (x - vx) * (x - vx);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (style?.height) {
        // axis of symmetry
        decAxis(ctx, vx, vy, vx, T + hh * 0.1, lw);
        if (style?.labels) decLabel(ctx, 'ax', vx + fs * 1.2, (vy + T) / 2, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        // focus above vertex
        const focY = vy + 1 / (4 * aP); // aP < 0, so focY < vy (above vertex in canvas coords)
        const focYclamped = Math.max(focY, vy - hh * 0.35); // don't go more than 35% above vertex
        decDot(ctx, vx, focYclamped, Math.max(2, lw * 1.5));
        decVertex(ctx, 'V', vx + vs * 0.6, vy + vs * 0.7, fv);
        decVertex(ctx, 'F', vx + vs * 0.6, focYclamped - vs * 0.7, fv);
        decLabel(ctx, 'p', vx - fs * 1.5, vy - hh * 0.18, DEC_HEIGHT, fs);
      }
      break;
    }

    case 'hyperbola': {
      // Horizontal hyperbola x²/a² - y²/b² = 1, two branches
      const hA = hw * 0.38,
        hB = hh * 0.62;
      // Right branch — parametric: x = hA·cosh(t), y = hB·sinh(t)
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = -1.4 + (i * 2.8) / 60;
        const x = cx + hA * Math.cosh(t);
        const y = cy + hB * Math.sinh(t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Left branch
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = -1.4 + (i * 2.8) / 60;
        const x = cx - hA * Math.cosh(t);
        const y = cy + hB * Math.sinh(t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Asymptotes (dashed green)
      if (style?.diagonal) {
        decDiag(ctx, L, cy - hB * (hw / hA), R, cy + hB * (hw / hA), lw);
        decDiag(ctx, L, cy + hB * (hw / hA), R, cy - hB * (hw / hA), lw);
        if (style?.labels) {
          decLabel(ctx, 'y=±(b/a)x', cx + hw * 0.55, cy - hh * 0.7, DEC_DIAG, fs * 0.8);
        }
      }
      if (style?.labels) {
        decDot(ctx, cx, cy, Math.max(2, lw * 1.5));
        decVertex(ctx, 'O', cx, cy + vs * 0.7, fv);
        decVertex(ctx, 'A', cx + hA + vs, cy, fv);
        decVertex(ctx, 'B', cx - hA - vs, cy, fv);
        decLabel(ctx, 'a', cx + hA / 2, cy + fs * 1.1, color, fs);
        decLabel(ctx, 'b', cx - fs * 1.1, cy - hB / 2, DEC_HEIGHT, fs);
      }
      break;
    }

    // ── GEOMETRIE ÎN SPAȚIU ───────────────────────────────────────────────────

    case 'cube': {
      const s = r * 0.78;
      // Convention: ABCD = bottom, A'B'C'D' = top
      // A=fl(front-left-bottom), B=fr, A'=tl, B'=tr
      // C=fr2(back-right), D=fl2(back-left), C'=tr2, D'=tl2
      const A: Pt = ob(cx, cy, -s, s, 0);
      const B: Pt = ob(cx, cy, s, s, 0);
      const Ap: Pt = ob(cx, cy, -s, -s, 0);
      const Bp: Pt = ob(cx, cy, s, -s, 0);
      const D: Pt = ob(cx, cy, -s, s, s * 2);
      const Cv: Pt = ob(cx, cy, s, s, s * 2);
      const Dp: Pt = ob(cx, cy, -s, -s, s * 2);
      const Cp: Pt = ob(cx, cy, s, -s, s * 2);
      // top, right, front faces
      face3(ctx, [Ap, Bp, Cp, Dp]);
      face3(ctx, [B, Cv, Cp, Bp]);
      face3(ctx, [A, B, Bp, Ap]);
      // hidden edges
      ctx.setLineDash([4, 4]);
      edge3(ctx, A, D);
      edge3(ctx, D, Cv);
      edge3(ctx, D, Dp);
      ctx.setLineDash([]);
      if (style?.height) {
        // Space diagonals in red
        decAxis(ctx, A[0], A[1], Cp[0], Cp[1], lw);
        decAxis(ctx, B[0], B[1], Dp[0], Dp[1], lw);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', (A[0] + B[0]) / 2, A[1] + fs * 1.2, color, fs);
        decVertex(ctx, 'A', A[0] - vs, A[1] + vs * 0.5, fv);
        decVertex(ctx, 'B', B[0] + vs, B[1] + vs * 0.5, fv);
        decVertex(ctx, 'A′', Ap[0] - vs, Ap[1] - vs * 0.5, fv);
        decVertex(ctx, 'B′', Bp[0] + vs, Bp[1] - vs * 0.5, fv);
        decVertex(ctx, 'C′', Cp[0] + vs, Cp[1] - vs * 0.5, fv);
        decVertex(ctx, 'D′', Dp[0] - vs, Dp[1] - vs * 0.5, fv);
        decVertex(ctx, 'C', Cv[0] + vs, Cv[1] + vs * 0.5, fv, '#94a3b8');
        decVertex(ctx, 'D', D[0] - vs, D[1] + vs * 0.5, fv, '#94a3b8');
      }
      break;
    }

    case 'cuboid': {
      const sw = hw * 0.72,
        sh = hh * 0.68;
      const sd = Math.min(sw, sh) * 0.9;
      const A: Pt = ob(cx, cy, -sw, sh, 0);
      const B: Pt = ob(cx, cy, sw, sh, 0);
      const Ap: Pt = ob(cx, cy, -sw, -sh, 0);
      const Bp: Pt = ob(cx, cy, sw, -sh, 0);
      const D: Pt = ob(cx, cy, -sw, sh, sd * 2);
      const Cv: Pt = ob(cx, cy, sw, sh, sd * 2);
      const Dp: Pt = ob(cx, cy, -sw, -sh, sd * 2);
      const Cp: Pt = ob(cx, cy, sw, -sh, sd * 2);
      face3(ctx, [Ap, Bp, Cp, Dp]);
      face3(ctx, [B, Cv, Cp, Bp]);
      face3(ctx, [A, B, Bp, Ap]);
      ctx.setLineDash([4, 4]);
      edge3(ctx, A, D);
      edge3(ctx, D, Cv);
      edge3(ctx, D, Dp);
      ctx.setLineDash([]);
      if (style?.height) {
        decAxis(ctx, A[0], A[1], Cp[0], Cp[1], lw); // space diagonal
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (A[0] + B[0]) / 2, A[1] + fs * 1.2, color, fs);
        decLabel(ctx, 'b', A[0] - fs * 1.0, (A[1] + Ap[1]) / 2, color, fs);
        decLabel(ctx, 'h', (B[0] + Bp[0]) / 2 + fs * 1.0, (B[1] + Bp[1]) / 2, DEC_HEIGHT, fs);
        decVertex(ctx, 'A', A[0] - vs, A[1] + vs * 0.5, fv);
        decVertex(ctx, 'B', B[0] + vs, B[1] + vs * 0.5, fv);
        decVertex(ctx, 'A′', Ap[0] - vs, Ap[1] - vs * 0.5, fv);
        decVertex(ctx, 'B′', Bp[0] + vs, Bp[1] - vs * 0.5, fv);
        decVertex(ctx, 'C′', Cp[0] + vs, Cp[1] - vs * 0.5, fv);
        decVertex(ctx, 'D′', Dp[0] - vs, Dp[1] - vs * 0.5, fv);
      }
      break;
    }

    case 'prism-tri': {
      const s = r * 0.78,
        d = s * 1.4;
      const A: Pt = ob(cx, cy, 0, -s, 0);
      const BL: Pt = ob(cx, cy, -s, s, 0);
      const BR: Pt = ob(cx, cy, s, s, 0);
      const Ap: Pt = ob(cx, cy, 0, -s, d);
      const BLp: Pt = ob(cx, cy, -s, s, d);
      const BRp: Pt = ob(cx, cy, s, s, d);
      face3(ctx, [A, BR, BL]);
      face3(ctx, [A, Ap, BRp, BR]);
      face3(ctx, [BL, BR, BRp, BLp]);
      ctx.setLineDash([4, 4]);
      edge3(ctx, A, Ap, false); // visible, not hidden - but Ap is back
      face3(ctx, [Ap, BRp, BLp]);
      edge3(ctx, BL, BLp, true);
      edge3(ctx, A, Ap, true);
      ctx.setLineDash([]);
      edge3(ctx, BR, BRp);
      if (style?.height) {
        decAxis(ctx, A[0], A[1], (BL[0] + BR[0]) / 2, (BL[1] + BR[1]) / 2, lw);
      }
      if (style?.labels) {
        decLabel(ctx, 'h', (BR[0] + BRp[0]) / 2 + fs, (BR[1] + BRp[1]) / 2, DEC_HEIGHT, fs);
        decVertex(ctx, 'A', A[0], A[1] - vs * 0.8, fv);
        decVertex(ctx, 'B', BR[0] + vs, BR[1] + vs * 0.5, fv);
        decVertex(ctx, 'C', BL[0] - vs, BL[1] + vs * 0.5, fv);
        decVertex(ctx, 'A′', Ap[0], Ap[1] - vs * 0.8, fv);
        decVertex(ctx, 'B′', BRp[0] + vs, BRp[1] - vs * 0.5, fv);
        decVertex(ctx, 'C′', BLp[0] - vs, BLp[1] + vs * 0.5, fv, '#94a3b8');
      }
      break;
    }

    case 'prism-sq': {
      // Square prism (right prism with square base)
      const s = r * 0.6,
        h = r * 1.1;
      const A: Pt = ob(cx, cy, -s, s, 0);
      const B: Pt = ob(cx, cy, s, s, 0);
      const Ap: Pt = ob(cx, cy, -s, -h, 0);
      const Bp: Pt = ob(cx, cy, s, -h, 0);
      const D: Pt = ob(cx, cy, -s, s, s * 2);
      const Cv: Pt = ob(cx, cy, s, s, s * 2);
      const Dp: Pt = ob(cx, cy, -s, -h, s * 2);
      const Cp: Pt = ob(cx, cy, s, -h, s * 2);
      face3(ctx, [Ap, Bp, Cp, Dp]);
      face3(ctx, [B, Cv, Cp, Bp]);
      face3(ctx, [A, B, Bp, Ap]);
      ctx.setLineDash([4, 4]);
      edge3(ctx, A, D);
      edge3(ctx, D, Cv);
      edge3(ctx, D, Dp);
      ctx.setLineDash([]);
      if (style?.height) {
        decAxis(ctx, Bp[0], Bp[1], B[0], B[1], lw);
        if (style?.labels) decLabel(ctx, 'h', Bp[0] + fs, (Bp[1] + B[1]) / 2, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 's', (A[0] + B[0]) / 2, A[1] + fs * 1.2, color, fs);
        decVertex(ctx, 'A', A[0] - vs, A[1] + vs * 0.5, fv);
        decVertex(ctx, 'B', B[0] + vs, B[1] + vs * 0.5, fv);
        decVertex(ctx, 'A′', Ap[0] - vs, Ap[1] - vs * 0.5, fv);
        decVertex(ctx, 'B′', Bp[0] + vs, Bp[1] - vs * 0.5, fv);
        decVertex(ctx, 'C′', Cp[0] + vs, Cp[1] - vs * 0.5, fv);
        decVertex(ctx, 'D′', Dp[0] - vs, Dp[1] - vs * 0.5, fv);
      }
      break;
    }

    case 'prism-hex': {
      const s = r * 0.65,
        d = s * 1.2;
      const front = regularPts(6, 0, 0, s, 0);
      const back = front.map(([x, y]) => ob(cx, cy, x, -y, d));
      const frontS = front.map(([x, y]) => ob(cx, cy, x, -y, 0));
      face3(ctx, frontS);
      face3(ctx, back);
      for (let i = 0; i <= 3; i++) edge3(ctx, frontS[i], back[i]);
      ctx.setLineDash([4, 4]);
      for (let i = 4; i < 6; i++) edge3(ctx, frontS[i], back[i], true);
      ctx.setLineDash([]);
      if (style?.labels) {
        decLabel(ctx, 's', frontS[2][0] + fs, frontS[2][1] + fs, color, fs);
        decLabel(
          ctx,
          'h',
          (frontS[2][0] + back[2][0]) / 2 + fs,
          (frontS[2][1] + back[2][1]) / 2,
          DEC_HEIGHT,
          fs
        );
      }
      break;
    }

    case 'pyramid-tri': {
      // Triangular pyramid (piramidă triunghiulară): equilateral base + apex V
      const s = r * 0.8,
        d = s * 1.5,
        hP = r * 1.05;
      const A: Pt = ob(cx, cy, 0, s, 0);
      const B: Pt = ob(cx, cy, s, s, d);
      const Cv: Pt = ob(cx, cy, -s, s, d);
      const apex: Pt = [cx, cy - hP];
      // base triangle (A-B-C)
      face3(ctx, [A, B, Cv]);
      // front lateral faces
      face3(ctx, [A, B, apex]);
      face3(ctx, [A, Cv, apex], true); // hidden
      edge3(ctx, B, apex);
      if (style?.height) {
        const bCx = (A[0] + B[0] + Cv[0]) / 3;
        const bCy = (A[1] + B[1] + Cv[1]) / 3;
        decAxis(ctx, apex[0], apex[1], bCx, bCy, lw);
        decDot(ctx, bCx, bCy, Math.max(2, lw * 1.5));
        if (style?.labels) {
          decLabel(ctx, 'h', apex[0] + fs * 1.2, (apex[1] + bCy) / 2, DEC_HEIGHT, fs);
          decVertex(ctx, 'O', bCx + vs, bCy, fv);
        }
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (A[0] + B[0]) / 2, A[1] + fs * 1.2, color, fs);
        decVertex(ctx, 'V', apex[0], apex[1] - vs * 0.8, fv);
        decVertex(ctx, 'A', A[0], A[1] + vs * 0.6, fv);
        decVertex(ctx, 'B', B[0] + vs, B[1] + vs * 0.5, fv);
        decVertex(ctx, 'C', Cv[0] - vs, Cv[1] + vs * 0.5, fv);
      }
      break;
    }

    case 'pyramid-sq': {
      const s = r * 0.72,
        h = r * 1.1;
      const bl: Pt = ob(cx, cy, -s, s, 0);
      const br: Pt = ob(cx, cy, s, s, 0);
      const br2: Pt = ob(cx, cy, s, s, s * 2);
      const bl2: Pt = ob(cx, cy, -s, s, s * 2);
      const apex: Pt = ob(cx, cy, 0, -h, s);
      const bCx = (bl[0] + br[0] + br2[0] + bl2[0]) / 4;
      const bCy = (bl[1] + br[1] + br2[1] + bl2[1]) / 4;
      // midpoint of front base edge (for apothem M)
      const mX = (bl[0] + br[0]) / 2,
        mY = (bl[1] + br[1]) / 2;
      face3(ctx, [bl, br, br2, bl2]);
      face3(ctx, [bl, br, apex]);
      face3(ctx, [br, br2, apex]);
      ctx.setLineDash([4, 4]);
      edge3(ctx, bl2, apex, true);
      edge3(ctx, bl, bl2, true);
      ctx.setLineDash([]);
      face3(ctx, [bl2, br2, apex], true);
      if (style?.height) {
        decAxis(ctx, apex[0], apex[1], bCx, bCy, lw);
        decDot(ctx, bCx, bCy, Math.max(2, lw * 1.5));
        if (style?.labels) {
          decLabel(ctx, 'h', apex[0] + fs * 1.2, (apex[1] + bCy) / 2, DEC_HEIGHT, fs);
          // Apothem O→M
          decAxis(ctx, bCx, bCy, mX, mY, lw);
          decLabel(ctx, 'ap', (bCx + mX) / 2 + fs, (bCy + mY) / 2, DEC_HEIGHT, fs * 0.85);
        }
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (bl[0] + br[0]) / 2, bl[1] + fs * 1.2, color, fs);
        decVertex(ctx, 'V', apex[0], apex[1] - vs * 0.8, fv);
        decVertex(ctx, 'A', bl[0] - vs, bl[1] + vs * 0.5, fv);
        decVertex(ctx, 'B', br[0] + vs, br[1] + vs * 0.5, fv);
        decVertex(ctx, 'C', br2[0] + vs, br2[1] + vs * 0.5, fv, '#94a3b8');
        decVertex(ctx, 'D', bl2[0] - vs, bl2[1] + vs * 0.5, fv, '#94a3b8');
        decVertex(ctx, 'O', bCx + vs, bCy, fv);
        decVertex(ctx, 'M', mX, mY + vs * 0.8, fv);
      }
      break;
    }

    case 'frustum-pyramid': {
      // Trunchi de piramidă patrulateră
      const s1 = r * 0.72,
        s2 = s1 * 0.52,
        hFP = r * 0.85;
      // bottom base
      const A: Pt = ob(cx, cy, -s1, s1, 0);
      const B: Pt = ob(cx, cy, s1, s1, 0);
      const Cv: Pt = ob(cx, cy, s1, s1, s1 * 2);
      const D: Pt = ob(cx, cy, -s1, s1, s1 * 2);
      // top base
      const oy = cy - hFP;
      const offZ = s1 - s2;
      const Ap: Pt = ob(cx, oy, -s2, s2, offZ);
      const Bp: Pt = ob(cx, oy, s2, s2, offZ);
      const Cp: Pt = ob(cx, oy, s2, s2, offZ + s2 * 2);
      const Dp: Pt = ob(cx, oy, -s2, s2, offZ + s2 * 2);
      // base and top
      face3(ctx, [A, B, Cv, D]);
      face3(ctx, [Ap, Bp, Cp, Dp]);
      // visible lateral faces
      face3(ctx, [A, B, Bp, Ap]);
      face3(ctx, [B, Cv, Cp, Bp]);
      // hidden
      ctx.setLineDash([4, 4]);
      edge3(ctx, A, D, true);
      edge3(ctx, D, Cv, true);
      edge3(ctx, D, Dp, true);
      edge3(ctx, Ap, Dp, true);
      edge3(ctx, Dp, Cp, true);
      ctx.setLineDash([]);
      // centre axis
      const bCx2 = (A[0] + B[0] + Cv[0] + D[0]) / 4,
        bCy2 = (A[1] + B[1] + Cv[1] + D[1]) / 4;
      const tCx = (Ap[0] + Bp[0] + Cp[0] + Dp[0]) / 4,
        tCy = (Ap[1] + Bp[1] + Cp[1] + Dp[1]) / 4;
      if (style?.height) {
        decAxis(ctx, tCx, tCy, bCx2, bCy2, lw);
        decDot(ctx, tCx, tCy, Math.max(2, lw * 1.5));
        decDot(ctx, bCx2, bCy2, Math.max(2, lw * 1.5));
        if (style?.labels) decLabel(ctx, 'h', tCx + fs, (tCy + bCy2) / 2, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (A[0] + B[0]) / 2, A[1] + fs * 1.2, color, fs);
        decLabel(ctx, 'b', (Ap[0] + Bp[0]) / 2, Ap[1] - fs * 1.1, color, fs);
        decVertex(ctx, 'A', A[0] - vs, A[1] + vs * 0.5, fv);
        decVertex(ctx, 'B', B[0] + vs, B[1] + vs * 0.5, fv);
        decVertex(ctx, 'A′', Ap[0] - vs, Ap[1] - vs * 0.5, fv);
        decVertex(ctx, 'B′', Bp[0] + vs, Bp[1] - vs * 0.5, fv);
        decVertex(ctx, 'C′', Cp[0] + vs, Cp[1] - vs * 0.5, fv);
      }
      break;
    }

    case 'cone': {
      const s = r * 0.82,
        h = r * 1.1;
      const apex: Pt = [cx, cy - h];
      const botY = cy + h * 0.15;
      ctx.beginPath();
      ctx.ellipse(cx, botY, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(apex[0], apex[1]);
      ctx.lineTo(cx - s, botY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(apex[0], apex[1]);
      ctx.lineTo(cx + s, botY);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, botY, s, s * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style?.height) {
        decAxis(ctx, cx, cy - h, cx, botY, lw);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 1.0, cy - h * 0.4, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decDot(ctx, cx, botY, Math.max(2, lw * 1.5));
        decRed(ctx, cx, botY, cx + s, botY, lw);
        decLabel(ctx, 'R', cx + s / 2, botY + fs * 1.2, DEC_HEIGHT, fs);
        decLabel(ctx, 'G', cx + s / 2 + fs * 1.0, cy - h * 0.4 + fs, color, fs);
        decVertex(ctx, 'V', cx, cy - h - vs * 0.7, fv);
        decVertex(ctx, 'O', cx, botY + vs * 0.8, fv);
        decVertex(ctx, 'A', cx - s - vs, botY, fv);
        decVertex(ctx, 'B', cx + s + vs, botY, fv);
      }
      break;
    }

    case 'frustum-cone': {
      // Trunchi de con
      const s1 = r * 0.82,
        s2 = s1 * 0.5,
        hFC = r * 0.95;
      const topY = cy - hFC * 0.7,
        botY2 = cy + hFC * 0.3;
      ctx.beginPath();
      ctx.ellipse(cx, botY2, s1, s1 * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, topY, s2, s2 * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s1, botY2);
      ctx.lineTo(cx - s2, topY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s1, botY2);
      ctx.lineTo(cx + s2, topY);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, botY2, s1, s1 * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style?.height) {
        decAxis(ctx, cx, topY, cx, botY2, lw);
        if (style?.labels) decLabel(ctx, 'h', cx + fs, (topY + botY2) / 2, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decDot(ctx, cx, topY, Math.max(2, lw * 1.5));
        decDot(ctx, cx, botY2, Math.max(2, lw * 1.5));
        decRed(ctx, cx, botY2, cx + s1, botY2, lw);
        decRed(ctx, cx, topY, cx + s2, topY, lw);
        decLabel(ctx, 'R', cx + s1 / 2, botY2 + fs * 1.2, DEC_HEIGHT, fs);
        decLabel(ctx, 'r', cx + s2 / 2, topY - fs * 1.1, DEC_HEIGHT, fs);
        decLabel(ctx, 'G', cx + s1 / 2 + fs * 1.2, (topY + botY2) / 2, color, fs);
        decVertex(ctx, 'A′', cx - s2 - vs, topY, fv);
        decVertex(ctx, 'O′', cx, topY - vs * 0.8, fv);
        decVertex(ctx, 'B′', cx + s2 + vs, topY, fv);
        decVertex(ctx, 'A', cx - s1 - vs, botY2, fv);
        decVertex(ctx, 'O', cx, botY2 + vs * 0.8, fv);
        decVertex(ctx, 'B', cx + s1 + vs, botY2, fv);
      }
      break;
    }

    case 'cylinder': {
      const s = r * 0.78,
        h = r * 1.0;
      const topY2 = cy - h,
        botY3 = cy + h;
      ctx.beginPath();
      ctx.ellipse(cx, topY2, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, botY3, s, s * 0.32, 0, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, botY3, s, s * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx - s, topY2);
      ctx.lineTo(cx - s, botY3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s, topY2);
      ctx.lineTo(cx + s, botY3);
      ctx.stroke();
      if (style?.height) {
        decAxis(ctx, cx, topY2, cx, botY3, lw);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 1.0, cy, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decDot(ctx, cx, topY2, Math.max(2, lw * 1.5));
        decDot(ctx, cx, botY3, Math.max(2, lw * 1.5));
        decRed(ctx, cx, topY2, cx + s, topY2, lw);
        decLabel(ctx, 'R', cx + s / 2, topY2 - fs * 1.1, DEC_HEIGHT, fs);
        decVertex(ctx, 'A′', cx - s - vs, topY2, fv);
        decVertex(ctx, 'O′', cx, topY2 - vs * 0.8, fv);
        decVertex(ctx, 'B′', cx + s + vs, topY2, fv);
        decVertex(ctx, 'A', cx - s - vs, botY3, fv);
        decVertex(ctx, 'O', cx, botY3 + vs * 0.8, fv);
        decVertex(ctx, 'B', cx + s + vs, botY3, fv);
      }
      break;
    }

    case 'sphere': {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.32, 0, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.32, r, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style?.labels) {
        decAxis(ctx, cx - r, cy, cx + r, cy, lw);
        decDot(ctx, cx, cy, Math.max(2, lw * 1.5));
        decLabel(ctx, 'R', cx + r / 2, cy - fs * 1.0, DEC_HEIGHT, fs);
        decVertex(ctx, 'O', cx, cy - vs * 0.8, fv);
        decVertex(ctx, 'A', cx - r - vs, cy, fv);
        decVertex(ctx, 'B', cx + r + vs, cy, fv);
      }
      break;
    }
  }

  ctx.restore();
}

// ─── Preview draw (dashed outline) ───────────────────────────────────────────

export function drawGeomPreview(
  ctx: CanvasRenderingContext2D,
  geomKind: GeomKind,
  color: string,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style?: GeomStyle
) {
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.setLineDash([6, 4]);
  drawGeom(ctx, geomKind, color, width, x1, y1, x2, y2, style);
  ctx.restore();
}

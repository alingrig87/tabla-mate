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
  // Patrulater
  | 'rhombus'
  | 'parallelogram'
  | 'trapezoid'
  | 'trap-right'
  | 'trap-isosceles'
  // Poligoane regulate
  | 'pentagon'
  | 'hexagon'
  | 'heptagon'
  | 'octagon'
  // Cercuri
  | 'arc'
  | 'sector'
  | 'annulus'
  // 3D
  | 'cube'
  | 'cuboid'
  | 'prism-tri'
  | 'prism-hex'
  | 'pyramid-sq'
  | 'tetrahedron'
  | 'cone'
  | 'cylinder'
  | 'sphere';

/**
 * Decoration toggles for a drawn geometric figure.
 * Each flag adds a layer of visual annotation on top of the base outline.
 * All flags are optional / default false — so existing drawings without
 * a `style` field render exactly as before (no decorations).
 */
export interface GeomStyle {
  /** Draw altitude / height line in red with a right-angle mark */
  height?: boolean;
  /** Draw angle arc at the relevant vertex in amber */
  angle?: boolean;
  /** Render dimension labels (a, b, h, R, …) next to each element */
  labels?: boolean;
  /** Draw diagonal or midline in green dashed */
  diagonal?: boolean;
}

export interface GeomItem {
  kind: 'geom'; // discriminator unic în DrawItem
  id: string; // stable UUID — used as Firestore document id in collaborative mode
  geomKind: GeomKind; // figura concretă
  color: string;
  width: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  style?: GeomStyle; // optional visual decorations
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
      { kind: 'tri-equilateral', label: 'Echilateral' },
      { kind: 'tri-isosceles', label: 'Isoscel' },
      { kind: 'tri-scalene', label: 'Oarecare' },
    ],
  },
  {
    label: 'Patrulater',
    shapes: [
      { kind: 'rhombus', label: 'Romb' },
      { kind: 'parallelogram', label: 'Paralelogram' },
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
      { kind: 'heptagon', label: 'Heptagon' },
      { kind: 'octagon', label: 'Octogon' },
    ],
  },
  {
    label: 'Cercuri',
    shapes: [
      { kind: 'arc', label: 'Arc de cerc' },
      { kind: 'sector', label: 'Sector de cerc' },
      { kind: 'annulus', label: 'Coroană circulară' },
    ],
  },
  {
    label: 'Geometrie în spațiu',
    shapes: [
      { kind: 'cube', label: 'Cub' },
      { kind: 'cuboid', label: 'Paralelipiped' },
      { kind: 'prism-tri', label: 'Prismă triunghi.' },
      { kind: 'prism-hex', label: 'Prismă hexagon.' },
      { kind: 'pyramid-sq', label: 'Piramidă (pătrat)' },
      { kind: 'tetrahedron', label: 'Tetraedru' },
      { kind: 'cone', label: 'Con' },
      { kind: 'cylinder', label: 'Cilindru' },
      { kind: 'sphere', label: 'Sferă' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  // vertex at (x,y), one side in dx direction, other in dy direction
  ctx.beginPath();
  ctx.moveTo(x + dx * sq, y);
  ctx.lineTo(x + dx * sq, y + dy * sq);
  ctx.lineTo(x, y + dy * sq);
  ctx.stroke();
}

// Oblique projection: depth goes upper-right at ~30°
// (ox, oy) = screen center, lx = local-right, ly = local-down, lz = depth
const DX = 0.65; // depth x factor
const DY = 0.38; // depth y factor (negative = up)

function ob(ox: number, oy: number, lx: number, ly: number, lz: number): Pt {
  return [ox + lx + lz * DX, oy + ly - lz * DY];
}

// Draw a 3D face (quadrilateral)
function face3(ctx: CanvasRenderingContext2D, pts: Pt[], dashed = false) {
  if (dashed) ctx.setLineDash([4, 4]);
  poly(ctx, pts);
  if (dashed) ctx.setLineDash([]);
}

// ─── Decoration colour tokens ─────────────────────────────────────────────────

const DEC_HEIGHT = '#dc2626'; // red   — altitudini / înălțimi
const DEC_ANGLE = '#d97706'; // amber — unghiuri
const DEC_LABEL = '#0f172a'; // dark  — etichete principale
const DEC_DIAG = '#16a34a'; // green — diagonale / linii mijlocii

// ─── Decoration drawing helpers ───────────────────────────────────────────────

/**
 * Draw a dashed red line from (x1,y1) to (x2,y2) — represents an altitude.
 * Also draws the right-angle mark at the foot (x2,y2).
 * dx/dy: unit direction away from the base along which the mark arms go.
 */
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

/**
 * Draw an angle arc (amber) centred at (vx, vy) from angle a1 to a2 (radians).
 */
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

/**
 * Draw a dimension label in italic serif.
 */
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

/**
 * Draw a dashed green line — represents a diagonal or midline.
 */
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
  const sq = Math.max(4, lw * 4); // right-angle mark size
  const fs = Math.max(8, Math.min(hw, hh) * 0.18); // font size proportional to shape

  switch (kind) {
    // ── LINII & UNGHIURI ────────────────────────────────────────────────────────

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
        decLabel(ctx, 'A', L, cy - sq * 2, color, fs);
        decLabel(ctx, 'B', R, cy - sq * 2, color, fs);
        decLabel(ctx, 'l', cx, cy - sq * 1.5, DEC_LABEL, fs);
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
        decLabel(ctx, 'O', L, cy - sq * 2, color, fs);
        decLabel(ctx, 'A', R, cy - sq * 2, color, fs);
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
      }
      break;
    }

    // ── TRIUNGHIURI ─────────────────────────────────────────────────────────────

    case 'tri-right': {
      poly(ctx, [
        [L, B],
        [R, B],
        [L, T],
      ]);
      rightAngleMark(ctx, L, B, 1, -1, sq);
      // Decorations
      if (style?.height) {
        // Altitude from right-angle vertex A(L,B) to hypotenuse (L,T)-(R,B)
        const dx = R - L,
          dy = B - T;
        const len2 = dx * dx + dy * dy;
        const t = ((L - L) * dx + (B - B) * dy) / len2; // t=0 at A projected onto hyp
        // Foot of altitude from A(L,B) onto BC where B=(R,B), C=(L,T)
        const bx = R,
          by = B,
          cx2 = L,
          cy2 = T;
        const ddx = cx2 - bx,
          ddy = cy2 - by;
        const ll2 = ddx * ddx + ddy * ddy;
        const tt = ((L - bx) * ddx + (B - by) * ddy) / ll2;
        const footX = bx + tt * ddx,
          footY = by + tt * ddy;
        const rot = Math.atan2(ddy, ddx);
        // Draw altitude
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.setLineDash([Math.max(4, sq * 0.9), Math.max(3, sq * 0.65)]);
        ctx.beginPath();
        ctx.moveTo(L, B);
        ctx.lineTo(footX, footY);
        ctx.stroke();
        ctx.setLineDash([]);
        // Rotated right-angle mark at foot
        const sq2 = Math.max(3, sq * 0.7);
        const nx = Math.cos(rot + Math.PI / 2) * sq2;
        const ny = Math.sin(rot + Math.PI / 2) * sq2;
        const ex2 = Math.cos(rot) * sq2;
        const ey2 = Math.sin(rot) * sq2;
        ctx.beginPath();
        ctx.moveTo(footX + nx, footY + ny);
        ctx.lineTo(footX + nx + ex2, footY + ny + ey2);
        ctx.lineTo(footX + ex2, footY + ey2);
        ctx.stroke();
        ctx.restore();
        if (style?.labels) {
          const mx = (L + footX) / 2,
            my = (B + footY) / 2;
          decLabel(ctx, 'h', mx - fs * 0.9, my, DEC_HEIGHT, fs);
        }
        void t; // suppress unused warning
      }
      if (style?.labels) {
        // c₁ on vertical, c₂ on horizontal, i on hypotenuse
        decLabel(ctx, 'c₁', L - fs * 1.0, cy, DEC_DIAG, fs);
        decLabel(ctx, 'c₂', cx, B + fs * 1.2, DEC_DIAG, fs);
        decLabel(ctx, 'i', cx + fs * 0.9, cy - fs * 0.4, color, fs);
      }
      break;
    }

    case 'tri-equilateral': {
      const h = r * Math.sqrt(3);
      const ax = cx,
        ay = cy - (h * 2) / 3;
      const bx = cx + r,
        by = cy + h / 3;
      const ex = cx - r,
        ey = cy + h / 3;
      poly(ctx, [
        [ax, ay],
        [bx, by],
        [ex, ey],
      ]);
      if (style?.height) {
        decHeight(ctx, ax, ay, cx, by, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 0.9, (ay + by) / 2, DEC_HEIGHT, fs);
      }
      if (style?.angle) {
        decAngle(ctx, bx, by, r * 0.28, Math.PI + 0.35, Math.PI + Math.PI / 3 - 0.1);
        if (style?.labels) decLabel(ctx, '60°', bx - r * 0.38, by - r * 0.18, DEC_ANGLE, fs * 0.85);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', (ax + ex) / 2 - fs * 0.8, (ay + ey) / 2, color, fs);
        decLabel(ctx, 'l', (ax + bx) / 2 + fs * 0.8, (ay + by) / 2, color, fs);
        decLabel(ctx, 'l', cx, by + fs * 1.2, color, fs);
      }
      break;
    }

    case 'tri-isosceles': {
      const ax = cx,
        ay = T;
      const bx = R,
        by = B;
      const ex = L,
        ey = B;
      poly(ctx, [
        [ax, ay],
        [bx, by],
        [ex, ey],
      ]);
      if (style?.height) {
        decHeight(ctx, ax, ay, cx, B, lw, sq, 1, -1);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 0.9, cy, DEC_HEIGHT, fs);
      }
      if (style?.angle) {
        // angle at B (bottom-right)
        const a1 = Math.atan2(ay - by, ax - bx);
        const a2 = Math.atan2(ey - by, ex - bx);
        decAngle(ctx, bx, by, r * 0.3, a2, a1);
        if (style?.labels) decLabel(ctx, 'u', bx - r * 0.38, by - r * 0.16, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', (ax + ex) / 2 - fs * 0.9, (ay + ey) / 2, color, fs);
        decLabel(ctx, 'l', (ax + bx) / 2 + fs * 0.9, (ay + by) / 2, color, fs);
        decLabel(ctx, 'b', cx, B + fs * 1.2, color, fs);
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
        // angle at B (bottom-right)
        const a1 = Math.atan2(T - B, apexX - R);
        const a2 = Math.atan2(B - B, L - R);
        decAngle(ctx, R, B, r * 0.28, a2, a1);
        if (style?.labels) decLabel(ctx, 'u', R - r * 0.35, B - r * 0.14, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (L + apexX) / 2 - fs * 0.9, (B + T) / 2, color, fs);
        decLabel(ctx, 'c', (R + apexX) / 2 + fs * 0.9, (B + T) / 2, color, fs);
        decLabel(ctx, 'b', cx, B + fs * 1.2, color, fs);
      }
      break;
    }

    // ── PATRULATER ──────────────────────────────────────────────────────────────

    case 'rhombus': {
      poly(ctx, [
        [cx, T],
        [R, cy],
        [cx, B],
        [L, cy],
      ]);
      if (style?.diagonal) {
        decDiag(ctx, cx, T, cx, B, lw);
        decDiag(ctx, L, cy, R, cy, lw);
        // right-angle at centre
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.beginPath();
        ctx.moveTo(cx, cy - sq * 0.6);
        ctx.lineTo(cx + sq * 0.6, cy - sq * 0.6);
        ctx.lineTo(cx + sq * 0.6, cy);
        ctx.stroke();
        ctx.restore();
      }
      if (style?.angle) {
        decAngle(ctx, R, cy, r * 0.28, Math.PI * 0.6, Math.PI * 1.4);
        if (style?.labels) decLabel(ctx, 'u', R - r * 0.36, cy, DEC_ANGLE, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'l', (cx + L) / 2 - fs * 0.6, (cy + T) / 2, color, fs);
        if (style?.diagonal) {
          decLabel(ctx, 'd₁', cx + fs * 1.0, (T + cy) / 2, DEC_DIAG, fs);
          decLabel(ctx, 'd₂', (cx + R) / 2, cy - fs * 1.0, DEC_DIAG, fs);
        }
      }
      break;
    }

    case 'parallelogram': {
      const sk = hw * 0.3;
      poly(ctx, [
        [L + sk, T],
        [R, T],
        [R - sk, B],
        [L, B],
      ]);
      if (style?.height) {
        // Height from top-left vertex (L+sk, T) down to base
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
        decLabel(ctx, 'a', L + fs * 0.2, cy, color, fs);
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
        // Midline
        const mlL = (L + topL) / 2,
          mlR = (R + topR) / 2;
        decDiag(ctx, mlL, cy, mlR, cy, lw);
        if (style?.labels) decLabel(ctx, 'lₘ', (mlL + mlR) / 2, cy - fs * 1.1, DEC_DIAG, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'B', cx, B + fs * 1.2, color, fs);
        decLabel(ctx, 'b', (topL + topR) / 2, T - fs * 1.1, color, fs);
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
        decLabel(ctx, 'B', cx, B + fs * 1.2, color, fs);
        decLabel(ctx, 'b', (L + R - ins) / 2, T - fs * 1.1, color, fs);
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
        // Height from midpoint of top base to bottom
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
        decLabel(ctx, 'B', cx, B + fs * 1.2, color, fs);
        decLabel(ctx, 'b', cx, T - fs * 1.1, color, fs);
      }
      break;
    }

    // ── POLIGOANE REGULATE ──────────────────────────────────────────────────────

    case 'pentagon':
      poly(ctx, regularPts(5, cx, cy, r, -Math.PI / 2));
      if (style?.labels) decLabel(ctx, 'l', cx + r + fs, cy, color, fs);
      break;
    case 'hexagon':
      poly(ctx, regularPts(6, cx, cy, r, 0));
      if (style?.labels) decLabel(ctx, 'l', cx + r + fs, cy, color, fs);
      break;
    case 'heptagon':
      poly(ctx, regularPts(7, cx, cy, r, -Math.PI / 2));
      if (style?.labels) decLabel(ctx, 'l', cx + r + fs, cy, color, fs);
      break;
    case 'octagon':
      poly(ctx, regularPts(8, cx, cy, r, Math.PI / 8));
      if (style?.labels) decLabel(ctx, 'l', cx + r + fs, cy, color, fs);
      break;

    // ── CERCURI ─────────────────────────────────────────────────────────────────

    case 'arc':
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();
      if (style?.labels) {
        // Radius line
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();
        ctx.restore();
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
        decLabel(ctx, 'R', cx + r * 0.54, cy - r * 0.54, DEC_HEIGHT, fs);
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
        decLabel(ctx, 'R', cx + (r + r * 0.52) / 2, cy - fs * 0.8, DEC_HEIGHT, fs);
        decLabel(ctx, 'r', cx + r * 0.26, cy - fs * 0.8, DEC_LABEL, fs);
      }
      break;

    // ── GEOMETRIE ÎN SPAȚIU ─────────────────────────────────────────────────────

    case 'cube': {
      const s = r * 0.78;
      // front face
      const fl: Pt = ob(cx, cy, -s, s, 0);
      const fr: Pt = ob(cx, cy, s, s, 0);
      const tr: Pt = ob(cx, cy, s, -s, 0);
      const tl: Pt = ob(cx, cy, -s, -s, 0);
      // back face (same + depth offset)
      const fl2: Pt = ob(cx, cy, -s, s, s * 2);
      const fr2: Pt = ob(cx, cy, s, s, s * 2);
      const tr2: Pt = ob(cx, cy, s, -s, s * 2);
      const tl2: Pt = ob(cx, cy, -s, -s, s * 2);
      // visible faces
      face3(ctx, [tl, tr, tr2, tl2]); // top
      face3(ctx, [tr, fr, fr2, tr2]); // right
      face3(ctx, [fl, fr, tr, tl]); // front
      // hidden edges dashed
      face3(ctx, [fl, fl2, fr2, fr], true);
      face3(ctx, [tl2, fl2], false); // single line hidden
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(fl2[0], fl2[1]);
      ctx.lineTo(tl2[0], tl2[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style?.labels) {
        decLabel(ctx, 'l', (fl[0] + fr[0]) / 2, fl[1] + fs * 1.2, color, fs);
        decLabel(ctx, 'l', fl[0] - fs * 1.0, (fl[1] + tl[1]) / 2, color, fs);
        decLabel(ctx, 'l', (fr[0] + fr2[0]) / 2 + fs * 0.9, (fr[1] + fr2[1]) / 2, color, fs);
      }
      if (style?.height) {
        // Vertical edge as height indicator
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.beginPath();
        ctx.moveTo(fr2[0], fr2[1]);
        ctx.lineTo(fl2[0], fl2[1]);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'cuboid': {
      const sw = hw * 0.72,
        sh = hh * 0.68;
      const sd = Math.min(sw, sh) * 0.9;
      const fl: Pt = ob(cx, cy, -sw, sh, 0);
      const fr: Pt = ob(cx, cy, sw, sh, 0);
      const tr: Pt = ob(cx, cy, sw, -sh, 0);
      const tl: Pt = ob(cx, cy, -sw, -sh, 0);
      const fl2: Pt = ob(cx, cy, -sw, sh, sd * 2);
      const fr2: Pt = ob(cx, cy, sw, sh, sd * 2);
      const tr2: Pt = ob(cx, cy, sw, -sh, sd * 2);
      const tl2: Pt = ob(cx, cy, -sw, -sh, sd * 2);
      face3(ctx, [tl, tr, tr2, tl2]);
      face3(ctx, [tr, fr, fr2, tr2]);
      face3(ctx, [fl, fr, tr, tl]);
      ctx.setLineDash([4, 4]);
      face3(ctx, [fl, fl2, fr2, fr]);
      ctx.beginPath();
      ctx.moveTo(fl2[0], fl2[1]);
      ctx.lineTo(tl2[0], tl2[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style?.labels) {
        decLabel(ctx, 'a', (fl[0] + fr[0]) / 2, fl[1] + fs * 1.2, color, fs);
        decLabel(ctx, 'b', fl[0] - fs * 1.0, (fl[1] + tl[1]) / 2, color, fs);
        decLabel(ctx, 'h', (fr[0] + tr[0]) / 2 + fs * 1.0, (fr[1] + tr[1]) / 2, DEC_HEIGHT, fs);
      }
      if (style?.height) {
        // Height edge
        decDiag(ctx, tr[0], tr[1], fr[0], fr[1], lw);
      }
      break;
    }

    case 'prism-tri': {
      const s = r * 0.78;
      const d = s * 1.4;
      const A: Pt = ob(cx, cy, 0, -s, 0);
      const BL: Pt = ob(cx, cy, -s, s, 0);
      const BR: Pt = ob(cx, cy, s, s, 0);
      const A2: Pt = ob(cx, cy, 0, -s, d);
      const BL2: Pt = ob(cx, cy, -s, s, d);
      const BR2: Pt = ob(cx, cy, s, s, d);
      face3(ctx, [A, BR, BL]); // front triangle
      face3(ctx, [A2, BR2, BL2]); // back triangle
      face3(ctx, [A, A2, BR2, BR]); // right lateral
      face3(ctx, [BL, BR, BR2, BL2]); // bottom lateral
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(A2[0], A2[1]);
      ctx.moveTo(BL[0], BL[1]);
      ctx.lineTo(BL2[0], BL2[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style?.height) {
        // Height of lateral face
        decDiag(ctx, A[0], A[1], (BL[0] + BR[0]) / 2, (BL[1] + BR[1]) / 2, lw);
      }
      if (style?.labels) {
        decLabel(ctx, 'h', (BR[0] + BR2[0]) / 2 + fs, (BR[1] + BR2[1]) / 2, DEC_HEIGHT, fs);
        decLabel(ctx, 'Ab', A[0] - fs * 1.5, A[1], color, fs);
      }
      break;
    }

    case 'prism-hex': {
      const s = r * 0.65;
      const d = s * 1.2;
      const front = regularPts(6, 0, 0, s, 0);
      const back = front.map(([x, y]) => ob(cx, cy, x, -y, d));
      const frontS = front.map(([x, y]) => ob(cx, cy, x, -y, 0));
      face3(ctx, frontS);
      face3(ctx, back);
      // visible lateral edges (right half)
      for (let i = 0; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(frontS[i][0], frontS[i][1]);
        ctx.lineTo(back[i][0], back[i][1]);
        ctx.stroke();
      }
      ctx.setLineDash([4, 4]);
      for (let i = 4; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(frontS[i][0], frontS[i][1]);
        ctx.lineTo(back[i][0], back[i][1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      break;
    }

    case 'pyramid-sq': {
      const s = r * 0.72;
      const h = r * 1.1;
      // base
      const bl: Pt = ob(cx, cy, -s, s, 0);
      const br: Pt = ob(cx, cy, s, s, 0);
      const br2: Pt = ob(cx, cy, s, s, s * 2);
      const bl2: Pt = ob(cx, cy, -s, s, s * 2);
      // apex
      const apex: Pt = ob(cx, cy, 0, -h, s);
      face3(ctx, [bl, br, br2, bl2]); // base
      face3(ctx, [bl, br, apex]); // front face
      face3(ctx, [br, br2, apex]); // right face
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(bl2[0], bl2[1]);
      ctx.lineTo(apex[0], apex[1]);
      ctx.moveTo(bl[0], bl[1]);
      ctx.lineTo(bl2[0], bl2[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      face3(ctx, [bl2, br2, apex], true);
      if (style?.height) {
        // Axis from apex to base centre
        const baseCx = (bl[0] + br[0] + br2[0] + bl2[0]) / 4;
        const baseCy = (bl[1] + br[1] + br2[1] + bl2[1]) / 4;
        decDiag(ctx, apex[0], apex[1], baseCx, baseCy, lw);
        if (style?.labels)
          decLabel(ctx, 'h', apex[0] + fs * 1.2, (apex[1] + baseCy) / 2, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'a', (bl[0] + br[0]) / 2, bl[1] + fs * 1.2, color, fs);
      }
      break;
    }

    case 'tetrahedron': {
      const s = r * 0.85;
      const h = s * Math.sqrt(2 / 3);
      const A: Pt = [cx, cy - h * 1.2];
      const Bpt: Pt = [cx + s * 0.9, cy + h * 0.7];
      const C: Pt = [cx - s * 0.9, cy + h * 0.7];
      const D: Pt = [cx + s * 0.3, cy + h * 0.05];
      face3(ctx, [A, Bpt, C]); // front
      face3(ctx, [A, Bpt, D]); // right
      ctx.setLineDash([4, 4]);
      face3(ctx, [A, C, D]);
      ctx.beginPath();
      ctx.moveTo(Bpt[0], Bpt[1]);
      ctx.lineTo(D[0], D[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      face3(ctx, [Bpt, C, D], true);
      if (style?.labels) {
        decLabel(ctx, 'a', (A[0] + Bpt[0]) / 2 + fs, (A[1] + Bpt[1]) / 2, color, fs);
      }
      break;
    }

    case 'cone': {
      const s = r * 0.82;
      const h = r * 1.1;
      const apex: Pt = [cx, cy - h];
      // base ellipse
      ctx.beginPath();
      ctx.ellipse(cx, cy + h * 0.15, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(apex[0], apex[1]);
      ctx.lineTo(cx - s, cy + h * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(apex[0], apex[1]);
      ctx.lineTo(cx + s, cy + h * 0.15);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, cy + h * 0.15, s, s * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (style?.height) {
        decDiag(ctx, cx, cy - h, cx, cy + h * 0.15, lw);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 1.0, cy - h * 0.4, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        decLabel(ctx, 'R', cx + s / 2, cy + h * 0.15 + fs * 1.2, DEC_HEIGHT, fs);
        decLabel(ctx, 'G', (cx + cx + s) / 2 + fs * 1.0, (cy - h + cy + h * 0.15) / 2, color, fs);
      }
      break;
    }

    case 'cylinder': {
      const s = r * 0.78;
      const h = r * 1.0;
      ctx.beginPath();
      ctx.ellipse(cx, cy - h, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy + h, s, s * 0.32, 0, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, cy + h, s, s * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - h);
      ctx.lineTo(cx - s, cy + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s, cy - h);
      ctx.lineTo(cx + s, cy + h);
      ctx.stroke();
      if (style?.height) {
        decDiag(ctx, cx, cy - h, cx, cy + h, lw);
        if (style?.labels) decLabel(ctx, 'h', cx + fs * 1.0, cy, DEC_HEIGHT, fs);
      }
      if (style?.labels) {
        // Radius line on top
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.lineTo(cx + s, cy - h);
        ctx.stroke();
        ctx.restore();
        decLabel(ctx, 'R', cx + s / 2, cy - h - fs * 1.1, DEC_HEIGHT, fs);
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
        // Radius from centre to right
        ctx.save();
        ctx.strokeStyle = DEC_HEIGHT;
        ctx.lineWidth = Math.max(0.8, lw * 0.65);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = DEC_HEIGHT;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(2, lw * 1.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        decLabel(ctx, 'R', cx + r / 2, cy - fs * 1.0, DEC_HEIGHT, fs);
        decLabel(ctx, 'O', cx - fs * 0.7, cy - fs * 0.7, DEC_LABEL, fs * 0.85);
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

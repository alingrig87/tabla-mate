/**
 * GeometriePage — figuri geometrice cu notații standard și formule.
 * Secțiuni: Figuri plane (arii & perimetre) și Corpuri geometrice (arii & volume).
 */

import React, { useState } from 'react';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  shape: '#1e40af', // deep-blue  — shape outline
  height: '#dc2626', // red        — heights / altitudes / axes
  diag: '#16a34a', // green      — diagonals / midlines
  angle: '#d97706', // amber      — angle arcs + labels
  hidden: '#94a3b8', // slate-gray — dashed hidden edges
  dot: '#dc2626', // red dot    — centres
  text: '#0f172a', // near-black — vertex / dimension labels
};

// ─── SVG helpers ──────────────────────────────────────────────────────────────

type Anchor = 'start' | 'middle' | 'end';

/** Dimension label — italic serif (for a, b, h, R, …) */
function Lbl({
  x,
  y,
  text,
  color = C.text,
  size = 13,
  anchor = 'middle' as Anchor,
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  size?: number;
  anchor?: Anchor;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontFamily="Georgia, serif"
      fontStyle="italic"
      textAnchor={anchor}
      dominantBaseline="central"
    >
      {text}
    </text>
  );
}

/** Vertex label — bold sans-serif (for A, B, V, O, …) */
function VLbl({
  x,
  y,
  text,
  anchor = 'middle' as Anchor,
  color = C.text,
  size = 10,
}: {
  x: number;
  y: number;
  text: string;
  anchor?: Anchor;
  color?: string;
  size?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontFamily="sans-serif"
      fontWeight="700"
      textAnchor={anchor}
      dominantBaseline="central"
    >
      {text}
    </text>
  );
}

/** Small square at a right-angle corner */
function RightAngleMark({
  cx,
  cy,
  size = 7,
  rotate = 0,
}: {
  cx: number;
  cy: number;
  size?: number;
  rotate?: number;
}) {
  const s = size;
  const r = (rotate * Math.PI) / 180;
  const cos = Math.cos(r),
    sin = Math.sin(r);
  const rot = (dx: number, dy: number): [number, number] => [
    cx + dx * cos - dy * sin,
    cy + dx * sin + dy * cos,
  ];
  const [ax, ay] = rot(0, 0);
  const [bx, by] = rot(s, 0);
  const [ex, ey] = rot(s, -s);
  const [fx, fy] = rot(0, -s);
  return (
    <path
      d={`M${ax},${ay} L${bx},${by} L${ex},${ey} L${fx},${fy}`}
      fill="none"
      stroke={C.height}
      strokeWidth="1.4"
    />
  );
}

/** Small arc for angle mark */
function AngleArc({
  cx,
  cy,
  r = 16,
  startDeg,
  endDeg,
}: {
  cx: number;
  cy: number;
  r?: number;
  startDeg: number;
  endDeg: number;
}) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startDeg));
  const sy = cy + r * Math.sin(toRad(startDeg));
  const ex = cx + r * Math.cos(toRad(endDeg));
  const ey = cy + r * Math.sin(toRad(endDeg));
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return (
    <path
      d={`M${sx},${sy} A${r},${r} 0 ${large} 1 ${ex},${ey}`}
      fill="none"
      stroke={C.angle}
      strokeWidth="1.4"
    />
  );
}

// ─── 2D Figure SVGs ───────────────────────────────────────────────────────────

const SVGTriunghi = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <polygon
      points="14,115 146,115 95,18"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <line
      x1="95"
      y1="18"
      x2="95"
      y2="115"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <RightAngleMark cx={95} cy={115} size={7} rotate={0} />
    <Lbl x={46} y={72} text="a" color={C.shape} />
    <Lbl x={124} y={72} text="c" color={C.shape} />
    <Lbl x={80} y={127} text="b" color={C.shape} />
    <Lbl x={104} y={72} text="h" color={C.height} size={12} />
    <AngleArc cx={146} cy={115} r={20} startDeg={155} endDeg={180} />
    <Lbl x={121} y={112} text="u" color={C.angle} size={11} />
  </svg>
);

const SVGTriunghiDreptunghic = () => {
  // renamed to avoid conflict with C color tokens
  const ptA: [number, number] = [18, 112];
  const ptB: [number, number] = [142, 112];
  const apex: [number, number] = [18, 20];
  const [bx, by] = ptB,
    [cx, cy] = apex;
  const dx = cx - bx,
    dy = cy - by;
  const len2 = dx * dx + dy * dy;
  const t = ((ptA[0] - bx) * dx + (ptA[1] - by) * dy) / len2;
  const Hx = bx + t * dx,
    Hy = by + t * dy;
  return (
    <svg viewBox="0 0 160 130" width="160" height="130">
      <polygon
        points={`${ptA[0]},${ptA[1]} ${ptB[0]},${ptB[1]} ${apex[0]},${apex[1]}`}
        fill="none"
        stroke={C.shape}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d={`M${ptA[0]},${ptA[1] - 8} L${ptA[0] + 8},${ptA[1] - 8} L${ptA[0] + 8},${ptA[1]}`}
        fill="none"
        stroke={C.height}
        strokeWidth="1.4"
      />
      <line
        x1={ptA[0]}
        y1={ptA[1]}
        x2={Hx}
        y2={Hy}
        stroke={C.height}
        strokeWidth="1.5"
        strokeDasharray="5,3"
      />
      <Lbl x={80} y={121} text="c₂" color={C.diag} size={12} />
      <Lbl x={8} y={68} text="c₁" color={C.diag} size={12} anchor="middle" />
      <Lbl x={96} y={60} text="i" color={C.shape} />
      <Lbl x={26} y={82} text="h" color={C.height} size={12} />
      <RightAngleMark cx={Hx} cy={Hy} size={7} rotate={-34} />
    </svg>
  );
};

const SVGTriunghiEchilateral = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <polygon
      points="80,12 142,118 18,118"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <line
      x1="80"
      y1="12"
      x2="80"
      y2="118"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <RightAngleMark cx={80} cy={118} size={7} rotate={0} />
    <Lbl x={38} y={70} text="l" color={C.shape} />
    <Lbl x={122} y={70} text="l" color={C.shape} />
    <Lbl x={80} y={128} text="l" color={C.shape} />
    <Lbl x={88} y={65} text="h" color={C.height} size={12} />
  </svg>
);

const SVGPatrat = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <rect x="28" y="18" width="104" height="104" fill="none" stroke={C.shape} strokeWidth="2.5" />
    <line
      x1="28"
      y1="18"
      x2="132"
      y2="122"
      stroke={C.diag}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <Lbl x={10} y={70} text="l" color={C.shape} anchor="middle" />
    <Lbl x={80} y={128} text="l" color={C.shape} />
    <Lbl x={90} y={58} text="d" color={C.diag} size={12} />
  </svg>
);

const SVGDreptunghi = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <rect x="14" y="30" width="132" height="76" fill="none" stroke={C.shape} strokeWidth="2.5" />
    <line
      x1="14"
      y1="30"
      x2="146"
      y2="106"
      stroke={C.diag}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <Lbl x={6} y={68} text="l" color={C.shape} anchor="middle" />
    <Lbl x={80} y={118} text="L" color={C.shape} />
    <Lbl x={97} y={60} text="d" color={C.diag} size={12} />
  </svg>
);

const SVGParalelogram = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <polygon
      points="20,112 126,112 140,22 34,22"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <line
      x1="34"
      y1="22"
      x2="34"
      y2="112"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <RightAngleMark cx={34} cy={112} size={7} rotate={0} />
    <Lbl x={73} y={121} text="b" color={C.shape} />
    <Lbl x={9} y={68} text="a" color={C.shape} anchor="middle" />
    <Lbl x={43} y={68} text="h" color={C.height} size={12} />
    <AngleArc cx={20} cy={112} r={22} startDeg={-60} endDeg={0} />
    <Lbl x={40} y={104} text="u" color={C.angle} size={11} />
  </svg>
);

const SVGRomb = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <polygon
      points="80,10 150,65 80,120 10,65"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <line
      x1="80"
      y1="10"
      x2="80"
      y2="120"
      stroke={C.diag}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <line
      x1="10"
      y1="65"
      x2="150"
      y2="65"
      stroke={C.diag}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <path d="M80,65 L80,58 L87,58 L87,65" fill="none" stroke={C.height} strokeWidth="1.4" />
    <Lbl x={38} y={38} text="l" color={C.shape} />
    <Lbl x={89} y={92} text="d₁" color={C.diag} size={12} />
    <Lbl x={112} y={58} text="d₂" color={C.diag} size={12} />
    <AngleArc cx={150} cy={65} r={18} startDeg={145} endDeg={175} />
    <Lbl x={127} y={63} text="u" color={C.angle} size={11} />
  </svg>
);

const SVGTrapez = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <polygon
      points="16,112 144,112 112,26 44,26"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <line
      x1="44"
      y1="26"
      x2="44"
      y2="112"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="5,3"
    />
    <RightAngleMark cx={44} cy={112} size={7} rotate={0} />
    <line
      x1="30"
      y1="69"
      x2="128"
      y2="69"
      stroke={C.diag}
      strokeWidth="1.5"
      strokeDasharray="6,3"
    />
    <Lbl x={80} y={120} text="B" color={C.shape} />
    <Lbl x={78} y={19} text="b" color={C.shape} />
    <Lbl x={52} y={68} text="h" color={C.height} size={12} />
    <Lbl x={80} y={60} text="lₘ" color={C.diag} size={12} />
  </svg>
);

const SVGCerc = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <circle cx="80" cy="65" r="54" fill="none" stroke={C.shape} strokeWidth="2.5" />
    <line x1="80" y1="65" x2="134" y2="65" stroke={C.height} strokeWidth="1.8" />
    <circle cx="80" cy="65" r="3" fill={C.dot} />
    <Lbl x={80} y={58} text="O" color={C.text} size={12} />
    <Lbl x={108} y={57} text="R" color={C.height} />
  </svg>
);

const SVGSectorCircular = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <path
      d="M80,85 L14,61 A70,70 0 0,1 146,61 Z"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <line x1="80" y1="85" x2="14" y2="61" stroke={C.height} strokeWidth="1.6" />
    <line x1="80" y1="85" x2="146" y2="61" stroke={C.height} strokeWidth="1.6" />
    <circle cx="80" cy="85" r="3" fill={C.dot} />
    <AngleArc cx={80} cy={85} r={24} startDeg={-152} endDeg={-28} />
    <Lbl x={80} y={58} text="α" color={C.angle} size={13} />
    <Lbl x={38} y={80} text="R" color={C.height} size={12} />
    <Lbl x={80} y={18} text="l" color={C.shape} />
  </svg>
);

// ─── 3D Solid SVGs  (matching standard Romanian textbook style) ───────────────
// Convention: ABCD = bottom base, A'B'C'D' = top base; V = apex; O = centre
// Colors: blue = visible edges, gray-dashed = hidden, red = height/axis/radius

const SVGCub = () => {
  // Cabinet oblique projection: front face + depth goes upper-right
  // Side = 78, oblique offset dx=28, dy=-20
  // Bottom face: A(front-left) B(front-right) C(back-right,hidden) D(back-left,hidden)
  // Top face:    A'            B'             C'                    D'
  const vA = { x: 18, y: 118 };
  const vB = { x: 96, y: 118 };
  const vAp = { x: 18, y: 40 };
  const vBp = { x: 96, y: 40 };
  const vC = { x: 124, y: 98 }; // hidden
  const vCp = { x: 124, y: 20 };
  const vD = { x: 46, y: 98 }; // hidden
  const vDp = { x: 46, y: 20 };
  const SW = 2.2,
    SD = '5,3';
  const blue = { stroke: C.shape, strokeWidth: SW, fill: 'none' };
  const gray = { stroke: C.hidden, strokeWidth: 1.3, fill: 'none', strokeDasharray: SD };
  const red = { stroke: C.height, strokeWidth: 1.4, fill: 'none', strokeDasharray: SD };

  const pt = (v: { x: number; y: number }) => `${v.x},${v.y}`;

  return (
    <svg viewBox="0 0 155 135" width="155" height="135">
      {/* Hidden bottom edges */}
      <line x1={vA.x} y1={vA.y} x2={vD.x} y2={vD.y} {...gray} />
      <line x1={vD.x} y1={vD.y} x2={vC.x} y2={vC.y} {...gray} />
      <line x1={vD.x} y1={vD.y} x2={vDp.x} y2={vDp.y} {...gray} />

      {/* Space diagonals (red, behind faces — draw before solid edges) */}
      <line x1={vA.x} y1={vA.y} x2={vCp.x} y2={vCp.y} {...red} />
      <line x1={vB.x} y1={vB.y} x2={vDp.x} y2={vDp.y} {...red} />

      {/* Front face A-B-B'-A' */}
      <polygon
        points={`${pt(vA)} ${pt(vB)} ${pt(vBp)} ${pt(vAp)}`}
        fill="none"
        stroke={C.shape}
        strokeWidth={SW}
        strokeLinejoin="round"
      />

      {/* Right face: B-C-C'-B' */}
      <line x1={vB.x} y1={vB.y} x2={vC.x} y2={vC.y} {...blue} />
      <line x1={vC.x} y1={vC.y} x2={vCp.x} y2={vCp.y} {...blue} />
      <line x1={vCp.x} y1={vCp.y} x2={vBp.x} y2={vBp.y} {...blue} />

      {/* Top face: A'-B'-C'-D' (A'-D' and D'-C' missing from above) */}
      <line x1={vAp.x} y1={vAp.y} x2={vDp.x} y2={vDp.y} {...blue} />
      <line x1={vDp.x} y1={vDp.y} x2={vCp.x} y2={vCp.y} {...blue} />

      {/* Vertex labels */}
      <VLbl x={vA.x - 2} y={vA.y + 9} text="A" anchor="end" />
      <VLbl x={vB.x + 2} y={vB.y + 9} text="B" anchor="start" />
      <VLbl x={vAp.x - 3} y={vAp.y - 8} text="A′" anchor="end" />
      <VLbl x={vBp.x + 2} y={vBp.y - 8} text="B′" anchor="start" />
      <VLbl x={vCp.x + 3} y={vCp.y - 5} text="C′" anchor="start" />
      <VLbl x={vDp.x - 2} y={vDp.y - 5} text="D′" anchor="end" />
      <VLbl x={vC.x + 3} y={vC.y + 4} text="C" anchor="start" color={C.hidden} />
      <VLbl x={vD.x - 2} y={vD.y + 4} text="D" anchor="end" color={C.hidden} />

      {/* Side label */}
      <Lbl x={57} y={127} text="l" color={C.shape} size={12} />
      <Lbl x={6} y={79} text="l" color={C.shape} size={12} anchor="middle" />
    </svg>
  );
};

const SVGParalelipiped = () => {
  // Width a=84, height h=68, depth b oblique dx=28, dy=-20
  const vA = { x: 12, y: 120 };
  const vB = { x: 96, y: 120 };
  const vAp = { x: 12, y: 52 };
  const vBp = { x: 96, y: 52 };
  const vC = { x: 124, y: 100 }; // hidden
  const vCp = { x: 124, y: 32 };
  const vD = { x: 40, y: 100 }; // hidden
  const vDp = { x: 40, y: 32 };
  const SW = 2.1,
    SD = '5,3';
  const blue = { stroke: C.shape, strokeWidth: SW, fill: 'none' };
  const gray = { stroke: C.hidden, strokeWidth: 1.3, fill: 'none', strokeDasharray: SD };
  const red = { stroke: C.height, strokeWidth: 1.4, fill: 'none', strokeDasharray: SD };

  const pt = (v: { x: number; y: number }) => `${v.x},${v.y}`;

  return (
    <svg viewBox="0 0 155 138" width="155" height="138">
      {/* Hidden */}
      <line x1={vA.x} y1={vA.y} x2={vD.x} y2={vD.y} {...gray} />
      <line x1={vD.x} y1={vD.y} x2={vC.x} y2={vC.y} {...gray} />
      <line x1={vD.x} y1={vD.y} x2={vDp.x} y2={vDp.y} {...gray} />

      {/* Space diagonal (red) */}
      <line x1={vA.x} y1={vA.y} x2={vCp.x} y2={vCp.y} {...red} />

      {/* Front face */}
      <polygon
        points={`${pt(vA)} ${pt(vB)} ${pt(vBp)} ${pt(vAp)}`}
        fill="none"
        stroke={C.shape}
        strokeWidth={SW}
        strokeLinejoin="round"
      />

      {/* Right face */}
      <line x1={vB.x} y1={vB.y} x2={vC.x} y2={vC.y} {...blue} />
      <line x1={vC.x} y1={vC.y} x2={vCp.x} y2={vCp.y} {...blue} />
      <line x1={vCp.x} y1={vCp.y} x2={vBp.x} y2={vBp.y} {...blue} />

      {/* Top face remaining edges */}
      <line x1={vAp.x} y1={vAp.y} x2={vDp.x} y2={vDp.y} {...blue} />
      <line x1={vDp.x} y1={vDp.y} x2={vCp.x} y2={vCp.y} {...blue} />

      {/* Vertex labels */}
      <VLbl x={vA.x - 2} y={vA.y + 9} text="A" anchor="end" />
      <VLbl x={vB.x + 2} y={vB.y + 9} text="B" anchor="start" />
      <VLbl x={vAp.x - 3} y={vAp.y - 7} text="A′" anchor="end" />
      <VLbl x={vBp.x + 2} y={vBp.y - 7} text="B′" anchor="start" />
      <VLbl x={vCp.x + 3} y={vCp.y - 5} text="C′" anchor="start" />
      <VLbl x={vDp.x - 2} y={vDp.y - 5} text="D′" anchor="end" />
      <VLbl x={vC.x + 3} y={vC.y + 4} text="C" anchor="start" color={C.hidden} />
      <VLbl x={vD.x - 2} y={vD.y + 4} text="D" anchor="end" color={C.hidden} />

      {/* Dimension labels */}
      <Lbl x={54} y={130} text="a" color={C.shape} size={12} />
      <Lbl x={4} y={86} text="b" color={C.shape} size={12} anchor="middle" />
      <Lbl x={112} y={76} text="h" color={C.height} size={12} />
      <Lbl x={74} y={70} text="dp" color={C.height} size={10} />
    </svg>
  );
};

const SVGPrisma = () => {
  // Right triangular prism
  // Front triangle: A(18,118) B(108,118) C(63,34)
  // Back triangle (offset +30,-22): A'(48,96) B'(138,96) C'(93,12)
  const vA = { x: 18, y: 118 };
  const vB = { x: 108, y: 118 };
  const vC = { x: 63, y: 34 };
  const vAp = { x: 48, y: 96 }; // hidden
  const vBp = { x: 138, y: 96 };
  const vCp = { x: 93, y: 12 };
  const SW = 2.1,
    SD = '5,3';
  const blue = { stroke: C.shape, strokeWidth: SW, fill: 'none' };
  const gray = { stroke: C.hidden, strokeWidth: 1.3, fill: 'none', strokeDasharray: SD };

  return (
    <svg viewBox="0 0 158 132" width="158" height="132">
      {/* Hidden back triangle and hidden lateral edge */}
      <polygon
        points={`${vAp.x},${vAp.y} ${vBp.x},${vBp.y} ${vCp.x},${vCp.y}`}
        fill="none"
        stroke={C.hidden}
        strokeWidth={1.3}
        strokeDasharray={SD}
        strokeLinejoin="round"
      />
      <line x1={vA.x} y1={vA.y} x2={vAp.x} y2={vAp.y} {...gray} />

      {/* Front triangle */}
      <polygon
        points={`${vA.x},${vA.y} ${vB.x},${vB.y} ${vC.x},${vC.y}`}
        fill="none"
        stroke={C.shape}
        strokeWidth={SW}
        strokeLinejoin="round"
      />

      {/* Visible lateral edges */}
      <line x1={vB.x} y1={vB.y} x2={vBp.x} y2={vBp.y} {...blue} />
      <line x1={vC.x} y1={vC.y} x2={vCp.x} y2={vCp.y} {...blue} />

      {/* Height line (red dashed) */}
      <line
        x1={63}
        y1={118}
        x2={63}
        y2={34}
        stroke={C.height}
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />
      <RightAngleMark cx={63} cy={118} size={6} rotate={0} />

      {/* Vertex labels */}
      <VLbl x={vA.x - 3} y={vA.y + 9} text="A" anchor="end" />
      <VLbl x={vB.x + 3} y={vB.y + 9} text="B" anchor="start" />
      <VLbl x={vC.x} y={vC.y - 8} text="C" />
      <VLbl x={vAp.x - 2} y={vAp.y - 6} text="A′" anchor="end" color={C.hidden} />
      <VLbl x={vBp.x + 3} y={vBp.y - 6} text="B′" anchor="start" />
      <VLbl x={vCp.x + 3} y={vCp.y - 6} text="C′" anchor="start" />

      {/* Dimension labels */}
      <Lbl x={63} y={128} text="Ab" color={C.shape} size={11} />
      <Lbl x={74} y={76} text="h" color={C.height} size={12} />
    </svg>
  );
};

const SVGPiramida = () => {
  // Square pyramid: base ABCD (parallelogram in projection), apex V, centre O, midpoint M
  const vA = { x: 16, y: 120 }; // front-left base
  const vB = { x: 110, y: 120 }; // front-right base
  const vC_ = { x: 130, y: 94 }; // back-right base (hidden)
  const vD = { x: 36, y: 94 }; // back-left base (hidden)
  const vV = { x: 73, y: 14 }; // apex
  // Centre of base (intersection of diagonals)
  const oX = (vA.x + vC_.x) / 2; // ≈ 73
  const oY = (vA.y + vC_.y) / 2; // ≈ 107
  // Midpoint of front base edge AB
  const mX = (vA.x + vB.x) / 2; // ≈ 63
  const mY = vA.y; // 120
  const SD = '5,3';
  const gray = { stroke: C.hidden, strokeWidth: 1.3, fill: 'none', strokeDasharray: SD };

  return (
    <svg viewBox="0 0 158 138" width="158" height="138">
      {/* Hidden base diagonals */}
      <line x1={vA.x} y1={vA.y} x2={vC_.x} y2={vC_.y} {...gray} />
      <line x1={vB.x} y1={vB.y} x2={vD.x} y2={vD.y} {...gray} />

      {/* Hidden base back edges */}
      <line x1={vA.x} y1={vA.y} x2={vD.x} y2={vD.y} {...gray} />
      <line x1={vD.x} y1={vD.y} x2={vC_.x} y2={vC_.y} {...gray} />

      {/* Hidden lateral edge V-D */}
      <line x1={vV.x} y1={vV.y} x2={vD.x} y2={vD.y} {...gray} />

      {/* Height V→O (red dashed) */}
      <line
        x1={vV.x}
        y1={vV.y}
        x2={oX}
        y2={oY}
        stroke={C.height}
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />

      {/* Apothem O→M (red dashed) */}
      <line
        x1={oX}
        y1={oY}
        x2={mX}
        y2={mY}
        stroke={C.height}
        strokeWidth={1.3}
        strokeDasharray="4,3"
      />

      {/* Visible base edges */}
      <line x1={vA.x} y1={vA.y} x2={vB.x} y2={vB.y} stroke={C.shape} strokeWidth={2.2} />
      <line x1={vB.x} y1={vB.y} x2={vC_.x} y2={vC_.y} stroke={C.shape} strokeWidth={2.2} />

      {/* Visible lateral edges V-A, V-B, V-C */}
      <line x1={vV.x} y1={vV.y} x2={vA.x} y2={vA.y} stroke={C.shape} strokeWidth={2.2} />
      <line x1={vV.x} y1={vV.y} x2={vB.x} y2={vB.y} stroke={C.shape} strokeWidth={2.2} />
      <line x1={vV.x} y1={vV.y} x2={vC_.x} y2={vC_.y} stroke={C.shape} strokeWidth={2.2} />

      {/* Centre dot O */}
      <circle cx={oX} cy={oY} r={3} fill={C.dot} />

      {/* Vertex labels */}
      <VLbl x={vV.x} y={vV.y - 8} text="V" />
      <VLbl x={vA.x - 3} y={vA.y + 9} text="A" anchor="end" />
      <VLbl x={vB.x + 3} y={vB.y + 9} text="B" anchor="start" />
      <VLbl x={vC_.x + 3} y={vC_.y + 2} text="C" anchor="start" color={C.hidden} />
      <VLbl x={vD.x - 3} y={vD.y - 6} text="D" anchor="end" color={C.hidden} />
      <VLbl x={oX - 8} y={oY - 2} text="O" anchor="end" />
      <VLbl x={mX} y={mY + 9} text="M" />

      {/* Dimension labels */}
      <Lbl x={88} y={62} text="h" color={C.height} size={12} />
      <Lbl x={54} y={116} text="ap" color={C.height} size={10} />
    </svg>
  );
};

const SVGSfera = () => {
  const cx = 80,
    cy = 72,
    r = 54;
  const Ax = cx - r,
    Bx = cx + r;
  // Equator minor radius ≈ 0.28 of major
  const ry = Math.round(r * 0.28);
  return (
    <svg viewBox="0 0 160 140" width="160" height="140">
      {/* Back half of equator (dashed) */}
      <path
        d={`M${Ax},${cy} A${r},${ry} 0 0 1 ${Bx},${cy}`}
        fill="none"
        stroke={C.hidden}
        strokeWidth={1.5}
        strokeDasharray="5,3"
      />
      {/* Main circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.shape} strokeWidth={2.4} />
      {/* Front half of equator */}
      <path
        d={`M${Ax},${cy} A${r},${ry} 0 0 0 ${Bx},${cy}`}
        fill="none"
        stroke={C.shape}
        strokeWidth={1.8}
      />
      {/* Diameter A–O–B (red dashed) */}
      <line
        x1={Ax}
        y1={cy}
        x2={Bx}
        y2={cy}
        stroke={C.height}
        strokeWidth={1.6}
        strokeDasharray="4,3"
      />
      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={3} fill={C.dot} />
      {/* Labels */}
      <VLbl x={Ax - 5} y={cy} text="A" anchor="end" />
      <VLbl x={cx} y={cy - 10} text="O" />
      <VLbl x={Bx + 5} y={cy} text="B" anchor="start" />
      <Lbl x={cx + 28} y={cy - 10} text="R" color={C.height} size={12} />
    </svg>
  );
};

const SVGCilindru = () => {
  const cx = 80,
    rx = 50,
    ry = 13;
  const topY = 28,
    botY = 118;
  return (
    <svg viewBox="0 0 160 140" width="160" height="140">
      {/* Back half of bottom ellipse (dashed) */}
      <path
        d={`M${cx - rx},${botY} A${rx},${ry} 0 0 1 ${cx + rx},${botY}`}
        fill="none"
        stroke={C.hidden}
        strokeWidth={1.3}
        strokeDasharray="5,3"
      />

      {/* Lateral sides */}
      <line x1={cx - rx} y1={topY} x2={cx - rx} y2={botY} stroke={C.shape} strokeWidth={2.2} />
      <line x1={cx + rx} y1={topY} x2={cx + rx} y2={botY} stroke={C.shape} strokeWidth={2.2} />

      {/* Top ellipse (fully visible) */}
      <ellipse cx={cx} cy={topY} rx={rx} ry={ry} fill="none" stroke={C.shape} strokeWidth={2.2} />

      {/* Front half of bottom ellipse */}
      <path
        d={`M${cx - rx},${botY} A${rx},${ry} 0 0 0 ${cx + rx},${botY}`}
        fill="none"
        stroke={C.shape}
        strokeWidth={2.2}
      />

      {/* Axis O'–O (red dashed) */}
      <line
        x1={cx}
        y1={topY}
        x2={cx}
        y2={botY}
        stroke={C.height}
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />

      {/* Radius O'–B' (red solid) */}
      <line x1={cx} y1={topY} x2={cx + rx} y2={topY} stroke={C.height} strokeWidth={1.7} />

      {/* Centre dots */}
      <circle cx={cx} cy={topY} r={3} fill={C.dot} />
      <circle cx={cx} cy={botY} r={3} fill={C.dot} />

      {/* Top labels */}
      <VLbl x={cx - rx - 3} y={topY} text="A′" anchor="end" size={10} />
      <VLbl x={cx} y={topY - 12} text="O′" size={10} />
      <VLbl x={cx + rx + 3} y={topY} text="B′" anchor="start" size={10} />

      {/* Bottom labels */}
      <VLbl x={cx - rx - 3} y={botY + 2} text="A" anchor="end" size={10} />
      <VLbl x={cx} y={botY + 13} text="O" size={10} />
      <VLbl x={cx + rx + 3} y={botY + 2} text="B" anchor="start" size={10} />

      {/* Dimension labels */}
      <Lbl x={cx + 26} y={topY - 7} text="R" color={C.height} size={11} />
      <Lbl x={cx + rx + 13} y={(topY + botY) / 2} text="h" color={C.height} size={12} />
    </svg>
  );
};

const SVGCon = () => {
  const cx = 80,
    rx = 52,
    ry = 14;
  const topY = 14,
    botY = 116;
  return (
    <svg viewBox="0 0 160 140" width="160" height="140">
      {/* Back half of base ellipse (dashed) */}
      <path
        d={`M${cx - rx},${botY} A${rx},${ry} 0 0 1 ${cx + rx},${botY}`}
        fill="none"
        stroke={C.hidden}
        strokeWidth={1.3}
        strokeDasharray="5,3"
      />

      {/* Lateral sides */}
      <line x1={cx} y1={topY} x2={cx - rx} y2={botY} stroke={C.shape} strokeWidth={2.3} />
      <line x1={cx} y1={topY} x2={cx + rx} y2={botY} stroke={C.shape} strokeWidth={2.3} />

      {/* Front half of base ellipse */}
      <path
        d={`M${cx - rx},${botY} A${rx},${ry} 0 0 0 ${cx + rx},${botY}`}
        fill="none"
        stroke={C.shape}
        strokeWidth={2.3}
      />

      {/* Axis V–O (red dashed) */}
      <line
        x1={cx}
        y1={topY}
        x2={cx}
        y2={botY}
        stroke={C.height}
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />

      {/* Radius O–B (red solid) */}
      <line x1={cx} y1={botY} x2={cx + rx} y2={botY} stroke={C.height} strokeWidth={1.6} />

      {/* Centre dot */}
      <circle cx={cx} cy={botY} r={3} fill={C.dot} />

      {/* Labels */}
      <VLbl x={cx} y={topY - 8} text="V" size={11} />
      <VLbl x={cx - rx - 4} y={botY} text="A" anchor="end" size={10} />
      <VLbl x={cx} y={botY + 12} text="O" size={10} />
      <VLbl x={cx + rx + 4} y={botY} text="B" anchor="start" size={10} />

      {/* Dimension labels */}
      <Lbl x={cx + 11} y={(topY + botY) / 2} text="h" color={C.height} size={12} />
      <Lbl x={cx + rx / 2 + 4} y={botY - 6} text="R" color={C.height} size={11} />
      <Lbl x={cx + rx / 2 + 16} y={(topY + botY) / 2 - 8} text="G" color={C.shape} size={12} />
    </svg>
  );
};

const SVGTrunchiDeCon = () => {
  const cx = 80;
  const botY = 118,
    topY = 40;
  const botRx = 52,
    botRy = 14;
  const topRx = 26,
    topRy = 8;
  return (
    <svg viewBox="0 0 160 140" width="160" height="140">
      {/* Back half of bottom ellipse (dashed) */}
      <path
        d={`M${cx - botRx},${botY} A${botRx},${botRy} 0 0 1 ${cx + botRx},${botY}`}
        fill="none"
        stroke={C.hidden}
        strokeWidth={1.3}
        strokeDasharray="5,3"
      />

      {/* Lateral sides */}
      <line
        x1={cx - botRx}
        y1={botY}
        x2={cx - topRx}
        y2={topY}
        stroke={C.shape}
        strokeWidth={2.3}
      />
      <line
        x1={cx + botRx}
        y1={botY}
        x2={cx + topRx}
        y2={topY}
        stroke={C.shape}
        strokeWidth={2.3}
      />

      {/* Top ellipse (fully visible) */}
      <ellipse
        cx={cx}
        cy={topY}
        rx={topRx}
        ry={topRy}
        fill="none"
        stroke={C.shape}
        strokeWidth={2.3}
      />

      {/* Front half of bottom ellipse */}
      <path
        d={`M${cx - botRx},${botY} A${botRx},${botRy} 0 0 0 ${cx + botRx},${botY}`}
        fill="none"
        stroke={C.shape}
        strokeWidth={2.3}
      />

      {/* Axis O'–O (red dashed) */}
      <line
        x1={cx}
        y1={topY}
        x2={cx}
        y2={botY}
        stroke={C.height}
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />

      {/* Radii: top O'–B' and bottom O–B */}
      <line x1={cx} y1={topY} x2={cx + topRx} y2={topY} stroke={C.height} strokeWidth={1.6} />
      <line x1={cx} y1={botY} x2={cx + botRx} y2={botY} stroke={C.height} strokeWidth={1.6} />

      {/* Centre dots */}
      <circle cx={cx} cy={topY} r={2.5} fill={C.dot} />
      <circle cx={cx} cy={botY} r={2.5} fill={C.dot} />

      {/* Top labels */}
      <VLbl x={cx - topRx - 3} y={topY} text="A′" anchor="end" size={10} />
      <VLbl x={cx} y={topY - 12} text="O′" size={10} />
      <VLbl x={cx + topRx + 3} y={topY} text="B′" anchor="start" size={10} />

      {/* Bottom labels */}
      <VLbl x={cx - botRx - 4} y={botY} text="A" anchor="end" size={10} />
      <VLbl x={cx} y={botY + 13} text="O" size={10} />
      <VLbl x={cx + botRx + 4} y={botY} text="B" anchor="start" size={10} />

      {/* Dimension labels */}
      <Lbl x={cx + topRx / 2 + 6} y={topY - 6} text="r" color={C.height} size={11} />
      <Lbl x={cx + botRx / 2 + 4} y={botY - 7} text="R" color={C.height} size={11} />
      <Lbl x={cx + 10} y={(topY + botY) / 2} text="h" color={C.height} size={12} />
      <Lbl
        x={cx + botRx / 2 + topRx / 2 + 14}
        y={(topY + botY) / 2 + 4}
        text="G"
        color={C.shape}
        size={11}
      />
    </svg>
  );
};

// ─── Figure data ──────────────────────────────────────────────────────────────

interface FigureData {
  id: string;
  name: string;
  accent: string;
  svg: React.ReactElement;
  formulas: { label: string; expr: string }[];
}

const FIGURES_2D: FigureData[] = [
  {
    id: 'triunghi',
    name: 'Triunghi',
    accent: '#2563eb',
    svg: <SVGTriunghi />,
    formulas: [
      { label: 'A', expr: 'b · h / 2' },
      { label: 'A', expr: 'b · c · sin u / 2' },
      { label: 'P', expr: 'a + b + c' },
    ],
  },
  {
    id: 'triunghi-dr',
    name: 'Triunghi dreptunghic',
    accent: '#1d4ed8',
    svg: <SVGTriunghiDreptunghic />,
    formulas: [
      { label: 'A', expr: 'c₁ · c₂ / 2' },
      { label: 'A', expr: 'i · h / 2' },
      { label: 'i²', expr: 'c₁² + c₂²  (Pitagora)' },
    ],
  },
  {
    id: 'triunghi-ech',
    name: 'Triunghi echilateral',
    accent: '#7c3aed',
    svg: <SVGTriunghiEchilateral />,
    formulas: [
      { label: 'A', expr: 'l² · √3 / 4' },
      { label: 'P', expr: '3l' },
      { label: 'h', expr: 'l · √3 / 2' },
    ],
  },
  {
    id: 'patrat',
    name: 'Pătrat',
    accent: '#0891b2',
    svg: <SVGPatrat />,
    formulas: [
      { label: 'A', expr: 'l²' },
      { label: 'P', expr: '4l' },
      { label: 'd', expr: 'l · √2' },
    ],
  },
  {
    id: 'dreptunghi',
    name: 'Dreptunghi',
    accent: '#0891b2',
    svg: <SVGDreptunghi />,
    formulas: [
      { label: 'A', expr: 'l · L' },
      { label: 'P', expr: '2(l + L)' },
      { label: 'd', expr: '√(l² + L²)' },
    ],
  },
  {
    id: 'paralelogram',
    name: 'Paralelogram',
    accent: '#059669',
    svg: <SVGParalelogram />,
    formulas: [
      { label: 'A', expr: 'b · h' },
      { label: 'A', expr: 'a · b · sin u' },
      { label: 'P', expr: '2(a + b)' },
    ],
  },
  {
    id: 'romb',
    name: 'Romb',
    accent: '#d97706',
    svg: <SVGRomb />,
    formulas: [
      { label: 'A', expr: 'd₁ · d₂ / 2' },
      { label: 'A', expr: 'l² · sin u' },
      { label: 'P', expr: '4l' },
    ],
  },
  {
    id: 'trapez',
    name: 'Trapez',
    accent: '#dc2626',
    svg: <SVGTrapez />,
    formulas: [
      { label: 'A', expr: '(B + b) · h / 2' },
      { label: 'A', expr: 'lₘ · h' },
      { label: 'lₘ', expr: '(B + b) / 2' },
    ],
  },
  {
    id: 'cerc',
    name: 'Cerc',
    accent: '#6d28d9',
    svg: <SVGCerc />,
    formulas: [
      { label: 'A', expr: 'π · R²' },
      { label: 'L', expr: '2 · π · R' },
      { label: 'd', expr: '2R' },
    ],
  },
  {
    id: 'sector',
    name: 'Sector circular',
    accent: '#6d28d9',
    svg: <SVGSectorCircular />,
    formulas: [
      { label: 'A', expr: 'π · R² · α / 360°' },
      { label: 'l', expr: 'π · R · α / 180°' },
    ],
  },
];

const FIGURES_3D: FigureData[] = [
  {
    id: 'cub',
    name: 'Cub',
    accent: '#1e40af',
    svg: <SVGCub />,
    formulas: [
      { label: 'Al', expr: '6l²' },
      { label: 'V', expr: 'l³' },
      { label: 'd', expr: 'l · √3' },
    ],
  },
  {
    id: 'paralelipiped',
    name: 'Paralelipipedul dreptunghic',
    accent: '#1e40af',
    svg: <SVGParalelipiped />,
    formulas: [
      { label: 'Al', expr: '2(ab + bh + ah)' },
      { label: 'V', expr: 'a · b · h' },
      { label: 'dp', expr: '√(a² + b² + h²)' },
    ],
  },
  {
    id: 'prisma',
    name: 'Prismă dreaptă',
    accent: '#6d28d9',
    svg: <SVGPrisma />,
    formulas: [
      { label: 'Al', expr: 'Pb · h' },
      { label: 'At', expr: 'Al + 2Ab' },
      { label: 'V', expr: 'Ab · h' },
    ],
  },
  {
    id: 'piramida',
    name: 'Piramidă regulată',
    accent: '#7c3aed',
    svg: <SVGPiramida />,
    formulas: [
      { label: 'Al', expr: 'Pb · ap / 2' },
      { label: 'At', expr: 'Al + Ab' },
      { label: 'V', expr: 'Ab · h / 3' },
    ],
  },
  {
    id: 'sfera',
    name: 'Sferă',
    accent: '#0f766e',
    svg: <SVGSfera />,
    formulas: [
      { label: 'A', expr: '4 · π · R²' },
      { label: 'V', expr: '4 · π · R³ / 3' },
    ],
  },
  {
    id: 'cilindru',
    name: 'Cilindru',
    accent: '#0891b2',
    svg: <SVGCilindru />,
    formulas: [
      { label: 'Al', expr: '2 · π · R · h' },
      { label: 'At', expr: '2 · π · R · (R + h)' },
      { label: 'V', expr: 'π · R² · h' },
    ],
  },
  {
    id: 'con',
    name: 'Con',
    accent: '#059669',
    svg: <SVGCon />,
    formulas: [
      { label: 'Al', expr: 'π · R · G' },
      { label: 'At', expr: 'π · R · (R + G)' },
      { label: 'V', expr: 'π · R² · h / 3' },
    ],
  },
  {
    id: 'trunchi-con',
    name: 'Trunchi de con',
    accent: '#d97706',
    svg: <SVGTrunchiDeCon />,
    formulas: [
      { label: 'Al', expr: 'π · (R + r) · G' },
      { label: 'At', expr: 'Al + π·R² + π·r²' },
      { label: 'V', expr: 'π·h·(R² + r² + Rr) / 3' },
    ],
  },
];

// ─── Card ─────────────────────────────────────────────────────────────────────

function FigureCard({ fig }: { fig: FigureData }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.09)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          background: fig.accent,
          color: '#fff',
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.01em',
        }}
      >
        {fig.name}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '12px 8px 4px',
          background: '#fafafa',
          flexShrink: 0,
        }}
      >
        {fig.svg}
      </div>

      <div
        style={{
          padding: '10px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          flexGrow: 1,
        }}
      >
        {fig.formulas.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Georgia, serif',
              fontSize: 13.5,
              color: '#1e293b',
              lineHeight: 1.4,
            }}
          >
            <span
              style={{
                fontStyle: 'italic',
                color: fig.accent,
                minWidth: 26,
                textAlign: 'right',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {f.label}
            </span>
            <span style={{ color: '#64748b', flexShrink: 0 }}>=</span>
            <span>{f.expr}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GeometriePage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'2d' | '3d'>('2d');
  const figures = tab === '2d' ? FIGURES_2D : FIGURES_3D;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1e293b',
          color: '#fff',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 22,
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: 6,
          }}
        >
          ←
        </button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Figuri geometrice</span>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
          {(['2d', '3d'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 16px',
                borderRadius: 20,
                border: 'none',
                background: tab === t ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: tab === t ? 700 : 400,
                fontSize: 13,
              }}
            >
              {t === '2d' ? 'Figuri plane' : 'Corpuri geometrice'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          alignContent: 'start',
        }}
      >
        {figures.map((fig) => (
          <FigureCard key={fig.id} fig={fig} />
        ))}
      </div>
    </div>
  );
}

/**
 * GeometriePage — vizualizare figuri geometrice cu notații standard și formule.
 * Două secțiuni: Figuri plane (arii & perimetre) și Corpuri geometrice (arii & volume).
 * SVG-urile sunt desenate manual cu culori distincte pentru fiecare element.
 */

import React, { useState } from 'react';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  shape: '#1e40af', // deep-blue  — shape outline
  height: '#dc2626', // red        — heights / altitudes
  diag: '#16a34a', // green      — diagonals / midlines
  angle: '#d97706', // amber      — angle arcs + labels
  hidden: '#94a3b8', // slate-gray — dashed hidden / construction lines
  dot: '#dc2626', // red dot    — centres, vertices
  text: '#0f172a', // near-black — dimension labels
};

// ─── Tiny SVG helpers ─────────────────────────────────────────────────────────

/** Small square in the corner of two perpendicular lines = right-angle mark */
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
  const rot = (dx: number, dy: number) => [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
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

/** Dimension label in italic serif */
function Lbl({
  x,
  y,
  text,
  color = C.text,
  size = 13,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  size?: number;
  anchor?: string;
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
    {/* Triangle: A(14,115) B(146,115) C(95,18) */}
    <polygon
      points="14,115 146,115 95,18"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Height from C(95,18) to base AB, foot H(95,115) */}
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
    {/* Labels */}
    <Lbl x={46} y={72} text="a" color={C.shape} />
    <Lbl x={124} y={72} text="c" color={C.shape} />
    <Lbl x={80} y={127} text="b" color={C.shape} />
    <Lbl x={104} y={72} text="h" color={C.height} size={12} />
    {/* Angle u at vertex B */}
    <AngleArc cx={146} cy={115} r={20} startDeg={155} endDeg={180} />
    <Lbl x={121} y={112} text="u" color={C.angle} size={11} />
  </svg>
);

const SVGTriunghiDreptunghic = () => {
  // A(18,112) = right angle, B(142,112) = right along base, C(18,20) = top
  const A = [18, 112],
    B = [142, 112],
    C = [18, 20];
  // Foot of altitude from A onto hypotenuse BC:
  const [bx, by] = B,
    [cx, cy] = C;
  const dx = cx - bx,
    dy = cy - by;
  const len2 = dx * dx + dy * dy;
  const t = ((A[0] - bx) * dx + (A[1] - by) * dy) / len2;
  const Hx = bx + t * dx,
    Hy = by + t * dy; // foot ≈ (59, 50)
  return (
    <svg viewBox="0 0 160 130" width="160" height="130">
      {/* Triangle */}
      <polygon
        points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}`}
        fill="none"
        stroke={C.shape}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Right angle at A */}
      <path
        d={`M${A[0]},${A[1] - 8} L${A[0] + 8},${A[1] - 8} L${A[0] + 8},${A[1]}`}
        fill="none"
        stroke={C.height}
        strokeWidth="1.4"
      />
      {/* Altitude from A to hypotenuse */}
      <line
        x1={A[0]}
        y1={A[1]}
        x2={Hx}
        y2={Hy}
        stroke={C.height}
        strokeWidth="1.5"
        strokeDasharray="5,3"
      />
      {/* Labels */}
      <Lbl x={80} y={121} text="c₂" color={C.diag} size={12} />
      <Lbl x={8} y={68} text="c₁" color={C.diag} size={12} anchor="middle" />
      <Lbl x={96} y={60} text="i" color={C.shape} />
      <Lbl x={26} y={82} text="h" color={C.height} size={12} />
      {/* Right angle mark at foot H */}
      <RightAngleMark cx={Hx} cy={Hy} size={7} rotate={-34} />
    </svg>
  );
};

const SVGTriunghiEchilateral = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    {/* A(80,12) B(142,118) C(18,118) */}
    <polygon
      points="80,12 142,118 18,118"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Height */}
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
    {/* Diagonal (optional, dashed) */}
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
    {/* Diagonal */}
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
    {/* Parallelogram: A(20,112) B(126,112) C(140,22) D(34,22) */}
    <polygon
      points="20,112 126,112 140,22 34,22"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Height from D(34,22) to AB: foot H(34,112) */}
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
    {/* Labels */}
    <Lbl x={73} y={121} text="b" color={C.shape} />
    <Lbl x={9} y={68} text="a" color={C.shape} anchor="middle" />
    <Lbl x={43} y={68} text="h" color={C.height} size={12} />
    {/* Angle u */}
    <AngleArc cx={20} cy={112} r={22} startDeg={-60} endDeg={0} />
    <Lbl x={40} y={104} text="u" color={C.angle} size={11} />
  </svg>
);

const SVGRomb = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    {/* Diamond: A(80,10) B(150,65) C(80,120) D(10,65) */}
    <polygon
      points="80,10 150,65 80,120 10,65"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Diagonals */}
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
    {/* Right angle at centre */}
    <path d="M80,65 L80,58 L87,58 L87,65" fill="none" stroke={C.height} strokeWidth="1.4" />
    {/* Labels */}
    <Lbl x={38} y={38} text="l" color={C.shape} />
    <Lbl x={89} y={92} text="d₁" color={C.diag} size={12} />
    <Lbl x={112} y={58} text="d₂" color={C.diag} size={12} />
    {/* Angle */}
    <AngleArc cx={150} cy={65} r={18} startDeg={145} endDeg={175} />
    <Lbl x={127} y={63} text="u" color={C.angle} size={11} />
  </svg>
);

const SVGTrapez = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    {/* Trapezoid: A(16,112) B(144,112) C(112,26) D(44,26) */}
    <polygon
      points="16,112 144,112 112,26 44,26"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Height */}
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
    {/* Midline */}
    <line
      x1="30"
      y1="69"
      x2="128"
      y2="69"
      stroke={C.diag}
      strokeWidth="1.5"
      strokeDasharray="6,3"
    />
    {/* Labels */}
    <Lbl x={80} y={120} text="B" color={C.shape} />
    <Lbl x={78} y={19} text="b" color={C.shape} />
    <Lbl x={52} y={68} text="h" color={C.height} size={12} />
    <Lbl x={80} y={60} text="lₘ" color={C.diag} size={12} />
  </svg>
);

const SVGCerc = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    <circle cx="80" cy="65" r="54" fill="none" stroke={C.shape} strokeWidth="2.5" />
    {/* Radius */}
    <line x1="80" y1="65" x2="134" y2="65" stroke={C.height} strokeWidth="1.8" />
    {/* Centre dot */}
    <circle cx="80" cy="65" r="3" fill={C.dot} />
    <Lbl x={80} y={58} text="O" color={C.text} size={12} />
    <Lbl x={108} y={57} text="R" color={C.height} />
    {/* Circumference arrow hint */}
    <path d="M80,11 A54,54 0 0,1 126,97" fill="none" stroke={C.shape} strokeWidth="0" />
  </svg>
);

const SVGSectorCircular = () => (
  <svg viewBox="0 0 160 130" width="160" height="130">
    {/* Sector: centre O(80,85), radius 70, from 200° to 340° */}
    <path
      d="M80,85 L14,61 A70,70 0 0,1 146,61 Z"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Arc label l */}
    <path d="M14,61 A70,70 0 0,1 146,61" fill="none" stroke={C.shape} strokeWidth="0" />
    {/* Radii */}
    <line x1="80" y1="85" x2="14" y2="61" stroke={C.height} strokeWidth="1.6" />
    <line x1="80" y1="85" x2="146" y2="61" stroke={C.height} strokeWidth="1.6" />
    <circle cx="80" cy="85" r="3" fill={C.dot} />
    {/* Angle arc */}
    <AngleArc cx={80} cy={85} r={24} startDeg={-152} endDeg={-28} />
    <Lbl x={80} y={58} text="α" color={C.angle} size={13} />
    <Lbl x={38} y={80} text="R" color={C.height} size={12} />
    {/* Arc label */}
    <Lbl x={80} y={18} text="l" color={C.shape} />
  </svg>
);

// ─── 3D Solid SVGs ────────────────────────────────────────────────────────────

const SVGCub = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Front face: A(20,110) B(100,110) C(100,40) D(20,40) */}
    <rect x="20" y="40" width="80" height="70" fill="none" stroke={C.shape} strokeWidth="2.2" />
    {/* Top parallelogram: D(20,40) D'(50,16) C'(130,16) C(100,40) */}
    <polygon
      points="20,40 50,16 130,16 100,40"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Right face: B(100,110) B'(130,86) C'(130,16) C(100,40) */}
    <polygon
      points="100,110 130,86 130,16 100,40"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Hidden edges dashed */}
    <line
      x1="20"
      y1="110"
      x2="50"
      y2="86"
      stroke={C.hidden}
      strokeWidth="1.4"
      strokeDasharray="5,3"
    />
    <line
      x1="50"
      y1="86"
      x2="130"
      y2="86"
      stroke={C.hidden}
      strokeWidth="1.4"
      strokeDasharray="5,3"
    />
    <line
      x1="50"
      y1="86"
      x2="50"
      y2="16"
      stroke={C.hidden}
      strokeWidth="1.4"
      strokeDasharray="5,3"
    />
    {/* Labels */}
    <Lbl x={60} y={118} text="l" color={C.shape} size={13} />
    <Lbl x={8} y={75} text="l" color={C.shape} size={13} anchor="middle" />
    <Lbl x={115} y={62} text="l" color={C.shape} size={13} />
    {/* Diagonal */}
    <line
      x1="20"
      y1="110"
      x2="130"
      y2="16"
      stroke={C.diag}
      strokeWidth="1.2"
      strokeDasharray="4,3"
    />
    <Lbl x={80} y={68} text="d" color={C.diag} size={11} />
  </svg>
);

const SVGParalelipiped = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Front face */}
    <rect x="16" y="50" width="90" height="75" fill="none" stroke={C.shape} strokeWidth="2.2" />
    {/* Top face */}
    <polygon
      points="16,50 44,22 134,22 106,50"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Right face */}
    <polygon
      points="106,125 134,97 134,22 106,50"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Hidden */}
    <line
      x1="16"
      y1="125"
      x2="44"
      y2="97"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    <line
      x1="44"
      y1="97"
      x2="134"
      y2="97"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    <line
      x1="44"
      y1="97"
      x2="44"
      y2="22"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    {/* Labels */}
    <Lbl x={61} y={133} text="a" color={C.shape} size={12} />
    <Lbl x={6} y={88} text="b" color={C.shape} size={12} anchor="middle" />
    <Lbl x={120} y={72} text="h" color={C.height} size={12} />
    {/* Height line */}
    <line
      x1="134"
      y1="22"
      x2="134"
      y2="97"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="4,3"
    />
  </svg>
);

const SVGPrisma = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Front triangle: A(20,115) B(100,115) C(60,40) */}
    <polygon
      points="20,115 100,115 60,40"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Back triangle (shifted +40,–30): A'(60,85) B'(140,85) C'(100,10) */}
    <polygon
      points="60,85 140,85 100,10"
      fill="none"
      stroke={C.hidden}
      strokeWidth="1.4"
      strokeDasharray="5,3"
      strokeLinejoin="round"
    />
    {/* Lateral edges */}
    <line
      x1="20"
      y1="115"
      x2="60"
      y2="85"
      stroke={C.hidden}
      strokeWidth="1.4"
      strokeDasharray="5,3"
    />
    <line x1="100" y1="115" x2="140" y2="85" stroke={C.shape} strokeWidth="2.2" />
    <line x1="60" y1="40" x2="100" y2="10" stroke={C.shape} strokeWidth="2.2" />
    {/* Height line */}
    <line
      x1="60"
      y1="115"
      x2="60"
      y2="40"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="4,3"
    />
    <RightAngleMark cx={60} cy={115} size={6} rotate={0} />
    {/* Labels */}
    <Lbl x={60} y={128} text="Ab" color={C.shape} size={11} />
    <Lbl x={68} y={78} text="h" color={C.height} size={12} />
  </svg>
);

const SVGPiramida = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Base square: A(18,115) B(118,115) C(138,90) D(38,90) */}
    <polygon
      points="18,115 118,115 138,90 38,90"
      fill="none"
      stroke={C.shape}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Hidden base diagonal */}
    <line
      x1="18"
      y1="115"
      x2="138"
      y2="90"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    <line
      x1="118"
      y1="115"
      x2="38"
      y2="90"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    {/* Apex V(78,16) */}
    <line x1="78" y1="16" x2="18" y2="115" stroke={C.shape} strokeWidth="2.2" />
    <line x1="78" y1="16" x2="118" y2="115" stroke={C.shape} strokeWidth="2.2" />
    <line x1="78" y1="16" x2="138" y2="90" stroke={C.shape} strokeWidth="2.2" />
    <line
      x1="78"
      y1="16"
      x2="38"
      y2="90"
      stroke={C.hidden}
      strokeWidth="1.4"
      strokeDasharray="5,3"
    />
    {/* Height from V to centre of base */}
    <line
      x1="78"
      y1="16"
      x2="78"
      y2="103"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="4,3"
    />
    <circle cx="78" cy="103" r="3" fill={C.dot} />
    {/* Apothem */}
    <line
      x1="78"
      y1="103"
      x2="118"
      y2="115"
      stroke={C.diag}
      strokeWidth="1.3"
      strokeDasharray="4,3"
    />
    {/* Labels */}
    <Lbl x={78} y={8} text="V" color={C.shape} size={12} />
    <Lbl x={88} y={60} text="h" color={C.height} size={12} />
    <Lbl x={100} y={118} text="a" color={C.shape} size={12} />
    <Lbl x={100} y={106} text="ap" color={C.diag} size={10} />
  </svg>
);

const SVGSfera = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Main circle */}
    <circle cx="80" cy="70" r="58" fill="none" stroke={C.shape} strokeWidth="2.4" />
    {/* Equator ellipse */}
    <ellipse
      cx="80"
      cy="70"
      rx="58"
      ry="18"
      fill="none"
      stroke={C.shape}
      strokeWidth="1.8"
      strokeDasharray="6,4"
    />
    {/* Radius */}
    <line x1="80" y1="70" x2="138" y2="70" stroke={C.height} strokeWidth="1.8" />
    <circle cx="80" cy="70" r="3" fill={C.dot} />
    {/* Labels */}
    <Lbl x={74} y={63} text="O" color={C.text} size={12} />
    <Lbl x={112} y={63} text="R" color={C.height} />
  </svg>
);

const SVGCilindru = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Body */}
    <rect x="30" y="32" width="100" height="90" fill="none" stroke={C.shape} strokeWidth="2.3" />
    {/* Top ellipse */}
    <ellipse cx="80" cy="32" rx="50" ry="16" fill="none" stroke={C.shape} strokeWidth="2.3" />
    {/* Bottom ellipse */}
    <ellipse cx="80" cy="122" rx="50" ry="16" fill="none" stroke={C.shape} strokeWidth="2.3" />
    {/* Hidden bottom half */}
    <ellipse
      cx="80"
      cy="122"
      rx="50"
      ry="16"
      fill="none"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    {/* Height */}
    <line
      x1="130"
      y1="32"
      x2="130"
      y2="122"
      stroke={C.height}
      strokeWidth="1.6"
      strokeDasharray="4,3"
    />
    {/* Radius on top */}
    <line x1="80" y1="32" x2="130" y2="32" stroke={C.diag} strokeWidth="1.6" />
    <circle cx="80" cy="32" r="3" fill={C.dot} />
    <circle cx="80" cy="122" r="3" fill={C.dot} />
    {/* Labels */}
    <Lbl x={107} y={28} text="R" color={C.diag} size={12} />
    <Lbl x={140} y={77} text="h" color={C.height} size={12} />
  </svg>
);

const SVGCon = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Apex V(80,14) */}
    {/* Base ellipse centre (80,114) */}
    <ellipse cx="80" cy="114" rx="56" ry="16" fill="none" stroke={C.shape} strokeWidth="2.3" />
    {/* Hidden half */}
    <ellipse
      cx="80"
      cy="114"
      rx="56"
      ry="16"
      fill="none"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    {/* Lateral lines */}
    <line x1="80" y1="14" x2="24" y2="114" stroke={C.shape} strokeWidth="2.3" />
    <line x1="80" y1="14" x2="136" y2="114" stroke={C.shape} strokeWidth="2.3" />
    {/* Axis */}
    <line
      x1="80"
      y1="14"
      x2="80"
      y2="114"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="4,3"
    />
    <circle cx="80" cy="114" r="3" fill={C.dot} />
    {/* Generatrix */}
    <line x1="80" y1="114" x2="136" y2="114" stroke={C.diag} strokeWidth="1.5" />
    {/* Labels */}
    <Lbl x={80} y={6} text="V" color={C.shape} size={12} />
    <Lbl x={88} y={65} text="h" color={C.height} size={12} />
    <Lbl x={110} y={108} text="R" color={C.diag} size={12} />
    <Lbl x={116} y={64} text="G" color={C.shape} size={12} />
  </svg>
);

const SVGTrunchiDeCon = () => (
  <svg viewBox="0 0 160 140" width="160" height="140">
    {/* Large base ellipse centre (80,118) rx=56 */}
    <ellipse cx="80" cy="118" rx="56" ry="15" fill="none" stroke={C.shape} strokeWidth="2.3" />
    <ellipse
      cx="80"
      cy="118"
      rx="56"
      ry="15"
      fill="none"
      stroke={C.hidden}
      strokeWidth="1.3"
      strokeDasharray="5,3"
    />
    {/* Small top ellipse centre (80,36) rx=28 */}
    <ellipse cx="80" cy="36" rx="28" ry="9" fill="none" stroke={C.shape} strokeWidth="2.3" />
    {/* Lateral lines */}
    <line x1="24" y1="118" x2="52" y2="36" stroke={C.shape} strokeWidth="2.3" />
    <line x1="136" y1="118" x2="108" y2="36" stroke={C.shape} strokeWidth="2.3" />
    {/* Axis */}
    <line
      x1="80"
      y1="36"
      x2="80"
      y2="118"
      stroke={C.height}
      strokeWidth="1.5"
      strokeDasharray="4,3"
    />
    <circle cx="80" cy="36" r="2.5" fill={C.dot} />
    <circle cx="80" cy="118" r="2.5" fill={C.dot} />
    {/* Generatrix */}
    <line x1="80" y1="118" x2="136" y2="118" stroke={C.diag} strokeWidth="1.5" />
    <line x1="80" y1="36" x2="108" y2="36" stroke={C.diag} strokeWidth="1.5" />
    {/* Labels */}
    <Lbl x={110} y={108} text="R" color={C.diag} size={12} />
    <Lbl x={96} y={30} text="r" color={C.diag} size={12} />
    <Lbl x={88} y={77} text="h" color={C.height} size={12} />
    <Lbl x={122} y={77} text="G" color={C.shape} size={12} />
    {/* Generatrix line to show G */}
    <line
      x1="108"
      y1="36"
      x2="136"
      y2="118"
      stroke={C.shape}
      strokeWidth="1.2"
      strokeDasharray="4,3"
    />
  </svg>
);

// ─── Figure data ──────────────────────────────────────────────────────────────

interface FigureData {
  id: string;
  name: string;
  accent: string; // header colour
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
      { label: 'lₘ', expr: '(B + b) / 2  (linie mijlocie)' },
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
      { label: 'd', expr: '2R  (diametru)' },
    ],
  },
  {
    id: 'sector',
    name: 'Sector circular',
    accent: '#6d28d9',
    svg: <SVGSectorCircular />,
    formulas: [
      { label: 'A', expr: 'π · R² · α / 360°' },
      { label: 'l', expr: 'π · R · α / 180°  (arc)' },
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
      { label: 'd', expr: 'l · √3  (diagonala)' },
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
      { label: 'd', expr: '√(a² + b² + h²)' },
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

// ─── Card component ───────────────────────────────────────────────────────────

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
      {/* Coloured header */}
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

      {/* SVG drawing — centred */}
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

      {/* Formulas */}
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
        minHeight: '100vh',
        background: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: '#0f172a',
          color: '#fff',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          height: 56,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 22,
            padding: '0 4px',
            lineHeight: 1,
          }}
          title="Înapoi la tablă"
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '0.01em',
            color: '#f1f5f9',
          }}
        >
          Figuri geometrice
        </h1>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {(['2d', '3d'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                color: tab === t ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: 20,
                padding: '5px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {t === '2d' ? 'Figuri plane' : 'Corpuri geometrice'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section subtitle ── */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 24px',
          fontSize: 13,
          color: '#475569',
          flexShrink: 0,
        }}
      >
        {tab === '2d' ? (
          <>
            <strong>Arii și perimetre</strong> — formule pentru figuri plane cu notații standard.
            <span style={{ color: '#dc2626', marginLeft: 10 }}>● înălțime</span>
            <span style={{ color: '#16a34a', marginLeft: 10 }}>● diagonală</span>
            <span style={{ color: '#d97706', marginLeft: 10 }}>● unghi</span>
          </>
        ) : (
          <>
            <strong>Arii și volume</strong> — formule pentru corpuri geometrice.
            <span style={{ marginLeft: 6 }}>
              Al = arie laterală · At = arie totală · Ab = arie bază
            </span>
          </>
        )}
      </div>

      {/* ── Grid of cards ── */}
      <div
        style={{
          padding: '20px 20px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          flexGrow: 1,
        }}
      >
        {figures.map((fig) => (
          <FigureCard key={fig.id} fig={fig} />
        ))}
      </div>
    </div>
  );
}

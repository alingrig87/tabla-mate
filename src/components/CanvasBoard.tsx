import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeomKind, GeomItem, SHAPE_GROUPS, drawGeom, drawGeomPreview } from '../shapes';
import { SUBIECTE } from '../data/subiecte';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToBoardItems,
  addItemToBoard,
  removeItemFromBoard,
  createBoard,
} from '../lib/boardSync';

// ─── Types ────────────────────────────────────────────────────────────────────

type PenTool = 'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'text' | 'geom' | 'move';

type Point = { x: number; y: number };

interface PenItem {
  kind: 'pen';
  id: string; // stable UUID — Firestore doc id in collaborative mode
  color: string;
  width: number;
  points: Point[];
}

interface ShapeItem {
  kind: 'line' | 'rect' | 'circle';
  id: string; // stable UUID — Firestore doc id in collaborative mode
  color: string;
  width: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TextItem {
  kind: 'text';
  id: string; // stable UUID — Firestore doc id in collaborative mode
  color: string;
  fontSize: number;
  x: number;
  y: number;
  content: string;
}

// Images are stored as data URLs so they survive undo/redo snapshots.
// Each image has a unique id used as image-cache key.
// NOTE: ImageItems are NOT synced to Firestore (base64 data can exceed 1 MB).
interface ImageItem {
  kind: 'image';
  id: string; // crypto.randomUUID() — image cache key; also used as local-only id
  dataURL: string; // base64-encoded PNG/JPEG — serialisable, survives snapshots
  x: number; // world coords of the top-left corner
  y: number;
  w: number; // display size in world units
  h: number;
}

type DrawItem = PenItem | ShapeItem | TextItem | GeomItem | ImageItem;

// ─── Image cache ──────────────────────────────────────────────────────────────
// Module-level Map: persists across renders (unlike useState) and across undo
// snapshots. When an ImageItem is drawn, its HTMLImageElement is looked up here.
// A missing entry triggers an async preload that redraws when the image loads.
const _imgCache = new Map<string, HTMLImageElement>();

// Last-render snapshot — updated at the top of every redrawAll() call.
// Used by image onLoad callbacks to re-trigger drawing once decoding finishes.
let _lastCtx: CanvasRenderingContext2D | null = null;
let _lastItems: DrawItem[] = [];
let _lastPan: Point = { x: 0, y: 0 };
let _lastScale = 1;

function preloadImg(item: ImageItem): HTMLImageElement {
  if (_imgCache.has(item.id)) return _imgCache.get(item.id)!;
  const img = new Image();
  img.onload = () => {
    // Re-draw with the most recent render parameters once the image has decoded.
    // This fires asynchronously — the ref snapshot is stale-safe because nothing
    // mutates _last* between the preload call and this callback.
    if (_lastCtx) redrawAll(_lastCtx, _lastItems, _lastPan, _lastScale);
  };
  img.src = item.dataURL;
  _imgCache.set(item.id, img);
  return img;
}

interface ShapePreview {
  kind: 'line' | 'rect' | 'circle';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TextCursor {
  x: number;
  y: number;
  sx: number;
  sy: number;
  value: string;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawItem(ctx: CanvasRenderingContext2D, item: DrawItem) {
  ctx.save();
  switch (item.kind) {
    case 'pen':
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      item.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      break;
    case 'line':
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.stroke();
      break;
    case 'rect':
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width;
      ctx.strokeRect(item.x1, item.y1, item.x2 - item.x1, item.y2 - item.y1);
      break;
    case 'circle': {
      const cx = (item.x1 + item.x2) / 2,
        cy = (item.y1 + item.y2) / 2;
      const rx = Math.abs(item.x2 - item.x1) / 2,
        ry = Math.abs(item.y2 - item.y1) / 2;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'text':
      ctx.fillStyle = item.color;
      ctx.font = `${item.fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(item.content, item.x, item.y);
      break;
    case 'geom':
      drawGeom(ctx, item.geomKind, item.color, item.width, item.x1, item.y1, item.x2, item.y2);
      break;
    case 'image': {
      // preloadImg returns the cached HTMLImageElement, or starts an async load.
      // If loading is needed, the onLoad callback (inside preloadImg) will call
      // redrawAll again via _lastCtx/_lastItems/_lastPan/_lastScale once decoded.
      const img = preloadImg(item);
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, item.x, item.y, item.w, item.h);
      }
      break;
    }
  }
  ctx.restore();
}

function drawShapePreview(
  ctx: CanvasRenderingContext2D,
  s: ShapePreview,
  color: string,
  width: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([6, 4]);
  switch (s.kind) {
    case 'line':
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      break;
    case 'rect':
      ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
      break;
    case 'circle': {
      const cx = (s.x1 + s.x2) / 2,
        cy = (s.y1 + s.y2) / 2;
      const rx = Math.abs(s.x2 - s.x1) / 2,
        ry = Math.abs(s.y2 - s.y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function redrawAll(
  ctx: CanvasRenderingContext2D,
  items: DrawItem[],
  pan: Point,
  scale: number,
  preview?: { shape: ShapePreview; color: string; width: number },
  geomPreview?: {
    kind: GeomKind;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    width: number;
  }
) {
  // Snapshot render args so image onLoad callbacks can re-trigger drawing
  _lastCtx = ctx;
  _lastItems = items;
  _lastPan = pan;
  _lastScale = scale;
  const dpr = window.devicePixelRatio || 1;
  // Reset to device-pixel space to clear the full physical canvas
  ctx.resetTransform();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Apply world transform: DPR scaling + zoom scale + pan offset.
  // After this, all drawing commands use world coordinates — the canvas
  // maps them to physical pixels: physical = (world - pan) * dpr * scale
  ctx.scale(dpr * scale, dpr * scale);
  ctx.translate(-pan.x, -pan.y);
  items.forEach((item) => drawItem(ctx, item));
  if (preview) drawShapePreview(ctx, preview.shape, preview.color, preview.width);
  if (geomPreview)
    drawGeomPreview(
      ctx,
      geomPreview.kind,
      geomPreview.color,
      geomPreview.width,
      geomPreview.x1,
      geomPreview.y1,
      geomPreview.x2,
      geomPreview.y2
    );
  // Note: transform is left active so incremental pen strokes drawn immediately
  // after redrawAll (in pointerMove) are correctly placed in world space.
}

// ─── Smart eraser: geometry hit-detection ─────────────────────────────────────

// Distance from point (px,py) to segment (ax,ay)→(bx,by).
// Uses parametric projection: find the closest point on the segment, then measure.
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax,
    dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay); // degenerate segment (point)
  // t = projection parameter: 0 = at A, 1 = at B, clamped to [0,1]
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Returns true if the cursor at (px,py) is within `tol` pixels of the item's geometry
function hitTest(item: DrawItem, px: number, py: number, tol: number): boolean {
  switch (item.kind) {
    case 'pen': {
      const pts = item.points;
      // Test each segment of the polyline
      for (let i = 1; i < pts.length; i++)
        if (distSeg(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) < tol + item.width / 2)
          return true;
      // Single-point stroke (tap without drag)
      return pts.length === 1 && Math.hypot(px - pts[0].x, py - pts[0].y) < tol + item.width;
    }
    case 'line':
      return distSeg(px, py, item.x1, item.y1, item.x2, item.y2) < tol + item.width / 2;
    case 'rect': {
      const { x1, y1, x2, y2, width } = item;
      const t2 = tol + width / 2;
      // Test all four edges of the rectangle
      return (
        distSeg(px, py, x1, y1, x2, y1) < t2 ||
        distSeg(px, py, x2, y1, x2, y2) < t2 ||
        distSeg(px, py, x2, y2, x1, y2) < t2 ||
        distSeg(px, py, x1, y2, x1, y1) < t2
      );
    }
    case 'circle': {
      const cx = (item.x1 + item.x2) / 2,
        cy = (item.y1 + item.y2) / 2;
      const rx = Math.abs(item.x2 - item.x1) / 2,
        ry = Math.abs(item.y2 - item.y1) / 2;
      if (!rx || !ry) return false;
      // Normalized ellipse equation: |sqrt((dx/rx)²+(dy/ry)²) - 1| * minRadius < tol
      const dx = (px - cx) / rx,
        dy = (py - cy) / ry;
      return Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry) < tol + item.width / 2;
    }
    case 'text': {
      const approxW = item.content.length * item.fontSize * 0.55;
      return (
        px >= item.x - tol &&
        px <= item.x + approxW + tol &&
        py >= item.y - tol &&
        py <= item.y + item.fontSize + tol
      );
    }
    case 'geom': {
      // Use bounding-box test for geometric shapes
      const minX = Math.min(item.x1, item.x2) - tol;
      const maxX = Math.max(item.x1, item.x2) + tol;
      const minY = Math.min(item.y1, item.y2) - tol;
      const maxY = Math.max(item.y1, item.y2) + tol;
      return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }
    case 'image':
      // AABB test: is the cursor inside the image rectangle?
      return (
        px >= item.x - tol &&
        px <= item.x + item.w + tol &&
        py >= item.y - tol &&
        py <= item.y + item.h + tol
      );
  }
}

// Draw a translucent red highlight over the item to signal "will be erased"
function drawHighlight(ctx: CanvasRenderingContext2D, item: DrawItem) {
  ctx.save();
  const RED = '#ef4444';
  switch (item.kind) {
    case 'pen': {
      ctx.strokeStyle = RED;
      ctx.lineWidth = item.width + 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      item.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      break;
    }
    case 'line': {
      ctx.strokeStyle = RED;
      ctx.lineWidth = item.width + 6;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.stroke();
      break;
    }
    case 'rect': {
      ctx.strokeStyle = RED;
      ctx.lineWidth = item.width + 5;
      ctx.globalAlpha = 0.55;
      ctx.strokeRect(item.x1, item.y1, item.x2 - item.x1, item.y2 - item.y1);
      ctx.fillStyle = RED;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(item.x1, item.y1, item.x2 - item.x1, item.y2 - item.y1);
      break;
    }
    case 'circle': {
      const cx = (item.x1 + item.x2) / 2,
        cy = (item.y1 + item.y2) / 2;
      const rx = Math.abs(item.x2 - item.x1) / 2,
        ry = Math.abs(item.y2 - item.y1) / 2;
      ctx.strokeStyle = RED;
      ctx.lineWidth = item.width + 5;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = `${item.fontSize}px sans-serif`;
      const w = ctx.measureText(item.content).width;
      ctx.fillStyle = RED;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(item.x - 3, item.y - 3, w + 6, item.fontSize + 6);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = RED;
      ctx.textBaseline = 'top';
      ctx.fillText(item.content, item.x, item.y);
      break;
    }
    case 'geom': {
      ctx.globalAlpha = 0.6;
      drawGeom(ctx, item.geomKind, RED, item.width + 3, item.x1, item.y1, item.x2, item.y2);
      break;
    }
    case 'image': {
      // Translucent red rectangle overlay over the image bounds
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = RED;
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 2;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      break;
    }
  }
  ctx.restore();
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IC = {
  strokeWidth: 2,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IconShapes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M12 2l4 8H8z" />
    <rect x="2" y="13" width="8" height="8" />
    <circle cx="18" cy="17" r="4" />
  </svg>
);
const IconEraser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M20 20H7L3 16l10-10 7 7-3 3" />
    <path d="M6 11l7 7" />
  </svg>
);
const IconPen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);
const IconLine = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <line x1="5" y1="19" x2="19" y2="5" />
  </svg>
);
const IconRect = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
  </svg>
);
const IconCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <circle cx="12" cy="12" r="9" />
  </svg>
);
const IconText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);
const IconUndo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
);
const IconRedo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <polyline points="15 14 20 9 15 4" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
);
const IconMove = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <polyline points="5 9 2 12 5 15" />
    <polyline points="9 5 12 2 15 5" />
    <polyline points="15 19 12 22 9 19" />
    <polyline points="19 9 22 12 19 15" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="22" />
  </svg>
);
const IconZoomIn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);
const IconZoomOut = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconPaste = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="10" width="8" height="6" />
  </svg>
);
const IconPdf = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="15" x2="15" y2="15" />
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="9" y1="12" x2="12" y2="12" />
  </svg>
);

const IconFormulas = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const IconSubiecte = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
// ── Collaborative / auth icons ────────────────────────────────────────────────
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...IC}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ─── Mini-canvas icon for each geometric shape ───────────────────────────────
// Renders a small preview of each shape using drawGeom on a tiny off-screen canvas.
// Each ShapeIcon is its own component so the useEffect runs per shape kind.
function ShapeIcon({ kind }: { kind: GeomKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    c.width = 40 * dpr;
    c.height = 40 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 40, 40);
    drawGeom(ctx, kind, '#333', 1.5, 4, 4, 36, 36);
  }, [kind]);
  return <canvas ref={ref} style={{ width: 40, height: 40 }} />;
}

// ─── Pill button ──────────────────────────────────────────────────────────────

function PillBtn({
  active,
  onClick,
  children,
  disabled,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: 'none',
        padding: 0,
        flexShrink: 0,
        background: active ? '#1a1a1a' : 'transparent',
        color: active ? '#fff' : disabled ? '#ccc' : '#333',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.12s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) (e.currentTarget as HTMLElement).style.background = '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

// 9 preset colors: near-black, warm + cool spectrum, white
const PALETTE = [
  '#1a1a1a',
  '#e53e3e',
  '#dd6b20',
  '#d69e2e',
  '#276749',
  '#2b6cb0',
  '#805ad5',
  '#d53f8c',
  '#ffffff',
];

const PEN_SIZES = [2, 4, 8, 16]; // stroke widths in CSS pixels
const TEXT_FONT_SIZE = 24;
const ERASER_RADIUS = 20; // hit-test tolerance in CSS pixels

// Discrete zoom levels — wheel/button zoom snaps to nearest step
const ZOOM_STEPS = [0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];

// ─── Component ────────────────────────────────────────────────────────────────

interface CanvasBoardProps {
  onOpenFormulas?: () => void;
  onOpenSubiecte?: () => void;
}

export default function CanvasBoard({
  onOpenFormulas,
  onOpenSubiecte,
}: CanvasBoardProps): JSX.Element {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { user: authUser, loginWithGoogle, logout } = useAuth();

  // ── Collaborative board state ────────────────────────────────────────────
  // boardId is read from ?board=xxx URL param on load; set when creating a board.
  const [boardId, setBoardId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('board');
  });
  // Stable ref so sync helpers can read boardId without stale closures
  const boardIdRef = useRef<string | null>(null);
  useEffect(() => {
    boardIdRef.current = boardId;
  }, [boardId]);

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copiază');

  // IDs of items uploaded by THIS client but not yet confirmed by Firestore.
  // Prevents the Firestore echo from double-adding our own strokes.
  const pendingUploadIds = useRef<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<PenTool>('pen');
  const toolRef = useRef<PenTool>('pen');
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const isDrawingRef = useRef(false);
  const currentPenRef = useRef<PenItem | null>(null);
  const startRef = useRef<Point>({ x: 0, y: 0 });

  const [items, setItems] = useState<DrawItem[]>([]);
  const itemsRef = useRef<DrawItem[]>([]);

  const [textCursor, setTextCursor] = useState<TextCursor | null>(null);

  // ── Smart eraser state ────────────────────────────────────────────────────
  // Screen position of the eraser cursor (drives the custom CSS circle overlay)
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);
  // Index of the item currently highlighted (hovered by eraser), -1 = none
  const hoveredIdxRef = useRef<number>(-1);
  // Snapshot taken at the START of an erase drag — single undo entry for the whole drag
  const preEraseSnapshotRef = useRef<DrawItem[] | null>(null);

  // ── Color & size state ────────────────────────────────────────────────────
  // Both state (for re-render) and ref (for instant access in event handlers)
  const [color, setColor] = useState('#1a1a1a');
  const colorRef = useRef('#1a1a1a');
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  const [penSize, setPenSize] = useState(3);
  const penSizeRef = useRef(3);
  useEffect(() => {
    penSizeRef.current = penSize;
  }, [penSize]);

  // ── Geom tool state ───────────────────────────────────────────────────────
  const [activeGeom, setActiveGeom] = useState<GeomKind | null>(null);
  const activeGeomRef = useRef<GeomKind | null>(null);
  useEffect(() => {
    activeGeomRef.current = activeGeom;
  }, [activeGeom]);
  const [showShapes, setShowShapes] = useState(false);

  // Panel visibility
  const [showColorPanel, setShowColorPanel] = useState(false);

  // ── Pan & zoom state ─────────────────────────────────────────────────────
  // panRef: world-coordinate position of the viewport's top-left corner.
  // Increasing pan moves the viewport right/down (content scrolls left/up).
  const panRef = useRef<Point>({ x: 0, y: 0 });
  // scaleRef: zoom factor. 1 = 100%, 2 = 200% (zoomed in), 0.5 = 50% (zoomed out).
  const scaleRef = useRef(1);
  // zoom state mirrors scaleRef for React re-renders (displays the % label)
  const [zoom, setZoom] = useState(1);

  // Refs for the move-tool pan gesture
  const isPanningRef = useRef(false); // true while drag-panning
  const [isPanning, setIsPanning] = useState(false); // drives grab/grabbing cursor
  const panStartRef = useRef<Point>({ x: 0, y: 0 }); // screen pos at drag start
  const panOriginRef = useRef<Point>({ x: 0, y: 0 }); // panRef.current at drag start

  // ── Undo/Redo ─────────────────────────────────────────────────────────────
  const undoRef = useRef<DrawItem[][]>([]);
  const redoRef = useRef<DrawItem[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ── Canvas init ──────────────────────────────────────────────────────────
  // Setting canvas.width/height resets all transforms — redrawAll re-applies them.
  // We no longer pre-scale here; redrawAll handles DPR + zoom + pan in one call.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      redrawAll(canvas.getContext('2d')!, itemsRef.current, panRef.current, scaleRef.current);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    itemsRef.current = items;
    redrawAll(canvasRef.current!.getContext('2d')!, items, panRef.current, scaleRef.current);
  }, [items]);

  function getCtx() {
    return canvasRef.current!.getContext('2d')!;
  }

  // ── redraw: component-scoped wrapper around the module-level redrawAll ────
  // Captures the current pan/scale refs so call sites don't repeat them.
  // Optional overrides let callers pass a live preview without committing it.
  function redraw(
    overrideItems?: DrawItem[],
    preview?: { shape: ShapePreview; color: string; width: number },
    geomPreview?: {
      kind: GeomKind;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      width: number;
    }
  ) {
    redrawAll(
      getCtx(),
      overrideItems ?? itemsRef.current,
      panRef.current,
      scaleRef.current,
      preview,
      geomPreview
    );
  }

  // ── Zoom helpers ─────────────────────────────────────────────────────────

  // Zoom to newScale keeping the canvas point (cx, cy) in CSS pixels stationary.
  // Math: world_x = screen_x / scale + pan.x must be equal before and after zoom.
  // → newPan.x = screen_x / oldScale + oldPan.x − screen_x / newScale
  function applyZoom(newScale: number, cx: number, cy: number) {
    const oldScale = scaleRef.current;
    const oldPan = panRef.current;
    const clamped = Math.max(ZOOM_STEPS[0], Math.min(ZOOM_STEPS[ZOOM_STEPS.length - 1], newScale));
    scaleRef.current = clamped;
    panRef.current = {
      x: cx / oldScale + oldPan.x - cx / clamped,
      y: cy / oldScale + oldPan.y - cy / clamped,
    };
    setZoom(clamped);
    redrawAll(getCtx(), itemsRef.current, panRef.current, scaleRef.current);
  }

  function zoomIn() {
    const canvas = canvasRef.current!;
    // Zoom toward the centre of the viewport
    const cx = canvas.offsetWidth / 2;
    const cy = canvas.offsetHeight / 2;
    const next =
      ZOOM_STEPS.find((s) => s > scaleRef.current + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    applyZoom(next, cx, cy);
  }

  function zoomOut() {
    const canvas = canvasRef.current!;
    const cx = canvas.offsetWidth / 2;
    const cy = canvas.offsetHeight / 2;
    const prev =
      [...ZOOM_STEPS].reverse().find((s) => s < scaleRef.current - 0.001) ?? ZOOM_STEPS[0];
    applyZoom(prev, cx, cy);
  }

  function resetView() {
    panRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    setZoom(1);
    redrawAll(getCtx(), itemsRef.current, panRef.current, scaleRef.current);
  }

  // ── Wheel event: zoom (Ctrl/pinch) or pan (two-finger scroll / mouse wheel) ─
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // stop page scroll
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left; // cursor in CSS pixels relative to canvas
      const cy = e.clientY - rect.top;

      if (e.ctrlKey) {
        // Pinch-to-zoom (trackpad sends ctrlKey=true) or Ctrl+Wheel (mouse)
        // deltaY < 0 = zoom in, deltaY > 0 = zoom out
        const delta = -e.deltaY * (e.deltaMode === 0 ? 0.005 : 0.1);
        applyZoom(scaleRef.current * (1 + delta), cx, cy);
      } else {
        // Two-finger scroll (trackpad) or plain mouse wheel → pan
        panRef.current = {
          x: panRef.current.x + e.deltaX / scaleRef.current,
          y: panRef.current.y + e.deltaY / scaleRef.current,
        };
        redrawAll(getCtx(), itemsRef.current, panRef.current, scaleRef.current);
      }
    };
    // { passive: false } required so we can call preventDefault
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PDF import state ─────────────────────────────────────────────────────
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // loadPDF: dynamically imports pdfjs-dist (lazy chunk), renders each page
  // to an off-screen canvas, converts to JPEG data URL, commits as ImageItems.
  //
  // Dynamic import() = code splitting — pdfjs-dist (~2 MB) is only loaded
  // when the user actually opens a PDF, not on initial page load.
  const loadPDF = useCallback(
    async (source: File | string) => {
      setPdfLoading(true);
      setShowPdfPanel(false);
      try {
        // Dynamic import: loads the pdfjs-dist chunk on first call only
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        // Worker runs PDF parsing off the main thread to avoid UI freezes
        GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        // Read PDF bytes: from File (disk) or fetch (URL)
        const data =
          source instanceof File
            ? await source.arrayBuffer()
            : await fetch(source).then((r) => r.arrayBuffer());

        const pdf = await getDocument({ data }).promise;
        const canvas = canvasRef.current!;
        // Scale each page to fill the viewport width minus padding
        const targetW = canvas.offsetWidth - 40;

        const newItems: ImageItem[] = [];
        // Stack pages vertically starting just below the current viewport top
        let yOff = panRef.current.y + 20;

        for (let pg = 1; pg <= pdf.numPages; pg++) {
          const page = await pdf.getPage(pg);
          const vp0 = page.getViewport({ scale: 1 });
          const sc = targetW / vp0.width; // scale factor to fill viewport width
          const vp = page.getViewport({ scale: sc });

          // Off-screen canvas: rendered without being attached to the DOM
          const oc = document.createElement('canvas');
          oc.width = Math.round(vp.width);
          oc.height = Math.round(vp.height);
          await page.render({ canvas: oc, viewport: vp }).promise;

          const dataURL = oc.toDataURL('image/jpeg', 0.92); // JPEG at 92% quality
          const id = crypto.randomUUID();
          const xOff = panRef.current.x + 20;

          // Pre-warm cache: the image data is already decoded (it was just painted
          // onto `oc`). Setting img.src = dataURL re-encodes/decodes from base64,
          // but since the data is local this is fast. The onLoad triggers a redraw
          // so pages appear progressively as they decode.
          const img = new Image();
          img.onload = () => {
            if (_lastCtx) redrawAll(_lastCtx, _lastItems, _lastPan, _lastScale);
          };
          img.src = dataURL;
          _imgCache.set(id, img);

          newItems.push({
            kind: 'image',
            id,
            dataURL,
            x: xOff,
            y: yOff,
            w: oc.width,
            h: oc.height,
          });
          yOff += oc.height + 16; // 16px gap between pages
        }

        commit([...itemsRef.current, ...newItems]);
      } catch (err) {
        console.error('[PDF]', err);
        alert('Nu am putut încărca PDF-ul.');
      } finally {
        setPdfLoading(false);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Image paste helpers ──────────────────────────────────────────────────

  // Process a Blob (from ClipboardEvent or Clipboard API) into an ImageItem.
  // FileReader converts the binary blob to a base64 data URL so we can:
  //   1. Store it in the DrawItem (survives undo/redo snapshots)
  //   2. Feed it to <img> via preloadImg for repeated drawImage calls
  function pasteImageBlob(blob: Blob) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result as string; // "data:image/png;base64,..."
      const img = new Image();
      img.onload = () => {
        // Auto-scale: fit within 600×450 world units while preserving aspect ratio
        const MAX_W = 600,
          MAX_H = 450;
        const ratio = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
        const w = Math.round(img.naturalWidth * ratio);
        const h = Math.round(img.naturalHeight * ratio);
        // Place image at the current viewport centre in world coordinates
        const canvas = canvasRef.current!;
        const cx = canvas.offsetWidth / 2 / scaleRef.current + panRef.current.x;
        const cy = canvas.offsetHeight / 2 / scaleRef.current + panRef.current.y;
        const id = crypto.randomUUID();
        const item: ImageItem = { kind: 'image', id, dataURL, x: cx - w / 2, y: cy - h / 2, w, h };
        _imgCache.set(id, img); // pre-populate cache — image is already loaded
        commit([...itemsRef.current, item]);
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(blob); // async: triggers onload when conversion is done
  }

  // Clipboard API button handler (for the toolbar button, not keyboard shortcut).
  // navigator.clipboard.read() requires HTTPS or localhost.
  async function pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          pasteImageBlob(blob);
          return;
        }
      }
    } catch {
      // Permission denied or no image in clipboard — silently ignore
    }
  }

  // ── History ──────────────────────────────────────────────────────────────

  // ── Firestore sync helpers ────────────────────────────────────────────────
  // syncDiff compares two DrawItem arrays and propagates the delta to Firestore.
  // It is called from commit() and from the eraser pointerUp handler.
  //
  // Limitations (v1):
  //   - ImageItems (kind:'image') are NOT synced — their base64 dataURLs can
  //     exceed Firestore's 1 MB per-document limit.
  //   - Undo/redo are disabled while in collaborative mode to avoid one user's
  //     undo accidentally deleting another user's strokes.
  function syncDiff(prev: DrawItem[], next: DrawItem[]) {
    const bid = boardIdRef.current;
    if (!bid) return;

    const prevIds = new Set(prev.map((i) => i.id).filter(Boolean));
    const nextIds = new Set(next.map((i) => i.id).filter(Boolean));

    // Added items → write to Firestore
    for (const item of next) {
      if (!item.id || prevIds.has(item.id)) continue;
      if (item.kind === 'image') continue; // skip — too large for Firestore docs
      pendingUploadIds.current.add(item.id);
      // Exclude id from the stored data (it's the doc id, not a field)
      const { id, ...data } = item as DrawItem & { id: string };
      addItemToBoard(bid, id, data as Record<string, unknown>, authUser?.uid ?? 'anon')
        .then(() => pendingUploadIds.current.delete(id))
        .catch(console.error);
    }

    // Removed items → delete from Firestore
    for (const item of prev) {
      if (!item.id || nextIds.has(item.id)) continue;
      removeItemFromBoard(bid, item.id).catch(console.error);
    }
  }

  // ── Firestore subscription ─────────────────────────────────────────────────
  // When boardId is set (join or create), subscribe to all items in that board.
  // The merge logic:
  //   1. Accept the Firestore snapshot as the authoritative list
  //   2. Keep locally-pending items (uploaded but not yet confirmed) to avoid flicker
  useEffect(() => {
    if (!boardId) return;
    const unsub = subscribeToBoardItems(boardId, (remoteItems) => {
      setItems((prev) => {
        const remoteIds = new Set(remoteItems.map((ri) => ri.id));

        // Locally-pending: written to Firestore but not yet in this snapshot
        const pending = prev.filter(
          (item) => item.id && !remoteIds.has(item.id) && pendingUploadIds.current.has(item.id)
        );

        // Convert remote items back to DrawItem (strip authorId — canvas doesn't need it)
        const fromRemote = remoteItems.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ id, authorId: _a, ...data }) => ({ ...data, id }) as DrawItem
        );

        return [...fromRemote, ...pending];
      });
    });
    return unsub;
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create & join board ────────────────────────────────────────────────────
  async function createAndJoinBoard() {
    const newBoardId = crypto.randomUUID().slice(0, 8);
    try {
      await createBoard(newBoardId, authUser?.uid ?? 'anon');
    } catch (err) {
      console.error('[Board] create error:', err);
      alert('Nu am putut crea tabla. Verifică conexiunea.');
      return;
    }
    // Update URL without full page reload so sharing the tab URL works immediately
    const url = new URL(window.location.href);
    url.searchParams.set('board', newBoardId);
    window.history.pushState({}, '', url.toString());

    setBoardId(newBoardId);
    setShowSharePanel(true);
  }

  function getShareUrl(): string {
    const url = new URL(window.location.href);
    url.searchParams.set('board', boardId ?? '');
    return url.toString();
  }

  function commit(next: DrawItem[]) {
    const prev = itemsRef.current;
    undoRef.current = [...undoRef.current, prev];
    redoRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    setItems(next);
    syncDiff(prev, next);
  }

  // useCallback gives undo/redo a stable reference so the keydown useEffect
  // can list them as deps without re-subscribing on every render.
  // In collaborative mode undo/redo are disabled (see toolbar below).
  const undo = useCallback(() => {
    if (!undoRef.current.length) return;
    const prev = undoRef.current[undoRef.current.length - 1];
    redoRef.current = [...redoRef.current, itemsRef.current];
    undoRef.current = undoRef.current.slice(0, -1);
    setCanUndo(undoRef.current.length > 0);
    setCanRedo(true);
    setItems(prev);
  }, []);

  const redo = useCallback(() => {
    if (!redoRef.current.length) return;
    const next = redoRef.current[redoRef.current.length - 1];
    undoRef.current = [...undoRef.current, itemsRef.current];
    redoRef.current = redoRef.current.slice(0, -1);
    setCanUndo(true);
    setCanRedo(redoRef.current.length > 0);
    setItems(next);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo, Escape = close panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when the user is typing in an input
      if (e.target instanceof HTMLInputElement) return;
      const ctrl = e.ctrlKey || e.metaKey; // metaKey = ⌘ on Mac
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Escape') setShowColorPanel(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ── Paste event (Ctrl+V / ⌘V) ─────────────────────────────────────────────
  // ClipboardEvent fires for Ctrl+V anywhere on the page (no focus required).
  // We use this instead of (or in addition to) the Clipboard API button because:
  //   - it works without the clipboard-read permission
  //   - it fires even when the canvas doesn't have keyboard focus
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Don't intercept paste while the user is typing in a text input
      if (e.target instanceof HTMLInputElement) return;
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        pasteImageBlob(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getScreenPos(e: React.PointerEvent): Point {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Convert pointer event to WORLD coordinates.
  // World = screen / scale + pan
  // (Inverse of the canvas transform: physical = (world - pan) * dpr * scale)
  function getPos(e: React.PointerEvent): Point {
    const s = getScreenPos(e);
    return {
      x: s.x / scaleRef.current + panRef.current.x,
      y: s.y / scaleRef.current + panRef.current.y,
    };
  }

  // Close all panels (e.g. when clicking the canvas)
  function closePopovers() {
    setShowColorPanel(false);
    setShowShapes(false);
  }

  function commitText(tc: TextCursor) {
    if (tc.value.trim()) {
      commit([
        ...itemsRef.current,
        {
          kind: 'text',
          id: crypto.randomUUID(),
          color: colorRef.current,
          fontSize: TEXT_FONT_SIZE,
          x: tc.x,
          y: tc.y,
          content: tc.value.trim(),
        },
      ]);
    }
    setTextCursor(null);
  }

  // ── Pointer events ────────────────────────────────────────────────────────

  // ── Eraser helpers ────────────────────────────────────────────────────────

  // Find the topmost item under (px,py) in world coordinates.
  // Tolerance is ERASER_RADIUS screen pixels, converted to world units at current zoom.
  function findTopHit(px: number, py: number): number {
    const tol = ERASER_RADIUS / scaleRef.current; // world-space tolerance
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      if (hitTest(itemsRef.current[i], px, py, tol)) return i;
    }
    return -1;
  }

  // Update eraser hover highlight without committing (called in pointerMove when not dragging)
  function updateEraserHover(pos: Point) {
    const idx = findTopHit(pos.x, pos.y);
    if (idx === hoveredIdxRef.current) return; // no change
    hoveredIdxRef.current = idx;
    redraw(); // redraw all items with current pan/scale
    if (idx >= 0) drawHighlight(getCtx(), itemsRef.current[idx]);
  }

  // Remove the topmost hit item; push one undo entry for the whole drag session
  function eraseAt(pos: Point) {
    const idx = findTopHit(pos.x, pos.y);
    if (idx < 0) return;
    // Save a snapshot before the first erase in this drag (for single undo entry)
    if (!preEraseSnapshotRef.current) {
      preEraseSnapshotRef.current = itemsRef.current;
    }
    const next = itemsRef.current.filter((_, i) => i !== idx);
    // Update itemsRef directly so subsequent hits in the same drag see fresh state
    itemsRef.current = next;
    hoveredIdxRef.current = -1;
    redraw(next);
  }

  function pointerDown(e: React.PointerEvent) {
    closePopovers();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const t = toolRef.current;

    // Move tool: start a pan drag
    if (t === 'move') {
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = getScreenPos(e);
      panOriginRef.current = { ...panRef.current };
      return;
    }

    if (t === 'eraser') {
      isDrawingRef.current = true;
      preEraseSnapshotRef.current = null; // fresh erase session
      eraseAt(getPos(e));
      return;
    }

    if (t === 'geom' && activeGeomRef.current) {
      isDrawingRef.current = true;
      startRef.current = getPos(e);
      return;
    }

    if (t === 'text') {
      if (textCursor) commitText(textCursor);
      const pos = getPos(e);
      const sp = getScreenPos(e);
      setTextCursor({ x: pos.x, y: pos.y, sx: sp.x, sy: sp.y, value: '' });
      return;
    }

    isDrawingRef.current = true;
    const pos = getPos(e);

    if (t === 'pen') {
      currentPenRef.current = {
        kind: 'pen',
        id: crypto.randomUUID(),
        color: colorRef.current,
        width: penSizeRef.current,
        points: [pos],
      };
    } else {
      startRef.current = pos;
    }
  }

  function pointerMove(e: React.PointerEvent) {
    const pos = getPos(e);
    const sp = getScreenPos(e);
    const t = toolRef.current;

    // Move tool: drag to pan the canvas
    if (t === 'move') {
      if (!isPanningRef.current) return;
      // Shift pan by the screen delta, scaled to world units
      panRef.current = {
        x: panOriginRef.current.x - (sp.x - panStartRef.current.x) / scaleRef.current,
        y: panOriginRef.current.y - (sp.y - panStartRef.current.y) / scaleRef.current,
      };
      redrawAll(getCtx(), itemsRef.current, panRef.current, scaleRef.current);
      return;
    }

    // Eraser: update custom cursor position regardless of whether drawing
    if (t === 'eraser') {
      setEraserPos({ x: sp.x, y: sp.y });
      if (isDrawingRef.current) {
        eraseAt(pos); // drag-erase: remove items under cursor
      } else {
        updateEraserHover(pos); // hover: highlight item under cursor
      }
      return;
    }

    if (!isDrawingRef.current) return;

    if (t === 'pen') {
      if (!currentPenRef.current) return;
      currentPenRef.current.points.push(pos);
      const pts = currentPenRef.current.points;
      const prev = pts[pts.length - 2];
      if (!prev) return;
      // Draw only the new segment incrementally (world transform is already active
      // on the context from the last redrawAll call, so world coords draw correctly)
      const ctx = getCtx();
      ctx.save();
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = penSizeRef.current;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
    } else if (t === 'line' || t === 'rect' || t === 'circle') {
      redraw(undefined, {
        shape: { kind: t, x1: startRef.current.x, y1: startRef.current.y, x2: pos.x, y2: pos.y },
        color: colorRef.current,
        width: penSizeRef.current,
      });
    } else if (t === 'geom' && activeGeomRef.current) {
      redraw(undefined, undefined, {
        kind: activeGeomRef.current,
        x1: startRef.current.x,
        y1: startRef.current.y,
        x2: pos.x,
        y2: pos.y,
        color: colorRef.current,
        width: penSizeRef.current,
      });
    }
  }

  function pointerLeave() {
    // Clear eraser hover highlight and cursor when pointer exits the canvas
    if (toolRef.current === 'eraser') {
      setEraserPos(null);
      hoveredIdxRef.current = -1;
      redraw();
    }
  }

  function pointerUp(e: React.PointerEvent) {
    const t = toolRef.current;

    // Move tool: end pan drag
    if (t === 'move') {
      isPanningRef.current = false;
      setIsPanning(false);
      return;
    }

    if (t === 'eraser') {
      isDrawingRef.current = false;
      // Commit the entire drag as ONE undo entry using the snapshot from drag start
      if (preEraseSnapshotRef.current !== null) {
        const snapshot = preEraseSnapshotRef.current;
        undoRef.current = [...undoRef.current, snapshot];
        redoRef.current = [];
        setCanUndo(true);
        setCanRedo(false);
        setItems(itemsRef.current); // trigger React re-render with final state
        syncDiff(snapshot, itemsRef.current); // sync erasures to Firestore
        preEraseSnapshotRef.current = null;
      }
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const pos = getPos(e);
    if (t === 'pen') {
      if (!currentPenRef.current) return;
      const stroke = currentPenRef.current;
      currentPenRef.current = null;
      commit([...itemsRef.current, stroke]);
    } else if (t === 'line' || t === 'rect' || t === 'circle') {
      const { x: x1, y: y1 } = startRef.current;
      if (Math.abs(pos.x - x1) < 3 && Math.abs(pos.y - y1) < 3) {
        redraw(); // discard tiny drag — restore clean canvas
        return;
      }
      commit([
        ...itemsRef.current,
        {
          kind: t,
          id: crypto.randomUUID(),
          color: colorRef.current,
          width: penSizeRef.current,
          x1,
          y1,
          x2: pos.x,
          y2: pos.y,
        },
      ]);
    } else if (t === 'geom' && activeGeomRef.current) {
      const { x: x1, y: y1 } = startRef.current;
      if (Math.abs(pos.x - x1) < 3 && Math.abs(pos.y - y1) < 3) {
        redraw(); // discard tiny drag
        return;
      }
      commit([
        ...itemsRef.current,
        {
          kind: 'geom',
          id: crypto.randomUUID(),
          geomKind: activeGeomRef.current,
          color: colorRef.current,
          width: penSizeRef.current,
          x1,
          y1,
          x2: pos.x,
          y2: pos.y,
        },
      ]);
    }
  }

  // ── Shared divider ────────────────────────────────────────────────────────

  const Divider = () => (
    <div style={{ width: 1, height: 24, background: '#e0e0e0', flexShrink: 0, margin: '0 4px' }} />
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#ffffff',
          display: 'block',
          touchAction: 'none',
          // eraser: cursor:none (custom circle overlay takes over)
          // move: grab/grabbing depending on whether we're mid-drag
          // text: text caret; everything else: crosshair for precision
          cursor:
            tool === 'eraser'
              ? 'none'
              : tool === 'move'
                ? isPanning
                  ? 'grabbing'
                  : 'grab'
                : tool === 'text'
                  ? 'text'
                  : 'crosshair',
        }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerLeave={pointerLeave}
      />

      {/* ── Floating toolbar ──────────────────────────────────────────── */}
      {/* maxWidth + overflowX: hidden scrollbar on narrow screens (toolbar-scroll class) */}
      <div
        data-toolbar
        className="toolbar-scroll"
        style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'calc(100vw - 32px)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px',
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          userSelect: 'none',
          overflowX: 'auto',
        }}
      >
        {/* Drawing tools */}
        <PillBtn active={tool === 'pen'} onClick={() => setTool('pen')} title="Pen (P)">
          <IconPen />
        </PillBtn>
        <PillBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} title="Eraser (E)">
          <IconEraser />
        </PillBtn>
        <PillBtn active={tool === 'line'} onClick={() => setTool('line')} title="Line (L)">
          <IconLine />
        </PillBtn>
        <PillBtn active={tool === 'rect'} onClick={() => setTool('rect')} title="Rectangle (R)">
          <IconRect />
        </PillBtn>
        <PillBtn active={tool === 'circle'} onClick={() => setTool('circle')} title="Ellipse (E)">
          <IconCircle />
        </PillBtn>
        <PillBtn active={tool === 'text'} onClick={() => setTool('text')} title="Text (T)">
          <IconText />
        </PillBtn>
        <PillBtn
          active={tool === 'geom'}
          onClick={() => {
            setTool('geom');
            setShowShapes((v) => !v);
          }}
          title="Shapes"
        >
          <IconShapes />
        </PillBtn>
        <PillBtn active={tool === 'move'} onClick={() => setTool('move')} title="Move / Pan (V)">
          <IconMove />
        </PillBtn>

        <Divider />

        {/* Paste image button — triggers clipboard read via Clipboard API */}
        <PillBtn onClick={pasteFromClipboard} title="Paste image (Ctrl+V)">
          <IconPaste />
        </PillBtn>
        {/* PDF import button — opens panel with preset exams + file picker */}
        <PillBtn
          active={showPdfPanel}
          onClick={() => setShowPdfPanel((v) => !v)}
          title="Import PDF"
        >
          {pdfLoading ? (
            // Inline loading spinner while PDF renders
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          ) : (
            <IconPdf />
          )}
        </PillBtn>

        <Divider />

        {/* Color dot — opens the palette panel */}
        <button
          data-toolbar
          title="Color & size"
          onClick={() => setShowColorPanel((v) => !v)}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Dot shows the current color */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: color,
              border: '2px solid #ccc',
              boxSizing: 'border-box',
            }}
          />
        </button>

        <Divider />

        {/* History */}
        <PillBtn disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
          <IconUndo />
        </PillBtn>
        <PillBtn disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y)">
          <IconRedo />
        </PillBtn>

        {/* Navigation buttons — only rendered when the parent provides the callbacks */}
        {(onOpenSubiecte || onOpenFormulas) && <Divider />}
        {onOpenSubiecte && (
          <PillBtn onClick={onOpenSubiecte} title="Subiecte EN VIII (2022–2026)">
            <IconSubiecte />
          </PillBtn>
        )}
        {onOpenFormulas && (
          <PillBtn onClick={onOpenFormulas} title="Formule matematice (IX–XII)">
            <IconFormulas />
          </PillBtn>
        )}

        <Divider />

        {/* ── Share button ─────────────────────────────────────────────────
            Creates a new board (or shows the existing link) for collaborative
            drawing. A green live-dot appears on the button when a board is
            active to indicate collaborative mode.                            */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PillBtn
            active={showSharePanel}
            onClick={boardId ? () => setShowSharePanel((v) => !v) : createAndJoinBoard}
            title={boardId ? 'Link tablă colaborativă' : 'Creează tablă colaborativă'}
          >
            <IconShare />
          </PillBtn>
          {/* Green dot: collaborative mode is active */}
          {boardId && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                border: '1.5px solid #fff',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* ── Login / Avatar button ────────────────────────────────────────
            Shows a person icon when logged out; shows the Google avatar
            (or initial) when logged in. Clicking the avatar logs out.       */}
        {!authUser ? (
          <PillBtn onClick={loginWithGoogle} title="Login cu Google (opțional)">
            <IconUser />
          </PillBtn>
        ) : (
          <button
            onClick={logout}
            title={`${authUser.displayName ?? authUser.email} — Click pentru logout`}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              padding: 3,
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {authUser.photoURL ? (
              <img
                src={authUser.photoURL}
                referrerPolicy="no-referrer"
                style={{ width: 32, height: 32, borderRadius: '50%' }}
                alt={authUser.displayName ?? 'avatar'}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#4f46e5',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {(authUser.displayName ?? authUser.email ?? 'U')[0].toUpperCase()}
              </div>
            )}
          </button>
        )}
      </div>

      {/* ── Color & size panel ────────────────────────────────────────────
          Appears below the toolbar when the color dot is clicked.
          Clicking the canvas (pointerDown calls closePopovers) dismisses it. */}
      {showColorPanel && (
        <div
          data-panel
          style={{
            position: 'fixed',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            zIndex: 20,
            userSelect: 'none',
          }}
        >
          {/* Preset palette */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 224 }}>
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: c === color ? '3px solid #555' : '2px solid #ddd',
                  background: c,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  transition: 'border 0.1s',
                }}
              />
            ))}
            {/* Native color picker — extends palette with any custom color */}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Custom color"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                cursor: 'pointer',
                border: 'none',
                padding: 0,
              }}
            />
          </div>

          {/* Stroke size selector */}
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontFamily: 'sans-serif' }}>
              Stroke size
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {PEN_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setPenSize(s)}
                  title={`${s}px`}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: s === penSize ? '2px solid #555' : '1px solid #ddd',
                    background: s === penSize ? '#f5f5f5' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {/* Visual dot sized proportionally to stroke width */}
                  <div
                    style={{
                      width: s,
                      height: s,
                      borderRadius: '50%',
                      background: '#333',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Share panel ───────────────────────────────────────────────────
          Appears when the share button is clicked while in collaborative mode.
          Shows the shareable URL and a copy button.                          */}
      {showSharePanel && boardId && (
        <div
          data-panel
          style={{
            position: 'fixed',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '18px 20px',
            zIndex: 20,
            minWidth: 300,
            maxWidth: 'calc(100vw - 32px)',
            userSelect: 'none',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            {/* Live green dot */}
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#22c55e',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
              Tablă colaborativă activă
            </span>
            <button
              onClick={() => setShowSharePanel(false)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#888',
                fontSize: 16,
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              ✕
            </button>
          </div>

          {/* URL row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              readOnly
              value={getShareUrl()}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 12,
                fontFamily: 'monospace',
                background: '#f5f5f5',
                color: '#333',
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(getShareUrl()).then(() => {
                  setCopyLabel('Copiat! ✓');
                  setTimeout(() => setCopyLabel('Copiază'), 2000);
                });
              }}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#1a1a1a',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              {copyLabel}
            </button>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            Trimite link-ul oricui vrei să deseneze împreună cu tine.
            <br />
            Nu e nevoie de cont pentru a participa.
          </p>
        </div>
      )}

      {/* ── Hidden file input for PDF disk import ───────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadPDF(f);
          e.target.value = ''; // reset so the same file can be re-selected
        }}
      />

      {/* ── PDF panel ─────────────────────────────────────────────────────
          Two sections: open from disk + list of preset exam PDFs.
          Each exam has a Subiect and optional Barem button. */}
      {showPdfPanel && (
        <div
          data-panel
          style={{
            position: 'fixed',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '12px 14px',
            zIndex: 20,
            maxHeight: '70vh',
            overflowY: 'auto',
            userSelect: 'none',
            minWidth: 260,
          }}
        >
          {/* Open from disk */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #ddd',
              background: '#f9f9f9',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'sans-serif',
              marginBottom: 10,
              textAlign: 'left',
            }}
          >
            📂 Deschide de pe disc…
          </button>

          {/* Divider */}
          <div style={{ fontSize: 11, color: '#888', fontFamily: 'sans-serif', marginBottom: 6 }}>
            Subiecte EN VIII
          </div>

          {/* Preset exam list */}
          {SUBIECTE.map((s) => (
            <div key={s.subiectUrl} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <button
                onClick={() => loadPDF(s.subiectUrl)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'sans-serif',
                  textAlign: 'left',
                }}
              >
                {s.label}
              </button>
              {s.baremUrl && (
                <button
                  onClick={() => loadPDF(s.baremUrl!)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: '#666',
                    fontFamily: 'sans-serif',
                  }}
                >
                  Barem
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Shapes panel ─────────────────────────────────────────────────
          Grid of shape thumbnails grouped by category. Each button selects
          the shape and starts drawing. ShapeIcon renders a mini-canvas preview. */}
      {showShapes && (
        <div
          data-panel
          style={{
            position: 'fixed',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '12px 16px',
            zIndex: 20,
            maxHeight: '70vh',
            overflowY: 'auto',
            userSelect: 'none',
            minWidth: 280,
          }}
        >
          {SHAPE_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 12 }}>
              <div
                style={{ fontSize: 11, color: '#888', marginBottom: 6, fontFamily: 'sans-serif' }}
              >
                {group.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.shapes.map(({ kind, label }) => (
                  <button
                    key={kind}
                    title={label}
                    onClick={() => {
                      setActiveGeom(kind);
                      setShowShapes(false);
                    }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      border: activeGeom === kind ? '2px solid #555' : '1px solid #ddd',
                      background: activeGeom === kind ? '#f5f5f5' : '#fff',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShapeIcon kind={kind} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Custom eraser cursor ─────────────────────────────────────────
          A translucent circle that follows the pointer when the eraser is active.
          The canvas itself uses cursor:none so only this circle is visible. */}
      {tool === 'eraser' && eraserPos && (
        <div
          style={{
            position: 'fixed',
            left: eraserPos.x - ERASER_RADIUS,
            top: eraserPos.y - ERASER_RADIUS,
            width: ERASER_RADIUS * 2,
            height: ERASER_RADIUS * 2,
            borderRadius: '50%',
            border: '2px solid #ef4444',
            background: 'rgba(239,68,68,0.08)',
            pointerEvents: 'none', // don't intercept pointer events
            zIndex: 5,
          }}
        />
      )}

      {/* Text input overlay */}
      {textCursor && (
        <input
          autoFocus
          value={textCursor.value}
          onChange={(e) => setTextCursor({ ...textCursor, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitText(textCursor);
            }
            if (e.key === 'Escape') setTextCursor(null);
          }}
          onBlur={() => commitText(textCursor)}
          style={{
            position: 'fixed',
            left: textCursor.sx,
            top: textCursor.sy,
            fontSize: TEXT_FONT_SIZE,
            fontFamily: 'sans-serif',
            color: colorRef.current,
            background: 'transparent',
            border: 'none',
            outline: '1px dashed #888',
            padding: '2px 4px',
            minWidth: 80,
            zIndex: 10,
            caretColor: colorRef.current,
          }}
        />
      )}

      {/* ── Zoom controls — right edge ────────────────────────────────────
          Vertical pill: zoom-in button, zoom % label, zoom-out button,
          divider, reset-view (home) button. */}
      <div
        style={{
          position: 'fixed',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '8px 6px',
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          userSelect: 'none',
          zIndex: 10,
        }}
      >
        <PillBtn onClick={zoomIn} title="Zoom in (+)">
          <IconZoomIn />
        </PillBtn>
        {/* Zoom percentage label — updates via zoom state */}
        <div
          style={{
            fontSize: 11,
            color: '#555',
            fontFamily: 'sans-serif',
            padding: '4px 0',
            minWidth: 36,
            textAlign: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
        <PillBtn onClick={zoomOut} title="Zoom out (-)">
          <IconZoomOut />
        </PillBtn>
        <div style={{ width: 20, height: 1, background: '#e0e0e0', margin: '4px 0' }} />
        <PillBtn onClick={resetView} title="Reset view (0)">
          <IconHome />
        </PillBtn>
      </div>
    </>
  );
}

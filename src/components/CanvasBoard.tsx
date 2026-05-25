import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeomKind, GeomItem, SHAPE_GROUPS, drawGeom, drawGeomPreview } from '../shapes';

// ─── Types ────────────────────────────────────────────────────────────────────

type PenTool = 'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'text' | 'geom' | 'move';

type Point = { x: number; y: number };

interface PenItem {
  kind: 'pen';
  color: string;
  width: number;
  points: Point[];
}

interface ShapeItem {
  kind: 'line' | 'rect' | 'circle';
  color: string;
  width: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TextItem {
  kind: 'text';
  color: string;
  fontSize: number;
  x: number;
  y: number;
  content: string;
}

type DrawItem = PenItem | ShapeItem | TextItem | GeomItem;

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

export default function CanvasBoard(): JSX.Element {
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

  // ── History ──────────────────────────────────────────────────────────────

  function commit(next: DrawItem[]) {
    undoRef.current = [...undoRef.current, itemsRef.current];
    redoRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    setItems(next);
  }

  // useCallback gives undo/redo a stable reference so the keydown useEffect
  // can list them as deps without re-subscribing on every render
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
        undoRef.current = [...undoRef.current, preEraseSnapshotRef.current];
        redoRef.current = [];
        setCanUndo(true);
        setCanRedo(false);
        setItems(itemsRef.current); // trigger React re-render with final state
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
      <div
        data-toolbar
        style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px',
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          userSelect: 'none',
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

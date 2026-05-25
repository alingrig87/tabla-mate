import React, { useRef, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

// Tools available — toolbar UI added in commit 07
type PenTool = 'pen' | 'line' | 'rect' | 'circle';

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

// DrawItem union grows with each feature commit
type DrawItem = PenItem | ShapeItem;

// Live preview while dragging a shape (not committed yet)
interface ShapePreview {
  kind: 'line' | 'rect' | 'circle';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
  }
  ctx.restore();
}

// Draw a dashed ghost preview while the user is dragging a shape
function drawShapePreview(
  ctx: CanvasRenderingContext2D,
  s: ShapePreview,
  color: string,
  width: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([6, 4]); // dashed line: 6px dash, 4px gap
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

// Clear + redraw all items, with optional live preview overlay
function redrawAll(
  ctx: CanvasRenderingContext2D,
  items: DrawItem[],
  preview?: { shape: ShapePreview; color: string; width: number }
) {
  ctx.save();
  ctx.resetTransform();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  items.forEach((item) => drawItem(ctx, item));
  if (preview) drawShapePreview(ctx, preview.shape, preview.color, preview.width);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PEN_COLOR = '#1a1a1a';
const PEN_WIDTH = 3;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CanvasBoard(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tool state — setTool wired to toolbar buttons in commit 07
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tool, setTool] = useState<PenTool>('pen');
  const toolRef = useRef<PenTool>('pen');
  // Keep ref in sync so pointer events always see the current tool
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const isDrawingRef = useRef(false);
  const currentPenRef = useRef<PenItem | null>(null);
  const startRef = useRef<Point>({ x: 0, y: 0 }); // drag start for shapes

  const [items, setItems] = useState<DrawItem[]>([]);
  const itemsRef = useRef<DrawItem[]>([]);

  // ── Canvas init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      canvas.getContext('2d')!.scale(dpr, dpr);
      redrawAll(canvas.getContext('2d')!, itemsRef.current);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    itemsRef.current = items;
    redrawAll(canvasRef.current!.getContext('2d')!, items);
  }, [items]);

  function getCtx() {
    return canvasRef.current!.getContext('2d')!;
  }

  function commit(next: DrawItem[]) {
    setItems(next);
  }

  // ── Pointer events ────────────────────────────────────────────────────────

  function getPos(e: React.PointerEvent): Point {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function pointerDown(e: React.PointerEvent) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    const t = toolRef.current;

    if (t === 'pen') {
      currentPenRef.current = { kind: 'pen', color: PEN_COLOR, width: PEN_WIDTH, points: [pos] };
    } else {
      // For all shape tools, just record the start position
      startRef.current = pos;
    }
  }

  function pointerMove(e: React.PointerEvent) {
    if (!isDrawingRef.current) return;
    const pos = getPos(e);
    const t = toolRef.current;

    if (t === 'pen') {
      if (!currentPenRef.current) return;
      currentPenRef.current.points.push(pos);
      const pts = currentPenRef.current.points;
      const prev = pts[pts.length - 2];
      if (!prev) return;
      const ctx = getCtx();
      ctx.save();
      ctx.strokeStyle = PEN_COLOR;
      ctx.lineWidth = PEN_WIDTH;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
    } else if (t === 'line' || t === 'rect' || t === 'circle') {
      // Redraw everything + dashed preview so user sees the shape while dragging
      redrawAll(getCtx(), itemsRef.current, {
        shape: { kind: t, x1: startRef.current.x, y1: startRef.current.y, x2: pos.x, y2: pos.y },
        color: PEN_COLOR,
        width: PEN_WIDTH,
      });
    }
  }

  function pointerUp(e: React.PointerEvent) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const pos = getPos(e);
    const t = toolRef.current;

    if (t === 'pen') {
      if (!currentPenRef.current) return;
      const stroke = currentPenRef.current;
      currentPenRef.current = null;
      commit([...itemsRef.current, stroke]);
    } else if (t === 'line' || t === 'rect' || t === 'circle') {
      const { x: x1, y: y1 } = startRef.current;
      // Ignore tiny drags (accidental clicks)
      if (Math.abs(pos.x - x1) < 3 && Math.abs(pos.y - y1) < 3) {
        redrawAll(getCtx(), itemsRef.current); // clear preview
        return;
      }
      commit([
        ...itemsRef.current,
        { kind: t, color: PEN_COLOR, width: PEN_WIDTH, x1, y1, x2: pos.x, y2: pos.y },
      ]);
    }
  }

  return (
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
        cursor: tool === 'pen' ? 'crosshair' : 'crosshair',
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerLeave={pointerUp}
    />
  );
}

import React, { useRef, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Point = { x: number; y: number };

interface PenItem {
  kind: 'pen';
  color: string;
  width: number;
  points: Point[];
}

// DrawItem is a discriminated union — will grow in later commits
type DrawItem = PenItem;

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
  }
  ctx.restore();
}

// Clear the canvas and redraw all items from scratch.
// This is the "source of truth" render: canvas = f(items).
function redrawAll(ctx: CanvasRenderingContext2D, items: DrawItem[]) {
  ctx.save();
  ctx.resetTransform();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  items.forEach((item) => drawItem(ctx, item));
}

// ─── Component ────────────────────────────────────────────────────────────────

// Hardcoded pen settings for now — color picker added in commit 08
const PEN_COLOR = '#1a1a1a';
const PEN_WIDTH = 3;

export default function CanvasBoard(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Drawing state (refs, not state, to avoid stale closures in events) ───
  const isDrawingRef = useRef(false);
  const currentPenRef = useRef<PenItem | null>(null);

  // ── Item list: state drives React re-renders; ref gives instant access ───
  const [items, setItems] = useState<DrawItem[]>([]);
  const itemsRef = useRef<DrawItem[]>([]);

  // ── Canvas init: HiDPI scaling + resize handler ──────────────────────────
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

  // Sync items → itemsRef and re-render canvas whenever items state changes
  useEffect(() => {
    itemsRef.current = items;
    redrawAll(canvasRef.current!.getContext('2d')!, items);
  }, [items]);

  // ── History helpers ───────────────────────────────────────────────────────

  // Commit a new version of the item list (undo stack added in commit 09)
  function commit(next: DrawItem[]) {
    setItems(next);
  }

  // ── Pointer events ────────────────────────────────────────────────────────

  function getPos(e: React.PointerEvent): Point {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function pointerDown(e: React.PointerEvent) {
    // Capture the pointer so we keep receiving events even if cursor leaves canvas
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    currentPenRef.current = { kind: 'pen', color: PEN_COLOR, width: PEN_WIDTH, points: [pos] };
  }

  function pointerMove(e: React.PointerEvent) {
    if (!isDrawingRef.current || !currentPenRef.current) return;
    const pos = getPos(e);
    currentPenRef.current.points.push(pos);

    // Draw only the latest segment (efficient: no full redraw while dragging)
    const pts = currentPenRef.current.points;
    const prev = pts[pts.length - 2];
    if (!prev) return;
    const ctx = canvasRef.current!.getContext('2d')!;
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
  }

  function pointerUp() {
    if (!isDrawingRef.current || !currentPenRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentPenRef.current;
    currentPenRef.current = null;
    // Add completed stroke to the persistent item list
    commit([...itemsRef.current, stroke]);
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
        cursor:
          "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><text y='22' font-size='22'>✏️</text></svg>\") 2 22, crosshair",
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerLeave={pointerUp}
    />
  );
}

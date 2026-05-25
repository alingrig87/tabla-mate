import React, { useRef, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PenTool = 'pen' | 'line' | 'rect' | 'circle' | 'text';

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

type DrawItem = PenItem | ShapeItem | TextItem;

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
  preview?: { shape: ShapePreview; color: string; width: number }
) {
  ctx.save();
  ctx.resetTransform();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  items.forEach((item) => drawItem(ctx, item));
  if (preview) drawShapePreview(ctx, preview.shape, preview.color, preview.width);
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

// Shared SVG props: no fill, stroke inherits text color, rounded caps
const IC = {
  strokeWidth: 2,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

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

const PEN_COLOR = '#1a1a1a';
const PEN_WIDTH = 3;
const TEXT_FONT_SIZE = 24;

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

  // Undo/redo stacks — wired to buttons below; keyboard shortcuts in commit 09
  const undoRef = useRef<DrawItem[][]>([]);
  const redoRef = useRef<DrawItem[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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

  // ── History helpers ──────────────────────────────────────────────────────

  function commit(next: DrawItem[]) {
    undoRef.current = [...undoRef.current, itemsRef.current];
    redoRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    setItems(next);
  }

  function undo() {
    if (!undoRef.current.length) return;
    const prev = undoRef.current[undoRef.current.length - 1];
    redoRef.current = [...redoRef.current, itemsRef.current];
    undoRef.current = undoRef.current.slice(0, -1);
    setCanUndo(undoRef.current.length > 0);
    setCanRedo(true);
    setItems(prev);
  }

  function redo() {
    if (!redoRef.current.length) return;
    const next = redoRef.current[redoRef.current.length - 1];
    undoRef.current = [...undoRef.current, itemsRef.current];
    redoRef.current = redoRef.current.slice(0, -1);
    setCanUndo(true);
    setCanRedo(redoRef.current.length > 0);
    setItems(next);
  }

  // ── Pointer helpers ────────────────────────────────────────────────────────

  function getScreenPos(e: React.PointerEvent): Point {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function getPos(e: React.PointerEvent): Point {
    return getScreenPos(e);
  }

  // ── Text helpers ─────────────────────────────────────────────────────────

  function commitText(tc: TextCursor) {
    if (tc.value.trim()) {
      commit([
        ...itemsRef.current,
        {
          kind: 'text',
          color: PEN_COLOR,
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

  function pointerDown(e: React.PointerEvent) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const t = toolRef.current;

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
      currentPenRef.current = { kind: 'pen', color: PEN_COLOR, width: PEN_WIDTH, points: [pos] };
    } else {
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
      if (Math.abs(pos.x - x1) < 3 && Math.abs(pos.y - y1) < 3) {
        redrawAll(getCtx(), itemsRef.current);
        return;
      }
      commit([
        ...itemsRef.current,
        { kind: t, color: PEN_COLOR, width: PEN_WIDTH, x1, y1, x2: pos.x, y2: pos.y },
      ]);
    }
  }

  // ── Divider between toolbar groups ────────────────────────────────────────

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
          cursor: tool === 'text' ? 'text' : 'crosshair',
        }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerLeave={pointerUp}
      />

      {/* ── Floating toolbar ──────────────────────────────────────────────
          Centered at the top of the screen.
          position: fixed + left: 50% + translateX(-50%) = horizontal center.
          All children have flexShrink: 0 so the bar never collapses. */}
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

        <Divider />

        {/* History */}
        <PillBtn disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
          <IconUndo />
        </PillBtn>
        <PillBtn disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y)">
          <IconRedo />
        </PillBtn>
      </div>

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
            color: PEN_COLOR,
            background: 'transparent',
            border: 'none',
            outline: '1px dashed #888',
            padding: '2px 4px',
            minWidth: 80,
            zIndex: 10,
            caretColor: PEN_COLOR,
          }}
        />
      )}
    </>
  );
}

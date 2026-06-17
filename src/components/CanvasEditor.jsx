import { useState, useEffect, useRef } from 'react';

// ── Typy karteczek ────────────────────────────────────────────────────────────
const CARD_TYPES = [
  { type: 'event',     label: 'Zdarzenie',    color: '#fdba74', dark: '#7c2d12' },
  { type: 'command',   label: 'Komenda',      color: '#93c5fd', dark: '#1e3a5f' },
  { type: 'policy',    label: 'Polityka',     color: '#c4b5fd', dark: '#4c1d95' },
  { type: 'aggregate', label: 'Agregat',      color: '#fef08a', dark: '#713f12' },
  { type: 'readmodel', label: 'Read model',   color: '#86efac', dark: '#14532d' },
  { type: 'external',  label: 'Zewn. system', color: '#fbcfe8', dark: '#831843' },
  { type: 'actor',     label: 'Aktor',        color: '#fde68a', dark: '#78350f' },
  { type: 'hotspot',   label: 'Hotspot',      color: '#fca5a5', dark: '#7f1d1d' },
];

const FRAME_COLORS = ['#dbeafe88', '#fef9c388', '#dcfce788', '#fce7f388', '#ede9fe88', '#ffedd588'];

function cardType(type) {
  return CARD_TYPES.find(c => c.type === type) ?? CARD_TYPES[0];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const NODE_W = 148;
const NODE_H = 148;

// ── Główny komponent ──────────────────────────────────────────────────────────
export default function CanvasEditor({ canvas, episodeId, onChange }) {
  const [nodes, setNodes]     = useState(() => canvas?.nodes  ?? []);
  const [frames, setFrames]   = useState(() => canvas?.frames ?? []);
  const [selected, setSelected] = useState(null);   // { id, kind: 'node'|'frame' }
  const [editing, setEditing]   = useState(null);   // node id being text-edited
  const [drag, setDrag]         = useState(null);
  const [resizing, setResizing] = useState(null);
  const containerRef = useRef(null);
  const nodesRef  = useRef(nodes);
  const framesRef = useRef(frames);
  nodesRef.current  = nodes;
  framesRef.current = frames;

  // Sync gdy zmienia się epizod
  useEffect(() => {
    setNodes(canvas?.nodes  ?? []);
    setFrames(canvas?.frames ?? []);
    setSelected(null);
    setEditing(null);
    setDrag(null);
    setResizing(null);
  }, [episodeId]);

  function emit(n, f) {
    onChange({ nodes: n ?? nodesRef.current, frames: f ?? framesRef.current });
  }

  // ── Centrum widocznego obszaru ────────────────────────────────────────────
  function viewCenter() {
    const el = containerRef.current;
    if (!el) return { cx: 600, cy: 400 };
    return { cx: el.scrollLeft + el.clientWidth / 2, cy: el.scrollTop + el.clientHeight / 2 };
  }

  // ── Dodawanie ─────────────────────────────────────────────────────────────
  function addNode(type) {
    const { cx, cy } = viewCenter();
    const ct = cardType(type);
    const n = {
      id: uid(), type, text: ct.label,
      x: cx - NODE_W / 2 + (Math.random() - .5) * 80,
      y: cy - NODE_H / 2 + (Math.random() - .5) * 80,
    };
    const next = [...nodesRef.current, n];
    setNodes(next);
    emit(next, null);
    setSelected({ id: n.id, kind: 'node' });
    setEditing(n.id);
  }

  function addFrame() {
    const { cx, cy } = viewCenter();
    const color = FRAME_COLORS[framesRef.current.length % FRAME_COLORS.length];
    const f = {
      id: uid(), label: 'Swimlane',
      x: cx - 220, y: cy - 120,
      w: 440, h: 240, color,
    };
    const next = [...framesRef.current, f];
    setFrames(next);
    emit(null, next);
    setSelected({ id: f.id, kind: 'frame' });
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.kind === 'node') {
      const next = nodesRef.current.filter(n => n.id !== selected.id);
      setNodes(next); emit(next, null);
    } else {
      const next = framesRef.current.filter(f => f.id !== selected.id);
      setFrames(next); emit(null, next);
    }
    setSelected(null); setEditing(null);
  }

  // ── Drag / resize globalne event listeners ────────────────────────────────
  useEffect(() => {
    if (!drag && !resizing) return;

    function onMove(e) {
      const dx = e.clientX - (drag ?? resizing).startX;
      const dy = e.clientY - (drag ?? resizing).startY;

      if (drag) {
        if (drag.kind === 'node') {
          setNodes(prev => prev.map(n =>
            n.id === drag.id ? { ...n, x: drag.origX + dx, y: drag.origY + dy } : n
          ));
        } else {
          setFrames(prev => prev.map(f =>
            f.id === drag.id ? { ...f, x: drag.origX + dx, y: drag.origY + dy } : f
          ));
        }
      }

      if (resizing) {
        if (resizing.kind === 'frame') {
          setFrames(prev => prev.map(f =>
            f.id === resizing.id
              ? { ...f, w: Math.max(120, resizing.origW + dx), h: Math.max(80, resizing.origH + dy) }
              : f
          ));
        }
      }
    }

    function onUp() {
      emit(null, null);
      setDrag(null);
      setResizing(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, resizing]);

  // ── Klawiatura ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) deleteSelected();
      if (e.key === 'Escape') { setSelected(null); setEditing(null); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function startDragNode(e, node) {
    if (editing === node.id) return;
    e.preventDefault();
    setDrag({ id: node.id, kind: 'node', startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y });
    setSelected({ id: node.id, kind: 'node' });
  }

  function startDragFrame(e, frame) {
    e.preventDefault();
    setDrag({ id: frame.id, kind: 'frame', startX: e.clientX, startY: e.clientY, origX: frame.x, origY: frame.y });
    setSelected({ id: frame.id, kind: 'frame' });
  }

  function startResize(e, frame) {
    e.stopPropagation();
    e.preventDefault();
    setResizing({ id: frame.id, kind: 'frame', startX: e.clientX, startY: e.clientY, origW: frame.w, origH: frame.h });
  }

  function updateNodeText(id, text) {
    const next = nodesRef.current.map(n => n.id === id ? { ...n, text } : n);
    setNodes(next);
  }

  function finishEdit(id) {
    setEditing(null);
    emit(null, null);
  }

  function updateFrameLabel(id, label) {
    const next = framesRef.current.map(f => f.id === id ? { ...f, label } : f);
    setFrames(next);
    emit(null, next);
  }

  const isDragging = !!drag || !!resizing;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        paddingBottom: 14, borderBottom: '1px solid #e5e7eb', marginBottom: 14,
      }}>
        {CARD_TYPES.map(ct => (
          <button
            key={ct.type}
            onClick={() => addNode(ct.type)}
            title={`Dodaj: ${ct.label}`}
            style={{
              padding: '5px 11px', borderRadius: 7,
              border: `1.5px solid ${ct.color}`,
              background: ct.color, color: ct.dark,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,.1)',
              transition: 'transform .1s, box-shadow .1s',
              lineHeight: 1.4,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.1)'; }}
          >+ {ct.label}</button>
        ))}

        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 2px' }} />

        <button
          onClick={addFrame}
          style={{
            padding: '5px 13px', borderRadius: 7,
            border: '1.5px dashed #94a3b8', background: '#f8fafc',
            color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'all .1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#64748b'; }}
        >⬜ Ramka</button>

        {selected && (
          <>
            <div style={{ flex: 1 }} />
            <button
              onClick={deleteSelected}
              style={{
                padding: '5px 13px', borderRadius: 7,
                border: '1.5px solid #fca5a5', background: '#fff1f2',
                color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >✕ Usuń</button>
          </>
        )}
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          cursor: isDragging ? 'grabbing' : 'default',
          minHeight: 520,
          position: 'relative',
        }}
        onClick={() => { setSelected(null); setEditing(null); }}
      >
        <div
          style={{
            position: 'relative',
            width: 3000,
            height: 2000,
            pointerEvents: isDragging ? 'none' : 'auto',
          }}
        >

          {/* Ramki — pod spodem */}
          {frames.map(frame => {
            const isSel = selected?.id === frame.id;
            return (
              <div
                key={frame.id}
                style={{
                  position: 'absolute',
                  left: frame.x, top: frame.y,
                  width: frame.w, height: frame.h,
                  background: frame.color ?? '#dbeafe88',
                  border: isSel ? '2px solid #4f46e5' : '1.5px solid rgba(0,0,0,.13)',
                  borderRadius: 14,
                  boxSizing: 'border-box',
                  zIndex: 1,
                  pointerEvents: 'all',
                }}
                onPointerDown={e => { e.stopPropagation(); startDragFrame(e, frame); }}
                onClick={e => e.stopPropagation()}
              >
                {/* Nazwa swimlane */}
                <input
                  value={frame.label}
                  onChange={e => updateFrameLabel(frame.id, e.target.value)}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 10, left: 14,
                    background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,.38)',
                    cursor: 'text', width: 'calc(100% - 28px)',
                    letterSpacing: .3,
                  }}
                />

                {/* Uchwyt resizowania */}
                <div
                  onPointerDown={e => { e.stopPropagation(); startResize(e, frame); }}
                  style={{
                    position: 'absolute', bottom: 5, right: 5,
                    width: 18, height: 18,
                    cursor: 'se-resize',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(0,0,0,.25)', fontSize: 14, userSelect: 'none',
                    pointerEvents: 'all',
                  }}
                >⤡</div>
              </div>
            );
          })}

          {/* Karteczki — nad ramkami */}
          {nodes.map(node => {
            const ct = cardType(node.type);
            const isSel = selected?.id === node.id;
            const isEd  = editing === node.id;
            // deterministyczny minimalny obrót per karteczka
            const rot = (parseInt(node.id, 36) % 5 - 2) * 1.4;

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.x, top: node.y,
                  width: NODE_W, minHeight: NODE_H,
                  background: ct.color,
                  borderRadius: 3,
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  boxShadow: isSel
                    ? `0 0 0 2.5px #4f46e5, 0 8px 24px rgba(0,0,0,.22)`
                    : `2px 4px 14px rgba(0,0,0,.17)`,
                  transform: `rotate(${isEd || isSel ? 0 : rot}deg)`,
                  transition: 'box-shadow .12s, transform .15s',
                  cursor: isDragging && isSel ? 'grabbing' : 'grab',
                  zIndex: isSel ? 20 : 5,
                  userSelect: 'none',
                  pointerEvents: 'all',
                }}
                onPointerDown={e => { e.stopPropagation(); startDragNode(e, node); }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  setEditing(node.id);
                  setSelected({ id: node.id, kind: 'node' });
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Typ karteczki */}
                <div style={{
                  fontSize: 9, fontWeight: 800, color: ct.dark,
                  opacity: .55, marginBottom: 7,
                  textTransform: 'uppercase', letterSpacing: .6,
                }}>
                  {ct.label}
                </div>

                {isEd ? (
                  <textarea
                    autoFocus
                    value={node.text}
                    onChange={e => updateNodeText(node.id, e.target.value)}
                    onBlur={() => finishEdit(node.id)}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: '100%', background: 'transparent',
                      border: 'none', outline: 'none', resize: 'none',
                      fontSize: 13, fontWeight: 600, color: ct.dark,
                      lineHeight: 1.45, minHeight: 88,
                      fontFamily: 'inherit', cursor: 'text',
                    }}
                    rows={5}
                  />
                ) : (
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: ct.dark,
                    lineHeight: 1.45, wordBreak: 'break-word',
                    minHeight: 88, pointerEvents: 'none',
                  }}>
                    {node.text || (
                      <span style={{ opacity: .4, fontStyle: 'italic', fontWeight: 400 }}>
                        2× klik aby edytować
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Podpowiedź */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
        Przeciągnij karteczki i ramki &nbsp;·&nbsp; 2× klik = edycja tekstu &nbsp;·&nbsp; Delete = usuń zaznaczone
      </div>
    </div>
  );
}

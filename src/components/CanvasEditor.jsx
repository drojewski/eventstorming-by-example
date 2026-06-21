import { useState, useEffect, useRef } from 'react';

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

// Odległość punktu od odcinka
function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Punkt na krawędzi węzła w kierunku `toward`
function edgePt(center, toward, offset) {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: center.x + (dx / dist) * offset, y: center.y + (dy / dist) * offset };
}

const NODE_W  = 148;
const NODE_H  = 148;
const EDGE_OFF = NODE_W / 2 + 4;

export default function CanvasEditor({ canvas, episodeId, onChange }) {
  const [nodes,  setNodes]  = useState(() => canvas?.nodes  ?? []);
  const [frames, setFrames] = useState(() => canvas?.frames ?? []);
  const [arrows, setArrows] = useState(() => canvas?.arrows ?? []);
  const [selected,  setSelected]  = useState(null);  // { id, kind: 'node'|'frame'|'arrow' }
  const [editing,   setEditing]   = useState(null);  // node id
  const [drag,      setDrag]      = useState(null);
  const [resizing,  setResizing]  = useState(null);
  const [arrowMode, setArrowMode] = useState(false);
  const [arrowFrom, setArrowFrom] = useState(null);  // source node id

  const containerRef = useRef(null);
  const nodesRef  = useRef(nodes);
  const framesRef = useRef(frames);
  const arrowsRef = useRef(arrows);
  nodesRef.current  = nodes;
  framesRef.current = frames;
  arrowsRef.current = arrows;

  useEffect(() => {
    setNodes(canvas?.nodes  ?? []);
    setFrames(canvas?.frames ?? []);
    setArrows(canvas?.arrows ?? []);
    setSelected(null); setEditing(null);
    setDrag(null); setResizing(null);
    setArrowMode(false); setArrowFrom(null);
  }, [episodeId]);

  function emit(n, f, a) {
    onChange({
      nodes:  n ?? nodesRef.current,
      frames: f ?? framesRef.current,
      arrows: a ?? arrowsRef.current,
    });
  }

  function viewCenter() {
    const el = containerRef.current;
    if (!el) return { cx: 600, cy: 400 };
    return { cx: el.scrollLeft + el.clientWidth / 2, cy: el.scrollTop + el.clientHeight / 2 };
  }

  function clientToCanvas(clientX, clientY) {
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left + el.scrollLeft, y: clientY - rect.top + el.scrollTop };
  }

  // ── Dodawanie ────────────────────────────────────────────────────────────────
  function addNode(type) {
    const { cx, cy } = viewCenter();
    const ct = cardType(type);
    const n = {
      id: uid(), type, text: ct.label,
      x: cx - NODE_W / 2 + (Math.random() - .5) * 80,
      y: cy - NODE_H / 2 + (Math.random() - .5) * 80,
    };
    const next = [...nodesRef.current, n];
    setNodes(next); emit(next, null, null);
    setSelected({ id: n.id, kind: 'node' });
    setEditing(n.id);
  }

  function addFrame() {
    const { cx, cy } = viewCenter();
    const color = FRAME_COLORS[framesRef.current.length % FRAME_COLORS.length];
    const f = { id: uid(), label: '', x: cx - 180, y: cy - 100, w: 360, h: 220, color };
    const next = [...framesRef.current, f];
    setFrames(next); emit(null, next, null);
    setSelected({ id: f.id, kind: 'frame' });
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.kind === 'node') {
      const nextN = nodesRef.current.filter(n => n.id !== selected.id);
      const nextA = arrowsRef.current.filter(a => a.fromId !== selected.id && a.toId !== selected.id);
      setNodes(nextN); setArrows(nextA); emit(nextN, null, nextA);
    } else if (selected.kind === 'frame') {
      const next = framesRef.current.filter(f => f.id !== selected.id);
      setFrames(next); emit(null, next, null);
    } else if (selected.kind === 'arrow') {
      const next = arrowsRef.current.filter(a => a.id !== selected.id);
      setArrows(next); emit(null, null, next);
    }
    setSelected(null); setEditing(null);
  }

  // ── Tryb strzałki ─────────────────────────────────────────────────────────────
  function handleNodeClick(nodeId) {
    if (!arrowMode) return;
    if (!arrowFrom) {
      setArrowFrom(nodeId);
    } else if (arrowFrom !== nodeId) {
      const arrow = { id: uid(), fromId: arrowFrom, toId: nodeId, waypoints: [] };
      const next = [...arrowsRef.current, arrow];
      setArrows(next); emit(null, null, next);
      setArrowFrom(null); setArrowMode(false);
      setSelected({ id: arrow.id, kind: 'arrow' });
    }
  }

  // ── Helpers ścieżek ───────────────────────────────────────────────────────────
  function nodeCenter(nodeId) {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return null;
    const w = node.w ?? NODE_W;
    const h = node.h ?? NODE_H;
    return { x: node.x + w / 2, y: node.y + h / 2 };
  }

  function buildArrowPath(arrow) {
    const sn = nodesRef.current.find(n => n.id === arrow.fromId);
    const tn = nodesRef.current.find(n => n.id === arrow.toId);
    if (!sn || !tn) return null;
    const sc = { x: sn.x + (sn.w ?? NODE_W) / 2, y: sn.y + (sn.h ?? NODE_H) / 2 };
    const tc = { x: tn.x + (tn.w ?? NODE_W) / 2, y: tn.y + (tn.h ?? NODE_H) / 2 };
    const wps = arrow.waypoints || [];
    const firstRef = wps.length > 0 ? wps[0] : tc;
    const lastRef  = wps.length > 0 ? wps[wps.length - 1] : sc;
    const srcOff = Math.min(sn.w ?? NODE_W, sn.h ?? NODE_H) / 2 + 4;
    const tgtOff = Math.min(tn.w ?? NODE_W, tn.h ?? NODE_H) / 2 + 8;
    const src = edgePt(sc, firstRef, srcOff);
    const tgt = edgePt(tc, lastRef,  tgtOff);
    const pts = [src, ...wps, tgt];
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  function addWaypoint(arrow, clientX, clientY) {
    const { x, y } = clientToCanvas(clientX, clientY);
    const sc = nodeCenter(arrow.fromId);
    const tc = nodeCenter(arrow.toId);
    if (!sc || !tc) return;
    const wps = arrow.waypoints || [];
    const pts = [sc, ...wps, tc];
    let insertIdx = 0, minD = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment({ x, y }, pts[i], pts[i + 1]);
      if (d < minD) { minD = d; insertIdx = i; }
    }
    const newWps = [...wps];
    newWps.splice(insertIdx, 0, { x, y });
    const next = arrowsRef.current.map(a => a.id === arrow.id ? { ...a, waypoints: newWps } : a);
    setArrows(next); emit(null, null, next);
  }

  // ── Drag / resize ─────────────────────────────────────────────────────────────
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
        } else if (drag.kind === 'frame') {
          setFrames(prev => prev.map(f =>
            f.id === drag.id ? { ...f, x: drag.origX + dx, y: drag.origY + dy } : f
          ));
        } else if (drag.kind === 'waypoint') {
          setArrows(prev => prev.map(a =>
            a.id === drag.arrowId
              ? { ...a, waypoints: a.waypoints.map((wp, i) =>
                  i === drag.wpIdx ? { x: drag.origX + dx, y: drag.origY + dy } : wp
                )}
              : a
          ));
        }
      }

      if (resizing?.kind === 'frame') {
        setFrames(prev => prev.map(f =>
          f.id === resizing.id
            ? { ...f, w: Math.max(40, resizing.origW + dx), h: Math.max(40, resizing.origH + dy) }
            : f
        ));
      }
      if (resizing?.kind === 'node') {
        setNodes(prev => prev.map(n =>
          n.id === resizing.id
            ? { ...n, w: Math.max(48, resizing.origW + dx), h: Math.max(36, resizing.origH + dy) }
            : n
        ));
      }
    }

    function onUp() {
      emit(null, null, null);
      setDrag(null); setResizing(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, resizing]);

  // ── Klawiatura ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) deleteSelected();
      if (e.key === 'Escape') {
        setSelected(null); setEditing(null);
        setArrowMode(false); setArrowFrom(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  // ── Helpers interakcji ────────────────────────────────────────────────────────
  function startDragNode(e, node) {
    if (editing === node.id || arrowMode) return;
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
    e.stopPropagation(); e.preventDefault();
    setResizing({ id: frame.id, kind: 'frame', startX: e.clientX, startY: e.clientY, origW: frame.w, origH: frame.h });
  }

  function startResizeNode(e, node) {
    e.stopPropagation(); e.preventDefault();
    setResizing({ id: node.id, kind: 'node', startX: e.clientX, startY: e.clientY, origW: node.w ?? NODE_W, origH: node.h ?? NODE_H });
    setSelected({ id: node.id, kind: 'node' });
  }

  function updateNodeText(id, text) {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
  }

  function finishEdit() { setEditing(null); emit(null, null, null); }

  function updateFrameLabel(id, label) {
    const next = framesRef.current.map(f => f.id === id ? { ...f, label } : f);
    setFrames(next); emit(null, next, null);
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

        <button
          onClick={() => { setArrowMode(m => !m); setArrowFrom(null); setSelected(null); }}
          style={{
            padding: '5px 13px', borderRadius: 7,
            border: arrowMode ? '1.5px solid #4f46e5' : '1.5px solid #94a3b8',
            background: arrowMode ? '#eef2ff' : '#f8fafc',
            color: arrowMode ? '#4f46e5' : '#64748b',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          → Strzałka{arrowMode ? (arrowFrom ? ' · wybierz cel' : ' · wybierz źródło') : ''}
        </button>

        {selected && !arrowMode && (
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
          cursor: isDragging ? 'grabbing' : arrowMode ? 'crosshair' : 'default',
          minHeight: 520,
          position: 'relative',
        }}
        onClick={() => {
          if (arrowMode) { setArrowMode(false); setArrowFrom(null); }
          else { setSelected(null); setEditing(null); }
        }}
      >
        <div style={{
          position: 'relative',
          width: 3000, height: 2000,
          pointerEvents: isDragging ? 'none' : 'auto',
        }}>

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
                <input
                  value={frame.label}
                  onChange={e => updateFrameLabel(frame.id, e.target.value)}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                  placeholder="Nazwa ramki…"
                  style={{
                    position: 'absolute', top: 10, left: 14,
                    background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,.38)',
                    cursor: 'text', width: 'calc(100% - 28px)',
                    letterSpacing: .3,
                  }}
                />
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

          {/* SVG — strzałki (pod karteczkami) */}
          <svg
            style={{
              position: 'absolute', top: 0, left: 0,
              width: 3000, height: 2000,
              overflow: 'visible', zIndex: 4,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <marker id="ah"     markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#475569" />
              </marker>
              <marker id="ah-sel" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#4f46e5" />
              </marker>
            </defs>

            {arrows.map(arrow => {
              const d = buildArrowPath(arrow);
              if (!d) return null;
              const isSel = selected?.id === arrow.id;
              const wps   = arrow.waypoints || [];
              return (
                <g key={arrow.id}>
                  {/* Gruba przezroczysta ścieżka do klikania */}
                  <path
                    d={d} stroke="transparent" strokeWidth={18} fill="none"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={e => {
                      e.stopPropagation();
                      if (selected?.id === arrow.id) {
                        addWaypoint(arrow, e.clientX, e.clientY);
                      } else {
                        setSelected({ id: arrow.id, kind: 'arrow' });
                      }
                    }}
                  />
                  {/* Widoczna ścieżka */}
                  <path
                    d={d}
                    stroke={isSel ? '#4f46e5' : '#475569'}
                    strokeWidth={isSel ? 2.5 : 1.8}
                    fill="none"
                    markerEnd={isSel ? 'url(#ah-sel)' : 'url(#ah)'}
                    strokeDasharray={isSel ? '7 3' : undefined}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Punkty gięcia */}
                  {wps.map((wp, i) => (
                    <circle
                      key={i}
                      cx={wp.x} cy={wp.y} r={6}
                      fill="white"
                      stroke={isSel ? '#4f46e5' : '#94a3b8'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'all', cursor: 'move' }}
                      onPointerDown={e => {
                        e.stopPropagation(); e.preventDefault();
                        setSelected({ id: arrow.id, kind: 'arrow' });
                        setDrag({
                          kind: 'waypoint', arrowId: arrow.id, wpIdx: i,
                          startX: e.clientX, startY: e.clientY,
                          origX: wp.x, origY: wp.y,
                        });
                      }}
                    />
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Karteczki — nad ramkami i strzałkami */}
          {nodes.map(node => {
            const ct = cardType(node.type);
            const isSel = selected?.id === node.id;
            const isEd  = editing === node.id;
            const rot   = (parseInt(node.id, 36) % 5 - 2) * 1.4;
            const isArrowSrc = arrowMode && arrowFrom === node.id;

            const nw = node.type === 'actor' ? (node.w ?? NODE_W) : NODE_W;
            const nh = node.type === 'actor' ? (node.h ?? NODE_H) : NODE_H;

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.x, top: node.y,
                  width: nw, minHeight: nh,
                  background: ct.color,
                  borderRadius: 3,
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  boxShadow: isArrowSrc
                    ? `0 0 0 3px #4f46e5, 0 0 0 6px #a5b4fc88, 0 8px 24px rgba(0,0,0,.22)`
                    : isSel
                      ? `0 0 0 2.5px #4f46e5, 0 8px 24px rgba(0,0,0,.22)`
                      : `2px 4px 14px rgba(0,0,0,.17)`,
                  transform: `rotate(${isEd || isSel ? 0 : rot}deg)`,
                  transition: 'box-shadow .12s, transform .15s',
                  cursor: arrowMode ? 'crosshair' : (isDragging && isSel ? 'grabbing' : 'grab'),
                  zIndex: isSel ? 20 : 5,
                  userSelect: 'none',
                  pointerEvents: 'all',
                }}
                onPointerDown={e => { e.stopPropagation(); startDragNode(e, node); }}
                onDoubleClick={e => {
                  if (arrowMode) return;
                  e.stopPropagation();
                  setEditing(node.id);
                  setSelected({ id: node.id, kind: 'node' });
                }}
                onClick={e => { e.stopPropagation(); handleNodeClick(node.id); }}
              >
                {node.type !== 'aggregate' && (
                  <div style={{
                    fontSize: 9, fontWeight: 800, color: ct.dark,
                    opacity: .55, marginBottom: 7,
                    textTransform: 'uppercase', letterSpacing: .6,
                  }}>
                    {ct.label}
                  </div>
                )}

                {isEd ? (
                  <textarea
                    autoFocus
                    value={node.text}
                    onChange={e => updateNodeText(node.id, e.target.value)}
                    onBlur={finishEdit}
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
                {node.type === 'actor' && !isEd && (
                  <div
                    onPointerDown={e => startResizeNode(e, node)}
                    style={{
                      position: 'absolute', bottom: 3, right: 3,
                      width: 14, height: 14,
                      cursor: 'se-resize',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: ct.dark, opacity: .3, fontSize: 11, userSelect: 'none',
                    }}
                  >⤡</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Podpowiedź */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
        {arrowMode
          ? <span style={{ color: '#4f46e5', fontWeight: 600 }}>
              {arrowFrom ? 'Kliknij karteczkę docelową' : 'Kliknij karteczkę źródłową'} &nbsp;·&nbsp; Esc = anuluj
            </span>
          : <>
              Przeciągnij karteczki i ramki &nbsp;·&nbsp; 2× klik = edycja &nbsp;·&nbsp; Delete = usuń
              &nbsp;·&nbsp; Strzałka: klik = zaznacz, klik zaznaczonej = dodaj punkt gięcia, przeciągnij punkt = zgiij
            </>
        }
      </div>
    </div>
  );
}

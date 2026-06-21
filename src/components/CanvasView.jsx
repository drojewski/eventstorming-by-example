import { useRef, useEffect, useState } from 'react';

const CARD_TYPES = {
  event:     { color: '#fdba74', dark: '#7c2d12', label: 'Zdarzenie'    },
  command:   { color: '#93c5fd', dark: '#1e3a5f', label: 'Komenda'      },
  policy:    { color: '#c4b5fd', dark: '#4c1d95', label: 'Polityka'     },
  aggregate: { color: '#fef08a', dark: '#713f12', label: 'Agregat'      },
  readmodel: { color: '#86efac', dark: '#14532d', label: 'Read model'   },
  external:  { color: '#fbcfe8', dark: '#831843', label: 'Zewn. system' },
  actor:     { color: '#fde68a', dark: '#78350f', label: 'Aktor'        },
  hotspot:   { color: '#fca5a5', dark: '#7f1d1d', label: 'Hotspot'      },
};

function cardType(type) {
  return CARD_TYPES[type] ?? CARD_TYPES.event;
}

const NODE_W = 148;
const NODE_H = 148;
const PADDING = 48;

export default function CanvasView({ canvas }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const nodes  = canvas?.nodes  ?? [];
  const frames = canvas?.frames ?? [];
  const arrows = canvas?.arrows ?? [];

  // Oblicz bounding box wszystkich elementów
  const elements = [
    ...nodes.map(n => ({ x: n.x, y: n.y, x2: n.x + NODE_W, y2: n.y + NODE_H })),
    ...frames.map(f => ({ x: f.x, y: f.y, x2: f.x + f.w, y2: f.y + f.h })),
  ];

  const minX = elements.length ? Math.min(...elements.map(e => e.x))  - PADDING : 0;
  const minY = elements.length ? Math.min(...elements.map(e => e.y))  - PADDING : 0;
  const maxX = elements.length ? Math.max(...elements.map(e => e.x2)) + PADDING : 800;
  const maxY = elements.length ? Math.max(...elements.map(e => e.y2)) + PADDING : 600;
  const contentW = maxX - minX;
  const contentH = maxY - minY;

  useEffect(() => {
    function recalc() {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const s = Math.min(1, containerW / contentW);
      setScale(s);
      setOffsetX(-minX);
      setOffsetY(-minY);
    }
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [minX, minY, contentW]);

  function edgePt(center, toward, offset) {
    const dx = toward.x - center.x, dy = toward.y - center.y;
    const dist = Math.hypot(dx, dy) || 1;
    return { x: center.x + (dx / dist) * offset, y: center.y + (dy / dist) * offset };
  }

  function buildArrowPath(arrow) {
    const sn = nodes.find(n => n.id === arrow.fromId);
    const tn = nodes.find(n => n.id === arrow.toId);
    if (!sn || !tn) return null;
    const sc = { x: sn.x + NODE_W / 2, y: sn.y + NODE_H / 2 };
    const tc = { x: tn.x + NODE_W / 2, y: tn.y + NODE_H / 2 };
    const wps = arrow.waypoints || [];
    const src = edgePt(sc, wps.length > 0 ? wps[0] : tc, NODE_W / 2 + 4);
    const tgt = edgePt(tc, wps.length > 0 ? wps[wps.length - 1] : sc, NODE_W / 2 + 12);
    const pts = [src, ...wps, tgt];
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x + offsetX).toFixed(1)},${(p.y + offsetY).toFixed(1)}`).join(' ');
  }

  if (nodes.length === 0 && frames.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
        <p>Brak modelu — stwórz go w panelu admina</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 12,
        background: '#f8fafc',
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Skalowany obszar canvasu */}
      <div
        style={{
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          width: contentW,
          height: contentH,
          position: 'relative',
        }}
      >
        {/* Ramki */}
        {frames.map(frame => (
          <div
            key={frame.id}
            style={{
              position: 'absolute',
              left: frame.x + offsetX,
              top:  frame.y + offsetY,
              width: frame.w,
              height: frame.h,
              background: frame.color ?? '#dbeafe88',
              border: '1.5px solid rgba(0,0,0,.12)',
              borderRadius: 14,
              boxSizing: 'border-box',
              zIndex: 1,
            }}
          >
            <div style={{
              position: 'absolute', top: 10, left: 14,
              fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,.38)',
              letterSpacing: .3, userSelect: 'none',
            }}>
              {frame.label}
            </div>
          </div>
        ))}

        {/* Strzałki */}
        {arrows.length > 0 && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: contentW, height: contentH, overflow: 'visible', zIndex: 4, pointerEvents: 'none' }}>
            <defs>
              <marker id="vah" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#475569" />
              </marker>
            </defs>
            {arrows.map(arrow => {
              const d = buildArrowPath(arrow);
              return d ? (
                <path key={arrow.id} d={d} stroke="#475569" strokeWidth={1.8} fill="none" markerEnd="url(#vah)" />
              ) : null;
            })}
          </svg>
        )}

        {/* Karteczki */}
        {nodes.map(node => {
          const ct = cardType(node.type);
          const rot = (parseInt(node.id, 36) % 5 - 2) * 1.4;
          const nw = node.type === 'actor' ? (node.w ?? NODE_W) : NODE_W;
          const nh = node.type === 'actor' ? (node.h ?? NODE_H) : NODE_H;
          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: node.x + offsetX,
                top:  node.y + offsetY,
                width: nw,
                minHeight: nh,
                background: ct.color,
                borderRadius: 3,
                padding: '10px 12px',
                boxSizing: 'border-box',
                boxShadow: '2px 4px 14px rgba(0,0,0,.17)',
                transform: `rotate(${rot}deg)`,
                zIndex: 5,
                userSelect: 'none',
              }}
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
              <div style={{
                fontSize: 13, fontWeight: 600, color: ct.dark,
                lineHeight: 1.45, wordBreak: 'break-word',
              }}>
                {node.text}
              </div>
            </div>
          );
        })}
      </div>
      {/* wysokość kontenera dopasowana do przeskalowanej zawartości */}
      <div style={{ height: contentH * scale }} />
    </div>
  );
}

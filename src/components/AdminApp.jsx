import { useState, useEffect, useRef } from 'react';
import CanvasEditor from './CanvasEditor.jsx';

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Aktorzy ──────────────────────────────────────────────────────────────────
const ACTORS = [
  { role: 'ekspert',   name: 'Ekspert biznesowy',  emoji: '👨‍💼', color: '#4f46e5', align: 'left'  },
  { role: 'analityk',  name: 'Analityk biznesowy', emoji: '🕵️',  color: '#b45309', align: 'right' },
  { role: 'analityk2', name: 'Analityk 2',         emoji: '🧑‍💻', color: '#0f766e', align: 'right' },
];

function actor(role) {
  return ACTORS.find(a => a.role === role) ?? ACTORS[0];
}

// ── Textarea która rośnie automatycznie ──────────────────────────────────────
function AutoTextarea({ value, onChange, placeholder, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = ref.current.scrollHeight + 'px';
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      spellCheck={false}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: 'inherit',
        ...style,
      }}
    />
  );
}

// ── Karta notatki ─────────────────────────────────────────────────────────────
function NoteCard({ ann, quote, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(ann.note);

  function confirm() { onUpdate(val); setEditing(false); }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      {/* Przerywana strzałka */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, width: 36, marginTop: 14 }}>
        <div style={{ flex: 1, borderTop: '1.5px dashed #94a3b8' }} />
        <div style={{ width: 0, height: 0, border: '4px solid transparent', borderLeft: '6px solid #94a3b8' }} />
      </div>
      {/* Kartka notatki */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: 10, padding: '8px 12px',
        boxShadow: '0 1px 4px rgba(0,0,0,.07)',
        maxWidth: 340,
      }}>
        <div style={{ fontSize: 12, fontStyle: 'italic', color: '#92400e', marginBottom: 5, lineHeight: 1.4 }}>
          „{quote}"
        </div>
        {editing ? (
          <div style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
            <input
              autoFocus
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') { setVal(ann.note); setEditing(false); } }}
              style={{
                flex: 1, fontSize: 14, padding: '4px 8px',
                border: '1px solid #fbbf24', borderRadius: 6,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={confirm}
              style={{ padding: '3px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
            >✓</button>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.5, marginBottom: 5 }}>
            {ann.note}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={() => setEditing(v => !v)}
            style={{ fontSize: 12, color: '#a16207', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}
          >✎</button>
          <button onClick={onDelete}
            style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}
          >✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Jedna chmurka dialogu ─────────────────────────────────────────────────────
function Bubble({ entry, onChange, onDelete, onUp, onDown, isFirst, isLast }) {
  const [hover, setHover]           = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [pending, setPending]       = useState(null);
  const [noteInput, setNoteInput]   = useState('');
  const textRef      = useRef(null);
  const annotatingRef = useRef(false);  // zawsze aktualny, unika stale closure

  const a           = actor(entry.role);
  const left        = a.align === 'left';
  const annotations = entry.annotations || [];

  // Synchronizuj ref ze stanem
  useEffect(() => { annotatingRef.current = annotating; }, [annotating]);

  // document-level mouseup – niezależny od struktury drzewa DOM
  useEffect(() => {
    function onMouseUp() {
      if (!annotatingRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const container = textRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) return;
      try {
        const pre = document.createRange();
        pre.selectNodeContents(container);
        pre.setEnd(range.startContainer, range.startOffset);
        const start = pre.toString().length;
        const text  = sel.toString();
        if (!text.trim()) return;
        setPending({ start, end: start + text.length, text });
        setNoteInput('');
      } catch (_) {}
    }
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);  // tylko mount/unmount – ref zawsze aktualny

  function confirmNote() {
    if (!pending || !noteInput.trim()) return;
    const ann = { id: uid(), start: pending.start, end: pending.end, note: noteInput.trim() };
    onChange({ ...entry, annotations: [...annotations, ann] });
    setPending(null); setNoteInput('');
    window.getSelection()?.removeAllRanges();
  }

  function renderAnnotatedText() {
    const text   = entry.text;
    const sorted = [...annotations].sort((a, b) => a.start - b.start);
    if (!sorted.length) return <>{text}</>;
    const parts = []; let pos = 0;
    for (const ann of sorted) {
      if (ann.start > pos) parts.push({ mark: false, content: text.slice(pos, ann.start) });
      parts.push({ mark: true, content: text.slice(ann.start, ann.end) });
      pos = ann.end;
    }
    if (pos < text.length) parts.push({ mark: false, content: text.slice(pos) });
    return (
      <>
        {parts.map((p, i) => p.mark
          ? <mark key={i} style={{ background: 'rgba(253,224,71,.55)', borderRadius: 2, padding: '0 1px', color: 'inherit' }}>{p.content}</mark>
          : p.content
        )}
      </>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ marginBottom: 28 }}
    >
      {/* ── Główny rząd: avatar + chmurka + akcje ── */}
      <div style={{
        display: 'flex',
        flexDirection: left ? 'row' : 'row-reverse',
        alignItems: 'flex-end',
        gap: 14,
      }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: a.color + '18', border: `2px solid ${a.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, lineHeight: 1,
          }}>{a.emoji}</div>
          <select
            value={entry.role}
            onChange={e => { const b = actor(e.target.value); onChange({ ...entry, role: b.role, name: b.name, avatar: b.emoji }); }}
            style={{
              fontSize: 10, border: `1px solid ${a.color}55`, borderRadius: 4,
              padding: '1px 2px', background: '#fff', color: '#666',
              cursor: 'pointer', width: 58, textAlign: 'center',
            }}
          >
            {ACTORS.map(b => <option key={b.role} value={b.role}>{b.name.split(' ')[0]}</option>)}
          </select>
        </div>

        {/* Chmurka */}
        <div style={{ maxWidth: '72%', position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: 14,
            ...(left ? { left: -8, borderRight: `9px solid ${a.color}` } : { right: -8, borderLeft: `9px solid ${a.color}` }),
            width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent',
          }} />
          <div style={{
            background: a.color,
            borderRadius: left ? '4px 20px 20px 20px' : '20px 4px 20px 20px',
            padding: '16px 22px',
            boxShadow: annotating ? `0 0 0 2px #fff, 0 0 0 4px ${a.color}` : '0 2px 10px rgba(0,0,0,.18)',
            transition: 'box-shadow .15s',
          }}>
            {annotating ? (
              <div
                ref={textRef}
                style={{
                  color: '#fff', fontSize: 15, lineHeight: 1.6, minWidth: 260,
                  userSelect: 'text', cursor: 'text',
                }}
              >
                {renderAnnotatedText()}
              </div>
            ) : (
              <AutoTextarea
                value={entry.text}
                onChange={e => onChange({ ...entry, text: e.target.value })}
                placeholder="Wpisz kwestię…"
                style={{ color: '#fff', caretColor: '#fff', fontSize: 15, minWidth: 260 }}
              />
            )}
          </div>
        </div>

        {/* Akcje */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          opacity: hover ? 1 : 0, transition: 'opacity .15s', paddingBottom: 4,
        }}>
          <button
            onClick={() => { setAnnotating(v => !v); setPending(null); }}
            title={annotating ? 'Wyjdź z trybu adnotacji' : 'Tryb adnotacji'}
            style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none',
              background: annotating ? '#4f46e5' : '#f3f4f6',
              color: annotating ? '#fff' : '#6366f1',
              cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✎</button>
          {[
            { label: '↑', action: onUp,    disabled: isFirst, color: '#6366f1' },
            { label: '↓', action: onDown,  disabled: isLast,  color: '#6366f1' },
            { label: '✕', action: onDelete, disabled: false,   color: '#ef4444' },
          ].map(({ label, action, disabled, color }) => (
            <button key={label} onClick={action} disabled={disabled} style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none',
              background: '#f3f4f6', color: disabled ? '#d1d5db' : color,
              cursor: disabled ? 'default' : 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Podpowiedź w trybie adnotacji ── */}
      {annotating && !pending && (
        <div style={{
          marginTop: 6, marginLeft: left ? 58 : 0, marginRight: left ? 0 : 58,
          fontSize: 11, color: '#64748b', textAlign: 'center',
          background: '#f1f5f9', borderRadius: 6, padding: '4px 10px',
          border: '1px dashed #cbd5e1',
        }}>
          Zaznacz fragment tekstu w chmurce, aby dodać notatkę
        </div>
      )}

      {/* ── Formularz nowej notatki po zaznaczeniu ── */}
      {annotating && pending && (
        <div style={{
          marginTop: 8, marginLeft: left ? 58 : 0, marginRight: left ? 0 : 58,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: '#fffbeb',
          border: '1px dashed #fbbf24', borderRadius: 10,
        }}>
          <span style={{
            fontSize: 11, color: '#92400e', fontStyle: 'italic',
            flexShrink: 0, maxWidth: 160, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>„{pending.text}"</span>
          <span style={{ color: '#d1d5db', flexShrink: 0 }}>→</span>
          <input
            autoFocus
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmNote(); if (e.key === 'Escape') setPending(null); }}
            placeholder="Wpisz notatkę…"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 7,
              border: '1px solid #fbbf24', outline: 'none',
              fontSize: 13, fontFamily: 'inherit',
            }}
          />
          <button onClick={confirmNote} style={{
            padding: '6px 12px', background: '#f59e0b', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Dodaj</button>
          <button onClick={() => setPending(null)} style={{
            padding: '4px 8px', background: 'none', color: '#9ca3af',
            border: 'none', fontSize: 13, cursor: 'pointer',
          }}>✕</button>
        </div>
      )}

      {/* ── Notatki z przerywanymi strzałkami ── */}
      {annotations.length > 0 && (
        <div style={{
          marginTop: 8, marginLeft: left ? 58 : 0, marginRight: left ? 0 : 58,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {annotations.map(ann => (
            <NoteCard
              key={ann.id}
              ann={ann}
              quote={entry.text.slice(ann.start, ann.end)}
              onDelete={() => onChange({ ...entry, annotations: annotations.filter(a => a.id !== ann.id) })}
              onUpdate={note => onChange({ ...entry, annotations: annotations.map(a => a.id === ann.id ? { ...a, note } : a) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edytor dialogów ───────────────────────────────────────────────────────────
function DialogueEditor({ dialogue, onChange }) {
  const bottomRef = useRef(null);

  function add(role) {
    const a = actor(role);
    const next = [...dialogue, { role, name: a.name, avatar: a.emoji, text: '' }];
    onChange(next);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function smartAdd() {
    const last = dialogue[dialogue.length - 1]?.role ?? 'analityk';
    add(last === 'ekspert' ? 'analityk' : 'ekspert');
  }

  function update(i, v) { const n = [...dialogue]; n[i] = v; onChange(n); }
  function remove(i) { onChange(dialogue.filter((_, j) => j !== i)); }
  function moveUp(i) {
    if (i === 0) return;
    const n = [...dialogue]; [n[i-1], n[i]] = [n[i], n[i-1]]; onChange(n);
  }
  function moveDown(i) {
    if (i === dialogue.length - 1) return;
    const n = [...dialogue]; [n[i], n[i+1]] = [n[i+1], n[i]]; onChange(n);
  }

  return (
    <div>
      {dialogue.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 14 }}>Brak kwestii — dodaj pierwszą poniżej</div>
        </div>
      )}

      {dialogue.map((entry, i) => (
        <Bubble
          key={i}
          entry={entry}
          onChange={v => update(i, v)}
          onDelete={() => remove(i)}
          onUp={() => moveUp(i)}
          onDown={() => moveDown(i)}
          isFirst={i === 0}
          isLast={i === dialogue.length - 1}
        />
      ))}

      <div ref={bottomRef} />

      {/* Przyciski dodawania */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, marginTop: 8 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 12 }}>
          Dodaj kwestię
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {ACTORS.map(a => (
            <button
              key={a.role}
              onClick={() => add(a.role)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 10,
                border: 'none', background: a.color,
                color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                transition: 'opacity .1s, transform .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span>{a.emoji}</span> {a.name.split(' ')[0]}
            </button>
          ))}
          <button
            onClick={smartAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 10,
              border: '1.5px solid #e5e7eb', background: '#fff',
              color: '#6b7280', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'background .1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            ⚡ Auto
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edytor modelu (JSON) ──────────────────────────────────────────────────────
function ModelEditor({ model, episodeId, onChange }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const lastId = useRef(null);

  useEffect(() => {
    if (episodeId !== lastId.current) {
      lastId.current = episodeId;
      setText(JSON.stringify(model, null, 2));
      setError('');
    }
  }, [episodeId, model]);

  function handleChange(val) {
    setText(val);
    try { onChange(JSON.parse(val)); setError(''); }
    catch (e) { setError(e.message); }
  }

  function format() {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      onChange(parsed); setError('');
    } catch (e) { setError(e.message); }
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}>
      {/* Pasek jak edytor kodu */}
      <div style={{
        background: '#1e293b', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>model.json</span>
        </div>
        <button
          onClick={format}
          style={{
            background: '#334155', color: '#94a3b8', border: 'none',
            borderRadius: 6, padding: '4px 12px', fontSize: 12,
            cursor: 'pointer', transition: 'background .1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#475569'}
          onMouseLeave={e => e.currentTarget.style.background = '#334155'}
        >Formatuj</button>
      </div>

      {error && (
        <div style={{ background: '#450a0a', color: '#fca5a5', fontSize: 12, fontFamily: 'monospace', padding: '8px 16px' }}>
          ⚠ {error}
        </div>
      )}

      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
        style={{
          display: 'block', width: '100%', minHeight: 500,
          background: '#0f172a', color: '#4ade80',
          fontFamily: '"JetBrains Mono","Fira Code","Cascadia Code",monospace',
          fontSize: 13, lineHeight: 1.7,
          padding: 20, border: 'none', outline: 'none',
          resize: 'vertical', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ── Karta ze statystyką ───────────────────────────────────────────────────────
function StatCard({ value, label, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      padding: '16px 20px', textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? '#ef4444' : '#10b981',
      color: '#fff', padding: '12px 20px', borderRadius: 10,
      fontSize: 14, fontWeight: 500,
      boxShadow: '0 4px 16px rgba(0,0,0,.2)',
      animation: 'fadein .2s ease',
    }}>
      {msg}
    </div>
  );
}

// ── Główny komponent ──────────────────────────────────────────────────────────
export default function AdminApp() {
  const [auth, setAuth] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [selId, setSelId] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('dialogue');
  const [modelView, setModelView] = useState('canvas');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  useEffect(() => {
    if (window.location.hash === '#admin2024') { setAuth(true); loadList(); }
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  }

  async function loadList() {
    const res = await fetch('/api/episodes');
    setEpisodes(await res.json());
  }

  async function loadEpisode(id) {
    if (id === selId) return;
    setLoading(true); setSelId(id); setData(null);
    try {
      const res = await fetch(`/api/episodes/${id}`);
      setData(await res.json());
      setTab('dialogue');
    } catch { showToast('Błąd ładowania', 'error'); }
    finally { setLoading(false); }
  }

  async function save() {
    if (!selId || !data || saving) return;
    setSaving(true);
    try {
      await fetch(`/api/episodes/${selId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showToast('Zapisano ✓');
      loadList();
    } catch { showToast('Błąd zapisu!', 'error'); }
    finally { setSaving(false); }
  }

  async function create() {
    const id = prompt('ID epizodu (małe litery i myślniki, np. "moj-temat"):');
    if (!id?.trim()) return;
    const res = await fetch('/api/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id.trim() }),
    });
    const j = await res.json();
    if (j.error) { alert(j.error); return; }
    await loadList();
    loadEpisode(id.trim());
  }

  async function del(id) {
    if (!confirm(`Usunąć "${id}"?`)) return;
    await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
    loadList();
    if (selId === id) { setSelId(null); setData(null); }
  }

  useEffect(() => {
    const fn = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [selId, data, saving]);

  // ── Brak dostępu ──
  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, color: '#e2e8f0', marginBottom: 8 }}>Brak dostępu</div>
        <div style={{ fontSize: 13 }}>URL musi zawierać <code style={{ color: '#818cf8' }}>#admin2024</code></div>
      </div>
    </div>
  );

  const TABS = [
    { key: 'info',     label: 'Informacje', icon: 'ℹ️'  },
    { key: 'dialogue', label: 'Dialogi',    icon: '💬'  },
    { key: 'model',    label: 'Model',      icon: '🗂️' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      <Toast msg={toast.msg} type={toast.type} />

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: '#1e293b', borderRight: '1px solid #334155',
      }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>Event Storming</div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Panel admina</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          <button
            onClick={create}
            style={{
              width: '100%', marginBottom: 12, padding: '8px 12px',
              background: 'transparent', border: '1px dashed #475569',
              borderRadius: 8, color: '#94a3b8', fontSize: 13,
              cursor: 'pointer', textAlign: 'left', transition: 'all .1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.color = '#c7d2fe'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8'; }}
          >+ Nowy epizod</button>

          {episodes.map(ep => {
            const active = selId === ep.id;
            return (
              <div
                key={ep.id}
                onClick={() => loadEpisode(ep.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                  background: active ? '#4f46e5' : 'transparent',
                  cursor: 'pointer', transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#334155'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: active ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ep.title || ep.id}
                  </div>
                  <div style={{ fontSize: 10, color: active ? '#c7d2fe' : '#64748b', marginTop: 1 }}>
                    {ep.id}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); del(ep.id); }}
                  style={{
                    width: 20, height: 20, borderRadius: '50%', border: 'none',
                    background: 'transparent', color: active ? '#a5b4fc' : '#475569',
                    fontSize: 10, cursor: 'pointer', flexShrink: 0, marginLeft: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity .1s',
                  }}
                  className="del-btn"
                >✕</button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #334155' }}>
          <a href="/" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Aplikacja</a>
        </div>
      </aside>

      {/* ── Główna treść ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Empty state */}
        {!selId && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📖</div>
              <div style={{ fontSize: 15, color: '#6b7280' }}>Wybierz epizod z listy</div>
            </div>
          </div>
        )}

        {/* Ładowanie */}
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#9ca3af' }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '2px solid #e5e7eb', borderTopColor: '#4f46e5',
              animation: 'spin 0.7s linear infinite',
            }} />
            Ładowanie…
          </div>
        )}

        {/* Edytor */}
        {selId && !loading && data && (
          <>
            {/* Topbar */}
            <div style={{
              background: '#fff', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
              padding: '0 24px', height: 52, flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 0 }}>
                {TABS.map(({ key, label, icon }) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '0 16px', background: 'none', border: 'none',
                        borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
                        color: active ? '#4f46e5' : '#9ca3af',
                        fontWeight: active ? 600 : 400,
                        fontSize: 13, cursor: 'pointer', transition: 'color .15s',
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{icon}</span> {label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: '#d1d5db' }}>⌘S</span>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    padding: '7px 20px', background: saving ? '#6366f1' : '#4f46e5',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 1px 4px rgba(79,70,229,.3)',
                    transition: 'opacity .1s',
                    opacity: saving ? .7 : 1,
                  }}
                >
                  {saving && (
                    <div style={{
                      width: 13, height: 13, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
                  {saving ? 'Zapisuję…' : 'Zapisz'}
                </button>
              </div>
            </div>

            {/* Treść zakładki */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>

              {tab === 'info' && (
                <div style={{ maxWidth: 520 }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tytuł</label>
                    <input
                      type="text"
                      value={data.title || ''}
                      onChange={e => setData({ ...data, title: e.target.value })}
                      placeholder="Tytuł epizodu"
                      style={{
                        width: '100%', padding: '10px 14px', fontSize: 14,
                        border: '1.5px solid #e5e7eb', borderRadius: 10,
                        outline: 'none', boxSizing: 'border-box',
                        fontFamily: 'inherit', transition: 'border-color .15s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#4f46e5'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Podtytuł</label>
                    <textarea
                      value={data.subtitle || ''}
                      onChange={e => setData({ ...data, subtitle: e.target.value })}
                      placeholder="Krótki opis epizodu"
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 14px', fontSize: 14,
                        border: '1.5px solid #e5e7eb', borderRadius: 10,
                        outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                        fontFamily: 'inherit', transition: 'border-color .15s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#4f46e5'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <StatCard value={data.dialogue?.length ?? 0}       label="kwestii dialogu" color="#4f46e5" />
                    <StatCard value={data.model?.slices?.length ?? 0}  label="slices"          color="#7c3aed" />
                    <StatCard value={data.model?.hotspots?.length ?? 0} label="hotspots"       color="#b45309" />
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Plik</div>
                    <code style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>src/data/episodes/{selId}.json</code>
                  </div>
                </div>
              )}

              {tab === 'dialogue' && (
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                  <DialogueEditor
                    dialogue={data.dialogue || []}
                    onChange={d => setData({ ...data, dialogue: d })}
                  />
                </div>
              )}

              {tab === 'model' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
                  {/* Przełącznik widoku */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                      {[
                        { key: 'canvas', label: '🖼️ Kanban' },
                        { key: 'json',   label: '{ } JSON' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setModelView(key)}
                          style={{
                            padding: '5px 14px', borderRadius: 6, border: 'none',
                            background: modelView === key ? '#fff' : 'transparent',
                            color: modelView === key ? '#1e293b' : '#94a3b8',
                            fontWeight: modelView === key ? 600 : 400,
                            fontSize: 12, cursor: 'pointer',
                            boxShadow: modelView === key ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                            transition: 'all .15s',
                          }}
                        >{label}</button>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {modelView === 'canvas' ? 'Drag & drop — przeciągaj karteczki i ramki' : 'Edytor JSON struktury modelu'}
                    </span>
                  </div>

                  {modelView === 'canvas' ? (
                    <CanvasEditor
                      canvas={data.canvas || { nodes: [], frames: [] }}
                      episodeId={selId}
                      onChange={c => setData({ ...data, canvas: c })}
                    />
                  ) : (
                    <ModelEditor
                      model={data.model || { slices: [], hotspots: [] }}
                      episodeId={selId}
                      onChange={m => setData({ ...data, model: m })}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        aside div:hover .del-btn { opacity: 1 !important; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

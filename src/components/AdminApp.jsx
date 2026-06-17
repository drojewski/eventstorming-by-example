import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Actor definitions
// ---------------------------------------------------------------------------
const ACTORS = [
  { role: 'ekspert',   name: 'Ekspert biznesowy',  avatar: '👨‍💼', color: 'bg-blue-100 border-blue-300',   side: 'left'  },
  { role: 'analityk',  name: 'Analityk biznesowy', avatar: '🕵️',  color: 'bg-orange-100 border-orange-300', side: 'right' },
  { role: 'analityk2', name: 'Analityk 2',         avatar: '🧑‍💻', color: 'bg-teal-100 border-teal-300',   side: 'right' },
];

function getActorInfo(role) {
  return ACTORS.find(a => a.role === role) || ACTORS[0];
}

// ---------------------------------------------------------------------------
// DialogueBubble
// ---------------------------------------------------------------------------
function DialogueBubble({ entry, index, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const actor = getActorInfo(entry.role);
  const isRight = actor.side === 'right';

  return (
    <div className={`flex gap-3 mb-4 items-start ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar + actor selector */}
      <div className="flex flex-col items-center gap-1 shrink-0 w-[72px]">
        <div className="text-3xl leading-none select-none">{actor.avatar}</div>
        <select
          value={entry.role}
          onChange={e => {
            const a = getActorInfo(e.target.value);
            onChange({ ...entry, role: e.target.value, name: a.name, avatar: a.avatar });
          }}
          className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white w-full text-center cursor-pointer"
        >
          {ACTORS.map(a => (
            <option key={a.role} value={a.role}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Speech bubble */}
      <div className={`flex-1 border-2 rounded-2xl p-3 ${actor.color}`}>
        <textarea
          value={entry.text}
          onChange={e => onChange({ ...entry, text: e.target.value })}
          className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed min-h-[64px]"
          placeholder="Wpisz kwestię dialogu…"
          rows={3}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1 shrink-0 pt-1">
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 text-base leading-none px-1 py-0.5 rounded hover:bg-red-50 transition-colors"
          title="Usuń kwestię"
        >
          ✕
        </button>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors text-sm"
          title="Przesuń w górę"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors text-sm"
          title="Przesuń w dół"
        >
          ↓
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DialogueEditor
// ---------------------------------------------------------------------------
function DialogueEditor({ dialogue, onChange }) {
  function addEntry() {
    const lastRole = dialogue.length > 0 ? dialogue[dialogue.length - 1].role : 'analityk';
    // Alternate between ekspert and analityk
    const nextRole = lastRole === 'ekspert' ? 'analityk' : 'ekspert';
    const actor = getActorInfo(nextRole);
    onChange([...dialogue, { role: nextRole, name: actor.name, avatar: actor.avatar, text: '' }]);
  }

  function updateEntry(index, updated) {
    const next = [...dialogue];
    next[index] = updated;
    onChange(next);
  }

  function deleteEntry(index) {
    onChange(dialogue.filter((_, i) => i !== index));
  }

  function moveUp(index) {
    if (index === 0) return;
    const next = [...dialogue];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index) {
    if (index === dialogue.length - 1) return;
    const next = [...dialogue];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      {dialogue.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          Brak kwestii dialogu. Kliknij poniżej, aby dodać pierwszą.
        </p>
      )}
      {dialogue.map((entry, i) => (
        <DialogueBubble
          key={i}
          entry={entry}
          index={i}
          onChange={updated => updateEntry(i, updated)}
          onDelete={() => deleteEntry(i)}
          onMoveUp={() => moveUp(i)}
          onMoveDown={() => moveDown(i)}
          isFirst={i === 0}
          isLast={i === dialogue.length - 1}
        />
      ))}
      <button
        onClick={addEntry}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm mt-2"
      >
        + Dodaj kwestię
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModelEditor
// ---------------------------------------------------------------------------
function ModelEditor({ model, episodeId, onChange }) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  // Track which episode the textarea was last initialised for so we can
  // re-seed the text when the user switches episodes without losing in-progress edits.
  const lastEpisodeId = useRef(null);

  useEffect(() => {
    if (episodeId !== lastEpisodeId.current) {
      lastEpisodeId.current = episodeId;
      setJsonText(JSON.stringify(model, null, 2));
      setError('');
    }
  }, [episodeId, model]);

  function handleChange(text) {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setError('');
      onChange(parsed);
    } catch (e) {
      setError(e.message);
    }
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setError('');
      onChange(parsed);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Model JSON</span>
        <button
          onClick={formatJson}
          className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded transition-colors"
        >
          Formatuj JSON
        </button>
      </div>
      {error && (
        <div className="text-red-500 text-xs mb-2 font-mono bg-red-50 border border-red-200 rounded px-3 py-2 break-all">
          {error}
        </div>
      )}
      <textarea
        value={jsonText}
        onChange={e => handleChange(e.target.value)}
        className={`w-full font-mono text-xs border rounded-lg p-3 min-h-[500px] focus:outline-none focus:ring-2 focus:ring-blue-300 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all text-sm">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminApp (main component)
// ---------------------------------------------------------------------------
export default function AdminApp() {
  const [authorized, setAuthorized] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);
  const [tab, setTab] = useState('info'); // 'info' | 'dialogue' | 'model'
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Hash check on mount
  useEffect(() => {
    if (window.location.hash === '#admin2024') {
      setAuthorized(true);
      fetchEpisodes();
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ------------------------------------------------------------------
  // API helpers
  // ------------------------------------------------------------------
  async function fetchEpisodes() {
    try {
      const res = await fetch('/api/episodes');
      const data = await res.json();
      setEpisodes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch episodes', e);
    }
  }

  async function loadEpisode(id) {
    setLoading(true);
    setSelectedId(id);
    setEpisodeData(null);
    setTab('info');
    try {
      const res = await fetch(`/api/episodes/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setEpisodeData(data);
    } catch (e) {
      showToast('Błąd ładowania epizodu');
    } finally {
      setLoading(false);
    }
  }

  async function saveEpisode() {
    if (!selectedId || !episodeData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/episodes/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(episodeData),
      });
      if (!res.ok) throw new Error('Save failed');
      showToast('Zapisano ✓');
      await fetchEpisodes(); // refresh sidebar titles
    } catch (e) {
      showToast('Błąd zapisu!');
    } finally {
      setSaving(false);
    }
  }

  async function createEpisode() {
    const id = prompt('ID epizodu (małe litery, cyfry, myślniki – np. "nowy-temat"):');
    if (!id) return;
    const trimmed = id.trim();
    if (!trimmed) return;

    const res = await fetch('/api/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: trimmed }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    await fetchEpisodes();
    await loadEpisode(trimmed);
  }

  async function deleteEpisode(id) {
    if (!confirm(`Usunąć epizod "${id}"? Tej operacji nie można cofnąć.`)) return;
    await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
    await fetchEpisodes();
    if (selectedId === id) {
      setSelectedId(null);
      setEpisodeData(null);
    }
  }

  // ------------------------------------------------------------------
  // Keyboard shortcut: Ctrl/Cmd+S to save
  // ------------------------------------------------------------------
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedId && episodeData && !saving) {
          saveEpisode();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, episodeData, saving]);

  // ------------------------------------------------------------------
  // Render: not authorized
  // ------------------------------------------------------------------
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-lg">Brak dostępu.</p>
          <p className="text-sm mt-1">Sprawdź URL – wymagany jest poprawny hash.</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render: authorized
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Toast message={toast} />

      <div className="flex h-screen overflow-hidden">
        {/* ---- Sidebar ---- */}
        <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="font-bold text-gray-800 text-sm">Panel admina</h1>
            <p className="text-xs text-gray-400 mt-0.5">Event Storming by Example</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <button
              onClick={createEpisode}
              className="w-full mb-3 py-2 px-3 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              + Nowy epizod
            </button>

            {episodes.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Brak epizodów</p>
            )}

            {episodes.map(ep => (
              <div
                key={ep.id}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer mb-1 transition-colors ${
                  selectedId === ep.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => loadEpisode(ep.id)}
              >
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-sm font-medium text-gray-700 truncate">
                    {ep.title || ep.id}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{ep.id}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteEpisode(ep.id); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-1 px-1.5 py-0.5 rounded hover:bg-red-50 transition-all text-sm"
                  title="Usuń epizod"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200">
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Powrót do aplikacji
            </a>
          </div>
        </aside>

        {/* ---- Main content ---- */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedId && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-4">📝</div>
                <p>Wybierz epizod z listy lub utwórz nowy</p>
              </div>
            </div>
          )}

          {selectedId && loading && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Ładowanie…</p>
            </div>
          )}

          {selectedId && !loading && episodeData && (
            <>
              {/* Top bar */}
              <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                <nav className="flex gap-1">
                  {[
                    { key: 'info',     label: 'Informacje' },
                    { key: 'dialogue', label: 'Dialogi' },
                    { key: 'model',    label: 'Model' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        tab === key
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 hidden sm:block">Ctrl+S aby zapisać</span>
                  <button
                    onClick={saveEpisode}
                    disabled={saving}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors font-medium"
                  >
                    {saving ? 'Zapisuję…' : 'Zapisz'}
                  </button>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">

                {/* INFO TAB */}
                {tab === 'info' && (
                  <div className="max-w-2xl space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tytuł
                      </label>
                      <input
                        type="text"
                        value={episodeData.title || ''}
                        onChange={e => setEpisodeData({ ...episodeData, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="Tytuł epizodu"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Podtytuł
                      </label>
                      <textarea
                        value={episodeData.subtitle || ''}
                        onChange={e => setEpisodeData({ ...episodeData, subtitle: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        rows={3}
                        placeholder="Podtytuł / krótki opis epizodu"
                      />
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Statystyki
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-2xl font-bold text-blue-600">
                            {episodeData.dialogue?.length ?? 0}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">kwestii dialogu</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-2xl font-bold text-purple-600">
                            {episodeData.model?.slices?.length ?? 0}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">slices</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-2xl font-bold text-orange-600">
                            {episodeData.model?.hotspots?.length ?? 0}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">hotspots</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        ID pliku
                      </div>
                      <code className="text-sm font-mono text-gray-700">
                        src/data/episodes/{selectedId}.json
                      </code>
                    </div>
                  </div>
                )}

                {/* DIALOGUE TAB */}
                {tab === 'dialogue' && (
                  <div className="max-w-3xl">
                    <DialogueEditor
                      dialogue={episodeData.dialogue || []}
                      onChange={d => setEpisodeData({ ...episodeData, dialogue: d })}
                    />
                  </div>
                )}

                {/* MODEL TAB */}
                {tab === 'model' && (
                  <div className="max-w-4xl">
                    <ModelEditor
                      model={episodeData.model || { slices: [], hotspots: [] }}
                      episodeId={selectedId}
                      onChange={m => setEpisodeData({ ...episodeData, model: m })}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

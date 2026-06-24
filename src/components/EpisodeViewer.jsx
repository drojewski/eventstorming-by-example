import React, { useState, useEffect } from 'react';
import { MessageSquare, GitMerge, Play } from 'lucide-react';
import DialogueView from './DialogueView.jsx';
import ModelBoard from './ModelBoard.jsx';
import CanvasView from './CanvasView.jsx';

export default function EpisodeViewer({ episode: initialEpisode, episodeId }) {
  const [episode, setEpisode] = useState(initialEpisode);
  const [view, setView] = useState('dialogue');

  useEffect(() => {
    if (!episodeId || !import.meta.env.DEV) return;
    fetch(`/api/episodes/${episodeId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setEpisode(data);
        if (data.title) document.title = `${data.title} — Event Storming by Example`;
      })
      .catch(() => {});
  }, [episodeId]);
  const [animate, setAnimate] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const play = () => {
    setView('dialogue'); setAnimate(true); setVisibleCount(0);
    let i = 0;
    const tick = () => {
      i += 1; setVisibleCount(i);
      if (i < episode.dialogue.length) setTimeout(tick, 2200);
      else setTimeout(() => setAnimate(false), 800);
    };
    setTimeout(tick, 300);
  };

  return (
    <div className="max-w-8xl mx-auto">
      <h1 className="text-2xl font-bold mt-2 mb-1">{episode.title}</h1>
      {episode.subtitle && <p className="text-gray-500 mb-6">{episode.subtitle}</p>}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setView('dialogue'); setAnimate(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${view === 'dialogue' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          <MessageSquare size={16} /> Rozmowa
        </button>
        <button onClick={() => setView('model')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${view === 'model' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}>
          <GitMerge size={16} /> Model Event Storming
        </button>
        {view === 'dialogue' && (
          <button onClick={play}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
            <Play size={16} /> Odtwórz
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm p-5 md:p-8">
        {view === 'dialogue'
          ? <DialogueView dialogue={episode.dialogue} animate={animate} visibleCount={visibleCount} />
          : (episode.canvas?.nodes?.length > 0)
            ? <CanvasView canvas={episode.canvas} />
            : <ModelBoard model={episode.model} />}
      </div>
    </div>
  );
}
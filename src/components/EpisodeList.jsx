import React, { useState, useEffect } from 'react';

export default function EpisodeList() {
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    fetch('/api/episodes', { cache: 'no-store' })
      .then(r => r.json())
      .then(setEpisodes)
      .catch(() => {});
  }, []);

  return (
    <ul className="space-y-4 max-w-2xl">
      {episodes.map(e => (
        <li key={e.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
          <a href={`/${e.id}`} className="text-blue-600 hover:underline text-lg font-medium">
            {e.title}
          </a>
          {e.subtitle && <p className="text-gray-500 text-sm mt-1">{e.subtitle}</p>}
        </li>
      ))}
    </ul>
  );
}

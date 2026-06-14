import React from 'react';

export default function DialogueView({ dialogue, animate, visibleCount }) {
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {dialogue.map((panel, i) => {
        if (animate && i >= visibleCount) return null;
        const right = panel.role === 'analityk';
        return (
          <div key={i} className={`flex w-full ${right ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-xl gap-3 items-end ${right ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex flex-col items-center shrink-0">
                <div className="text-4xl bg-white rounded-full p-1.5 shadow-sm border border-gray-200">
                  {panel.avatar}
                </div>
                <span className="text-xs font-bold mt-1 text-gray-500 text-center w-20 leading-tight">
                  {panel.name}
                </span>
              </div>
              <div className={`p-4 rounded-2xl shadow-sm border ${right ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className="text-sm md:text-base leading-relaxed text-gray-800">{panel.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
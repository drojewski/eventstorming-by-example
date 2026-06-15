import React from 'react';

// Styl per rola: strona (lewo/prawo) + kolor dymka.
// Dodanie kolejnej roli = jedna linijka tutaj + wpis w enumie schematu.
const ROLE_STYLE = {
  ekspert:   { side: 'left',  bubble: 'bg-blue-50 border-blue-200' },
  analityk:  { side: 'right', bubble: 'bg-orange-50 border-orange-200' },
  analityk2: { side: 'right', bubble: 'bg-teal-50 border-teal-200' },
};

export default function DialogueView({ dialogue, animate, visibleCount }) {
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {dialogue.map((panel, i) => {
        if (animate && i >= visibleCount) return null;
        const style = ROLE_STYLE[panel.role] || ROLE_STYLE.ekspert;
        const right = style.side === 'right';
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
              <div className={`p-4 rounded-2xl shadow-sm border ${style.bubble}`}>
                <p className="text-sm md:text-base leading-relaxed text-gray-800">{panel.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
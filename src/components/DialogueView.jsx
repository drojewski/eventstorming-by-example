import React, { useState } from 'react';

const ROLE_STYLE = {
  ekspert:   { side: 'left',  bubble: 'bg-blue-50 border-blue-200' },
  analityk:  { side: 'right', bubble: 'bg-orange-50 border-orange-200' },
  analityk2: { side: 'right', bubble: 'bg-teal-50 border-teal-200' },
};

function AnnotatedText({ text, annotations, showNotes, onToggle }) {
  if (!annotations?.length) return <>{text}</>;
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const parts = []; let pos = 0;
  for (const ann of sorted) {
    if (ann.start > pos) parts.push({ mark: false, content: text.slice(pos, ann.start) });
    parts.push({ mark: true, content: text.slice(ann.start, ann.end), id: ann.id });
    pos = ann.end;
  }
  if (pos < text.length) parts.push({ mark: false, content: text.slice(pos) });
  return (
    <>
      {parts.map((p, i) => p.mark
        ? (
          <mark
            key={i}
            onClick={onToggle}
            className="bg-yellow-200 rounded px-0.5 cursor-pointer hover:bg-yellow-300 transition-colors"
            style={{ color: 'inherit' }}
            title={showNotes ? 'Ukryj objaśnienia' : 'Pokaż objaśnienia'}
          >{p.content}</mark>
        )
        : <span key={i}>{p.content}</span>
      )}
    </>
  );
}

function NoteAnnotations({ text, annotations, right, visible }) {
  if (!annotations?.length || !visible) return null;
  return (
    <div className={`flex flex-col gap-2 mt-2 ${right ? 'items-end' : 'items-start'}`}>
      {annotations.map(ann => (
        <div key={ann.id} className="flex items-start gap-0">
          <div className="flex items-center flex-shrink-0 w-9 mt-3">
            <div className="flex-1 border-t-2 border-dashed border-slate-300" />
            <div style={{
              width: 0, height: 0,
              borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
              borderLeft: '6px solid #94a3b8',
            }} />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 max-w-xs shadow-sm">
            <p className="text-sm italic text-yellow-800 mb-1 leading-snug">„{text.slice(ann.start, ann.end)}"</p>
            <p className="text-sm text-yellow-900 leading-snug">{ann.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DialoguePanel({ panel, animate, visible }) {
  const [showNotes, setShowNotes] = useState(false);
  if (!visible) return null;

  const style = ROLE_STYLE[panel.role] || ROLE_STYLE.ekspert;
  const right = style.side === 'right';
  const annotations = panel.annotations || [];
  const hasAnnotations = annotations.length > 0;

  return (
    <div className={`flex flex-col w-full ${right ? 'items-end' : 'items-start'}`}>
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
          <p className="text-sm md:text-base leading-relaxed text-gray-800">
            <AnnotatedText
              text={panel.text}
              annotations={annotations}
              showNotes={showNotes}
              onToggle={() => setShowNotes(v => !v)}
            />
          </p>
          {hasAnnotations && (
            <button
              onClick={() => setShowNotes(v => !v)}
              className="mt-2 text-xs text-yellow-700 hover:text-yellow-900 underline underline-offset-2 transition-colors"
            >
              {showNotes ? 'Ukryj objaśnienia' : 'Pokaż objaśnienia'}
            </button>
          )}
        </div>
      </div>
      {hasAnnotations && (
        <div className={`${right ? 'pr-[72px]' : 'pl-[72px]'} mt-1`}>
          <NoteAnnotations
            text={panel.text}
            annotations={annotations}
            right={right}
            visible={showNotes}
          />
        </div>
      )}
    </div>
  );
}

export default function DialogueView({ dialogue, animate, visibleCount }) {
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {dialogue.map((panel, i) => (
        <DialoguePanel
          key={i}
          panel={panel}
          visible={!animate || i < visibleCount}
        />
      ))}
    </div>
  );
}

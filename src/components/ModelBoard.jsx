import React from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';

const STICKY = {
  event:          { bg: 'bg-orange-300', label: 'Zdarzenie' },
  command:        { bg: 'bg-blue-300',   label: 'Komenda' },
  aggregate:      { bg: 'bg-yellow-200', label: 'Agregat' },
  policy:         { bg: 'bg-purple-300', label: 'Polityka' },
  externalSystem: { bg: 'bg-pink-200',   label: 'System zewn.' },
  readModel:      { bg: 'bg-green-200',  label: 'Read model' },
  actor:          { bg: 'bg-yellow-300', label: 'Aktor' },
  hotspot:        { bg: 'bg-red-300',    label: 'Hotspot' },
};

function Sticky({ type, children, small = false, rotate = 0 }) {
  const size = small ? 'w-28 min-h-16 p-2 text-xs' : 'w-44 min-h-20 p-3 text-sm';
  return (
    <div
      className={`${STICKY[type].bg} ${size} shadow-md border border-black border-opacity-10 flex items-center justify-center text-center font-medium text-gray-900 leading-tight`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-gray-400 shrink-0 px-1">
      <ArrowRight size={20} />
    </div>
  );
}

function SliceFlow({ slice }) {
  const rotations = [-2, 1, -1, 2, 0];
  const r = (i) => rotations[i % rotations.length];
  const hasContext = slice.externalSystems?.length || slice.readModels?.length || slice.actor;
  const moreAfterTrigger =
    Boolean(hasContext) || Boolean(slice.command) || Boolean(slice.aggregate) || (slice.events?.length ?? 0) > 0;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {slice.trigger && (
        <>
          <Sticky type="event" rotate={-2}>
            {slice.trigger.text}
            {slice.trigger.note && (
              <span className="block text-xs font-normal text-gray-700 mt-1">{slice.trigger.note}</span>
            )}
          </Sticky>
          {moreAfterTrigger && <Arrow />}
        </>
      )}

      {hasContext && (
        <>
          <div className="flex flex-col gap-2 items-center">
            {slice.externalSystems?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 border border-dashed border-gray-300 rounded p-2">
                {slice.externalSystems.map((s, i) => (
                  <Sticky key={i} type="externalSystem" small rotate={r(i)}>{s}</Sticky>
                ))}
              </div>
            )}
            {slice.readModels?.map((rm, i) => (
              <Sticky key={i} type="readModel" small rotate={r(i)}>📋 {rm}</Sticky>
            ))}
            {slice.actor && <Sticky type="actor" small rotate={1}>🧍 {slice.actor}</Sticky>}
          </div>
          <Arrow />
        </>
      )}

      {slice.command && (
        <>
          <Sticky type="command" rotate={1}>{slice.command}</Sticky>
          {slice.aggregate && <Arrow />}
        </>
      )}

      {slice.aggregate && (
        <>
          <Sticky type="aggregate" rotate={-1}>
            {slice.aggregate}
            {slice.invariant && (
              <span className="block text-xs font-normal text-gray-700 mt-1 italic">⚖ {slice.invariant}</span>
            )}
          </Sticky>
          {slice.events?.length > 0 && <Arrow />}
        </>
      )}

      {slice.events?.length > 0 && (
        <div className="flex flex-col gap-2 items-center">
          {slice.events.map((e, i) => (
            <Sticky key={i} type="event" rotate={r(i)}>{e}</Sticky>
          ))}
        </div>
      )}

      {slice.policy && (
        <>
          <Arrow />
          <Sticky type="policy" rotate={1}>{slice.policy.text}</Sticky>
        </>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-600 border-t border-gray-200 pt-4">
      {Object.entries(STICKY).map(([type, { bg, label }]) => (
        <span key={type} className="flex items-center gap-1.5">
          <span className={`${bg} w-3 h-3 inline-block border border-black border-opacity-10`} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function ModelBoard({ model }) {
  return (
    <div>
      <div className="overflow-x-auto pb-4">
        <div className="flex items-center gap-2 min-w-max px-2">
          {model.slices.map((slice, i) => (
            <React.Fragment key={i}>
              <SliceFlow slice={slice} />
              {i < model.slices.length - 1 && <Arrow />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {model.hotspots?.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-3">
            <AlertTriangle size={18} /> Hotspoty — to, co wyszło w rozmowie i wymaga doprecyzowania
          </div>
          <div className="flex flex-wrap gap-3">
            {model.hotspots.map((h, i) => (
              <Sticky key={i} type="hotspot" rotate={i % 2 === 0 ? -2 : 2}>{h}</Sticky>
            ))}
          </div>
        </div>
      )}

      <Legend />
    </div>
  );
}
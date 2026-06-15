import React from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';

const STICKY = {
  event:          { bg: 'bg-orange-300', label: 'Zdarzenie' },
  command:        { bg: 'bg-blue-300',   label: 'Komenda' },
  aggregate:      { bg: 'bg-yellow-200', label: 'Niezmiennik' },
  policy:         { bg: 'bg-purple-300', label: 'Polityka' },
  externalSystem: { bg: 'bg-pink-200',   label: 'System zewn.' },
  readModel:      { bg: 'bg-green-200',  label: 'Read model' },
  actor:          { bg: 'bg-yellow-300', label: 'Aktor' },
  hotspot:        { bg: 'bg-red-300',    label: 'Hotspot' },
};

function EventGroup({ events, inline }) {
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        {events.map((e, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Arrow />}
            <Sticky type="event" rotate={i % 2 === 0 ? -1 : 1}>{e}</Sticky>
          </React.Fragment>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 items-center">
      {events.map((e, i) => (
        <Sticky key={i} type="event" rotate={i % 2 === 0 ? -1 : 1}>{e}</Sticky>
      ))}
    </div>
  );
}
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

// Pojedynczy poziomy odcinek: komenda -> agregat -> zdarzenia -> polityka.
// firstArrow steruje strzałką PRZED komendą (na początku linii zwykle jej nie chcemy).
function Segment({ node, firstArrow }) {
  return (
    <>
      {node.command && (
        <>
          {firstArrow && <Arrow />}
          <Sticky type="command" rotate={1}>{node.command}</Sticky>
        </>
      )}
      {node.aggregate && (
        <>
          <Arrow />
          <Sticky type="aggregate" rotate={-1}>
            {node.aggregate}
            {node.invariant && (
              <span className="block text-xs font-normal text-gray-700 mt-1 italic">⚖ {node.invariant}</span>
            )}
          </Sticky>
        </>
      )}
      {node.events?.length > 0 && (
              <>
                <Arrow />
                <EventGroup events={node.events} inline={node.eventsInline} />
              </>
            )}
      {node.policy && (
        <>
          <Arrow />
          <Sticky type="policy" rotate={1}>{node.policy.text}</Sticky>
        </>
      )}
    {node.branches?.length > 0 && (
            <>
              <Arrow />
              <div className="flex flex-col gap-5">
                {node.branches.map((b, bi) => (
                  <div key={bi} className="flex items-center gap-2 border-l-2 border-gray-200 pl-3">
                    <Segment node={b} firstArrow={false} />
                    {b.then?.map((s, si) => <Segment key={si} node={s} firstArrow={true} />)}
                  </div>
                ))}
              </div>
            </>
          )}
    </>
  );
}

function SliceFlow({ slice }) {
  const rotations = [-2, 1, -1, 2, 0];
  const r = (i) => rotations[i % rotations.length];
  const hasContext = slice.externalSystems?.length || slice.readModels?.length || slice.actor;
  const moreAfterTrigger =
    Boolean(hasContext) || Boolean(slice.command) || Boolean(slice.aggregate) ||
    (slice.events?.length ?? 0) > 0 || Boolean(slice.policy) ||
    (slice.then?.length ?? 0) > 0 || (slice.branches?.length ?? 0) > 0;

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
          {(slice.command || slice.aggregate || slice.events?.length || hasContext || slice.trigger) && <Arrow />}
          <Sticky type="policy" rotate={1}>{slice.policy.text}</Sticky>
        </>
      )}

      {slice.then?.map((step, si) => (
        <Segment key={si} node={step} firstArrow={true} />
      ))}

      {slice.branches?.length > 0 && (
        <>
          <Arrow />
          <div className="flex flex-col gap-5">
            {slice.branches.map((b, bi) => (
              <div key={bi} className="flex items-center gap-2 border-l-2 border-gray-200 pl-3">
                <Segment node={b} firstArrow={false} />
                {b.then?.map((step, si) => (
                  <Segment key={si} node={step} firstArrow={true} />
                ))}
              </div>
            ))}
          </div>
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
  const groups = [];
  model.slices.forEach((slice, i) => {
    const last = groups[groups.length - 1];
    if (last && last.lane === slice.lane) {
      last.slices.push({ slice, index: i });
    } else {
      groups.push({ lane: slice.lane, slices: [{ slice, index: i }] });
    }
  });

  return (
    <div>
      <div className="overflow-x-auto pb-4">
        <div className="flex flex-wrap items-stretch gap-x-4 gap-y-6 px-2">
          {groups.map((group, gi) => (
            <div
              key={gi}
              className={group.lane ? 'border border-gray-200 rounded-lg p-3 pt-2 bg-gray-50' : ''}
            >
              {group.lane && (
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {group.lane}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-6">
                {group.slices.map(({ slice, index }, si) => (
                  <React.Fragment key={index}>
                    <SliceFlow slice={slice} />
                    {si < group.slices.length - 1 && <Arrow />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {model.screenshots?.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4 space-y-6">
          {model.screenshots.map((shot, i) => (
            <figure key={i} className="m-0">
              <img
                src={shot.src}
                alt={shot.caption || `Screenshot ${i + 1}`}
                className="max-w-full rounded-lg border border-gray-200 shadow-sm"
              />
              {shot.caption && (
                <figcaption className="text-sm text-gray-500 mt-2 text-center">{shot.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

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
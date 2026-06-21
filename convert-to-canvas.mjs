import fs from 'fs/promises';
import path from 'path';

const COL_W  = 168;   // szerokość kolumny (node + gap)
const ROW_H  = 190;   // wysokość wiersza (node + gap)
const FRAME_PAD_TOP  = 52;
const FRAME_PAD_X    = 24;
const FRAME_PAD_BOT  = 28;
const FRAME_GAP      = 32;

let _c = 0;
const uid = () => `c${++_c}`;

function place(nodes, type, text, x, y) {
  nodes.push({ id: uid(), type, text: (text ?? '').trim() || type, x, y });
  return x + COL_W;
}

// Układa jeden krok/slice; zwraca { endX, rows } gdzie rows = liczba wierszy zajętych
function layoutStep(step, x, y, nodes) {
  let cx = x;

  if (step.trigger)  cx = place(nodes, 'event',    step.trigger.text,   cx, y);
  if (step.policy)   cx = place(nodes, 'policy',   step.policy.text,    cx, y);

  // read models — rząd nad komendą
  for (const rm of step.readModels || [])
    place(nodes, 'readmodel', rm, cx, y - 110);

  // aktor — nad komendą
  if (step.actor)
    place(nodes, 'actor', step.actor, cx, y - 110);

  if (step.command)  cx = place(nodes, 'command',  step.command,        cx, y);

  // agregat — użyj inwariant jako tekst gdy aggregate jest puste
  if (step.aggregate !== undefined) {
    const txt = step.aggregate.trim() || step.invariant || 'Agregat';
    cx = place(nodes, 'aggregate', txt, cx, y);
  } else if (step.invariant) {
    cx = place(nodes, 'aggregate', step.invariant, cx, y);
  }

  // then — sekwencja w tym samym wierszu
  let rows = 1;
  for (const s of step.then || []) {
    const r = layoutStep(s, cx, y, nodes);
    cx = r.endX;
    rows = Math.max(rows, r.rows);
  }

  // branches — każda gałąź to osobny wiersz; events[i] to zdarzenie wejściowe dla branches[i]
  if (step.branches?.length) {
    const evts = step.events || [];
    let branchMaxX = cx;
    for (let i = 0; i < step.branches.length; i++) {
      let bx = cx;
      if (i < evts.length) bx = place(nodes, 'event', evts[i], bx, y + i * ROW_H);
      const r = layoutStep(step.branches[i], bx, y + i * ROW_H, nodes);
      branchMaxX = Math.max(branchMaxX, r.endX);
    }
    cx = branchMaxX;
    rows = Math.max(rows, step.branches.length);
  } else {
    // brak gałęzi — eventy sekwencyjnie w tym samym wierszu
    for (const ev of step.events || [])
      cx = place(nodes, 'event', ev, cx, y);
  }

  return { endX: cx, rows };
}

function convertModel(model) {
  const nodes  = [];
  const frames = [];
  _c = 0;

  // Grupuj slice'y po lane
  const laneOrder  = [];
  const laneSlices = {};
  for (const slice of model.slices || []) {
    const lane = slice.lane || '(brak)';
    if (!laneSlices[lane]) { laneSlices[lane] = []; laneOrder.push(lane); }
    laneSlices[lane].push(slice);
  }

  let globalY = 40;

  for (const laneName of laneOrder) {
    const slices = laneSlices[laneName];
    const fx = 40;
    const fy = globalY;
    let cx   = fx + FRAME_PAD_X;
    let cy   = fy + FRAME_PAD_TOP;
    let maxX = cx;
    let totalRows = 0;

    for (const slice of slices) {
      const r = layoutStep(slice, cx, cy, nodes);
      maxX = Math.max(maxX, r.endX);
      totalRows += r.rows;
      cy += r.rows * ROW_H;
    }

    const frameH = totalRows * ROW_H + FRAME_PAD_TOP + FRAME_PAD_BOT;
    const frameW = maxX - fx + FRAME_PAD_X;

    frames.push({ id: uid(), label: laneName, x: fx, y: fy, w: frameW, h: frameH, color: '#dbeafe88' });
    globalY = fy + frameH + FRAME_GAP;
  }

  // Hotspoty
  let hx = 40;
  for (const hs of model.hotspots || []) {
    nodes.push({ id: uid(), type: 'hotspot', text: hs, x: hx, y: globalY });
    hx += COL_W;
  }

  return { nodes, frames };
}

const DIR   = './src/data/episodes';
const files = (await fs.readdir(DIR)).filter(f => f.endsWith('.json') && f !== 'template.json');

for (const file of files) {
  const p    = path.join(DIR, file);
  const data = JSON.parse(await fs.readFile(p, 'utf-8'));

  if (data.model?.slices?.length > 0 && !data.canvas?.nodes?.length) {
    data.canvas = convertModel(data.model);
    await fs.writeFile(p, JSON.stringify(data, null, 2));
    console.log(`✓ ${file}: ${data.canvas.nodes.length} węzłów, ${data.canvas.frames.length} ramek`);
  } else {
    console.log(`  ${file}: pominięty (brak slices lub canvas już istnieje)`);
  }
}

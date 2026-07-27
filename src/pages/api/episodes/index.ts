import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

const EPISODES_DIR = path.join(process.cwd(), 'src/data/episodes');
const ORDER_FILE   = path.join(process.cwd(), 'src/data/order.json');

function readOrder(): string[] {
  if (!fs.existsSync(ORDER_FILE)) return [];
  return JSON.parse(fs.readFileSync(ORDER_FILE, 'utf-8'));
}

function sortByOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  return [...items].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export const GET: APIRoute = async () => {
  const files = fs
    .readdirSync(EPISODES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'template.json');

  const episodes = files.map(file => {
    const id = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(EPISODES_DIR, file), 'utf-8'));
    return { id, title: content.title || id, subtitle: content.subtitle || '' };
  });

  return new Response(JSON.stringify(sortByOrder(episodes, readOrder())), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const { id } = await request.json();

  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    return new Response(JSON.stringify({ error: 'Invalid id – use lowercase letters, digits and hyphens only' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filePath = path.join(EPISODES_DIR, `${id}.json`);

  if (fs.existsSync(filePath)) {
    return new Response(JSON.stringify({ error: 'Episode with this id already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const template = {
    title: id,
    subtitle: '',
    dialogue: [],
    model: { slices: [], hotspots: [] },
  };

  fs.writeFileSync(filePath, JSON.stringify(template, null, 2));

  return new Response(JSON.stringify({ id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

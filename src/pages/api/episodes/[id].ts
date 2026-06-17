import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

const EPISODES_DIR = path.join(process.cwd(), 'src/data/episodes');

function getFilePath(id: string): string {
  // Sanitize: strip anything that could escape the directory
  const safe = path.basename(id);
  return path.join(EPISODES_DIR, `${safe}.json`);
}

export const GET: APIRoute = async ({ params }) => {
  const filePath = getFilePath(params.id!);

  if (!fs.existsSync(filePath)) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return new Response(content, { headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const filePath = getFilePath(params.id!);

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const filePath = getFilePath(params.id!);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

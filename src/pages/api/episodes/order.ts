import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

const ORDER_FILE = path.join(process.cwd(), 'src/data/order.json');

function readOrder(): string[] {
  if (!fs.existsSync(ORDER_FILE)) return [];
  return JSON.parse(fs.readFileSync(ORDER_FILE, 'utf-8'));
}

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(readOrder()), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const order = await request.json();
  if (!Array.isArray(order) || !order.every(id => typeof id === 'string')) {
    return new Response(JSON.stringify({ error: 'Expected array of strings' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  fs.writeFileSync(ORDER_FILE, JSON.stringify(order, null, 2));
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
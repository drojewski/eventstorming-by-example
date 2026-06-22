import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const step = z.object({
  command: z.string().optional(),
  aggregate: z.string().optional(),
  invariant: z.string().optional(),
  events: z.array(z.string()).optional(),
  policy: z.object({ text: z.string() }).optional(),
  eventsInline: z.boolean().optional(),
  branches: z.array(z.lazy(() => step.extend({ then: z.array(step).optional() }))).optional(),

});

const slice = z.object({
    lane: z.string().optional(),
  trigger: z.object({ type: z.literal('event'), text: z.string(), note: z.string().optional() }).optional(),
  externalSystems: z.array(z.string()).optional(),
  readModels: z.array(z.string()).optional(),
  actor: z.string().optional(),
  command: z.string().optional(),
  aggregate: z.string().optional(),
  invariant: z.string().optional(),
  events: z.array(z.string()).optional(),
  policy: z.object({ text: z.string() }).optional(),
  then: z.array(step).optional(),
  branches: z.array(step.extend({ then: z.array(step).optional() })).optional(),

});

const canvasNode = z.object({
  id: z.string(),
  type: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number().optional(),
  h: z.number().optional(),
});

const canvasFrame = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  color: z.string().optional(),
});

const episodes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/data/episodes' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    dialogue: z.array(z.object({
      role: z.enum(['ekspert', 'analityk', 'analityk2']),
      name: z.string(),
      avatar: z.string(),
      text: z.string(),
    })).optional().default([]),
    model: z.object({
      slices: z.array(slice),
      hotspots: z.array(z.string()).optional(),
      screenshots: z.array(z.object({
        src: z.string(),
        caption: z.string().optional(),
      })).optional(),
    }).optional(),
    canvas: z.object({
      nodes: z.array(canvasNode).optional().default([]),
      frames: z.array(canvasFrame).optional().default([]),
      arrows: z.array(z.object({
        id: z.string(),
        fromId: z.string(),
        toId: z.string(),
        waypoints: z.array(z.object({ x: z.number(), y: z.number() })).optional().default([]),
      })).optional().default([]),
    }).optional(),
  }),
});

export const collections = { episodes };
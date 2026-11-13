import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Self-written chapters: src/content/chapters/<id>-<slug>.mdx. Ids and sections come from data/outline.json.
const chapters = defineCollection({
  loader: glob({ pattern: '[0-9][0-9]-*.mdx', base: './src/content/chapters' }),
  schema: z.object({
    id: z.string().regex(/^\d\d$/),
    title: z.string(),
    summary: z.string(),
    readingTime: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// System-design drills for the interview hub: src/content/drills/D01-<slug>.mdx
const drills = defineCollection({
  loader: glob({ pattern: 'D[0-9][0-9]-*.mdx', base: './src/content/drills' }),
  schema: z.object({
    id: z.string().regex(/^D\d\d$/),
    title: z.string(),
    prompt: z.string(),
    sections: z.array(z.string()),
    minutes: z.number().default(45),
  }),
});

export const collections = { chapters, drills };

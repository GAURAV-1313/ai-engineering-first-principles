// Interview questions for the hub: read from the written chapters' <Q q="..."> tags at build time,
// falling back to the outline's questions for chapters that are not written yet.
// The self-check key matches Q.astro + progress.ts: `${chapterId}:${slugify(q).slice(0, 80)}`.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { slugify } from '../plugins/rehype-sections.mjs';
import { chapters, chapterHref } from './outline';

export interface HubQuestion { chapter: string; q: string; reported: boolean; key: string; href: string; written: boolean }

const dir = resolve(process.cwd(), 'src/content/chapters');
const Q_RE = /<Q\s+q=(?:"([^"]*)"|\{'((?:[^'\\]|\\.)*)'\}|\{"((?:[^"\\]|\\.)*)"\}|\{`([^`]*)`\})([^>]*)>/g;

function fromFile(id: string): { q: string; reported: boolean }[] | null {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((x) => x.startsWith(`${id}-`) && x.endsWith('.mdx'));
  if (!f) return null;
  const src = readFileSync(join(dir, f), 'utf8');
  if (/^draft: true$/m.test(src)) return null;
  const out: { q: string; reported: boolean }[] = [];
  for (const m of src.replace(/```[\s\S]*?```/g, '').matchAll(Q_RE)) {
    const q = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').replace(/\\(.)/g, '$1');
    out.push({ q, reported: /\breported\b/.test(m[5] ?? '') });
  }
  return out.length ? out : null;
}

export function allQuestions(): HubQuestion[] {
  return chapters.flatMap((c) => {
    const written = fromFile(c.id);
    const list = written ?? c.interview.map((x) => ({ q: x.q, reported: x.reported }));
    return list.map((x) => ({
      chapter: c.id, q: x.q, reported: x.reported, key: `${c.id}:${slugify(x.q).slice(0, 80)}`,
      href: `${chapterHref(c)}#interview`, written: !!written,
    }));
  });
}

/** Question + answer text from a written chapter's <Q> blocks, for FAQPage structured data. */
export function qaForChapter(id: string): { q: string; a: string }[] {
  if (!existsSync(dir)) return [];
  const f = readdirSync(dir).find((x) => x.startsWith(`${id}-`) && x.endsWith('.mdx'));
  if (!f) return [];
  const src = readFileSync(join(dir, f), 'utf8');
  const out: { q: string; a: string }[] = [];
  const re = new RegExp(Q_RE.source + '([\\s\\S]*?)</Q>', 'g');
  for (const m of src.matchAll(re)) {
    const q = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').replace(/\\(.)/g, '$1');
    const a = (m[6] ?? '').trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

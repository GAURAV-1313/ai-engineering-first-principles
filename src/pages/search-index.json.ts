// Static search index for the Cmd-K palette, fetched on first open.
import type { APIRoute } from 'astro';
import { plainMd } from '../lib/inline-md';
import { getCollection } from 'astro:content';
import { chapters, chapterHref, sectionHref } from '../lib/outline';
import { evidence, repos, repoBySlug, flows } from '../lib/data';
import { allQuestions } from '../lib/questions';
import core from '../../data/core25.json';

export const GET: APIRoute = async () => {
  const byConcept = new Map<string, number>();
  for (const e of evidence) byConcept.set(e.section, (byConcept.get(e.section) ?? 0) + 1);
  const items: unknown[] = [];
  for (const c of chapters) {
    items.push({ t: 'chapter', id: c.id, title: c.title, href: chapterHref(c), meta: `${c.sections.length} sections · ${'★'.repeat(c.weight)}` });
    for (const s of c.sections) items.push({ t: 'concept', id: s.id, title: s.title, href: `${chapterHref(c)}#${s.slug}`, meta: c.title, n: byConcept.get(s.id) ?? 0 });
  }
  for (const k of core as { n: number; term: string; sections: string[] }[])
    items.push({ t: 'question', id: `C${String(k.n).padStart(2, '0')}`, title: k.term, href: sectionHref(k.sections[0]), meta: 'Core 25' });
  for (const q of allQuestions()) items.push({ t: 'question', id: q.chapter, title: plainMd(q.q), href: q.href, meta: q.reported ? 'reported' : 'interview' });
  for (const d of await getCollection('drills')) items.push({ t: 'drill', id: d.data.id, title: d.data.title, href: `/interview/${d.data.id.toLowerCase()}/`, meta: 'System-design drill' });
  for (const r of repos) items.push({ t: 'repo', id: r.chip, title: r.name, href: `/repos/${r.slug}/`, meta: r.stack.slice(0, 4).join(', ') });
  for (const f of flows) items.push({ t: 'flow', id: repoBySlug[f.repo]?.chip, title: f.name, href: `/repos/${f.repo}/#flows-h`, meta: `${f.steps.length} steps` });
  const byId = Object.fromEntries(chapters.map((c) => [Number(c.id), c]));
  for (const e of evidence) {
    const c = byId[e.chapter]; if (!c) continue;
    const s = c.sections.find((x) => x.id === e.section);
    items.push({ t: 'code', id: repoBySlug[e.repo].chip, title: e.concept, href: `${chapterHref(c)}?repo=${e.repo}${s ? `#${s.slug}` : ''}`,
      meta: `${e.file}${e.lines ? `:${e.lines[0]}` : ''}`, repo: e.repo, q: e.quality, layer: e.layer, mine: e.author === 'mine' });
  }
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
};

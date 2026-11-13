// llms.txt (https://llmstxt.org): a plain-text map of the site for LLMs and AI answer engines.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { parts, chapterById, chapterHref } from '../lib/outline';
import { SITE_NAME, SITE_DESCRIPTION } from '../lib/seo';

export const GET: APIRoute = async ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const summaries = Object.fromEntries((await getCollection('chapters')).map((e) => [e.data.id, e.data.summary]));
  const drills = (await getCollection('drills')).sort((a, b) => a.data.id.localeCompare(b.data.id));
  const lines = [
    `# ${SITE_NAME}`, '',
    `> ${SITE_DESCRIPTION}`, '',
    'Each chapter builds one topic from the mechanism up, then covers production concerns, interview questions with model answers, a hands-on exercise, and real code examples tagged solid, naive or missing. Written by Gaurav Singh.', '',
    ...parts.flatMap((p) => [
      `## Part ${p.id}: ${p.title}`, '',
      ...p.chapters.map((id) => {
        const c = chapterById[id];
        return `- [${c.id}. ${c.title}](${u(chapterHref(c))}): ${summaries[id] ?? c.sections.map((s) => s.title).join('; ')}`;
      }),
      '',
    ]),
    '## Interview prep', '',
    `- [Interview hub](${u('/interview/')}): fast-track reading order, 25 core concepts with one-minute answers, every chapter's interview questions.`,
    ...drills.map((d) => `- [${d.data.title}](${u(`/interview/${d.data.id.toLowerCase()}/`)}): system-design drill. ${d.data.prompt}`),
    '',
    '## Optional', '',
    `- [What to build next](${u('/gaps/')}): AI-engineering skills with no example yet, each with a project to build.`,
    `- [Real code by chapter](${u('/repos/')}): code examples mapped to chapters.`,
    `- [Library](${u('/library/')}): open-licence readings by other authors, with attribution.`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

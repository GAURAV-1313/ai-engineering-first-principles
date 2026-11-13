// Fast per-file check for chapter writers (no full site build, safe to run in parallel):
//   node scripts/check-chapter.mjs src/content/chapters/17-rag-pipelines.mdx [more files]
// 1. compiles the MDX (catches unescaped { } < and broken JSX)
// 2. checks frontmatter, the declared ## sections (exact, in order) and the closing blocks
// 3. reports word count against the target for the chapter weight
import { readFileSync } from 'node:fs';
import { basename, resolve, join } from 'node:path';
import { compile } from '@mdx-js/mdx';
import { slugify } from '../src/plugins/rehype-sections.mjs';

const root = resolve(import.meta.dirname, '..');
const { chapters } = JSON.parse(readFileSync(join(root, 'data/outline.json'), 'utf8'));
const TARGET = { 3: [5000, 8000], 2: [3500, 5500], 1: [2500, 3500] };
const KNOWN = new Set(['Production', 'Interview', 'Q', 'ApplyIt', 'YourProject', 'Callout']);
let failed = 0;

for (const f of process.argv.slice(2)) {
  const problems = [];
  const raw = readFileSync(f, 'utf8');
  const id = basename(f).slice(0, 2);
  const ch = chapters.find((c) => c.id === id);
  if (!ch) { console.log(`${f}: no chapter ${id} in outline`); failed++; continue; }
  if (basename(f) !== `${id}-${ch.slug}.mdx`) problems.push(`file name should be ${id}-${ch.slug}.mdx`);
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) problems.push('no frontmatter');
  else {
    if (!new RegExp(`^id: "${id}"$`, 'm').test(fm[1])) problems.push(`frontmatter needs id: "${id}"`);
    for (const k of ['title', 'summary', 'readingTime']) if (!new RegExp(`^${k}: `, 'm').test(fm[1])) problems.push(`frontmatter missing ${k}`);
  }
  const body = fm ? raw.slice(fm[0].length) : raw;
  try {
    await compile(body, { format: 'mdx' });
  } catch (e) {
    problems.push(`MDX compile error: ${e.message}${e.line ? ` (body line ${e.line}, file line ${e.line + (fm ? fm[0].split('\n').length - 1 : 0)})` : ''}`);
  }
  const noCode = body.replace(/```[\s\S]*?```/g, '');
  const h2 = [...noCode.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const want = ch.sections.map((s) => s.slug);
  const got = h2.map(slugify);
  const missing = ch.sections.filter((s) => !got.includes(s.slug)).map((s) => `${s.id} "${s.title}"`);
  const extra = h2.filter((h) => !want.includes(slugify(h)));
  if (missing.length) problems.push(`missing ## sections: ${missing.join('; ')}`);
  if (extra.length) problems.push(`## headings not in outline (use ### instead): ${extra.map((h) => JSON.stringify(h)).join(', ')}`);
  if (!missing.length && got.filter((s) => want.includes(s)).join() !== want.join()) problems.push('## sections out of outline order');
  const blocks = ['<Production>', '<Interview>', '<ApplyIt>', '<YourProject>'];
  const pos = blocks.map((b) => noCode.indexOf(b));
  blocks.forEach((b, i) => { if (pos[i] < 0) problems.push(`missing ${b}`); });
  if (pos.every((p) => p >= 0) && pos.some((p, i) => i && p < pos[i - 1])) problems.push('closing blocks out of order');
  const tags = [...noCode.matchAll(/<([A-Z][A-Za-z]*)/g)].map((m) => m[1]).filter((t) => !KNOWN.has(t));
  if (tags.length) problems.push(`unknown components: ${[...new Set(tags)].join(', ')}`);
  const qs = (noCode.match(/<Q q=/g) || []).length;
  if (qs < 3) problems.push(`only ${qs} <Q> questions`);
  const words = noCode.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    + (body.match(/```[\s\S]*?```/g) || []).join(' ').split(/\s+/).length * 0.3;
  const [lo, hi] = TARGET[ch.weight];
  const w = Math.round(words);
  const note = w < lo ? `SHORT (target ${lo}-${hi})` : w > hi * 1.25 ? `LONG (target ${lo}-${hi})` : `ok (target ${lo}-${hi})`;
  console.log(`${basename(f)}: ${problems.length ? 'FAIL' : 'pass'} · ~${w} words ${note} · ${h2.length}/${want.length} sections · ${qs} questions`);
  for (const p of problems) console.log('  - ' + p);
  if (problems.length) failed++;
}
process.exit(failed ? 1 : 0);

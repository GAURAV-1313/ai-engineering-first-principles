// Structure check for chapters and evidence against data/outline.json (the source of truth for ids).
// - every written chapter has exactly the declared ## sections, in order, with matching slugs
// - closing blocks present; no stray ## headings
// - every evidence concept_id resolves to a declared chapter or section
// Prints problems; with --strict exits 1 if any.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { slugify } from '../src/plugins/rehype-sections.mjs';

const root = resolve(import.meta.dirname, '..');
const { chapters } = JSON.parse(readFileSync(join(root, 'data/outline.json'), 'utf8'));
const dir = join(root, 'src/content/chapters');
const problems = [];
let written = 0;
for (const f of readdirSync(dir).filter((x) => /^\d\d-.*\.mdx$/.test(x)).sort()) {
  const id = f.slice(0, 2);
  const ch = chapters.find((c) => c.id === id);
  if (!ch) { problems.push(`${f}: no chapter ${id} in outline`); continue; }
  if (f !== `${id}-${ch.slug}.mdx`) problems.push(`${f}: expected file name ${id}-${ch.slug}.mdx`);
  written++;
  const src = readFileSync(join(dir, f), 'utf8').replace(/```[\s\S]*?```/g, '');
  const h2 = [...src.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const want = ch.sections.map((s) => s.slug);
  const got = h2.map(slugify);
  const missing = want.filter((s) => !got.includes(s));
  const extra = h2.filter((h) => !want.includes(slugify(h)));
  if (missing.length) problems.push(`${f}: missing sections ${missing.join(', ')}`);
  if (extra.length) problems.push(`${f}: headings not in outline: ${extra.map((h) => JSON.stringify(h)).join(', ')}`);
  const order = got.filter((s) => want.includes(s));
  if (!missing.length && order.join() !== want.join()) problems.push(`${f}: sections out of order`);
  for (const b of ['<Production>', '<Interview>', '<ApplyIt>', '<YourProject>']) if (!src.includes(b)) problems.push(`${f}: missing ${b}`);
  if (!/^id: "?\d\d"?$/m.test(src)) problems.push(`${f}: frontmatter id missing`);
}
const evPath = join(root, 'data/gen/evidence.json');
if (existsSync(evPath)) {
  const ids = new Set(chapters.flatMap((c) => [c.id, ...c.sections.map((s) => s.id)]));
  const bad = JSON.parse(readFileSync(evPath, 'utf8')).filter((e) => !ids.has(e.conceptId));
  if (bad.length) problems.push(`evidence: ${bad.length} entries with unknown concept ids: ${[...new Set(bad.map((e) => e.conceptId))].slice(0, 20).join(', ')}`);
}
console.log(`outline check: ${written}/${chapters.length} chapters written, ${problems.length} problem(s)`);
for (const p of problems) console.log('  ' + p);
if (process.argv.includes('--strict') && problems.length) process.exit(1);

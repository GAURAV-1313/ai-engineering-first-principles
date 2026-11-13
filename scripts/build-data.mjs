// Normalises the per-repo evidence files into the three files the site reads:
//   data/gen/repos.json, data/gen/evidence.json, data/gen/flows.json
// Evidence source dir: $EVIDENCE_DIR or ./evidence. No repo clones are needed.
// An entry may carry its own "sha" (cited from a different commit than the repo pin).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const evDir = process.env.EVIDENCE_DIR || join(root, 'evidence');
const cfg = JSON.parse(readFileSync(join(root, 'data/repos.config.json'), 'utf8'));
const outDir = join(root, 'data/gen');
mkdirSync(outDir, { recursive: true });

const pad = (n) => String(n).padStart(2, '0');
const normId = (id, chapter) => {
  const parts = String(id ?? '').split('.').map((p) => p.trim()).filter(Boolean);
  if (!parts.length || parts.some((p) => !/^\d+$/.test(p))) return pad(chapter);
  return parts.slice(0, 3).map((p) => pad(Number(p))).join('.');
};
const parseRange = (s) => {
  const m = String(s ?? '').match(/(\d+)(?:\s*-\s*(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null;
};
const mineOf = (v) => (v === true || v === 'true' ? 'mine' : v === false || v === 'false' ? 'team' : 'unknown');

const repos = [];
const evidence = [];
const flows = [];

for (const r of cfg.repos) {
  const path = join(evDir, r.file);
  if (!existsSync(path)) { console.warn(`skip ${r.slug}: ${path} missing`); continue; }
  const d = JSON.parse(readFileSync(path, 'utf8'));
  repos.push({
    slug: r.slug, chip: r.chip, name: r.name, family: r.family, hue: cfg.families[r.family].hue,
    familyName: cfg.families[r.family].name, github: r.github, role: d.role ?? null,
    product: d.product ?? '', stack: d.stack ?? [], architecture: d.architecture ?? '',
    components: d.components ?? [], share: d.gaurav_share ?? '', uncovered: d.uncovered ?? [],
  });
  d.evidence.forEach((e, i) => {
    const chapter = Number(e.chapter);
    const branch = e.branch && e.branch !== 'backend' ? e.branch : null;
    const sha = e.sha || (branch && r.branchShas?.[branch]) || r.sha;
    const range = parseRange(e.lines);
    const shown = parseRange(e.snippet_lines) ?? range;
    const snippet = String(e.snippet ?? '').replace(/\s+$/, '');
    const fileUrl = r.github ? `https://github.com/${r.github}/blob/${sha}/${e.file}` + (range ? `#L${range[0]}-L${range[1]}` : '') : '';
    evidence.push({
      id: `${r.slug}-${String(i + 1).padStart(3, '0')}`,
      repo: r.slug, chapter, conceptId: normId(e.concept_id, chapter),
      section: normId(e.concept_id, chapter).split('.').slice(0, 2).join('.'),
      concept: e.concept ?? '', layer: e.layer ?? 'backend', file: e.file, branch,
      lines: range, shownFrom: shown ? shown[0] : null,
      numbered: !!shown && snippet.split('\n').length === shown[1] - shown[0] + 1,
      snippet, what: e.what ?? '', quality: ['solid', 'naive', 'missing'].includes(e.quality) ? e.quality : 'solid',
      lesson: e.lesson ?? '', author: mineOf(e.mine), url: fileUrl, sha,
    });
  });
  (d.flows ?? []).forEach((f, i) => flows.push({
    id: `${r.slug}-${i + 1}`, repo: r.slug, name: f.name,
    chapters: (f.chapters ?? []).map(Number), steps: f.steps ?? [],
  }));
}

// The library index is produced by `npm run library`; keep an empty one so the site builds without it.
if (!existsSync(join(outDir, 'library.json'))) writeFileSync(join(outDir, 'library.json'), JSON.stringify({ docs: [] }));

writeFileSync(join(outDir, 'repos.json'), JSON.stringify(repos, null, 1));
writeFileSync(join(outDir, 'evidence.json'), JSON.stringify(evidence));
writeFileSync(join(outDir, 'flows.json'), JSON.stringify(flows, null, 1));
console.log(`data: ${repos.length} repos, ${evidence.length} evidence, ${flows.length} flows`);

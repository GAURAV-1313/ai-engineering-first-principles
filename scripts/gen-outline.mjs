// One-time generator: parses the syllabus (brain/research/ideal_syllabus.md, Q3) into
// data/outline.json. After the first run, data/outline.json is the source of truth and is
// edited by hand; re-running refuses to overwrite it unless --force is given.
//
// Ids are DECLARED here, never derived from heading order:
//   chapter id "17", section id "17.04", section slug "chunking" (the heading anchor).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'data/outline.json');
if (existsSync(out) && !process.argv.includes('--force')) {
  console.log('data/outline.json exists; edit it by hand (or pass --force to regenerate).');
  process.exit(0);
}
const md = readFileSync(join(root, 'brain/research/ideal_syllabus.md'), 'utf8');
const start = md.indexOf('### Inferences (the outline)');
const end = md.indexOf('#### Source coverage matrix');
const body = md.slice(start, end);

export const slugify = (s) =>
  s.toLowerCase().replace(/[`'’"]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const PART_NAMES = {
  I: 'Foundations', II: 'Inference and serving economics', III: 'Talking to models',
  IV: 'Retrieval and RAG', V: 'Evaluation', VI: 'Agents', VII: 'Production',
};
const SHORT = {
  '02': 'tokenization', '19': 'evals-methodology', '20': 'evals-judges-and-ci', '21': 'tool-use',
  '22': 'agent-loop', '24': 'planning', '26': 'mcp', '28': 'coding-and-computer-use-agents',
  '33': 'security-prompt-injection', '34': 'product-ux-and-feedback', '11': 'serving-and-model-economics',
  '08': 'reasoning-models', '06': 'pretraining-and-scaling', '04': 'language-modeling-and-sampling',
};
const FAST = ['03', '10', '11', '12', '13', '15', '17', '18', '19', '20', '21', '22', '23', '27', '31', '33', '30', '32'];

const parts = [];
const chapters = [];
let part = null, ch = null, mode = null;
for (const raw of body.split('\n')) {
  const line = raw.replace(/\s+$/, '');
  let m;
  if ((m = line.match(/^#### PART ([IVX]+):/))) {
    part = m[1]; parts.push({ id: part, title: PART_NAMES[part], chapters: [] }); continue;
  }
  if ((m = line.match(/^\*\*(\d\d) (.+?)\*\* · Weight (★+)/))) {
    ch = {
      id: m[1], slug: SHORT[m[1]] ?? slugify(m[2]), title: m[2].replace(/^Evals (I+):/, 'Evals $1:'), part,
      weight: m[3].length, fastTrack: FAST.includes(m[1]), sections: [], production: {},
      interview: [], applyIt: '', sources: '', selfWrite: false,
    };
    chapters.push(ch); parts.at(-1).chapters.push(ch.id); mode = null; continue;
  }
  if (!ch) continue;
  if ((m = line.match(/^- (\d\d\.\d\d .*)$/))) {
    for (const s of m[1].split(' · ')) {
      const sm = s.match(/^(\d\d\.\d\d) (.+)$/);
      if (sm) ch.sections.push({ id: sm[1], title: sm[2].trim(), slug: slugify(sm[2]) });
    }
    continue;
  }
  if ((m = line.match(/^- \*\*Prod\.\*\* (.*)$/))) {
    const re = /\b([FCLOS]): (.*?)(?= [FCLOS]: |$)/g; let pm;
    while ((pm = re.exec(m[1]))) ch.production[pm[1]] = pm[2].trim();
    mode = null; continue;
  }
  if (/^- \*\*Interview\.\*\*/.test(line)) { mode = 'iv'; continue; }
  if (mode === 'iv' && (m = line.match(/^ {2}- (.*)$/))) {
    const q = m[1].trim();
    const MARK = /\s*\((?:reported|a likely|flagged|a commonly)[^()]*(?:\([^()]*\)[^()]*)*\)/i;
    ch.interview.push({ q: q.replace(MARK, '').replace(/\s+([?.])$/, '$1').trim(), reported: /reported|commonly cited|flagged/i.test(q), note: (q.match(MARK)?.[0] ?? '').replace(/^\s*\(|\)$/g, '') || undefined });
    continue;
  }
  if ((m = line.match(/^- \*\*Apply it\.\*\* (.*)$/))) { ch.applyIt = m[1].trim(); mode = null; continue; }
  if ((m = line.match(/^- \*\*Best sources\.\*\* (.*)$/))) {
    ch.sources = m[1].replace(/\s*\*\*\[write-your-own likely[^\]]*\]\*\*/, '').trim();
    ch.selfWrite = /write-your-own/.test(m[1]); mode = null; continue;
  }
}

// Slugs must be unique within a chapter (they become heading anchors).
for (const c of chapters) {
  const seen = new Set();
  for (const s of c.sections) {
    if (seen.has(s.slug)) throw new Error(`duplicate slug ${s.slug} in ch ${c.id}`);
    seen.add(s.slug);
  }
}
writeFileSync(out, JSON.stringify({ parts, chapters }, null, 1) + '\n');
console.log(`outline: ${parts.length} parts, ${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.sections.length, 0)} sections`);
for (const c of chapters) {
  const miss = ['F', 'C', 'L', 'O', 'S'].filter((k) => !c.production[k]);
  if (c.interview.length < 3 || !c.applyIt || miss.length) console.log(`  check ch ${c.id}: ${c.interview.length} questions, apply=${!!c.applyIt}, prod missing ${miss.join('')}`);
}

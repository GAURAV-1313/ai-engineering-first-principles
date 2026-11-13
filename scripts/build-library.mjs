// Turn the vendored docs (vendor/<id>) into data/gen/library.json + data/gen/library/<source>/<slug>.md.
// Offline; never modifies vendor/. Writes an empty index when vendor/ is missing.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const genDir = join(root, 'data/gen');
const outDir = join(genDir, 'library');
const config = JSON.parse(readFileSync(join(root, 'data/library.config.json'), 'utf8'));

const IMG = /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp)$/i;

function repoParts(repo) { const [, owner, name] = repo.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/); return { owner, name }; }

function resolveTarget(target, docPath, s) {
  if (!target || /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) return target; // absolute URL, anchor, mailto
  const { owner, name } = repoParts(s.repo);
  const [pathPart, ...rest] = target.split(/(?=[#?])/);
  const hash = rest.join('');
  let p = pathPart.startsWith('/') ? pathPart.slice(1) : posix.join(posix.dirname(docPath), pathPart);
  p = posix.normalize(p);
  if (p.startsWith('..')) return target;
  p = p.split('/').map(decodeURIComponent).map(encodeURIComponent).join('/');
  if (IMG.test(p)) return `https://raw.githubusercontent.com/${owner}/${name}/${s.commit}/${p}`;
  const kind = /\.[a-z0-9]+$/i.test(p) ? 'blob' : 'tree';
  return `https://github.com/${owner}/${name}/${kind}/${s.commit}/${p}${hash}`;
}

// Attribute values may contain braces (JSX expressions), nested up to three deep.
const ATTRS = String.raw`(?:[^<>{}"']|"[^"]*"|'[^']*'|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*`;
const SELF_CLOSING = new RegExp(String.raw`<([A-Z][\w.]*)${ATTRS}\/>`, 'g');
const OPEN_TAG = new RegExp(String.raw`<([A-Z][\w.]*)(?:\s${ATTRS})?>`, 'g');
const CLOSE_TAG = /<\/[A-Z][\w.]*>/g;
const DROP_BLOCKS = /<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi;
const DROP_TAGS = /<\/?(?:hfoptions|hfoption|script|style|iframe)\b[^>]*>/gi;

function cleanProse(text, docPath, s) {
  const codes = [];
  text = text.replace(/`[^`\n]*`/g, (m) => `\u0000${codes.push(m) - 1}\u0000`);
  text = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  text = text.replace(DROP_BLOCKS, '').replace(DROP_TAGS, '');
  text = text.replace(SELF_CLOSING, '').replace(OPEN_TAG, '').replace(CLOSE_TAG, '');
  text = text.replace(/\[\[[\w-]+\]\]/g, '');
  text = text.replace(/^(#{1,6} .*?)\s*\{[.#][^}]*\}\s*$/gm, '$1');
  text = text.replace(/\]\(\s*<?([^)\s>]+)>?((?:\s+"[^"]*")?)\s*\)/g, (_, t, title) => `](${resolveTarget(t, docPath, s)}${title})`);
  text = text.replace(/\b(src|href)=("|')([^"']+)\2/gi, (_, a, q, t) => `${a}=${q}${resolveTarget(t, docPath, s)}${q}`);
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}

function clean(raw, docPath, s) {
  let text = raw.replace(/\r\n?/g, '\n');
  let fm = '';
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (m) { fm = m[1]; text = text.slice(m[0].length); }

  // Split into fenced code (kept verbatim) and prose (cleaned).
  const out = [];
  let prose = [];
  let fence = null;
  let code = [];
  const flush = () => { if (prose.length) out.push(cleanProse(prose.join('\n'), docPath, s)); prose = []; };
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fence) {
      code.push(line);
      if (f && f[2][0] === fence[0] && f[2].length >= fence.length && line.trim() === f[2]) { out.push(code.join('\n')); code = []; fence = null; }
      continue;
    }
    if (f) { flush(); fence = f[2]; code = [line]; continue; }
    if (/^(import|export)\s/.test(line)) { // MDX ESM; may span lines until the module specifier
      let j = i;
      while (j < lines.length && /\{\s*$|,\s*$/.test(lines[j]) && !/\bfrom\s+['"]/.test(lines[j])) j++;
      if (j > i) { while (j < lines.length && !/\bfrom\s+['"]|^\}/.test(lines[j])) j++; }
      i = j; continue;
    }
    prose.push(line);
  }
  if (fence) out.push(code.join('\n'));
  flush();
  let body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  let title = (fm.match(/^title:\s*(.+)$/m)?.[1] ?? '').replace(/^["']|["']$/g, '');
  body = body.replace(/^\[← Back to README\]\([^)]*\)\s*/, '');
  // Title: frontmatter, else the first h1; if there is no h1, the first heading of any level becomes the title.
  const h1 = body.match(/^# (.+)$/m) ?? (title ? null : body.match(/^#{2,6} (.+)$/m));
  if (!title && h1) title = h1[1];
  if (h1) body = body.replace(h1[0] + '\n', '').replace(h1[0], '');
  title = title.replace(/^\d+\.\s+/, (n) => n).replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').replace(/\s*\{[.#][^}]*\}\s*$/, '').replace(/\[\[[\w-]+\]\]/g, '').trim();
  return { title: title || posix.basename(docPath), body: body.trim() + '\n' };
}

function slugFor(docPath, base) {
  let p = docPath.startsWith(base) ? docPath.slice(base.length) : docPath;
  p = p.replace(/\.(mdx?|md)$/i, '').replace(/\.en$/, '');
  if (/(^|\/)README$/i.test(p)) p = p.replace(/\/?README$/i, '') || 'readme';
  return p.split('/').join('-').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function writeIndex(docs) {
  mkdirSync(genDir, { recursive: true });
  writeFileSync(join(genDir, 'library.json'), JSON.stringify({ docs }, null, 1));
}

// Expand a doc path or simple glob (* in the last segment) against the vendored tree.
import { readdirSync } from 'node:fs';
function expand(dir, p) {
  if (!p.includes('*')) return [p];
  const d = posix.dirname(p);
  const re = new RegExp('^' + posix.basename(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return readdirSync(join(dir, d)).filter((f) => re.test(f)).sort().map((f) => posix.join(d, f));
}

const vendorRoot = join(root, 'vendor');
rmSync(outDir, { recursive: true, force: true });
if (!existsSync(vendorRoot)) {
  writeIndex([]);
  console.log('library: vendor/ missing; wrote an empty index. Run `npm run vendor` to fetch the sources.');
  process.exit(0);
}

const docs = [];
const seen = new Set();
let skipped = 0;
for (const s of config.sources) {
  const dir = join(vendorRoot, s.id);
  if (!existsSync(dir)) { console.warn(`library: skip ${s.id} (not vendored)`); skipped++; continue; }
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (head !== s.commit) { console.warn(`library: skip ${s.id} (vendor at ${head.slice(0, 7)}, config pins ${s.commit.slice(0, 7)}; run npm run vendor)`); skipped++; continue; }
  } catch { /* git unavailable: trust the directory */ }
  let n = 0;
  for (const d of s.docs) {
    for (const path of expand(dir, d.path)) {
      const file = join(dir, path);
      if (!existsSync(file)) { console.warn(`library: ${s.id}: missing ${path}`); continue; }
      const slug = slugFor(path, s.base ?? '');
      const key = `${s.id}/${slug}`;
      if (seen.has(key)) throw new Error(`duplicate doc slug ${key} (${path})`);
      seen.add(key);
      const cleaned = clean(readFileSync(file, 'utf8'), path, s);
      const body = cleaned.body;
      const title = d.title ?? cleaned.title;
      mkdirSync(join(outDir, s.id), { recursive: true });
      writeFileSync(join(outDir, s.id, `${slug}.md`), `---\npath: ${JSON.stringify(path)}\ntitle: ${JSON.stringify(title)}\n---\n${body}`);
      docs.push({
        source: s.id, sourceTitle: s.title, license: s.licenseLabel ?? s.license, author: s.author, repo: s.repo, commit: s.commit,
        doc: slug, title, href: `/library/${s.id}/${slug}/`, chapters: d.chapters,
        ...(d.note ? { note: d.note } : {}), ...(s.shareAlike ? { licenseNote: s.licenseNote } : {}),
      });
      n++;
    }
  }
  console.log(`library: ${s.id}: ${n} docs`);
}
writeIndex(docs);
console.log(`library: ${docs.length} docs from ${config.sources.length - skipped} sources`);

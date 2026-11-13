// Checks every evidence snippet against the repo AT ITS PINNED COMMIT (git show <sha>:<file>),
// so uncommitted edits in a working tree never cause false drift, and scans snippets for secrets.
//   REPO_<CHIP>=/path/to/clone  overrides the local path for a repo.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const cfg = JSON.parse(readFileSync(join(root, 'data/repos.config.json'), 'utf8'));
const evidence = JSON.parse(readFileSync(join(root, 'data/gen/evidence.json'), 'utf8'));

const SECRET = [
  /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bsk-[A-Za-z0-9_-]{20,}/, /\bxox[baprs]-[A-Za-z0-9-]{10,}/, /AIza[0-9A-Za-z_-]{35}/,
  /\brzp_(live|test)_[A-Za-z0-9]{8,}/, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./,
];
const norm = (s) => s.replace(/\s+/g, ' ').replace(/ …$/, '').trim();
const cache = new Map();
const fileAt = (repo, sha, file) => {
  const k = `${repo}@${sha}:${file}`;
  if (!cache.has(k)) {
    try { cache.set(k, execFileSync('git', ['-C', repo, 'show', `${sha}:${file}`], { encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] })); }
    catch { cache.set(k, null); }
  }
  return cache.get(k);
};

let checked = 0; const drift = [], secrets = [], skipped = new Set();
for (const e of evidence) {
  for (const re of SECRET) if (re.test(e.snippet)) secrets.push(`${e.id} ${e.file} matches ${re}`);
  const r = cfg.repos.find((x) => x.slug === e.repo);
  const local = (process.env[`REPO_${r.chip}`] || r.local || '').replace(/^~/, homedir());
  if (!local || !existsSync(local)) { skipped.add(r.slug); continue; }
  const src = fileAt(local, e.sha, e.file);
  if (src == null || !e.lines) { drift.push(`${e.id} ${e.file}: not found at ${e.sha.slice(0, 7)}`); continue; }
  const window = src.split('\n').slice(e.lines[0] - 1, e.lines[1]).map(norm).join('\n');
  const first = e.snippet.split('\n').map(norm).find((l) => l.length > 3 && !l.includes('<redacted>'));
  checked++;
  if (first && !window.includes(first.slice(0, 60))) drift.push(`${e.id} ${e.file}:${e.lines.join('-')}`);
}
console.log(`validated ${checked} entries at their pinned commits; skipped (no local copy): ${[...skipped].join(', ') || 'none'}`);
if (drift.length) console.log(`drift (${drift.length}):\n  ` + drift.slice(0, 60).join('\n  '));
if (secrets.length) console.log(`SECRET-LIKE STRINGS (${secrets.length}):\n  ` + secrets.join('\n  '));
process.exit(secrets.length || (process.argv.includes('--strict') && drift.length) ? 1 : 0);

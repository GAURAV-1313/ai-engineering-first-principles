// Fetch every library source at its pinned commit into vendor/<id> (gitignored, never modified).
// Usage: node scripts/vendor.mjs [id ...]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'data/library.config.json'), 'utf8'));
const only = process.argv.slice(2);

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// Signatures that identify a licence text; SPDX id -> test.
const SIGNATURES = {
  'Apache-2.0': (t) => /Apache License/i.test(t) && /Version 2\.0/i.test(t),
  MIT: (t) => /\bMIT License\b/i.test(t) || /Permission is hereby granted, free of charge/i.test(t),
};

export function checkLicense(dir, s) {
  const file = s.licenseFile ?? 'LICENSE';
  const path = join(dir, file);
  if (!existsSync(path)) throw new Error(`${s.id}: licence file ${file} not found at ${s.commit.slice(0, 7)}`);
  const text = readFileSync(path, 'utf8');
  const test = SIGNATURES[s.license];
  if (!test) throw new Error(`${s.id}: no signature known for expected licence ${s.license}`);
  if (!test(text)) throw new Error(`${s.id}: ${file} at ${s.commit.slice(0, 7)} does not look like ${s.license}. Stop and re-check ${s.repo} before using it.`);
  const out = [`${s.license} in ${file}`];
  if (s.contentLicense) {
    const c = s.contentLicense;
    const p = join(dir, c.file);
    if (!existsSync(p) || !readFileSync(p, 'utf8').includes(c.match)) {
      throw new Error(`${s.id}: expected ${c.spdx} (text "${c.match}") in ${c.file} at ${s.commit.slice(0, 7)} but did not find it.`);
    }
    out.push(`${c.spdx} in ${c.file}`);
  }
  return out.join('; ');
}

function sparsePatterns(s) {
  const pats = new Set(['/' + (s.licenseFile ?? 'LICENSE')]);
  if (s.contentLicense) pats.add('/' + s.contentLicense.file);
  for (const d of s.docs) pats.add('/' + d.path);
  return [...pats];
}

function vendor(s) {
  const dir = join(root, 'vendor', s.id);
  let head = '';
  if (existsSync(join(dir, '.git'))) { try { head = git(dir, 'rev-parse', 'HEAD'); } catch {} }
  if (head === s.commit) {
    console.log(`= ${s.id} already at ${s.commit.slice(0, 7)}`);
  } else {
    console.log(`+ ${s.id}: fetching ${s.commit.slice(0, 7)} from ${s.repo}`);
    mkdirSync(dir, { recursive: true });
    if (!existsSync(join(dir, '.git'))) git(dir, 'init', '-q');
    try { git(dir, 'remote', 'add', 'origin', s.repo); } catch { git(dir, 'remote', 'set-url', 'origin', s.repo); }
    // Only the selected docs and the licence files are checked out; the pinned commit is still the whole snapshot.
    git(dir, 'config', 'core.sparseCheckout', 'true');
    execFileSync('git', ['sparse-checkout', 'set', '--no-cone', '--stdin'], { cwd: dir, input: sparsePatterns(s).join('\n') + '\n', stdio: ['pipe', 'pipe', 'pipe'] });
    try { git(dir, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', s.commit); }
    catch { git(dir, 'fetch', '-q', '--depth', '1', 'origin', s.commit); }
    git(dir, 'checkout', '-q', '--force', '--detach', 'FETCH_HEAD');
    const got = git(dir, 'rev-parse', 'HEAD');
    if (got !== s.commit) throw new Error(`${s.id}: fetched ${got}, expected ${s.commit}`);
  }
  const missing = s.docs.filter((d) => !existsSync(join(dir, d.path))).map((d) => d.path);
  if (missing.length) throw new Error(`${s.id}: configured docs not found at the pinned commit:\n  ${missing.join('\n  ')}`);
  console.log(`  licence ok: ${checkLicense(dir, s)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    for (const s of config.sources) if (!only.length || only.includes(s.id)) vendor(s);
    console.log('vendor: done');
  } catch (e) {
    console.error(`\nvendor: STOP. ${e.stderr?.toString().trim() || e.message}`);
    process.exit(1);
  }
}

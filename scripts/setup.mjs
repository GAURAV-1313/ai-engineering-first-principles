// One-shot: fetch the pinned library sources, then build the library index.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
for (const script of ['vendor.mjs', 'build-library.mjs']) {
  try { execFileSync(process.execPath, [join(here, script)], { stdio: 'inherit' }); }
  catch { process.exit(1); }
}

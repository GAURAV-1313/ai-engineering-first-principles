import { createHighlighter, type Highlighter } from 'shiki';

const LANGS: Record<string, string> = {
  py: 'python', ts: 'typescript', tsx: 'tsx', js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  jsx: 'jsx', dart: 'dart', sql: 'sql', yml: 'yaml', yaml: 'yaml', json: 'json', jsonc: 'jsonc',
  toml: 'toml', sh: 'shellscript', bash: 'shellscript', html: 'html', css: 'css', conf: 'nginx',
  md: 'markdown', swift: 'swift', kt: 'kotlin', go: 'go', ini: 'ini', gs: 'javascript', xml: 'xml',
  gradle: 'groovy', plist: 'xml', txt: 'text', env: 'dotenv',
};

export function langFor(file: string): string {
  const base = file.split('/').pop() ?? '';
  if (/^Dockerfile/i.test(base)) return 'docker';
  if (/^docker-compose/i.test(base)) return 'yaml';
  if (base === 'Caddyfile' || base === 'Procfile') return 'text';
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : '';
  return LANGS[ext] ?? 'text';
}

let hl: Promise<Highlighter> | null = null;
function highlighter() {
  hl ??= createHighlighter({
    themes: ['github-light', 'github-dark-dimmed'],
    langs: [...new Set(Object.values(LANGS).filter((l) => l !== 'text')), 'docker'],
  });
  return hl;
}

/** Highlight at build time; both themes are emitted, CSS picks one. */
export async function highlight(code: string, file: string): Promise<string> {
  const h = await highlighter();
  return h.codeToHtml(code, {
    lang: langFor(file),
    themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    defaultColor: false,
  });
}

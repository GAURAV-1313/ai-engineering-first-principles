// Site-wide SEO / AEO constants and JSON-LD builders. The canonical origin comes from `site` in astro.config.mjs.
export const SITE_NAME = 'AI Engineering from First Principles';
export const SITE_DESCRIPTION =
  'A free, open study guide to AI engineering: 34 chapters on LLMs, tokenization, embeddings, RAG, evals, agents, MCP and production LLM systems, built up from the mechanism, with interview questions, system-design drills and real code annotated in the margin.';
export const AUTHOR = { '@type': 'Person', name: 'Gaurav Singh' } as const;

export const abs = (site: URL | undefined, path: string) => new URL(path, site ?? 'http://localhost:4321').href;

/** Strip markdown/MDX to plain text for meta and JSON-LD. */
export function plain(md: string, max = 0): string {
  const t = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!max || t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export function breadcrumbs(site: URL | undefined, trail: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(site, path) })),
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((x) => ({
      '@type': 'Question', name: plain(x.q),
      acceptedAnswer: { '@type': 'Answer', text: plain(x.a, 1200) },
    })),
  };
}

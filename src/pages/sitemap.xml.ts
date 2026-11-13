// sitemap.xml: every indexable page. The library's mirrored third-party docs are noindex, so they are left out.
import type { APIRoute } from 'astro';
import { execSync } from 'node:child_process';
import { getCollection } from 'astro:content';
import { chapters, chapterHref } from '../lib/outline';
import { repos } from '../lib/data';

const lastmod = (path: string) => {
  try { return execSync(`git log -1 --format=%cs -- "${path}"`, { encoding: 'utf8' }).trim() || undefined; } catch { return undefined; }
};

export const GET: APIRoute = async ({ site }) => {
  const entries = await getCollection('chapters');
  const fileOf = Object.fromEntries(entries.map((e) => [e.data.id, e.filePath]));
  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: '/', priority: '1.0', lastmod: lastmod('src/content/chapters') },
    ...chapters.map((c) => ({ loc: chapterHref(c), priority: '0.9', lastmod: fileOf[c.id] ? lastmod(fileOf[c.id]!) : undefined })),
    { loc: '/interview/', priority: '0.8', lastmod: lastmod('src/pages/interview') },
    ...(await getCollection('drills')).map((d) => ({ loc: `/interview/${d.data.id.toLowerCase()}/`, priority: '0.7', lastmod: d.filePath ? lastmod(d.filePath) : undefined })),
    { loc: '/library/', priority: '0.5' },
    { loc: '/repos/', priority: '0.5' },
    ...repos.map((r) => ({ loc: `/repos/${r.slug}/`, priority: '0.4' })),
    { loc: '/gaps/', priority: '0.5' },
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${new URL(u.loc, site).href}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

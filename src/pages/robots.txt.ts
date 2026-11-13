// robots.txt: open to search and AI answer engines in production; closed on anything else.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const body = import.meta.env.DEV || process.env.AIE_PRIVATE
    ? 'User-agent: *\nDisallow: /\n'
    : `# Search engines and AI answer engines are welcome.
User-agent: *
Allow: /
Disallow: /search-index.json

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${new URL('/sitemap.xml', site).href}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

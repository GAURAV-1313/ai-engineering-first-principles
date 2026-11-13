// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { rehypeSections } from './src/plugins/rehype-sections.mjs';

export default defineConfig({
  // Canonical origin for SEO (canonical links, sitemap, JSON-LD). Override with SITE_URL for a custom domain.
  site: process.env.SITE_URL ?? 'https://ai-engineering-first-principles.netlify.app',
  integrations: [mdx()],
  markdown: {
    rehypePlugins: [rehypeSections],
    shikiConfig: { themes: { light: 'github-dark-dimmed', dark: 'github-dark-dimmed' }, wrap: false },
  },
  build: { format: 'directory' },
});

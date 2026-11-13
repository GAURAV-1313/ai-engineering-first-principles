// Gives every chapter `##` heading its declared section id from data/outline.json.
// The heading text is slugified with the same function as the outline; a match sets
//   id="<slug>" data-sec="CC.SS" data-num="CC.SS"
// Headings that match no declared section are flagged data-sec-unknown (check-outline fails on them).
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { visit } from 'unist-util-visit';

export const slugify = (s) =>
  s.toLowerCase().replace(/[`'’"]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const textOf = (n) => (n.type === 'text' ? n.value : (n.children ?? []).map(textOf).join(''));

let outline = null;
const load = () => (outline ??= JSON.parse(readFileSync(resolve(import.meta.dirname, '../../data/outline.json'), 'utf8')));

export function rehypeSections() {
  return (tree, file) => {
    const m = basename(file.path ?? '').match(/^(\d\d)-/);
    if (!m) return;
    const ch = load().chapters.find((c) => c.id === m[1]);
    if (!ch) return;
    const bySlug = new Map(ch.sections.map((s) => [s.slug, s]));
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2') return;
      const slug = slugify(textOf(node));
      const sec = bySlug.get(slug);
      node.properties ??= {};
      if (sec) {
        node.properties.id = sec.slug;
        node.properties.dataSec = sec.id;
        node.properties.dataNum = sec.id;
      } else {
        node.properties.dataSecUnknown = '';
      }
    });
  };
}

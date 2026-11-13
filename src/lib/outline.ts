import outline from '../../data/outline.json';

export interface Section { id: string; title: string; slug: string }
export interface Question { q: string; reported: boolean; note?: string }
export interface Chapter {
  id: string; slug: string; title: string; part: string; weight: number; fastTrack: boolean;
  sections: Section[]; production: Record<string, string>; interview: Question[];
  applyIt: string; sources: string; selfWrite: boolean;
}
export interface Part { id: string; title: string; chapters: string[] }

export const parts = outline.parts as Part[];
export const chapters = outline.chapters as Chapter[];
export const chapterById: Record<string, Chapter> = Object.fromEntries(chapters.map((c) => [c.id, c]));
export const sectionById: Record<string, Section & { chapter: Chapter }> = Object.fromEntries(
  chapters.flatMap((c) => c.sections.map((s) => [s.id, { ...s, chapter: c }])),
);
export const chapterHref = (c: Chapter | string) => {
  const ch = typeof c === 'string' ? chapterById[c] : c;
  return `/${ch.id}-${ch.slug}/`;
};
export const sectionHref = (id: string) => {
  const s = sectionById[id];
  if (s) return `${chapterHref(s.chapter)}#${s.slug}`;
  const c = chapterById[id.slice(0, 2)];
  return c ? chapterHref(c) : '/';
};
export const stars = (w: number) => '★'.repeat(w);
export const weightWord = (w: number) => (w === 3 ? 'core' : w === 2 ? 'important' : 'literacy');
export const FAST_TRACK = ['03', '10', '11', '12', '13', '15', '17', '18', '19', '20', '21', '22', '23', '27', '31', '33', '30', '32'];
export const PROD_LABEL: Record<string, string> = { F: 'Failure modes', C: 'Cost', L: 'Latency', O: 'Observability', S: 'Security' };

/** Turn the outline's free-text sources into linkable pieces (URLs become links). */
export function linkify(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(text).replace(/https?:\/\/[^\s);,]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>`)
    .replace(/\((V|K|S)\)/g, '');
}

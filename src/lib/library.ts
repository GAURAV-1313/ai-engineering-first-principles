import lib from '../../data/gen/library.json';

export interface LibraryDoc {
  source: string; sourceTitle: string; license: string; author: string; repo: string; commit: string;
  doc: string; title: string; href: string; chapters: string[]; note?: string; licenseNote?: string;
}
export const libraryDocs = (lib as { docs: LibraryDoc[] }).docs ?? [];
export const libraryForChapter = (id: string) => libraryDocs.filter((d) => d.chapters.includes(id));

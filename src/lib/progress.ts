// Self-check for interview questions: numbering + "I can answer this" stored in localStorage.
const KEY = 'aie-known';
export const loadKnown = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const saveKnown = (k: Record<string, number>) => { try { localStorage.setItem(KEY, JSON.stringify(k)); } catch { /* private mode */ } };

export function initQuestions() {
  const known = loadKnown();
  document.querySelectorAll<HTMLElement>('[data-qlist]').forEach((list) => {
    const ch = list.closest<HTMLElement>('[data-chapter-id]')?.dataset.chapterId ?? '';
    list.querySelectorAll<HTMLDetailsElement>('.q').forEach((q, i) => {
      const n = q.querySelector('.q-n'); if (n) n.textContent = `Q${i + 1}`;
      const key = `${ch}:${q.dataset.qKey}`;
      const box = q.querySelector<HTMLInputElement>('[data-q-known]');
      if (known[key]) { q.classList.add('is-known'); if (box) box.checked = true; }
      box?.addEventListener('change', () => {
        const k = loadKnown();
        if (box.checked) k[key] = Date.now(); else delete k[key];
        saveKnown(k); q.classList.toggle('is-known', box.checked);
      });
    });
  });
}

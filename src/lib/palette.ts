// Cmd-K palette: one small JSON index, client-side ranking, keyboard only.
type Item = { t: string; id?: string; title: string; href: string; meta?: string; n?: number;
  repo?: string; q?: string; layer?: string; mine?: boolean; _h?: string };
const GROUP_LABEL: Record<string, string> = { chapter: 'Chapters', concept: 'Concepts', question: 'Interview questions', drill: 'Design drills', repo: 'Repos', flow: 'Flows', code: 'Your code' };
const ORDER = ['chapter', 'concept', 'question', 'drill', 'repo', 'flow', 'code'];
const LIMIT: Record<string, number> = { chapter: 4, concept: 8, question: 6, drill: 3, repo: 4, flow: 4, code: 8 };

export function initPalette() {
  const dlg = document.querySelector<HTMLDialogElement>('[data-palette]');
  const input = dlg?.querySelector<HTMLInputElement>('[data-palette-input]');
  const list = dlg?.querySelector<HTMLUListElement>('[data-palette-list]');
  if (!dlg || !input || !list) return;
  let items: Item[] | null = null;
  let results: Item[] = [];
  let sel = 0;

  const load = async () => {
    if (items) return;
    const res = await fetch('/search-index.json');
    items = (await res.json()) as Item[];
    for (const it of items) it._h = `${it.id ?? ''} ${it.title} ${it.meta ?? ''}`.toLowerCase();
  };
  const open = async () => {
    if (!dlg.open) dlg.showModal();
    input.select();
    await load(); render();
  };
  const close = () => dlg.close();

  function search(raw: string): Item[] {
    if (!items) return [];
    const filters: Record<string, string> = {}; let mine = false;
    const words = raw.toLowerCase().split(/\s+/).filter((w) => {
      const m = w.match(/^(repo|layer|q):(.+)$/);
      if (m) { filters[m[1]] = m[2]; return false; }
      if (w === 'mine') { mine = true; return false; }
      return true;
    });
    const filtering = Object.keys(filters).length > 0 || mine;
    const scored: [number, Item][] = [];
    for (const it of items) {
      if (filtering) {
        if (it.t !== 'code') continue;
        if (filters.repo && !(it.repo?.startsWith(filters.repo) || it.id?.toLowerCase() === filters.repo)) continue;
        if (filters.layer && it.layer !== filters.layer) continue;
        if (filters.q && it.q !== filters.q) continue;
        if (mine && !it.mine) continue;
      }
      if (!words.length) { if (filtering || it.t === 'chapter') scored.push([0, it]); continue; }
      let score = 0; let ok = true;
      const title = it.title.toLowerCase();
      for (const w of words) {
        const i = it._h!.indexOf(w);
        if (i < 0) { ok = false; break; }
        score += title.startsWith(w) ? 6 : title.includes(` ${w}`) ? 4 : title.includes(w) ? 3 : 1;
        if (it.id && it.id.toLowerCase() === w) score += 8;
      }
      if (ok) scored.push([score + (it.n ? Math.min(it.n, 6) * 0.2 : 0), it]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    const per: Record<string, number> = {};
    return scored.map((s) => s[1]).filter((it) => (per[it.t] = (per[it.t] ?? 0) + 1) <= (filtering ? 40 : LIMIT[it.t]))
      .sort((a, b) => ORDER.indexOf(a.t) - ORDER.indexOf(b.t));
  }

  function render() {
    results = search(input.value);
    sel = Math.min(sel, Math.max(results.length - 1, 0));
    list.replaceChildren();
    if (!results.length) {
      const li = document.createElement('li'); li.className = 'pal-empty';
      li.textContent = 'Nothing matches. Try fewer words, or a section id like 17.04.'; list.append(li); return;
    }
    let group = '';
    results.forEach((it, i) => {
      if (it.t !== group) {
        group = it.t; const h = document.createElement('li'); h.className = 'pal-group'; h.setAttribute('role', 'presentation');
        h.textContent = GROUP_LABEL[it.t]; list.append(h);
      }
      const li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = `pal-o-${i}`;
      li.className = 'pal-item'; li.setAttribute('aria-selected', String(i === sel));
      const a = document.createElement('a'); a.href = it.href; a.tabIndex = -1;
      const id = document.createElement('span'); id.className = 'pal-id'; id.textContent = it.id ?? '';
      const t = document.createElement('span'); t.className = 'pal-t'; t.textContent = it.title;
      const m = document.createElement('span'); m.className = 'pal-m'; m.textContent = it.meta ?? '';
      if (it.q && it.q !== 'solid') { t.textContent += it.q === 'naive' ? '  ◐' : '  ○'; }
      a.append(id, t, m); li.append(a);
      li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(); } });
      list.append(li);
    });
    mark();
  }
  function mark() {
    list.querySelectorAll('.pal-item').forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
    const cur = list.querySelector<HTMLElement>(`#pal-o-${sel}`);
    input.setAttribute('aria-activedescendant', cur?.id ?? '');
    cur?.scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); sel = Math.min(sel + 1, results.length - 1); mark(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
    else if (ev.key === 'Enter' && results[sel]) { ev.preventDefault(); location.href = results[sel].href; close(); }
  });
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) close(); });
  document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', open));
  addEventListener('keydown', (ev) => {
    const typing = (ev.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]');
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); dlg.open ? close() : open(); }
    else if (ev.key === '/' && !typing && !dlg.open) { ev.preventDefault(); open(); }
  });
}

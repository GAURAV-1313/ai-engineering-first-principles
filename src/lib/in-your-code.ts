// Client behaviour for the "In real code" margin: follow the section being read,
// mark the outline, inline openers + bottom sheet on narrow screens, repo filter, compare.
const GLYPH: Record<string, string> = { solid: '●', naive: '◐' };

export function initInYourCode() {
  const aside = document.querySelector<HTMLElement>('[data-iyc]');
  const prose = document.querySelector<HTMLElement>('.prose');
  if (!aside || !prose) return;
  const groups = new Map<string, HTMLElement>();
  aside.querySelectorAll<HTMLElement>('.iyc-group').forEach((g) => groups.set(g.dataset.section!, g));
  const h2s = [...prose.querySelectorAll<HTMLHeadingElement>('h2[data-sec]')];
  const secOf = (h: HTMLElement) => (h.dataset.sec ?? '').slice(3);
  const scrim = document.querySelector<HTMLElement>('[data-scrim]');
  const narrow = matchMedia('(max-width: 1079px)');
  const endMark = document.querySelector<HTMLElement>('section.block');

  // --- reading progress ----------------------------------------------------
  const fill = document.querySelector<HTMLElement>('.progress-fill');
  const progress = () => {
    if (!fill) return;
    const span = prose.offsetHeight - innerHeight;
    const pct = span <= 0 ? 1 : (scrollY - prose.offsetTop) / span;
    fill.style.width = `${Math.min(Math.max(pct, 0), 1) * 100}%`;
  };

  // --- active section --------------------------------------------------------
  let active = '';
  const show = (n: string) => {
    if (n === active) return;
    active = n;
    // outline: highlight the current section and keep it in view
    document.querySelectorAll('.toc-link.is-current').forEach((l) => l.classList.remove('is-current'));
    const h = n === '00' ? null : h2s.find((x) => secOf(x) === n) ?? null;
    const link = h && document.querySelector<HTMLElement>(`[data-toc-link="${CSS.escape(h.id)}"]`);
    if (link) { link.classList.add('is-current'); link.scrollIntoView({ block: 'nearest' }); }
    groups.forEach((g, key) => { g.hidden = key !== n; });
    // The closing blocks have no section cards: hide the whole margin there, label included.
    aside.style.visibility = n === 'end' ? 'hidden' : '';
    const g = groups.get(n);
    if (g) { g.classList.remove('is-in'); void g.offsetWidth; g.classList.add('is-in'); }
    aside.querySelector('.iyc-inner')?.scrollTo({ top: 0 });
  };
  const current = () => {
    const line = innerHeight * 0.3;
    let idx = -1;
    for (let i = 0; i < h2s.length; i++) { if (h2s[i].getBoundingClientRect().top <= line) idx = i; else break; }
    // Past the last section, in the closing blocks (In production, Interview...): no section cards apply.
    if (endMark && endMark.getBoundingClientRect().top <= line) return 'end';
    return idx < 0 ? '00' : secOf(h2s[idx]);
  };
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ticking = false; progress(); if (!narrow.matches) show(current()); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  show(location.hash ? sectionOfHash() : current());
  progress();

  function sectionOfHash() {
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!t) return '00';
    let idx = -1;
    h2s.forEach((h, i) => { if (h.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING || h === t) idx = i; });
    return idx < 0 ? '00' : secOf(h2s[idx]);
  }

  // --- outline marks + inline openers ----------------------------------------
  h2s.forEach((h) => {
    const sn = secOf(h);
    const g = groups.get(sn);
    if (!g) return;
    const count = Number(g.dataset.count), repos = Number(g.dataset.repos);
    const solid = !!g.querySelector('.ev[data-quality="solid"]');
    const link = document.querySelector(`[data-toc-link="${CSS.escape(h.id)}"]`);
    if (link && count) {
      const mark = document.createElement('span');
      mark.className = 'toc-cov'; mark.textContent = solid ? GLYPH.solid : GLYPH.naive;
      mark.title = `${count} example${count === 1 ? '' : 's'} from ${repos} repo${repos === 1 ? '' : 's'}`;
      link.append(mark);
    }
    if (!count) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'iyc-inline';
    btn.innerHTML = `<span class="iyc-kicker">In real code</span><span>${count} example${count === 1 ? '' : 's'} · ${repos} repo${repos === 1 ? '' : 's'}</span>`;
    btn.addEventListener('click', () => openSheet(sn));
    h.insertAdjacentElement('afterend', btn);
  });

  // --- bottom sheet (narrow screens) -----------------------------------------
  function openSheet(n: string) {
    active = ''; show(n);
    aside.classList.add('is-sheet-open'); if (scrim) scrim.hidden = false;
    document.documentElement.classList.add('sheet-lock');
    aside.querySelector<HTMLElement>('[data-iyc-close]')?.focus();
  }
  function closeSheet() {
    aside.classList.remove('is-sheet-open'); if (scrim) scrim.hidden = true;
    document.documentElement.classList.remove('sheet-lock');
  }
  aside.querySelector('[data-iyc-close]')?.addEventListener('click', closeSheet);
  scrim?.addEventListener('click', closeSheet);
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeSheet(); });
  narrow.addEventListener('change', () => { closeSheet(); active = ''; if (!narrow.matches) show(current()); });

  // --- repo filter chips -------------------------------------------------------
  aside.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const group = chip.closest<HTMLElement>('.iyc-group')!;
      const on = chip.getAttribute('aria-pressed') !== 'true';
      group.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(on && c === chip)));
      group.querySelectorAll<HTMLElement>('.ev').forEach((card) => {
        card.hidden = on && card.dataset.repo !== chip.dataset.filter;
      });
    });
  });

  // ?repo=<slug>: start every section filtered to one repo (links from the atlas and repo pages)
  const only = new URLSearchParams(location.search).get('repo');
  if (only) aside.querySelectorAll<HTMLButtonElement>(`[data-filter="${CSS.escape(only)}"]`).forEach((c) => c.click());

  // --- compare dialog ----------------------------------------------------------
  const dlg = document.querySelector<HTMLDialogElement>('[data-cmp]');
  const grid = dlg?.querySelector<HTMLElement>('[data-cmp-grid]');
  const title = dlg?.querySelector<HTMLElement>('[data-cmp-title]');
  aside.querySelectorAll<HTMLButtonElement>('[data-compare]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!dlg || !grid || !title) return;
      const group = btn.closest<HTMLElement>('.iyc-group')!;
      title.textContent = group.querySelector('.iyc-gtitle')?.textContent?.trim() ?? '';
      grid.replaceChildren();
      const seen = new Set<string>();
      group.querySelectorAll<HTMLElement>('.ev').forEach((card) => {
        const repo = card.dataset.repo!;
        if (seen.has(repo) || seen.size >= 3) return;
        seen.add(repo);
        const clone = card.cloneNode(true) as HTMLDetailsElement;
        clone.open = true; clone.hidden = false;
        grid.append(clone);
      });
      grid.style.setProperty('--cols', String(seen.size));
      dlg.showModal();
    });
  });
  dlg?.querySelector('[data-cmp-close]')?.addEventListener('click', () => dlg.close());
  dlg?.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
}

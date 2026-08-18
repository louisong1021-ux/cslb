(() => {
  const tbody = document.querySelector('#rallyBody');
  const tableWrap = document.querySelector('.record-panel > .table-wrap');
  const games = document.querySelector('#gameTabs');
  const addBtn = document.querySelector('#addRallyBtn');
  const viewResultsBtn = document.querySelector('#viewResultsBtn');
  const backBtn = document.querySelector('#backBtn');
  if (!tbody || !tableWrap || !games || !addBtn) return;

  document.body.classList.add('rally-footer-mode');

  const editorBar = document.createElement('div');
  editorBar.className = 'rally-editor-bar';
  editorBar.innerHTML = '<strong id="rallyEditorTitle">第 1 分</strong><button type="button" class="rally-editor-close" aria-label="关闭本分录入">×</button>';
  tableWrap.insertBefore(editorBar, tableWrap.firstChild);

  const backdrop = document.createElement('div');
  backdrop.className = 'rally-editor-backdrop';
  document.body.appendChild(backdrop);

  const footer = document.createElement('div');
  footer.className = 'rally-footer-nav';
  footer.setAttribute('aria-label', '已记录回合');
  footer.innerHTML = '<div class="rally-footer-numbers"></div>';
  document.body.appendChild(footer);
  const numberWrap = footer.querySelector('.rally-footer-numbers');

  let activeIndex = -1;
  let editorOpen = false;
  let lastCount = 0;
  let lastGame = null;
  let scheduled = false;

  function rows() {
    return Array.from(tbody.querySelectorAll('tr'));
  }

  function currentGameKey() {
    return games.querySelector('.game-tab.active[data-game]')?.dataset.game || '0';
  }

  function setEditorOpen(open) {
    editorOpen = !!open && rows().length > 0;
    tableWrap.classList.toggle('rally-editor-active', editorOpen);
    document.body.classList.toggle('rally-editor-visible', editorOpen);
    if (editorOpen) {
      requestAnimationFrame(() => {
        tableWrap.scrollTop = 0;
        const activeButton = numberWrap.querySelector('.rally-number.active');
        activeButton?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    }
  }

  function updateEditorTitle() {
    const title = editorBar.querySelector('#rallyEditorTitle');
    if (!title) return;
    title.textContent = activeIndex >= 0 ? `第 ${activeIndex + 1} 分` : '本分录入';
  }

  function markRows(list) {
    list.forEach((row, index) => {
      const active = index === activeIndex;
      row.classList.toggle('rally-editor-row-active', active);
      row.classList.toggle('rally-editor-row-hidden', !active);
    });
  }

  function renderFooter(list) {
    footer.classList.toggle('has-rallies', list.length > 0);
    const fragment = document.createDocumentFragment();
    list.forEach((row, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rally-number';
      button.dataset.rallyIndex = String(index);
      button.textContent = String(index + 1);
      button.setAttribute('aria-label', `打开第 ${index + 1} 分录入`);
      if (index === activeIndex) button.classList.add('active');

      const scorer = row.querySelector('select.scorer')?.value;
      if (scorer === '我方') button.dataset.scorer = 'ours';
      else if (scorer === '对方') button.dataset.scorer = 'theirs';
      fragment.appendChild(button);
    });
    numberWrap.replaceChildren(fragment);
  }

  function sync() {
    scheduled = false;
    const list = rows();
    const count = list.length;
    const game = currentGameKey();
    const gameChanged = game !== lastGame;

    if (gameChanged) {
      activeIndex = count ? count - 1 : -1;
      editorOpen = count > 0;
    } else if (count > lastCount) {
      // A new rally was added: make it the only visible/editable rally.
      activeIndex = count - 1;
      editorOpen = true;
    } else if (count < lastCount) {
      activeIndex = count ? Math.min(Math.max(activeIndex, 0), count - 1) : -1;
      if (!count) editorOpen = false;
    } else if (count && (activeIndex < 0 || activeIndex >= count)) {
      activeIndex = count - 1;
    }

    markRows(list);
    renderFooter(list);
    updateEditorTitle();
    setEditorOpen(editorOpen);

    lastCount = count;
    lastGame = game;
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(sync);
  }

  numberWrap.addEventListener('click', event => {
    const button = event.target.closest('.rally-number[data-rally-index]');
    if (!button) return;
    const index = Number(button.dataset.rallyIndex);
    const list = rows();
    if (!Number.isInteger(index) || index < 0 || index >= list.length) return;
    activeIndex = index;
    markRows(list);
    renderFooter(list);
    updateEditorTitle();
    setEditorOpen(true);
  });

  editorBar.querySelector('.rally-editor-close').addEventListener('click', () => setEditorOpen(false));
  backdrop.addEventListener('click', () => setEditorOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && editorOpen) setEditorOpen(false);
  });

  document.addEventListener('change', event => {
    if (tbody.contains(event.target)) scheduleSync();
  }, true);

  addBtn.addEventListener('click', () => {
    // Core app adds the row synchronously; the observer below will select the new last row.
    scheduleSync();
  }, true);

  viewResultsBtn?.addEventListener('click', () => setEditorOpen(false), true);
  backBtn?.addEventListener('click', () => scheduleSync(), true);

  const observer = new MutationObserver(scheduleSync);
  observer.observe(tbody, { childList: true, subtree: true });
  observer.observe(games, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  lastCount = rows().length;
  lastGame = currentGameKey();
  activeIndex = lastCount ? lastCount - 1 : -1;
  editorOpen = lastCount > 0;
  sync();
})();

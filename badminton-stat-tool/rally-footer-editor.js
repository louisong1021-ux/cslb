(() => {
  const tbody = document.querySelector('#rallyBody');
  const tableWrap = document.querySelector('.record-panel > .table-wrap');
  const games = document.querySelector('#gameTabs');
  const addBtn = document.querySelector('#addRallyBtn');
  const viewResultsBtn = document.querySelector('#viewResultsBtn');
  const backBtn = document.querySelector('#backBtn');
  if (!tbody || !tableWrap || !games || !addBtn) return;

  document.body.classList.add('rally-footer-mode');

  const footer = document.createElement('div');
  footer.className = 'rally-footer-nav';
  footer.setAttribute('aria-label', '已记录回合');
  footer.innerHTML = '<div class="rally-footer-numbers"></div>';
  document.body.appendChild(footer);
  const numberWrap = footer.querySelector('.rally-footer-numbers');

  let activeIndex = -1;
  let lastCount = 0;
  let lastGame = null;
  let scheduled = false;

  function rows() {
    return Array.from(tbody.querySelectorAll('tr'));
  }

  function currentGameKey() {
    return games.querySelector('.game-tab.active[data-game]')?.dataset.game || '0';
  }

  function applyMode() {
    const hasRows = rows().length > 0;
    tableWrap.classList.toggle('rally-editor-inline', hasRows);
    tableWrap.classList.remove('rally-editor-active');
    document.body.classList.remove('rally-editor-visible');
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
      button.setAttribute('aria-label', index === list.length - 1 ? `当前第 ${index + 1} 分` : `查看第 ${index + 1} 分`);
      if (index === activeIndex) button.classList.add('active');
      if (index === list.length - 1) button.classList.add('latest');

      const scorer = row.querySelector('select.scorer')?.value;
      if (scorer === '我方') button.dataset.scorer = 'ours';
      else if (scorer === '对方') button.dataset.scorer = 'theirs';
      fragment.appendChild(button);
    });

    numberWrap.replaceChildren(fragment);
  }

  function showLatestInline() {
    const list = rows();
    activeIndex = list.length ? list.length - 1 : -1;
    markRows(list);
    renderFooter(list);
    applyMode();
  }

  function suspendFooter() {
    footer.classList.add('rally-footer-suspended');
  }

  function resumeFooter() {
    footer.classList.remove('rally-footer-suspended');
    queueMicrotask(showLatestInline);
  }

  function sync() {
    scheduled = false;
    const list = rows();
    const count = list.length;
    const game = currentGameKey();
    const gameChanged = game !== lastGame;

    if (gameChanged || count > lastCount || count < lastCount) {
      activeIndex = count ? count - 1 : -1;
    } else if (count && (activeIndex < 0 || activeIndex >= count)) {
      activeIndex = count - 1;
    }

    markRows(list);
    renderFooter(list);
    applyMode();

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

    // 历史回合直接在原位置切换显示，不再弹出或放大。
    activeIndex = index;
    markRows(list);
    renderFooter(list);
    applyMode();
  });

  // 页脚数字只依赖回合数量和得分方；其他统计字段变化不再整条重绘页脚。
  document.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.classList.contains('scorer') && tbody.contains(target)) {
      scheduleSync();
    }
  }, true);

  addBtn.addEventListener('click', () => scheduleSync(), true);

  viewResultsBtn?.addEventListener('click', suspendFooter, true);
  backBtn?.addEventListener('click', resumeFooter, true);

  // 实时统计是独立页面，进入时隐藏回合页脚；返回录入时恢复。
  document.addEventListener('badminton:open-stats', suspendFooter);
  document.addEventListener('click', event => {
    if (event.target.closest('.stats-page-back')) resumeFooter();
  }, true);

  const observer = new MutationObserver(scheduleSync);
  observer.observe(tbody, { childList: true });
  observer.observe(games, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  lastCount = rows().length;
  lastGame = currentGameKey();
  activeIndex = lastCount ? lastCount - 1 : -1;
  sync();
})();

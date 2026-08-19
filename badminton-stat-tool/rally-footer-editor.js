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
  editorBar.innerHTML = '<strong id="rallyEditorTitle">第 1 分</strong><button type="button" class="rally-editor-close" aria-label="关闭旧回合">×</button>';
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
  let floatingOld = false;
  let lastCount = 0;
  let lastGame = null;
  let scheduled = false;

  function rows() {
    return Array.from(tbody.querySelectorAll('tr'));
  }

  function currentGameKey() {
    return games.querySelector('.game-tab.active[data-game]')?.dataset.game || '0';
  }

  function isOldIndex(index, list = rows()) {
    return index >= 0 && index < list.length - 1;
  }

  function applyMode() {
    const list = rows();
    const hasRows = list.length > 0;
    const shouldFloat = hasRows && floatingOld && isOldIndex(activeIndex, list);

    floatingOld = shouldFloat;
    tableWrap.classList.toggle('rally-editor-active', shouldFloat);
    tableWrap.classList.toggle('rally-editor-inline', hasRows && !shouldFloat);
    document.body.classList.toggle('rally-editor-visible', shouldFloat);

    if (shouldFloat) {
      requestAnimationFrame(() => {
        tableWrap.scrollTop = 0;
        numberWrap.querySelector('.rally-number.active')?.scrollIntoView({
          behavior: 'smooth', inline: 'center', block: 'nearest'
        });
      });
    }
  }

  function updateEditorTitle() {
    const title = editorBar.querySelector('#rallyEditorTitle');
    if (!title) return;
    title.textContent = activeIndex >= 0 ? `第 ${activeIndex + 1} 分` : '旧回合';
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
      button.setAttribute(
        'aria-label',
        index === list.length - 1 ? `当前第 ${index + 1} 分` : `浮动查看第 ${index + 1} 分`
      );
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
    floatingOld = false;
    markRows(list);
    renderFooter(list);
    updateEditorTitle();
    applyMode();
  }

  function sync() {
    scheduled = false;
    const list = rows();
    const count = list.length;
    const game = currentGameKey();
    const gameChanged = game !== lastGame;

    if (gameChanged || count > lastCount) {
      activeIndex = count ? count - 1 : -1;
      floatingOld = false;
    } else if (count < lastCount) {
      activeIndex = count ? count - 1 : -1;
      floatingOld = false;
    } else if (count && (activeIndex < 0 || activeIndex >= count)) {
      activeIndex = count - 1;
      floatingOld = false;
    }

    markRows(list);
    renderFooter(list);
    updateEditorTitle();
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

    activeIndex = index;
    floatingOld = isOldIndex(index, list);
    markRows(list);
    renderFooter(list);
    updateEditorTitle();
    applyMode();
  });

  editorBar.querySelector('.rally-editor-close').addEventListener('click', showLatestInline);
  backdrop.addEventListener('click', showLatestInline);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && floatingOld) showLatestInline();
  });

  // 页脚数字只依赖回合数量和得分方；其他统计字段变化不再整条重绘页脚。
  document.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.classList.contains('scorer') && tbody.contains(target)) {
      scheduleSync();
    }
  }, true);

  addBtn.addEventListener('click', () => scheduleSync(), true);

  viewResultsBtn?.addEventListener('click', () => {
    floatingOld = false;
    document.body.classList.remove('rally-editor-visible');
    tableWrap.classList.remove('rally-editor-active');
    footer.classList.add('rally-footer-suspended');
  }, true);

  backBtn?.addEventListener('click', () => {
    footer.classList.remove('rally-footer-suspended');
    queueMicrotask(showLatestInline);
  }, true);

  const observer = new MutationObserver(scheduleSync);
  observer.observe(tbody, { childList: true });
  observer.observe(games, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  lastCount = rows().length;
  lastGame = currentGameKey();
  activeIndex = lastCount ? lastCount - 1 : -1;
  floatingOld = false;
  sync();
})();

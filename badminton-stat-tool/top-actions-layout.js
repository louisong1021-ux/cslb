(() => {
  function init() {
    const recordPanel = document.querySelector('.record-panel');
    const toolbar = recordPanel?.querySelector('.toolbar');
    const games = document.querySelector('#gameTabs');
    const addBtn = document.querySelector('#addRallyBtn');
    const resultsBtn = document.querySelector('#viewResultsBtn');
    const clearBtn = document.querySelector('#clearGameBtn');
    const liveScore = document.querySelector('.live-score');
    const underTable = document.querySelector('.under-table');
    const recordCount = document.querySelector('#recordCount');
    const pageHeader = document.querySelector('.topbar');

    if (!recordPanel || !toolbar || !games || !addBtn || !resultsBtn) {
      requestAnimationFrame(init);
      return;
    }
    if (document.body.dataset.topActionsReady === '1') return;
    document.body.dataset.topActionsReady = '1';

    const actionRow = document.createElement('div');
    actionRow.className = 'top-primary-actions';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.id = 'resetAllBtn';
    resetBtn.className = 'top-primary-action top-primary-cache';
    resetBtn.textContent = '刷新清空';
    resetBtn.title = '删除所有比赛记录并刷新页面';

    games.classList.add('top-game-actions');
    addBtn.classList.add('top-primary-action', 'top-primary-add');
    resultsBtn.classList.add('top-primary-action', 'top-primary-results');

    // “清空本局”容易误触且与逐分删除/刷新清空功能重复，直接从录入界面移除。
    clearBtn?.remove();

    actionRow.append(games, addBtn, resultsBtn, resetBtn);
    toolbar.insertAdjacentElement('afterend', actionRow);

    resetBtn.addEventListener('click', () => {
      if (!confirm('确定删除所有比赛记录并刷新页面吗？\n此操作不可恢复。')) return;

      resetBtn.disabled = true;
      resetBtn.textContent = '正在重置…';

      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('badminton_match_stats_') || key.startsWith('badminton_our_server_'))) {
            keys.push(key);
          }
        }
        keys.forEach(key => localStorage.removeItem(key));

        const sessionKeys = [];
        for (let i = 0; i < sessionStorage.length; i += 1) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('badminton_')) sessionKeys.push(key);
        }
        sessionKeys.forEach(key => sessionStorage.removeItem(key));
      } catch {}

      window.location.reload();
    });

    if (recordCount) recordCount.remove();
    const summaryLine = toolbar.querySelector('.summary-line');
    if (summaryLine && !summaryLine.children.length && !summaryLine.textContent.trim()) summaryLine.remove();
    if (pageHeader) pageHeader.remove();
    if (liveScore) liveScore.remove();
    if (underTable && !underTable.children.length) underTable.remove();
  }

  init();
})();

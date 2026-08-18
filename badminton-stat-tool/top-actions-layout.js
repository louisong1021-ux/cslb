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

    if (!recordPanel || !toolbar || !games || !addBtn || !resultsBtn || !clearBtn) {
      requestAnimationFrame(init);
      return;
    }
    if (document.body.dataset.topActionsReady === '1') return;
    document.body.dataset.topActionsReady = '1';

    const actionRow = document.createElement('div');
    actionRow.className = 'top-primary-actions';

    const cacheBtn = document.createElement('button');
    cacheBtn.type = 'button';
    cacheBtn.id = 'clearCacheBtn';
    cacheBtn.className = 'top-primary-action top-primary-cache';
    cacheBtn.textContent = '清空缓存';
    cacheBtn.title = '清除网页缓存并重新加载，不删除比赛记录';

    games.classList.add('top-game-actions');
    addBtn.classList.add('top-primary-action', 'top-primary-add');
    resultsBtn.classList.add('top-primary-action', 'top-primary-results');
    clearBtn.classList.add('top-primary-action', 'top-primary-clear');

    actionRow.append(games, addBtn, resultsBtn, clearBtn, cacheBtn);
    toolbar.insertAdjacentElement('afterend', actionRow);

    cacheBtn.addEventListener('click', async () => {
      if (!confirm('清空网页缓存并重新加载？\n比赛记录不会删除。')) return;
      cacheBtn.disabled = true;
      cacheBtn.textContent = '清理中…';
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
      } catch {}

      const url = new URL(window.location.href);
      url.searchParams.set('_refresh', Date.now().toString());
      window.location.replace(url.toString());
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

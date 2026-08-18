(() => {
  function init() {
    const recordPanel = document.querySelector('.record-panel');
    const toolbar = recordPanel?.querySelector('.toolbar');
    const games = document.querySelector('#gameTabs');
    const rallyBody = document.querySelector('#rallyBody');
    const addBtn = document.querySelector('#addRallyBtn');
    const resultsBtn = document.querySelector('#viewResultsBtn');
    const clearBtn = document.querySelector('#clearGameBtn');
    const liveScore = document.querySelector('.live-score');
    const underTable = document.querySelector('.under-table');
    const recordCount = document.querySelector('#recordCount');
    const pageHeader = document.querySelector('.topbar');

    if (!recordPanel || !toolbar || !games || !rallyBody || !addBtn || !resultsBtn || !clearBtn) {
      requestAnimationFrame(init);
      return;
    }
    if (document.body.dataset.topActionsReady === '1') return;
    document.body.dataset.topActionsReady = '1';

    const actionRow = document.createElement('div');
    actionRow.className = 'top-primary-actions';

    const roundBtn = document.createElement('button');
    roundBtn.type = 'button';
    roundBtn.id = 'roundCountBtn';
    roundBtn.className = 'round-count-button';
    roundBtn.tabIndex = -1;
    roundBtn.setAttribute('aria-disabled', 'true');

    games.classList.add('top-game-actions');
    addBtn.classList.add('top-primary-action', 'top-primary-add');
    resultsBtn.classList.add('top-primary-action', 'top-primary-results');
    clearBtn.classList.add('top-primary-action', 'top-primary-clear');

    actionRow.append(games, addBtn, resultsBtn, clearBtn);
    toolbar.insertAdjacentElement('afterend', actionRow);

    function syncRoundButton() {
      const activeGame = games.querySelector('.game-tab.active') || games.querySelector('.game-tab[data-game]');
      if (activeGame && (roundBtn.parentElement !== games || activeGame.nextElementSibling !== roundBtn)) {
        activeGame.insertAdjacentElement('afterend', roundBtn);
      }
      const count = rallyBody.querySelectorAll('tr').length;
      const text = `回合 ${count}`;
      if (roundBtn.textContent !== text) roundBtn.textContent = text;
      roundBtn.setAttribute('aria-label', `当前局已记录 ${count} 个回合`);
    }

    const observer = new MutationObserver(syncRoundButton);
    observer.observe(games, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    observer.observe(rallyBody, { childList: true, subtree: true });
    syncRoundButton();

    if (recordCount) recordCount.remove();
    const summaryLine = toolbar.querySelector('.summary-line');
    if (summaryLine && !summaryLine.children.length && !summaryLine.textContent.trim()) summaryLine.remove();
    if (pageHeader) pageHeader.remove();
    if (liveScore) liveScore.remove();
    if (underTable && !underTable.children.length) underTable.remove();
  }

  init();
})();

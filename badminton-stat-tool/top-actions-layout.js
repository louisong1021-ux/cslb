(() => {
  function init() {
    const recordPanel = document.querySelector('.record-panel');
    const toolbar = recordPanel?.querySelector('.toolbar');
    const addBtn = document.querySelector('#addRallyBtn');
    const resultsBtn = document.querySelector('#viewResultsBtn');
    const liveScore = document.querySelector('.live-score');
    const underTable = document.querySelector('.under-table');

    if (!recordPanel || !toolbar || !addBtn || !resultsBtn) {
      requestAnimationFrame(init);
      return;
    }
    if (document.body.dataset.topActionsReady === '1') return;
    document.body.dataset.topActionsReady = '1';

    const actionRow = document.createElement('div');
    actionRow.className = 'top-primary-actions';

    addBtn.classList.add('top-primary-action', 'top-primary-add');
    resultsBtn.classList.add('top-primary-action', 'top-primary-results');
    actionRow.append(addBtn, resultsBtn);
    toolbar.insertAdjacentElement('afterend', actionRow);

    if (liveScore) liveScore.remove();
    if (underTable && !underTable.children.length) underTable.remove();
  }

  init();
})();

(() => {
  const LABELS = [
    '回合','比分','得分方','发球方','发球后3拍主动','接发后3拍主动','前三拍主动权',
    '女生被突破','女生封网成功','女生防守成功','防守转攻成功','男生连续进攻拍数',
    '造成被动挑球','被攻击对象','轮转错误','本分结果','备注','操作'
  ];

  function init() {
    const tbody = document.querySelector('#rallyBody');
    const recordPanel = document.querySelector('.record-panel');
    const statsPanel = document.querySelector('.stats-panel');
    if (!tbody || !recordPanel || !statsPanel) {
      requestAnimationFrame(init);
      return;
    }
    if (document.body.dataset.mobileLayoutReady === '1') return;
    document.body.dataset.mobileLayoutReady = '1';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-stats-toggle';
    toggle.innerHTML = '📊 <span>第1局</span>';
    const tableWrap = recordPanel.querySelector('.table-wrap');
    recordPanel.insertBefore(toggle, tableWrap);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mobile-stats-close';
    close.setAttribute('aria-label', '关闭统计');
    close.textContent = '×';
    statsPanel.prepend(close);

    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-stats-backdrop';
    document.body.appendChild(backdrop);

    const touchMode = window.matchMedia('(max-width: 1180px), (hover: none) and (pointer: coarse)');

    const openStats = () => {
      if (!touchMode.matches) return;
      statsPanel.classList.add('mobile-open');
      document.body.classList.add('mobile-stats-visible');
      close.focus({preventScroll:true});
    };
    const closeStats = () => {
      statsPanel.classList.remove('mobile-open');
      document.body.classList.remove('mobile-stats-visible');
    };

    toggle.addEventListener('click', openStats);
    close.addEventListener('click', closeStats);
    backdrop.addEventListener('click', closeStats);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeStats(); });

    function labelRows() {
      tbody.querySelectorAll('tr').forEach(row => {
        Array.from(row.children).forEach((cell, i) => {
          if (LABELS[i]) cell.dataset.label = LABELS[i];
        });
      });
    }

    function updateToggleText() {
      const score = document.querySelector('#sideScore')?.textContent?.trim();
      const rawGame = document.querySelector('#statsGameLabel')?.textContent?.trim() || '第1局';
      const game = rawGame.replace(/[（）()]/g, '');
      toggle.querySelector('span').textContent = score ? `${game} · ${score}` : game;
      toggle.setAttribute('aria-label', `打开${game}统计`);
    }

    const observer = new MutationObserver(() => {
      labelRows();
      updateToggleText();
    });
    observer.observe(tbody, {childList:true, subtree:true});
    const liveStats = document.querySelector('#liveStats');
    const sideScore = document.querySelector('#sideScore');
    if (liveStats) observer.observe(liveStats, {childList:true, subtree:true, characterData:true});
    if (sideScore) observer.observe(sideScore, {childList:true, subtree:true, characterData:true});

    const syncMode = () => { if (!touchMode.matches) closeStats(); };
    touchMode.addEventListener?.('change', syncMode);

    labelRows();
    updateToggleText();
  }

  init();
})();

(() => {
  const FIELD_ORDER = [
    { key:'server', selector:'.server', label:'发球方' },
    { key:'ourServer', selector:'.ourServer', label:'我方发球人' },
    { key:'serveActive', selector:'.serveActive', label:'发球后3拍主动' },
    { key:'returnActive', selector:'.returnActive', label:'接发后3拍主动' },
    { key:'first3', selector:'.first3', label:'前三拍主动权' },
    { key:'forcedLift', selector:'.forcedLift', label:'造成被动挑球' },
    { key:'maleAttack', selector:'.maleAttack', label:'男生连续进攻拍数' },
    { key:'femaleNet', selector:'.femaleNet', label:'女生封网成功' },
    { key:'attacked', selector:'.attacked', label:'被攻击对象' },
    { key:'femaleDefense', selector:'.femaleDefense', label:'女生防守成功' },
    { key:'femaleBreak', selector:'.femaleBreak', label:'女生被突破' },
    { key:'defenseToAttack', selector:'.defenseToAttack', label:'防守转攻成功' },
    { key:'rotation', selector:'.rotation', label:'轮转错误' },
    { key:'scorer', selector:'.scorer', label:'得分方' },
    { key:'reason', selector:'.reason', label:'本分结果' },
    { key:'note', selector:'.note', label:'备注' },
    { key:'delete', selector:'[data-del]', label:'操作' }
  ];

  const ORIGINAL_HEADER_KEYS = [
    'rally','score','scorer','server','serveActive','returnActive','first3','femaleBreak','femaleNet',
    'femaleDefense','defenseToAttack','maleAttack','forcedLift','attacked','rotation','reason','note','delete'
  ];

  let normalizing = false;

  function markAndReorderHeader() {
    const headerRow = document.querySelector('.table-wrap thead tr');
    if (!headerRow) return;
    const cells = Array.from(headerRow.children);
    cells.forEach((cell, i) => { if (!cell.dataset.field && ORIGINAL_HEADER_KEYS[i]) cell.dataset.field = ORIGINAL_HEADER_KEYS[i]; });
    headerRow.querySelector('[data-field="rally"]')?.remove();
    headerRow.querySelector('[data-field="score"]')?.remove();
    const desired = FIELD_ORDER.map(item => headerRow.querySelector(`[data-field="${item.key}"]`)).filter(Boolean);
    const current = Array.from(headerRow.children);
    if (desired.length && current.some((cell, i) => cell !== desired[i])) headerRow.append(...desired);
  }

  function markCells(row) {
    const first = row.querySelector('td');
    if (first && !first.dataset.field) first.dataset.field = 'rally';

    const score = row.querySelector('.score-cell');
    if (score) score.dataset.field = 'score';

    FIELD_ORDER.forEach(item => {
      if (!item.selector) return;
      const control = row.querySelector(item.selector);
      if (control) control.closest('td')?.setAttribute('data-field', item.key);
    });
  }

  function normalizeRows(tbody) {
    if (normalizing) return;
    normalizing = true;
    try {
      tbody.querySelectorAll('tr').forEach(row => {
        markCells(row);
        row.querySelector('td[data-field="rally"]')?.remove();
        row.querySelector('td[data-field="score"]')?.remove();

        const desired = FIELD_ORDER.map(item => row.querySelector(`td[data-field="${item.key}"]`)).filter(Boolean);
        desired.forEach((cell, i) => { cell.dataset.label = FIELD_ORDER[i].label; });
        const current = Array.from(row.children);
        if (desired.length && current.some((cell, i) => cell !== desired[i])) row.append(...desired);
      });
      markAndReorderHeader();
    } finally {
      normalizing = false;
    }
  }

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
    toggle.innerHTML = '📊 <span>第1局 · 回合 0 · 我方 0 - 对方 0</span>';
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

    const openStats = () => {
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

    function updateToggleText() {
      const rawGame = document.querySelector('#statsGameLabel')?.textContent?.trim() || '第1局';
      const game = rawGame.replace(/[（）()]/g, '');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      let ours = 0;
      let theirs = 0;
      rows.forEach(row => {
        const scorer = row.querySelector('select.scorer')?.value;
        if (scorer === '我方') ours += 1;
        else if (scorer === '对方') theirs += 1;
      });
      const rounds = rows.length;
      toggle.querySelector('span').textContent = `${game} · 回合 ${rounds} · 我方 ${ours} - 对方 ${theirs}`;
      toggle.setAttribute('aria-label', `打开${game}统计，当前${rounds}回合，我方${ours}分，对方${theirs}分`);
    }

    const observer = new MutationObserver(() => {
      normalizeRows(tbody);
      updateToggleText();
    });
    observer.observe(tbody, {childList:true, subtree:true});
    const liveStats = document.querySelector('#liveStats');
    if (liveStats) observer.observe(liveStats, {childList:true, subtree:true, characterData:true});

    document.addEventListener('change', event => {
      if (event.target instanceof HTMLSelectElement && event.target.classList.contains('scorer') && tbody.contains(event.target)) {
        queueMicrotask(updateToggleText);
      }
    }, true);

    normalizeRows(tbody);
    updateToggleText();
  }

  init();
})();

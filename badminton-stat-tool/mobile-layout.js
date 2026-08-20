(() => {
  const FIELD_ORDER = [
    { key:'server', selector:'.server', label:'发球方' },
    { key:'serverPerson', selector:'.serverPerson', label:'发球人' },
    { key:'receiverPerson', selector:'.receiverPerson', label:'接发球人' },
    { key:'first3', selector:'.first3', label:'前三拍主动权' },
    { key:'forcedLiftMaleCount', selector:'.forcedLiftMaleCount', label:'男生造成被动挑球次数' },
    { key:'forcedLiftFemaleCount', selector:'.forcedLiftFemaleCount', label:'女生造成被动挑球次数' },
    { key:'maleAttack', selector:'.maleAttack', label:'男生连续进攻拍数' },
    { key:'femaleNetCount', selector:'.femaleNetCount', label:'女生封网成功次数' },
    { key:'attacked', selector:'.attacked', label:'被攻击对象' },
    { key:'femaleTargetCount', selector:'.femaleTargetCount', label:'女生受攻次数' },
    { key:'femaleDefenseCount', selector:'.femaleDefenseCount', label:'女生防守成功次数' },
    { key:'defenseToAttackCount', selector:'.defenseToAttackCount', label:'防守转攻成功次数' },
    { key:'rotationCount', selector:'.rotationCount', label:'轮转错误次数' },
    { key:'scorer', selector:'.scorer', label:'得分方' },
    { key:'reason', selector:'.reason', label:'本分结果' },
    { key:'note', selector:'.note', label:'备注' },
    { key:'delete', selector:'[data-del]', label:'操作' }
  ];

  let normalizing = false;

  function rebuildHeader() {
    const headerRow = document.querySelector('.table-wrap thead tr');
    if (!headerRow) return;
    const fragment = document.createDocumentFragment();
    FIELD_ORDER.forEach(item => {
      const th = document.createElement('th');
      th.dataset.field = item.key;
      th.textContent = item.label;
      fragment.appendChild(th);
    });
    headerRow.replaceChildren(fragment);
  }

  function markCells(row) {
    const first = row.querySelector('td');
    if (first && !first.dataset.field) first.dataset.field = 'rally';
    const score = row.querySelector('.score-cell');
    if (score) score.dataset.field = 'score';

    FIELD_ORDER.forEach(item => {
      const control = row.querySelector(item.selector);
      const cell = control?.closest('td');
      if (!cell) return;
      cell.dataset.field = item.key;
      cell.dataset.label = item.label;
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

        const desired = FIELD_ORDER.map(item => {
          const cell = row.querySelector(`td[data-field="${item.key}"]`);
          if (cell) cell.dataset.label = item.label;
          return cell;
        }).filter(Boolean);
        const allowed = new Set(desired);
        Array.from(row.children).forEach(cell => { if (!allowed.has(cell)) cell.remove(); });
        if (desired.length) row.append(...desired);
      });
      rebuildHeader();
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
    toggle.innerHTML = '📊 <span>第1局 · 回合 0 · 我方 0 - 0 对方</span>';
    const tableWrap = recordPanel.querySelector('.table-wrap');
    recordPanel.insertBefore(toggle, tableWrap);

    const statsTop = document.createElement('div');
    statsTop.className = 'stats-page-top';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'stats-page-back back-btn';
    back.textContent = '← 返回录入';
    back.setAttribute('aria-label', '返回比赛录入');

    const heading = document.createElement('h1');
    heading.textContent = '实时统计';
    statsTop.append(back, heading);
    statsPanel.prepend(statsTop);

    const openStats = () => {
      recordPanel.classList.add('stats-page-hidden');
      statsPanel.classList.add('mobile-open');
      document.body.classList.add('stats-page-visible');
      document.dispatchEvent(new CustomEvent('badminton:open-stats'));
      window.scrollTo({ top: 0, behavior: 'auto' });
      requestAnimationFrame(() => back.focus({ preventScroll: true }));
    };
    const closeStats = () => {
      statsPanel.classList.remove('mobile-open');
      recordPanel.classList.remove('stats-page-hidden');
      document.body.classList.remove('stats-page-visible');
      window.scrollTo({ top: 0, behavior: 'auto' });
      requestAnimationFrame(() => toggle.focus({ preventScroll: true }));
    };

    toggle.addEventListener('click', openStats);
    back.addEventListener('click', closeStats);

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
      toggle.querySelector('span').textContent = `${game} · 回合 ${rounds} · 我方 ${ours} - ${theirs} 对方`;
      toggle.setAttribute('aria-label', `查看${game}实时统计，当前${rounds}回合，我方${ours}分，${theirs}分对方`);
    }

    let layoutQueued = false;
    const scheduleLayoutUpdate = () => {
      if (layoutQueued) return;
      layoutQueued = true;
      requestAnimationFrame(() => {
        layoutQueued = false;
        normalizeRows(tbody);
        updateToggleText();
      });
    };

    const observer = new MutationObserver(scheduleLayoutUpdate);
    observer.observe(tbody, {childList:true});

    document.addEventListener('change', event => {
      if (event.target instanceof HTMLSelectElement && event.target.classList.contains('scorer') && tbody.contains(event.target)) {
        requestAnimationFrame(updateToggleText);
      }
    }, true);

    normalizeRows(tbody);
    updateToggleText();
  }

  init();
})();

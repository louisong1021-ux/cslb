(() => {
  const STORAGE_KEY = 'badminton_our_server_v1';
  const tbody = document.querySelector('#rallyBody');
  const games = document.querySelector('#gameTabs');
  const liveStats = document.querySelector('#liveStats');
  const resultsGrid = document.querySelector('#resultsView .results-grid');
  if (!tbody || !games) return;

  let data = load();
  let enhancing = false;

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && Array.isArray(parsed.games) ? parsed : { games: [] };
    } catch {
      return { games: [] };
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  function currentGameIndex() {
    const active = games.querySelector('.game-tab.active[data-game]');
    return Math.max(0, Number(active?.dataset.game) || 0);
  }

  function gameData(index = currentGameIndex()) {
    if (!Array.isArray(data.games[index])) data.games[index] = [];
    return data.games[index];
  }

  function selectValue(row, cls) {
    return row.querySelector(`select.${cls}`)?.value || '';
  }

  function validPerson(value) {
    return value === '男' || value === '女' ? value : '';
  }

  function personOf(record) {
    return validPerson(record?.serverPerson ?? record?.ourServer ?? '');
  }

  function receiverOf(record) {
    return validPerson(record?.receiverPerson ?? '');
  }

  function syncCurrentFromDom() {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const records = gameData();
    rows.forEach((row, i) => {
      const prev = records[i] || {};
      const serverPerson = validPerson(row.querySelector('select.ourServer')?.value) || personOf(prev);
      const receiverPerson = validPerson(row.querySelector('select.receiverPerson')?.value) || receiverOf(prev);
      records[i] = {
        serverPerson,
        receiverPerson,
        // Keep the legacy field so previously stored versions remain compatible.
        ourServer: serverPerson,
        server: selectValue(row, 'server'),
        scorer: selectValue(row, 'scorer'),
        serveActive: selectValue(row, 'serveActive'),
        returnActive: selectValue(row, 'returnActive')
      };
    });
    records.length = rows.length;
    save();
  }

  function suggestedServer(records, rowIndex, server) {
    if (!server || rowIndex <= 0) return '';
    const prev = records[rowIndex - 1];
    const prevPerson = personOf(prev);
    // If the serving side won the previous rally, the same player continues serving.
    if (prev?.server === server && prev?.scorer === server && prevPerson) return prevPerson;
    return '';
  }

  function makePersonCell(row, rowIndex, type) {
    const anchor = type === 'server'
      ? row.querySelector('select.server')?.closest('td')
      : row.querySelector('select.ourServer')?.closest('td');
    const cls = type === 'server' ? 'ourServer' : 'receiverPerson';
    if (!anchor || row.querySelector(`select.${cls}`)) return;

    const records = gameData();
    const server = selectValue(row, 'server');
    const stored = type === 'server'
      ? (personOf(records[rowIndex]) || suggestedServer(records, rowIndex, server))
      : receiverOf(records[rowIndex]);
    const label = type === 'server' ? '发球人' : '接发球人';
    const field = type === 'server' ? 'ourServer' : 'receiverPerson';
    const cell = document.createElement('td');
    cell.dataset.field = field;
    cell.dataset.label = label;
    cell.innerHTML = `<select class="${cls}" data-i="${rowIndex}"><option value="">—</option><option value="男">男</option><option value="女">女</option></select>`;
    const select = cell.querySelector('select');
    select.value = stored;
    anchor.insertAdjacentElement('afterend', cell);
  }

  function ensureHeader() {
    const header = document.querySelector('.table-wrap thead tr');
    if (!header) return;
    const serverHeader = header.querySelector('[data-field="server"]');
    if (!serverHeader) return;

    let serverPersonHeader = header.querySelector('[data-field="ourServer"]');
    if (!serverPersonHeader) {
      serverPersonHeader = document.createElement('th');
      serverPersonHeader.dataset.field = 'ourServer';
      serverPersonHeader.textContent = '发球人';
      serverHeader.insertAdjacentElement('afterend', serverPersonHeader);
    }

    if (!header.querySelector('[data-field="receiverPerson"]')) {
      const th = document.createElement('th');
      th.dataset.field = 'receiverPerson';
      th.textContent = '接发球人';
      serverPersonHeader.insertAdjacentElement('afterend', th);
    }
  }

  function syncRowState(row) {
    ['ourServer', 'receiverPerson'].forEach(cls => {
      const select = row.querySelector(`select.${cls}`);
      if (!select) return;
      select.disabled = false;
      requestAnimationFrame(() => {
        if (!select.isConnected) return;
        const button = select.nextElementSibling;
        if (!button?.classList.contains('cycle-choice')) return;
        button.disabled = false;
        button.classList.remove('linked-disabled');
        button.removeAttribute('aria-disabled');
        button.textContent = select.value || '—';
      });
    });
  }

  function enhanceRows() {
    if (enhancing) return;
    enhancing = true;
    try {
      ensureHeader();
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach((row, i) => {
        makePersonCell(row, i, 'server');
        makePersonCell(row, i, 'receiver');
      });
      rows.forEach(syncRowState);
      syncCurrentFromDom();
    } finally {
      enhancing = false;
    }
  }

  function pct(num, den) {
    return den ? `${Math.round(num / den * 100)}%` : '—';
  }

  function statFor(rows, mode) {
    const activeKey = mode === 'serve' ? 'serveActive' : 'returnActive';
    const active = rows.filter(r => r[activeKey] === '是').length;
    const ourWins = rows.filter(r => r.scorer === '我方').length;
    return {
      count: rows.length,
      active,
      ourWins,
      activeRate: pct(active, rows.length),
      ourWinRate: pct(ourWins, rows.length),
      oppWinRate: pct(rows.length - ourWins, rows.length)
    };
  }

  function summarize(records) {
    const oursServe = records.filter(r => r.server === '我方');
    const oppServe = records.filter(r => r.server === '对方');
    const byServer = (rows, who) => rows.filter(r => personOf(r) === who);
    const byReceiver = (rows, who) => rows.filter(r => receiverOf(r) === who);
    const combo = (rows, serverWho, receiverWho, mode) => statFor(rows.filter(r => personOf(r) === serverWho && receiverOf(r) === receiverWho), mode);

    return {
      ourServerMale: statFor(byServer(oursServe, '男'), 'serve'),
      ourServerFemale: statFor(byServer(oursServe, '女'), 'serve'),
      oppServerMale: statFor(byServer(oppServe, '男'), 'return'),
      oppServerFemale: statFor(byServer(oppServe, '女'), 'return'),

      ourReceiverMale: statFor(byReceiver(oppServe, '男'), 'return'),
      ourReceiverFemale: statFor(byReceiver(oppServe, '女'), 'return'),
      oppReceiverMale: statFor(byReceiver(oursServe, '男'), 'serve'),
      oppReceiverFemale: statFor(byReceiver(oursServe, '女'), 'serve'),

      ourServeCombos: {
        mm: combo(oursServe, '男', '男', 'serve'),
        mf: combo(oursServe, '男', '女', 'serve'),
        fm: combo(oursServe, '女', '男', 'serve'),
        ff: combo(oursServe, '女', '女', 'serve')
      },
      oppServeCombos: {
        mm: combo(oppServe, '男', '男', 'return'),
        mf: combo(oppServe, '男', '女', 'return'),
        fm: combo(oppServe, '女', '男', 'return'),
        ff: combo(oppServe, '女', '女', 'return')
      },

      ourServerUnassigned: oursServe.filter(r => !personOf(r)).length,
      oppServerUnassigned: oppServe.filter(r => !personOf(r)).length,
      ourReceiverUnassigned: oppServe.filter(r => !receiverOf(r)).length,
      oppReceiverUnassigned: oursServe.filter(r => !receiverOf(r)).length
    };
  }

  function allRecords() {
    syncCurrentFromDom();
    return data.games.flatMap(g => Array.isArray(g) ? g : []);
  }

  function metric(title, x, mode) {
    const activeLabel = mode === 'serve' ? '发球前三拍主动' : '接发前三拍主动';
    return `<div class="metric"><div class="metric-label">${title}</div><div class="metric-value">${x.count} 次</div><div class="metric-sub">${activeLabel} ${x.activeRate} · 我方得分 ${x.ourWinRate}</div></div>`;
  }

  function comboLine(label, x, mode) {
    const activeLabel = mode === 'serve' ? '主动' : '接发主动';
    return `<div class="rank-item"><span>${label}</span><b>${x.count ? `${x.count}次 · ${activeLabel}${x.activeRate} · 得分${x.ourWinRate}` : '没有'}</b></div>`;
  }

  function updateLiveCard() {
    if (!liveStats) return;
    const s = summarize(gameData());
    let card = document.querySelector('#ourServerLiveCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'ourServerLiveCard';
      card.className = 'stat-card blue';
      liveStats.appendChild(card);
    }

    const html = `<h3>发球 / 接发人分析</h3>` +
      `<div class="mini-list"><b>我方发球</b></div><div class="metric-grid">` +
      metric('男生发球', s.ourServerMale, 'serve') + metric('女生发球', s.ourServerFemale, 'serve') +
      `</div><div class="mini-list" style="margin-top:8px"><b>我方接发</b></div><div class="metric-grid">` +
      metric('男生接发', s.ourReceiverMale, 'return') + metric('女生接发', s.ourReceiverFemale, 'return') +
      `</div><div class="mini-list" style="margin-top:8px"><b>对方发球对象</b>：男发 ${s.oppServerMale.count} 次 · 女发 ${s.oppServerFemale.count} 次；<b>对方接发对象</b>：男接 ${s.oppReceiverMale.count} 次 · 女接 ${s.oppReceiverFemale.count} 次</div>`;
    if (card.innerHTML !== html) card.innerHTML = html;
  }

  function twoPersonBlock(title, maleTitle, femaleTitle, male, female, mode) {
    const activeLabel = mode === 'serve' ? '前三拍主动率' : '接发前三拍主动率';
    const detail = x => `发生 ${x.count} 次<br>${activeLabel} ${x.activeRate}<br>我方该分得分率 ${x.ourWinRate}`;
    return `<h3 style="margin:12px 0 8px">${title}</h3><div class="reason-list">` +
      `<div class="rank-card"><h3>${maleTitle}</h3><div class="mini-list">${detail(male)}</div></div>` +
      `<div class="rank-card"><h3>${femaleTitle}</h3><div class="mini-list">${detail(female)}</div></div>` +
      `</div>`;
  }

  function comboBlock(title, combos, mode, ourServing) {
    const labels = ourServing
      ? [['mm','我方男发 → 对方男接'],['mf','我方男发 → 对方女接'],['fm','我方女发 → 对方男接'],['ff','我方女发 → 对方女接']]
      : [['mm','对方男发 → 我方男接'],['mf','对方男发 → 我方女接'],['fm','对方女发 → 我方男接'],['ff','对方女发 → 我方女接']];
    return `<h3 style="margin:14px 0 8px">${title}</h3><div class="rank-card">${labels.map(([key,label]) => comboLine(label, combos[key], mode)).join('')}</div>`;
  }

  function updateResultsCard() {
    if (!resultsGrid) return;
    const s = summarize(allRecords());
    let panel = document.querySelector('#ourServerResultsCard');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ourServerResultsCard';
      panel.className = 'results-panel';
      resultsGrid.appendChild(panel);
    }

    const html = `<h2>发球人 / 接发球人分析</h2>` +
      twoPersonBlock('我方发球效果', '男生发球', '女生发球', s.ourServerMale, s.ourServerFemale, 'serve') +
      twoPersonBlock('我方接发表现', '男生接发', '女生接发', s.ourReceiverMale, s.ourReceiverFemale, 'return') +
      twoPersonBlock('面对对方发球人', '对方男生发球', '对方女生发球', s.oppServerMale, s.oppServerFemale, 'return') +
      twoPersonBlock('我方发球打向谁', '对方男生接发', '对方女生接发', s.oppReceiverMale, s.oppReceiverFemale, 'serve') +
      comboBlock('我方发球组合', s.ourServeCombos, 'serve', true) +
      comboBlock('我方接发组合', s.oppServeCombos, 'return', false) +
      `<div class="mini-list" style="margin-top:10px">未标记：我方发球人 ${s.ourServerUnassigned ? s.ourServerUnassigned + ' 次' : '没有'} · 对方发球人 ${s.oppServerUnassigned ? s.oppServerUnassigned + ' 次' : '没有'} · 我方接发球人 ${s.ourReceiverUnassigned ? s.ourReceiverUnassigned + ' 次' : '没有'} · 对方接发球人 ${s.oppReceiverUnassigned ? s.oppReceiverUnassigned + ' 次' : '没有'}</div>`;
    if (panel.innerHTML !== html) panel.innerHTML = html;
  }

  function refresh() {
    enhanceRows();
    updateLiveCard();
    if (document.querySelector('#resultsView.active')) updateResultsCard();
  }

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !tbody.contains(target)) return;

    if (target.classList.contains('ourServer') || target.classList.contains('receiverPerson')) {
      syncCurrentFromDom();
      updateLiveCard();
      return;
    }

    if (target.classList.contains('server')) {
      // A serving-side change invalidates both player-role selections. Only the continuing
      // server can be inferred safely; the receiver is left blank because court positions
      // are not stored by this tool.
      const row = target.closest('tr');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const rowIndex = rows.indexOf(row);
      const serverSelect = row?.querySelector('select.ourServer');
      const receiverSelect = row?.querySelector('select.receiverPerson');
      if (rowIndex >= 0) {
        syncCurrentFromDom();
        if (serverSelect) serverSelect.value = suggestedServer(gameData(), rowIndex, target.value);
        if (receiverSelect) receiverSelect.value = '';
        serverSelect?.dispatchEvent(new Event('change', { bubbles: true }));
        receiverSelect?.dispatchEvent(new Event('change', { bubbles: true }));
      }
      queueMicrotask(refresh);
      return;
    }

    if (target.classList.contains('scorer') || target.classList.contains('serveActive') || target.classList.contains('returnActive')) {
      syncCurrentFromDom();
      queueMicrotask(refresh);
    }
  }, true);

  document.addEventListener('click', event => {
    const deleteBtn = event.target.closest?.('[data-del]');
    if (deleteBtn && tbody.contains(deleteBtn)) {
      syncCurrentFromDom();
      const index = Number(deleteBtn.dataset.del);
      if (Number.isInteger(index)) gameData().splice(index, 1);
      save();
      return;
    }

    const gameBtn = event.target.closest?.('.game-tab[data-game], #addGameInline, #addRallyBtn, #clearGameBtn, #viewResultsBtn');
    if (gameBtn) {
      syncCurrentFromDom();
      queueMicrotask(() => {
        refresh();
        if (gameBtn.id === 'viewResultsBtn') updateResultsCard();
      });
    }
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(refresh));
  observer.observe(tbody, { childList: true, subtree: true });
  observer.observe(games, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  refresh();
})();
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

  function personOf(record) {
    const value = record?.serverPerson ?? record?.ourServer ?? '';
    return value === '男' || value === '女' ? value : '';
  }

  function syncCurrentFromDom() {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const records = gameData();
    rows.forEach((row, i) => {
      const prev = records[i] || {};
      const serverPerson = row.querySelector('select.ourServer')?.value ?? personOf(prev);
      records[i] = {
        serverPerson,
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

  function makeServerPersonCell(row, rowIndex) {
    const serverCell = row.querySelector('select.server')?.closest('td');
    if (!serverCell || row.querySelector('select.ourServer')) return;

    const records = gameData();
    const server = selectValue(row, 'server');
    const stored = personOf(records[rowIndex]) || suggestedServer(records, rowIndex, server);
    const cell = document.createElement('td');
    cell.dataset.field = 'ourServer';
    cell.dataset.label = '发球人';
    cell.innerHTML = `<select class="ourServer" data-i="${rowIndex}"><option value="">—</option><option value="男">男</option><option value="女">女</option></select>`;
    const select = cell.querySelector('select');
    select.value = stored;
    serverCell.insertAdjacentElement('afterend', cell);
  }

  function ensureHeader() {
    const header = document.querySelector('.table-wrap thead tr');
    if (!header || header.querySelector('[data-field="ourServer"]')) return;
    const serverHeader = header.querySelector('[data-field="server"]');
    if (!serverHeader) return;
    const th = document.createElement('th');
    th.dataset.field = 'ourServer';
    th.textContent = '发球人';
    serverHeader.insertAdjacentElement('afterend', th);
  }

  function syncRowState(row) {
    const select = row.querySelector('select.ourServer');
    if (!select) return;
    // Both sides' server gender is now recorded, so this control is always available.
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
  }

  function enhanceRows() {
    if (enhancing) return;
    enhancing = true;
    try {
      ensureHeader();
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach((row, i) => makeServerPersonCell(row, i));
      rows.forEach(syncRowState);
      syncCurrentFromDom();
    } finally {
      enhancing = false;
    }
  }

  function pct(num, den) {
    return den ? `${Math.round(num / den * 100)}%` : '—';
  }

  function summarize(records) {
    const sideRows = side => records.filter(r => r.server === side);
    const byPerson = (side, who) => sideRows(side).filter(r => personOf(r) === who);

    const ourServeFor = who => {
      const rows = byPerson('我方', who);
      const active = rows.filter(r => r.serveActive === '是').length;
      const wins = rows.filter(r => r.scorer === '我方').length;
      return {
        count: rows.length,
        active,
        wins,
        activeRate: pct(active, rows.length),
        winRate: pct(wins, rows.length)
      };
    };

    const oppServeFor = who => {
      const rows = byPerson('对方', who);
      const returnActive = rows.filter(r => r.returnActive === '是').length;
      const ourWins = rows.filter(r => r.scorer === '我方').length;
      return {
        count: rows.length,
        returnActive,
        ourWins,
        returnActiveRate: pct(returnActive, rows.length),
        ourWinRate: pct(ourWins, rows.length),
        oppWinRate: pct(rows.length - ourWins, rows.length)
      };
    };

    const ours = sideRows('我方');
    const opp = sideRows('对方');
    return {
      ourMale: ourServeFor('男'),
      ourFemale: ourServeFor('女'),
      oppMale: oppServeFor('男'),
      oppFemale: oppServeFor('女'),
      ourUnassigned: ours.filter(r => !personOf(r)).length,
      oppUnassigned: opp.filter(r => !personOf(r)).length
    };
  }

  function allRecords() {
    syncCurrentFromDom();
    return data.games.flatMap(g => Array.isArray(g) ? g : []);
  }

  function serveMetric(title, x) {
    return `<div class="metric"><div class="metric-label">${title}</div><div class="metric-value">${x.count} 次</div><div class="metric-sub">前三拍主动 ${x.activeRate} · 本分得分 ${x.winRate}</div></div>`;
  }

  function returnMetric(title, x) {
    return `<div class="metric"><div class="metric-label">${title}</div><div class="metric-value">${x.count} 次</div><div class="metric-sub">我方接发主动 ${x.returnActiveRate} · 我方得分 ${x.ourWinRate}</div></div>`;
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

    const html = `<h3>发球人对比</h3>` +
      `<div class="mini-list"><b>我方发球</b></div><div class="metric-grid">` +
      serveMetric('我方男生发球', s.ourMale) + serveMetric('我方女生发球', s.ourFemale) +
      `</div><div class="mini-list" style="margin-top:8px"><b>对方发球 / 我方接发</b></div><div class="metric-grid">` +
      returnMetric('对方男生发球', s.oppMale) + returnMetric('对方女生发球', s.oppFemale) +
      `</div><div class="mini-list">未标记：我方发球 ${s.ourUnassigned ? s.ourUnassigned + ' 次' : '没有'} · 对方发球 ${s.oppUnassigned ? s.oppUnassigned + ' 次' : '没有'}</div>`;
    if (card.innerHTML !== html) card.innerHTML = html;
  }

  function resultBlock(title, maleTitle, femaleTitle, male, female, opponent = false) {
    const detail = x => opponent
      ? `发球 ${x.count} 次<br>我方接发前三拍主动率 ${x.returnActiveRate}<br>我方该分得分率 ${x.ourWinRate}<br>对方发球得分率 ${x.oppWinRate}`
      : `发球 ${x.count} 次<br>前三拍主动率 ${x.activeRate}<br>该分得分率 ${x.winRate}`;
    return `<h3 style="margin:12px 0 8px">${title}</h3><div class="reason-list">` +
      `<div class="rank-card"><h3>${maleTitle}</h3><div class="mini-list">${detail(male)}</div></div>` +
      `<div class="rank-card"><h3>${femaleTitle}</h3><div class="mini-list">${detail(female)}</div></div>` +
      `</div>`;
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

    const html = `<h2>发球人 / 接发对象分析</h2>` +
      resultBlock('我方发球效果', '我方男生发球', '我方女生发球', s.ourMale, s.ourFemale, false) +
      resultBlock('对方发球时我方接发表现', '对方男生发球', '对方女生发球', s.oppMale, s.oppFemale, true) +
      `<div class="mini-list" style="margin-top:10px">未标记发球人：我方 ${s.ourUnassigned ? s.ourUnassigned + ' 次' : '没有'} · 对方 ${s.oppUnassigned ? s.oppUnassigned + ' 次' : '没有'}</div>`;
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

    if (target.classList.contains('ourServer')) {
      syncCurrentFromDom();
      updateLiveCard();
      return;
    }

    if (target.classList.contains('server')) {
      // Changing the serving side invalidates an old person selection unless the same
      // serving player can be inferred from the previous rally.
      const row = target.closest('tr');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const rowIndex = rows.indexOf(row);
      const personSelect = row?.querySelector('select.ourServer');
      if (rowIndex >= 0 && personSelect) {
        syncCurrentFromDom();
        personSelect.value = suggestedServer(gameData(), rowIndex, target.value);
        personSelect.dispatchEvent(new Event('change', { bubbles: true }));
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

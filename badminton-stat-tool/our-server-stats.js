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

  function syncCurrentFromDom() {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const records = gameData();
    rows.forEach((row, i) => {
      const prev = records[i] || {};
      records[i] = {
        ourServer: row.querySelector('select.ourServer')?.value ?? prev.ourServer ?? '',
        server: selectValue(row, 'server'),
        scorer: selectValue(row, 'scorer'),
        serveActive: selectValue(row, 'serveActive')
      };
    });
    records.length = rows.length;
    save();
  }

  function suggestedServer(records, rowIndex, server) {
    if (server !== '我方' || rowIndex <= 0) return '';
    const prev = records[rowIndex - 1];
    if (prev?.server === '我方' && prev?.scorer === '我方' && (prev.ourServer === '男' || prev.ourServer === '女')) {
      return prev.ourServer;
    }
    return '';
  }

  function makeOurServerCell(row, rowIndex) {
    const serverCell = row.querySelector('select.server')?.closest('td');
    if (!serverCell || row.querySelector('select.ourServer')) return;

    const records = gameData();
    const server = selectValue(row, 'server');
    const stored = records[rowIndex]?.ourServer || suggestedServer(records, rowIndex, server);
    const cell = document.createElement('td');
    cell.dataset.field = 'ourServer';
    cell.dataset.label = '我方发球人';
    cell.innerHTML = `<select class="ourServer" data-i="${rowIndex}"><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select>`;
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
    th.textContent = '我方发球人';
    serverHeader.insertAdjacentElement('afterend', th);
  }

  function syncRowState(row) {
    const server = selectValue(row, 'server');
    const select = row.querySelector('select.ourServer');
    if (!select) return;
    select.disabled = server !== '我方';

    requestAnimationFrame(() => {
      if (!select.isConnected) return;
      const button = select.nextElementSibling;
      if (!button?.classList.contains('cycle-choice')) return;
      const disabled = server !== '我方';
      button.disabled = disabled;
      button.classList.toggle('linked-disabled', disabled);
      if (disabled) {
        button.textContent = '—';
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.removeAttribute('aria-disabled');
        button.textContent = select.value || '请选择';
      }
    });
  }

  function enhanceRows() {
    if (enhancing) return;
    enhancing = true;
    try {
      ensureHeader();
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach((row, i) => makeOurServerCell(row, i));
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
    const valid = records.filter(r => r.server === '我方');
    const by = who => valid.filter(r => r.ourServer === who);
    const summaryFor = who => {
      const rows = by(who);
      const active = rows.filter(r => r.serveActive === '是').length;
      const wins = rows.filter(r => r.scorer === '我方').length;
      return { count: rows.length, active, wins, activeRate: pct(active, rows.length), winRate: pct(wins, rows.length) };
    };
    return {
      male: summaryFor('男'),
      female: summaryFor('女'),
      unassigned: valid.filter(r => r.ourServer !== '男' && r.ourServer !== '女').length
    };
  }

  function allRecords() {
    syncCurrentFromDom();
    return data.games.flatMap(g => Array.isArray(g) ? g : []);
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
    const html = `<h3>我方发球人</h3><div class="metric-grid">` +
      `<div class="metric"><div class="metric-label">男生发球</div><div class="metric-value">${s.male.count} 次</div><div class="metric-sub">前三拍主动 ${s.male.activeRate} · 本分得分 ${s.male.winRate}</div></div>` +
      `<div class="metric"><div class="metric-label">女生发球</div><div class="metric-value">${s.female.count} 次</div><div class="metric-sub">前三拍主动 ${s.female.activeRate} · 本分得分 ${s.female.winRate}</div></div>` +
      `</div><div class="mini-list">未标记发球人：${s.unassigned ? s.unassigned + ' 次' : '没有'}</div>`;
    if (card.innerHTML !== html) card.innerHTML = html;
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
    const html = `<h2>我方发球人对比</h2>` +
      `<div class="reason-list">` +
      `<div class="rank-card"><h3>男生发球</h3><div class="mini-list">发球 ${s.male.count} 次<br>前三拍主动率 ${s.male.activeRate}<br>该分得分率 ${s.male.winRate}</div></div>` +
      `<div class="rank-card"><h3>女生发球</h3><div class="mini-list">发球 ${s.female.count} 次<br>前三拍主动率 ${s.female.activeRate}<br>该分得分率 ${s.female.winRate}</div></div>` +
      `</div><div class="mini-list" style="margin-top:10px">未标记发球人：${s.unassigned ? s.unassigned + ' 次' : '没有'}</div>`;
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
    if (target.classList.contains('server') || target.classList.contains('scorer') || target.classList.contains('serveActive')) {
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

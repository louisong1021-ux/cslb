(() => {
  const STORAGE_KEY = 'badminton_match_stats_v2';
  const tbody = document.querySelector('#rallyBody');
  const liveStats = document.querySelector('#liveStats');
  const resultsGrid = document.querySelector('#resultsView .results-grid');
  const viewResultsBtn = document.querySelector('#viewResultsBtn');
  if (!tbody) return;

  const countText = n => Number(n) ? `${Number(n)} 次` : '没有';

  function loadState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return state && Array.isArray(state.games) ? state : { currentGame: 0, games: [{ rallies: [] }] };
    } catch {
      return { currentGame: 0, games: [{ rallies: [] }] };
    }
  }

  function allRows(state) {
    return state.games.flatMap(g => Array.isArray(g.rallies) ? g.rallies : []);
  }

  function summarize(rows) {
    const femaleNetYes = rows.filter(r => r.femaleNet === '是').length;
    const femaleDefenseYes = rows.filter(r => r.femaleDefense === '是').length;
    const defenseToAttackYes = rows.filter(r => r.defenseToAttack === '是').length;
    const rotations = rows.filter(r => r.rotation === '是').length;
    const femaleTarget = rows.filter(r => r.attacked === '女').length;
    const femaleDefenseNo = rows.filter(r => r.attacked === '女' && r.femaleDefense === '否').length;
    const rotationLosses = rows.filter(r => r.rotation === '是' && r.scorer === '对方').length;
    return {
      femaleNetYes,
      femaleDefenseYes,
      defenseToAttackYes,
      rotations,
      femaleTarget,
      femaleDefenseNo,
      rotationLosses
    };
  }

  function currentRows(state) {
    return state.games[state.currentGame]?.rallies || state.games[0]?.rallies || [];
  }

  function removeFemaleBreakField() {
    document.querySelectorAll('select.femaleBreak').forEach(select => select.closest('td')?.remove());
    document.querySelectorAll('td[data-field="femaleBreak"], th[data-field="femaleBreak"]').forEach(el => el.remove());
    document.querySelectorAll('.table-wrap thead th').forEach(th => {
      if (th.textContent.trim().replace(/\s+/g, '') === '女生被突破') th.remove();
    });
  }

  function findMetric(root, labels) {
    if (!root) return null;
    const wanted = Array.isArray(labels) ? labels : [labels];
    return Array.from(root.querySelectorAll('.metric')).find(card => {
      const text = card.querySelector('.metric-label')?.textContent.trim() || '';
      return wanted.includes(text);
    }) || null;
  }

  function setMetric(root, oldLabels, newLabel, value, sub = '') {
    const card = findMetric(root, oldLabels);
    if (!card) return;
    const label = card.querySelector('.metric-label');
    const val = card.querySelector('.metric-value');
    const note = card.querySelector('.metric-sub');
    if (label && label.textContent !== newLabel) label.textContent = newLabel;
    if (val && val.textContent !== value) val.textContent = value;
    if (note && note.textContent !== sub) note.textContent = sub;
  }

  function removeMetric(root, labels) {
    findMetric(root, labels)?.remove();
  }

  function ensureStyle() {
    if (document.getElementById('countEventStatsStyle')) return;
    const style = document.createElement('style');
    style.id = 'countEventStatsStyle';
    style.textContent = `
      #optimizedLiveCard{display:none!important}
      #eventCountPanel .opt-card-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
      #eventCountPanel .opt-mini-card b{font-size:24px}
      @media(max-width:700px){#eventCountPanel .opt-card-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  let liveQueued = false;
  function scheduleLive() {
    if (liveQueued) return;
    liveQueued = true;
    requestAnimationFrame(() => {
      liveQueued = false;
      applyLive();
    });
  }

  function applyLive() {
    removeFemaleBreakField();
    if (!liveStats || !liveStats.children.length) return;
    const state = loadState();
    const s = summarize(currentRows(state));

    setMetric(liveStats, '女生封网成功率', '女生封网成功次数', countText(s.femaleNetYes));
    setMetric(liveStats, '女生防守成功率', '女生防守成功次数', countText(s.femaleDefenseYes));
    setMetric(liveStats, '防守转攻成功率', '防守转攻成功次数', countText(s.defenseToAttackYes));
    setMetric(liveStats, ['轮转错误次数', '轮转错误'], '轮转错误次数', countText(s.rotations));
    removeMetric(liveStats, ['女生被突破次数', '女生被突破']);
  }

  function ensureEventPanel(s) {
    if (!resultsGrid) return;
    let panel = document.getElementById('eventCountPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'eventCountPanel';
      panel.className = 'results-panel opt-results-panel';
      const funnel = document.getElementById('optAttackFunnel');
      if (funnel && funnel.parentElement === resultsGrid) resultsGrid.insertBefore(panel, funnel);
      else resultsGrid.prepend(panel);
    }
    panel.innerHTML = `<h2>关键事件次数</h2><p class="opt-explain">这些项目按发生次数统计，不再用成功率作为主显示。</p><div class="opt-card-grid"><div class="opt-mini-card"><span>女生封网成功</span><b>${countText(s.femaleNetYes)}</b></div><div class="opt-mini-card"><span>女生防守成功</span><b>${countText(s.femaleDefenseYes)}</b></div><div class="opt-mini-card"><span>防守转攻成功</span><b>${countText(s.defenseToAttackYes)}</b></div><div class="opt-mini-card"><span>轮转错误</span><b>${countText(s.rotations)}</b></div></div>`;
  }

  function removeRateBars() {
    const bars = document.querySelector('#performanceBars');
    if (!bars) return;
    Array.from(bars.querySelectorAll('.bar-row')).forEach(row => {
      const label = row.firstElementChild?.textContent.trim() || '';
      if (['女生封网成功率', '女生受攻防守率', '女生防守成功率', '防守转攻成功率'].includes(label)) row.remove();
    });
  }

  function updateKpi(s) {
    const kpiRow = document.getElementById('kpiRow');
    if (!kpiRow) return;
    const target = Array.from(kpiRow.querySelectorAll('.kpi')).find(card => {
      const label = card.querySelector('.label')?.textContent.trim() || '';
      return ['女生受攻防守率', '女生防守成功率', '女生被突破'].includes(label);
    });
    if (!target) return;
    const label = target.querySelector('.label');
    const value = target.querySelector('.value');
    const note = target.querySelector('.note');
    if (label) label.textContent = '女生防守成功';
    if (value) value.textContent = countText(s.femaleDefenseYes);
    if (note) note.textContent = `对手攻击女生 ${s.femaleTarget} 次`;
  }

  function updateOptimizedDetails(s) {
    const attackPanel = document.getElementById('optAttackEfficiency');
    const attackDetail = attackPanel?.querySelector('.opt-detail-line');
    if (attackDetail) attackDetail.textContent = `女生封网成功 ${s.femaleNetYes} 次。`;

    const defensePanel = document.getElementById('optDefenseTargets');
    const defenseDetail = defensePanel?.querySelector('.opt-detail-line');
    if (defenseDetail) {
      defenseDetail.textContent = `女生被攻击 ${s.femaleTarget} 次；防守成功 ${s.femaleDefenseYes} 次；防守未成功 ${s.femaleDefenseNo} 次。轮转错误 ${s.rotations} 次，其中直接丢分 ${s.rotationLosses} 次。女生是否形成明显突破口，由这些数据综合判断，不再单独记录“女生被突破”。`;
    }
  }

  function gameEventRows(state) {
    return state.games.map((g, i) => {
      const rows = g.rallies || [];
      const s = summarize(rows);
      let ours = 0, theirs = 0;
      rows.forEach(r => r.scorer === '我方' ? ours++ : theirs++);
      const serve = rows.filter(r => r.server === '我方');
      const ret = rows.filter(r => r.server === '对方');
      const serveYes = serve.filter(r => r.serveActive === '是').length;
      const retYes = ret.filter(r => r.returnActive === '是').length;
      const pct = (n, d) => d ? `${Math.round(n / d * 100)}%` : '—';
      return [
        i + 1,
        `${ours}-${theirs}`,
        pct(serveYes, serve.length),
        pct(retYes, ret.length),
        countText(s.femaleNetYes),
        countText(s.femaleDefenseYes),
        countText(s.defenseToAttackYes),
        countText(s.rotations)
      ];
    });
  }

  function updateGameCompare(state) {
    const table = document.getElementById('gameCompare');
    if (!table) return;
    const headers = ['局', '比分', '发球前三拍', '接发前三拍', '女生封网成功', '女生防守成功', '防守转攻成功', '轮转错误'];
    const rows = gameEventRows(state);
    table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  let resultsQueued = false;
  function scheduleResults() {
    if (resultsQueued) return;
    resultsQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resultsQueued = false;
      applyResults();
    }));
  }

  function applyResults() {
    removeFemaleBreakField();
    const resultsView = document.getElementById('resultsView');
    if (!resultsView?.classList.contains('active')) return;
    const state = loadState();
    const s = summarize(allRows(state));
    ensureEventPanel(s);
    removeRateBars();
    updateKpi(s);
    updateOptimizedDetails(s);
    updateGameCompare(state);
  }

  ensureStyle();
  removeFemaleBreakField();

  const rowObserver = new MutationObserver(() => {
    removeFemaleBreakField();
    scheduleLive();
  });
  rowObserver.observe(tbody, { childList: true });

  document.addEventListener('change', event => {
    if (tbody.contains(event.target)) scheduleLive();
  }, true);
  document.addEventListener('badminton:open-stats', scheduleLive);

  viewResultsBtn?.addEventListener('click', scheduleResults);
  document.querySelector('#backBtn')?.addEventListener('click', scheduleLive);
  document.addEventListener('click', event => {
    if (event.target.closest?.('.game-tab[data-game], #addGameInline, #addRallyBtn, #clearGameBtn')) scheduleLive();
  }, true);

  scheduleLive();
})();

(() => {
  const STORAGE_KEY = 'badminton_match_stats_v2';
  const tbody = document.querySelector('#rallyBody');
  const liveStats = document.querySelector('#liveStats');
  const resultsGrid = document.querySelector('#resultsView .results-grid');
  const viewResultsBtn = document.querySelector('#viewResultsBtn');
  if (!tbody) return;

  const countText = n => Number(n) ? `${Number(n)} 次` : '没有';
  const rallyText = n => Number(n) ? `${Number(n)} 个回合` : '没有发生';

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

  function eventCount(rally, key, fallback) {
    if (rally && rally[key] !== undefined && rally[key] !== null && rally[key] !== '' && Number.isFinite(Number(rally[key]))) {
      return Math.max(0, Math.round(Number(rally[key])));
    }
    return Math.max(0, Math.round(Number(fallback?.(rally)) || 0));
  }

  function summarize(rows) {
    const femaleNetCounts = rows.map(r => eventCount(r, 'femaleNetCount', x => x?.femaleNet === '是' ? 1 : 0));
    const femaleDefenseCounts = rows.map(r => eventCount(r, 'femaleDefenseCount', x => x?.femaleDefense === '是' ? 1 : 0));
    const defenseToAttackCounts = rows.map(r => eventCount(r, 'defenseToAttackCount', x => x?.defenseToAttack === '是' ? 1 : 0));
    const femaleTargetCounts = rows.map(r => eventCount(r, 'femaleTargetCount', x => x?.attacked === '女' ? 1 : 0));

    const sum = values => values.reduce((total, value) => total + value, 0);
    const rallies = values => values.filter(value => value > 0).length;
    const femaleNetTotal = sum(femaleNetCounts);
    const femaleDefenseTotal = sum(femaleDefenseCounts);
    const defenseToAttackTotal = sum(defenseToAttackCounts);
    const femaleTargetTotal = sum(femaleTargetCounts);
    const femaleDefenseMiss = Math.max(0, femaleTargetTotal - femaleDefenseTotal);
    const rotations = rows.filter(r => r.rotation === '是').length;
    const rotationLosses = rows.filter(r => r.rotation === '是' && r.scorer === '对方').length;

    return {
      femaleNetTotal,
      femaleNetRallies: rallies(femaleNetCounts),
      femaleDefenseTotal,
      femaleDefenseRallies: rallies(femaleDefenseCounts),
      defenseToAttackTotal,
      defenseToAttackRallies: rallies(defenseToAttackCounts),
      femaleTargetTotal,
      femaleTargetRallies: rallies(femaleTargetCounts),
      femaleDefenseMiss,
      rotations,
      rotationLosses
    };
  }

  function currentRows(state) {
    return state.games[state.currentGame]?.rallies || state.games[0]?.rallies || [];
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
      #eventCountPanel .opt-card-grid{grid-template-columns:repeat(5,minmax(0,1fr))}
      #eventCountPanel .opt-mini-card b{font-size:24px}
      #eventCountPanel .opt-mini-card small{display:block;margin-top:4px;color:#6c7a8f}
      @media(max-width:900px){#eventCountPanel .opt-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
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
    if (!liveStats || !liveStats.children.length) return;
    const state = loadState();
    const s = summarize(currentRows(state));

    setMetric(liveStats, ['女生封网成功率','女生封网成功次数'], '女生封网成功次数', countText(s.femaleNetTotal), rallyText(s.femaleNetRallies));
    setMetric(liveStats, ['女生防守成功率','女生防守成功次数'], '女生防守成功次数', countText(s.femaleDefenseTotal), rallyText(s.femaleDefenseRallies));
    setMetric(liveStats, ['防守转攻成功率','防守转攻成功次数'], '防守转攻成功次数', countText(s.defenseToAttackTotal), rallyText(s.defenseToAttackRallies));
    setMetric(liveStats, ['轮转错误次数','轮转错误'], '轮转错误次数', countText(s.rotations));
    removeMetric(liveStats, ['女生被突破次数','女生被突破']);
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
    const card = (label, total, rallyCount) => `<div class="opt-mini-card"><span>${label}</span><b>${countText(total)}</b><small>${rallyText(rallyCount)}</small></div>`;
    panel.innerHTML = `<h2>关键事件次数</h2><p class="opt-explain">总次数表示实际发生多少次；回合数表示有多少个回合至少发生过一次。</p><div class="opt-card-grid">${card('女生受攻',s.femaleTargetTotal,s.femaleTargetRallies)}${card('女生防守成功',s.femaleDefenseTotal,s.femaleDefenseRallies)}${card('女生封网成功',s.femaleNetTotal,s.femaleNetRallies)}${card('防守转攻成功',s.defenseToAttackTotal,s.defenseToAttackRallies)}<div class="opt-mini-card"><span>轮转错误</span><b>${countText(s.rotations)}</b><small>${s.rotationLosses ? `直接丢分 ${s.rotationLosses} 次` : '没有直接丢分记录'}</small></div></div>`;
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
      return ['女生受攻防守率', '女生防守成功率', '女生防守成功', '女生被突破'].includes(label);
    });
    if (!target) return;
    const label = target.querySelector('.label');
    const value = target.querySelector('.value');
    const note = target.querySelector('.note');
    if (label) label.textContent = '女生防守成功';
    if (value) value.textContent = countText(s.femaleDefenseTotal);
    if (note) note.textContent = `受攻 ${s.femaleTargetTotal} 次 · ${rallyText(s.femaleDefenseRallies)}`;
  }

  function updateOptimizedDetails(s) {
    const attackPanel = document.getElementById('optAttackEfficiency');
    const attackDetail = attackPanel?.querySelector('.opt-detail-line');
    if (attackDetail) attackDetail.textContent = `女生封网成功 ${s.femaleNetTotal} 次，出现在 ${s.femaleNetRallies} 个回合。`;

    const defensePanel = document.getElementById('optDefenseTargets');
    const defenseDetail = defensePanel?.querySelector('.opt-detail-line');
    if (defenseDetail) {
      const rate = s.femaleTargetTotal ? Math.round(s.femaleDefenseTotal / s.femaleTargetTotal * 100) : 0;
      defenseDetail.textContent = `女生受攻 ${s.femaleTargetTotal} 次；防守成功 ${s.femaleDefenseTotal} 次；未防住 ${s.femaleDefenseMiss} 次；${s.femaleTargetTotal ? `单次防守成功率 ${rate}%` : '暂无受攻样本'}。轮转错误 ${s.rotations} 次，其中直接丢分 ${s.rotationLosses} 次。`;
    }
  }

  function criticalRate(rows) {
    let ours = 0, theirs = 0, count = 0, wins = 0;
    rows.forEach(r => {
      const high = Math.max(ours, theirs);
      const critical = (high >= 15 && Math.abs(ours - theirs) <= 2) || high >= 18;
      if (critical) {
        count++;
        if (r.scorer === '我方') wins++;
      }
      if (r.scorer === '我方') ours++;
      else theirs++;
    });
    return count ? `${Math.round(wins / count * 100)}%` : '—';
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
      const attacks = rows.filter(r => Number(r.maleAttack) > 0);
      const attackWins = attacks.filter(r => r.scorer === '我方').length;
      const chain1 = rows.filter(r => r.first3 === '我方');
      const chain2 = chain1.filter(r => r.forcedLift === '男' || r.forcedLift === '女');
      const chain3 = chain2.filter(r => Number(r.maleAttack) > 0);
      const chain4 = chain3.filter(r => r.scorer === '我方');
      const pct = (n, d) => d ? `${Math.round(n / d * 100)}%` : '—';
      return [
        i + 1,
        `${ours}-${theirs}`,
        pct(serveYes, serve.length),
        pct(retYes, ret.length),
        countText(s.femaleTargetTotal),
        countText(s.femaleDefenseTotal),
        pct(attackWins, attacks.length),
        pct(chain4.length, chain1.length),
        criticalRate(rows),
        countText(s.femaleNetTotal),
        countText(s.defenseToAttackTotal),
        countText(s.rotations)
      ];
    });
  }

  function updateGameCompare(state) {
    const table = document.getElementById('gameCompare');
    if (!table) return;
    const headers = ['局', '比分', '发球前三拍', '接发前三拍', '女生受攻', '女生防守成功', '男生进攻', '完整链', '关键分', '女生封网成功', '防守转攻成功', '轮转错误'];
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

  const rowObserver = new MutationObserver(() => scheduleLive());
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

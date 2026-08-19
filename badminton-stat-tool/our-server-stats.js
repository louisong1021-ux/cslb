(() => {
  const STORAGE_KEY = 'badminton_match_stats_v2';
  const tbody = document.querySelector('#rallyBody');
  const liveStats = document.querySelector('#liveStats');
  const resultsGrid = document.querySelector('#resultsView .results-grid');
  const viewResultsBtn = document.querySelector('#viewResultsBtn');
  if (!tbody) return;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && Array.isArray(parsed.games) ? parsed : { currentGame: 0, games: [{ rallies: [] }] };
    } catch {
      return { currentGame: 0, games: [{ rallies: [] }] };
    }
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

  function pct(num, den) {
    return den ? `${Math.round(num / den * 100)}%` : '—';
  }

  function statFor(rows) {
    const active = rows.filter(r => r.first3 === '我方').length;
    const ourWins = rows.filter(r => r.scorer === '我方').length;
    return {
      count: rows.length,
      active,
      ourWins,
      activeRate: pct(active, rows.length),
      ourWinRate: pct(ourWins, rows.length)
    };
  }

  function summarize(records) {
    const oursServe = records.filter(r => r.server === '我方');
    const oppServe = records.filter(r => r.server === '对方');
    const byServer = (rows, who) => rows.filter(r => personOf(r) === who);
    const byReceiver = (rows, who) => rows.filter(r => receiverOf(r) === who);
    const combo = (rows, serverWho, receiverWho) => statFor(rows.filter(r => personOf(r) === serverWho && receiverOf(r) === receiverWho));

    return {
      ourServerMale: statFor(byServer(oursServe, '男')),
      ourServerFemale: statFor(byServer(oursServe, '女')),
      oppServerMale: statFor(byServer(oppServe, '男')),
      oppServerFemale: statFor(byServer(oppServe, '女')),
      ourReceiverMale: statFor(byReceiver(oppServe, '男')),
      ourReceiverFemale: statFor(byReceiver(oppServe, '女')),
      oppReceiverMale: statFor(byReceiver(oursServe, '男')),
      oppReceiverFemale: statFor(byReceiver(oursServe, '女')),
      ourServeCombos: {
        mm: combo(oursServe, '男', '男'),
        mf: combo(oursServe, '男', '女'),
        fm: combo(oursServe, '女', '男'),
        ff: combo(oursServe, '女', '女')
      },
      oppServeCombos: {
        mm: combo(oppServe, '男', '男'),
        mf: combo(oppServe, '男', '女'),
        fm: combo(oppServe, '女', '男'),
        ff: combo(oppServe, '女', '女')
      },
      ourServerUnassigned: oursServe.filter(r => !personOf(r)).length,
      oppServerUnassigned: oppServe.filter(r => !personOf(r)).length,
      ourReceiverUnassigned: oppServe.filter(r => !receiverOf(r)).length,
      oppReceiverUnassigned: oursServe.filter(r => !receiverOf(r)).length
    };
  }

  function currentRows(state) {
    const index = Math.max(0, Math.min(state.games.length - 1, Number(state.currentGame) || 0));
    return state.games[index]?.rallies || [];
  }

  function allRows(state) {
    return state.games.flatMap(game => Array.isArray(game.rallies) ? game.rallies : []);
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
    const state = loadState();
    const s = summarize(currentRows(state));
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
    const s = summarize(allRows(loadState()));
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

  let liveQueued = false;
  function scheduleLive() {
    if (liveQueued) return;
    liveQueued = true;
    requestAnimationFrame(() => {
      liveQueued = false;
      updateLiveCard();
    });
  }

  let resultsQueued = false;
  function scheduleResults() {
    if (resultsQueued) return;
    resultsQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resultsQueued = false;
      if (document.querySelector('#resultsView.active')) updateResultsCard();
    }));
  }

  document.addEventListener('change', event => {
    if (!tbody.contains(event.target)) return;
    scheduleLive();
    scheduleResults();
  }, true);

  document.addEventListener('badminton:open-stats', scheduleLive);
  viewResultsBtn?.addEventListener('click', scheduleResults);

  const observer = new MutationObserver(() => {
    scheduleLive();
    scheduleResults();
  });
  observer.observe(tbody, { childList: true });

  updateLiveCard();
  scheduleResults();
})();

(() => {
  const STORAGE_KEY = 'badminton_match_stats_v2';
  const $ = s => document.querySelector(s);
  const liveStats = $('#liveStats');
  const resultsGrid = $('#resultsView .results-grid');
  const viewResultsBtn = $('#viewResultsBtn');
  const backBtn = $('#backBtn');
  if (!liveStats || !resultsGrid) return;

  let renderingLive = false;
  let queued = false;

  function loadState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return state && Array.isArray(state.games) ? state : { currentGame: 0, games: [{ rallies: [] }] };
    } catch {
      return { currentGame: 0, games: [{ rallies: [] }] };
    }
  }

  const ratio = (n, d) => d ? n / d * 100 : 0;
  const pct = (n, d) => d ? `${Math.round(n / d * 100)}%` : '—';
  const countText = n => n ? `${n} 次` : '没有';

  function bucket(rows, pred) {
    const list = rows.filter(pred);
    const wins = list.filter(r => r.scorer === '我方').length;
    return { count: list.length, wins, rate: ratio(wins, list.length) };
  }

  function targetStat(rows, target) {
    const list = rows.filter(r => r.attacked === target);
    const losses = list.filter(r => r.scorer === '对方').length;
    return { count: list.length, losses, lossRate: ratio(losses, list.length) };
  }

  function lossStructure(rows) {
    const losses = rows.filter(r => r.scorer === '对方');
    const categories = {
      '发接发': 0,
      '进攻': 0,
      '防守': 0,
      '轮转': 0,
      '主动失误': 0,
      '其他': 0
    };
    losses.forEach(r => {
      if (r.reason === '发接发被抢') categories['发接发'] += 1;
      else if (r.reason === '主动进攻丢分') categories['进攻'] += 1;
      else if (['女生被突破', '防守被杀穿'].includes(r.reason)) categories['防守'] += 1;
      else if (r.reason === '轮转错误') categories['轮转'] += 1;
      else if (['男生失误', '女生失误', '判断失误'].includes(r.reason)) categories['主动失误'] += 1;
      else categories['其他'] += 1;
    });
    return { total: losses.length, categories };
  }

  function aggregate(rows) {
    const serve = rows.filter(r => r.server === '我方');
    const ret = rows.filter(r => r.server === '对方');
    const first3 = rows.filter(r => r.first3 === '我方');
    const forced = rows.filter(r => r.forcedLift === '男' || r.forcedLift === '女');
    const attacks = rows.filter(r => Number(r.maleAttack) > 0);
    const attackWins = attacks.filter(r => r.scorer === '我方');
    const femaleNetApps = rows.filter(r => r.femaleNet !== '不适用');
    const femaleNetYes = femaleNetApps.filter(r => r.femaleNet === '是');
    const femaleDefApps = rows.filter(r => r.femaleDefense !== '不适用');
    const femaleDefYes = femaleDefApps.filter(r => r.femaleDefense === '是');
    const dtaApps = rows.filter(r => r.defenseToAttack !== '不适用');
    const dtaYes = dtaApps.filter(r => r.defenseToAttack === '是');
    const femaleTarget = rows.filter(r => r.attacked === '女');
    const femaleTargetDef = femaleTarget.filter(r => r.femaleDefense === '是');
    const femaleBreak = femaleTarget.filter(r => r.femaleBreak === '是');
    const rotationRows = rows.filter(r => r.rotation === '是');
    const rotationLosses = rotationRows.filter(r => r.scorer === '对方');

    // Strict full-chain funnel: each later stage is a subset of the previous one.
    const chain1 = rows.filter(r => r.first3 === '我方');
    const chain2 = chain1.filter(r => r.forcedLift === '男' || r.forcedLift === '女');
    const chain3 = chain2.filter(r => Number(r.maleAttack) > 0);
    const chain4 = chain3.filter(r => r.scorer === '我方');

    const forcedMale = rows.filter(r => r.forcedLift === '男').length;
    const forcedFemale = rows.filter(r => r.forcedLift === '女').length;
    const forcedTotal = forcedMale + forcedFemale;

    const netAfterAttackApps = attacks.filter(r => r.femaleNet !== '不适用');
    const netAfterAttackYes = netAfterAttackApps.filter(r => r.femaleNet === '是');

    return {
      n: rows.length,
      serveCount: serve.length,
      serveYes: serve.filter(r => r.serveActive === '是').length,
      serveRate: ratio(serve.filter(r => r.serveActive === '是').length, serve.length),
      returnCount: ret.length,
      returnYes: ret.filter(r => r.returnActive === '是').length,
      returnRate: ratio(ret.filter(r => r.returnActive === '是').length, ret.length),
      first3Count: first3.length,
      first3Rate: ratio(first3.length, rows.length),
      forcedCount: forced.length,
      forcedMale,
      forcedFemale,
      forcedMaleShare: ratio(forcedMale, forcedTotal),
      forcedFemaleShare: ratio(forcedFemale, forcedTotal),
      attackCount: attacks.length,
      attackWins: attackWins.length,
      attackRate: ratio(attackWins.length, attacks.length),
      attackOne: bucket(rows, r => Number(r.maleAttack) === 1),
      attackTwoThree: bucket(rows, r => Number(r.maleAttack) >= 2 && Number(r.maleAttack) <= 3),
      attackFourPlus: bucket(rows, r => Number(r.maleAttack) >= 4),
      femaleNetCount: femaleNetApps.length,
      femaleNetYes: femaleNetYes.length,
      femaleNetRate: ratio(femaleNetYes.length, femaleNetApps.length),
      netAfterAttackCount: netAfterAttackApps.length,
      netAfterAttackYes: netAfterAttackYes.length,
      netAfterAttackRate: ratio(netAfterAttackYes.length, netAfterAttackApps.length),
      femaleDefCount: femaleDefApps.length,
      femaleDefYes: femaleDefYes.length,
      femaleDefRate: ratio(femaleDefYes.length, femaleDefApps.length),
      femaleTargetCount: femaleTarget.length,
      femaleTargetDef: femaleTargetDef.length,
      femaleTargetDefRate: ratio(femaleTargetDef.length, femaleTarget.length),
      femaleBreak: femaleBreak.length,
      femaleBreakRate: ratio(femaleBreak.length, femaleTarget.length),
      dtaCount: dtaApps.length,
      dtaYes: dtaYes.length,
      dtaRate: ratio(dtaYes.length, dtaApps.length),
      rotationCount: rotationRows.length,
      rotationLosses: rotationLosses.length,
      rotationFatalRate: ratio(rotationLosses.length, rotationRows.length),
      targetMale: targetStat(rows, '男'),
      targetFemale: targetStat(rows, '女'),
      targetMid: targetStat(rows, '中间'),
      chain: [chain1.length, chain2.length, chain3.length, chain4.length],
      chainRate: ratio(chain4.length, chain1.length),
      loss: lossStructure(rows)
    };
  }

  function criticalStats(games) {
    let count = 0;
    let wins = 0;
    const lossReasons = {};
    games.forEach(game => {
      let ours = 0;
      let theirs = 0;
      (game.rallies || []).forEach(r => {
        const highScore = Math.max(ours, theirs);
        const critical = (highScore >= 15 && Math.abs(ours - theirs) <= 2) || highScore >= 18;
        if (critical) {
          count += 1;
          if (r.scorer === '我方') wins += 1;
          else if (r.reason) lossReasons[r.reason] = (lossReasons[r.reason] || 0) + 1;
        }
        if (r.scorer === '我方') ours += 1;
        else theirs += 1;
      });
    });
    const topLoss = Object.entries(lossReasons).sort((a, b) => b[1] - a[1])[0] || null;
    return { count, wins, rate: ratio(wins, count), topLoss };
  }

  function gameScore(game) {
    let a = 0, b = 0;
    (game.rallies || []).forEach(r => r.scorer === '我方' ? a += 1 : b += 1);
    return [a, b];
  }

  function allRows(state) {
    return state.games.flatMap(g => Array.isArray(g.rallies) ? g.rallies : []);
  }

  function bar(label, rate, note = '') {
    const safe = Math.max(0, Math.min(100, rate || 0));
    return `<div class="bar-row"><div>${label}${note ? `<small class="opt-bar-note">${note}</small>` : ''}</div><div class="bar-track"><div class="bar-fill" style="width:${safe}%"></div></div><b>${Math.round(rate || 0)}%</b></div>`;
  }

  function funnelHtml(s) {
    const labels = ['前三拍抢主动', '逼出被动挑球', '男生形成连续进攻', '最终得分'];
    const base = s.chain[0] || 0;
    return `<div class="opt-funnel">${s.chain.map((v, i) => {
      const rate = i === 0 ? (base ? 100 : 0) : ratio(v, base);
      return `<div class="opt-funnel-step"><div class="opt-funnel-top"><span>${labels[i]}</span><b>${v} 次</b></div><div class="opt-funnel-track"><i style="width:${Math.max(4, Math.min(100, rate))}%"></i></div>${i ? `<small>占抢到主动回合 ${base ? Math.round(rate) + '%' : '—'}</small>` : '<small>完整进攻链起点</small>'}</div>`;
    }).join('')}</div>`;
  }

  function attackBucketCard(label, x) {
    return `<div class="opt-mini-card"><span>${label}</span><b>${countText(x.count)}</b><small>得分率 ${x.count ? Math.round(x.rate) + '%' : '—'} · 得分 ${x.wins}</small></div>`;
  }

  function targetCard(label, x) {
    return `<div class="opt-mini-card"><span>${label}</span><b>${countText(x.count)}</b><small>对方得分率 ${x.count ? Math.round(x.lossRate) + '%' : '—'} · 丢 ${x.losses} 分</small></div>`;
  }

  function lossBars(s) {
    const entries = Object.entries(s.loss.categories).sort((a, b) => b[1] - a[1]);
    return entries.map(([label, n]) => {
      const rate = ratio(n, s.loss.total);
      return `<div class="opt-loss-row"><span>${label}</span><div><i style="width:${Math.min(100, rate)}%"></i></div><b>${n ? `${n}次 · ${Math.round(rate)}%` : '没有'}</b></div>`;
    }).join('');
  }

  function buildOptimizedRecommendations(s, critical) {
    const rec = [];
    if (s.n < 12) rec.push('样本仍偏少：建议至少记录 15–20 分后，再把单场数据作为训练重点依据。');

    const drops = [
      ['抢到前三拍主动后没有逼出起球', s.chain[0] - s.chain[1]],
      ['逼出起球后没有形成男生连续进攻', s.chain[1] - s.chain[2]],
      ['形成完整进攻链后没有转化成得分', s.chain[2] - s.chain[3]]
    ].sort((a, b) => b[1] - a[1]);
    if (s.chain[0] >= 4 && drops[0][1] > 0) rec.push(`完整进攻链最大掉点：${drops[0][0]}（${drops[0][1]} 次）。训练优先解决这一环，而不是只看最终输赢。`);

    if (s.femaleTargetCount >= 4 && s.femaleTargetDefRate < 65) rec.push(`女生被对手攻击 ${s.femaleTargetCount} 次，防守成功率 ${Math.round(s.femaleTargetDefRate)}%。建议把“防起并继续回合”先稳定到 65%–70%。`);

    const targets = [['男生', s.targetMale], ['女生', s.targetFemale], ['中路', s.targetMid]].filter(([, x]) => x.count >= 3).sort((a, b) => b[1].lossRate - a[1].lossRate);
    if (targets.length && targets[0][1].lossRate >= 55) rec.push(`当前最危险的受攻区域是${targets[0][0]}：被攻击后对方得分率 ${Math.round(targets[0][1].lossRate)}%。优先针对这个区域设计防守和补位。`);

    const topLoss = Object.entries(s.loss.categories).sort((a, b) => b[1] - a[1])[0];
    if (topLoss && topLoss[1] >= 3) rec.push(`本场最大丢分大类是“${topLoss[0]}”，占已归类丢分的 ${Math.round(ratio(topLoss[1], s.loss.total))}%。训练安排应优先覆盖这一类。`);

    if (critical.count >= 4 && critical.rate < 50) rec.push(`关键分得分率 ${Math.round(critical.rate)}%（${critical.wins}/${critical.count}）。建议单独复盘 15 分后胶着分和 18 分后的处理选择。`);

    if (!rec.length) rec.push('目前主要环节没有出现明显单点短板。下一步重点看不同对手下，哪一项指标最先下降，再做针对性训练。');
    return rec.slice(0, 5);
  }

  function renderLive() {
    if (renderingLive) return;
    renderingLive = true;
    try {
      const state = loadState();
      const game = state.games[state.currentGame] || state.games[0] || { rallies: [] };
      const s = aggregate(game.rallies || []);
      const critical = criticalStats([game]);
      let card = $('#optimizedLiveCard');
      if (!card) {
        card = document.createElement('div');
        card.id = 'optimizedLiveCard';
        card.className = 'stat-card opt-diagnostic-card';
        liveStats.prepend(card);
      }
      const targetText = [
        `男 ${s.targetMale.count ? Math.round(s.targetMale.lossRate) + '%' : '—'}`,
        `女 ${s.targetFemale.count ? Math.round(s.targetFemale.lossRate) + '%' : '—'}`,
        `中路 ${s.targetMid.count ? Math.round(s.targetMid.lossRate) + '%' : '—'}`
      ].join(' · ');
      card.innerHTML = `
        <h3>比赛诊断摘要</h3>
        <div class="opt-live-grid">
          <div><span>完整进攻链</span><b>${s.chain.join(' → ')}</b><small>主动 → 起球 → 连续进攻 → 得分</small></div>
          <div><span>女生受攻</span><b>${s.femaleTargetCount} / ${s.femaleTargetDef} / ${s.femaleBreak}</b><small>被攻击 / 防住 / 被突破</small></div>
          <div><span>对手攻击后的得分率</span><b class="opt-small-value">${targetText}</b><small>越高代表该区域越危险</small></div>
          <div><span>关键分</span><b>${critical.count ? Math.round(critical.rate) + '%' : '—'}</b><small>${critical.wins}/${critical.count} · 15分后胶着或18分后</small></div>
        </div>`;
    } finally {
      renderingLive = false;
    }
  }

  function ensurePanel(id, title) {
    let panel = document.getElementById(id);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = id;
      panel.className = 'results-panel opt-results-panel';
      const serverCard = document.getElementById('ourServerResultsCard');
      if (serverCard && serverCard.parentElement === resultsGrid) resultsGrid.insertBefore(panel, serverCard);
      else resultsGrid.appendChild(panel);
    }
    panel.dataset.title = title;
    return panel;
  }

  function renderResultsOptimized() {
    const state = loadState();
    const rows = allRows(state);
    const s = aggregate(rows);
    const critical = criticalStats(state.games);

    const kpiRow = $('#kpiRow');
    if (kpiRow) {
      const kpis = [
        ['前三拍主动率', s.n ? `${Math.round(s.first3Rate)}%` : '—', `发球 ${s.serveCount ? Math.round(s.serveRate) + '%' : '—'} · 接发 ${s.returnCount ? Math.round(s.returnRate) + '%' : '—'}`],
        ['完整进攻链得分率', s.chain[0] ? `${Math.round(s.chainRate)}%` : '—', `${s.chain[3]} / ${s.chain[0]}`],
        ['女生受攻防守率', s.femaleTargetCount ? `${Math.round(s.femaleTargetDefRate)}%` : '—', `防住 ${s.femaleTargetDef} / 被攻击 ${s.femaleTargetCount}`],
        ['男生进攻得分率', s.attackCount ? `${Math.round(s.attackRate)}%` : '—', `${s.attackWins} / ${s.attackCount}`],
        ['关键分得分率', critical.count ? `${Math.round(critical.rate)}%` : '—', `${critical.wins} / ${critical.count}`]
      ];
      kpiRow.innerHTML = kpis.map(([l, v, n]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="note">${n}</div></div>`).join('');
    }

    const performanceBars = $('#performanceBars');
    if (performanceBars) {
      performanceBars.innerHTML = [
        bar('发球前三拍主动率', s.serveRate, `${s.serveYes}/${s.serveCount}`),
        bar('接发前三拍主动率', s.returnRate, `${s.returnYes}/${s.returnCount}`),
        bar('女生受攻防守率', s.femaleTargetDefRate, `${s.femaleTargetDef}/${s.femaleTargetCount}`),
        bar('男生进攻得分率', s.attackRate, `${s.attackWins}/${s.attackCount}`),
        bar('女生封网成功率', s.femaleNetRate, `${s.femaleNetYes}/${s.femaleNetCount}`),
        bar('防守转攻成功率', s.dtaRate, `${s.dtaYes}/${s.dtaCount}`),
        bar('关键分得分率', critical.rate, `${critical.wins}/${critical.count}`)
      ].join('');
    }

    const recommendations = $('#recommendations');
    if (recommendations) recommendations.innerHTML = buildOptimizedRecommendations(s, critical).map(x => `<div class="recommendation">${x}</div>`).join('');

    const funnel = ensurePanel('optAttackFunnel', '完整进攻链漏斗');
    funnel.innerHTML = `<h2>完整进攻链漏斗</h2><p class="opt-explain">只统计同一个回合内连续满足“前三拍主动 → 逼出被动挑球 → 男生连续进攻 → 得分”的完整链条。</p>${funnelHtml(s)}<div class="opt-share-row"><span>逼起球贡献</span><b>男 ${s.forcedMale}（${s.forcedMale + s.forcedFemale ? Math.round(s.forcedMaleShare) + '%' : '—'}）</b><b>女 ${s.forcedFemale}（${s.forcedMale + s.forcedFemale ? Math.round(s.forcedFemaleShare) + '%' : '—'}）</b></div>`;

    const attack = ensurePanel('optAttackEfficiency', '连续进攻效率');
    attack.innerHTML = `<h2>男生连续进攻效率</h2><div class="opt-card-grid">${attackBucketCard('1拍进攻', s.attackOne)}${attackBucketCard('2–3拍进攻', s.attackTwoThree)}${attackBucketCard('4拍以上', s.attackFourPlus)}</div><div class="opt-detail-line">女生在男生形成连续进攻后的封网记录：${countText(s.netAfterAttackCount)}；成功 ${s.netAfterAttackYes} 次；成功率 ${s.netAfterAttackCount ? Math.round(s.netAfterAttackRate) + '%' : '—'}。</div>`;

    const defense = ensurePanel('optDefenseTargets', '防守靶点');
    defense.innerHTML = `<h2>防守靶点与突破</h2><div class="opt-card-grid">${targetCard('攻击男生', s.targetMale)}${targetCard('攻击女生', s.targetFemale)}${targetCard('攻击中路', s.targetMid)}</div><div class="opt-detail-line">女生被攻击 ${s.femaleTargetCount} 次 → 防住 ${s.femaleTargetDef} 次 → 被突破 ${s.femaleBreak} 次；防守成功率 ${s.femaleTargetCount ? Math.round(s.femaleTargetDefRate) + '%' : '—'}。轮转错误 ${s.rotationCount} 次，其中直接丢分 ${s.rotationLosses} 次。</div>`;

    const structure = ensurePanel('optLossStructure', '丢分结构');
    const criticalLoss = critical.topLoss ? `${critical.topLoss[0]} ${critical.topLoss[1]} 次` : '暂无';
    structure.innerHTML = `<h2>丢分结构与关键分</h2><div class="opt-loss-list">${lossBars(s)}</div><div class="opt-critical-box"><div><span>关键分定义</span><b>15分后分差≤2，或任一方达到18分以后</b></div><div><span>关键分得分</span><b>${critical.count ? `${critical.wins}/${critical.count} · ${Math.round(critical.rate)}%` : '暂无样本'}</b></div><div><span>关键分最常见丢分</span><b>${criticalLoss}</b></div></div>`;

    const compare = $('#gameCompare');
    if (compare) {
      const headers = ['局', '比分', '发球前三拍', '接发前三拍', '女生受攻防守', '男生进攻', '完整链', '关键分'];
      const rowsHtml = state.games.map((g, i) => {
        const gs = aggregate(g.rallies || []);
        const gc = criticalStats([g]);
        const [a, b] = gameScore(g);
        const vals = [
          i + 1,
          `${a}-${b}`,
          gs.serveCount ? `${Math.round(gs.serveRate)}%` : '—',
          gs.returnCount ? `${Math.round(gs.returnRate)}%` : '—',
          gs.femaleTargetCount ? `${Math.round(gs.femaleTargetDefRate)}%` : '—',
          gs.attackCount ? `${Math.round(gs.attackRate)}%` : '—',
          gs.chain[0] ? `${Math.round(gs.chainRate)}%` : '—',
          gc.count ? `${Math.round(gc.rate)}%` : '—'
        ];
        return `<tr>${vals.map(v => `<td>${v}</td>`).join('')}</tr>`;
      }).join('');
      compare.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody>`;
    }
  }

  function scheduleLive() {
    if (queued || renderingLive) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderLive();
    });
  }

  const liveObserver = new MutationObserver(scheduleLive);
  liveObserver.observe(liveStats, { childList: true, subtree: true, characterData: true });

  document.addEventListener('change', event => {
    if (event.target.closest?.('#rallyBody')) scheduleLive();
  }, true);

  viewResultsBtn?.addEventListener('click', () => queueMicrotask(renderResultsOptimized));
  backBtn?.addEventListener('click', () => queueMicrotask(renderLive));

  const resultObserver = new MutationObserver(() => {
    if ($('#resultsView.active')) queueMicrotask(renderResultsOptimized);
  });
  const resultsView = $('#resultsView');
  if (resultsView) resultObserver.observe(resultsView, { attributes: true, attributeFilter: ['class'] });

  renderLive();
})();

(() => {
  const STORAGE_KEY = 'badminton_match_stats_v2';
  const tbody = document.querySelector('#rallyBody');
  const liveStats = document.querySelector('#liveStats');
  const resultsView = document.querySelector('#resultsView');
  const resultsGrid = document.querySelector('#resultsView .results-grid');
  const viewResultsBtn = document.querySelector('#viewResultsBtn');
  if (!tbody) return;

  const WIN_REASONS = [
    '男生杀球',
    '男生吊球/劈吊',
    '女生封网',
    '女生扑球',
    '网前搓放得分',
    '平抽挡得分',
    '防守反击得分',
    '发接发抢攻',
    '对方主动失误',
    '对方受压失误',
    '其他得分'
  ];

  const LOSS_REASONS = [
    '男生主动进攻失误',
    '男生网前失误',
    '女生网前失误',
    '女生防守失误',
    '发球失误',
    '接发失误',
    '发接发被抢',
    '平抽挡被压死',
    '防守被杀穿',
    '网前被扑死',
    '轮转错误',
    '判断/让球失误',
    '其他丢分'
  ];

  const LOSS_GROUPS = [
    ['发接发', new Set(['发球失误','接发失误','发接发被抢'])],
    ['后场进攻', new Set(['男生主动进攻失误','主动进攻丢分'])],
    ['网前', new Set(['男生网前失误','女生网前失误','网前被扑死'])],
    ['防守对抗', new Set(['女生防守失误','防守被杀穿','平抽挡被压死','女生被突破'])],
    ['轮转', new Set(['轮转错误'])],
    ['判断沟通', new Set(['判断/让球失误','判断失误'])],
    ['其他', new Set(['男生失误','女生失误','其他丢分'])]
  ];

  const LOSS_TRAINING = {
    '发接发': '优先拆分检查发球质量、接发落点和第三拍衔接，避免把直接失误和被抢主动混在一起。',
    '后场进攻': '重点复盘连续进攻中的击球选择、落点变化和杀后跟进，而不是只增加杀球力量。',
    '网前': '重点练封网启动、扑球时机、搓放质量，以及避免给对方形成直接扑球机会。',
    '防守对抗': '重点练第一拍防起、平抽挡承压和防守后的下一拍衔接，先提高回合延续率。',
    '轮转': '重点练杀后跟进、挡网后换位和攻防转换时的固定轮转规则。',
    '判断沟通': '重点明确中路球归属、让球口令和高压回合中的判断规则。',
    '其他': '建议继续使用更具体的本分结果，减少“其他”类，后续统计会更有训练价值。'
  };

  function loadState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return state && Array.isArray(state.games) ? state : { currentGame: 0, games: [{ rallies: [] }] };
    } catch {
      return { currentGame: 0, games: [{ rallies: [] }] };
    }
  }

  function currentRows(state) {
    return state.games[state.currentGame]?.rallies || state.games[0]?.rallies || [];
  }

  function allRows(state) {
    return state.games.flatMap(game => Array.isArray(game.rallies) ? game.rallies : []);
  }

  function reasonListForRow(row) {
    return row?.querySelector('select.scorer')?.value === '对方' ? LOSS_REASONS : WIN_REASONS;
  }

  function optionSignature(select) {
    return Array.from(select.options).map(option => option.value).join('\u0001');
  }

  function updateReasonButton(select) {
    const button = select.nextElementSibling;
    if (!button?.classList.contains('cycle-choice')) return;
    const value = select.value || '—';
    const text = `本分结果：${value}`;
    if (button.textContent !== text) button.textContent = text;
    button.setAttribute('aria-label', `${text}，点击选择`);
    button.title = '点击选择本分结果';
  }

  function enhanceReasonSelect(select) {
    if (!(select instanceof HTMLSelectElement)) return;
    const row = select.closest('tr');
    if (!row) return;

    const current = select.value || '';
    const base = reasonListForRow(row);
    const values = ['', ...base];

    // Keep an older saved reason selectable on that existing rally without
    // exposing the old broad categories on new records.
    if (current && !values.includes(current)) values.push(current);

    if (optionSignature(select) !== values.join('\u0001')) {
      const fragment = document.createDocumentFragment();
      values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value || '—';
        fragment.appendChild(option);
      });
      select.replaceChildren(fragment);
      select.value = current && values.includes(current) ? current : '';
    }

    updateReasonButton(select);
  }

  function renderReasonChips() {
    const win = document.getElementById('winReasons');
    const loss = document.getElementById('lossReasons');
    if (win) {
      const html = WIN_REASONS.map(reason => `<div class="reason-chip">● ${reason}</div>`).join('');
      if (win.innerHTML !== html) win.innerHTML = html;
    }
    if (loss) {
      const html = LOSS_REASONS.map(reason => `<div class="reason-chip">● ${reason}</div>`).join('');
      if (loss.innerHTML !== html) loss.innerHTML = html;
    }
  }

  function enhanceReasons() {
    tbody.querySelectorAll('select.reason').forEach(enhanceReasonSelect);
    renderReasonChips();
  }

  function reasonCount(rows, reasons) {
    const wanted = new Set(reasons);
    return rows.filter(row => wanted.has(row.reason)).length;
  }

  function findMetric(labels) {
    if (!liveStats) return null;
    const wanted = new Set(Array.isArray(labels) ? labels : [labels]);
    return Array.from(liveStats.querySelectorAll('.metric')).find(card => wanted.has(card.querySelector('.metric-label')?.textContent.trim() || '')) || null;
  }

  function patchLive() {
    if (!liveStats?.children.length) return;
    const rows = currentRows(loadState());

    const serveError = reasonCount(rows, ['发球失误']);
    const returnError = reasonCount(rows, ['接发失误']);
    const first3Loss = reasonCount(rows, ['发接发被抢']);
    const serveReceiveMetric = findMetric(['发接发抢攻丢分','发接发直接/被抢丢分']);
    if (serveReceiveMetric) {
      const total = serveError + returnError + first3Loss;
      const label = serveReceiveMetric.querySelector('.metric-label');
      const value = serveReceiveMetric.querySelector('.metric-value');
      const sub = serveReceiveMetric.querySelector('.metric-sub');
      if (label && label.textContent !== '发接发直接/被抢丢分') label.textContent = '发接发直接/被抢丢分';
      if (value && value.textContent !== String(total)) value.textContent = String(total);
      const note = `发球 ${serveError} · 接发 ${returnError} · 被抢 ${first3Loss}`;
      if (sub && sub.textContent !== note) sub.textContent = note;
    }

    const maleAttack = reasonCount(rows, ['男生主动进攻失误','主动进攻丢分']);
    const maleNet = reasonCount(rows, ['男生网前失误']);
    const maleLegacy = reasonCount(rows, ['男生失误']);
    const maleMetric = findMetric(['男生直接失误','男生失误']);
    if (maleMetric) {
      const total = maleAttack + maleNet + maleLegacy;
      const label = maleMetric.querySelector('.metric-label');
      const value = maleMetric.querySelector('.metric-value');
      const sub = maleMetric.querySelector('.metric-sub');
      if (label && label.textContent !== '男生失误') label.textContent = '男生失误';
      if (value && value.textContent !== String(total)) value.textContent = String(total);
      const note = `进攻 ${maleAttack} · 网前 ${maleNet}${maleLegacy ? ` · 旧记录 ${maleLegacy}` : ''}`;
      if (sub && sub.textContent !== note) sub.textContent = note;
    }

    const femaleNet = reasonCount(rows, ['女生网前失误']);
    const femaleDefense = reasonCount(rows, ['女生防守失误']);
    const femaleLegacy = reasonCount(rows, ['女生失误']);
    const femaleMetric = findMetric(['女生直接失误','女生失误']);
    if (femaleMetric) {
      const total = femaleNet + femaleDefense + femaleLegacy;
      const label = femaleMetric.querySelector('.metric-label');
      const value = femaleMetric.querySelector('.metric-value');
      const sub = femaleMetric.querySelector('.metric-sub');
      if (label && label.textContent !== '女生失误') label.textContent = '女生失误';
      if (value && value.textContent !== String(total)) value.textContent = String(total);
      const note = `网前 ${femaleNet} · 防守 ${femaleDefense}${femaleLegacy ? ` · 旧记录 ${femaleLegacy}` : ''}`;
      if (sub && sub.textContent !== note) sub.textContent = note;
    }
  }

  function groupedLosses(rows) {
    const losses = rows.filter(row => row.scorer === '对方' && row.reason);
    const categories = Object.fromEntries(LOSS_GROUPS.map(([label]) => [label, 0]));
    losses.forEach(row => {
      const group = LOSS_GROUPS.find(([, reasons]) => reasons.has(row.reason));
      categories[group ? group[0] : '其他'] += 1;
    });
    return { categories, total: losses.length };
  }

  function patchLossStructure(rows) {
    const panel = document.getElementById('optLossStructure');
    const list = panel?.querySelector('.opt-loss-list');
    if (!list) return;

    const summary = groupedLosses(rows);
    const entries = Object.entries(summary.categories).sort((a, b) => b[1] - a[1]);
    const html = entries.map(([label, count]) => {
      const rate = summary.total ? count / summary.total * 100 : 0;
      return `<div class="opt-loss-row"><span>${label}</span><div><i style="width:${Math.min(100, rate)}%"></i></div><b>${count ? `${count}次 · ${Math.round(rate)}%` : '没有'}</b></div>`;
    }).join('');
    if (list.innerHTML !== html) list.innerHTML = html;

    const recommendations = document.getElementById('recommendations');
    if (!recommendations) return;
    recommendations.querySelectorAll('[data-detailed-loss-recommendation="1"]').forEach(item => item.remove());
    Array.from(recommendations.querySelectorAll('.recommendation')).forEach(item => {
      if (/本场最大丢分大类是/.test(item.textContent || '')) item.remove();
    });

    const top = entries[0];
    if (top && top[1] >= 3) {
      const item = document.createElement('div');
      item.className = 'recommendation';
      item.dataset.detailedLossRecommendation = '1';
      item.textContent = `本场最大丢分大类是“${top[0]}”，共 ${top[1]} 次。${LOSS_TRAINING[top[0]] || LOSS_TRAINING['其他']}`;
      recommendations.appendChild(item);
    }
  }

  function patchResults() {
    if (!resultsView?.classList.contains('active')) return;
    patchLossStructure(allRows(loadState()));
  }

  let entryQueued = false;
  function scheduleEntry() {
    if (entryQueued) return;
    entryQueued = true;
    requestAnimationFrame(() => {
      entryQueued = false;
      enhanceReasons();
      patchLive();
    });
  }

  let resultsQueued = false;
  function scheduleResults() {
    if (resultsQueued) return;
    resultsQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resultsQueued = false;
      patchResults();
    }));
  }

  document.addEventListener('change', event => {
    if (!tbody.contains(event.target)) return;
    scheduleEntry();
    scheduleResults();
  }, true);

  document.addEventListener('badminton:open-stats', () => requestAnimationFrame(patchLive));
  viewResultsBtn?.addEventListener('click', scheduleResults);

  const rowObserver = new MutationObserver(scheduleEntry);
  rowObserver.observe(tbody, { childList: true, subtree: true });

  if (liveStats) {
    const liveObserver = new MutationObserver(() => requestAnimationFrame(patchLive));
    liveObserver.observe(liveStats, { childList: true, subtree: true });
  }

  if (resultsGrid) {
    const resultsObserver = new MutationObserver(scheduleResults);
    resultsObserver.observe(resultsGrid, { childList: true, subtree: true });
  }

  enhanceReasons();
  patchLive();
  scheduleResults();
})();

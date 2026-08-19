(() => {
  const STORAGE_KEY = 'badminton_match_stats_v2';
  const tbody = document.querySelector('#rallyBody');
  const liveStats = document.querySelector('#liveStats');
  const resultsGrid = document.querySelector('#resultsView .results-grid');
  const viewResultsBtn = document.querySelector('#viewResultsBtn');
  if (!tbody) return;

  const MAX_COUNT = 20;
  const clamp = value => Math.max(0, Math.min(MAX_COUNT, Math.round(Number(value) || 0)));
  const countText = value => Number(value) ? `${Math.max(0, Math.round(Number(value)))} 次` : '没有';
  const rallyText = value => Number(value) ? `${Number(value)} 个回合` : '没有发生';

  function loadState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return state && Array.isArray(state.games) ? state : { currentGame: 0, games: [{ rallies: [] }] };
    } catch {
      return { currentGame: 0, games: [{ rallies: [] }] };
    }
  }

  function currentRally(index) {
    const state = loadState();
    const gameIndex = Math.max(0, Number(state.currentGame) || 0);
    return state.games[gameIndex]?.rallies?.[index] || null;
  }

  function storedCount(rally) {
    if (rally && rally.rotationCount !== undefined && rally.rotationCount !== null && rally.rotationCount !== '' && Number.isFinite(Number(rally.rotationCount))) {
      return clamp(rally.rotationCount);
    }
    return rally?.rotation === '是' ? 1 : 0;
  }

  function replaceOptions(select) {
    const fragment = document.createDocumentFragment();
    for (let value = 0; value <= MAX_COUNT; value += 1) {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(value);
      fragment.appendChild(option);
    }
    select.replaceChildren(fragment);
  }

  function syncLegacy(cell) {
    const legacy = cell?.querySelector('select.rotation[data-rotation-legacy="1"]');
    const counter = cell?.querySelector('select.rotationCount');
    if (!legacy || !counter) return;
    const next = clamp(counter.value) > 0 ? '是' : '否';
    if (legacy.value === next) return;
    legacy.value = next;
    legacy.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function syncCounterFromLegacy(cell) {
    const legacy = cell?.querySelector('select.rotation[data-rotation-legacy="1"]');
    const counter = cell?.querySelector('select.rotationCount');
    if (!legacy || !counter) return;
    if (legacy.value === '是' && clamp(counter.value) < 1) {
      counter.value = '1';
      counter.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (legacy.value === '否' && clamp(counter.value) !== 0) {
      counter.value = '0';
      counter.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function transformRotation(legacy) {
    if (!legacy || legacy.dataset.rotationLegacy === '1') return;
    const cell = legacy.closest('td');
    if (!cell) return;

    const index = Number(legacy.dataset.i);
    const rally = Number.isInteger(index) ? currentRally(index) : null;
    const hasStored = rally && Object.prototype.hasOwnProperty.call(rally, 'rotationCount');
    const initial = storedCount(rally);

    const oldButton = legacy.nextElementSibling;
    if (oldButton?.classList.contains('cycle-choice')) oldButton.remove();

    legacy.dataset.rotationLegacy = '1';
    legacy.dataset.cycleReady = '1';
    legacy.classList.add('native-cycle-select');
    legacy.tabIndex = -1;
    legacy.setAttribute('aria-hidden', 'true');

    const counter = document.createElement('select');
    counter.className = 'rotationCount event-number-select rotation-count-control';
    counter.dataset.i = legacy.dataset.i || '0';
    counter.dataset.numberPickerLabel = '轮转错误次数';
    replaceOptions(counter);
    counter.value = String(initial);
    counter.onchange = legacy.onchange;

    cell.dataset.label = '轮转错误次数';
    cell.classList.add('rotation-count-cell');
    cell.insertBefore(counter, legacy);

    if (!hasStored) counter.dispatchEvent(new Event('change', { bubbles: true }));
    queueMicrotask(() => syncLegacy(cell));
  }

  function transformAll() {
    tbody.querySelectorAll('select.rotation:not([data-rotation-legacy="1"])').forEach(transformRotation);
  }

  function summarize(rows) {
    let total = 0;
    let rallyCount = 0;
    let lossRallies = 0;
    rows.forEach(rally => {
      const count = storedCount(rally);
      total += count;
      if (count > 0) {
        rallyCount += 1;
        if (rally.scorer === '对方') lossRallies += 1;
      }
    });
    return { total, rallyCount, lossRallies };
  }

  function patchLive() {
    if (!liveStats) return;
    const state = loadState();
    const rows = state.games[state.currentGame]?.rallies || state.games[0]?.rallies || [];
    const s = summarize(rows);
    const metric = Array.from(liveStats.querySelectorAll('.metric')).find(card => {
      const label = card.querySelector('.metric-label')?.textContent.trim() || '';
      return label === '轮转错误次数' || label === '轮转错误';
    });
    if (!metric) return;
    const label = metric.querySelector('.metric-label');
    const value = metric.querySelector('.metric-value');
    const sub = metric.querySelector('.metric-sub');
    if (label && label.textContent !== '轮转错误次数') label.textContent = '轮转错误次数';
    if (value && value.textContent !== countText(s.total)) value.textContent = countText(s.total);
    const note = s.rallyCount ? `${s.rallyCount} 个回合发生` : '没有发生';
    if (sub && sub.textContent !== note) sub.textContent = note;
  }

  function patchEventPanel(s) {
    const cards = Array.from(document.querySelectorAll('#eventCountPanel .opt-mini-card'));
    const card = cards.find(item => item.querySelector('span')?.textContent.trim() === '轮转错误');
    if (!card) return;
    const value = card.querySelector('b');
    const sub = card.querySelector('small');
    if (value && value.textContent !== countText(s.total)) value.textContent = countText(s.total);
    const note = `${rallyText(s.rallyCount)}${s.lossRallies ? ` · 对方得分 ${s.lossRallies} 个回合` : ''}`;
    if (sub && sub.textContent !== note) sub.textContent = note;
  }

  function patchDefenseDetail(s) {
    const detail = document.querySelector('#optDefenseTargets .opt-detail-line');
    if (!detail) return;
    const text = detail.textContent || '';
    const replaced = text.replace(/轮转错误\s*\d+\s*次[^。]*。?/, `轮转错误 ${s.total} 次，发生在 ${s.rallyCount} 个回合，其中对方得分 ${s.lossRallies} 个回合。`);
    if (replaced !== text) detail.textContent = replaced;
  }

  function patchRecommendations(s) {
    const box = document.getElementById('recommendations');
    if (!box) return;
    Array.from(box.querySelectorAll('.recommendation')).forEach(item => {
      if (/轮转错误/.test(item.textContent || '')) item.remove();
    });
    if (s.total >= 3) {
      const item = document.createElement('div');
      item.className = 'recommendation';
      item.dataset.rotationCountRecommendation = '1';
      item.textContent = `轮转错误共 ${s.total} 次，发生在 ${s.rallyCount} 个回合。建议专项练习杀后跟进、挡网后换位和攻防转换时的固定轮转。`;
      box.appendChild(item);
    }
  }

  function patchGameCompare(state) {
    const table = document.getElementById('gameCompare');
    const head = table?.tHead?.rows?.[0];
    const body = table?.tBodies?.[0];
    if (!head || !body) return;
    const headers = Array.from(head.cells);
    const index = headers.findIndex(th => ['轮转错误', '轮转错误次数'].includes(th.textContent.trim()));
    if (index < 0) return;
    if (headers[index].textContent !== '轮转错误次数') headers[index].textContent = '轮转错误次数';

    Array.from(body.rows).forEach((row, gameIndex) => {
      const s = summarize(state.games[gameIndex]?.rallies || []);
      if (row.cells[index] && row.cells[index].textContent !== countText(s.total)) row.cells[index].textContent = countText(s.total);
    });
  }

  let liveQueued = false;
  function scheduleLive() {
    if (liveQueued) return;
    liveQueued = true;
    requestAnimationFrame(() => {
      liveQueued = false;
      patchLive();
    });
  }

  let resultsQueued = false;
  function scheduleResults() {
    if (resultsQueued) return;
    resultsQueued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resultsQueued = false;
      const resultsView = document.getElementById('resultsView');
      if (!resultsView?.classList.contains('active')) return;
      const state = loadState();
      const allRows = state.games.flatMap(game => Array.isArray(game.rallies) ? game.rallies : []);
      const s = summarize(allRows);
      patchEventPanel(s);
      patchDefenseDetail(s);
      patchRecommendations(s);
      patchGameCompare(state);
    }));
  }

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !tbody.contains(target)) return;

    if (target.classList.contains('rotation-count-control')) {
      queueMicrotask(() => syncLegacy(target.closest('td')));
    } else if (target.classList.contains('rotation') && target.dataset.rotationLegacy === '1') {
      queueMicrotask(() => syncCounterFromLegacy(target.closest('td')));
    }

    scheduleLive();
    scheduleResults();
  }, true);

  const rowObserver = new MutationObserver(() => {
    queueMicrotask(transformAll);
    scheduleLive();
  });
  rowObserver.observe(tbody, { childList: true });

  if (liveStats) {
    const liveObserver = new MutationObserver(scheduleLive);
    liveObserver.observe(liveStats, { childList: true, subtree: true, characterData: true });
  }

  if (resultsGrid) {
    const resultsObserver = new MutationObserver(scheduleResults);
    resultsObserver.observe(resultsGrid, { childList: true, subtree: true });
  }

  document.addEventListener('badminton:open-stats', scheduleLive);
  viewResultsBtn?.addEventListener('click', scheduleResults);
  document.addEventListener('click', event => {
    if (event.target.closest?.('.game-tab[data-game], #addGameInline, #addRallyBtn, #clearGameBtn, .rally-number')) {
      scheduleLive();
      scheduleResults();
    }
  }, true);

  transformAll();
  scheduleLive();
  scheduleResults();
})();

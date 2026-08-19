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

  function storedCount(rally, key, legacyValue) {
    if (rally && rally[key] !== undefined && rally[key] !== null && rally[key] !== '' && Number.isFinite(Number(rally[key]))) {
      return clamp(rally[key]);
    }
    return rally?.forcedLift === legacyValue ? 1 : 0;
  }

  function makeOptions(select) {
    const fragment = document.createDocumentFragment();
    for (let value = 0; value <= MAX_COUNT; value += 1) {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(value);
      fragment.appendChild(option);
    }
    select.replaceChildren(fragment);
  }

  function makeCountSelect(legacy, key, label, value) {
    const select = document.createElement('select');
    select.className = `${key} event-number-select forced-lift-count-control`;
    select.dataset.i = legacy.dataset.i || '0';
    select.dataset.numberPickerLabel = label;
    makeOptions(select);
    select.value = String(clamp(value));
    select.onchange = legacy.onchange;
    return select;
  }

  function syncLegacy(cell) {
    const legacy = cell?.querySelector('select.forcedLift[data-forced-lift-legacy="1"]');
    const male = cell?.querySelector('select.forcedLiftMaleCount');
    const female = cell?.querySelector('select.forcedLiftFemaleCount');
    if (!legacy || !male || !female) return;

    const next = clamp(male.value) > 0 ? '男' : clamp(female.value) > 0 ? '女' : '无';
    if (legacy.value === next) return;
    legacy.value = next;
    legacy.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function transformForcedLift(legacy) {
    if (!legacy || legacy.dataset.forcedLiftLegacy === '1') return;
    const cell = legacy.closest('td');
    if (!cell) return;

    const index = Number(legacy.dataset.i);
    const rally = Number.isInteger(index) ? currentRally(index) : null;
    const maleStored = rally && Object.prototype.hasOwnProperty.call(rally, 'forcedLiftMaleCount');
    const femaleStored = rally && Object.prototype.hasOwnProperty.call(rally, 'forcedLiftFemaleCount');
    const maleValue = storedCount(rally, 'forcedLiftMaleCount', '男');
    const femaleValue = storedCount(rally, 'forcedLiftFemaleCount', '女');

    const oldButton = legacy.nextElementSibling;
    if (oldButton?.classList.contains('cycle-choice')) oldButton.remove();
    legacy.dataset.forcedLiftLegacy = '1';
    legacy.dataset.cycleReady = '1';
    legacy.classList.add('native-cycle-select');
    legacy.tabIndex = -1;
    legacy.setAttribute('aria-hidden', 'true');

    const male = makeCountSelect(legacy, 'forcedLiftMaleCount', '男生造成被动挑球次数', maleValue);
    const female = makeCountSelect(legacy, 'forcedLiftFemaleCount', '女生造成被动挑球次数', femaleValue);
    cell.classList.add('forced-lift-count-cell');
    cell.insertBefore(male, legacy);
    cell.insertBefore(female, legacy);

    if (!maleStored) male.dispatchEvent(new Event('change', { bubbles: true }));
    if (!femaleStored) female.dispatchEvent(new Event('change', { bubbles: true }));
    queueMicrotask(() => syncLegacy(cell));
  }

  function transformAll() {
    tbody.querySelectorAll('select.forcedLift:not([data-forced-lift-legacy="1"])').forEach(transformForcedLift);
  }

  function forcedSummary(rows) {
    let maleTotal = 0;
    let femaleTotal = 0;
    let maleRallies = 0;
    let femaleRallies = 0;

    rows.forEach(rally => {
      const male = storedCount(rally, 'forcedLiftMaleCount', '男');
      const female = storedCount(rally, 'forcedLiftFemaleCount', '女');
      maleTotal += male;
      femaleTotal += female;
      if (male > 0) maleRallies += 1;
      if (female > 0) femaleRallies += 1;
    });

    return { maleTotal, femaleTotal, maleRallies, femaleRallies };
  }

  function installStyle() {
    if (document.getElementById('forcedLiftCountStyle')) return;
    const style = document.createElement('style');
    style.id = 'forcedLiftCountStyle';
    style.textContent = `
      #rallyBody td.forced-lift-count-cell.merged-stat-cell{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:8px!important;
      }
      #rallyBody td.forced-lift-count-cell.merged-stat-cell .cycle-choice{
        width:100%!important;
        min-height:44px!important;
        padding:10px 12px!important;
      }
      @media (min-width:700px){
        #rallyBody td.forced-lift-count-cell.merged-stat-cell{
          grid-column:1 / -1!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function patchLive() {
    if (!liveStats) return;
    const state = loadState();
    const rows = state.games[state.currentGame]?.rallies || state.games[0]?.rallies || [];
    const s = forcedSummary(rows);
    const line = Array.from(liveStats.querySelectorAll('.mini-list')).find(el => /被动挑球来源|被动挑球次数/.test(el.textContent || ''));
    if (!line) return;
    const text = `被动挑球次数　男：${s.maleTotal} 次　女：${s.femaleTotal} 次`;
    if (line.textContent !== text) line.textContent = text;
  }

  function ensureResultCards(s) {
    const grid = document.querySelector('#eventCountPanel .opt-card-grid');
    if (!grid) return;

    const ensure = (key, label, total, rallies) => {
      let card = grid.querySelector(`[data-forced-lift-card="${key}"]`);
      if (!card) {
        card = document.createElement('div');
        card.className = 'opt-mini-card forced-lift-stat-card';
        card.dataset.forcedLiftCard = key;
        grid.appendChild(card);
      }
      const html = `<span>${label}</span><b>${countText(total)}</b><small>${rallyText(rallies)}</small>`;
      if (card.innerHTML !== html) card.innerHTML = html;
    };

    ensure('male', '男生造成被动挑球', s.maleTotal, s.maleRallies);
    ensure('female', '女生造成被动挑球', s.femaleTotal, s.femaleRallies);
  }

  function patchFunnel(s) {
    const row = document.querySelector('#optAttackFunnel .opt-share-row');
    if (!row) return;
    const html = `<span>被动挑球次数</span><b>男 ${s.maleTotal} 次</b><b>女 ${s.femaleTotal} 次</b>`;
    if (row.innerHTML !== html) row.innerHTML = html;
  }

  function patchGameCompare(state) {
    const table = document.getElementById('gameCompare');
    const head = table?.tHead?.rows?.[0];
    const bodyRows = table?.tBodies?.[0]?.rows;
    if (!table || !head || !bodyRows) return;

    const ensureHeader = (key, text) => {
      let th = head.querySelector(`th[data-forced-lift-col="${key}"]`);
      if (!th) {
        th = document.createElement('th');
        th.dataset.forcedLiftCol = key;
        head.appendChild(th);
      }
      if (th.textContent !== text) th.textContent = text;
    };
    ensureHeader('male', '男造被动挑球');
    ensureHeader('female', '女造被动挑球');

    Array.from(bodyRows).forEach((tr, index) => {
      const s = forcedSummary(state.games[index]?.rallies || []);
      const ensureCell = (key, value) => {
        let td = tr.querySelector(`td[data-forced-lift-col="${key}"]`);
        if (!td) {
          td = document.createElement('td');
          td.dataset.forcedLiftCol = key;
          tr.appendChild(td);
        }
        if (td.textContent !== value) td.textContent = value;
      };
      ensureCell('male', countText(s.maleTotal));
      ensureCell('female', countText(s.femaleTotal));
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
      const rows = state.games.flatMap(game => Array.isArray(game.rallies) ? game.rallies : []);
      const s = forcedSummary(rows);
      ensureResultCards(s);
      patchFunnel(s);
      patchGameCompare(state);
    }));
  }

  document.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.classList.contains('forced-lift-count-control') && tbody.contains(target)) {
      queueMicrotask(() => syncLegacy(target.closest('td')));
    }
    if (tbody.contains(target)) {
      scheduleLive();
      scheduleResults();
    }
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

  installStyle();
  transformAll();
  scheduleLive();
  scheduleResults();
})();

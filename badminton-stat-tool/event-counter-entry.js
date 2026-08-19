(() => {
  const STORAGE_KEY = 'badminton_match_stats_v2';
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const MAX_COUNT = 20;
  const CONFIGS = [
    { legacyClass: 'femaleNet', key: 'femaleNetCount', label: '女生封网成功次数', fallback: r => r?.femaleNet === '是' ? 1 : 0 },
    { legacyClass: 'femaleDefense', key: 'femaleDefenseCount', label: '女生防守成功次数', fallback: r => r?.femaleDefense === '是' ? 1 : 0 },
    { legacyClass: 'femaleBreak', key: 'femaleTargetCount', label: '女生受攻次数', fallback: r => r?.attacked === '女' || r?.femaleBreak === '是' ? 1 : 0 },
    { legacyClass: 'defenseToAttack', key: 'defenseToAttackCount', label: '防守转攻成功次数', fallback: r => r?.defenseToAttack === '是' ? 1 : 0 }
  ];

  const clamp = value => Math.max(0, Math.min(MAX_COUNT, Math.round(Number(value) || 0)));

  function loadState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return state && Array.isArray(state.games) ? state : null;
    } catch {
      return null;
    }
  }

  function currentRally(index) {
    const state = loadState();
    if (!state) return null;
    const gameIndex = Math.max(0, Number(state.currentGame) || 0);
    return state.games[gameIndex]?.rallies?.[index] || null;
  }

  function replaceOptions(select) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i <= MAX_COUNT; i += 1) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = String(i);
      fragment.appendChild(option);
    }
    select.replaceChildren(fragment);
  }

  function setCount(select, next) {
    if (!select) return;
    const value = clamp(next);
    if (String(select.value) === String(value)) return;
    select.value = String(value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function enforceDefenseRelation(row) {
    const defense = row?.querySelector('select.femaleDefenseCount');
    const target = row?.querySelector('select.femaleTargetCount');
    if (!defense || !target) return;
    const defenseCount = clamp(defense.value);
    const targetCount = clamp(target.value);
    if (defenseCount > targetCount) setCount(target, defenseCount);
  }

  function resetOldButtonEnhancement(select) {
    const oldButton = select.nextElementSibling;
    if (oldButton?.classList.contains('cycle-choice')) oldButton.remove();
    delete select.dataset.cycleReady;
    delete select.dataset.numberChoiceReady;
    select.classList.remove('native-cycle-select');
    select.removeAttribute('tabindex');
    select.removeAttribute('aria-hidden');
  }

  function transformSelect(select, config) {
    if (!select || select.dataset.eventCounterReady === '1') return;
    const index = Number(select.dataset.i);
    const rally = Number.isInteger(index) ? currentRally(index) : null;
    const hasStored = rally && Object.prototype.hasOwnProperty.call(rally, config.key);
    const initial = hasStored ? clamp(rally[config.key]) : clamp(config.fallback(rally));

    resetOldButtonEnhancement(select);

    const extras = Array.from(select.classList).filter(cls =>
      cls !== config.legacyClass &&
      cls !== config.key &&
      cls !== 'event-number-select' &&
      cls !== 'native-cycle-select'
    );
    select.className = [config.key, config.legacyClass, 'event-number-select', ...extras].join(' ');
    select.dataset.eventCounterReady = '1';
    select.dataset.numberPickerLabel = config.label;
    replaceOptions(select);
    select.value = String(initial);

    const cell = select.closest('td');
    if (cell) cell.dataset.label = config.label;

    if (!hasStored) select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function transformAll() {
    CONFIGS.forEach(config => {
      tbody.querySelectorAll(`select.${config.legacyClass}`).forEach(select => transformSelect(select, config));
    });
    tbody.querySelectorAll('tr').forEach(row => enforceDefenseRelation(row));
  }

  document.addEventListener('change', event => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || !tbody.contains(select) || select.dataset.eventCounterReady !== '1') return;
    if (select.classList.contains('femaleDefenseCount') || select.classList.contains('femaleTargetCount')) {
      queueMicrotask(() => enforceDefenseRelation(select.closest('tr')));
    }
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(transformAll));
  observer.observe(tbody, { childList: true });

  transformAll();
})();

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

  function installStyle() {
    if (document.getElementById('eventCounterEntryStyle')) return;
    const style = document.createElement('style');
    style.id = 'eventCounterEntryStyle';
    style.textContent = `
      #optimizedLiveCard .opt-live-grid>div:nth-child(2){display:none!important}
      #rallyBody .event-counter-native-button{display:none!important}
      #rallyBody .event-counter-control{display:grid;grid-template-columns:38px minmax(44px,1fr) 38px;align-items:center;gap:6px;width:100%}
      #rallyBody .event-counter-control button{min-height:38px;border:1px solid #cbd8e8;border-radius:8px;background:#f7faff;color:#155fc5;font-size:19px;font-weight:850;line-height:1}
      #rallyBody .event-counter-control .event-counter-value{min-height:38px;display:grid;place-items:center;border:1px solid #d8e1ec;border-radius:8px;background:#fff;color:#173458;font-size:17px;font-weight:900}
      body.dark #rallyBody .event-counter-control button,body.dark #rallyBody .event-counter-control .event-counter-value{background:#132338;color:#e7eef8;border-color:#31445c}
    `;
    document.head.appendChild(style);
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

  function syncVisible(select) {
    const control = select.closest('td')?.querySelector('.event-counter-control');
    if (!control) return;
    const value = clamp(select.value);
    const display = control.querySelector('.event-counter-value');
    if (display) display.textContent = String(value);
    control.querySelector('[data-step="-1"]')?.toggleAttribute('disabled', value <= 0);
    control.querySelector('[data-step="1"]')?.toggleAttribute('disabled', value >= MAX_COUNT);
  }

  function setCount(select, next) {
    if (!select) return;
    const value = clamp(next);
    if (String(select.value) === String(value)) {
      syncVisible(select);
      return;
    }
    select.value = String(value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    syncVisible(select);
  }

  function enforceDefenseRelation(row, changedSelect) {
    const defense = row?.querySelector('select.femaleDefenseCount');
    const target = row?.querySelector('select.femaleTargetCount');
    if (!defense || !target) return;
    const defenseCount = clamp(defense.value);
    const targetCount = clamp(target.value);
    if (defenseCount > targetCount) setCount(target, defenseCount);
    else if (changedSelect === target && targetCount < defenseCount) setCount(target, defenseCount);
  }

  function buildControl(select) {
    const cell = select.closest('td');
    if (!cell || cell.querySelector('.event-counter-control')) return;
    const oldButton = select.nextElementSibling;
    if (oldButton?.classList.contains('cycle-choice')) oldButton.classList.add('event-counter-native-button');

    const control = document.createElement('div');
    control.className = 'event-counter-control';
    control.innerHTML = '<button type="button" data-step="-1" aria-label="减少1次">−</button><span class="event-counter-value">0</span><button type="button" data-step="1" aria-label="增加1次">＋</button>';
    cell.appendChild(control);
    control.addEventListener('click', event => {
      const button = event.target.closest('button[data-step]');
      if (!button) return;
      setCount(select, clamp(select.value) + Number(button.dataset.step));
    });
  }

  function transformSelect(select, config) {
    if (!select || select.dataset.eventCounterReady === '1') return;
    const index = Number(select.dataset.i);
    const rally = Number.isInteger(index) ? currentRally(index) : null;
    const hasStored = rally && Object.prototype.hasOwnProperty.call(rally, config.key);
    const initial = hasStored ? clamp(rally[config.key]) : clamp(config.fallback(rally));

    const extras = Array.from(select.classList).filter(cls => cls !== config.legacyClass && cls !== config.key);
    select.className = [config.key, config.legacyClass, ...extras].join(' ');
    select.dataset.eventCounterReady = '1';
    replaceOptions(select);
    select.value = String(initial);

    const cell = select.closest('td');
    if (cell) cell.dataset.label = config.label;
    buildControl(select);
    syncVisible(select);

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
    syncVisible(select);
    if (select.classList.contains('femaleDefenseCount') || select.classList.contains('femaleTargetCount')) {
      queueMicrotask(() => enforceDefenseRelation(select.closest('tr'), select));
    }
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(transformAll));
  observer.observe(tbody, { childList: true });

  installStyle();
  transformAll();
})();

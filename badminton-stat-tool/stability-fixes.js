(() => {
  const MATCH_KEY = 'badminton_match_stats_v2';
  const LEGACY_BREAK_REASON = '女生被突破';
  const tbody = document.querySelector('#rallyBody');

  function parseStorage(key, fallback = null) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function removeImportExportUI() {
    document.querySelector('#importBtn')?.remove();
    document.querySelector('#exportBtn')?.remove();
    document.querySelector('#fileInput')?.remove();
    document.querySelectorAll('#helpModal li').forEach(item => {
      if (/导入|导出|JSON\s*备份/.test(item.textContent || '')) item.remove();
    });
  }

  function normalizedStoredCount(value, fallback) {
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) {
      return Math.max(0, Math.round(Number(value)));
    }
    return Math.max(0, Math.round(Number(fallback) || 0));
  }

  // Convert old yes/no event flags into numeric per-rally counters once.
  function migrateEventCounters() {
    const state = parseStorage(MATCH_KEY);
    if (!state || !Array.isArray(state.games)) return false;
    let changed = false;

    state.games.forEach(game => {
      (game?.rallies || []).forEach(rally => {
        if (!rally) return;
        const legacyBreak = rally.femaleBreak === '是' || rally.reason === LEGACY_BREAK_REASON;

        const desired = {
          femaleNetCount: normalizedStoredCount(rally.femaleNetCount, rally.femaleNet === '是' ? 1 : 0),
          femaleDefenseCount: normalizedStoredCount(rally.femaleDefenseCount, rally.femaleDefense === '是' ? 1 : 0),
          defenseToAttackCount: normalizedStoredCount(rally.defenseToAttackCount, rally.defenseToAttack === '是' ? 1 : 0),
          femaleTargetCount: normalizedStoredCount(rally.femaleTargetCount, legacyBreak || rally.attacked === '女' ? 1 : 0)
        };

        if (desired.femaleTargetCount < desired.femaleDefenseCount) desired.femaleTargetCount = desired.femaleDefenseCount;

        Object.entries(desired).forEach(([key, value]) => {
          if (Number(rally[key]) !== value || rally[key] === undefined) {
            rally[key] = value;
            changed = true;
          }
        });

        if (legacyBreak && (!rally.attacked || rally.attacked === '无')) {
          rally.attacked = '女';
          changed = true;
        }
        if (rally.reason === LEGACY_BREAK_REASON) {
          rally.reason = '';
          changed = true;
        }
        if (rally.femaleBreak !== '否') {
          rally.femaleBreak = '否';
          changed = true;
        }
      });
    });

    if (changed) {
      try { localStorage.setItem(MATCH_KEY, JSON.stringify(state)); } catch {}
    }
    return changed;
  }

  removeImportExportUI();

  if (migrateEventCounters()) {
    // Core state was loaded before this enhancement; reload once so it adopts the migrated numeric counters.
    location.reload();
    return;
  }

  function stripLegacyBreakChoices() {
    document.querySelectorAll('select.reason').forEach(select => {
      const selectedLegacy = select.value === LEGACY_BREAK_REASON;
      Array.from(select.options).forEach(option => {
        if (option.value === LEGACY_BREAK_REASON) option.remove();
      });
      const button = select.nextElementSibling;
      if (selectedLegacy) {
        select.value = '';
        if (button?.classList.contains('reason-choice')) {
          button.textContent = '—';
          button.setAttribute('aria-label', '当前：—，点击选择');
        }
      }
    });
    document.querySelectorAll('#lossReasons .reason-chip').forEach(chip => {
      if (chip.textContent.includes(LEGACY_BREAK_REASON)) chip.remove();
    });
  }

  function normalizePersonBlankButtons(root = document) {
    root.querySelectorAll?.('select.receiverPerson, select.ourServer').forEach(select => {
      if (select.value !== '') return;
      const button = select.nextElementSibling;
      if (!button?.classList.contains('cycle-choice')) return;
      if (button.textContent !== '—') button.textContent = '—';
      button.setAttribute('aria-label', '当前：—，点击切换');
    });
  }

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !tbody?.contains(target)) return;
    if (target.classList.contains('receiverPerson') || target.classList.contains('ourServer')) {
      queueMicrotask(() => normalizePersonBlankButtons(target.closest('tr') || document));
    }
  }, true);

  if (tbody) {
    const observer = new MutationObserver(() => {
      removeImportExportUI();
      stripLegacyBreakChoices();
      normalizePersonBlankButtons(tbody);
    });
    observer.observe(tbody, { childList: true, subtree: true });
  }

  stripLegacyBreakChoices();
  normalizePersonBlankButtons();
})();

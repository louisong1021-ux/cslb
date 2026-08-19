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

  // 导入/导出功能已取消：移除入口、文件选择器及帮助里的相关说明。
  function removeImportExportUI() {
    document.querySelector('#importBtn')?.remove();
    document.querySelector('#exportBtn')?.remove();
    document.querySelector('#fileInput')?.remove();
    document.querySelectorAll('#helpModal li').forEach(item => {
      if (/导入|导出|JSON\s*备份/.test(item.textContent || '')) item.remove();
    });
  }

  // Migrate old explicit “女生被突破” records into fields that can derive the same conclusion.
  function migrateLegacyBreakData() {
    const state = parseStorage(MATCH_KEY);
    if (!state || !Array.isArray(state.games)) return false;
    let changed = false;
    state.games.forEach(game => {
      (game?.rallies || []).forEach(rally => {
        const legacyBreak = rally?.femaleBreak === '是' || rally?.reason === LEGACY_BREAK_REASON;
        if (legacyBreak) {
          if (!rally.attacked || rally.attacked === '无') rally.attacked = '女';
          if (!rally.femaleDefense || rally.femaleDefense === '不适用') rally.femaleDefense = '否';
          changed = true;
        }
        if (rally?.reason === LEGACY_BREAK_REASON) {
          rally.reason = '';
          changed = true;
        }
        if (rally && rally.femaleBreak !== '否') {
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

  if (migrateLegacyBreakData()) {
    // Core state was loaded before this enhancement; reload once so it cannot overwrite migrated data.
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

  function setFemaleDefense(row, next) {
    const defense = row?.querySelector('select.femaleDefense');
    if (!defense || defense.value === next) return;
    defense.value = next;
    defense.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function restoreNeutralFemaleDefense(row) {
    const attacked = row?.querySelector('select.attacked');
    const defense = row?.querySelector('select.femaleDefense');
    if (!attacked || !defense || attacked.value !== '女' || defense.value !== '否') return;
    setFemaleDefense(row, '不适用');
  }

  // Selecting “被攻击对象=女” only records the target. It must not silently count as a failed defense.
  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !tbody?.contains(target)) return;

    if (target.classList.contains('attacked')) {
      const row = target.closest('tr');
      const defense = row?.querySelector('select.femaleDefense');
      if (target.value === '女') {
        const wasNeutral = defense?.value === '不适用';
        if (wasNeutral) setTimeout(() => restoreNeutralFemaleDefense(row), 0);
      } else {
        // When the target is no longer the female player, her defense result is not applicable.
        setTimeout(() => setFemaleDefense(row, '不适用'), 0);
      }
    }

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

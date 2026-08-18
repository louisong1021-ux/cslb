(() => {
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const WIN_REASONS = new Set(['男生杀球','女生封网','平抽挡得分','防守反击得分','对方主动失误','对方被迫失误','发接发抢攻','其他得分']);
  const LOSS_REASONS = new Set(['男生失误','女生失误','女生被突破','防守被杀穿','轮转错误','发接发被抢','主动进攻丢分','判断失误','其他丢分']);

  let scheduled = false;
  let lastChanged = null;
  let stabilizing = false;

  const rows = () => Array.from(tbody.querySelectorAll('tr'));
  const field = (row, cls) => row?.querySelector(`select.${cls}, input.${cls}`) || null;
  const value = (row, cls) => field(row, cls)?.value ?? '';

  function dispatchField(el, next) {
    if (!el || String(el.value) === String(next)) return false;
    el.value = next;
    const type = el.tagName === 'INPUT' ? 'input' : 'change';
    el.dispatchEvent(new Event(type, { bubbles: true }));
    if (el.tagName === 'INPUT') el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function setField(row, cls, next) {
    return dispatchField(field(row, cls), next);
  }

  function setDisabled(row, cls, disabled, textWhenDisabled = '—') {
    const select = field(row, cls);
    if (!select) return;
    const button = select.nextElementSibling;
    if (!button?.classList.contains('cycle-choice')) return;
    button.disabled = !!disabled;
    button.classList.toggle('linked-disabled', !!disabled);
    if (disabled) {
      button.dataset.linkedLabel = button.textContent;
      button.textContent = textWhenDisabled;
      button.setAttribute('aria-disabled', 'true');
    } else {
      button.removeAttribute('aria-disabled');
      const option = select.options?.[select.selectedIndex];
      button.textContent = option ? (option.value || '请选择') : (select.value || '请选择');
    }
  }

  function schedule(index = null, changed = null) {
    lastChanged = { index, changed };
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      stabilize(lastChanged?.index, lastChanged?.changed);
      lastChanged = null;
    });
  }

  function syncServerChain() {
    const rs = rows();
    for (let i = 1; i < rs.length; i++) {
      const expected = value(rs[i - 1], 'scorer');
      if (expected && value(rs[i], 'server') !== expected) {
        setField(rs[i], 'server', expected);
        return true;
      }
    }
    return false;
  }

  function syncService(row, changed) {
    const server = value(row, 'server');
    const serve = field(row, 'serveActive');
    const ret = field(row, 'returnActive');
    const first3 = field(row, 'first3');
    if (!serve || !ret || !first3) return false;

    if (server === '我方') {
      if (ret.value !== '不适用') return setField(row, 'returnActive', '不适用');
      if (serve.value === '不适用') return setField(row, 'serveActive', first3.value === '我方' ? '是' : '否');
    } else if (server === '对方') {
      if (serve.value !== '不适用') return setField(row, 'serveActive', '不适用');
      if (ret.value === '不适用') return setField(row, 'returnActive', first3.value === '我方' ? '是' : '否');
    }

    const activeCls = server === '我方' ? 'serveActive' : 'returnActive';
    const active = field(row, activeCls);
    if (changed === 'first3') {
      const desired = first3.value === '我方' ? '是' : '否';
      if (active && active.value !== desired) return setField(row, activeCls, desired);
    }
    if ((changed === 'serveActive' || changed === 'returnActive') && active?.value === '是' && first3.value !== '我方') {
      return setField(row, 'first3', '我方');
    }
    return false;
  }

  function syncFemaleDefense(row, changed) {
    const attacked = value(row, 'attacked');
    const broken = value(row, 'femaleBreak');
    const defense = value(row, 'femaleDefense');

    if (changed === 'femaleBreak' && broken === '是') {
      if (attacked !== '女') return setField(row, 'attacked', '女');
      if (defense !== '否') return setField(row, 'femaleDefense', '否');
    }
    if (changed === 'femaleDefense' && defense === '是') {
      if (attacked !== '女') return setField(row, 'attacked', '女');
      if (broken !== '否') return setField(row, 'femaleBreak', '否');
    }
    if (changed === 'attacked') {
      if (attacked !== '女') {
        if (broken !== '否') return setField(row, 'femaleBreak', '否');
        if (defense !== '不适用') return setField(row, 'femaleDefense', '不适用');
      } else if (defense === '不适用') {
        return setField(row, 'femaleDefense', '否');
      }
    }
    if (attacked !== '女' && defense !== '不适用') return setField(row, 'femaleDefense', '不适用');
    if (attacked !== '女' && broken === '是') return setField(row, 'femaleBreak', '否');
    if (broken === '是' && defense === '是') return setField(row, 'femaleDefense', '否');
    return false;
  }

  function syncReason(row, changed) {
    if (changed !== 'reason') return false;
    const reason = value(row, 'reason');
    if (!reason) return false;

    if (WIN_REASONS.has(reason) && value(row, 'scorer') !== '我方') return setField(row, 'scorer', '我方');
    if (LOSS_REASONS.has(reason) && value(row, 'scorer') !== '对方') return setField(row, 'scorer', '对方');

    if (reason === '男生杀球') {
      const n = Number(value(row, 'maleAttack')) || 0;
      if (n < 1) return setField(row, 'maleAttack', 1);
    }
    if (reason === '女生封网' && value(row, 'femaleNet') !== '是') return setField(row, 'femaleNet', '是');
    if (reason === '防守反击得分' && value(row, 'defenseToAttack') !== '是') return setField(row, 'defenseToAttack', '是');
    if (reason === '发接发抢攻') {
      if (value(row, 'first3') !== '我方') return setField(row, 'first3', '我方');
    }
    if (reason === '女生被突破') {
      if (value(row, 'femaleBreak') !== '是') return setField(row, 'femaleBreak', '是');
      if (value(row, 'attacked') !== '女') return setField(row, 'attacked', '女');
      if (value(row, 'femaleDefense') !== '否') return setField(row, 'femaleDefense', '否');
    }
    if (reason === '轮转错误' && value(row, 'rotation') !== '是') return setField(row, 'rotation', '是');
    if (reason === '发接发被抢') {
      if (value(row, 'first3') !== '对方') return setField(row, 'first3', '对方');
    }
    return false;
  }

  function refreshDisabledStates() {
    rows().forEach(row => {
      const server = value(row, 'server');
      setDisabled(row, 'serveActive', server !== '我方');
      setDisabled(row, 'returnActive', server !== '对方');
      setDisabled(row, 'femaleDefense', value(row, 'attacked') !== '女');
    });
  }

  function stabilize(index, changed) {
    if (stabilizing) return;
    stabilizing = true;
    try {
      if (syncServerChain()) return;
      const rs = rows();
      const row = Number.isInteger(index) ? rs[index] : null;
      if (row) {
        if (syncReason(row, changed)) return;
        if (syncService(row, changed)) return;
        if (syncFemaleDefense(row, changed)) return;
      }
      for (const r of rs) {
        if (syncService(r, null)) return;
        if (syncFemaleDefense(r, null)) return;
      }
      refreshDisabledStates();
    } finally {
      stabilizing = false;
    }
  }

  document.addEventListener('change', event => {
    const el = event.target;
    if (!(el instanceof HTMLSelectElement) || !tbody.contains(el)) return;
    const idx = Number(el.dataset.i);
    const key = Array.from(el.classList).find(c => !['native-cycle-select'].includes(c));
    schedule(Number.isInteger(idx) ? idx : null, key || null);
  }, true);

  document.addEventListener('input', event => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement) || !tbody.contains(el)) return;
    const idx = Number(el.dataset.i);
    const key = Array.from(el.classList)[0] || null;
    schedule(Number.isInteger(idx) ? idx : null, key);
  }, true);

  const observer = new MutationObserver(() => schedule(null, null));
  observer.observe(tbody, { childList: true, subtree: true });

  schedule(null, null);
})();

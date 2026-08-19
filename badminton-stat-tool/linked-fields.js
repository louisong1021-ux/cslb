(() => {
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const WIN_REASONS = new Set(['男生杀球','男生吊球/劈吊','女生封网','女生扑球','网前搓放得分','平抽挡得分','防守反击得分','发接发抢攻','对方主动失误','对方受压失误','其他得分']);
  const LOSS_REASONS = new Set(['男生主动进攻失误','男生网前失误','女生网前失误','女生防守失误','发球失误','接发失误','发接发被抢','平抽挡被压死','防守被杀穿','网前被扑死','轮转错误','判断/让球失误','其他丢分']);
  const LINKED_SELECTS = new Set(['scorer','server','first3','reason']);

  let scheduled = false;
  let lastChanged = null;
  let stabilizing = false;

  const rows = () => Array.from(tbody.querySelectorAll('tr'));
  const field = (row, cls) => row?.querySelector(`select.${cls}, input.${cls}`) || null;
  const value = (row, cls) => field(row, cls)?.value ?? '';

  function dispatchField(el, next) {
    if (!el || String(el.value) === String(next)) return false;
    el.value = String(next);
    const type = el.tagName === 'INPUT' ? 'input' : 'change';
    el.dispatchEvent(new Event(type, { bubbles: true }));
    if (el.tagName === 'INPUT') el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function setField(row, cls, next) {
    return dispatchField(field(row, cls), next);
  }

  function schedule(index = null, changed = null) {
    if (!scheduled || changed) lastChanged = { index, changed };
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const pending = lastChanged;
      lastChanged = null;
      stabilize(pending?.index, pending?.changed);
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

  function ensureCounterAtLeastOne(row, counterClass) {
    const counter = field(row, counterClass);
    if (!counter) return false;
    const numeric = Math.max(0, Number(counter.value) || 0);
    return numeric < 1 ? dispatchField(counter, 1) : false;
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
    if (reason === '女生封网' && ensureCounterAtLeastOne(row, 'femaleNetCount')) return true;
    if (reason === '防守反击得分' && ensureCounterAtLeastOne(row, 'defenseToAttackCount')) return true;
    if (reason === '女生防守失误' && ensureCounterAtLeastOne(row, 'femaleTargetCount')) return true;
    if (reason === '轮转错误' && ensureCounterAtLeastOne(row, 'rotationCount')) return true;
    if (reason === '发接发抢攻' && value(row, 'first3') !== '我方') return setField(row, 'first3', '我方');
    if (reason === '发接发被抢' && value(row, 'first3') !== '对方') return setField(row, 'first3', '对方');
    return false;
  }

  function stabilize(index, changed) {
    if (stabilizing) return;
    stabilizing = true;
    try {
      if (syncServerChain()) return;
      const rs = rows();
      const row = Number.isInteger(index) ? rs[index] : null;
      if (row && syncReason(row, changed)) return;
    } finally {
      stabilizing = false;
    }
  }

  document.addEventListener('change', event => {
    const el = event.target;
    if (!(el instanceof HTMLSelectElement) || !tbody.contains(el)) return;
    const key = Array.from(el.classList).find(c => !['native-cycle-select','event-number-select'].includes(c));
    if (!LINKED_SELECTS.has(key)) return;
    const idx = Number(el.dataset.i);
    schedule(Number.isInteger(idx) ? idx : null, key || null);
  }, true);

  const observer = new MutationObserver(() => schedule(null, null));
  observer.observe(tbody, { childList: true });

  schedule(null, null);
})();

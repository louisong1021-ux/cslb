(() => {
  const COUNT_METRIC_LABELS = new Set([
    '发接发抢攻丢分',
    '女生被突破次数',
    '轮转错误次数',
    '主动进攻丢分',
    '男生直接失误',
    '女生直接失误'
  ]);

  const countText = n => Number(n) === 0 ? '没有' : `${Number(n)} 次`;

  function normalizeMetricCounts() {
    document.querySelectorAll('.metric').forEach(card => {
      const label = card.querySelector('.metric-label')?.textContent.trim();
      if (!COUNT_METRIC_LABELS.has(label)) return;
      const value = card.querySelector('.metric-value');
      const sub = card.querySelector('.metric-sub');
      if (!value) return;
      const raw = value.textContent.trim();
      const match = raw.match(/^\d+$/);
      if (match) {
        const next = countText(match[0]);
        if (value.textContent !== next) value.textContent = next;
        if (sub && sub.textContent.trim() === '次') sub.textContent = '';
      }
    });
  }

  function normalizeKpis() {
    document.querySelectorAll('.kpi').forEach(card => {
      const label = card.querySelector('.label')?.textContent.trim();
      if (!['女生被突破', '轮转错误'].includes(label)) return;
      const value = card.querySelector('.value');
      if (!value) return;
      const m = value.textContent.trim().match(/^(\d+)\s*次$/);
      if (m) {
        const next = countText(m[1]);
        if (value.textContent !== next) value.textContent = next;
      }
    });
  }

  function normalizeMiniLists() {
    document.querySelectorAll('.mini-list').forEach(el => {
      if (!/(被动挑球来源|被攻击对象)/.test(el.textContent)) return;
      el.childNodes.forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const next = node.textContent.replace(/(男|女|中间)：(\d+)(?!\s*次)/g, (_, who, n) => `${who}：${countText(n)}`);
        if (next !== node.textContent) node.textContent = next;
      });
    });
  }

  function normalizeRanks() {
    document.querySelectorAll('.rank-item b').forEach(el => {
      const raw = el.textContent.trim();
      if (/^\d+$/.test(raw)) el.textContent = countText(raw);
    });
  }

  function normalizeGameCompare() {
    document.querySelectorAll('#gameCompare tbody tr').forEach(row => {
      [5, 8].forEach(index => {
        const cell = row.querySelector(`td:nth-child(${index})`);
        if (!cell) return;
        const raw = cell.textContent.trim();
        if (/^\d+$/.test(raw)) cell.textContent = countText(raw);
      });
    });
  }

  function applyCountFormatting() {
    normalizeMetricCounts();
    normalizeKpis();
    normalizeMiniLists();
    normalizeRanks();
    normalizeGameCompare();
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyCountFormatting();
    });
  });

  const start = () => {
    applyCountFormatting();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

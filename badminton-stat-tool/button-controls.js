(() => {
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const displayText = value => value === '' ? '请选择' : value;

  function toneFor(value, select) {
    if (select.classList.contains('reason')) return value ? 'warning' : 'neutral';
    if (['我方','是','男'].includes(value)) return value === '是' ? 'success' : 'primary';
    if (['对方','否','女'].includes(value)) return value === '否' ? 'danger' : 'danger';
    if (['不适用','无','均势','中间',''].includes(value)) return 'neutral';
    return 'primary';
  }

  function syncButton(select, button) {
    if (!select || !button) return;
    const option = select.options[select.selectedIndex];
    const value = option ? option.value : '';
    button.textContent = displayText(value);
    button.dataset.tone = toneFor(value, select);
    button.setAttribute('aria-label', `当前：${displayText(value)}，点击切换`);
  }

  function enhanceSelect(select) {
    if (select.dataset.cycleReady === '1') return;
    select.dataset.cycleReady = '1';
    select.classList.add('native-cycle-select');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cycle-choice';
    if (select.classList.contains('reason')) button.classList.add('reason-cycle');
    button.title = '点击切换选项';
    select.insertAdjacentElement('afterend', button);
    syncButton(select, button);

    button.addEventListener('click', () => {
      const options = Array.from(select.options);
      if (!options.length) return;
      const current = Math.max(0, select.selectedIndex);
      select.selectedIndex = (current + 1) % options.length;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      if (select.isConnected && button.isConnected) syncButton(select, button);
    });
  }

  function enhanceAll() {
    tbody.querySelectorAll('select').forEach(enhanceSelect);
  }

  const observer = new MutationObserver(() => enhanceAll());
  observer.observe(tbody, { childList: true, subtree: true });

  document.addEventListener('change', event => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || !tbody.contains(select)) return;
    const button = select.nextElementSibling;
    if (button?.classList.contains('cycle-choice')) syncButton(select, button);
  }, true);

  enhanceAll();
})();

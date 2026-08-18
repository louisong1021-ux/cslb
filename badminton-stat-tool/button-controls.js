(() => {
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const displayText = (value, select) => {
    if (value === '' && select?.classList.contains('ourServer')) return '—';
    return value === '' ? '请选择' : value;
  };

  function toneFor(value, select) {
    if (select.classList.contains('reason')) return value ? 'warning' : 'neutral';
    if (['我方','是','男'].includes(value)) return value === '是' ? 'success' : 'primary';
    if (['对方','否','女'].includes(value)) return 'danger';
    if (['不适用','无','均势','中间',''].includes(value)) return 'neutral';
    return 'primary';
  }

  function syncButton(select, button) {
    if (!select || !button) return;
    const option = select.options[select.selectedIndex];
    const value = option ? option.value : '';
    button.textContent = displayText(value, select);
    button.dataset.tone = toneFor(value, select);
    button.setAttribute('aria-label', `当前：${displayText(value, select)}，点击切换`);
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

  let numberPicker = null;
  let numberPickerBackdrop = null;
  let activeNumberInput = null;

  function ensureNumberPicker() {
    if (numberPicker) return;

    numberPickerBackdrop = document.createElement('div');
    numberPickerBackdrop.className = 'number-picker-backdrop';
    numberPickerBackdrop.addEventListener('click', closeNumberPicker);
    document.body.appendChild(numberPickerBackdrop);

    numberPicker = document.createElement('div');
    numberPicker.className = 'number-picker-panel';
    numberPicker.innerHTML = `
      <div class="number-picker-head">
        <strong>选择进攻拍数</strong>
        <button type="button" class="number-picker-close" aria-label="关闭">×</button>
      </div>
      <div class="number-picker-grid"></div>`;
    document.body.appendChild(numberPicker);

    const grid = numberPicker.querySelector('.number-picker-grid');
    for (let value = 0; value <= 20; value += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'number-picker-option';
      btn.dataset.value = String(value);
      btn.textContent = String(value);
      grid.appendChild(btn);
    }

    numberPicker.querySelector('.number-picker-close').addEventListener('click', closeNumberPicker);
    grid.addEventListener('click', event => {
      const option = event.target.closest('.number-picker-option[data-value]');
      if (!option || !activeNumberInput) return;
      activeNumberInput.value = option.dataset.value;
      activeNumberInput.dispatchEvent(new Event('change', { bubbles: true }));
      const button = activeNumberInput.nextElementSibling;
      if (button?.classList.contains('number-choice')) syncNumberButton(activeNumberInput, button);
      closeNumberPicker();
    });
  }

  function openNumberPicker(input) {
    ensureNumberPicker();
    activeNumberInput = input;
    const current = String(input.value || '0');
    numberPicker.querySelectorAll('.number-picker-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === current);
    });
    document.body.classList.add('number-picker-visible');
  }

  function closeNumberPicker() {
    document.body.classList.remove('number-picker-visible');
    activeNumberInput = null;
  }

  function syncNumberButton(input, button) {
    const value = String(Math.max(0, Math.min(20, Number(input.value) || 0)));
    button.textContent = value;
    button.dataset.tone = value === '0' ? 'neutral' : 'primary';
    button.setAttribute('aria-label', `男生连续进攻 ${value} 拍，点击选择`);
  }

  function enhanceNumberInput(input) {
    if (input.dataset.numberChoiceReady === '1') return;
    input.dataset.numberChoiceReady = '1';
    input.classList.add('native-number-input');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cycle-choice number-choice';
    button.title = '点击选择拍数';
    input.insertAdjacentElement('afterend', button);
    syncNumberButton(input, button);
    button.addEventListener('click', () => openNumberPicker(input));
  }

  function enhanceAll() {
    tbody.querySelectorAll('select').forEach(enhanceSelect);
    tbody.querySelectorAll('input.maleAttack[type="number"]').forEach(enhanceNumberInput);
  }

  const observer = new MutationObserver(() => enhanceAll());
  observer.observe(tbody, { childList: true, subtree: true });

  document.addEventListener('change', event => {
    const target = event.target;
    if (!tbody.contains(target)) return;

    if (target instanceof HTMLSelectElement) {
      const button = target.nextElementSibling;
      if (button?.classList.contains('cycle-choice')) syncButton(target, button);
      return;
    }

    if (target instanceof HTMLInputElement && target.classList.contains('maleAttack')) {
      const button = target.nextElementSibling;
      if (button?.classList.contains('number-choice')) syncNumberButton(target, button);
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('number-picker-visible')) closeNumberPicker();
  });

  enhanceAll();
})();

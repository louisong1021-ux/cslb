(() => {
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const displayText = (value, select) => {
    if (select?.classList.contains('ourServer')) return `发球人：${value || '—'}`;
    if (select?.classList.contains('receiverPerson')) return `接发球人：${value || '—'}`;
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
    button.setAttribute('aria-label', `当前：${displayText(value, select)}，点击${select.classList.contains('reason') ? '选择' : '切换'}`);
  }

  let numberPicker = null;
  let numberPickerBackdrop = null;
  let activeNumberControl = null;
  let reasonPicker = null;
  let reasonPickerBackdrop = null;
  let activeReasonSelect = null;

  const numberLabel = control => control?.dataset.numberPickerLabel || (control?.classList.contains('maleAttack') ? '男生连续进攻拍数' : '次数');

  function closeNumberPicker() {
    document.body.classList.remove('number-picker-visible');
    activeNumberControl = null;
  }

  function closeReasonPicker() {
    document.body.classList.remove('reason-picker-visible');
    activeReasonSelect = null;
  }

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
      if (!option || !activeNumberControl) return;
      activeNumberControl.value = option.dataset.value;
      activeNumberControl.dispatchEvent(new Event('change', { bubbles: true }));
      const button = activeNumberControl.nextElementSibling;
      if (button?.classList.contains('number-choice')) syncNumberButton(activeNumberControl, button);
      closeNumberPicker();
    });
  }

  function openNumberPicker(control) {
    closeReasonPicker();
    ensureNumberPicker();
    activeNumberControl = control;
    const heading = numberPicker.querySelector('.number-picker-head strong');
    if (heading) heading.textContent = `选择${numberLabel(control)}`;
    const current = String(control.value || '0');
    numberPicker.querySelectorAll('.number-picker-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === current);
    });
    document.body.classList.add('number-picker-visible');
  }

  function syncNumberButton(control, button) {
    const value = String(Math.max(0, Math.min(20, Number(control.value) || 0)));
    const label = numberLabel(control);
    button.textContent = value;
    button.dataset.tone = value === '0' ? 'neutral' : 'primary';
    button.setAttribute('aria-label', `${label} ${value}，点击选择`);
  }

  function ensureReasonPicker() {
    if (reasonPicker) return;

    reasonPickerBackdrop = document.createElement('div');
    reasonPickerBackdrop.className = 'reason-picker-backdrop';
    reasonPickerBackdrop.addEventListener('click', closeReasonPicker);
    document.body.appendChild(reasonPickerBackdrop);

    reasonPicker = document.createElement('div');
    reasonPicker.className = 'reason-picker-panel';
    reasonPicker.innerHTML = `
      <div class="reason-picker-head">
        <strong>选择本分结果</strong>
        <button type="button" class="reason-picker-close" aria-label="关闭">×</button>
      </div>
      <div class="reason-picker-grid"></div>`;
    document.body.appendChild(reasonPicker);

    reasonPicker.querySelector('.reason-picker-close').addEventListener('click', closeReasonPicker);
    reasonPicker.querySelector('.reason-picker-grid').addEventListener('click', event => {
      const option = event.target.closest('.reason-picker-option[data-value]');
      if (!option || !activeReasonSelect) return;
      activeReasonSelect.value = option.dataset.value;
      activeReasonSelect.dispatchEvent(new Event('change', { bubbles: true }));
      const button = activeReasonSelect.nextElementSibling;
      if (button?.classList.contains('reason-choice')) syncButton(activeReasonSelect, button);
      closeReasonPicker();
    });
  }

  function openReasonPicker(select) {
    closeNumberPicker();
    ensureReasonPicker();
    activeReasonSelect = select;
    const grid = reasonPicker.querySelector('.reason-picker-grid');
    const current = select.value || '';
    const fragment = document.createDocumentFragment();

    Array.from(select.options).forEach(option => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reason-picker-option';
      btn.dataset.value = option.value;
      btn.textContent = option.value === '' ? '—' : option.textContent;
      if (option.value === current) btn.classList.add('active');
      fragment.appendChild(btn);
    });

    grid.replaceChildren(fragment);
    document.body.classList.add('reason-picker-visible');
  }

  function enhanceNumberSelect(select) {
    if (select.dataset.numberChoiceReady === '1') return;
    select.dataset.numberChoiceReady = '1';
    select.dataset.cycleReady = '1';
    select.classList.add('native-cycle-select');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cycle-choice number-choice';
    button.title = `点击选择${numberLabel(select)}`;
    select.insertAdjacentElement('afterend', button);
    syncNumberButton(select, button);
    button.addEventListener('click', () => openNumberPicker(select));
  }

  function enhanceSelect(select) {
    if (select.classList.contains('event-number-select')) {
      enhanceNumberSelect(select);
      return;
    }
    if (select.dataset.cycleReady === '1') return;
    select.dataset.cycleReady = '1';
    select.classList.add('native-cycle-select');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cycle-choice';
    const isReason = select.classList.contains('reason');
    if (isReason) button.classList.add('reason-cycle', 'reason-choice');
    button.title = isReason ? '点击选择本分结果' : '点击切换选项';
    select.insertAdjacentElement('afterend', button);
    syncButton(select, button);

    button.addEventListener('click', () => {
      if (isReason) {
        openReasonPicker(select);
        return;
      }
      const options = Array.from(select.options);
      if (!options.length) return;
      const current = Math.max(0, select.selectedIndex);
      select.selectedIndex = (current + 1) % options.length;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      if (select.isConnected && button.isConnected) syncButton(select, button);
    });
  }

  function enhanceNumberInput(input) {
    if (input.dataset.numberChoiceReady === '1') return;
    input.dataset.numberChoiceReady = '1';
    input.dataset.numberPickerLabel = input.dataset.numberPickerLabel || '男生连续进攻拍数';
    input.classList.add('native-number-input');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cycle-choice number-choice';
    button.title = '点击选择进攻拍数';
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
      if (target.classList.contains('event-number-select')) {
        if (button?.classList.contains('number-choice')) syncNumberButton(target, button);
      } else if (button?.classList.contains('cycle-choice')) {
        syncButton(target, button);
      }
      return;
    }

    if (target instanceof HTMLInputElement && target.classList.contains('maleAttack')) {
      const button = target.nextElementSibling;
      if (button?.classList.contains('number-choice')) syncNumberButton(target, button);
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (document.body.classList.contains('number-picker-visible')) closeNumberPicker();
    if (document.body.classList.contains('reason-picker-visible')) closeReasonPicker();
  });

  enhanceAll();
})();

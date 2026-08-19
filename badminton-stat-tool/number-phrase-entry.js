(() => {
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const FIELD_LABELS = [
    ['server','发球方'],
    ['ourServer','发球人'],
    ['receiverPerson','接发球人'],
    ['serveActive','发球后3拍主动'],
    ['returnActive','接发后3拍主动'],
    ['first3','前三拍主动权'],
    ['forcedLift','造成被动挑球'],
    ['maleAttack','男生连续进攻拍数'],
    ['femaleNetCount','女生封网成功次数'],
    ['femaleNet','女生封网成功次数'],
    ['attacked','被攻击对象'],
    ['femaleTargetCount','女生受攻次数'],
    ['femaleDefenseCount','女生防守成功次数'],
    ['femaleDefense','女生防守成功次数'],
    ['defenseToAttackCount','防守转攻成功次数'],
    ['defenseToAttack','防守转攻成功次数'],
    ['rotation','轮转错误'],
    ['scorer','得分方'],
    ['reason','本分结果']
  ];

  function installStyle() {
    if (document.getElementById('mergedStatButtonStyle')) return;
    const style = document.createElement('style');
    style.id = 'mergedStatButtonStyle';
    style.textContent = `
      #rallyBody td.merged-stat-cell{
        grid-template-columns:minmax(0,1fr)!important;
        gap:0!important;
      }
      #rallyBody td.merged-stat-cell::before{display:none!important}
      #rallyBody td.merged-stat-cell .cycle-choice.merged-stat-choice{
        width:100%!important;
        min-width:0!important;
        min-height:40px;
        padding:9px 10px;
        text-align:center;
        white-space:normal;
        line-height:1.25;
        font-weight:800;
      }
    `;
    document.head.appendChild(style);
  }

  function fallbackLabel(control) {
    for (const [cls, label] of FIELD_LABELS) {
      if (control.classList.contains(cls)) return label;
    }
    return '';
  }

  function labelFor(control) {
    return control.closest('td')?.dataset.label || control.dataset.numberPickerLabel || fallbackLabel(control);
  }

  function isNumberControl(control) {
    return control.classList.contains('maleAttack') || control.classList.contains('event-number-select');
  }

  function compactNumberLabel(label, control) {
    if (control.classList.contains('maleAttack')) return '男生连续进攻';
    return String(label || '次数').replace(/次数$/, '').replace(/拍数$/, '');
  }

  function buttonText(control) {
    const label = labelFor(control);
    const raw = String(control.value ?? '');

    if (isNumberControl(control)) {
      const value = String(Math.max(0, Math.min(20, Math.round(Number(raw) || 0))));
      const unit = control.classList.contains('maleAttack') ? '拍' : '次';
      return `${compactNumberLabel(label, control)}：${value}${unit}`;
    }

    const value = raw === '' ? '—' : raw;
    return label ? `${label}：${value}` : value;
  }

  function applyButton(button) {
    if (!button?.isConnected || !button.classList.contains('cycle-choice')) return;
    const control = button.previousElementSibling;
    if (!(control instanceof HTMLSelectElement || control instanceof HTMLInputElement)) return;

    const cell = button.closest('td');
    if (!cell) return;

    cell.querySelectorAll(':scope > .number-phrase-prefix, :scope > .number-phrase-suffix').forEach(el => el.remove());
    cell.classList.remove('number-phrase-cell');
    cell.classList.add('merged-stat-cell');
    button.classList.add('merged-stat-choice');

    const text = buttonText(control);
    if (button.textContent !== text) button.textContent = text;

    const label = labelFor(control) || '统计项目';
    button.setAttribute('aria-label', `${text}，点击${control.classList.contains('reason') || isNumberControl(control) ? '选择' : '切换'}`);
    button.title = `点击${control.classList.contains('reason') || isNumberControl(control) ? '选择' : '切换'}${label}`;
  }

  function enhanceAll() {
    tbody.querySelectorAll('button.cycle-choice').forEach(applyButton);
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhanceAll();
    });
  }

  document.addEventListener('change', event => {
    if (tbody.contains(event.target)) schedule();
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(tbody, { childList: true, subtree: true });

  installStyle();
  enhanceAll();
  requestAnimationFrame(enhanceAll);
})();

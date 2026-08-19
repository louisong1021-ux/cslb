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
      #rallyBody tr{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:8px!important;
        margin:0 0 10px!important;
        border:0!important;
        border-radius:0!important;
        overflow:visible!important;
        background:transparent!important;
        box-shadow:none!important;
      }
      #rallyBody td{
        min-height:0!important;
        padding:0!important;
        border:0!important;
        background:transparent!important;
      }
      #rallyBody td::before{display:none!important}
      #rallyBody td.merged-stat-cell{
        grid-template-columns:minmax(0,1fr)!important;
        gap:0!important;
      }
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
      #rallyBody td.note-inline-cell{
        grid-template-columns:minmax(0,1fr)!important;
        gap:0!important;
      }
      #rallyBody td.note-inline-cell input.note{
        width:100%!important;
        min-width:0!important;
        min-height:40px;
      }
      #rallyBody td[data-field="delete"]{display:none!important}

      .entry-title-actions{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:stretch;
        gap:8px;
        margin:4px 0 10px;
      }
      .entry-title-actions .mobile-stats-toggle{
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        margin:0!important;
      }
      .delete-current-rally{
        min-height:40px;
        padding:8px 14px;
        border:1px solid #efb6b6;
        border-radius:9px;
        background:#fff2f2;
        color:#bd2d2d;
        font-weight:800;
        white-space:nowrap;
      }
      .delete-current-rally[hidden]{display:none!important}
      body.dark .delete-current-rally{
        border-color:#713a42;
        background:#361d24;
        color:#ff9ca7;
      }

      @media (min-width:700px){
        #rallyBody tr{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
        }
        .entry-title-actions{
          width:min(100%,430px);
          margin:2px 0 10px auto;
        }
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

  function applyNoteInput(input) {
    if (!(input instanceof HTMLInputElement) || !input.classList.contains('note')) return;
    const cell = input.closest('td');
    if (!cell) return;
    cell.classList.add('note-inline-cell');
    if (input.placeholder !== '备注') input.placeholder = '备注';
    input.setAttribute('aria-label', '备注');
  }

  function activeRow() {
    const list = Array.from(tbody.querySelectorAll('tr'));
    return tbody.querySelector('tr.rally-editor-row-active') || list[list.length - 1] || null;
  }

  function updateDeleteButton() {
    const button = document.querySelector('.delete-current-rally');
    if (!button) return;
    button.hidden = !activeRow();
  }

  function installTitleDelete() {
    if (document.querySelector('.delete-current-rally')) {
      updateDeleteButton();
      return;
    }

    const toggle = document.querySelector('.mobile-stats-toggle');
    if (!toggle?.parentNode) return;

    const wrap = document.createElement('div');
    wrap.className = 'entry-title-actions';
    toggle.parentNode.insertBefore(wrap, toggle);
    wrap.appendChild(toggle);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delete-current-rally';
    button.textContent = '删除';
    button.setAttribute('aria-label', '删除当前回合');
    button.title = '删除当前回合';
    wrap.appendChild(button);

    button.addEventListener('click', () => {
      const row = activeRow();
      const original = row?.querySelector('[data-del]');
      original?.click();
    });

    updateDeleteButton();
  }

  function enhanceAll() {
    tbody.querySelectorAll('button.cycle-choice').forEach(applyButton);
    tbody.querySelectorAll('input.note').forEach(applyNoteInput);
    installTitleDelete();
    updateDeleteButton();
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

  document.addEventListener('click', event => {
    if (event.target.closest('.rally-number')) requestAnimationFrame(updateDeleteButton);
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(tbody, { childList: true, subtree: true });

  installStyle();
  enhanceAll();
  requestAnimationFrame(enhanceAll);
})();

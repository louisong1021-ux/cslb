(() => {
  const tbody = document.querySelector('#rallyBody');
  if (!tbody) return;

  const PHRASES = [
    { selector: 'input.maleAttack', prefix: '男生连续进攻', suffix: '拍' },
    { selector: 'select.femaleTargetCount', prefix: '女生受攻', suffix: '次' },
    { selector: 'select.femaleDefenseCount', prefix: '女生防守成功', suffix: '次' },
    { selector: 'select.femaleNetCount', prefix: '女生封网成功', suffix: '次' },
    { selector: 'select.defenseToAttackCount', prefix: '防守转攻成功', suffix: '次' }
  ];

  function installStyle() {
    if (document.getElementById('numberPhraseEntryStyle')) return;
    const style = document.createElement('style');
    style.id = 'numberPhraseEntryStyle';
    style.textContent = `
      #rallyBody td.number-phrase-cell{
        display:flex!important;
        grid-template-columns:none!important;
        align-items:center;
        justify-content:flex-start;
        gap:8px;
        text-align:left;
      }
      #rallyBody td.number-phrase-cell::before{display:none!important}
      #rallyBody .number-phrase-prefix{
        flex:1 1 auto;
        min-width:0;
        color:#5d6c80;
        font-size:12px;
        font-weight:750;
        line-height:1.25;
        text-align:left;
      }
      #rallyBody .number-phrase-suffix{
        flex:0 0 auto;
        color:#5d6c80;
        font-size:12px;
        font-weight:750;
      }
      #rallyBody td.number-phrase-cell .cycle-choice.number-choice{
        width:58px!important;
        min-width:58px!important;
        max-width:58px!important;
        flex:0 0 58px;
        min-height:38px;
        padding:7px 6px;
        text-align:center;
      }
      body.dark #rallyBody .number-phrase-prefix,
      body.dark #rallyBody .number-phrase-suffix{color:#aebed0}
      @media(max-width:430px){
        #rallyBody td.number-phrase-cell{gap:7px}
        #rallyBody td.number-phrase-cell .cycle-choice.number-choice{
          width:54px!important;
          min-width:54px!important;
          max-width:54px!important;
          flex-basis:54px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyPhrase(control, phrase) {
    if (!control?.isConnected) return;
    const cell = control.closest('td');
    if (!cell) return;
    const button = control.nextElementSibling;
    if (!button?.classList.contains('number-choice')) return;

    cell.classList.add('number-phrase-cell');

    let prefix = cell.querySelector(':scope > .number-phrase-prefix');
    if (!prefix) {
      prefix = document.createElement('span');
      prefix.className = 'number-phrase-prefix';
      control.insertAdjacentElement('beforebegin', prefix);
    }
    prefix.textContent = phrase.prefix;

    let suffix = cell.querySelector(':scope > .number-phrase-suffix');
    if (!suffix) {
      suffix = document.createElement('span');
      suffix.className = 'number-phrase-suffix';
      button.insertAdjacentElement('afterend', suffix);
    }
    suffix.textContent = phrase.suffix;

    button.title = `点击选择${phrase.prefix}${phrase.suffix === '拍' ? '拍数' : '次数'}`;
  }

  function enhanceAll() {
    PHRASES.forEach(phrase => {
      tbody.querySelectorAll(phrase.selector).forEach(control => applyPhrase(control, phrase));
    });
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

  const observer = new MutationObserver(schedule);
  observer.observe(tbody, { childList: true, subtree: true });

  installStyle();
  enhanceAll();
  requestAnimationFrame(enhanceAll);
})();

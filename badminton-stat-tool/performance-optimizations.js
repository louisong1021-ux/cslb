(() => {
  const liveStats = document.querySelector('#liveStats');
  const statsPanel = document.querySelector('.stats-panel');
  if (!liveStats || !statsPanel) return;

  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!descriptor?.get || !descriptor?.set) return;

  let pendingCoreHtml = descriptor.get.call(liveStats);
  let statsOpen = statsPanel.classList.contains('mobile-open');

  const captureExtraCards = () => {
    const ids = new Set(['optimizedLiveCard', 'ourServerLiveCard']);
    return Array.from(liveStats.children)
      .filter(node => ids.has(node.id))
      .map(node => node.cloneNode(true));
  };

  const renderCoreHtml = html => {
    const extras = captureExtraCards();
    descriptor.set.call(liveStats, html);
    extras.forEach(node => liveStats.appendChild(node));
  };

  try {
    Object.defineProperty(liveStats, 'innerHTML', {
      configurable: true,
      get() {
        return descriptor.get.call(liveStats);
      },
      set(value) {
        pendingCoreHtml = String(value ?? '');
        if (statsOpen) renderCoreHtml(pendingCoreHtml);
      }
    });
  } catch {
    return;
  }

  // 实时统计默认隐藏时，不保留核心统计的大量 DOM；打开统计时再一次性恢复。
  if (!statsOpen) descriptor.set.call(liveStats, '');

  const flush = () => {
    statsOpen = true;
    renderCoreHtml(pendingCoreHtml);
  };

  document.addEventListener('badminton:open-stats', flush);

  const panelObserver = new MutationObserver(() => {
    const nextOpen = statsPanel.classList.contains('mobile-open');
    if (nextOpen && !statsOpen) flush();
    else statsOpen = nextOpen;
  });
  panelObserver.observe(statsPanel, { attributes: true, attributeFilter: ['class'] });
})();

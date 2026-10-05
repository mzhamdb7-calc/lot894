(() => {
  'use strict';

  const OUTPUT_TOP_OFFSET = 10;
  const OUTPUT_SELECTOR = '.result-panel';
  const MATCH_TOLERANCE = 2;
  let correctionQueued = false;
  let correcting = false;

  const visibleOutputPanels = () => Array.from(document.querySelectorAll(OUTPUT_SELECTOR))
    .filter((panel) => panel.getClientRects().length && getComputedStyle(panel).display !== 'none');

  const mainScrollTop = () => window.scrollY || document.scrollingElement?.scrollTop || 0;

  const correctOutputTopAlignment = () => {
    correctionQueued = false;
    if (correcting) return;

    const panel = visibleOutputPanels().find((candidate) =>
      Math.abs(candidate.getBoundingClientRect().top) <= MATCH_TOLERANCE);
    if (!panel) return;

    const target = Math.max(0, mainScrollTop() + panel.getBoundingClientRect().top - OUTPUT_TOP_OFFSET);
    if (Math.abs(target - mainScrollTop()) < 0.5) return;
    correcting = true;
    window.scrollTo({top: target, left: window.scrollX, behavior: 'instant'});
    requestAnimationFrame(() => { correcting = false; });
  };

  const queueOutputTopCorrection = () => {
    if (correctionQueued || correcting) return;
    correctionQueued = true;
    requestAnimationFrame(correctOutputTopAlignment);
  };

  window.addEventListener('scroll', queueOutputTopCorrection, {passive: true, capture: true});

  document.documentElement.style.setProperty('--output-top-scroll-offset', `${OUTPUT_TOP_OFFSET}px`);
  const style = document.createElement('style');
  style.textContent = `${OUTPUT_SELECTOR}{scroll-margin-top:var(--output-top-scroll-offset)}`;
  document.head.append(style);
})();

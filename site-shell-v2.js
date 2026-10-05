(() => {
  const STORAGE_KEY = 'lot894.reportLogo.v1';
  const MAX_FILE_SIZE = 1.5 * 1024 * 1024;
  const button = document.getElementById('reportSettingsButton');
  const overlay = document.getElementById('reportSettingsOverlay');
  const panel = document.getElementById('reportSettingsPanel');
  const closeButton = document.getElementById('reportSettingsClose');
  const fileInput = document.getElementById('reportLogoFile');
  const resetButton = document.getElementById('reportLogoReset');
  const defaultPreview = document.getElementById('reportLogoDefaultPreview');
  const customPreview = document.getElementById('reportLogoCustomPreview');
  const status = document.getElementById('reportLogoStatus');
  if (!button || !overlay || !panel || !closeButton || !fileInput || !resetButton || !defaultPreview || !customPreview || !status) return;

  const reportLogoSelector = '.lot894-report-logo, img[data-report-logo], img.report-logo';
  const defaultSources = new WeakMap();
  let currentLogo = null;
  let lastFocused = null;

  function setStatus(message, isError = false){
    status.textContent = message || '';
    status.classList.toggle('is-error', Boolean(isError));
  }

  function readStoredLogo(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.dataUrl !== 'string' || !parsed.dataUrl.startsWith('data:image/')) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function saveStoredLogo(record){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearStoredLogo(){
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function applyToLogoElement(img, dataUrl){
    if (!(img instanceof HTMLImageElement)) return;
    if (!defaultSources.has(img)) defaultSources.set(img, img.getAttribute('src') || '');
    if (dataUrl) img.src = dataUrl;
    else img.src = defaultSources.get(img) || img.getAttribute('src') || '';
  }

  function applyReportLogo(dataUrl){
    document.querySelectorAll(reportLogoSelector).forEach(img => applyToLogoElement(img, dataUrl));
    document.documentElement.classList.toggle('custom-report-logo-active', Boolean(dataUrl));
    window.dispatchEvent(new CustomEvent('lot894:report-logo-change', { detail:{ src:dataUrl || null } }));
  }

  function renderPreview(){
    const hasCustom = Boolean(currentLogo?.dataUrl);
    defaultPreview.hidden = hasCustom;
    customPreview.hidden = !hasCustom;
    if (hasCustom) {
      customPreview.src = currentLogo.dataUrl;
      customPreview.alt = currentLogo.name ? `Custom report logo: ${currentLogo.name}` : 'Custom report logo preview';
      setStatus(currentLogo.name ? `Using ${currentLogo.name}` : 'Using your custom report logo');
    } else {
      customPreview.removeAttribute('src');
      customPreview.alt = 'Custom report logo preview';
      setStatus('Using the default LOT 894 report logo');
    }
  }

  function open(){
    const quickOverlay = document.getElementById('quickCalcOverlay');
    if (quickOverlay?.classList.contains('is-open')) document.getElementById('quickCalcClose')?.click();
    if (overlay.classList.contains('is-open')) return;
    lastFocused = document.activeElement;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden','false');
    button.setAttribute('aria-expanded','true');
    button.setAttribute('aria-label','Close report logo settings');
    renderPreview();
    window.setTimeout(() => panel.focus(), 0);
  }

  function close(){
    if (!overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden','true');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label','Open report logo settings');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function toggle(){ overlay.classList.contains('is-open') ? close() : open(); }

  button.addEventListener('click', toggle);
  closeButton.addEventListener('click', close);
  document.getElementById('quickCalculatorButton')?.addEventListener('click', () => {
    if (overlay.classList.contains('is-open')) close();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const allowed = ['image/png','image/jpeg','image/webp'];
    if (!allowed.includes(file.type)) {
      setStatus('Please choose a PNG, JPG or WebP logo.', true);
      fileInput.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus('That logo is too large. Please use a file under 1.5 MB.', true);
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl.startsWith('data:image/')) {
        setStatus('Could not read that logo file.', true);
        return;
      }
      currentLogo = { dataUrl, name:file.name, type:file.type, updatedAt:Date.now() };
      const saved = saveStoredLogo(currentLogo);
      applyReportLogo(dataUrl);
      renderPreview();
      if (!saved) setStatus('Logo applied for this page, but browser storage is unavailable.', true);
      fileInput.value = '';
    };
    reader.onerror = () => setStatus('Could not read that logo file.', true);
    reader.readAsDataURL(file);
  });

  resetButton.addEventListener('click', () => {
    currentLogo = null;
    clearStoredLogo();
    applyReportLogo(null);
    renderPreview();
  });

  window.addEventListener('keydown', event => {
    if (!overlay.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(panel.querySelectorAll('button:not([disabled]), input:not([disabled]), label[for], [href], [tabindex]:not([tabindex="-1"])'))
      .filter(element => element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  currentLogo = readStoredLogo();
  applyReportLogo(currentLogo?.dataUrl || null);
  renderPreview();

  if ('MutationObserver' in window) {
    const observer = new MutationObserver(records => {
      if (!currentLogo?.dataUrl) return;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.(reportLogoSelector)) applyToLogoElement(node, currentLogo.dataUrl);
          node.querySelectorAll?.(reportLogoSelector).forEach(img => applyToLogoElement(img, currentLogo.dataUrl));
        }
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }
})();

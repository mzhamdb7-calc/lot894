(() => {
  'use strict';

  const currencySymbols = new Map([
    ['USD', '$'], ['EUR', '€'], ['GBP', '£'], ['JPY', '¥'], ['CNY', '¥'],
    ['KRW', '₩'], ['INR', '₹'], ['RUB', '₽'], ['TRY', '₺'], ['BRL', 'R$'],
    ['CAD', 'C$'], ['AUD', 'A$'], ['NZD', 'NZ$'], ['SGD', 'S$'], ['HKD', 'HK$'],
    ['MXN', 'MX$'], ['MYR', 'RM'], ['THB', '฿'], ['IDR', 'Rp'], ['PHP', '₱'],
    ['VND', '₫'], ['CHF', 'CHF'], ['SEK', 'kr'], ['NOK', 'kr'], ['DKK', 'kr'],
    ['PLN', 'zł'], ['CZK', 'Kč'], ['HUF', 'Ft'], ['ZAR', 'R'], ['ILS', '₪'],
    ['AED', 'د.إ'], ['SAR', '﷼'], ['QAR', 'QR'], ['KWD', 'KD'], ['BHD', 'BD'], ['OMR', 'OMR']
  ]);

  const unitAliases = new Map([
    ['year', 'yr'], ['years', 'yr'],
    ['month', 'mo'], ['months', 'mo'],
    ['week', 'wk'], ['weeks', 'wk'],
    ['day', 'day'], ['days', 'day'],
    ['hour', 'hr'], ['hours', 'hr'],
    ['minute', 'min'], ['minutes', 'min'],
    ['credit', 'cr'], ['credits', 'cr'],
    ['point', 'pt'], ['points', 'pts'],
    ['piece', 'pc'], ['pieces', 'pcs'], ['boards', 'pcs'],
    ['quantity', 'qty'], ['qty', 'qty'], ['rooms', 'rooms'],
    ['currency', '$']
  ]);

  const adornmentSelector = '.input-side-drawer .adornment';
  const resultSelector = '.result-panel, #reportRoot';
  const numericUnitPattern = /(^|[\s(:])([+-]?\d[\d,.]*(?:\.\d+)?)\s+(years?|months?|weeks?|days?|hours?|minutes?|credits?|points?|pieces?|boards?)\b/gi;

  function normalizeCurrencyToken(token) {
    return currencySymbols.get(token.toUpperCase()) || token;
  }

  function normalizeAdornmentText(value) {
    const text = String(value || '').trim();
    if (!text) return text;

    const rateMatch = text.match(/^([A-Z]{3})\s*\/\s*(.+)$/i);
    if (rateMatch) return `${normalizeCurrencyToken(rateMatch[1])}/${rateMatch[2]}`;

    const currency = currencySymbols.get(text.toUpperCase());
    if (currency) return currency;

    return unitAliases.get(text.toLowerCase()) || text;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeResultText(value) {
    let text = String(value || '');

    currencySymbols.forEach((symbol, code) => {
      const token = escapeRegExp(code);
      const trailingCode = new RegExp(`(^|[\\s(:])([+-]?\\d[\\d,.]*(?:\\.\\d+)?)\\s+${token}\\b`, 'g');
      const leadingCode = new RegExp(`\\b${token}\\s+(?=[+\\-]?\\d)`, 'g');
      const pairCode = new RegExp(`\\b${token}\\s*\\/\\s*`, 'g');
      const standaloneCode = new RegExp(`\\b${token}\\b`, 'g');

      text = text
        .replace(trailingCode, (_, lead, amount) => `${lead}${symbol}${amount}`)
        .replace(leadingCode, symbol)
        .replace(pairCode, `${symbol}/`)
        .replace(standaloneCode, symbol);
    });

    text = text.replace(numericUnitPattern, (_, lead, amount, unit) => {
      return `${lead}${amount} ${unitAliases.get(unit.toLowerCase()) || unit}`;
    });

    const trimmed = text.trim();
    const compact = normalizeAdornmentText(trimmed);
    return compact !== trimmed ? text.replace(trimmed, compact) : text;
  }

  function normalizeAdornment(element) {
    if (!(element instanceof HTMLElement) || !element.matches(adornmentSelector)) return;
    const current = element.textContent.trim();
    const normalized = normalizeAdornmentText(current);
    if (normalized && normalized !== current) element.textContent = normalized;
  }

  function normalizeResultTextNode(node) {
    if (!(node instanceof Text)) return;
    const parent = node.parentElement;
    if (!parent || parent.closest('script, style') || !parent.closest(resultSelector)) return;
    const current = node.nodeValue;
    const normalized = normalizeResultText(current);
    if (normalized !== current) node.nodeValue = normalized;
  }

  function normalizeResultWithin(root) {
    if (root instanceof Text) {
      normalizeResultTextNode(root);
      return;
    }
    if (!(root instanceof Element || root instanceof Document)) return;

    if (root instanceof Element && !root.matches(resultSelector) && !root.closest(resultSelector)) {
      root.querySelectorAll(resultSelector).forEach(normalizeResultWithin);
      return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) normalizeResultTextNode(node);
  }

  function normalizeWithin(root) {
    if (root instanceof HTMLElement && root.matches(adornmentSelector)) normalizeAdornment(root);
    if (root instanceof Element || root instanceof Document) {
      root.querySelectorAll(adornmentSelector).forEach(normalizeAdornment);
    }
    normalizeResultWithin(root);
  }

  function start() {
    normalizeWithin(document);
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'characterData') {
          normalizeAdornment(record.target.parentElement);
          normalizeResultTextNode(record.target);
          return;
        }
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            normalizeAdornment(node.parentElement);
            normalizeResultTextNode(node);
          } else normalizeWithin(node);
        });
      });
    });
    observer.observe(document.body, {childList:true, subtree:true, characterData:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();

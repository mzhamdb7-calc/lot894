(() => {
  'use strict';

  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const results = document.getElementById('indexSearchResults');
  const tools = Array.isArray(window.LOT894_DIRECTORY_TOOLS) ? window.LOT894_DIRECTORY_TOOLS : [];
  if (!form || !input || !results || !tools.length) return;

  const mainByPath = new Map(tools
    .filter((tool) => !tool.href.includes('?'))
    .map((tool) => [tool.href, tool]));

  const close = () => {
    results.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
  };

  const resultLinks = () => Array.from(results.querySelectorAll('.index-search-result'));

  const render = () => {
    const query = input.value.trim().toLowerCase();
    results.innerHTML = '';
    if (!query) return close();

    const matches = tools.filter((tool) =>
      `${tool.name} ${tool.category} ${tool.description || ''}`.toLowerCase().includes(query)
    ).slice(0, 12);

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'index-search-empty';
      empty.textContent = 'No matching calculators, tools, or modes.';
      results.append(empty);
    } else {
      for (const tool of matches) {
        const link = document.createElement('a');
        const isMode = tool.href.includes('?');
        const pagePath = `${tool.href.split('?')[0]}`;
        const parent = mainByPath.get(pagePath);
        link.className = 'index-search-result';
        link.href = tool.href;
        link.setAttribute('role', 'option');
        const name = document.createElement('strong');
        name.textContent = tool.name;
        const meta = document.createElement('span');
        meta.textContent = isMode && parent ? `${parent.name} mode` : tool.category;
        link.append(name, meta);
        results.append(link);
      }
    }

    results.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      input.blur();
    } else if (event.key === 'ArrowDown') {
      const first = resultLinks()[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  results.addEventListener('keydown', (event) => {
    const links = resultLinks();
    const index = links.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' && index >= 0) {
      event.preventDefault();
      (links[index + 1] || links[0])?.focus();
    } else if (event.key === 'ArrowUp' && index >= 0) {
      event.preventDefault();
      if (index === 0) input.focus();
      else links[index - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
      input.focus();
    }
  });

  form.addEventListener('submit', (event) => {
    const first = resultLinks()[0];
    if (!first || !input.value.trim()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = first.href;
  }, true);

  document.addEventListener('pointerdown', (event) => {
    if (!form.contains(event.target) && !results.contains(event.target)) close();
  });
})();

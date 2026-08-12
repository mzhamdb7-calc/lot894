(() => {
  'use strict';

  const GROUP_CLASS = 'kalq-report-group-page';
  const STRUCTURAL = '.report-masthead, .report-header, .report-title, .report-footer, .kalq-report-footer, .preview-toolbar, .preview-close, .kalq-report-toolbar';
  const GUIDE_PAGE = /\bcalculation method\b|\bformula and worked calculation\b|\bcalculation guide\b|\bconverter guide\b|\bchemistry guide\b|\breference guide\b|\blearning notes\b|\bpractical review\b|\bmethod(?:ology)?\s*(?:&|and|,)\s*(?:guidance|notes|validation|practical)\b|\bhow the roots were found\b|\bformulas?,?\s*use\s*&\s*limits\b|\bformula,?\s*tips\b|\bdata and use notes\b|\buse,?\s*tips\b|\buser guide\b|\bfaq(?:s)?\b|frequently asked|\breferences\b|\bsources?\b|\bdisclaimer\b|\blimitations?\b|\brelated (?:tools|calculators)\b|\bnext steps\b/i;
  const FAQ_RE = /\bfaq(?:s)?\b|frequently asked|\bquestions?\b/i;
  const REF_RE = /\breferences\b|\bsource(?:s)?\b|\bcitation(?:s)?\b|\bdata source(?:s)?\b/i;
  const RELATED_RE = /\brelated (?:tools|calculators)\b|\bnext tools?\b/i;
  const DISCLAIMER_RE = /\bdisclaimer\b|\blimitation(?:s)?\b|\bscope\b|\bimportant note\b|\bboundar(?:y|ies)\b/i;
  const METHOD_RE = /\bmethod\b|\bformula\b|\bcalculation\b|\bhow (?:it|the calculation) works\b|\bworked example\b/i;
  const TIPS_RE = /\btips?\b|\bmistakes?\b|\bbest practice\b|\bpractical\b|\bwatch for\b/i;
  const USE_RE = /\bhow to use\b|\bunderstand(?:ing)?\b|\binterpret(?:ation|ing)?\b|\bread(?:ing)? (?:the|your) result\b|\bwhat (?:this|the) result means\b/i;

  let organizing = false;
  let scheduled = false;
  let mutationObserver = null;

  const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();

  function pageHost(root) {
    const explicit = root.querySelector(':scope > #reportPages, :scope > .report-pages, :scope > [data-report-pages]');
    return explicit || root;
  }

  function pages(root) {
    return [...pageHost(root).querySelectorAll(':scope > .report-page')];
  }

  function titleText(page) {
    return clean(page.querySelector(':scope > .report-title h1, :scope > h1')?.textContent);
  }

  function headingText(node) {
    return clean(node.querySelector?.(':scope > h2, :scope > h3, h2, h3')?.textContent);
  }

  function isVisiblePage(page) {
    return !page.hidden && page.getAttribute('aria-hidden') !== 'true';
  }

  function isGuidancePage(page) {
    if (page.classList.contains(GROUP_CLASS)) return true;
    const title = titleText(page);
    const eyebrow = clean(page.querySelector(':scope > .report-title .eyebrow')?.textContent);
    const text = `${eyebrow} ${title}`;
    const outputTitle = /\bsummary\b|\boverview\b|\bsnapshot\b|\bscenario\b|\bcomparison\b|\banalysis\b|\bamortization\b|\bschedule\b|\bjourney\b|\bbreakdown\b|\bprojection\b|\bforecast\b|\bperformance\b|\bresult(?:s)?\b|\bcost composition\b|\bsensitivity\b|\boutlook\b|\bcheckpoint(?:s)?\b|\btrend\b|\bskills?\b|\bmilestone(?:s)?\b|\bworksheet\b|\bprofile\b|\bposition\b/i;
    const hasOutputVisual = Boolean(page.querySelector('table, svg, canvas, .report-hero, .report-findings, .scenario-chart, .report-chart, .report-gauge, .report-composition'));
    if (outputTitle.test(text) && hasOutputVisual && !GUIDE_PAGE.test(text)) return false;
    return GUIDE_PAGE.test(text);
  }

  function reportNameFrom(page) {
    const small = clean(page?.querySelector('.report-brand-copy small')?.textContent);
    let title = small;
    if (!title) {
      const doc = clean(document.title).replace(/\s*[|—-].*$/, '');
      title = doc ? `${doc} REPORT` : 'REPORT';
    }
    title = title.replace(/\bCALCULATOR\b/gi, '').replace(/\s+/g, ' ').trim();
    if (!/\bREPORT\b/i.test(title)) title += ' REPORT';
    return title.toUpperCase();
  }

  function ensureMetadata(page, reportName) {
    const meta = page.querySelector(':scope > .report-masthead .report-page-no, :scope > .report-header .report-page-no, :scope > .report-header .report-meta, :scope > .report-masthead .report-meta');
    if (meta && !meta.querySelector('.kalq-report-meta-title')) {
      const title = document.createElement('strong');
      title.className = 'kalq-report-meta-title';
      title.textContent = reportName;
      meta.prepend(title);
    } else if (meta?.querySelector('.kalq-report-meta-title')) {
      meta.querySelector('.kalq-report-meta-title').textContent = reportName;
    }

    let footer = page.querySelector(':scope > .report-footer, :scope > .kalq-report-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'kalq-report-footer';
      footer.innerHTML = `<span>LOT 894 · ${reportName}</span><span>Generated report</span>`;
      page.append(footer);
    } else if (footer.classList.contains('kalq-report-footer')) {
      footer.innerHTML = `<span>LOT 894 · ${reportName}</span><span>Generated report</span>`;
    }
  }

  function ensureToolbar(root) {
    let toolbar = root.querySelector(':scope > .preview-toolbar, :scope > .kalq-report-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'kalq-report-toolbar';
      root.prepend(toolbar);
    }

    let printBtn = toolbar.querySelector('#previewPrintBtn, [data-kalq-print]');
    if (!printBtn) {
      printBtn = document.createElement('button');
      printBtn.type = 'button';
      printBtn.dataset.kalqPrint = 'true';
      printBtn.addEventListener('click', () => window.print());
      toolbar.append(printBtn);
    }
    printBtn.textContent = 'Print';

    let saveBtn = toolbar.querySelector('[data-kalq-save]');
    if (!saveBtn) {
      saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.dataset.kalqSave = 'true';
      saveBtn.title = 'Choose Save as PDF in the print dialog';
      saveBtn.addEventListener('click', () => window.print());
      printBtn.after(saveBtn);
    }
    saveBtn.textContent = 'Save';

    let closeBtn = toolbar.querySelector('#closePreviewBtn, [data-kalq-close]');
    const legacyClose = root.querySelector(':scope > .preview-close');
    if (!closeBtn && legacyClose) {
      closeBtn = legacyClose;
      toolbar.append(closeBtn);
    }
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.dataset.kalqClose = 'true';
      closeBtn.addEventListener('click', () => {
        root.classList.remove('is-preview');
        document.body.style.overflow = '';
      });
      toolbar.append(closeBtn);
    }
    closeBtn.textContent = 'Close';

    if (!toolbar.dataset.kalqAutohideBound) {
      toolbar.dataset.kalqAutohideBound = 'true';
      let last = 0;
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const current = root.scrollTop || 0;
          if (current > last + 8 && current > 28) toolbar.classList.add('kalq-toolbar-hidden');
          else if (current < last - 5 || current <= 20) toolbar.classList.remove('kalq-toolbar-hidden');
          last = Math.max(0, current);
          ticking = false;
        });
      };
      root.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('scroll', () => {
        if (!root.classList.contains('is-preview')) return;
        const current = window.scrollY || 0;
        if (current > last + 8 && current > 28) toolbar.classList.add('kalq-toolbar-hidden');
        else if (current < last - 5 || current <= 20) toolbar.classList.remove('kalq-toolbar-hidden');
        last = Math.max(0, current);
      }, { passive: true });
    }

    return toolbar;
  }

  function classify(node) {
    const heading = headingText(node);
    const sample = `${heading} ${clean(node.textContent).slice(0, 420)}`;
    if (FAQ_RE.test(sample)) return 'faq';
    if (REF_RE.test(sample)) return 'references';
    if (RELATED_RE.test(sample)) return 'related';
    if (DISCLAIMER_RE.test(sample)) return 'disclaimer';
    if (METHOD_RE.test(sample)) return 'method';
    if (TIPS_RE.test(sample)) return 'tips';
    if (USE_RE.test(sample)) return 'understanding';
    return 'guidance';
  }

  function meaningful(node) {
    if (!(node instanceof HTMLElement) || node.hidden) return false;
    const text = clean(node.textContent);
    return Boolean(text || node.querySelector('table, svg, canvas, img, picture, .chart, .graph, .gauge'));
  }

  function authoredBlocks(page) {
    const out = [];
    [...page.children].forEach((node) => {
      if (!(node instanceof HTMLElement) || node.matches(STRUCTURAL) || !meaningful(node)) return;
      if (node.matches('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid')) {
        const children = [...node.children].filter((child) => meaningful(child));
        const semanticChildren = children.length && children.every((child) =>
          child.matches('.report-section, .analysis-panel') || headingText(child)
        );
        if (semanticChildren) children.forEach((child) => out.push(child));
        else out.push(node);
      } else {
        out.push(node);
      }
    });
    return out;
  }

  function faqItemsFrom(node) {
    const items = [...node.querySelectorAll('.report-faq, .faq-item')].filter((item) => meaningful(item));
    return items.length >= 2 ? items : [];
  }

  function removeEmptyAncestors(page) {
    [...page.querySelectorAll('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid')].reverse().forEach((node) => {
      if (!meaningful(node)) node.remove();
    });
  }

  function shellFrom(template, reportName, title, eyebrow, description) {
    const page = document.createElement('section');
    const landscape = template?.classList.contains('report-landscape') || template?.classList.contains('kalq-report-landscape');
    page.className = `report-page ${GROUP_CLASS}${landscape ? ' report-landscape' : ''}`;

    const sourceHeader = template?.querySelector(':scope > .report-masthead, :scope > .report-header');
    if (sourceHeader) page.append(sourceHeader.cloneNode(true));
    else {
      const header = document.createElement('div');
      header.className = 'report-masthead';
      header.innerHTML = `<div class="report-brand"><span class="brand-mark" aria-hidden="true"></span></div><div class="report-page-no"><span>${new Intl.DateTimeFormat('en-US', {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date())}</span><br>Page 1 of 1</div>`;
      page.append(header);
    }

    const titleNode = document.createElement('div');
    titleNode.className = 'report-title';
    titleNode.innerHTML = `<div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p>`;
    page.append(titleNode);

    const content = document.createElement('div');
    content.className = 'kalq-report-group-content';
    page.append(content);
    ensureMetadata(page, reportName);
    return { page, content };
  }

  function availableBottom(page) {
    const footer = page.querySelector(':scope > .report-footer, :scope > .kalq-report-footer');
    return footer ? footer.offsetTop - 14 : page.clientHeight - 30;
  }

  function fits(page, content) {
    return content.offsetTop + content.scrollHeight <= availableBottom(page);
  }

  function paginateUnits(root, units, template, reportName, spec) {
    if (!units.length) return [];
    const made = [];
    let shell = null;

    const make = () => {
      const continued = made.length ? ' — Continued' : '';
      shell = shellFrom(template, reportName, `${spec.title}${continued}`, spec.eyebrow, spec.description);
      shell.page.dataset.kalqReportGroup = spec.key;
      pageHost(root).append(shell.page);
      made.push(shell.page);
    };

    make();
    units.forEach((unit) => {
      shell.content.append(unit);
      if (shell.content.children.length > 1 && !fits(shell.page, shell.content)) {
        unit.remove();
        make();
        shell.content.append(unit);
      }
      if (shell.content.children.length === 1 && !fits(shell.page, shell.content)) {
        shell.page.dataset.kalqOversized = 'true';
      }
    });
    return made;
  }

  function paginateFaqs(root, faqItems, template, reportName) {
    if (!faqItems.length) return [];
    const made = [];
    let shell = null;
    let list = null;

    const make = () => {
      const continued = made.length ? ' — Continued' : '';
      shell = shellFrom(template, reportName,
        `Frequently Asked Questions${continued}`, 'Questions',
        'Clear answers to the most useful questions about this result and how to interpret it.');
      shell.page.dataset.kalqReportGroup = 'faq';
      list = document.createElement('div');
      list.className = 'kalq-report-faq-list';
      shell.content.append(list);
      pageHost(root).append(shell.page);
      made.push(shell.page);
    };

    make();
    faqItems.forEach((item) => {
      list.append(item);
      if (list.children.length > 1 && !fits(shell.page, shell.content)) {
        item.remove();
        make();
        list.append(item);
      }
    });
    return made;
  }


  function stripIds(node) {
    if (!(node instanceof Element)) return node;
    node.removeAttribute('id');
    node.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    return node;
  }

  function outputBlocks(page) {
    return [...page.children].filter((node) =>
      node instanceof HTMLElement && !node.matches(STRUCTURAL) && meaningful(node)
    );
  }

  function outputOverflow(page) {
    const blocks = outputBlocks(page);
    const last = blocks.at(-1);
    if (!last) return 0;
    return Math.max(0, last.offsetTop + last.offsetHeight - availableBottom(page));
  }

  function cloneOutputShell(source, reportName) {
    const page = document.createElement('section');
    const classes = [...source.classList].filter((name) =>
      ![GROUP_CLASS, 'kalq-output-page', 'kalq-sparse-page', 'kalq-report-last-page'].includes(name)
    );
    page.className = [...new Set([...classes, 'report-page', 'kalq-output-continuation'])].join(' ');
    page.hidden = source.hidden;

    const header = source.querySelector(':scope > .report-masthead, :scope > .report-header');
    if (header) page.append(stripIds(header.cloneNode(true)));

    const title = source.querySelector(':scope > .report-title');
    if (title) {
      const copy = stripIds(title.cloneNode(true));
      const heading = copy.querySelector('h1');
      if (heading && !/continued/i.test(heading.textContent)) heading.textContent = `${clean(heading.textContent)} — Continued`;
      const desc = copy.querySelector('p');
      if (desc) desc.textContent = 'Continuation of the detailed output from the previous report page.';
      page.append(copy);
    }

    ensureMetadata(page, reportName);
    source.after(page);
    return page;
  }

  function contentInsertPoint(page) {
    return [...page.children].find((node) =>
      node instanceof HTMLElement && !node.matches(STRUCTURAL)
    ) || page.querySelector(':scope > .report-footer, :scope > .kalq-report-footer') || null;
  }

  function insertContentAtStart(page, node) {
    const before = contentInsertPoint(page);
    if (before) page.insertBefore(node, before);
    else page.append(node);
  }

  function rowRange(rows) {
    if (!rows.length) return null;
    const firstText = clean(rows[0].querySelector('td,th')?.textContent);
    const lastText = clean(rows.at(-1).querySelector('td,th')?.textContent);
    const f = firstText.match(/\d+/)?.[0];
    const l = lastText.match(/\d+/)?.[0];
    return f && l ? { first: f, last: l } : null;
  }

  function updateScheduleMeta(page, rows) {
    const range = rowRange(rows);
    if (!range) return;
    const first = page.querySelector('.schedule-meta > div:first-child strong');
    if (!first) return;
    const old = clean(first.textContent);
    const prefix = old.match(/^[A-Za-z]+/)?.[0] || 'Rows';
    first.textContent = `${prefix} ${range.first}–${range.last}`;
  }

  function splitLargeTable(page, reportName) {
    const tables = [...page.querySelectorAll('table')]
      .map((table) => ({ table, rows: [...table.querySelectorAll('tbody > tr')] }))
      .filter((entry) => entry.rows.length > 8)
      .sort((a, b) => b.rows.length - a.rows.length);
    if (!tables.length) return false;

    const { table, rows } = tables[0];
    let topBlock = table;
    while (topBlock.parentElement && topBlock.parentElement !== page) topBlock = topBlock.parentElement;
    if (topBlock.parentElement !== page) return false;

    const continuation = cloneOutputShell(page, reportName);
    const prev = topBlock.previousElementSibling;
    let metaClone = null;
    if (prev?.matches('.schedule-meta')) {
      metaClone = stripIds(prev.cloneNode(true));
      insertContentAtStart(continuation, metaClone);
    }

    const cloneBlock = stripIds(topBlock.cloneNode(true));
    const cloneTable = cloneBlock.matches('table') ? cloneBlock : cloneBlock.querySelector('table');
    const cloneBody = cloneTable?.querySelector('tbody');
    if (!cloneBody) {
      continuation.remove();
      return false;
    }
    cloneBody.innerHTML = '';
    continuation.insertBefore(cloneBlock, continuation.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));

    /* Anything authored after the table belongs after the continued rows, not
       before them on the source page. */
    const sourceBlocks = outputBlocks(page);
    const tableIndex = sourceBlocks.indexOf(topBlock);
    sourceBlocks.slice(tableIndex + 1).forEach((block) => {
      continuation.insertBefore(block, continuation.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));
    });

    const sourceBody = table.querySelector('tbody');
    while (outputOverflow(page) > 4 && sourceBody.rows.length > 6) {
      const row = sourceBody.rows[sourceBody.rows.length - 1];
      cloneBody.insertBefore(row, cloneBody.firstChild);
    }

    if (!cloneBody.rows.length) {
      continuation.remove();
      return false;
    }

    updateScheduleMeta(page, [...sourceBody.rows]);
    updateScheduleMeta(continuation, [...cloneBody.rows]);
    return true;
  }

  function splitRepeatContainer(page, reportName) {
    const blocks = outputBlocks(page);
    if (blocks.length !== 1) return false;
    const block = blocks[0];
    const children = [...block.children].filter((child) => meaningful(child));
    if (children.length < 3) return false;

    const continuation = cloneOutputShell(page, reportName);
    const clone = stripIds(block.cloneNode(false));
    continuation.insertBefore(clone, continuation.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));

    while (outputOverflow(page) > 4 && block.children.length > 2) {
      const child = block.lastElementChild;
      clone.insertBefore(child, clone.firstChild);
    }

    if (!clone.children.length) {
      continuation.remove();
      return false;
    }
    return true;
  }

  function moveTailBlocks(page, reportName) {
    const blocks = outputBlocks(page);
    if (blocks.length <= 1) return false;
    const continuation = cloneOutputShell(page, reportName);
    let moved = 0;
    while (outputOverflow(page) > 4 && outputBlocks(page).length > 1) {
      const tail = outputBlocks(page).at(-1);
      insertContentAtStart(continuation, tail);
      moved += 1;
    }
    if (!moved) {
      continuation.remove();
      return false;
    }
    return true;
  }

  function reflowOverflowingOutputPages(root, reportName) {
    let guard = 0;
    while (guard++ < 80) {
      const output = pages(root).filter((page) =>
        isVisiblePage(page) && !page.classList.contains(GROUP_CLASS) && outputOverflow(page) > 5
      );
      if (!output.length) break;
      const page = output[0];
      if (splitLargeTable(page, reportName)) continue;
      if (moveTailBlocks(page, reportName)) continue;
      if (splitRepeatContainer(page, reportName)) continue;
      page.dataset.kalqUnsplitOverflow = 'true';
      break;
    }
  }

  function setPageNumber(page, index, total) {
    const stamp = page.querySelector('.report-page-no, .report-meta');
    if (!stamp) return;
    const counter = stamp.querySelector('.report-page-counter, .report-page-count, .report-page-index');
    if (counter) {
      counter.textContent = `Page ${index} of ${total}`;
      return;
    }
    const totalNode = stamp.querySelector('.reportTotal');
    const br = stamp.querySelector('br');
    if (br) {
      let next = br.nextSibling;
      while (next && next.nodeType !== Node.TEXT_NODE) next = next.nextSibling;
      if (!next) {
        next = document.createTextNode('');
        br.after(next);
      }
      next.nodeValue = totalNode ? `Page ${index} of ` : `Page ${index} of ${total}`;
      if (totalNode) totalNode.textContent = String(total);
    } else {
      let generated = stamp.querySelector('.kalq-report-page-counter');
      if (!generated) {
        generated = document.createElement('span');
        generated.className = 'kalq-report-page-counter';
        stamp.append(generated);
      }
      generated.textContent = `Page ${index} of ${total}`;
    }
  }

  function renumber(root, reportName) {
    const all = pages(root).filter(isVisiblePage);
    all.forEach((page) => {
      page.classList.remove('kalq-report-last-page');
      ensureMetadata(page, reportName);
    });
    all.at(-1)?.classList.add('kalq-report-last-page');
    all.forEach((page, i) => setPageNumber(page, i + 1, all.length));
    root.querySelectorAll('.reportTotal').forEach((node) => { node.textContent = String(all.length); });
  }

  function normalizeOutputPages(root, reportName) {
    const outputPages = pages(root).filter((page) => isVisiblePage(page) && !isGuidancePage(page));
    outputPages.forEach((page) => {
      page.classList.add('kalq-output-page');
      ensureMetadata(page, reportName);
      const blocks = [...page.children].filter((node) =>
        node instanceof HTMLElement && !node.matches(STRUCTURAL) && meaningful(node)
      );
      blocks.forEach((node) => node.classList.add('kalq-output-block'));
      if (blocks.length > 1) {
        const last = blocks.at(-1);
        const free = Math.max(0, availableBottom(page) - (last.offsetTop + last.offsetHeight));
        const perGap = Math.min(15, free / Math.max(1, blocks.length - 1));
        const mm = Math.min(9, 5 + perGap / 3.78);
        page.style.setProperty('--kalq-flow-gap', `${mm.toFixed(2)}mm`);
        if (free > 80) {
          page.classList.add('kalq-sparse-page');
          const pad = Math.min(6.2, 4.2 + free / 220);
          page.style.setProperty('--kalq-sparse-row-pad', `${pad.toFixed(2)}mm`);
        } else {
          page.classList.remove('kalq-sparse-page');
        }
      }
    });
  }

  function organize(root) {
    if (!root || organizing) return;
    organizing = true;
    const wasHidden = getComputedStyle(root).display === 'none';
    if (wasHidden) root.classList.add('kalq-report-measuring');

    try {
      const allPages = pages(root);
      if (!allPages.length) return;
      const reportName = reportNameFrom(allPages[0]);

      const existingGroups = allPages.filter((page) => page.classList.contains(GROUP_CLASS));
      const authoredGuidePages = allPages.filter((page) =>
        !page.classList.contains(GROUP_CLASS) && isVisiblePage(page) && isGuidancePage(page)
      );

      /* Re-running after our own pagination must be idempotent. If the report
         builder has not supplied fresh authored guidance pages, keep the
         already-generated guidance pages instead of deleting them. */
      if (!authoredGuidePages.length) {
        normalizeOutputPages(root, reportName);
        reflowOverflowingOutputPages(root, reportName);
        renumber(root, reportName);
        return;
      }

      existingGroups.forEach((page) => page.remove());
      const guidePages = authoredGuidePages;
      normalizeOutputPages(root, reportName);

      if (guidePages.length) {
        const template = guidePages[0];
        const buckets = {
          understanding: [],
          method: [],
          tips: [],
          guidance: [],
          faq: [],
          references: [],
          related: [],
          disclaimer: []
        };

        guidePages.forEach((page) => {
          removeEmptyAncestors(page);
          authoredBlocks(page).forEach((block) => {
            const kind = classify(block);
            if (kind === 'faq') {
              const items = faqItemsFrom(block);
              if (items.length) items.forEach((item) => buckets.faq.push(item));
              else buckets.faq.push(block);
            } else {
              buckets[kind]?.push(block) || buckets.guidance.push(block);
            }
          });
        });

        guidePages.forEach((page) => page.remove());

        const understandingFlow = [
          ...buckets.understanding,
          ...buckets.guidance
        ];
        const resourceFlow = [
          ...buckets.references,
          ...buckets.related,
          ...buckets.disclaimer
        ];

        paginateUnits(root, understandingFlow, template, reportName, {
          key: 'understanding',
          eyebrow: 'Interpretation & practical use',
          title: 'Understanding Your Result',
          description: 'How to read the result and use the report in a clear, practical way.'
        });

        paginateUnits(root, buckets.method, template, reportName, {
          key: 'method',
          eyebrow: 'Method & calculation',
          title: 'Method & Formula',
          description: 'How the calculation works, the formulas used, assumptions, and worked-method notes.'
        });

        paginateUnits(root, buckets.tips, template, reportName, {
          key: 'tips',
          eyebrow: 'Practical guidance',
          title: 'Tips & Common Mistakes',
          description: 'Useful ways to apply the result and common interpretation or input mistakes to avoid.'
        });

        paginateFaqs(root, buckets.faq, template, reportName);

        paginateUnits(root, resourceFlow, template, reportName, {
          key: 'resources',
          eyebrow: 'Sources & final notes',
          title: 'References, Related Tools & Disclaimer',
          description: 'Sources, useful next-step calculators, scope, limitations, and final report notes.'
        });
      }

      /* Guidance pages are always appended after authored output pages. */
      normalizeOutputPages(root, reportName);
      reflowOverflowingOutputPages(root, reportName);
      renumber(root, reportName);
      requestAnimationFrame(() => {
        normalizeOutputPages(root, reportName);
        reflowOverflowingOutputPages(root, reportName);
        renumber(root, reportName);
      });
    } finally {
      root.classList.remove('kalq-report-measuring');
      organizing = false;
    }
  }

  function schedule(root) {
    if (!root || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      organize(root);
    });
  }

  function init() {
    const root = document.getElementById('reportRoot');
    if (!root) return;
    ensureToolbar(root);
    if (root.classList.contains('is-preview') || (!root.hidden && getComputedStyle(root).display !== 'none')) schedule(root);

    mutationObserver = new MutationObserver((records) => {
      if (organizing) return;
      const hasOriginalPage = records.some((record) => [...record.addedNodes].some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        !node.classList?.contains(GROUP_CLASS) &&
        !node.classList?.contains('kalq-output-continuation') &&
        (node.matches?.('.report-page:not(.kalq-output-continuation)') || node.querySelector?.('.report-page:not(.kalq-report-group-page):not(.kalq-output-continuation)'))
      ));
      if (hasOriginalPage) schedule(root);
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    document.addEventListener('click', (event) => {
      if (event.target.closest('#previewReportBtn, #previewBtn, #viewReportBtn, #printReportBtn, #printBtn, #previewPrintBtn, [data-report-preview], [data-print-report]')) {
        schedule(root);
        setTimeout(() => organize(root), 90);
      }
    }, true);

    window.addEventListener('beforeprint', () => organize(root));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

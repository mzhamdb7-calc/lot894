(() => {
  'use strict';

  const GROUP_CLASS = 'kalq-report-group-page';
  const STRUCTURAL = '.report-masthead, .report-header, .report-title, .report-footer, .kalq-report-footer, .preview-toolbar, .preview-close, .kalq-report-toolbar';
  const GUIDE_PAGE = /\bcalculation method\b|\bformula and worked calculation\b|\bcalculation guide\b|\bconverter guide\b|\bchemistry guide\b|\breference guide\b|\blearning notes\b|\bpractical review\b|\bmethod(?:ology)?\s*(?:&|and|,)\s*(?:guidance|notes|validation|practical)\b|\bhow the roots were found\b|\bformulas?,?\s*use\s*&\s*limits\b|\bformula,?\s*tips\b|\bdata and use notes\b|\buse,?\s*tips\b|\buser guide\b|\bappointments? and preparation\b|\bpersonal action plan\b|\bfaq(?:s)?\b|frequently asked|\breferences\b|\bsources?\b|\bdisclaimer\b|\blimitations?\b|\brelated (?:tools|calculators)\b|\bnext steps\b/i;
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
    /* Generated continuation/guidance pages are appended to the report root.
       Some legacy calculators keep output pages in more than one child wrapper
       (for example #schedulePages beside the main report pages), so choosing a
       single authored wrapper would put guidance before later output. */
    return root;
  }

  function pages(root) {
    /* Treat every top-level report-page descendant as part of one printable
       sequence, even when legacy builders place schedule pages in a nested
       wrapper. Nested report pages (if any) are ignored to avoid double count. */
    return [...root.querySelectorAll('.report-page')].filter((page) => !page.parentElement?.closest('.report-page'));
  }

  function titleText(page) {
    return clean(page.querySelector(':scope > .report-title h1, :scope > h1')?.textContent);
  }

  function headingText(node) {
    return clean(node.querySelector?.(':scope > h2, :scope > h3, h2, h3')?.textContent);
  }

  function isVisiblePage(page) {
    if (page.hidden || page.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(page);
    if (style.display === 'none') return false;
    const root = page.closest('#reportRoot');
    /* The paginator intentionally hides the entire report while measuring it.
       Do not mistake that inherited visibility for an authored hidden page. */
    if (!root?.classList.contains('kalq-report-measuring') && style.visibility === 'hidden') return false;
    return true;
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

    let closeBtn = toolbar.querySelector('#closePreviewBtn, #closeReportBtn, #previewCloseBtn, [data-kalq-close]');
    if (!closeBtn) {
      closeBtn = [...toolbar.querySelectorAll('button')].find((button) => /\bclose\b/i.test(clean(button.textContent)));
    }
    if (closeBtn) closeBtn.dataset.kalqClose = 'true';
    const legacyClose = root.querySelector(':scope > .preview-close');
    if (!closeBtn && legacyClose) {
      closeBtn = legacyClose;
      toolbar.append(closeBtn);
    } else if (closeBtn && legacyClose && legacyClose !== closeBtn) {
      /* The professional toolbar already has its own Close control. Remove the
         older standalone preview-close button so users never see two Close pills. */
      legacyClose.remove();
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
    /* Keep a real visual buffer above the footer. 16 px is deliberately more
       conservative than the old rule so descenders, rules and SVG labels never
       touch the footer when the page is printed. */
    return footer ? footer.offsetTop - 16 : page.clientHeight - 34;
  }

  function visualBottom(page, scope = page) {
    const pageRect = page.getBoundingClientRect();
    let bottom = 0;
    const nodes = scope === page ? [...scope.querySelectorAll('*')] : [scope, ...scope.querySelectorAll('*')];
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
      if (node.closest('.report-footer, .kalq-report-footer, .report-masthead, .report-header, .report-title, .preview-toolbar, .kalq-report-toolbar')) return;
      const style = getComputedStyle(node);
      const measuring = page.closest('#reportRoot')?.classList.contains('kalq-report-measuring');
      if (style.display === 'none' || (!measuring && style.visibility === 'hidden')) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      bottom = Math.max(bottom, rect.bottom - pageRect.top);
    });
    return bottom;
  }

  function fits(page, content) {
    return visualBottom(page, content) <= availableBottom(page) + 1;
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


  function guidanceChapter(section) {
    const node = document.createElement('div');
    node.className = 'kalq-guidance-chapter';
    node.dataset.kalqChapterKey = section.key;
    node.innerHTML = `<div class="kalq-output-chapter-kicker">${section.eyebrow}</div><h2>${section.title}</h2><p>${section.description}</p>`;
    return node;
  }

  function paginateGuidanceSections(root, template, reportName, sections) {
    const made = [];
    let shell = null;
    let activeKey = null;
    let inlineHost = false;

    /* If the final analytical page would otherwise be mostly empty, begin the
       first guidance chapter in its unused lower area. Output still comes first
       and a strong divider/gap keeps the two parts visually separate. This is
       used only when there is enough room to avoid crowding. */
    const outputPages = pages(root).filter((page) => isVisiblePage(page) && !page.classList.contains(GROUP_CLASS));
    const lastOutput = outputPages.at(-1);
    if (lastOutput) {
      const inlineThreshold = orientationKey(lastOutput) === 'landscape' ? 150 : 245;
      if (outputFreeSpace(lastOutput) >= inlineThreshold) {
      const content = document.createElement('div');
      content.className = 'kalq-inline-guidance-content';
      lastOutput.insertBefore(content, lastOutput.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));
        shell = { page: lastOutput, content };
        inlineHost = true;
      }
    }

    const make = (section, continued = false) => {
      const title = continued ? `${section.title} — Continued` : section.title;
      shell = shellFrom(template, reportName, title, section.eyebrow, section.description);
      shell.page.dataset.kalqReportGroup = section.key;
      pageHost(root).append(shell.page);
      made.push(shell.page);
      activeKey = section.key;
      inlineHost = false;
    };

    const removeEmptyInline = () => {
      if (inlineHost && shell?.content && !shell.content.children.length) {
        shell.content.remove();
        shell = null;
        inlineHost = false;
      }
    };

    sections.filter((section) => section.units.length).forEach((section) => {
      if (!shell) make(section, false);

      /* Avoid orphaning the beginning of a new guidance section at the bottom
         of a page. If the whole incoming section does not fit in the remaining
         space, begin it on a fresh page instead. The inline first guidance
         section is exempt so useful leftover space after output can be used. */
      if (!inlineHost && activeKey && activeKey !== section.key && shell.content.children.length) {
        const probe = guidanceChapter(section);
        shell.content.append(probe);
        section.units.forEach((unit) => shell.content.append(unit));
        const wholeFits = fits(shell.page, shell.content);
        section.units.forEach((unit) => unit.remove());
        probe.remove();
        const freeNow = outputFreeSpace(shell.page);
        if (!wholeFits && freeNow < 55 * 3.78) make(section, false);
      }

      let chapter = null;
      if (activeKey !== section.key || inlineHost) {
        chapter = guidanceChapter(section);
        shell.content.append(chapter);
      }

      section.units.forEach((unit, unitIndex) => {
        unit.dataset.kalqGuidanceKey = section.key;
        shell.content.append(unit);
        if (fits(shell.page, shell.content)) {
          activeKey = section.key;
          return;
        }

        unit.remove();
        if (chapter && chapter.isConnected && chapter === shell.content.lastElementChild) chapter.remove();
        removeEmptyInline();
        const continued = activeKey === section.key || unitIndex > 0;
        make(section, continued);
        shell.content.append(unit);
        chapter = null;

        if (!fits(shell.page, shell.content)) shell.page.dataset.kalqOversized = 'true';
        activeKey = section.key;
      });
      activeKey = section.key;
    });
    removeEmptyInline();
    return made;
  }

  function mergeSparseFinalGuidance(root, sections) {
    const spec = Object.fromEntries(sections.map((section) => [section.key, section]));
    const groupPages = pages(root).filter((page) => page.classList.contains(GROUP_CLASS) && isVisiblePage(page));
    if (groupPages.length < 2) return;
    const last = groupPages.at(-1);
    const prev = groupPages.at(-2);
    if (orientationKey(last) !== orientationKey(prev)) return;
    if (last.dataset.kalqReportGroup !== 'resources') return;
    if (outputFreeSpace(last) < 330) return;

    const prevKey = prev.dataset.kalqReportGroup;
    const prevSpec = spec[prevKey];
    const resourceSpec = spec.resources;
    if (!prevSpec || !resourceSpec) return;
    const from = prev.querySelector(':scope > .kalq-report-group-content');
    const to = last.querySelector(':scope > .kalq-report-group-content');
    if (!from || !to || from.children.length < 2) return;

    const resourceChapter = guidanceChapter(resourceSpec);
    resourceChapter.classList.add('kalq-resource-chapter');
    to.prepend(resourceChapter);
    let insertionPoint = resourceChapter;
    let moved = 0;

    while (from.children.length > 1 && outputFreeSpace(last) > 230) {
      const candidate = from.lastElementChild;
      if (!candidate || candidate.classList.contains('kalq-guidance-chapter')) break;
      to.insertBefore(candidate, insertionPoint);
      insertionPoint = candidate;
      if (!fits(last, to)) {
        candidate.remove();
        from.append(candidate);
        break;
      }
      moved += 1;
    }

    if (!moved) {
      resourceChapter.remove();
      return;
    }
    updateGuidancePageTitle(last, prevSpec, true);
    last.dataset.kalqReportGroup = 'combined-final';
  }

  function updateGuidancePageTitle(page, section, continued = true) {
    if (!page || !section) return;
    const title = page.querySelector(':scope > .report-title h1');
    const eyebrow = page.querySelector(':scope > .report-title .eyebrow');
    const desc = page.querySelector(':scope > .report-title p');
    if (title) title.textContent = `${section.title}${continued ? ' — Continued' : ''}`;
    if (eyebrow) eyebrow.textContent = section.eyebrow;
    if (desc) desc.textContent = section.description;
    page.dataset.kalqReportGroup = section.key;
  }

  function balanceGuidancePages(root, sections) {
    const spec = Object.fromEntries(sections.map((section) => [section.key, section]));
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 80) {
      changed = false;
      const groupPages = pages(root).filter((page) => page.classList.contains(GROUP_CLASS) && isVisiblePage(page));
      for (let i = 0; i < groupPages.length - 1; i += 1) {
        const current = groupPages[i];
        const next = groupPages[i + 1];
        if (orientationKey(current) !== orientationKey(next)) continue;
        if (current.dataset.kalqReportGroup !== next.dataset.kalqReportGroup) continue;
        const currentFree = outputFreeSpace(current);
        const nextFree = outputFreeSpace(next);
        if (nextFree - currentFree < 180) continue;

        const from = current.querySelector(':scope > .kalq-report-group-content');
        const to = next.querySelector(':scope > .kalq-report-group-content');
        if (!from || !to || from.children.length < 2) continue;
        const movable = from.lastElementChild;
        if (!movable || movable.classList.contains('kalq-guidance-chapter')) continue;
        const key = movable.dataset.kalqGuidanceKey || current.dataset.kalqReportGroup;
        const incoming = spec[key];
        if (!incoming) continue;

        const nextKey = next.dataset.kalqReportGroup;
        if (key !== nextKey) {
          const existing = spec[nextKey];
          if (existing && !to.querySelector(`:scope > .kalq-guidance-chapter[data-kalq-chapter-key="${nextKey}"]`)) {
            const chapter = guidanceChapter(existing);
            chapter.dataset.kalqChapterKey = nextKey;
            to.prepend(chapter);
          }
          updateGuidancePageTitle(next, incoming, true);
        }

        to.prepend(movable);
        if (!fits(next, to)) {
          movable.remove();
          from.append(movable);
          continue;
        }
        changed = true;
        break;
      }
    }
  }


  function absorbSparseFirstGuidance(root) {
    const output = pages(root).filter((page) => isVisiblePage(page) && !page.classList.contains(GROUP_CLASS));
    const groups = pages(root).filter((page) => isVisiblePage(page) && page.classList.contains(GROUP_CLASS));
    const lastOutput = output.at(-1);
    const firstGuide = groups[0];
    if (!lastOutput || !firstGuide) return false;
    if (orientationKey(lastOutput) !== orientationKey(firstGuide)) return false;
    if (outputFreeSpace(lastOutput) < (orientationKey(lastOutput) === 'landscape' ? 130 : 190)) return false;
    if (outputFreeSpace(firstGuide) < 420) return false;

    const source = firstGuide.querySelector(':scope > .kalq-report-group-content');
    if (!source) return false;
    const units = [...source.children].filter((child) => !child.classList.contains('kalq-guidance-chapter') && meaningful(child));
    if (!units.length) return false;

    let inline = lastOutput.querySelector(':scope > .kalq-inline-guidance-content');
    let created = false;
    if (!inline) {
      inline = document.createElement('div');
      inline.className = 'kalq-inline-guidance-content';
      lastOutput.insertBefore(inline, lastOutput.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));
      created = true;
    }

    const title = clean(firstGuide.querySelector(':scope > .report-title h1')?.textContent).replace(/\s*[—-]\s*Continued\s*$/i, '');
    const eyebrow = clean(firstGuide.querySelector(':scope > .report-title .eyebrow')?.textContent);
    const desc = clean(firstGuide.querySelector(':scope > .report-title p')?.textContent);
    const chapter = document.createElement('div');
    chapter.className = 'kalq-guidance-chapter kalq-inline-guidance-chapter';
    chapter.innerHTML = `${eyebrow ? `<div class="kalq-output-chapter-kicker">${eyebrow}</div>` : ''}${title ? `<h2>${title}</h2>` : ''}${desc ? `<p>${desc}</p>` : ''}`;
    inline.append(chapter);

    let moved = 0;
    for (const unit of units) {
      inline.append(unit);
      if (visualBottom(lastOutput, inline) > availableBottom(lastOutput) + 1) {
        unit.remove();
        source.insertBefore(unit, source.children[moved] || null);
        break;
      }
      moved += 1;
    }

    if (!moved) {
      chapter.remove();
      if (created && !inline.children.length) inline.remove();
      return false;
    }
    if (![...source.children].some((child) => !child.classList.contains('kalq-guidance-chapter') && meaningful(child))) firstGuide.remove();
    else markContinuationTitle(firstGuide);
    return true;
  }

  function fillSparseGuidancePages(root, sections = []) {
    const spec = Object.fromEntries(sections.map((section) => [section.key, section]));
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 100) {
      changed = false;
      const groupPages = pages(root).filter((page) => page.classList.contains(GROUP_CLASS) && isVisiblePage(page));
      for (let i = 0; i < groupPages.length - 1; i += 1) {
        const current = groupPages[i];
        const next = groupPages[i + 1];
        if (orientationKey(current) !== orientationKey(next)) continue;
        if (!sections.length && current.dataset.kalqReportGroup !== next.dataset.kalqReportGroup) continue;
        const currentFree = outputFreeSpace(current);
        const nextFree = outputFreeSpace(next);
        if (currentFree < 260 || currentFree - nextFree < 135) continue;

        const to = current.querySelector(':scope > .kalq-report-group-content');
        const from = next.querySelector(':scope > .kalq-report-group-content');
        if (!to || !from) continue;
        const candidate = [...from.children].find((child) => !child.classList.contains('kalq-guidance-chapter'));
        if (!candidate) continue;
        const key = candidate.dataset.kalqGuidanceKey || next.dataset.kalqReportGroup;
        const currentLast = [...to.children].reverse().find((child) => !child.classList.contains('kalq-guidance-chapter'));
        const lastKey = currentLast?.dataset?.kalqGuidanceKey || current.dataset.kalqReportGroup;
        let chapter = null;
        if (key && key !== lastKey && spec[key]) {
          chapter = guidanceChapter(spec[key]);
          to.append(chapter);
        }
        to.append(candidate);
        if (!fits(current, to)) {
          candidate.remove();
          from.insertBefore(candidate, [...from.children].find((child) => !child.classList.contains('kalq-guidance-chapter')) || null);

          /* A legacy guidance unit can itself be a large multi-column wrapper.
             Use the free lower area by moving whole children from the start of
             that wrapper instead of squeezing the complete wrapper onto one page. */
          const children = [...candidate.children].filter((child) => meaningful(child));
          let partial = null;
          let moved = 0;
          if (children.length >= 2) {
            partial = stripIds(candidate.cloneNode(false));
            partial.dataset.kalqGuidanceKey = key || '';
            partial.classList.add('kalq-guidance-partial');
            to.append(partial);
            for (const child of children) {
              partial.append(child);
              if (!fits(current, to)) {
                child.remove();
                candidate.insertBefore(child, candidate.children[moved] || null);
                break;
              }
              moved += 1;
            }
          }
          if (!moved) {
            partial?.remove();
            chapter?.remove();
            continue;
          }
          if ([...partial.children].filter((child) => meaningful(child)).length === 1) partial.classList.add('kalq-single-grid');
          if ([...candidate.children].filter((child) => meaningful(child)).length === 1) candidate.classList.add('kalq-single-grid');
        }

        /* Remove a now-orphaned chapter at the top of the source page. */
        const first = from.firstElementChild;
        if (first?.classList.contains('kalq-guidance-chapter')) {
          const firstUnit = [...from.children].find((child) => !child.classList.contains('kalq-guidance-chapter'));
          if (!firstUnit || first.dataset.kalqChapterKey !== firstUnit.dataset.kalqGuidanceKey) first.remove();
        }
        if (![...from.children].some((child) => !child.classList.contains('kalq-guidance-chapter') && meaningful(child))) next.remove();
        changed = true;
        break;
      }
    }
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
    if (!blocks.length) return 0;
    return Math.max(0, visualBottom(page) - availableBottom(page));
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


  function splitGridBlock(page, reportName) {
    const blocks = outputBlocks(page);
    const candidates = blocks.filter((block) =>
      block.matches?.('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid, .report-visual-grid, .report-guide-columns') &&
      [...block.children].filter((child) => meaningful(child)).length >= 2
    );
    if (!candidates.length) return false;

    const block = candidates.at(-1);
    const children = [...block.children].filter((child) => meaningful(child));
    const continuation = cloneOutputShell(page, reportName);
    const clone = stripIds(block.cloneNode(false));
    clone.classList.add('kalq-split-grid');
    block.classList.add('kalq-split-grid');
    continuation.insertBefore(clone, continuation.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));

    let moved = 0;
    while (outputOverflow(page) > 4 && children.length - moved > 1) {
      const child = block.lastElementChild;
      if (!child) break;
      clone.insertBefore(child, clone.firstChild);
      moved += 1;
    }

    if (!moved) {
      continuation.remove();
      block.classList.remove('kalq-split-grid');
      return false;
    }
    return true;
  }

  function outputFreeSpace(page) {
    const blocks = outputBlocks(page);
    const title = page.querySelector(':scope > .report-title');
    if (!blocks.length) {
      const pageRect = page.getBoundingClientRect();
      const titleBottom = title ? title.getBoundingClientRect().bottom - pageRect.top : 0;
      return Math.max(0, availableBottom(page) - titleBottom);
    }
    return Math.max(0, availableBottom(page) - visualBottom(page));
  }

  function orientationKey(page) {
    return page.classList.contains('report-landscape') || page.classList.contains('kalq-report-landscape') ? 'landscape' : 'portrait';
  }

  function chapterIntroFrom(page) {
    const title = clean(page.querySelector(':scope > .report-title h1')?.textContent).replace(/\s*[—-]\s*Continued\s*$/i, '');
    if (!title) return null;
    const intro = document.createElement('div');
    intro.className = 'kalq-output-chapter';
    const eyebrow = clean(page.querySelector(':scope > .report-title .eyebrow')?.textContent);
    const desc = clean(page.querySelector(':scope > .report-title p')?.textContent);
    intro.innerHTML = `${eyebrow ? `<div class="kalq-output-chapter-kicker">${eyebrow}</div>` : ''}<h2>${title}</h2>${desc ? `<p>${desc}</p>` : ''}`;
    return intro;
  }

  function markContinuationTitle(page) {
    const heading = page.querySelector(':scope > .report-title h1');
    if (heading && !/continued/i.test(clean(heading.textContent))) heading.textContent = `${clean(heading.textContent)} — Continued`;
    const desc = page.querySelector(':scope > .report-title p');
    if (desc) desc.textContent = 'Continuation of the detailed output from the previous report page.';
  }


  function normalizeChartCallouts(root) {
    pages(root).forEach((page) => {
      page.querySelectorAll(':scope > .report-grid-2, :scope > .analysis-grid').forEach((grid) => {
        const children = [...grid.children].filter((child) => meaningful(child));
        if (children.length !== 2) return;
        const callout = children.find((child) => child.matches('.report-callout, .report-note-band'));
        const other = children.find((child) => child !== callout);
        if (!callout || !other) return;
        const text = clean(callout.textContent);
        const hasChartBefore = Boolean(grid.previousElementSibling?.querySelector?.('svg,canvas,.report-chart,.chart') || page.querySelector('svg,canvas,.report-chart,.chart'));
        const pairedFindings = other.matches('.report-findings') || Boolean(other.querySelector('.report-finding'));
        if (!hasChartBefore || !pairedFindings || !/reading|chart|visual|interpret/i.test(text)) return;
        grid.before(callout);
        grid.before(other);
        grid.remove();
        callout.classList.add('kalq-output-block');
        other.classList.add('kalq-output-block');
      });
    });
  }

  function pullPartialContainer(page, next, candidate) {
    const children = [...candidate.children].filter((child) => meaningful(child));
    if (children.length < 2) return false;
    if (!candidate.matches('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid, .report-timeline, .report-process, .report-plan, .report-mini-grid, .report-line-grid, .report-stats-4, .report-findings, .growth-findings')) return false;

    const clone = stripIds(candidate.cloneNode(false));
    clone.classList.add('kalq-output-block', 'kalq-partial-pull');
    page.insertBefore(clone, page.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));
    let moved = 0;
    for (const child of children) {
      clone.append(child);
      if (outputOverflow(page) > 4) {
        child.remove();
        candidate.insertBefore(child, candidate.children[moved] || null);
        break;
      }
      moved += 1;
    }

    if (!moved) {
      clone.remove();
      return false;
    }
    if (![...candidate.children].some((child) => meaningful(child))) candidate.remove();
    markContinuationTitle(next);
    return true;
  }

  function normalizeGridUse(root) {
    pages(root).forEach((page) => {
      const portrait = orientationKey(page) === 'portrait';
      page.querySelectorAll('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid, .report-visual-grid, .report-guide-columns').forEach((grid) => {
        grid.classList.remove('kalq-stack-grid', 'kalq-balanced-two', 'kalq-balanced-three');
        const children = [...grid.children].filter((child) => meaningful(child));
        if (!children.length) return;
        const lengths = children.map((child) => clean(child.textContent).length);
        const total = lengths.reduce((a, b) => a + b, 0);
        const max = Math.max(...lengths, 1);
        const min = Math.min(...lengths);

        if (!portrait) return;

        /* Two columns are useful only when both sides have enough content and
           broadly comparable visual weight. Otherwise one full-width column is
           cleaner and avoids the 'tiny island beside a blank half-page' look. */
        if (children.length === 2) {
          const longForm = total > 760 || max > 520;
          const badlyUnbalanced = min / max < .52;
          if (longForm || badlyUnbalanced) grid.classList.add('kalq-stack-grid');
          else grid.classList.add('kalq-balanced-two');
          return;
        }

        /* Three short metric items may remain three columns. Explanatory
           material uses two columns so the text is not cramped. */
        if (children.length === 3) {
          if (total > 330 || max > 150) grid.classList.add('kalq-balanced-two');
          else grid.classList.add('kalq-balanced-three');
          return;
        }

        /* Four-or-more items become two-column rows on portrait pages. */
        if (children.length >= 4) grid.classList.add('kalq-balanced-two');
      });
    });
  }

  function partialTableClone(candidate) {
    const table = candidate.matches?.('table') ? candidate : candidate.querySelector?.('table');
    if (!table) return null;
    const rows = [...table.querySelectorAll('tbody > tr')];
    if (rows.length < 6) return null;
    const shell = stripIds(candidate.cloneNode(true));
    const shellTable = shell.matches?.('table') ? shell : shell.querySelector?.('table');
    const body = shellTable?.querySelector('tbody');
    if (!body) return null;
    body.innerHTML = '';
    shell.classList?.add('kalq-partial-table');
    return { shell, body, table, rows };
  }

  function pullPartialTable(page, next, candidate) {
    const data = partialTableClone(candidate);
    if (!data) return false;
    const { shell, body, table, rows } = data;
    const sourceBody = table.querySelector('tbody');
    if (!sourceBody) return false;

    page.insertBefore(shell, page.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));
    let moved = 0;
    for (const row of rows) {
      body.append(row);
      if (outputOverflow(page) > 4) {
        row.remove();
        sourceBody.insertBefore(row, sourceBody.children[moved] || null);
        break;
      }
      moved += 1;
    }

    if (moved < 3) {
      /* Put moved rows back in their original order. */
      [...body.children].reverse().forEach((row) => sourceBody.insertBefore(row, sourceBody.firstChild));
      shell.remove();
      return false;
    }

    if (!sourceBody.rows.length) candidate.remove();
    markContinuationTitle(next);
    return true;
  }

  function balanceSparseOutputPages(root, reportName) {
    let guard = 0;
    let changed = true;
    while (changed && guard++ < 100) {
      changed = false;
      const out = pages(root).filter((page) => isVisiblePage(page) && !page.classList.contains(GROUP_CLASS));
      for (let i = 0; i < out.length - 1; i += 1) {
        const page = out[i];
        const next = out[i + 1];
        if (orientationKey(page) !== orientationKey(next)) continue;
        if (outputFreeSpace(page) < 34 * 3.78) continue; // about 34 mm of genuine trailing whitespace

        const nextBlocks = outputBlocks(next);
        if (!nextBlocks.length) continue;
        const candidate = nextBlocks[0];
        const currentBase = clean(page.querySelector(':scope > .report-title h1')?.textContent).replace(/\s*[—-]\s*Continued\s*$/i, '');
        const nextBase = clean(next.querySelector(':scope > .report-title h1')?.textContent).replace(/\s*[—-]\s*Continued\s*$/i, '');
        const existingChapter = [...page.querySelectorAll(':scope > .kalq-output-chapter h2')]
          .some((heading) => clean(heading.textContent).replace(/\s*[—-]\s*Continued\s*$/i, '') === nextBase);
        const sameChapter = next.classList.contains('kalq-output-continuation') || currentBase === nextBase || existingChapter;
        const intro = sameChapter ? null : chapterIntroFrom(next);

        if (intro) page.insertBefore(intro, page.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));
        page.insertBefore(candidate, page.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));

        if (outputOverflow(page) > 4) {
          candidate.remove();
          insertContentAtStart(next, candidate);
          intro?.remove();
          if (pullPartialContainer(page, next, candidate) || pullPartialTable(page, next, candidate)) {
            changed = true;
            if (!outputBlocks(next).length) next.remove();
            break;
          }
          continue;
        }

        candidate.classList.add('kalq-output-block');
        changed = true;
        if (!sameChapter) markContinuationTitle(next);

        if (!outputBlocks(next).length) next.remove();
        break;
      }
    }
  }


  function updateTablePageRange(page, table) {
    const rows = [...table.querySelectorAll('tbody > tr')];
    const range = rowRange(rows);
    if (!range) return;
    const heading = page.querySelector(':scope > .report-title h1');
    if (heading) {
      heading.textContent = heading.textContent.replace(/Payments?\s+\d+\s*[–-]\s*\d+/i, `Payments ${range.first}–${range.last}`);
      heading.textContent = heading.textContent.replace(/Rows?\s+\d+\s*[–-]\s*\d+/i, `Rows ${range.first}–${range.last}`);
      heading.textContent = heading.textContent.replace(/Months?\s+\d+\s*[–-]\s*\d+/i, `Months ${range.first}–${range.last}`);
    }
    updateScheduleMeta(page, rows);
  }

  function balanceAdjacentTables(root) {
    let guard = 0;
    let changed = true;
    while (changed && guard++ < 160) {
      changed = false;
      const out = pages(root).filter((page) => isVisiblePage(page) && !page.classList.contains(GROUP_CLASS));
      for (let i = 0; i < out.length - 1; i += 1) {
        const prev = out[i], next = out[i + 1];
        if (orientationKey(prev) !== orientationKey(next)) continue;
        const prevTable = [...prev.querySelectorAll('table')].at(-1);
        const nextTable = [...next.querySelectorAll('table')][0];
        if (!prevTable || !nextTable) continue;
        const a = [...prevTable.querySelectorAll('tbody > tr')];
        const b = [...nextTable.querySelectorAll('tbody > tr')];
        if (a.length < 8 || b.length < 1) continue;
        const colsA = prevTable.querySelectorAll('thead th').length || a[0]?.children.length || 0;
        const colsB = nextTable.querySelectorAll('thead th').length || b[0]?.children.length || 0;
        if (!colsA || colsA !== colsB) continue;
        const headerA = clean(prevTable.querySelector('thead')?.textContent);
        const headerB = clean(nextTable.querySelector('thead')?.textContent);
        if (headerA && headerB && headerA !== headerB) continue;

        const prevFree = outputFreeSpace(prev), nextFree = outputFreeSpace(next);
        if (nextFree - prevFree < 115) continue;
        const row = prevTable.querySelector('tbody > tr:last-child');
        if (!row) continue;
        const nextBody = nextTable.querySelector('tbody');
        nextBody.insertBefore(row, nextBody.firstChild);
        if (outputOverflow(next) > 4 || prevTable.querySelectorAll('tbody > tr').length < 6) {
          row.remove();
          prevTable.querySelector('tbody').append(row);
          continue;
        }
        updateTablePageRange(prev, prevTable);
        updateTablePageRange(next, nextTable);
        changed = true;
        break;
      }
    }
  }

  function pushPartialContainer(prev, next, candidate) {
    if (!candidate?.matches?.('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid, .report-timeline, .report-process, .report-plan, .report-mini-grid, .report-line-grid, .report-stats-4, .report-findings, .growth-findings, .report-visual-grid, .report-guide-columns')) return false;
    const children = [...candidate.children].filter((child) => meaningful(child));
    if (children.length < 2) return false;

    const beforePrev = outputFreeSpace(prev);
    const beforeNext = outputFreeSpace(next);
    const beforeDiff = Math.abs(beforePrev - beforeNext);
    const clone = stripIds(candidate.cloneNode(false));
    clone.classList.add('kalq-output-block', 'kalq-partial-push');
    insertContentAtStart(next, clone);

    let moved = 0;
    for (let i = children.length - 1; i >= 1; i -= 1) {
      const child = children[i];
      clone.insertBefore(child, clone.firstChild);
      if (outputOverflow(next) > 4) {
        child.remove();
        candidate.append(child);
        break;
      }
      moved += 1;
      const afterDiff = Math.abs(outputFreeSpace(prev) - outputFreeSpace(next));
      /* One well-balanced move is preferable to moving an entire grid and
         creating another sparse continuation page. */
      if (afterDiff + 24 < beforeDiff) break;
    }

    if (!moved) {
      clone.remove();
      return false;
    }

    const remain = [...candidate.children].filter((child) => meaningful(child));
    const pushed = [...clone.children].filter((child) => meaningful(child));
    if (remain.length === 1) candidate.classList.add('kalq-single-grid');
    if (pushed.length === 1) clone.classList.add('kalq-single-grid');
    markContinuationTitle(next);
    return true;
  }

  function balanceTrailingOutputPages(root) {
    let guard = 0;
    let changed = true;
    while (changed && guard++ < 80) {
      changed = false;
      const out = pages(root).filter((page) => isVisiblePage(page) && !page.classList.contains(GROUP_CLASS));
      for (let i = out.length - 1; i > 0; i -= 1) {
        const next = out[i];
        const prev = out[i - 1];
        if (orientationKey(prev) !== orientationKey(next)) continue;
        const beforePrev = outputFreeSpace(prev);
        const beforeNext = outputFreeSpace(next);
        if (beforeNext < 230 || beforeNext - beforePrev < 150) continue;

        const prevBlocks = outputBlocks(prev);
        if (prevBlocks.length < 2) continue;
        let candidate = prevBlocks.at(-1);
        if (!candidate || candidate.classList.contains('kalq-output-chapter')) continue;
        const previousSibling = candidate.previousElementSibling;
        const moveChapter = previousSibling?.classList?.contains('kalq-output-chapter') ? previousSibling : null;
        const nextFirst = contentInsertPoint(next);
        if (moveChapter) insertContentAtStart(next, moveChapter);
        insertContentAtStart(next, candidate);

        const afterPrev = outputFreeSpace(prev);
        const afterNext = outputFreeSpace(next);
        const fitsNext = outputOverflow(next) <= 4;
        const prevStillUseful = outputBlocks(prev).length > 0 && afterPrev < 430;
        const improvement = Math.abs(afterPrev - afterNext) + 30 < Math.abs(beforePrev - beforeNext);

        if (!fitsNext || !prevStillUseful || !improvement) {
          candidate.remove();
          prev.insertBefore(candidate, prev.querySelector(':scope > .report-footer, :scope > .kalq-report-footer'));
          if (moveChapter) {
            moveChapter.remove();
            prev.insertBefore(moveChapter, candidate);
          }
          /* When a whole multi-item grid is too large to move, split that
             grid instead. This keeps both continuation pages useful without
             shrinking text or leaving a half-empty page. */
          if (pushPartialContainer(prev, next, candidate)) {
            changed = true;
            break;
          }
          continue;
        }
        changed = true;
        break;
      }
    }
  }

  function rowifyPortraitGrids(root) {
    pages(root).forEach((page) => {
      if (orientationKey(page) !== 'portrait' || page.classList.contains(GROUP_CLASS)) return;
      [...page.querySelectorAll(':scope > .report-grid-4, :scope > .analysis-grid.report-grid-2')].forEach((grid) => {
        if (grid.dataset.kalqRowified === 'true') return;
        const children = [...grid.children].filter((child) => meaningful(child));
        if (children.length < 4) return;
        const rows = [];
        for (let i = 0; i < children.length; i += 2) {
          const row = document.createElement('div');
          row.className = 'kalq-grid-row';
          children.slice(i, i + 2).forEach((child) => row.append(child));
          grid.before(row);
          rows.push(row);
        }
        grid.remove();
        rows.forEach((row) => row.classList.add('kalq-output-block'));
      });
    });
  }

  function normalizeGridDensity(root) {
    pages(root).forEach((page) => {
      page.querySelectorAll('.report-grid-3, .report-grid-4, .analysis-grid, .report-visual-grid, .report-guide-columns').forEach((grid) => {
        const children = [...grid.children].filter((child) => meaningful(child));
        if (!children.length) return;
        const avg = children.reduce((sum, child) => sum + clean(child.textContent).length, 0) / children.length;
        grid.classList.toggle('kalq-text-grid', avg >= 72);
      });
    });
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
      if (splitGridBlock(page, reportName)) continue;
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

  function removeDuplicateOutputChapters(root) {
    pages(root).forEach((page) => {
      if (!isVisiblePage(page) || page.classList.contains(GROUP_CLASS)) return;
      const base = clean(page.querySelector(':scope > .report-title h1')?.textContent)
        .replace(/\s*[—-]\s*Continued\s*$/i, '');
      const seen = new Set();
      [...page.querySelectorAll(':scope > .kalq-output-chapter')].forEach((chapter) => {
        const heading = clean(chapter.querySelector('h2')?.textContent)
          .replace(/\s*[—-]\s*Continued\s*$/i, '');
        if (!heading || heading === base || seen.has(heading)) {
          chapter.remove();
          return;
        }
        seen.add(heading);
      });
    });
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
        const perGap = free / Math.max(1, blocks.length - 1);
        const mm = Math.min(12, Math.max(6, 5 + perGap / 3.78));
        page.style.setProperty('--kalq-flow-gap', `${mm.toFixed(2)}mm`);
        if (free > 90) {
          page.classList.add('kalq-sparse-page');
          page.style.setProperty('--kalq-sparse-row-pad', '4.6mm');
        } else {
          page.classList.remove('kalq-sparse-page');
        }
      }
    });
  }


  function strictMixedGuidanceKind(node) {
    if (!(node instanceof HTMLElement)) return null;
    const heading = headingText(node);
    const cls = typeof node.className === 'string' ? node.className : '';
    const sample = `${heading} ${clean(node.textContent).slice(0, 520)}`;

    if (/\bfaq(?:s)?\b|frequently asked/i.test(heading)) return 'faq';
    if (REF_RE.test(heading)) return 'references';
    if (RELATED_RE.test(heading)) return 'related';
    if (/\bdisclaimer\b|\blimitations?\b|\blimits?\b|\bnot included\b|\bexcluded\b|\bscope\b|\bboundar(?:y|ies)\b|\bwhat .* does not\b/i.test(heading)) return 'disclaimer';
    if (/\bassumptions?\b|\bcalculation method\b|\bmethodology\b|\bformula\b|\bworked calculation\b|\binput validation\b|\bverification check\b|\bconversion assumptions?\b|\bpayroll calendar considerations?\b|\bhow (?:the|this) calculation works\b|\bhow .* is (?:calculated|produced|derived)\b/i.test(heading)) return 'method';
    if (/\btips?\b|\bcommon mistakes?\b|\bbest practices?\b|\bpractical guidance\b|\bpractical planning\b|\baction plan\b|\breview checklist\b|\bchecks? before\b|\bquestions? for (?:a )?(?:doctor|midwife)\b|\bpersonal planning\b|\bbirth preparation\b|\bpractice plan\b|\bfollow-up\b|\bteacher or parent comments?\b/i.test(heading)) return 'tips';
    if (/\bhow to use\b|\bunderstanding (?:your|the) result\b|\binterpretation guide\b|\bhow to interpret\b|\bhow to read\b|\breading note\b|\breading the visual\b/i.test(heading)) return 'understanding';

    if (/\breport-process\b/.test(cls)) return 'method';
    if (/\breport-timeline\b/.test(cls) && /review|recalculate|check|confirm|maintain|setup/i.test(sample)) return 'tips';
    if (/\breport-references\b|\brefs\b/.test(cls)) return 'references';
    return null;
  }

  function emptyBuckets() {
    return {
      understanding: [], method: [], tips: [], guidance: [], faq: [],
      references: [], related: [], disclaimer: []
    };
  }

  function pushGuidanceBucket(buckets, kind, node) {
    if (!kind || !node) return;
    if (kind === 'faq') {
      const items = faqItemsFrom(node);
      if (items.length) items.forEach((item) => buckets.faq.push(item));
      else buckets.faq.push(node);
      return;
    }
    (buckets[kind] || buckets.guidance).push(node);
  }

  function extractMixedGuidance(outputPages) {
    const buckets = emptyBuckets();
    outputPages.forEach((page) => {
      /* First pull clearly instructional nested sections out of mixed output
         pages. Many legacy reports placed How to use / assumptions / limits /
         FAQs inside an otherwise analytical grid, so page-level detection alone
         could never separate output from guidance consistently. */
      const nestedCandidates = [...page.querySelectorAll('.report-section, .analysis-panel, .report-process, .report-timeline')];
      const movedNested = new Set();
      nestedCandidates.forEach((node) => {
        if (!(node instanceof HTMLElement) || node.closest('.report-page') !== page) return;
        if ([...movedNested].some((parent) => parent.contains(node))) return;
        const kind = strictMixedGuidanceKind(node);
        if (!kind) return;
        movedNested.add(node);
        node.remove();
        pushGuidanceBucket(buckets, kind, node);
      });

      page.querySelectorAll('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid, .report-guide-columns, .report-visual-grid').forEach((grid) => {
        const remaining = [...grid.children].filter((child) => meaningful(child));
        if (!remaining.length) grid.remove();
        else if (remaining.length === 1) grid.classList.add('kalq-single-grid');
      });

      const blocks = [...page.children].filter((node) =>
        node instanceof HTMLElement && !node.matches(STRUCTURAL) && meaningful(node)
      );

      blocks.forEach((block) => {
        /* A few legacy reports use neutral wrappers (for example note bands)
           whose direct children are the real semantic sections. Split those
           children first so an analytical item can remain on the output page
           while assumptions / limits / checklist content moves to guidance. */
        const semanticChildren = [...block.children].filter((child) =>
          child instanceof HTMLElement && meaningful(child) && child.querySelector(':scope > h2, :scope > h3, :scope > h4')
        );
        if (semanticChildren.length >= 2) {
          let movedSemantic = 0;
          semanticChildren.forEach((child) => {
            const kind = strictMixedGuidanceKind(child);
            if (!kind) return;
            child.remove();
            pushGuidanceBucket(buckets, kind, child);
            movedSemantic += 1;
          });
          if (movedSemantic) {
            const remainingSemantic = [...block.children].filter((child) => meaningful(child));
            if (!remainingSemantic.length) {
              block.remove();
              return;
            }
            if (remainingSemantic.length === 1) block.classList.add('kalq-single-semantic');
          }
        }

        const isGrid = block.matches('.report-grid-2, .report-grid-3, .report-grid-4, .analysis-grid, .report-guide-columns, .report-visual-grid');
        if (isGrid) {
          const children = [...block.children].filter((child) => meaningful(child));
          let moved = 0;
          children.forEach((child) => {
            const kind = strictMixedGuidanceKind(child);
            if (!kind) return;
            child.remove();
            pushGuidanceBucket(buckets, kind, child);
            moved += 1;
          });
          const remaining = [...block.children].filter((child) => meaningful(child));
          if (!remaining.length) {
            block.remove();
            return;
          }
          if (remaining.length === 1) block.classList.add('kalq-single-grid');
          if (moved) return;
        }

        const kind = strictMixedGuidanceKind(block);
        if (kind) {
          block.remove();
          pushGuidanceBucket(buckets, kind, block);
        }
      });
    });
    return buckets;
  }

  function bucketCount(buckets) {
    return Object.values(buckets).reduce((sum, items) => sum + items.length, 0);
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
      const authoredOutputPages = allPages.filter((page) =>
        !page.classList.contains(GROUP_CLASS) && isVisiblePage(page) && !isGuidancePage(page)
      );
      const mixedBuckets = extractMixedGuidance(authoredOutputPages);
      const hasMixedGuidance = bucketCount(mixedBuckets) > 0;

      /* Re-running after our own pagination must be idempotent. Once authored
         guidance has been converted into generated group pages, never discard
         those groups merely because a later output-balancing pass creates a
         block whose text happens to look instructional. Fresh authored guidance
         pages still trigger a complete rebuild when the calculator itself
         regenerates the report. */
      if ((existingGroups.length && !authoredGuidePages.length) || (!existingGroups.length && !authoredGuidePages.length && !hasMixedGuidance)) {
        rowifyPortraitGrids(root);
        normalizeGridDensity(root);
        normalizeGridUse(root);
        normalizeChartCallouts(root);
        normalizeOutputPages(root, reportName);
        reflowOverflowingOutputPages(root, reportName);
        balanceAdjacentTables(root);
        balanceSparseOutputPages(root, reportName);
        balanceTrailingOutputPages(root);
        absorbSparseFirstGuidance(root);
        fillSparseGuidancePages(root);
        removeDuplicateOutputChapters(root);
        normalizeGridDensity(root);
        normalizeGridUse(root);
        normalizeOutputPages(root, reportName);
        renumber(root, reportName);
        return;
      }

      existingGroups.forEach((page) => page.remove());
      const guidePages = authoredGuidePages;
      normalizeOutputPages(root, reportName);

      if (guidePages.length || hasMixedGuidance) {
        const template = guidePages[0] || authoredOutputPages.at(-1) || allPages[0];
        const buckets = emptyBuckets();
        Object.keys(buckets).forEach((key) => buckets[key].push(...mixedBuckets[key]));

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

        /* Finish and balance the analytical output before guidance starts.
           The first guidance section may then use safe leftover space on the
           final output page, always after the last result block and behind a
           clear section divider. */
        rowifyPortraitGrids(root);
        normalizeGridDensity(root);
        normalizeGridUse(root);
        normalizeChartCallouts(root);
        normalizeOutputPages(root, reportName);
        reflowOverflowingOutputPages(root, reportName);
        balanceAdjacentTables(root);
        balanceSparseOutputPages(root, reportName);
        balanceTrailingOutputPages(root);
        normalizeOutputPages(root, reportName);

        const guidanceSections = [
          {
            key: 'understanding',
            eyebrow: 'Interpretation & practical use',
            title: 'Understanding Your Result',
            description: 'How to read the result and use the report in a clear, practical way.',
            units: understandingFlow
          },
          {
            key: 'method',
            eyebrow: 'Method & calculation',
            title: 'Method & Formula',
            description: 'How the calculation works, the formulas used, assumptions, and worked-method notes.',
            units: buckets.method
          },
          {
            key: 'tips',
            eyebrow: 'Practical guidance',
            title: 'Tips & Common Mistakes',
            description: 'Useful ways to apply the result and common interpretation or input mistakes to avoid.',
            units: buckets.tips
          },
          {
            key: 'faq',
            eyebrow: 'Questions',
            title: 'Frequently Asked Questions',
            description: 'Clear answers to the most useful questions about this result and how to interpret it.',
            units: buckets.faq
          },
          {
            key: 'resources',
            eyebrow: 'Sources & final notes',
            title: 'References, Related Tools & Disclaimer',
            description: 'Sources, useful next-step calculators, scope, limitations, and final report notes.',
            units: resourceFlow
          }
        ];
        paginateGuidanceSections(root, template, reportName, guidanceSections);
        balanceGuidancePages(root, guidanceSections);
        fillSparseGuidancePages(root, guidanceSections);
        balanceGuidancePages(root, guidanceSections);
        absorbSparseFirstGuidance(root);
        mergeSparseFinalGuidance(root, guidanceSections);
      }

      /* Guidance pages are always appended after authored output pages. */
      rowifyPortraitGrids(root);
      normalizeGridDensity(root);
      normalizeGridUse(root);
      normalizeChartCallouts(root);
      normalizeOutputPages(root, reportName);
      reflowOverflowingOutputPages(root, reportName);
      balanceAdjacentTables(root);
      balanceSparseOutputPages(root, reportName);
      balanceTrailingOutputPages(root);
      removeDuplicateOutputChapters(root);
      normalizeGridDensity(root);
      normalizeGridUse(root);
      normalizeOutputPages(root, reportName);
      renumber(root, reportName);
      requestAnimationFrame(() => {
        normalizeGridDensity(root);
        normalizeChartCallouts(root);
        normalizeOutputPages(root, reportName);
        reflowOverflowingOutputPages(root, reportName);
        balanceAdjacentTables(root);
        balanceSparseOutputPages(root, reportName);
        balanceTrailingOutputPages(root);
        removeDuplicateOutputChapters(root);
        normalizeGridDensity(root);
        normalizeGridUse(root);
        normalizeOutputPages(root, reportName);
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
      if (organizing) {
        /* Builders can append additional schedule/continuation pages while a
           first normalization pass is already running. Never drop that change;
           queue one more pass after the current layout settles. */
        setTimeout(() => schedule(root), 0);
        return;
      }
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
        setTimeout(() => organize(root), 120);
        setTimeout(() => organize(root), 360);
        setTimeout(() => organize(root), 900);
      }
    }, true);

    window.addEventListener('beforeprint', () => organize(root));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

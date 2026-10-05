(() => {
  'use strict';

  const ATLAS_URL = '/mode-symbol-atlas-v2.png';
  const ATLAS_SIZE = 1254;
  const MODE_IMAGE = {
    'unit-converter': {
      length: { src: '/unit-length-symbol.png', viewBox: [55,300,1140,650] },
      area: { src: '/unit-area-symbol.png', viewBox: [180,150,950,970] },
      volume: { src: '/unit-volume-symbol.png', viewBox: [130,190,1020,900] },
      mass: { src: '/unit-mass-symbol.png', viewBox: [0,160,1254,930] },
      temperature: { src: '/unit-temperature-symbol.png', viewBox: [330,150,700,1000] },
      temperatureDifference: { src: '/unit-temperature-difference-symbol.png', viewBox: [100,220,1050,820] },
      speed: { src: '/unit-speed-symbol.png', viewBox: [50,220,1150,800] },
      acceleration: { src: '/unit-acceleration-symbol.png', viewBox: [60,300,1120,650] },
      time: { src: '/unit-time-symbol.png', viewBox: [150,100,950,1080] },
      angle: { src: '/unit-angle-symbol.png', viewBox: [40,240,1130,730] },
      pressure: { src: '/unit-pressure-symbol.png', viewBox: [280,80,700,1100] },
      energy: { src: '/unit-energy-symbol.png', viewBox: [280,190,720,930] },
      power: { src: '/unit-power-symbol.png', viewBox: [120,160,1000,920] },
      force: { src: '/unit-force-symbol.png', viewBox: [130,230,980,760] },
      density: { src: '/unit-density-symbol.png', viewBox: [40,170,1160,850] },
      frequency: { src: '/unit-frequency-symbol.png', viewBox: [20,300,1210,650] },
      storage: { src: '/unit-storage-symbol.png', viewBox: [170,180,950,900] },
      transfer: { src: '/unit-transfer-symbol.png', viewBox: [160,250,930,760] },
      fuel: { src: '/unit-fuel-symbol.png', viewBox: [200,140,850,980] },
      torque: { src: '/unit-torque-symbol.png', viewBox: [120,100,1050,1050] },
      flow: { src: '/unit-flow-symbol.png', viewBox: [60,240,1120,760] }
    },
    'apy-calculator': {
      default: { src: '/apy-calculator-symbol.png', viewBox: [250,150,850,1000] }
    },
    'tile-calculator': {
      floor: { src: '/tile-floor-symbol.png', viewBox: [85,220,1080,850] },
      wall: { src: '/tile-wall-symbol.png', viewBox: [150,250,1000,760] },
      size: { src: '/tile-size-symbol.png', viewBox: [65,215,1125,825] },
      grout: { src: '/tile-grout-symbol.png', viewBox: [145,175,975,930] },
      waste: { src: '/tile-waste-symbol.png', viewBox: [175,195,1010,935] },
      tiles: { src: '/tile-tiles-symbol.png', viewBox: [145,205,980,920] },
      boxes: { src: '/tile-boxes-symbol.png', viewBox: [30,185,1190,965] },
      cost: { src: '/tile-cost-symbol.png', viewBox: [145,185,990,955] }
    },
    'season-calculator': {
      default: { src: '/season-calculator-symbol.png', viewBox: [121,123,1014,1010] },
      MET: { src: '/season-meteorological-symbol.png', viewBox: [216,104,820,998] },
      AST: { src: '/season-astronomical-symbol.png', viewBox: [85,69,1083,1073] },
      REG: { src: '/season-regional-climate-symbol.png', viewBox: [136,116,1009,1006] }
    },
    'salary-calculator': {
      default: { src: '/salary-calculator-symbol.png', viewBox: [312,280,701,700] }
    },
    'roi-calculator': {
      default: { src: '/roi-calculator-symbol.png', viewBox: [195,274,873,714] }
    },
    'periodic-table': {
      periodic: { src: '/periodic-table-symbol.png', viewBox: [141,127,980,1008] },
      search: { src: '/periodic-table-lookup-symbol.png', viewBox: [216,183,879,901] },
      compare: { src: '/periodic-table-compare-symbol.png', viewBox: [139,126,978,1012] },
      trend: { src: '/periodic-table-trend-symbol.png', viewBox: [152,358,964,627] },
      config: { src: '/periodic-table-config-symbol.png', viewBox: [161,130,932,992] }
    }
  };
  const ICON_VIEWBOXES = [
    [24,30,90,89],[128,30,86,89],[228,36,106,83],[342,29,95,90],[460,28,90,87],[570,28,94,91],[684,28,94,91],[794,23,83,96],[903,31,93,88],[1019,28,79,91],[1132,28,80,91],
    [25,152,78,77],[125,148,92,88],[236,138,96,98],[347,141,91,95],[456,140,99,96],[567,155,103,57],[686,138,81,95],[794,151,92,71],[912,142,90,94],[1026,148,83,88],[1138,142,91,94],
    [25,255,76,96],[122,259,87,92],[229,260,107,91],[348,260,88,89],[458,260,89,89],[570,253,87,96],[673,252,93,97],[790,256,100,88],[906,258,94,93],[1018,257,86,91],[1126,250,103,101],
    [19,365,95,95],[117,367,110,93],[250,370,80,91],[353,366,94,95],[456,370,98,91],[569,372,88,89],[681,375,94,84],[792,373,95,86],[909,372,90,87],[1021,372,86,87],[1132,373,102,88],
    [24,478,89,91],[126,478,96,91],[238,476,88,93],[340,495,106,74],[456,483,98,86],[570,478,92,91],[683,474,87,95],[794,470,96,93],[908,476,102,93],[1021,478,101,91],[1137,466,89,103],
    [18,589,96,92],[121,585,96,93],[232,591,91,92],[342,593,96,84],[456,593,95,87],[568,593,98,89],[680,593,104,90],[799,584,83,93],[912,586,86,93],[1026,588,97,91],[1140,587,85,91],
    [10,697,96,94],[114,703,109,88],[228,703,102,88],[342,698,97,93],[450,704,111,87],[570,698,90,93],[672,706,114,82],[791,705,108,84],[912,711,91,80],[1026,700,89,91],[1133,701,106,90],
    [14,809,100,104],[133,816,82,97],[229,814,107,99],[348,821,99,85],[457,816,97,97],[570,820,113,90],[692,809,90,104],[794,810,110,103],[930,803,66,110],[1037,805,62,108],[1134,812,110,101],
    [13,918,90,117],[114,937,113,103],[233,929,109,101],[343,942,113,77],[457,935,114,87],[588,915,88,127],[686,927,104,115],[798,933,112,98],[912,926,97,112],[1026,927,89,110],[1130,939,113,96],
    [15,1042,91,102],[125,1043,98,99],[228,1070,126,59],[365,1044,90,100],[456,1046,105,94],[566,1050,118,89],[693,1042,102,102],[804,1050,94,72],[912,1043,92,101],[1020,1045,107,99],[1135,1042,101,90],
    [13,1149,99,90],[114,1157,116,74],[254,1146,85,88],[348,1170,108,54],[464,1174,106,52],[578,1167,106,68],[684,1159,116,62],[807,1154,105,81],[934,1147,77,97],[1035,1150,91,90],[1146,1150,83,89]
  ];

  const PAGE_INDEX = {
    'apr-calculator': 20,
    'birthday-calculator': 27,
    'bmi-calculator': 21,
    'compound-interest-calculator': 28,
    'currency-converter': 29,
    'debt-consolidation-calculator': 32,
    'debt-to-income-ratio-calculator': 38,
    'hourly-wage-calculator': 30,
    'loan-affordability-calculator': 31
  };

  const MODE_INDEX = {
    'age-calculator': {
      current: 0, ondate: 1, interval: 2, birthday: 3
    },
    'date-calculator': {
      difference: 4, add: 5, subtract: 6, countdown: 7, business: 8, weekday: 9, weeknumber: 10
    },
    'percentage-calculator': {
      percentageOf: 11, whatPercentage: 12, increase: 13, decrease: 14, percentageChange: 15,
      percentageDifference: 16, percentagePoints: 17, reversePercentage: 18, findOriginal: 19
    },
    'calorie-calculator': {
      bmr: 22, tdee: 23, maintenance: 24, loss: 25, gain: 26
    },
    'debt-payoff-calculator': {
      snowball: 33, avalanche: 34, fixed: 35, payoff: 36, extra: 37
    },
    'credit-card-payoff-calculator': {
      payoff: 39, required: 40, minimum: 41, extra: 42, interest: 43
    },
    'loan-calculator': {
      standard: 44, emi: 45, personal: 46, car: 47, student: 48, home: 49, repayment: 50
    },
    'mortgage-calculator': {
      payment: 51, amortization: 52, extra: 53, down: 54, taxes: 55, payoff: 56, refinance: 57
    },
    'gpa-calculator': {
      gpa: 58, weighted: 59, cumulative: 60, target: 61
    },
    'grade-calculator': {
      current: 62, weighted: 63, final: 64, required: 65, target: 66
    },
    'flooring-calculator': {
      hardwood: 67, laminate: 68, vinyl: 69, plank: 70, area: 71, waste: 72, boxes: 73, cost: 74
    },
    'paint-calculator': {
      wall: 75, ceiling: 76, openings: 77, quantity: 78, coats: 79, coverage: 80, cost: 81
    },
    'concrete-calculator': {
      slab: 82, wall: 83, footing: 84, column: 85, circular: 86, bags: 87, mix: 88, cost: 89
    },
    'concrete-design-calculator': {
      beam: 90, oneWaySlab: 91, twoWaySlab: 92, column: 93, isolatedFooting: 94,
      stripFooting: 95, wall: 83, structuralWall: 96, pedestal: 97, raftCheck: 98,
      dowel: 99, anchorage: 100, deepBeam: 101, corbel: 102, stairSlab: 103,
      combinedFooting: 104, pileCap: 105, shearFriction: 106, coverCongestion: 107,
      jointCheck: 108, oneWayShear: 109, punchingShear: 110, flexure: 111,
      rebar: 112, developmentLength: 113, lapSplice: 114, crackControl: 115,
      deflection: 116, bearing: 117
    }
  };

  function slugFromPath() {
    return location.pathname.split('/').filter(Boolean)[0] || 'calculator';
  }

  function associatedLabel(select) {
    if (!select) return '';
    const explicit = select.id && document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
    return explicit?.textContent || select.closest('label')?.textContent || select.getAttribute('aria-label') || '';
  }

  function findModeSelect() {
    let best = null;
    let bestScore = 0;
    for (const select of document.querySelectorAll('select')) {
      if (select.options.length < 2) continue;
      const identity = `${select.id} ${select.name} ${select.className}`;
      const label = associatedLabel(select);
      let score = 0;
      if (slugFromPath() === 'unit-converter' && select.id === 'conversionType') score += 12;
      if (/mode/i.test(identity)) score += 8;
      if (/mode/i.test(label)) score += 6;
      if (/calculation\s*(type|method)|calculator\s*type/i.test(`${identity} ${label}`)) score += 4;
      if (/unit|currency|country|language/i.test(`${identity} ${label}`)) score -= 8;
      if (score > bestScore) {
        best = select;
        bestScore = score;
      }
    }
    return best;
  }

  function semanticFallback(value) {
    const text = String(value).toLowerCase();
    if (/percent|rate|apr/.test(text)) return 11;
    if (/date|day|week|age/.test(text)) return 4;
    if (/paint|coat|coverage/.test(text)) return 75;
    if (/mortgage|house|home/.test(text)) return 51;
    if (/loan|credit|debt/.test(text)) return 44;
    if (/grade|gpa|student|education/.test(text)) return 58;
    if (/concrete|beam|slab|column|structural/.test(text)) return 90;
    if (/floor|tile|plank/.test(text)) return 67;
    if (/calorie|energy|bmr/.test(text)) return 22;
    if (/convert|exchange/.test(text)) return 120;
    if (/measure|length|area|volume/.test(text)) return 119;
    return 118;
  }

  function symbolContext() {
    const slug = slugFromPath();
    const select = findModeSelect();
    const option = select?.selectedOptions?.[0];
    const modeKey = select?.value || new URLSearchParams(location.search).get('mode') || 'default';
    const modeLabel = option?.textContent?.trim() || document.querySelector('main h1')?.textContent || document.title.split('|')[0] || slug;
    const index = MODE_INDEX[slug]?.[modeKey] ?? PAGE_INDEX[slug] ?? semanticFallback(`${slug} ${modeKey} ${modeLabel}`);
    return { slug, modeKey, index };
  }

  function renderSymbol(svg, context) {
    const key = `${context.slug}:${context.modeKey}:${context.index}`;
    if (svg.dataset.lot894SymbolKey === key) return;
    svg.setAttribute('viewBox', '0 0 160 160');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('lot894-mode-symbol');
    svg.dataset.lot894SymbolKey = key;
    const modeImage = MODE_IMAGE[context.slug]?.[context.modeKey] || MODE_IMAGE[context.slug]?.default;
    if (modeImage) {
      const [x, y, width, height] = modeImage.viewBox;
      svg.innerHTML = `
        <svg class="lot894-generated-icon" x="42.6667" y="42.6667" width="74.6667" height="74.6667"
          viewBox="${x} ${y} ${width} ${height}"
          preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <image href="${modeImage.src}" x="0" y="0" width="1254" height="1254"/>
        </svg>`;
      return;
    }
    const [x, y, width, height] = ICON_VIEWBOXES[context.index];
    svg.innerHTML = `
      <svg class="lot894-generated-icon" x="42.6667" y="42.6667" width="74.6667" height="74.6667"
        viewBox="${x} ${y} ${width} ${height}"
        preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <image href="${ATLAS_URL}" x="0" y="0" width="${ATLAS_SIZE}" height="${ATLAS_SIZE}"/>
      </svg>`;
  }

  function refresh() {
    const context = symbolContext();
    document.querySelectorAll('.result-empty-state .result-empty-symbol, .result-panel--empty .result-empty-symbol, [data-result-state="default"] .result-empty-symbol')
      .forEach(svg => renderSymbol(svg, context));
  }

  let queued = false;
  function queueRefresh() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      refresh();
    });
  }

  document.addEventListener('change', event => {
    if (event.target instanceof HTMLSelectElement) queueRefresh();
  });

  new MutationObserver(queueRefresh).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'data-result-state']
  });

  refresh();
})();

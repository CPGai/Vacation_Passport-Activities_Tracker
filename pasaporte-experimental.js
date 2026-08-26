const {
  createExperimentalDocument,
  addPage,
  applyTemplate,
  reorderActivities,
  calculateMaterialImposition,
  getEffectiveImposition,
  setCustomPanelPage,
  swapSheetPanels,
  resetCustomImposition,
  removePage,
  defaultPrintCalibration,
  generateCsvTemplate,
  parseActivitiesCsv,
  normalizeCsvImagePath,
  importActivitiesFromCsv,
  getTargetPagesByScope,
  applyPageSettings,
} = window.ExperimentalPassportCore;

const $ = id => document.getElementById(id);
const KEY = 'pasaporte-experimental-v1';

const savedState = load();
let doc = savedState?.document || createExperimentalDocument(14);
ensureDocumentCalibration(doc);
let selected = doc.pages[0];
let currentScope = 'single';
let customSelectedPages = new Set([3]);
let originalOrder = doc.pages.filter(p => p.number > 2).map(p => p.number);
let dragging = null;
let draggingPanel = null;
let projectName = savedState?.name || 'Pasaporte';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      if (saved.document) {
        return { name: saved.name || 'Pasaporte', document: saved.document };
      }
      if (saved.pages) {
        return { name: 'Pasaporte', document: saved };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function ensureDocumentCalibration(d) {
  if (!d.impositionMode) {
    d.impositionMode = 'horizontal';
  }
  if (!d.printCalibration) {
    d.printCalibration = {
      centerShiftX: 0,
      centerShiftY: 0,
      outerMargin: 4,
      backShiftX: 0,
      showCutGuides: true,
    };
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function mark(message = 'Cambios sin guardar') {
  $('status').textContent = message;
}

function ensurePageProperties(p) {
  p.fontSize = p.fontSize || { title: 20, description: 12 };
  if (!p.fontSize.title) p.fontSize.title = 20;
  if (!p.fontSize.description) p.fontSize.description = 12;

  p.textOpacity = p.textOpacity || { title: 100, description: 100 };
  if (p.textOpacity.title === undefined) p.textOpacity.title = 100;
  if (p.textOpacity.description === undefined) p.textOpacity.description = 100;

  p.textPosition = p.textPosition || { titleX: 0, titleY: 0, descriptionX: 0, descriptionY: 0 };
  if (p.textPosition.titleX === undefined) p.textPosition.titleX = 0;
  if (p.textPosition.titleY === undefined) p.textPosition.titleY = 0;
  if (p.textPosition.descriptionX === undefined) p.textPosition.descriptionX = 0;
  if (p.textPosition.descriptionY === undefined) p.textPosition.descriptionY = 0;

  p.numberPosition = p.numberPosition || 'top-center';
  p.image = p.image || { src: '', file: '', rule: 'none', scale: 90, x: 0, y: 0, opacity: 23 };
  if (p.image.src && typeof normalizeCsvImagePath === 'function') {
    p.image.src = normalizeCsvImagePath(p.image.src);
  }
  p.stamp = p.stamp || { imageSrc: 'Versiones/Picture1 stamp.png', label: 'SELLO · REALIZADO', subtitle: '', scale: 100, x: 0, y: 0, opacity: 100, show: true };
  if (p.stamp.show === undefined) p.stamp.show = true;
  if (p.stamp.scale === undefined) p.stamp.scale = 100;
  if (p.stamp.x === undefined) p.stamp.x = 0;
  if (p.stamp.y === undefined) p.stamp.y = 0;
  if (p.stamp.opacity === undefined) p.stamp.opacity = 100;
  if (!p.stamp.imageSrc) p.stamp.imageSrc = 'Versiones/Picture1 stamp.png';
  if (!p.stamp.label) p.stamp.label = 'SELLO · REALIZADO';
  p.material = p.material || (p.number < 3 ? 'cover' : 'activity');
  p.backgroundColor = p.backgroundColor || (p.number < 3 ? '#fff8ea' : '#edf8fa');
  return p;
}

function getPageEffectiveTitle(p) {
  if (p.activity && typeof p.activity.title === 'string') {
    return p.activity.title;
  }
  if (p.kind === 'cover') return 'MI PASAPORTE';
  if (p.kind === 'identity') return 'DATOS DEL VIAJERO';
  if (p.kind === 'blank' || p.template === 'blank' || p.template === 'blank-frame' || p.template === 'blank-image') return '';
  return `Actividad ${p.number - 1}`;
}

function getPageEffectiveDescription(p) {
  if (p.activity && typeof p.activity.description === 'string') {
    return p.activity.description;
  }
  if (p.kind === 'cover') return 'AVENTURAS EN CANADÁ';
  if (p.kind === 'identity') return 'Nombre: Andrés · País: México';
  if (p.kind === 'blank' || p.template === 'blank' || p.template === 'blank-frame' || p.template === 'blank-image') return '';
  return 'Escribe aquí la descripción.';
}

function pageMarkup(p, isPrint = false) {
  ensurePageProperties(p);
  const isBlank = p.kind === 'blank' || p.template === 'blank' || p.template === 'blank-frame' || p.template === 'blank-image';
  const effectiveTitle = getPageEffectiveTitle(p);
  const effectiveDesc = getPageEffectiveDescription(p);

  const imgSrc = p.image.src ? (p.image.src.startsWith('data:') || p.image.src.startsWith('blob:') ? p.image.src : encodeURI(p.image.src)) : '';
  const bg = imgSrc
    ? `<img class="watermark" src="${imgSrc}" alt="" style="width:${p.image.scale}%;height:${p.image.scale}%;left:${50 - p.image.scale / 2 + p.image.x}%;top:${50 - p.image.scale / 2 + p.image.y}%;opacity:${p.image.opacity / 100}">`
    : '';

  const bgColor = p.backgroundColor || (p.kind !== 'activity' ? '#fff8ea' : '#edf8fa');

  // Avoid empty tags on blank pages to eliminate ghost boxes
  const titleStyle = `opacity:${(p.textOpacity?.title ?? 100) / 100};transform:translate(${p.textPosition?.titleX || 0}mm, ${p.textPosition?.titleY || 0}mm);`;
  const descStyle = `opacity:${(p.textOpacity?.description ?? 100) / 100};transform:translate(${p.textPosition?.descriptionX || 0}mm, ${p.textPosition?.descriptionY || 0}mm);`;

  const titleHtml = (!isBlank || effectiveTitle)
    ? `<h2 contenteditable="${!isBlank && !isPrint}" data-field="title" style="${titleStyle}">${esc(effectiveTitle)}</h2>`
    : '';
  const descHtml = (!isBlank || effectiveDesc)
    ? `<p contenteditable="${!isBlank && !isPrint}" data-field="description" style="${descStyle}">${esc(effectiveDesc)}</p>`
    : '';
  const stampScale = (p.stamp?.scale ?? 100) / 100;
  const stampOpacity = (p.stamp?.opacity ?? 100) / 100;
  const stampX = p.stamp?.x || 0;
  const stampY = p.stamp?.y || 0;
  const stampStyle = `opacity:${stampOpacity};transform:translate(${stampX}mm, ${stampY}mm) scale(${stampScale});`;
  const showStamp = p.stamp?.show !== false;
  const stampHtml = (p.kind === 'activity' && !isBlank && showStamp)
    ? `<div class="stamp" style="${stampStyle}"><img src="${p.stamp?.imageSrc || 'Versiones/Picture1 stamp.png'}" alt="Sello"><span contenteditable="${!isPrint}" data-field="stamp">${esc(p.stamp?.label || 'SELLO · REALIZADO')}</span></div>`
    : '';

  const numPosClass = `pos-${p.numberPosition || 'top-center'}`;
  const isSelected = !isPrint && (p === selected);

  return `<article class="page ${p.kind !== 'activity' ? 'special' : ''} ${isSelected ? 'selected' : ''}" style="border-color:${p.frameColor};background-color:${bgColor};" data-n="${p.number}">
    ${p.showNumber ? `<span class="number ${numPosClass}">PÁGINA ${p.number}</span>` : ''}
    ${bg}
    ${titleHtml}
    ${descHtml}
    ${stampHtml}
  </article>`;
}

function applyTextStyles() {
  document.querySelectorAll('.page[data-n]').forEach(el => {
    const pageNum = +el.dataset.n;
    const p = doc.pages.find(x => x.number === pageNum);
    if (!p) return;
    ensurePageProperties(p);
    const title = el.querySelector('[data-field="title"]');
    const description = el.querySelector('[data-field="description"]');
    if (title) {
      title.style.opacity = (p.textOpacity?.title ?? 100) / 100;
      title.style.transform = `translate(${p.textPosition?.titleX || 0}mm, ${p.textPosition?.titleY || 0}mm)`;
      if (el.closest('.logical')) {
        title.style.fontSize = p.fontSize.title + 'px';
      }
    }
    if (description) {
      description.style.opacity = (p.textOpacity?.description ?? 100) / 100;
      description.style.transform = `translate(${p.textPosition?.descriptionX || 0}mm, ${p.textPosition?.descriptionY || 0}mm)`;
      if (el.closest('.logical')) {
        description.style.fontSize = p.fontSize.description + 'px';
      }
    }
  });
}

function updateTextTransformsLive(p) {
  if (p === selected) {
    if ($('titleXOut')) {
      $('titleXOut').value = `${p.textPosition?.titleX || 0} mm`;
      $('titleXOut').textContent = `${p.textPosition?.titleX || 0} mm`;
    }
    if ($('titleYOut')) {
      $('titleYOut').value = `${p.textPosition?.titleY || 0} mm`;
      $('titleYOut').textContent = `${p.textPosition?.titleY || 0} mm`;
    }
    if ($('descriptionXOut')) {
      $('descriptionXOut').value = `${p.textPosition?.descriptionX || 0} mm`;
      $('descriptionXOut').textContent = `${p.textPosition?.descriptionX || 0} mm`;
    }
    if ($('descriptionYOut')) {
      $('descriptionYOut').value = `${p.textPosition?.descriptionY || 0} mm`;
      $('descriptionYOut').textContent = `${p.textPosition?.descriptionY || 0} mm`;
    }
  }

  document.querySelectorAll(`.page[data-n="${p.number}"]`).forEach(card => {
    const title = card.querySelector('[data-field="title"]');
    const description = card.querySelector('[data-field="description"]');
    if (title) {
      title.style.transform = `translate(${p.textPosition?.titleX || 0}mm, ${p.textPosition?.titleY || 0}mm)`;
    }
    if (description) {
      description.style.transform = `translate(${p.textPosition?.descriptionX || 0}mm, ${p.textPosition?.descriptionY || 0}mm)`;
    }
  });
}

function updateTextOpacityLive(p) {
  if (p === selected) {
    if ($('titleOpacityOut')) {
      $('titleOpacityOut').value = `${p.textOpacity?.title ?? 100}%`;
      $('titleOpacityOut').textContent = `${p.textOpacity?.title ?? 100}%`;
    }
    if ($('descriptionOpacityOut')) {
      $('descriptionOpacityOut').value = `${p.textOpacity?.description ?? 100}%`;
      $('descriptionOpacityOut').textContent = `${p.textOpacity?.description ?? 100}%`;
    }
  }

  document.querySelectorAll(`.page[data-n="${p.number}"]`).forEach(card => {
    const title = card.querySelector('[data-field="title"]');
    const description = card.querySelector('[data-field="description"]');
    if (title) {
      title.style.opacity = ((p.textOpacity?.title ?? 100) / 100);
    }
    if (description) {
      description.style.opacity = ((p.textOpacity?.description ?? 100) / 100);
    }
  });
}

function applyCalibrationStyles() {
  ensureDocumentCalibration(doc);
  const cal = doc.printCalibration;
  const root = document.documentElement;
  root.style.setProperty('--center-shift-x', `${cal.centerShiftX}mm`);
  root.style.setProperty('--center-shift-y', `${cal.centerShiftY}mm`);
  root.style.setProperty('--outer-margin', `${cal.outerMargin}mm`);
  root.style.setProperty('--back-shift-x', `${cal.backShiftX}mm`);

  // Update guide lines class on sheet sides
  document.querySelectorAll('.sheet-side').forEach(sheet => {
    sheet.classList.toggle('with-guides', !!cal.showCutGuides);
  });

  // Update calibration form outputs and values
  if ($('centerShiftX')) {
    $('centerShiftX').value = cal.centerShiftX;
    $('centerShiftXOut').value = `${cal.centerShiftX} mm`;
    $('centerShiftY').value = cal.centerShiftY;
    $('centerShiftYOut').value = `${cal.centerShiftY} mm`;
    $('outerMargin').value = cal.outerMargin;
    $('outerMarginOut').value = `${cal.outerMargin} mm`;
    $('backShiftX').value = cal.backShiftX;
    $('backShiftXOut').value = `${cal.backShiftX} mm`;
    $('showCutGuides').checked = !!cal.showCutGuides;
  }
}

function getActiveTargetPages() {
  return getTargetPagesByScope(doc, currentScope, selected?.number || 1, Array.from(customSelectedPages));
}

function renderScopeSelector() {
  if (!$('applyScopeSelect')) return;
  $('applyScopeSelect').value = currentScope;
  const customWrapper = $('customScopeWrapper');
  if (customWrapper) {
    customWrapper.classList.toggle('hidden', currentScope !== 'custom');
  }

  const chipsContainer = $('customScopeChips');
  if (chipsContainer && currentScope === 'custom') {
    chipsContainer.innerHTML = doc.pages.map(p => {
      const isChecked = customSelectedPages.has(p.number);
      return `
        <label class="scope-chip ${isChecked ? 'checked' : ''}" data-n="${p.number}">
          <input type="checkbox" data-n="${p.number}" ${isChecked ? 'checked' : ''}>
          <span>Pág ${p.number}</span>
        </label>
      `;
    }).join('');

    chipsContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.onchange = () => {
        const num = +chk.dataset.n;
        if (chk.checked) {
          customSelectedPages.add(num);
        } else {
          customSelectedPages.delete(num);
        }
        renderScopeSelector();
        renderThumbs();
      };
    });
  }
}

function renderThumbs() {
  const targetPages = new Set(getActiveTargetPages().map(p => p.number));
  $('thumbs').innerHTML = doc.pages.map(p => {
    const isSelected = p === selected;
    const isScopeActive = currentScope !== 'single' && targetPages.has(p.number);
    return `
      <button class="thumb ${isSelected ? 'selected' : ''} ${isScopeActive ? 'scope-active' : ''}" data-n="${p.number}" type="button" style="border-color:${p.frameColor};" title="Pág ${p.number} · ${esc(getPageEffectiveTitle(p) || p.kind)} (Ctrl+clic para multi-selección)">
        ${p.number}
        <small>${esc(getPageEffectiveTitle(p) || p.kind)}</small>
      </button>
    `;
  }).join('');

  document.querySelectorAll('.thumb').forEach(b => {
    b.onclick = (e) => {
      const pageNum = +b.dataset.n;
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        currentScope = 'custom';
        if (customSelectedPages.has(pageNum)) {
          customSelectedPages.delete(pageNum);
        } else {
          customSelectedPages.add(pageNum);
        }
        selected = doc.pages.find(p => p.number === pageNum);
        render();
        return;
      }
      selected = doc.pages.find(p => p.number === pageNum);
      render();
    };
  });
}

function syncPageTextToViews(pageNum, field, value) {
  document.querySelectorAll(`.page[data-n="${pageNum}"]`).forEach(card => {
    const target = card.querySelector(`[data-field="${field}"]`);
    if (target && target.textContent !== value) {
      target.textContent = value;
    }
  });
}

function syncPageVisualToViews(pageNum) {
  const p = doc.pages.find(x => x.number === pageNum);
  if (!p) return;
  document.querySelectorAll(`.logical .page[data-n="${pageNum}"]`).forEach(card => {
    card.outerHTML = pageMarkup(p, false);
  });
  document.querySelectorAll(`.print-panel .page[data-n="${pageNum}"]`).forEach(card => {
    card.outerHTML = pageMarkup(p, true);
  });
  applyTextStyles();
  attachPageGridEvents();
}

function attachPageGridEvents() {
  document.querySelectorAll('.logical .page').forEach(el => {
    el.onclick = (e) => {
      if (e.target.isContentEditable) return;
      selected = doc.pages.find(p => p.number === +el.dataset.n);
      render();
    };

    el.querySelectorAll('[contenteditable]').forEach(node => {
      node.oninput = () => {
        const pageNum = +el.dataset.n;
        const p = doc.pages.find(x => x.number === pageNum);
        if (!p) return;
        p.activity = p.activity || { title: getPageEffectiveTitle(p), description: getPageEffectiveDescription(p) };
        if (node.dataset.field === 'title') {
          p.activity.title = node.textContent;
          if (p === selected) $('title').value = node.textContent;
          const seqInput = document.querySelector(`.seq-act-title[data-n="${pageNum}"]`);
          if (seqInput && seqInput.value !== node.textContent) seqInput.value = node.textContent;
          syncPageTextToViews(pageNum, 'title', node.textContent);
        }
        if (node.dataset.field === 'description') {
          p.activity.description = node.textContent;
          if (p === selected) $('description').value = node.textContent;
          const seqDesc = document.querySelector(`.seq-act-desc[data-n="${pageNum}"]`);
          if (seqDesc && seqDesc.value !== node.textContent) seqDesc.value = node.textContent;
          syncPageTextToViews(pageNum, 'description', node.textContent);
        }
        if (node.dataset.field === 'stamp') {
          p.stamp.label = node.textContent;
          if (p === selected) $('stamp').value = node.textContent;
          syncPageTextToViews(pageNum, 'stamp', node.textContent);
        }
        renderThumbs();
        renderSheetOrganizer();
        mark();
      };
    });
  });
}

function renderPageGrid() {
  $('logical').innerHTML = doc.pages.map(p => pageMarkup(p, false)).join('');
  attachPageGridEvents();
}

function renderMaterialPrint() {
  const imposed = getEffectiveImposition(doc);
  const coverSides = imposed.cover.map(side => ({ ...side, isCover: true, section: 'cover' }));
  const activitySides = imposed.activity.map(side => ({ ...side, isCover: false, section: 'activity' }));
  const sides = [...coverSides, ...activitySides];
  const withGuides = doc.printCalibration?.showCutGuides !== false ? 'with-guides' : '';

  $('printView').innerHTML = sides.map(side => `
    <section class="sheet-side ${side.isCover ? 'cover-sheet' : 'activity-sheet'} ${side.side === 'back' ? 'sheet-back' : ''} ${withGuides}">
      <span class="sheet-label">${side.side === 'front' ? 'Frente' : 'Reverso'} · Hoja ${side.sheet} · ${side.isCover ? 'Portada (Cartoncillo)' : 'Actividades (Normal)'}</span>
      ${side.panels.map(number => `
        <div class="print-panel">
          ${number ? pageMarkup(doc.pages[number - 1], true) : '<article class="page blank-page"></article>'}
        </div>
      `).join('')}
    </section>
  `).join('');
}

function renderSheetOrganizer() {
  if ($('impositionSpineMode')) {
    $('impositionSpineMode').value = doc.impositionMode || 'horizontal';
  }
  const imposed = getEffectiveImposition(doc);
  const sections = [
    { key: 'cover', label: 'Portada (Cartoncillo)', sides: imposed.cover },
    { key: 'activity', label: 'Actividades (Papel normal)', sides: imposed.activity },
  ];

  const posLabels = [
    '[1] Sup. Izq',
    '[2] Sup. Der',
    '[3] Inf. Izq',
    '[4] Inf. Der',
  ];

  const pageOptions = [
    '<option value="">[En blanco]</option>',
    ...doc.pages.map(p => `<option value="${p.number}">Pág ${p.number} · ${esc(getPageEffectiveTitle(p) || p.kind)}</option>`),
  ].join('');

  let html = '';
  sections.forEach(sec => {
    sec.sides.forEach((side, sideIdx) => {
      html += `
        <div class="sheet-side-card" data-section="${sec.key}" data-side-idx="${sideIdx}">
          <div class="sheet-side-card-title">
            <span>Hoja ${side.sheet} · ${side.side === 'front' ? 'Frente' : 'Reverso'}</span>
            <small>${sec.label}</small>
          </div>
          <div class="panels-grid-2x2">
            ${side.panels.map((pageNum, panelIdx) => `
              <div class="panel-slot" draggable="true" data-section="${sec.key}" data-side-idx="${sideIdx}" data-panel-idx="${panelIdx}">
                <div class="panel-slot-header">
                  <span>${posLabels[panelIdx]}</span>
                  <b>☰</b>
                </div>
                <select class="panel-page-select" data-section="${sec.key}" data-side-idx="${sideIdx}" data-panel-idx="${panelIdx}" aria-label="${posLabels[panelIdx]}">
                  ${pageOptions.replace(`value="${pageNum ?? ''}"`, `value="${pageNum ?? ''}" selected`)}
                </select>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
  });

  $('sheetOrganizer').innerHTML = html;

  // Setup panel select dropdown changes
  document.querySelectorAll('.panel-page-select').forEach(sel => {
    sel.onchange = () => {
      const section = sel.dataset.section;
      const sideIndex = +sel.dataset.sideIdx;
      const panelIndex = +sel.dataset.panelIdx;
      const val = sel.value ? +sel.value : null;
      setCustomPanelPage(doc, section, sideIndex, panelIndex, val);
      renderMaterialPrint();
      applyTextStyles();
      mark('Disposición de hojas personalizada');
    };
  });

  // Setup panel drag & drop swap
  document.querySelectorAll('.panel-slot').forEach(slot => {
    slot.ondragstart = (e) => {
      if (e.target.tagName === 'SELECT') {
        e.preventDefault();
        return;
      }
      draggingPanel = {
        section: slot.dataset.section,
        sideIndex: +slot.dataset.sideIdx,
        panelIndex: +slot.dataset.panelIdx,
      };
    };
    slot.ondragover = e => e.preventDefault();
    slot.ondrop = () => {
      if (draggingPanel) {
        const targetLoc = {
          section: slot.dataset.section,
          sideIndex: +slot.dataset.sideIdx,
          panelIndex: +slot.dataset.panelIdx,
        };
        swapSheetPanels(doc, draggingPanel, targetLoc);
        draggingPanel = null;
        renderMaterialPrint();
        renderSheetOrganizer();
        applyTextStyles();
        mark('Paneles reordenados en hoja');
      }
    };
  });
}

function renderForm() {
  const p = ensurePageProperties(selected);
  $('template').value = p.template;
  $('material').value = p.material;
  $('frame').value = p.frameColor;
  $('bgColor').value = p.backgroundColor || (p.kind !== 'activity' ? '#fff8ea' : '#edf8fa');
  $('showNumber').checked = p.showNumber;
  $('numberPosition').value = p.numberPosition || 'top-center';
  $('title').value = getPageEffectiveTitle(p);
  $('titleSize').value = p.fontSize.title;
  $('titleOpacity').value = p.textOpacity.title;
  if ($('titleOpacityOut')) {
    $('titleOpacityOut').value = p.textOpacity.title + '%';
    $('titleOpacityOut').textContent = p.textOpacity.title + '%';
  }
  $('titleX').value = p.textPosition?.titleX || 0;
  if ($('titleXOut')) {
    $('titleXOut').value = `${p.textPosition?.titleX || 0} mm`;
    $('titleXOut').textContent = `${p.textPosition?.titleX || 0} mm`;
  }
  $('titleY').value = p.textPosition?.titleY || 0;
  if ($('titleYOut')) {
    $('titleYOut').value = `${p.textPosition?.titleY || 0} mm`;
    $('titleYOut').textContent = `${p.textPosition?.titleY || 0} mm`;
  }

  $('description').value = getPageEffectiveDescription(p);
  $('descriptionSize').value = p.fontSize.description;
  $('descriptionOpacity').value = p.textOpacity.description;
  if ($('descriptionOpacityOut')) {
    $('descriptionOpacityOut').value = p.textOpacity.description + '%';
    $('descriptionOpacityOut').textContent = p.textOpacity.description + '%';
  }
  $('descriptionX').value = p.textPosition?.descriptionX || 0;
  if ($('descriptionXOut')) {
    $('descriptionXOut').value = `${p.textPosition?.descriptionX || 0} mm`;
    $('descriptionXOut').textContent = `${p.textPosition?.descriptionX || 0} mm`;
  }
  $('descriptionY').value = p.textPosition?.descriptionY || 0;
  if ($('descriptionYOut')) {
    $('descriptionYOut').value = `${p.textPosition?.descriptionY || 0} mm`;
    $('descriptionYOut').textContent = `${p.textPosition?.descriptionY || 0} mm`;
  }

  const isActivity = p.kind === 'activity';
  $('stamp').value = p.stamp?.label || 'SELLO · REALIZADO';
  $('stamp').disabled = !isActivity;

  if ($('showStamp')) {
    $('showStamp').checked = p.stamp?.show !== false;
    $('showStamp').disabled = !isActivity;
  }
  if ($('stampScale')) {
    $('stampScale').value = p.stamp?.scale ?? 100;
    $('stampScale').disabled = !isActivity;
    if ($('stampScaleOut')) {
      $('stampScaleOut').value = `${p.stamp?.scale ?? 100}%`;
      $('stampScaleOut').textContent = `${p.stamp?.scale ?? 100}%`;
    }
  }
  if ($('stampX')) {
    $('stampX').value = p.stamp?.x ?? 0;
    $('stampX').disabled = !isActivity;
    if ($('stampXOut')) {
      $('stampXOut').value = `${p.stamp?.x ?? 0} mm`;
      $('stampXOut').textContent = `${p.stamp?.x ?? 0} mm`;
    }
  }
  if ($('stampY')) {
    $('stampY').value = p.stamp?.y ?? 0;
    $('stampY').disabled = !isActivity;
    if ($('stampYOut')) {
      $('stampYOut').value = `${p.stamp?.y ?? 0} mm`;
      $('stampYOut').textContent = `${p.stamp?.y ?? 0} mm`;
    }
  }
  if ($('stampOpacity')) {
    $('stampOpacity').value = p.stamp?.opacity ?? 100;
    $('stampOpacity').disabled = !isActivity;
    if ($('stampOpacityOut')) {
      $('stampOpacityOut').value = `${p.stamp?.opacity ?? 100}%`;
      $('stampOpacityOut').textContent = `${p.stamp?.opacity ?? 100}%`;
    }
  }
  if ($('stampImage')) {
    $('stampImage').disabled = !isActivity;
  }

  $('scale').value = p.image.scale;
  $('x').value = p.image.x;
  $('y').value = p.image.y;
  $('opacity').value = p.image.opacity;

  ['scale', 'x', 'y', 'opacity'].forEach(k => {
    if ($(`${k}Out`)) {
      $(`${k}Out`).value = p.image[k] + '%';
      $(`${k}Out`).textContent = p.image[k] + '%';
    }
  });

  const isBlank = p.kind === 'blank' || p.template === 'blank' || p.template === 'blank-frame' || p.template === 'blank-image';
  $('title').disabled = isBlank;
  $('description').disabled = isBlank;
}

function renderOrder() {
  const activityPages = doc.pages.filter(p => p.number > 2);
  $('order').innerHTML = activityPages.map(p => `
    <div class="activity-card ${p === selected ? 'active-page' : ''}" draggable="true" data-n="${p.number}">
      <div class="activity-card-header">
        <span class="drag-handle" title="Arrastrar para reordenar actividad">☰</span>
        <span class="activity-badge">Página ${p.number}</span>
        <button type="button" class="btn-goto" data-goto="${p.number}" title="Seleccionar y ver detalles">Ver página</button>
      </div>
      <label class="compact-label">Título
        <input class="seq-act-title" data-n="${p.number}" value="${esc(getPageEffectiveTitle(p))}" placeholder="Título de la actividad">
      </label>
      <label class="compact-label">Descripción
        <textarea class="seq-act-desc" data-n="${p.number}" rows="2" placeholder="Descripción de la actividad">${esc(getPageEffectiveDescription(p))}</textarea>
      </label>
    </div>
  `).join('');

  // Drag & drop handlers
  document.querySelectorAll('.activity-card').forEach(card => {
    card.ondragstart = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        e.preventDefault();
        return;
      }
      dragging = card;
    };
    card.ondragover = e => e.preventDefault();
    card.ondrop = () => {
      if (dragging && dragging !== card) {
        card.parentNode.insertBefore(dragging, card);
        const numbers = [...$('order').children].map(x => +x.dataset.n);
        reorderActivities(doc, numbers);
        mark();
        render();
      }
    };
  });

  // Direct editing within sequential list (0ms latency instant sync)
  document.querySelectorAll('.seq-act-title').forEach(input => {
    input.oninput = () => {
      const pageNum = +input.dataset.n;
      const p = doc.pages.find(x => x.number === pageNum);
      if (!p) return;
      p.activity = p.activity || { title: '', description: '' };
      p.activity.title = input.value;
      if (p === selected) $('title').value = input.value;
      syncPageTextToViews(pageNum, 'title', input.value);
      renderThumbs();
      renderSheetOrganizer();
      mark();
    };
  });

  document.querySelectorAll('.seq-act-desc').forEach(textarea => {
    textarea.oninput = () => {
      const pageNum = +textarea.dataset.n;
      const p = doc.pages.find(x => x.number === pageNum);
      if (!p) return;
      p.activity = p.activity || { title: '', description: '' };
      p.activity.description = textarea.value;
      if (p === selected) $('description').value = textarea.value;
      syncPageTextToViews(pageNum, 'description', textarea.value);
      mark();
    };
  });

  // Navigate to page button
  document.querySelectorAll('.btn-goto').forEach(btn => {
    btn.onclick = () => {
      const pageNum = +btn.dataset.goto;
      selected = doc.pages.find(p => p.number === pageNum);
      render();
      const targetCard = document.querySelector(`.logical .page[data-n="${pageNum}"]`);
      if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  });
}

function editForm() {
  const targets = getActiveTargetPages();
  const formValues = {
    fontSize: { title: +$('titleSize').value, description: +$('descriptionSize').value },
    textOpacity: { title: +$('titleOpacity').value, description: +$('descriptionOpacity').value },
    textPosition: {
      titleX: +$('titleX').value,
      titleY: +$('titleY').value,
      descriptionX: +$('descriptionX').value,
      descriptionY: +$('descriptionY').value,
    },
    frameColor: $('frame').value,
    backgroundColor: $('bgColor').value,
    showNumber: $('showNumber').checked,
    numberPosition: $('numberPosition').value,
    material: $('material').value,
  };

  const stampVal = $('stamp').value;
  const showStampVal = $('showStamp') ? $('showStamp').checked : true;
  const stampScaleVal = $('stampScale') ? +$('stampScale').value : 100;
  const stampXVal = $('stampX') ? +$('stampX').value : 0;
  const stampYVal = $('stampY') ? +$('stampY').value : 0;
  const stampOpacityVal = $('stampOpacity') ? +$('stampOpacity').value : 100;

  targets.forEach(p => {
    ensurePageProperties(p);
    p.fontSize.title = formValues.fontSize.title;
    p.fontSize.description = formValues.fontSize.description;
    p.textOpacity.title = formValues.textOpacity.title;
    p.textOpacity.description = formValues.textOpacity.description;
    p.textPosition.titleX = formValues.textPosition.titleX;
    p.textPosition.titleY = formValues.textPosition.titleY;
    p.textPosition.descriptionX = formValues.textPosition.descriptionX;
    p.textPosition.descriptionY = formValues.textPosition.descriptionY;
    p.frameColor = formValues.frameColor;
    p.backgroundColor = formValues.backgroundColor;
    p.showNumber = formValues.showNumber;
    p.numberPosition = formValues.numberPosition;
    p.material = formValues.material;
    if (p.kind === 'activity') {
      p.stamp.label = stampVal;
      p.stamp.show = showStampVal;
      p.stamp.scale = stampScaleVal;
      p.stamp.x = stampXVal;
      p.stamp.y = stampYVal;
      p.stamp.opacity = stampOpacityVal;
    }
    if (targets.length === 1 && p === selected) {
      p.activity = p.activity || { title: getPageEffectiveTitle(p), description: getPageEffectiveDescription(p) };
      p.activity.title = $('title').value;
      p.activity.description = $('description').value;
    }
  });

  if ($('stampScaleOut')) {
    $('stampScaleOut').value = `${stampScaleVal}%`;
    $('stampScaleOut').textContent = `${stampScaleVal}%`;
  }
  if ($('stampXOut')) {
    $('stampXOut').value = `${stampXVal} mm`;
    $('stampXOut').textContent = `${stampXVal} mm`;
  }
  if ($('stampYOut')) {
    $('stampYOut').value = `${stampYVal} mm`;
    $('stampYOut').textContent = `${stampYVal} mm`;
  }
  if ($('stampOpacityOut')) {
    $('stampOpacityOut').value = `${stampOpacityVal}%`;
    $('stampOpacityOut').textContent = `${stampOpacityVal}%`;
  }

  if ($('titleOpacityOut')) {
    $('titleOpacityOut').value = formValues.textOpacity.title + '%';
    $('titleOpacityOut').textContent = formValues.textOpacity.title + '%';
  }
  if ($('descriptionOpacityOut')) {
    $('descriptionOpacityOut').value = formValues.textOpacity.description + '%';
    $('descriptionOpacityOut').textContent = formValues.textOpacity.description + '%';
  }
  if ($('titleXOut')) {
    $('titleXOut').value = `${formValues.textPosition.titleX} mm`;
    $('titleXOut').textContent = `${formValues.textPosition.titleX} mm`;
  }
  if ($('titleYOut')) {
    $('titleYOut').value = `${formValues.textPosition.titleY} mm`;
    $('titleYOut').textContent = `${formValues.textPosition.titleY} mm`;
  }
  if ($('descriptionXOut')) {
    $('descriptionXOut').value = `${formValues.textPosition.descriptionX} mm`;
    $('descriptionXOut').textContent = `${formValues.textPosition.descriptionX} mm`;
  }
  if ($('descriptionYOut')) {
    $('descriptionYOut').value = `${formValues.textPosition.descriptionY} mm`;
    $('descriptionYOut').textContent = `${formValues.textPosition.descriptionY} mm`;
  }

  targets.forEach(p => syncPageVisualToViews(p.number));
  renderThumbs();
  renderSheetOrganizer();

  if (selected.number > 2) {
    const seqTitle = document.querySelector(`.seq-act-title[data-n="${selected.number}"]`);
    if (seqTitle && seqTitle.value !== selected.activity?.title) seqTitle.value = selected.activity.title;
    const seqDesc = document.querySelector(`.seq-act-desc[data-n="${selected.number}"]`);
    if (seqDesc && seqDesc.value !== selected.activity?.description) seqDesc.value = selected.activity.description;
  }

  mark();
}

function render() {
  if ($('projectTitle') && $('projectTitle').textContent !== projectName) {
    $('projectTitle').textContent = projectName;
  }
  document.title = `${projectName || 'Pasaporte'} — editor experimental`;
  renderScopeSelector();
  renderThumbs();
  renderPageGrid();
  renderForm();
  renderOrder();
  renderMaterialPrint();
  renderSheetOrganizer();
  applyTextStyles();
  applyCalibrationStyles();
}

// Event Listeners setup (attached once)
function initEventListeners() {
  if ($('projectTitle')) {
    $('projectTitle').oninput = () => {
      projectName = $('projectTitle').textContent.trim() || 'Pasaporte';
      document.title = `${projectName} — editor experimental`;
      localStorage.setItem(KEY, JSON.stringify({ name: projectName, document: doc }));
      mark('Nombre del proyecto actualizado');
    };
    $('projectTitle').onblur = () => {
      if (!$('projectTitle').textContent.trim()) {
        $('projectTitle').textContent = 'Pasaporte';
        projectName = 'Pasaporte';
        localStorage.setItem(KEY, JSON.stringify({ name: projectName, document: doc }));
      }
    };
    $('projectTitle').onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('projectTitle').blur();
      }
    };
  }

  if ($('applyScopeSelect')) {
    $('applyScopeSelect').onchange = () => {
      currentScope = $('applyScopeSelect').value;
      renderScopeSelector();
      renderThumbs();
      mark(`Ámbito de aplicación cambiado: ${$('applyScopeSelect').selectedOptions[0].text}`);
    };
  }

  if ($('scopeSelectAll')) {
    $('scopeSelectAll').onclick = () => {
      doc.pages.forEach(p => customSelectedPages.add(p.number));
      renderScopeSelector();
      renderThumbs();
      mark('Todas las páginas marcadas en selección múltiple');
    };
  }

  if ($('scopeSelectActivities')) {
    $('scopeSelectActivities').onclick = () => {
      customSelectedPages.clear();
      doc.pages.filter(p => p.number > 2).forEach(p => customSelectedPages.add(p.number));
      renderScopeSelector();
      renderThumbs();
      mark('Solo actividades marcadas en selección múltiple');
    };
  }

  if ($('scopeClearAll')) {
    $('scopeClearAll').onclick = () => {
      customSelectedPages.clear();
      renderScopeSelector();
      renderThumbs();
      mark('Selección múltiple limpiada');
    };
  }

  $('template').onchange = () => {
    const targets = getActiveTargetPages();
    const tpl = $('template').value;
    targets.forEach(p => {
      if (p.number > 2 || tpl === 'cover' || tpl === 'identity') {
        applyTemplate(p, tpl);
      }
    });
    render();
    mark();
  };

  $('material').onchange = () => {
    const targets = getActiveTargetPages();
    const mat = $('material').value;
    targets.forEach(p => {
      p.material = mat;
    });
    renderMaterialPrint();
    renderSheetOrganizer();
    applyTextStyles();
    mark();
  };

  $('frame').oninput = editForm;
  $('bgColor').oninput = editForm;
  $('showNumber').onchange = editForm;
  $('numberPosition').onchange = editForm;
  $('titleSize').onchange = editForm;
  $('descriptionSize').onchange = editForm;

  $('titleOpacity').oninput = () => {
    const targets = getActiveTargetPages();
    const val = +$('titleOpacity').value;
    targets.forEach(p => {
      ensurePageProperties(p);
      p.textOpacity.title = val;
      updateTextOpacityLive(p);
    });
    mark();
  };

  $('descriptionOpacity').oninput = () => {
    const targets = getActiveTargetPages();
    const val = +$('descriptionOpacity').value;
    targets.forEach(p => {
      ensurePageProperties(p);
      p.textOpacity.description = val;
      updateTextOpacityLive(p);
    });
    mark();
  };

  // High-performance real-time direct transform updating for Title and Description X/Y
  const onTextPositionInput = () => {
    const targets = getActiveTargetPages();
    const tX = +$('titleX').value;
    const tY = +$('titleY').value;
    const dX = +$('descriptionX').value;
    const dY = +$('descriptionY').value;
    targets.forEach(p => {
      ensurePageProperties(p);
      p.textPosition.titleX = tX;
      p.textPosition.titleY = tY;
      p.textPosition.descriptionX = dX;
      p.textPosition.descriptionY = dY;
      updateTextTransformsLive(p);
    });
    mark();
  };

  ['titleX', 'titleY', 'descriptionX', 'descriptionY'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.oninput = onTextPositionInput;
    el.onchange = onTextPositionInput;
  });

  ['title', 'description', 'stamp'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.oninput = editForm;
    el.onchange = editForm;
  });

  if ($('showStamp')) $('showStamp').onchange = editForm;

  const onStampTransformInput = () => {
    const targets = getActiveTargetPages();
    const sc = $('stampScale') ? +$('stampScale').value : 100;
    const sX = $('stampX') ? +$('stampX').value : 0;
    const sY = $('stampY') ? +$('stampY').value : 0;
    const op = $('stampOpacity') ? +$('stampOpacity').value : 100;

    targets.forEach(p => {
      if (p.kind === 'activity') {
        ensurePageProperties(p);
        p.stamp.scale = sc;
        p.stamp.x = sX;
        p.stamp.y = sY;
        p.stamp.opacity = op;
        syncPageVisualToViews(p.number);
      }
    });

    if ($('stampScaleOut')) {
      $('stampScaleOut').value = `${sc}%`;
      $('stampScaleOut').textContent = `${sc}%`;
    }
    if ($('stampXOut')) {
      $('stampXOut').value = `${sX} mm`;
      $('stampXOut').textContent = `${sX} mm`;
    }
    if ($('stampYOut')) {
      $('stampYOut').value = `${sY} mm`;
      $('stampYOut').textContent = `${sY} mm`;
    }
    if ($('stampOpacityOut')) {
      $('stampOpacityOut').value = `${op}%`;
      $('stampOpacityOut').textContent = `${op}%`;
    }
    mark();
  };

  ['stampScale', 'stampX', 'stampY', 'stampOpacity'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.oninput = onStampTransformInput;
    el.onchange = onStampTransformInput;
  });

  if ($('stampImage')) {
    $('stampImage').onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const targets = getActiveTargetPages();
        targets.forEach(p => {
          if (p.kind === 'activity') {
            ensurePageProperties(p);
            p.stamp.imageSrc = r.result;
            syncPageVisualToViews(p.number);
          }
        });
        mark('Icono de sello personalizado cargado');
      };
      r.readAsDataURL(f);
    };
  }

  if ($('resetStamp')) {
    $('resetStamp').onclick = () => {
      const targets = getActiveTargetPages();
      targets.forEach(p => {
        if (p.kind === 'activity') {
          ensurePageProperties(p);
          p.stamp = { imageSrc: 'Versiones/Picture1 stamp.png', label: 'SELLO · REALIZADO', subtitle: '', scale: 100, x: 0, y: 0, opacity: 100, show: true };
          syncPageVisualToViews(p.number);
        }
      });
      renderForm();
      mark('Sello estándar restaurado');
    };
  }

  $('resetTextPos').onclick = () => {
    const targets = getActiveTargetPages();
    targets.forEach(p => {
      ensurePageProperties(p);
      p.textPosition = { titleX: 0, titleY: 0, descriptionX: 0, descriptionY: 0 };
      updateTextTransformsLive(p);
    });
    if ($('titleX')) $('titleX').value = 0;
    if ($('titleY')) $('titleY').value = 0;
    if ($('descriptionX')) $('descriptionX').value = 0;
    if ($('descriptionY')) $('descriptionY').value = 0;
    mark('Posiciones de texto centradas');
  };

  // CSV Template download
  $('downloadCsvTemplate').onclick = () => {
    const csvContent = '\uFEFF' + generateCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plantilla_actividades_pasaporte.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    mark('Plantilla CSV descargada');
  };

  // CSV Import trigger & handler
  $('importCsvBtn').onclick = () => $('csvFileInput').click();

  $('csvFileInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importActivitiesFromCsv(doc, reader.result);
        selected = doc.pages[Math.min(2, doc.pages.length - 1)];
        originalOrder = doc.pages.filter(p => p.number > 2).map(p => p.number);
        render();
        const totalActivities = doc.pages.filter(p => p.number > 2).length;
        mark(`CSV importado exitosamente (${totalActivities} actividades en total)`);
      } catch (err) {
        alert('Error al importar el archivo CSV: ' + err.message);
        mark('Error al importar CSV: ' + err.message);
      } finally {
        $('csvFileInput').value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Print calibration handlers
  const onCalibrationInput = () => {
    ensureDocumentCalibration(doc);
    doc.printCalibration.centerShiftX = +$('centerShiftX').value;
    doc.printCalibration.centerShiftY = +$('centerShiftY').value;
    doc.printCalibration.outerMargin = +$('outerMargin').value;
    doc.printCalibration.backShiftX = +$('backShiftX').value;
    doc.printCalibration.showCutGuides = $('showCutGuides').checked;
    applyCalibrationStyles();
    mark('Calibración de impresión actualizada');
  };

  ['centerShiftX', 'centerShiftY', 'outerMargin', 'backShiftX'].forEach(id => {
    const el = $(id);
    if (el) {
      el.oninput = onCalibrationInput;
      el.onchange = onCalibrationInput;
    }
  });
  if ($('showCutGuides')) $('showCutGuides').onchange = onCalibrationInput;

  $('resetCalibration').onclick = () => {
    doc.printCalibration = {
      centerShiftX: 0,
      centerShiftY: 0,
      outerMargin: 4,
      backShiftX: 0,
      showCutGuides: true,
    };
    applyCalibrationStyles();
    mark('Calibración de impresión restablecida');
  };

  ['scale', 'x', 'y', 'opacity'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.oninput = () => {
      const targets = getActiveTargetPages();
      const val = +$(id).value;
      targets.forEach(p => {
        ensurePageProperties(p);
        p.image[id] = val;
        syncPageVisualToViews(p.number);
      });
      if ($(`${id}Out`)) {
        $(`${id}Out`).value = val + '%';
        $(`${id}Out`).textContent = val + '%';
      }
      mark();
    };
  });

  $('center').onclick = () => {
    $('x').value = 0;
    $('y').value = 0;
    if ($('xOut')) {
      $('xOut').value = '0%';
      $('xOut').textContent = '0%';
    }
    if ($('yOut')) {
      $('yOut').value = '0%';
      $('yOut').textContent = '0%';
    }
    const targets = getActiveTargetPages();
    targets.forEach(p => {
      ensurePageProperties(p);
      p.image.x = 0;
      p.image.y = 0;
      syncPageVisualToViews(p.number);
    });
    mark();
  };

  $('image').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const targets = getActiveTargetPages();
      targets.forEach(p => {
        ensurePageProperties(p);
        p.image.src = r.result;
        p.image.file = f.name;
        p.image.rule = 'manual';
        syncPageVisualToViews(p.number);
      });
      mark();
    };
    r.readAsDataURL(f);
  };

  $('add').onclick = () => {
    selected = addPage(doc, $('addTemplate').value);
    render();
    mark('Nueva página agregada');
  };

  $('removePage').onclick = () => {
    if (selected.number <= 2) {
      mark('No se pueden eliminar las páginas especiales 1 y 2');
      return;
    }
    $('confirmRemovePage').hidden = false;
    mark(`¿Confirmar eliminación de la página ${selected.number}?`);
  };

  $('confirmRemovePage').onclick = () => {
    try {
      const pageNum = selected.number;
      removePage(doc, pageNum);
      $('confirmRemovePage').hidden = true;
      selected = doc.pages[Math.min(pageNum - 1, doc.pages.length - 1)];
      originalOrder = doc.pages.filter(p => p.number > 2).map(p => p.number);
      render();
      mark(`Página ${pageNum} eliminada`);
    } catch (error) {
      mark(error.message);
    }
  };

  $('save').onclick = () => {
    localStorage.setItem(KEY, JSON.stringify({ name: projectName, document: doc }));
    const blob = new Blob([JSON.stringify({ name: projectName, document: doc }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (projectName || 'pasaporte') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    mark('Proyecto guardado y descargado');
  };

  $('openProject').onclick = () => $('projectFile').click();

  $('projectFile').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const loaded = JSON.parse(r.result);
        doc = loaded.document || loaded;
        ensureDocumentCalibration(doc);
        projectName = loaded.name || f.name.replace(/\.json$/i, '');
        selected = doc.pages[0];
        originalOrder = doc.pages.filter(p => p.number > 2).map(p => p.number);
        $('projectTitle').textContent = projectName;
        render();
        mark('Proyecto abierto correctamente');
      } catch {
        mark('No se pudo abrir el proyecto (archivo inválido)');
      }
    };
    r.readAsText(f);
  };

  $('newProject').onclick = () => {
    if (!confirm('¿Crear un proyecto nuevo? Guarda primero si necesitas conservar este proyecto.')) return;
    projectName = prompt('Nombre del nuevo proyecto', 'Pasaporte nuevo') || 'Pasaporte nuevo';
    doc = createExperimentalDocument(14);
    selected = doc.pages[0];
    originalOrder = doc.pages.filter(p => p.number > 2).map(p => p.number);
    $('projectTitle').textContent = projectName;
    render();
    mark('Nuevo proyecto creado');
  };

  if ($('impositionSpineMode')) {
    $('impositionSpineMode').onchange = () => {
      doc.impositionMode = $('impositionSpineMode').value;
      doc.customImposition = null;
      renderMaterialPrint();
      renderSheetOrganizer();
      applyTextStyles();
      mark(`Orientación de pares cambiada a: ${$('impositionSpineMode').selectedOptions[0].text}`);
    };
  }

  $('resetOrder').onclick = () => {
    reorderActivities(doc, originalOrder);
    render();
    mark('Orden original restaurado');
  };

  $('resetImposition').onclick = () => {
    resetCustomImposition(doc);
    render();
    mark('Imposición automática de cuadernillo restaurada');
  };

  document.querySelectorAll('nav button').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.querySelectorAll('.workspace > div').forEach(v => {
        v.classList.toggle('hidden', v.id !== b.dataset.view);
      });
      applyTextStyles();
      applyCalibrationStyles();
    };
  });

  $('print').onclick = () => window.print();

  $('coverPrint').onclick = () => {
    document.body.classList.add('cover-only');
    const cleanup = () => {
      document.body.classList.remove('cover-only');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 500);
  };
}

// Initial boot
initEventListeners();
render();

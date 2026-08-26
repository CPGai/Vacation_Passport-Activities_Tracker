const clone = value => JSON.parse(JSON.stringify(value));

const image = () => ({ src: '', file: '', rule: 'none', scale: 90, x: 0, y: 0, opacity: 23 });
const stamp = () => ({ imageSrc: 'Versiones/Picture1 stamp.png', label: 'SELLO · REALIZADO', subtitle: '', scale: 100, x: 0, y: 0, opacity: 100 });
const textOpacity = () => ({ title: 100, description: 100 });
const fontSize = () => ({ title: 20, description: 12 });
const textPosition = () => ({ titleX: 0, titleY: 0, descriptionX: 0, descriptionY: 0 });
export const defaultPrintCalibration = () => ({
  centerShiftX: 0,
  centerShiftY: 0,
  outerMargin: 4,
  backShiftX: 0,
  showCutGuides: true,
});

export function createExperimentalDocument(count = 14) {
  const actualCount = count || 14;
  return {
    version: 2,
    pageCount: actualCount,
    childName: 'Andrés',
    impositionMode: 'horizontal',
    pages: Array.from({ length: actualCount }, (_, index) => {
      const number = index + 1;
      const isCover = number === 1;
      const isIdentity = number === 2;
      const hasBackCovers = actualCount >= 14;
      const isBackCoverInside = hasBackCovers && number === actualCount - 1;
      const isBackCover = hasBackCovers && number === actualCount;
      const isSpecialCover = isCover || isIdentity || isBackCoverInside || isBackCover;

      const kind = isCover ? 'cover' : isIdentity ? 'identity' : (isBackCoverInside || isBackCover) ? 'blank' : 'activity';
      const template = isCover ? 'cover' : isIdentity ? 'identity' : (isBackCoverInside || isBackCover) ? 'blank-image' : 'activity';
      const material = isSpecialCover ? 'cover' : 'activity';
      const backgroundColor = (isCover || isIdentity) ? '#fff8ea' : (isBackCoverInside || isBackCover) ? '#ffffff' : '#edf8fa';

      return {
        number,
        kind,
        template,
        material,
        backgroundColor,
        activity: kind === 'activity' ? { title: `Actividad ${number - 1}`, description: 'Escribe aquí la descripción.' } : null,
        frameColor: '#9fcbd5',
        showNumber: true,
        numberPosition: 'top-center',
        fontSize: fontSize(),
        textOpacity: textOpacity(),
        textPosition: textPosition(),
        image: image(),
        stamp: stamp(),
      };
    }),
    customImposition: null,
    printCalibration: defaultPrintCalibration(),
  };
}

export function addPage(doc, template = 'activity') {
  const isCover = template === 'cover';
  const isIdentity = template === 'identity';
  const isBlank = template === 'blank' || template === 'blank-frame' || template === 'blank-image';
  const kind = isCover ? 'cover' : isIdentity ? 'identity' : isBlank ? 'blank' : 'activity';
  const material = isCover || isIdentity ? 'cover' : 'activity';
  const backgroundColor = (isCover || isIdentity) ? '#fff8ea' : isBlank ? '#ffffff' : '#edf8fa';

  const hasBackCovers = doc.pages.length >= 4 &&
    doc.pages[doc.pages.length - 1].material === 'cover' &&
    doc.pages[doc.pages.length - 2].material === 'cover';

  const insertIndex = (hasBackCovers && material !== 'cover') ? doc.pages.length - 2 : doc.pages.length;

  const page = {
    number: insertIndex + 1,
    kind,
    template,
    material,
    backgroundColor,
    activity: kind === 'activity' ? { title: `Actividad ${insertIndex - 1}`, description: 'Escribe aquí la descripción.' } : null,
    frameColor: '#9fcbd5',
    showNumber: true,
    numberPosition: 'top-center',
    fontSize: fontSize(),
    textOpacity: textOpacity(),
    textPosition: textPosition(),
    image: image(),
    stamp: stamp(),
  };

  doc.pages.splice(insertIndex, 0, page);
  doc.pages.forEach((p, idx) => { p.number = idx + 1; });
  doc.pageCount = doc.pages.length;
  doc.customImposition = null;
  return page;
}

export function removePage(doc, number) {
  if (Number(number) < 3) throw new Error('Solo se pueden eliminar páginas de actividad.');
  if (doc.pages.length <= 2) throw new Error('Debe conservarse la portada y la identidad.');
  const index = doc.pages.findIndex(page => page.number === Number(number));
  if (index < 0) throw new Error('Página inválida.');
  doc.pages.splice(index, 1);
  doc.pages.forEach((page, i) => { page.number = i + 1; });
  doc.pageCount = doc.pages.length;
  doc.customImposition = null;
  return doc;
}

export function calculateMaterialImposition(doc, overrideMode) {
  const impositionMode = overrideMode || doc?.impositionMode || doc?.printCalibration?.impositionMode || 'horizontal';
  const pages = doc?.pages || [];
  const coverPages = pages.filter(p => p.material === 'cover').map(p => p.number);
  const activityPages = pages.filter(p => p.material !== 'cover').map(p => p.number);

  // Cover imposition (strictly material: 'cover')
  const cFirst = coverPages[0] || 1;
  const cSecond = coverPages[1] || 2;
  const cThird = coverPages.length >= 4 ? coverPages[coverPages.length - 2] : (coverPages.length === 3 ? coverPages[2] : null);
  const cFourth = coverPages.length >= 4 ? coverPages[coverPages.length - 1] : null;

  let coverSides;
  if (impositionMode === 'vertical') {
    coverSides = [
      { sheet: 1, side: 'front', panels: [cFourth, null, cFirst, null] },
      { sheet: 1, side: 'back', panels: [null, cSecond, null, cThird] },
    ];
  } else {
    // Horizontal pairs (default)
    coverSides = [
      { sheet: 1, side: 'front', panels: [cFourth, cFirst, null, null] },
      { sheet: 1, side: 'back', panels: [cSecond, cThird, null, null] },
    ];
  }

  // Activities booklet signature imposition (strictly material: 'activity')
  const M = activityPages.length;
  const numLeaves = Math.ceil(M / 4);
  const leaves = [];

  for (let leafIdx = 0; leafIdx < numLeaves; leafIdx++) {
    const fRightIdx = 2 * leafIdx;
    const fLeftIdx = M - 1 - 2 * leafIdx;
    const bLeftIdx = 2 * leafIdx + 1;
    const bRightIdx = M - 1 - (2 * leafIdx + 1);

    const fRight = fRightIdx < M ? activityPages[fRightIdx] : null;
    const fLeft = fLeftIdx >= 0 && fLeftIdx < M && fLeftIdx >= fRightIdx ? activityPages[fLeftIdx] : null;

    let bLeft = null;
    let bRight = null;
    if (bLeftIdx < M && bLeftIdx <= (M - 1 - bLeftIdx)) {
      bLeft = activityPages[bLeftIdx];
    }
    if (bRightIdx >= 0 && bRightIdx < M && bRightIdx > bLeftIdx) {
      bRight = activityPages[bRightIdx];
    }

    leaves.push({
      front: [fLeft, fRight],
      back: [bLeft, bRight],
    });
  }

  const activitySides = [];
  const numActivitySheets = Math.ceil(leaves.length / 2);

  for (let s = 0; s < numActivitySheets; s++) {
    const leafA = leaves[2 * s] || { front: [null, null], back: [null, null] };
    const leafB = leaves[2 * s + 1] || { front: [null, null], back: [null, null] };
    const sheetNum = s + 1;

    if (impositionMode === 'vertical') {
      activitySides.push({
        sheet: sheetNum,
        side: 'front',
        panels: [leafA.front[0], leafB.front[0], leafA.front[1], leafB.front[1]],
      });
      activitySides.push({
        sheet: sheetNum,
        side: 'back',
        panels: [leafB.back[0], leafA.back[0], leafB.back[1], leafA.back[1]],
      });
    } else {
      // Horizontal pairs (default)
      activitySides.push({
        sheet: sheetNum,
        side: 'front',
        panels: [leafA.front[0], leafA.front[1], leafB.front[0], leafB.front[1]],
      });
      activitySides.push({
        sheet: sheetNum,
        side: 'back',
        panels: [leafA.back[0], leafA.back[1], leafB.back[0], leafB.back[1]],
      });
    }
  }

  return { cover: coverSides, activity: activitySides };
}

export function getEffectiveImposition(doc) {
  if (doc.customImposition) return doc.customImposition;
  return calculateMaterialImposition(doc);
}

export function setCustomPanelPage(doc, section, sideIndex, panelIndex, pageNumber) {
  if (!doc.customImposition) {
    doc.customImposition = clone(calculateMaterialImposition(doc));
  }
  const side = doc.customImposition[section]?.[sideIndex];
  if (side && panelIndex >= 0 && panelIndex < 4) {
    side.panels[panelIndex] = pageNumber === null || pageNumber === undefined ? null : Number(pageNumber);
  }
  return doc.customImposition;
}

export function swapSheetPanels(doc, fromLoc, toLoc) {
  if (!doc.customImposition) {
    doc.customImposition = clone(calculateMaterialImposition(doc));
  }
  const fromSide = doc.customImposition[fromLoc.section]?.[fromLoc.sideIndex];
  const toSide = doc.customImposition[toLoc.section]?.[toLoc.sideIndex];
  if (fromSide && toSide) {
    const temp = fromSide.panels[fromLoc.panelIndex];
    fromSide.panels[fromLoc.panelIndex] = toSide.panels[toLoc.panelIndex];
    toSide.panels[toLoc.panelIndex] = temp;
  }
  return doc.customImposition;
}

export function resetCustomImposition(doc) {
  doc.customImposition = null;
  return calculateMaterialImposition(doc);
}

export function getTargetPagesByScope(doc, scope = 'single', selectedPageNumber = 1, customSelection = []) {
  if (!doc || !Array.isArray(doc.pages)) return [];
  if (scope === 'all') {
    return [...doc.pages];
  }
  if (scope === 'activities') {
    return doc.pages.filter(p => p.number > 2);
  }
  if (scope === 'custom') {
    const set = new Set(Array.isArray(customSelection) ? customSelection : []);
    const selected = doc.pages.filter(p => set.has(p.number));
    return selected.length > 0 ? selected : [doc.pages.find(p => p.number === selectedPageNumber) || doc.pages[0]];
  }
  // Default 'single'
  const page = doc.pages.find(p => p.number === selectedPageNumber) || doc.pages[0];
  return page ? [page] : [];
}

export function applyPageSettings(targetPages, settings = {}) {
  if (!Array.isArray(targetPages) || targetPages.length === 0) return targetPages;

  targetPages.forEach(p => {
    if (settings.frameColor !== undefined) p.frameColor = settings.frameColor;
    if (settings.backgroundColor !== undefined) p.backgroundColor = settings.backgroundColor;
    if (settings.showNumber !== undefined) p.showNumber = settings.showNumber;
    if (settings.numberPosition !== undefined) p.numberPosition = settings.numberPosition;
    if (settings.material !== undefined) p.material = settings.material;
    if (settings.template !== undefined && p.number > 2) applyTemplate(p, settings.template);

    if (settings.fontSize) {
      p.fontSize = p.fontSize || { title: 20, description: 12 };
      if (settings.fontSize.title !== undefined) p.fontSize.title = settings.fontSize.title;
      if (settings.fontSize.description !== undefined) p.fontSize.description = settings.fontSize.description;
    }

    if (settings.textOpacity) {
      p.textOpacity = p.textOpacity || { title: 100, description: 100 };
      if (settings.textOpacity.title !== undefined) p.textOpacity.title = settings.textOpacity.title;
      if (settings.textOpacity.description !== undefined) p.textOpacity.description = settings.textOpacity.description;
    }

    if (settings.textPosition) {
      p.textPosition = p.textPosition || { titleX: 0, titleY: 0, descriptionX: 0, descriptionY: 0 };
      if (settings.textPosition.titleX !== undefined) p.textPosition.titleX = settings.textPosition.titleX;
      if (settings.textPosition.titleY !== undefined) p.textPosition.titleY = settings.textPosition.titleY;
      if (settings.textPosition.descriptionX !== undefined) p.textPosition.descriptionX = settings.textPosition.descriptionX;
      if (settings.textPosition.descriptionY !== undefined) p.textPosition.descriptionY = settings.textPosition.descriptionY;
    }

    if (settings.image) {
      p.image = p.image || { src: '', file: '', rule: 'none', scale: 90, x: 0, y: 0, opacity: 23 };
      if (settings.image.scale !== undefined) p.image.scale = settings.image.scale;
      if (settings.image.x !== undefined) p.image.x = settings.image.x;
      if (settings.image.y !== undefined) p.image.y = settings.image.y;
      if (settings.image.opacity !== undefined) p.image.opacity = settings.image.opacity;
      if (settings.image.src !== undefined) p.image.src = settings.image.src;
      if (settings.image.file !== undefined) p.image.file = settings.image.file;
      if (settings.image.rule !== undefined) p.image.rule = settings.image.rule;
    }

    if (settings.stamp) {
      p.stamp = p.stamp || { imageSrc: 'Versiones/Picture1 stamp.png', label: 'SELLO · REALIZADO', subtitle: '', scale: 100, x: 0, y: 0, opacity: 100 };
      if (settings.stamp.label !== undefined) p.stamp.label = settings.stamp.label;
      if (settings.stamp.imageSrc !== undefined) p.stamp.imageSrc = settings.stamp.imageSrc;
    }
  });

  return targetPages;
}

export function applyTemplate(page, template) {
  page.template = template;
  page.kind = template === 'cover' ? 'cover' : template === 'identity' ? 'identity' : template === 'activity' ? 'activity' : 'blank';
  if (page.kind !== 'activity') page.activity = null;
  if (page.kind === 'activity' && !page.activity) page.activity = { title: 'Nueva actividad', description: 'Escribe aquí la descripción.' };
  return page;
}

export function moveActivity(doc, from, to) {
  const source = doc.pages.find(p => p.number === Number(from));
  const target = doc.pages.find(p => p.number === Number(to));
  if (!source || !target || source.number < 3 || target.number < 3) throw new Error('Solo se pueden mover actividades.');
  target.activity = source.activity;
  target.image = source.image;
  target.stamp = source.stamp;
  target.fontSize = source.fontSize || fontSize();
  target.textOpacity = source.textOpacity || textOpacity();
  target.textPosition = source.textPosition || textPosition();
  target.numberPosition = source.numberPosition || 'top-center';
  target.backgroundColor = source.backgroundColor || '#edf8fa';
  source.activity = null;
  source.image = image();
  source.stamp = stamp();
  source.fontSize = fontSize();
  source.textOpacity = textOpacity();
  source.textPosition = textPosition();
  return doc;
}

export function reorderActivities(doc, numbers) {
  const pages = doc.pages.filter(p => p.number >= 3);
  if (numbers.length !== pages.length || numbers.some(number => Number(number) < 3) || new Set(numbers.map(Number)).size !== pages.length) {
    throw new Error('El orden debe contener todas las actividades.');
  }
  const snapshots = numbers.map(number => clone(doc.pages.find(p => p.number === Number(number))));
  pages.forEach((page, index) => {
    const snap = snapshots[index];
    page.activity = snap.activity;
    page.image = snap.image;
    page.stamp = snap.stamp;
    page.fontSize = snap.fontSize || fontSize();
    page.textOpacity = snap.textOpacity || textOpacity();
    page.textPosition = snap.textPosition || textPosition();
    page.numberPosition = snap.numberPosition || 'top-center';
    page.template = snap.template || 'activity';
    page.kind = snap.kind || 'activity';
    page.backgroundColor = snap.backgroundColor || '#edf8fa';
  });
  return numbers.map(Number);
}

export function pageKinds(doc) { return doc.pages.map(page => page.kind); }

export function generateCsvTemplate() {
  const headers = 'numero_pagina,titulo,descripcion,imagen';
  const examples = [
    '3,"Cataratas del Niágara","Paseo en barco Maid of the Mist hacia las imponentes caídas de agua.","Versiones/Picture1.png"',
    '4,"Torre CN","Mirador panorámico y piso de cristal sobre la ciudad de Toronto.","Versiones/Picture1 stamp.png"',
    '5,"Parque Stanley","Recorrido en bicicleta por el malecón junto al bosque templado.",""',
    '6,"Museo Real de Ontario","Exploración de la galería de dinosaurios y culturas del mundo.",""',
  ];
  return [headers, ...examples].join('\r\n');
}

export function normalizeCsvImagePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  let clean = rawPath.trim().replace(/^["'\s]+|["'\s]+$/g, '').trim();
  if (!clean) return '';
  clean = clean.replace(/\\/g, '/');
  if (/^(https?:\/\/|data:|blob:)/i.test(clean)) return clean;
  clean = clean.replace(/^file:\/\/\/?([a-zA-Z]:\/)?/i, '');
  const folderMatches = ['background images', 'Versiones', '_html_assets', 'assets', 'images'];
  for (const folder of folderMatches) {
    const idx = clean.toLowerCase().indexOf(folder.toLowerCase() + '/');
    if (idx !== -1) return clean.slice(idx);
  }
  const projIdx = clean.toLowerCase().indexOf("andre's visit sep-2026/");
  if (projIdx !== -1) return clean.slice(projIdx + "andre's visit sep-2026/".length);
  if (/^[a-zA-Z]:\//.test(clean)) {
    const filename = clean.split('/').pop();
    return filename ? `background images/${filename}` : '';
  }
  if (!clean.includes('/')) return `background images/${clean}`;
  return clean;
}

export function parseActivitiesCsv(csvString) {
  if (!csvString || typeof csvString !== 'string') return '';
  let clean = csvString.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const records = [];
  let currentField = '';
  let currentRecord = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';') {
        currentRecord.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') i++;
        currentRecord.push(currentField.trim());
        if (currentRecord.some(f => f.length > 0)) records.push(currentRecord);
        currentRecord = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.some(f => f.length > 0)) records.push(currentRecord);
  }

  if (records.length === 0) return [];

  let headerRow = records[0].map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  let startIndex = 0;
  let pageCol = 0, titleCol = 1, descCol = 2, imgCol = 3;

  if (headerRow.some(h => h.includes('pagina') || h.includes('titulo') || h.includes('desc') || h.includes('imag'))) {
    startIndex = 1;
    pageCol = headerRow.findIndex(h => h.includes('pagina') || h.includes('num') || h.includes('page'));
    titleCol = headerRow.findIndex(h => h.includes('titulo') || h.includes('title') || h.includes('nombre') || h.includes('actividad'));
    descCol = headerRow.findIndex(h => h.includes('desc'));
    imgCol = headerRow.findIndex(h => h.includes('imag') || h.includes('foto') || h.includes('link') || h.includes('ruta'));
    if (pageCol === -1) pageCol = 0;
    if (titleCol === -1) titleCol = 1;
    if (descCol === -1) descCol = 2;
    if (imgCol === -1) imgCol = 3;
  }

  const activities = [];
  for (let r = startIndex; r < records.length; r++) {
    const row = records[r];
    if (row.length === 0 || row.every(c => c === '')) continue;
    const pageNumRaw = row[pageCol];
    const pageNum = pageNumRaw && !isNaN(parseInt(pageNumRaw, 10)) ? parseInt(pageNumRaw, 10) : null;
    const title = (row[titleCol] ?? '').trim();
    const description = (row[descCol] ?? '').trim();
    const imageRaw = (row[imgCol] ?? '').trim();
    const image = normalizeCsvImagePath(imageRaw);

    if (title || description || image || pageNum) {
      activities.push({ pageNumber: pageNum, title, description, image });
    }
  }
  return activities;
}

export function importActivitiesFromCsv(doc, csvString) {
  const parsedActivities = parseActivitiesCsv(csvString);
  if (!parsedActivities || parsedActivities.length === 0) {
    throw new Error('El archivo CSV no contiene actividades válidas.');
  }

  let currentActivityPage = 3;
  parsedActivities.forEach((item) => {
    let targetPageNum = item.pageNumber && item.pageNumber >= 3 ? item.pageNumber : currentActivityPage;
    currentActivityPage = Math.max(currentActivityPage, targetPageNum + 1);

    while (doc.pages.length < targetPageNum) {
      addPage(doc, 'activity');
    }

    const page = doc.pages[targetPageNum - 1];
    page.kind = 'activity';
    page.template = 'activity';
    page.activity = {
      title: item.title || `Actividad ${page.number - 1}`,
      description: item.description || '',
    };

    if (item.image) {
      page.image = {
        src: item.image,
        file: item.image.split(/[/\\]/).pop(),
        rule: 'manual',
        scale: 90,
        x: 0,
        y: 0,
        opacity: 23,
      };
    }
  });

  doc.pageCount = doc.pages.length;
  doc.customImposition = null;
  return doc;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createExperimentalDocument,
  addPage,
  applyTemplate,
  moveActivity,
  reorderActivities,
  removePage,
  calculateMaterialImposition,
  getEffectiveImposition,
  setCustomPanelPage,
  swapSheetPanels,
  resetCustomImposition,
  defaultPrintCalibration,
  generateCsvTemplate,
  parseActivitiesCsv,
  normalizeCsvImagePath,
  importActivitiesFromCsv,
  getTargetPagesByScope,
  applyPageSettings,
} from '../experimental-passport-core.js';

test('creates experimental document with default 14 pages, proper metadata, backgroundColor, printCalibration, textPosition, numberPosition and page attributes', () => {
  const doc = createExperimentalDocument(14);
  assert.equal(doc.pageCount, 14);
  assert.equal(doc.pages.length, 14);
  assert.equal(doc.pages[0].kind, 'cover');
  assert.equal(doc.pages[1].kind, 'identity');
  assert.equal(doc.pages[2].kind, 'activity');
  assert.equal(doc.pages[12].kind, 'blank');
  assert.equal(doc.pages[13].kind, 'blank');
  assert.deepEqual(doc.pages[0].fontSize, { title: 20, description: 12 });
  assert.deepEqual(doc.pages[0].textOpacity, { title: 100, description: 100 });
  assert.deepEqual(doc.pages[0].textPosition, { titleX: 0, titleY: 0, descriptionX: 0, descriptionY: 0 });
  assert.equal(doc.pages[0].numberPosition, 'top-center');
  assert.equal(doc.pages[0].material, 'cover');
  assert.equal(doc.pages[1].material, 'cover');
  assert.equal(doc.pages[2].material, 'activity');
  assert.equal(doc.pages[12].material, 'cover');
  assert.equal(doc.pages[13].material, 'cover');
  assert.equal(doc.pages[0].backgroundColor, '#fff8ea');
  assert.equal(doc.pages[1].backgroundColor, '#fff8ea');
  assert.equal(doc.pages[2].backgroundColor, '#edf8fa');

  // Verify printCalibration
  assert.deepEqual(doc.printCalibration, {
    centerShiftX: 0,
    centerShiftY: 0,
    outerMargin: 4,
    backShiftX: 0,
    showCutGuides: true,
  });
  assert.deepEqual(defaultPrintCalibration(), doc.printCalibration);
});

test('calculateMaterialImposition separates cover (cartoncillo) and activity sheets correctly for 14 pages with horizontal and vertical spine modes', () => {
  // 14 pages: 4 cover panels (1, 2, 13, 14) + 10 activity panels (3 to 12)
  const doc14 = createExperimentalDocument(14);
  
  // Horizontal spine mode (default)
  const impH = calculateMaterialImposition(doc14, 'horizontal');
  assert.equal(impH.cover.length, 2, 'Cover has 1 front and 1 back side');
  assert.deepEqual(impH.cover[0].panels, [14, 1, null, null], 'Cover front contains back cover (14) and front cover (1)');
  assert.deepEqual(impH.cover[1].panels, [2, 13, null, null], 'Cover back contains identity (2) and inside back cover (13)');

  assert.equal(impH.activity.length, 4, '10 activities require 2 sheets (4 sides)');
  // Sheet 1: Outer booklet pairs (12 with 3, 4 with 11) and (10 with 5, 6 with 9)
  assert.deepEqual(impH.activity[0].panels, [12, 3, 10, 5], 'Sheet 1 front has pairs (12, 3) and (10, 5)');
  assert.deepEqual(impH.activity[1].panels, [4, 11, 6, 9], 'Sheet 1 back has pairs (4, 11) and (6, 9)');
  // Sheet 2: Center spread (8 with 7)
  assert.deepEqual(impH.activity[2].panels, [8, 7, null, null], 'Sheet 2 front has center spread (8, 7)');
  assert.deepEqual(impH.activity[3].panels, [null, null, null, null]);

  // Vertical spine mode
  const impV = calculateMaterialImposition(doc14, 'vertical');
  assert.deepEqual(impV.cover[0].panels, [14, null, 1, null]);
  assert.deepEqual(impV.cover[1].panels, [null, 2, null, 13]);
  assert.deepEqual(impV.activity[0].panels, [12, 10, 3, 5]);
  assert.deepEqual(impV.activity[1].panels, [6, 4, 9, 11]);
  assert.deepEqual(impV.activity[2].panels, [8, null, 7, null]);
  assert.deepEqual(impV.activity[3].panels, [null, null, null, null]);
});

test('allows reorganizing and swapping pages inside sheet panels with custom imposition support', () => {
  const doc = createExperimentalDocument(14);
  const defaultImp = getEffectiveImposition(doc);
  assert.deepEqual(defaultImp.activity[0].panels, [12, 3, 10, 5]);

  swapSheetPanels(doc, { section: 'activity', sideIndex: 0, panelIndex: 0 }, { section: 'activity', sideIndex: 0, panelIndex: 1 });
  const updatedImp = getEffectiveImposition(doc);
  assert.deepEqual(updatedImp.activity[0].panels, [3, 12, 10, 5]);

  setCustomPanelPage(doc, 'activity', 0, 2, 7);
  const customSetImp = getEffectiveImposition(doc);
  assert.equal(customSetImp.activity[0].panels[2], 7);

  resetCustomImposition(doc);
  const resetImp = getEffectiveImposition(doc);
  assert.deepEqual(resetImp.activity[0].panels, [12, 3, 10, 5]);
});

test('reorderActivities preserves custom font sizes, text opacity, textPosition, numberPosition, image, backgroundColor, and stamp metadata', () => {
  const doc = createExperimentalDocument(6);
  doc.pages[2].activity.title = 'Niagara Falls';
  doc.pages[2].activity.description = 'Boat tour';
  doc.pages[2].fontSize = { title: 28, description: 16 };
  doc.pages[2].textOpacity = { title: 80, description: 90 };
  doc.pages[2].textPosition = { titleX: 5, titleY: -3, descriptionX: 2, descriptionY: 4 };
  doc.pages[2].numberPosition = 'bottom-right';
  doc.pages[2].backgroundColor = '#ffe0b2';
  doc.pages[2].image.scale = 110;
  doc.pages[2].stamp.label = 'VISITED';

  doc.pages[3].activity.title = 'CN Tower';
  doc.pages[3].fontSize = { title: 16, description: 10 };
  doc.pages[3].textOpacity = { title: 100, description: 70 };
  doc.pages[3].textPosition = { titleX: -2, titleY: 6, descriptionX: 0, descriptionY: -1 };
  doc.pages[3].numberPosition = 'top-left';
  doc.pages[3].backgroundColor = '#e1bee7';

  reorderActivities(doc, [4, 3, 5, 6]);

  assert.equal(doc.pages[2].number, 3);
  assert.equal(doc.pages[2].activity.title, 'CN Tower');
  assert.deepEqual(doc.pages[2].fontSize, { title: 16, description: 10 });
  assert.deepEqual(doc.pages[2].textOpacity, { title: 100, description: 70 });
  assert.deepEqual(doc.pages[2].textPosition, { titleX: -2, titleY: 6, descriptionX: 0, descriptionY: -1 });
  assert.equal(doc.pages[2].numberPosition, 'top-left');
  assert.equal(doc.pages[2].backgroundColor, '#e1bee7');

  assert.equal(doc.pages[3].number, 4);
  assert.equal(doc.pages[3].activity.title, 'Niagara Falls');
  assert.deepEqual(doc.pages[3].fontSize, { title: 28, description: 16 });
  assert.deepEqual(doc.pages[3].textOpacity, { title: 80, description: 90 });
  assert.deepEqual(doc.pages[3].textPosition, { titleX: 5, titleY: -3, descriptionX: 2, descriptionY: 4 });
  assert.equal(doc.pages[3].numberPosition, 'bottom-right');
  assert.equal(doc.pages[3].backgroundColor, '#ffe0b2');
  assert.equal(doc.pages[3].image.scale, 110);
  assert.equal(doc.pages[3].stamp.label, 'VISITED');
});

test('removePage safely removes middle page and renumbers subsequent pages correctly', () => {
  const doc = createExperimentalDocument(6);
  doc.pages[2].activity.title = 'Page 3';
  doc.pages[3].activity.title = 'Page 4';
  doc.pages[4].activity.title = 'Page 5';
  doc.pages[5].activity.title = 'Page 6';

  removePage(doc, 4);

  assert.equal(doc.pageCount, 5);
  assert.equal(doc.pages.length, 5);
  assert.deepEqual(doc.pages.map(p => p.number), [1, 2, 3, 4, 5]);
  assert.equal(doc.pages[2].activity.title, 'Page 3');
  assert.equal(doc.pages[3].activity.title, 'Page 5');
  assert.equal(doc.pages[4].activity.title, 'Page 6');
});

test('addPage initializes all styling attributes including backgroundColor, textPosition, and numberPosition properly', () => {
  const doc = createExperimentalDocument(4);
  const newPage = addPage(doc, 'activity');
  assert.equal(newPage.number, 5);
  assert.equal(doc.pageCount, 5);
  assert.deepEqual(newPage.fontSize, { title: 20, description: 12 });
  assert.deepEqual(newPage.textOpacity, { title: 100, description: 100 });
  assert.deepEqual(newPage.textPosition, { titleX: 0, titleY: 0, descriptionX: 0, descriptionY: 0 });
  assert.equal(newPage.numberPosition, 'top-center');
  assert.equal(newPage.material, 'activity');
  assert.equal(newPage.backgroundColor, '#edf8fa');
});

test('CSV activities template generation and parser', () => {
  const template = generateCsvTemplate();
  assert.ok(template.includes('numero_pagina,titulo,descripcion,imagen'));
  assert.ok(template.includes('Cataratas del Niágara'));

  const parsed = parseActivitiesCsv(template);
  assert.equal(parsed.length, 4);
  assert.equal(parsed[0].pageNumber, 3);
  assert.equal(parsed[0].title, 'Cataratas del Niágara');
  assert.equal(parsed[0].image, 'Versiones/Picture1.png');

  // Test custom CSV with semicolons, quotes, and empty image
  const customCsv = `numero_pagina;titulo;descripcion;imagen\r\n7;"Puente Capilano";"Puente colgante entre los árboles";"https://example.com/capilano.jpg"`;
  const parsedCustom = parseActivitiesCsv(customCsv);
  assert.equal(parsedCustom.length, 1);
  assert.equal(parsedCustom[0].pageNumber, 7);
  assert.equal(parsedCustom[0].title, 'Puente Capilano');
  assert.equal(parsedCustom[0].description, 'Puente colgante entre los árboles');
  assert.equal(parsedCustom[0].image, 'https://example.com/capilano.jpg');
});

test('importActivitiesFromCsv creates required pages, loads content and centers images', () => {
  const doc = createExperimentalDocument(4); // 4 pages initially: cover, identity, act 1, act 2
  const csvData = [
    'numero_pagina,titulo,descripcion,imagen',
    '3,"Lago Moraine","Canoa en el lago turquesa","Versiones/Picture1.png"',
    '4,"Parque Banff","Senderismo en las montañas","Banff.jpg"',
    '5,"Glaciar Athabasca","Paseo sobre el hielo",""',
    '6,"Vancouver Seawall","Bicicleta por la costa","Vancouver.jpg"',
  ].join('\n');

  importActivitiesFromCsv(doc, csvData);

  assert.equal(doc.pages.length, 6, 'Document expanded from 4 to 6 pages');
  assert.equal(doc.pageCount, 6);
  assert.equal(doc.pages[0].kind, 'cover', 'Page 1 remains cover');
  assert.equal(doc.pages[1].kind, 'identity', 'Page 2 remains identity');

  // Page 3: Lago Moraine with image
  assert.equal(doc.pages[2].number, 3);
  assert.equal(doc.pages[2].activity.title, 'Lago Moraine');
  assert.equal(doc.pages[2].activity.description, 'Canoa en el lago turquesa');
  assert.equal(doc.pages[2].image.src, 'Versiones/Picture1.png');
  assert.equal(doc.pages[2].image.file, 'Picture1.png');
  assert.equal(doc.pages[2].image.x, 0, 'Image is centered horizontally');
  assert.equal(doc.pages[2].image.y, 0, 'Image is centered vertically');
  assert.equal(doc.pages[2].image.scale, 90);
  assert.equal(doc.pages[2].image.opacity, 23);

  // Page 5: Glaciar Athabasca without image
  assert.equal(doc.pages[4].number, 5);
  assert.equal(doc.pages[4].activity.title, 'Glaciar Athabasca');
  assert.equal(doc.pages[4].activity.description, 'Paseo sobre el hielo');

  // Page 6: Vancouver
  assert.equal(doc.pages[5].number, 6);
  assert.equal(doc.pages[5].activity.title, 'Vancouver Seawall');
  assert.equal(doc.pages[5].image.file, 'Vancouver.jpg');
});

test('HTML and CSS contracts: collapsible sections, sequential editor, CSV buttons, sheet organizer, calibration, text offset, number position, :empty rules', () => {
  const cssContent = fs.readFileSync(path.resolve('pasaporte-experimental.css'), 'utf8');
  const htmlContent = fs.readFileSync(path.resolve('pasaporte-experimental.html'), 'utf8');

  // Verify CSS does not duplicate :root twice
  const rootMatches = cssContent.match(/:root/g) || [];
  assert.equal(rootMatches.length, 1, 'CSS should contain exactly one :root definition (no duplication)');

  // Verify CSS includes print media rule for body.cover-only
  assert.match(cssContent, /body\.cover-only/, 'CSS must include rule for body.cover-only print filtering');

  // Verify CSS includes :empty suppression rules for empty headers/paragraphs
  assert.match(cssContent, /\.page h2:empty/, 'CSS must hide empty h2 tags');
  assert.match(cssContent, /\.page p:empty/, 'CSS must hide empty p tags');

  // Verify number positioning CSS classes
  assert.match(cssContent, /\.number\.pos-top-center/, 'CSS defines pos-top-center');
  assert.match(cssContent, /\.number\.pos-top-left/, 'CSS defines pos-top-left');
  assert.match(cssContent, /\.number\.pos-top-right/, 'CSS defines pos-top-right');
  assert.match(cssContent, /\.number\.pos-bottom-center/, 'CSS defines pos-bottom-center');
  assert.match(cssContent, /\.number\.pos-bottom-left/, 'CSS defines pos-bottom-left');
  assert.match(cssContent, /\.number\.pos-bottom-right/, 'CSS defines pos-bottom-right');

  // Verify CSS includes print calibration quadrant shifts and variables
  assert.match(cssContent, /--center-shift-x/, 'CSS defines --center-shift-x');
  assert.match(cssContent, /--center-shift-y/, 'CSS defines --center-shift-y');
  assert.match(cssContent, /--outer-margin/, 'CSS defines --outer-margin');
  assert.match(cssContent, /--back-shift-x/, 'CSS defines --back-shift-x');
  assert.match(cssContent, /with-guides/, 'CSS defines with-guides cut lines');

  // Verify collapsible details & summary elements exist
  assert.ok(htmlContent.includes('<details'), 'HTML contains collapsible <details> menus');
  assert.ok(htmlContent.includes('<summary'), 'HTML contains <summary> headings');

  // Verify CSV buttons in HTML
  assert.ok(htmlContent.includes('id="downloadCsvTemplate"'), 'HTML contains download CSV template button');
  assert.ok(htmlContent.includes('id="importCsvBtn"'), 'HTML contains import CSV button');
  assert.ok(htmlContent.includes('id="csvFileInput"'), 'HTML contains hidden CSV file input');

  // Verify calibration controls in HTML
  assert.ok(htmlContent.includes('id="centerShiftX"'));
  assert.ok(htmlContent.includes('id="centerShiftY"'));
  assert.ok(htmlContent.includes('id="outerMargin"'));
  assert.ok(htmlContent.includes('id="backShiftX"'));
  assert.ok(htmlContent.includes('id="showCutGuides"'));
  assert.ok(htmlContent.includes('id="resetCalibration"'));

  // Verify numberPosition and text offset controls in HTML
  assert.ok(htmlContent.includes('id="numberPosition"'));
  assert.ok(htmlContent.includes('id="titleX"'));
  assert.ok(htmlContent.includes('id="titleY"'));
  assert.ok(htmlContent.includes('id="descriptionX"'));
  assert.ok(htmlContent.includes('id="descriptionY"'));
  assert.ok(htmlContent.includes('id="resetTextPos"'));

  // Verify other sidebar controls exist
  assert.ok(htmlContent.includes('id="material"'));
  assert.ok(htmlContent.includes('id="removePage"'));
  assert.ok(htmlContent.includes('id="frame"'));
  assert.ok(htmlContent.includes('id="bgColor"'));
  assert.ok(htmlContent.includes('id="order"'), 'Contains activity sequential order/editor container');
  assert.ok(htmlContent.includes('id="sheetOrganizer"'), 'Contains sheet panel organizer');
  assert.ok(htmlContent.includes('id="impositionSpineMode"'), 'Contains #impositionSpineMode selector');
  assert.ok(!htmlContent.includes('id="experimentalNewControls"'), 'No detached stray bottom container');

  // Verify dedicated Sello section and sub-controls
  assert.ok(htmlContent.includes('id="secStamp"'), 'Contains dedicated #secStamp section');
  assert.ok(htmlContent.includes('id="stamp"'), 'Contains #stamp text input');
  assert.ok(htmlContent.includes('id="showStamp"'), 'Contains #showStamp checkbox');
  assert.ok(htmlContent.includes('id="stampImage"'), 'Contains #stampImage file input');
  assert.ok(htmlContent.includes('id="stampScale"'), 'Contains #stampScale range');
  assert.ok(htmlContent.includes('id="stampX"'), 'Contains #stampX range');
  assert.ok(htmlContent.includes('id="stampY"'), 'Contains #stampY range');
  assert.ok(htmlContent.includes('id="stampOpacity"'), 'Contains #stampOpacity range');
  assert.ok(htmlContent.includes('id="resetStamp"'), 'Contains #resetStamp button');

  // Verify @media print rules
  assert.match(cssContent, /#printView[\s\S]*?display:\s*block\s*!important/, 'CSS print media must display #printView');
  assert.match(cssContent, /\.sheet-side[\s\S]*?display:\s*grid\s*!important/, 'CSS print media must display .sheet-side as grid');
  assert.match(cssContent, /print-color-adjust:\s*exact/, 'CSS print media must preserve exact print colors');
  assert.match(cssContent, /-webkit-print-color-adjust:\s*exact/, 'CSS print media must preserve webkit exact print colors');

  // Verify JS file includes title position live transform handlers and bindings
  const jsContent = fs.readFileSync(path.resolve('pasaporte-experimental.js'), 'utf8');
  assert.match(jsContent, /updateTextTransformsLive/, 'JS includes live text transform updater');
  assert.match(jsContent, /titleX/, 'JS binds titleX');
  assert.match(jsContent, /titleY/, 'JS binds titleY');
  assert.match(jsContent, /titleXOut/, 'JS updates titleXOut');
  assert.match(jsContent, /titleYOut/, 'JS updates titleYOut');
});

test('normalizeCsvImagePath properly cleans Windows absolute paths, quotes, and resolves relative background images', () => {
  // Test Windows path with triple quotes
  const winPath = '"""C:\\Users\\carlo\\My Drive (carlos.peralta.gutierrez@gmail.com)\\01-Doc for Karen\\Andre\'s visit Sep-2026\\background images\\Niagara_Falls.JPG"""';
  assert.equal(normalizeCsvImagePath(winPath), 'background images/Niagara_Falls.JPG');

  // Test space containing file
  const winPathSpaces = 'C:\\something\\background images\\Nickel Beach - Splash Town.jpg';
  assert.equal(normalizeCsvImagePath(winPathSpaces), 'background images/Nickel Beach - Splash Town.jpg');

  // Test simple filename
  assert.equal(normalizeCsvImagePath('ROM.jpg'), 'background images/ROM.jpg');

  // Test web URL
  assert.equal(normalizeCsvImagePath('https://example.com/photo.png'), 'https://example.com/photo.png');

  // Test importing user CSV file from disk
  const userCsvPath = path.resolve('Versiones/plantilla_actividades_pasaporte Aug 26, 2026.csv');
  if (fs.existsSync(userCsvPath)) {
    const csvContent = fs.readFileSync(userCsvPath, 'utf8');
    const doc = createExperimentalDocument(12);
    importActivitiesFromCsv(doc, csvContent);

    assert.equal(doc.pages[2].activity.title, 'Niagara Falls');
    assert.equal(doc.pages[2].image.src, 'background images/Niagara_Falls.JPG');
    assert.ok(fs.existsSync(path.resolve(doc.pages[2].image.src)), 'Niagara Falls image must exist on disk');

    assert.equal(doc.pages[3].activity.title, 'Nickel Beach');
    assert.equal(doc.pages[3].image.src, 'background images/Nickel Beach - Splash Town.jpg');
    assert.ok(fs.existsSync(path.resolve(doc.pages[3].image.src)), 'Nickel Beach image must exist on disk');

    assert.equal(doc.pages[4].activity.title, 'ROM');
    assert.equal(doc.pages[4].image.src, 'background images/ROM.jpg');
    assert.ok(fs.existsSync(path.resolve(doc.pages[4].image.src)), 'ROM image must exist on disk');
  }
});

test('getTargetPagesByScope returns correct subsets for single, all, activities and custom scopes', () => {
  const doc = createExperimentalDocument(12);

  // Single scope
  const single = getTargetPagesByScope(doc, 'single', 4);
  assert.equal(single.length, 1);
  assert.equal(single[0].number, 4);

  // All scope
  const all = getTargetPagesByScope(doc, 'all');
  assert.equal(all.length, 12);
  assert.equal(all[0].number, 1);
  assert.equal(all[11].number, 12);

  // Activities scope
  const acts = getTargetPagesByScope(doc, 'activities');
  assert.equal(acts.length, 10);
  assert.equal(acts[0].number, 3);
  assert.equal(acts[9].number, 12);

  // Custom scope
  const custom = getTargetPagesByScope(doc, 'custom', 1, [3, 5, 8]);
  assert.equal(custom.length, 3);
  assert.deepEqual(custom.map(p => p.number), [3, 5, 8]);
});

test('applyPageSettings applies colors, positions, opacities, fonts and number position to target pages while protecting activity text', () => {
  const doc = createExperimentalDocument(12);
  const targets = getTargetPagesByScope(doc, 'custom', 1, [3, 4, 7]);

  // Record initial titles
  const p3Title = doc.pages[2].activity.title;
  const p4Title = doc.pages[3].activity.title;

  applyPageSettings(targets, {
    frameColor: '#ff5500',
    backgroundColor: '#fff0ee',
    showNumber: false,
    numberPosition: 'bottom-left',
    fontSize: { title: 24, description: 14 },
    textOpacity: { title: 80, description: 75 },
    textPosition: { titleX: 5, titleY: -3, descriptionX: 2, descriptionY: 1 },
    stamp: { label: 'VISITADO Y SELLADO' },
  });

  // Verify target pages updated
  [2, 3, 6].forEach(idx => {
    const p = doc.pages[idx];
    assert.equal(p.frameColor, '#ff5500');
    assert.equal(p.backgroundColor, '#fff0ee');
    assert.equal(p.showNumber, false);
    assert.equal(p.numberPosition, 'bottom-left');
    assert.equal(p.fontSize.title, 24);
    assert.equal(p.fontSize.description, 14);
    assert.equal(p.textOpacity.title, 80);
    assert.equal(p.textOpacity.description, 75);
    assert.equal(p.textPosition.titleX, 5);
    assert.equal(p.textPosition.titleY, -3);
    assert.equal(p.stamp.label, 'VISITADO Y SELLADO');
  });

  // Verify activity text titles were NOT erased
  assert.equal(doc.pages[2].activity.title, p3Title);
  assert.equal(doc.pages[3].activity.title, p4Title);

  // Verify non-target page (e.g. Page 5) remained unchanged
  assert.equal(doc.pages[4].frameColor, '#9fcbd5');
  assert.equal(doc.pages[4].showNumber, true);
  assert.equal(doc.pages[4].numberPosition, 'top-center');
});

test('HTML and CSS contracts for Multi-Page Scope selector, chip container and pill buttons', () => {
  const htmlContent = fs.readFileSync(path.resolve('pasaporte-experimental.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve('pasaporte-experimental.css'), 'utf8');

  // HTML contracts
  assert.ok(htmlContent.includes('id="applyScopeSelect"'), 'HTML contains #applyScopeSelect');
  assert.ok(htmlContent.includes('id="customScopeWrapper"'), 'HTML contains #customScopeWrapper');
  assert.ok(htmlContent.includes('id="customScopeChips"'), 'HTML contains #customScopeChips');
  assert.ok(htmlContent.includes('id="scopeSelectAll"'), 'HTML contains #scopeSelectAll');
  assert.ok(htmlContent.includes('id="scopeSelectActivities"'), 'HTML contains #scopeSelectActivities');
  assert.ok(htmlContent.includes('id="scopeClearAll"'), 'HTML contains #scopeClearAll');

  // CSS contracts
  assert.match(cssContent, /\.custom-scope-wrapper/, 'CSS defines .custom-scope-wrapper');
  assert.match(cssContent, /\.scope-chip/, 'CSS defines .scope-chip');
  assert.match(cssContent, /\.scope-chip\.checked/, 'CSS defines .scope-chip.checked');
  assert.match(cssContent, /\.thumb\.scope-active/, 'CSS defines .thumb.scope-active');
});

test('font size settings apply to both logical and print views without CSS !important override', () => {
  const cssContent = fs.readFileSync(path.resolve('pasaporte-experimental.css'), 'utf8');
  const jsContent = fs.readFileSync(path.resolve('pasaporte-experimental.js'), 'utf8');

  // Verify CSS does NOT override print-panel page h2/p with hardcoded !important
  assert.ok(!cssContent.includes('.print-panel .page h2 {\n  font-size: 13px !important;'), 'No hardcoded font-size !important on print-panel h2');
  assert.ok(!cssContent.includes('.print-panel .page p {\n  font-size: 8.5px !important;'), 'No hardcoded font-size !important on print-panel p');

  // Verify JS applyTextStyles sets fontSize on all views
  assert.match(jsContent, /updateFontSizeLive/, 'JS provides live font size updater');
  assert.match(jsContent, /title\.style\.fontSize\s*=\s*\(p\.fontSize\?\.title\s*\|\|\s*20\)\s*\+\s*'px'/, 'applyTextStyles sets dynamic title font size for all views');
  assert.match(jsContent, /description\.style\.fontSize\s*=\s*\(p\.fontSize\?\.description\s*\|\|\s*12\)\s*\+\s*'px'/, 'applyTextStyles sets dynamic description font size for all views');
});

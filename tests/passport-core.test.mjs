import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeName, resolveBackground, calculateImposition, calculateMaterialImposition, createDocument, removePage, swapActivities, validatePageCount } from '../passport-core.js';

test('removes an activity page and renumbers later pages', () => {
  const doc = createDocument(6);
  removePage(doc, 4);
  assert.equal(doc.pageCount, 5);
  assert.deepEqual(doc.pages.map(page => page.number), [1, 2, 3, 4, 5]);
  assert.throws(() => removePage(doc, 1), /special/i);
});

test('separates cover material from activity material', () => {
  const result = calculateMaterialImposition(12);
  assert.deepEqual(result.cover.map(({ side, panels }) => [side, panels]), [
    ['front', [12, 1, null, null]],
    ['back', [2, 10, null, null]]
  ]);
  assert.deepEqual(result.activity.flatMap(side => side.panels).filter(Boolean).sort((a, b) => a - b), [3, 4, 5, 6, 7, 8, 9, 11]);
});

test('normaliza espacios, guiones, acentos y extensión', () => {
  assert.equal(normalizeName(' Little-Beach.jpeg '), 'littlebeach');
  assert.equal(normalizeName('Cataratas del Niágara'), 'cataratasdelniagara');
});

test('prioriza actividad, luego P<n>, luego sin imagen', () => {
  const files = ['little-beach.jpg', 'P3.png', 'P4.png'];
  assert.deepEqual(resolveBackground('Little Beach', 3, files), { file: 'little-beach.jpg', rule: 'activity' });
  assert.deepEqual(resolveBackground('Sin fondo', 4, files), { file: 'P4.png', rule: 'page' });
  assert.deepEqual(resolveBackground('Otra', 8, files), { file: null, rule: 'none' });
});

test('genera imposición de 16 páginas con frente y reverso correctos', () => {
  assert.deepEqual(calculateImposition(16), [
    { sheet: 1, side: 'front', panels: [16, 1, 14, 3] },
    { sheet: 1, side: 'back', panels: [2, 15, 4, 13] },
    { sheet: 2, side: 'front', panels: [12, 5, 10, 7] },
    { sheet: 2, side: 'back', panels: [6, 11, 8, 9] }
  ]);
});

test('redondea a hojas completas y marca rellenos', () => {
  const result = calculateImposition(10);
  assert.equal(result.length, 4);
  assert.ok(result.flatMap(x => x.panels).includes(null));
  assert.equal(validatePageCount(11).ok, false);
});

test('protege páginas especiales y mueve el contenido sin cambiar números', () => {
  const doc = createDocument(6);
  const before = doc.pages[2].activity.title;
  assert.throws(() => swapActivities(doc, 1, 3));
  const other = doc.pages[3].activity.title;
  swapActivities(doc, 3, 4);
  assert.equal(doc.pages[2].number, 3);
  assert.equal(doc.pages[2].activity.title, other);
  assert.notEqual(before, doc.pages[2].activity.title);
});

test('la página se puede abrir localmente sin depender de módulos ES', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.match(html, /<script src=["']passport-core-browser\.js["']/i);
  assert.match(html, /<script src=["']app\.js["']/i);
});

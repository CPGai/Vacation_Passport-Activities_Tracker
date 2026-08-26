import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createExperimentalDocument,
  addPage,
  applyTemplate,
  moveActivity,
  reorderActivities,
  pageKinds,
  removePage,
  calculateMaterialImposition,
} from '../experimental-passport-core.js';

test('creates a protected cover and identity page plus activities', () => {
  const doc = createExperimentalDocument(4);
  assert.deepEqual(doc.pages.map(page => page.kind), ['cover', 'identity', 'activity', 'activity']);
  assert.equal(doc.pages[0].number, 1);
  assert.equal(doc.pages[1].number, 2);
});

test('adds a page from a selected template without changing existing numbers', () => {
  const doc = createExperimentalDocument(4);
  const page = addPage(doc, 'blank-frame');
  assert.equal(page.number, 5);
  assert.equal(page.template, 'blank-frame');
  assert.equal(doc.pages.length, 5);
  assert.deepEqual(doc.pages.slice(0, 4).map(p => p.number), [1, 2, 3, 4]);
});

test('applies a template while preserving compatible visual settings', () => {
  const doc = createExperimentalDocument(4);
  const page = doc.pages[2];
  page.frameColor = '#ff0000';
  page.image.opacity = 0;
  applyTemplate(page, 'blank-image');
  assert.equal(page.kind, 'blank');
  assert.equal(page.frameColor, '#ff0000');
  assert.equal(page.image.opacity, 0);
  assert.equal(page.activity, null);
});

test('moves an activity with its image and stamp while preserving physical page numbers', () => {
  const doc = createExperimentalDocument(5);
  const source = doc.pages[2];
  source.activity.title = 'Cataratas';
  source.image.file = 'Cataratas.jpg';
  source.stamp.label = 'HECHO';
  moveActivity(doc, 3, 5);
  assert.equal(doc.pages[2].number, 3);
  assert.equal(doc.pages[2].activity, null);
  assert.equal(doc.pages[4].activity.title, 'Cataratas');
  assert.equal(doc.pages[4].image.file, 'Cataratas.jpg');
  assert.equal(doc.pages[4].stamp.label, 'HECHO');
});

test('reorders activities by destination order and protects special pages', () => {
  const doc = createExperimentalDocument(6);
  const order = reorderActivities(doc, [6, 4, 5, 3]);
  assert.deepEqual(order, [6, 4, 5, 3]);
  assert.equal(doc.pages[0].kind, 'cover');
  assert.equal(doc.pages[1].kind, 'identity');
  assert.throws(() => reorderActivities(doc, [1, 3, 4, 5]), /actividades/);
  assert.deepEqual(pageKinds(doc), ['cover', 'identity', 'activity', 'activity', 'activity', 'activity']);
});

test('removes only activity pages and renumbers the document', () => {
  const doc = createExperimentalDocument(6);
  removePage(doc, 4);
  assert.deepEqual(doc.pages.map(page => page.number), [1, 2, 3, 4, 5]);
  assert.equal(doc.pageCount, 5);
  assert.throws(() => removePage(doc, 1), /actividad/);
});

test('separates cartoncillo from normal paper in the imposed output', () => {
  const result = calculateMaterialImposition(createExperimentalDocument(14));
  assert.deepEqual(result.cover, [
    { sheet: 1, side: 'front', panels: [14, 1, null, null] },
    { sheet: 1, side: 'back', panels: [2, 13, null, null] },
  ]);
  assert.equal(result.activity.length, 4);
  assert.equal(result.activity.every(side => side.panels.length === 4), true);
});

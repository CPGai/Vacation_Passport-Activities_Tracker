import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, resolveBackground } from '../passport-core.js';

const stampKeys = ['imageSrc', 'label', 'subtitle', 'scale', 'x', 'y', 'opacity'];
const imageKeys = ['src', 'rule', 'file', 'scale', 'x', 'y', 'opacity'];

function activityPage(document, number = 3) {
  return document.pages.find((page) => page.number === number);
}

test('el modelo de sello conserva imagen, texto y transformacion', () => {
  const page = activityPage(createDocument(4));

  assert.ok(page.stamp, 'cada pagina debe tener un modelo de sello');
  assert.deepEqual(Object.keys(page.stamp).sort(), [...stampKeys].sort());
  assert.equal(typeof page.stamp.imageSrc, 'string');
  assert.equal(typeof page.stamp.label, 'string');
  assert.equal(typeof page.stamp.subtitle, 'string');
  for (const key of ['scale', 'x', 'y', 'opacity']) {
    assert.equal(typeof page.stamp[key], 'number', `stamp.${key} debe ser numerico`);
  }
});

test('el modelo de imagen conserva fuente, regla y transformacion', () => {
  const page = activityPage(createDocument(4));

  assert.ok(page.image);
  assert.deepEqual(Object.keys(page.image).sort(), [...imageKeys].sort());
  assert.equal(typeof page.image.src, 'string');
  assert.equal(typeof page.image.rule, 'string');
  assert.equal(typeof page.image.file, 'string');
  for (const key of ['scale', 'x', 'y', 'opacity']) {
    assert.equal(typeof page.image[key], 'number', `image.${key} debe ser numerico`);
  }
});

test('resuelve imagen por actividad, luego por P<n>, luego none', () => {
  const files = ['Little Beach.jpg', 'P3.png'];

  assert.deepEqual(resolveBackground('Little Beach', 3, files), {
    file: 'Little Beach.jpg',
    rule: 'activity'
  });
  assert.deepEqual(resolveBackground('Otra actividad', 3, ['P3.png']), {
    file: 'P3.png',
    rule: 'page'
  });
  assert.deepEqual(resolveBackground('Otra actividad', 9, []), {
    file: null,
    rule: 'none'
  });
});

test('opacidad 0 y 100 se conservan al serializar y restaurar el modelo', () => {
  const document = createDocument(4);
  const page = activityPage(document);

  page.stamp.opacity = 0;
  page.image.opacity = 100;
  const restored = JSON.parse(JSON.stringify(document));
  const restoredPage = activityPage(restored);

  assert.equal(restoredPage.stamp.opacity, 0);
  assert.equal(restoredPage.image.opacity, 100);
});

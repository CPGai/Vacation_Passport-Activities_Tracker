import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateImposition } from '../passport-core.js';

function assertSheetSideContract(side) {
  assert.match(side.side, /^(front|back)$/);
  assert.ok(Number.isInteger(side.sheet) && side.sheet >= 1);
  assert.ok(Array.isArray(side.panels));
  assert.equal(side.panels.length, 4, 'cada frente o reverso debe tener exactamente 4 paneles');
}

test('cada frente y reverso es un contenedor separado con exactamente cuatro paneles', () => {
  const result = calculateImposition(10);

  for (const side of result) assertSheetSideContract(side);

  assert.deepEqual(
    result.map(({ sheet, side }) => [sheet, side]),
    [[1, 'front'], [1, 'back'], [2, 'front'], [2, 'back']]
  );
  assert.notStrictEqual(result[0].panels, result[1].panels);
  assert.notStrictEqual(result[2].panels, result[3].panels);
});

test('calculateImposition cubre los tamaños requeridos con hojas completas y rellenos null', () => {
  for (const pageCount of [4, 8, 10, 12, 16]) {
    const result = calculateImposition(pageCount);
    const expectedSheets = Math.ceil(pageCount / 8);
    const expectedPanels = expectedSheets * 8;

    assert.equal(result.length, expectedSheets * 2, `${pageCount} páginas deben producir frente y reverso por hoja`);
    assert.deepEqual(
      [...new Set(result.map(side => side.sheet))],
      Array.from({ length: expectedSheets }, (_, index) => index + 1)
    );
    for (const side of result) assertSheetSideContract(side);

    const panels = result.flatMap(side => side.panels);
    assert.equal(panels.length, expectedPanels);
    assert.equal(panels.filter(panel => panel === null).length, expectedPanels - pageCount);
    assert.deepEqual(
      panels.filter(panel => panel !== null).sort((a, b) => a - b),
      Array.from({ length: pageCount }, (_, index) => index + 1)
    );
  }
});


export const normalizeName = (value = '') => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.[a-z0-9]+$/i, '').replace(/[\s_-]+/g, '');

export function resolveBackground(activity, pageNumber, files = []) {
  const activityKey = normalizeName(activity);
  const activityFile = files.find(file => normalizeName(file) === activityKey);
  if (activityFile) return { file: activityFile, rule: 'activity' };
  const pageFile = files.find(file => /^p\d+\.[^.]+$/i.test(file) && Number(file.match(/^p(\d+)/i)[1]) === pageNumber);
  return pageFile ? { file: pageFile, rule: 'page' } : { file: null, rule: 'none' };
}

export function validatePageCount(value) {
  const count = Number(value);
  return { ok: Number.isInteger(count) && count >= 2 && count % 2 === 0, count };
}

export function calculateImposition(pageCount) {
  const check = validatePageCount(pageCount);
  if (!check.ok) throw new Error('El número de páginas debe ser par y mínimo 2.');
  const total = Math.ceil(check.count / 8) * 8;
  const result = [];
  for (let base = 0, sheet = 1; base < total / 2; base += 4, sheet++) {
    const high = total - base;
    const add = (side, panels) => result.push({ sheet, side, panels: panels.map(n => n > check.count ? null : n) });
    add('front', [high, 1 + base, high - 2, 3 + base]);
    add('back', [2 + base, high - 1, 4 + base, high - 3]);
  }
  return result;
}

function imposePages(pageNumbers) {
  const total = Math.ceil(pageNumbers.length / 8) * 8;
  const slots = [...pageNumbers, ...Array(total - pageNumbers.length).fill(null)];
  const result = [];
  for (let base = 0, sheet = 1; base < total / 2; base += 4, sheet++) {
    const high = total - base;
    const panel = n => slots[n - 1] ?? null;
    result.push({ sheet, side: 'front', panels: [panel(high), panel(1 + base), panel(high - 2), panel(3 + base)] });
    result.push({ sheet, side: 'back', panels: [panel(2 + base), panel(high - 1), panel(4 + base), panel(high - 3)] });
  }
  return result;
}

export function calculateMaterialImposition(pageCount) {
  const check = validatePageCount(pageCount);
  if (!check.ok) throw new Error('El nÃºmero de pÃ¡ginas debe ser par y mÃ­nimo 2.');
  const coverPages = [1, 2, pageCount - 2, pageCount].filter((page, index, pages) => pages.indexOf(page) === index);
  const activityPages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(page => !coverPages.includes(page));
  return {
    cover: [
      { sheet: 1, side: 'front', panels: [pageCount, 1, null, null] },
      { sheet: 1, side: 'back', panels: [2, pageCount - 2, null, null] }
    ],
    activity: imposePages(activityPages)
  };
}

export function createDocument(count = 12) {
  if (!validatePageCount(count).ok) throw new Error('El número de páginas debe ser par y mínimo 2.');
  const pages = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    template: i === 0 ? 'cover' : i === 1 ? 'identity' : 'activity',
    activity: i < 2 ? null : { title: `Actividad ${i - 1}`, description: 'Escribe aquí la descripción.' },
    showNumber: true,
    frameColor: '#9fcbd5',
    stamp: { imageSrc: 'Versiones/Picture1 stamp.png', label: 'SELLO · REALIZADO', subtitle: 'Actividad completada', scale: 100, x: 0, y: 0, opacity: 100 },
    image: { src: '', rule: 'none', file: '', scale: 90, x: 0, y: 0, opacity: 23 }
  }));
  return { version: 1, childName: 'Andrés', pageCount: count, pages };
}

export function swapActivities(doc, from, to) {
  if (from < 3 || to < 3) throw new Error('Las páginas 1 y 2 están protegidas.');
  const a = doc.pages.find(p => p.number === from), b = doc.pages.find(p => p.number === to);
  if (!a || !b) throw new Error('Página inválida.');
  [a.activity, b.activity] = [b.activity, a.activity];
  [a.image, b.image] = [b.image, a.image];
  return doc;
}

export function removePage(doc, pageNumber) {
  const number = Number(pageNumber);
  if (number < 3) throw new Error('Las páginas especiales no se pueden eliminar.');
  if (doc.pages.length <= 2) throw new Error('Debe conservarse la portada y la página de identidad.');
  const index = doc.pages.findIndex(page => page.number === number);
  if (index < 0) throw new Error('Página inválida.');
  doc.pages.splice(index, 1);
  doc.pages.forEach((page, i) => { page.number = i + 1; });
  doc.pageCount = doc.pages.length;
  return doc;
}

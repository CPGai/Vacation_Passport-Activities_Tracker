# Pasaporte infantil — restauración de funciones y corrección de imposición

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar las capacidades funcionales de `pasaporte-imprimible.html` en la aplicación actual y garantizar determinísticamente cuatro paneles por lado de cada hoja física.

**Architecture:** `passport-core.js` seguirá conteniendo reglas puras para imposición, modelo, imágenes y sello. `app.js` renderizará la vista lógica y una colección de contenedores independientes `sheet-side`, cada uno con exactamente cuatro paneles. La primera versión y sus assets permanecen intactos como baseline de referencia.

**Tech Stack:** HTML/CSS/JavaScript vanilla, Node `node:test`, localStorage, FileReader.

## Global Constraints

- No modificar ni eliminar `pasaporte-imprimible.html`, `pasaporte-imprimible-v2.html` ni los assets existentes.
- Páginas 1 y 2 son especiales y no se reorganizan.
- Cada lado físico contiene exactamente cuatro paneles; el frente y el reverso son contenedores separados.
- El sello conserva imagen, texto, posición, tamaño y opacidad.
- La imagen se asocia por actividad, luego `P<n>`, luego sin imagen.
- Las pruebas deben demostrar RED antes de cada implementación y GREEN después.

### Feature 1: Contrato y regresiones

**Files:** Modify `PRD-pasaporte-infantil.md`; Modify `tests/passport-core.test.mjs`.

- [ ] Añadir al PRD la referencia funcional de la primera versión y la matriz de regresiones.
- [ ] Escribir pruebas para que una hoja tenga dos lados separados y cuatro paneles por lado.
- [ ] Escribir pruebas para sello e imagen completos.
- [ ] Ejecutar pruebas y registrar RED.

### Feature 2: Modelo de sello e imagen

**Files:** Modify `passport-core.js`; Modify `passport-core-browser.js`; Modify `app.js`; Modify `styles.css`.

- [ ] Implementar un objeto `stamp` con `imageSrc`, `label`, `subtitle`, `scale`, `x`, `y`, `opacity`.
- [ ] Implementar estado de imagen con `src`, `rule`, `file`, `scale`, `x`, `y`, `opacity`.
- [ ] Restaurar reemplazo, escala, X/Y, centrado, opacidad y aplicación por página/todas.
- [ ] Renderizar imagen de sello en vista lógica e impresión.

### Feature 3: Imposición determinista

**Files:** Modify `passport-core.js`; Modify `passport-core-browser.js`; Modify `app.js`; Modify `styles.css`; Modify `tests/passport-core.test.mjs`.

- [ ] Crear `renderSheetSide(side)` que rechace cualquier cantidad distinta de cuatro paneles.
- [ ] Generar frente y reverso como dos `sheet-side` distintos.
- [ ] Mostrar rellenos blancos para páginas fuera de `N`.
- [ ] Verificar 4, 8, 10, 12 y 16 páginas.

### Feature 4: Integración y documentación

**Files:** Modify `README.md`; Create `tests/README.md` if needed.

- [ ] Ejecutar suite completa, sintaxis, diff check y servidor local.
- [ ] Verificar visualmente en navegador disponible o documentar el bloqueo.
- [ ] Registrar cambios, limitaciones y exactitud de impresión.


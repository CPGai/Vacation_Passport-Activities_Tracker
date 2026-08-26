# Pasaporte infantil imprimible Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convertir el prototipo existente en una aplicación HTML local, editable, persistente e imprimible con vista lógica e imposición dúplex determinista.

**Architecture:** Separar el modelo serializable (`app.js`) de la presentación (`index.html`, `styles.css`) y de las funciones puras verificables (`passport-core.js`). El modelo conserva páginas especiales, actividades por número físico y configuración; la vista de impresión se deriva siempre del modelo mediante la fórmula de 8 paneles.

**Tech Stack:** HTML/CSS/JavaScript vanilla, módulos ES, Node.js para pruebas puras, localStorage y APIs FileReader/webkitdirectory.

## Global Constraints

- No eliminar `pasaporte-imprimible.html`, `pasaporte-imprimible-v2.html` ni assets existentes.
- Páginas 1 y 2 son especiales y no participan en la reorganización.
- La imposición redondea a múltiplos de 8 y muestra Letter vertical, 100%, dúplex, borde largo.
- Asociación de fondo: actividad normalizada, después `P<n>`, después sin imagen.
- La actividad se mueve junto con título, descripción, sello e imagen; el número físico permanece fijo.

### Task 1: Modelo e imposición

**Files:** Create `passport-core.js`; Create `tests/passport-core.test.mjs`.

- [ ] Escribir pruebas RED para normalización, fondos, imposición, páginas de relleno, páginas especiales y reorganización.
- [ ] Ejecutar `node --test tests/passport-core.test.mjs` y confirmar fallo por módulo ausente.
- [ ] Implementar funciones puras `normalizeName`, `resolveBackground`, `calculateImposition`, `createDocument`, `swapActivities`, `validatePageCount`.
- [ ] Ejecutar las pruebas y confirmar GREEN.

### Task 2: Aplicación local y UI

**Files:** Create `index.html`; Create `styles.css`; Create `app.js`.

- [ ] Crear menú colapsable por categorías y formularios con validación clara.
- [ ] Renderizar vista lógica desde el modelo y vista de impresión desde `calculateImposition`.
- [ ] Implementar edición, reorganización, plantilla, marco, números, imágenes, opacidad 0–100 y portada separada.
- [ ] Implementar persistencia completa en localStorage y restauración.

### Task 3: Documentación y verificación

**Files:** Modify `PRD-pasaporte-infantil.md`; Create `README.md`; Create `tests/README.md`.

- [ ] Documentar decisiones pendientes resueltas y límites del navegador.
- [ ] Ejecutar pruebas, `git diff --check`, inspección de estructura y servidor local.
- [ ] Verificar visualmente en navegador si hay navegador disponible; registrar evidencia y limitaciones.


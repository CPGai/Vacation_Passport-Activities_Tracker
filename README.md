# Vacation Passport & Activities Tracker ✈️📖
### *Generador y Editor Imprimible de Pasaportes Infantiles para Viajes y Vacaciones*

[![Tests](https://img.shields.io/badge/Tests-34%20Passing-brightgreen.svg)](tests/)
[![Spec Version](https://img.shields.io/badge/PRD%20Spec-v2.2-blue.svg)](PRD-pasaporte-infantil.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Vanilla%20JS)-orange.svg)](pasaporte-experimental.js)

**Vacation Passport & Activities Tracker** is an interactive, browser-based application designed to build, customize, organize, and print custom souvenir activity passports for family trips and vacation programs. 

Children receive a physical booklet with a dedicated page per activity where they stamp their official visit seal upon completion.

---

## 🌟 Key Features

### 1. 🖨️ Mathematical 4-Up Booklet Imposition Engine
* **Duplex Signature Imposition:** Automatically lays out 4 pages per side on standard **Letter size (8.5\" × 11\")** sheets for clean folding, cutting, and stapling.
* **Horizontal & Vertical Spine Modes:** Configurable folding orientation (Horizontal pair matching [12 ↔ 3], [10 ↔ 5], [8 ↔ 7] vs. Vertical columns).
* **Material Separation:** Automatically separates **Cover sheets (Cartoncillo / Heavy Stock)** from **Interior pages (Standard Paper)**, with dedicated *\"Imprimir portada\"* (Cover Only) and full booklet printing modes.
* **Duplex Print Calibration:** Fine-tune X/Y center shifts, outer margins, and back-side alignment to compensate for home printer mechanical offsets.

### 2. 🎨 Multi-Page Configuration Scope (*Scope Selector*)
* Apply any visual setting simultaneously to:
  * 📌 **Single page** (Active page only)
  * 🌐 **All pages** (1 to N)
  * 📋 **All activities** (3 to N, protecting covers)
  * ☑️ **Custom page selection** (Interactive chips and Ctrl+Click thumbnail shortcuts)
* Bulk update: Frame color, Background color, Page number visibility & position (6 corners/centers), Font sizes, Text opacity, Millimetric text offsets (X/Y), Background image scale/offsets/opacity, and Templates.

### 3. 📥 CSV Bulk Activity Import & Template Download
* One-click download of the official UTF-8 CSV activity template.
* Import full travel itineraries with automatic page generation, text normalization, and centered background image matching.
* Works seamlessly with Excel, Google Sheets, and LibreOffice exports.

### 4. 💮 Dedicated Activity Stamp Customizer
* Customizable completion stamp (SELLO · REALIZADO, VISITADO, COMPLETADO).
* Upload custom stamp icons / artwork (PNG/JPG).
* Live sliders for scale (40%–160%), fine X/Y positioning (-30mm to +30mm), and opacity.

### 5. 💾 Offline & Local-First Privacy
* **100% Client-Side:** No servers, no tracking, no external CDNs required.
* **Local Persistence:** Instant auto-save to browser localStorage and one-click JSON project export/import.
* **Direct Header Editing:** Click directly on the project title in the top navigation bar to rename your project anytime.

---

## 🚀 Getting Started

### Quick Start (No Installation Required)

1. Clone or download this repository:
   `In PowerShell (or CMD / Bash), run:
   git clone https://github.com/CPGai/Vacation_Passport-Activities_Tracker.git
   cd Vacation_Passport-Activities_Tracker
   `
2. Open pasaporte-experimental.html directly in any modern web browser (Chrome, Edge, Firefox, Safari):
   * **Directly:** Double-click pasaporte-experimental.html, or
   * **Local Web Server (Recommended):**
     `In PowerShell run:
     python -m http.server 8000
     `
     Navigate to: [http://localhost:8000/pasaporte-experimental.html](http://localhost:8000/pasaporte-experimental.html)

---

## 🖨️ Printing & Assembly Guide

1. **Print Settings:**
   * **Paper Size:** Letter (8.5\" × 11\")
   * **Orientation:** Portrait (Vertical)
   * **Scale:** 100% (Actual size / Do not fit to page)
   * **Two-Sided (Duplex):** Yes — **Flip on Long Edge**
2. **Cover Sheet:** Click **\"Imprimir portada\"** to print Sheet 1 onto cardstock or heavy paper.
3. **Interior Pages:** Click **\"Imprimir\"** to print the remaining sheets onto standard 20lb / 24lb paper.
4. **Assembly:**
   1. Cut the sheets along the central horizontal line.
   2. Fold the half-sheets down the center fold guide.
   3. Nest the leaves inside the cover from outer to inner.
   4. Staple the booklet spine.

---

## 🧪 Testing & Quality Assurance

This project strictly follows **Spec-Driven Development (SDD)** and **Test-Driven Development (TDD)** with 100% automated test coverage.

Run the test suite using Node.js built-in test runner:
`ash
node --test tests/*.test.mjs
`

All 34 automated unit and contract tests verify:
* Document lifecycle and page protection (Cover & Identity).
* 4-Up signature booklet imposition and material isolation.
* Custom panel reorganization and drag-and-drop swapping.
* Duplex print calibration and cut-guide rendering.
* CSV parsing, path normalization, and import mechanics.
* Scope selection and bulk multi-page property application.
* HTML/CSS structural contracts and ghost-box elimination rules.

---

## 📂 Project Structure

`	ext
├── pasaporte-experimental.html   # Main application interface
├── pasaporte-experimental.css    # Responsive styles and print media rules
├── pasaporte-experimental.js     # Reactive UI controller and event engine
├── experimental-passport-core.js # Pure functional imposition & document model (ESM)
├── experimental-passport-browser.js # Browser-compatible core runtime
├── PRD-pasaporte-infantil.md     # Product Requirement Document (Spec v2.2)
├── tests/                        # Automated unit & integration tests
│   ├── experimental-passport-core.test.mjs
│   ├── experimental-ui-ux.test.mjs
│   ├── imposition-regression.test.mjs
│   └── media-regression.test.mjs
├── background images/            # Default sample activity images
└── Versiones/                    # Stamp artwork and CSV activity templates
`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

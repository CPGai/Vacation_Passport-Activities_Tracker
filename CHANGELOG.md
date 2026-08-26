# Changelog

All notable changes to the **Vacation Passport & Activities Tracker** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2026-08-26

### Added
- **Vector SVG Favicon (avicon.svg):** High-resolution responsive passport booklet with gold globe emblem and airplane motif, linked across all HTML templates.
- **Dynamic Print Typography Synchronization:** Instant propagation of title and description font sizes (ontSize.title and ontSize.description) to both the logical reader view and the 4-up print/imposition view.
- **Automated Test Coverage:** Added unit tests verifying dynamic typography inheritance across all views without CSS !important interference (35/35 tests passing).

### Fixed
- **Print View Font Size Lock:** Removed hardcoded ont-size: 13px !important; and ont-size: 8.5px !important; rules from .print-panel .page h2 and .print-panel .page p in pasaporte-experimental.css.
- **Selector Scope Filter in JavaScript:** Removed .closest('.logical') restriction in pplyTextStyles() in pasaporte-experimental.js.
- **Real-Time Input Listeners:** Added oninput and onchange reactive event bindings for #titleSize and #descriptionSize.

---

## [2.2.0] - 2026-08-26

### Added
- **Mathematical Booklet Signature Imposition:** True booklet signature imposition matching outer leaves to inner leaves ( \leftrightarrow 3$,  \leftrightarrow 5$,  \leftrightarrow 7$ for 10 activity pages).
- **Spine Orientation Selector (#impositionSpineMode):** Configurable folding mode for horizontal pair rows vs. vertical columns.
- **Strict Cartoncillo Material Isolation:** Independent 4-page cover sheet isolation (material: 'cover' strictly on Sheet 1, preventing activity leakage onto cardstock).
- **14-Page Default Project Template:** Initialized with 4 cover/special pages and 10 activity pages.

---

## [2.1.0] - 2026-08-26

### Added
- **Multi-Page Scope Selector (#secScope):** Batch property configuration for single, all, activities, or custom page subsets.
- **Interactive Scope Chips & Thumbnail Shortcuts:** Select multiple pages using interactive badges or Ctrl + Click directly on thumbnails.
- **Dedicated Activity Stamp Menu (#secStamp):** Standalone section for stamp text, image upload, scale, X/Y translation, and opacity.
- **Direct Header Title Editing (#projectTitle):** Inline contenteditable project title with instant localStorage and JSON state synchronization.

---

## [2.0.0] - 2026-08-17

### Added
- **Experimental Clean Architecture (pasaporte-experimental.html):** Unified modern UI with zero external dependencies.
- **CSV Bulk Import & Template Generator:** Downloadable UTF-8 CSV itinerary template with auto-path resolution.
- **Duplex Print Calibration Engine:** Sub-millimeter mechanical compensation for duplex home printers.

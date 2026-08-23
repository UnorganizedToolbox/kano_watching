# 🧠 kano_watching - Code Review & Grill Context Document

This document defines the requirements, constraints, and issues for the `kano_watching` application code review.

---

## 1. Project Context & Source File Paths
- **Original JS Code (Almost Bug-Free)**:
  - Path: `file:///home/user/Documents/projects/math-diagnostic-tool/app_original_js_backup.js`
  - *Context*: This is the original, monolithic 4,000-line JavaScript file. It is functionally complete and works, except for the known audio bugs detailed below.
- **Vite + TypeScript Modular Codebase**:
  - Path: `file:///home/user/Documents/projects/math-diagnostic-tool/src/`
  - *Context*: The modularized codebase rewritten in TypeScript. It consists of multiple modules (e.g., `audio.ts`, `pomo.ts`, `exam.ts`, `stats.ts`, `settings.ts`, etc.) managed via Vite.

---

## 2. Known Bugs & Issues (In Original JS)
- **Safari Background Audio Block (Critical)**:
  - When hosted on Safari (iPadOS), the Pomodoro timer alarm fails to play if the tab is in the background, if the screen locks, or if another app (like LoiLoNote) takes audio focus.
  - Safari suspends all `setInterval` ticks and puts the `AudioContext` to sleep when the browser goes to the background.
- **Tab Navigation click events**:
  - Review if the tab switching clicks and UI active states are robustly implemented across all curriculum modes (Junior High, High School, University).

---

## 3. Core Planned Changes
- **GitHub Pages Migration**:
  - Deploying the app to a static site host (`https://<username>.github.io/<repo>/`).
  - Must ensure all asset paths and routing are relative (i.e. `base: './'`) to support subpaths.
- **TypeScript Modularization**:
  - Split the 4,000-line `app.js` into distinct, strongly-typed ES modules under `src/` to prevent future runtime bugs and increase maintainability.

---

## 4. Planned Features (Abstract Specs for Grill Design)
*The details of these features are left abstract to allow design flexibility and creative feedback during the grill session.*

- **Scaffolding Learning Cycle**:
  - A structured study cycle that dynamically presents formulas to students, allows them to practice with the formulas visible, fades them out as they answer correctly, and concludes with a combined test of the unit.
- **AI-Driven Study Recommendation**:
  - An intelligent study plan and daily quota generator that recommends target tasks based on past performance and stats.
- **Pomodoro Log Data Visualization**:
  - Automating the aggregation and visualization of Pomodoro study session records (such as circadian rhythms or transition graphs) directly in the GAS/Spreadsheet side.

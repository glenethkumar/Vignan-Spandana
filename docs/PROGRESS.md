# Frontend Build Progress

## Status
- **Phase**: One-Shot Frontend Build
- **Active Milestone**: M5: Live Monitor (Demo Mode)
- **Overall Progress**: 4 / 8 Milestones Completed

## Milestone Tracking
- [x] **M1: Shell, Public Home, Login, Dashboard** (Completed & Tested)
- [x] **M2: New Campaign Wizard, Steps 1-4** (Completed & Tested)
- [x] **M3: Students Step (Excel, Client-Side)** (Completed & Tested)
- [x] **M4: Questions, Review, Approval Flow** (Completed & Tested)
- [ ] **M5: Live Monitor (Demo Mode)** (In Progress)
- [ ] **M6: Reports & History**
- [ ] **M7: Issues (Orange Loop)**
- [ ] **M8: Users & Classes, Settings, Final Polish**

## Current Details
- **Done (M2, M3, M4)**:
  - Built 7-step wizard (`WizardPage.tsx`) with dynamic stepper, breadcrumb chips, and draft autosave to `localStorage`.
  - Implemented Step 1 (Department selection scoped by faculty assignment), Step 2 (Year 01-04), Step 3 (Section with student counts), Step 4 (Module A / Module B + Attendance Date).
  - Implemented Step 5 (Client-side spreadsheet dropzone, SheetJS template download, column mapping, blocking vs non-blocking validation, duplicate roll detection, class mismatch checks, Version replacement modal, roster preview with masked phone numbers).
  - Implemented Step 6 (Audio language Telugu/English/Hindi, voice options, prompt script, feedback topic toggles, calling hours, max retries, max call duration).
  - Implemented Step 7 (Pre-flight review summary, checklist, role branching: Faculty "Send to Admin for Approval" vs Admin "Confirm and Start Campaign").
  - Generated sample test files in `docs/sample-data/` (`valid_attendance.xlsx`, `with_errors.xlsx`, `missing_columns.xlsx`, `sample_attendance.csv`).
  - Unit tests in `tests/unit/m2_m3_m4_wizard.test.ts` passing 100% (11/11 tests across suite).
- **In Progress (M5)**:
  - Building Live Monitor (`LiveMonitorPage.tsx`) with real-time simulated queue, timer progression, progress bar, current call card, admin controls (Pause, Resume, Stop with modal), call record generation, and auto issue creation on negative parent feedback.
- **Next**:
  - M6: Reports & History tabbed view with client-side Excel export and call detail drawer.
- **Open Questions for Project Owner**:
  - None; safe defaults applied.

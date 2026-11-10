# VIIT AI Feedback - Frontend Implementation Plan

## 1. Project Overview & Architecture
- **Application**: "VIIT AI Feedback", Department of CSE, Vignan's Institute of Information Technology.
- **Frontend Stack**: React 18, Vite, TypeScript, React Router 6, Tailwind CSS, lucide-react, SheetJS (xlsx), Vitest + React Testing Library, Playwright.
- **Backend Freeze**: The existing Flask backend, SQLite database, Outpero telephony adapters, and all 49+ backend tests are completely frozen.
- **Client Data Layer**: `src/data/api.ts` provides async typed functions backed by browser `localStorage` ("Saved on this device") with mock datasets and state management.

## 2. Directory Structure (`/frontend`)
```
frontend/
├── public/
│   └── viit-logo.png
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/         (Buttons, Badges, Modals, Toasts, Skeletons, EmptyState)
│   │   ├── navigation/     (WorkspaceSidebar, TopNav, Stepper, Breadcrumbs)
│   │   ├── cards/          (MetricCard, SelectableCard, CampaignCard, IssueCard)
│   │   └── excel/          (DropZone, ColumnMapping, PreviewTable)
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   └── AppLayout.tsx
│   ├── pages/
│   │   ├── public/         (HomePage, LoginPage)
│   │   ├── dashboard/      (DashboardPage)
│   │   ├── campaign/       (WizardPage, LiveMonitorPage)
│   │   ├── reports/        (ReportsPage)
│   │   ├── issues/         (IssuesPage, IssueDetailPage)
│   │   ├── admin/          (UsersClassesPage, SettingsPage)
│   │   └── error/          (ForbiddenPage, NotFoundPage)
│   ├── data/
│   │   ├── api.ts          (Async typed data contract implementation)
│   │   ├── initialData.ts  (Seed demo data & empty state factory)
│   │   └── types.ts        (TypeScript domain interfaces)
│   ├── lib/
│   │   ├── masking.ts      (Comprehensive phone masking utilities)
│   │   ├── excel.ts        (SheetJS template generation & validation)
│   │   └── utils.ts        (Formatting, classnames, contrast helpers)
│   ├── styles/
│   │   └── index.css       (Tailwind directives, CSS variables, typography)
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── unit/               (Vitest: masking, role guards, excel, issues, campaign)
│   └── e2e/                (Playwright: end-to-end user workflows)
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 3. Brand Tokens & Design System
- **Colors (Extracted from VIIT Crest)**:
  - `--brand`: `#014A97` (VIIT Primary Royal Navy)
  - `--brand-dark`: `#0B2038` (Deep Ink Navy for primary CTA & header accents)
  - `--brand-accent`: `#0498ED` (Cyan star accent)
  - `--brand-50`: `#EFF6FF` (Soft tint for selected cards, active nav, table headers)
  - Neutral Page: `#F7F8FA`, Surface: `#FFFFFF`, Border: `#E5E7EB`, Text: `#111827` / `#6B7280`
  - Orange (Strictly Issues & Critical Alerts): `#C2410C` (text), `#EA580C` (icons), `#FFF1E6` (tint)
  - WCAG 2.1 AA Compliance: All body text $\ge 4.5:1$, large text $\ge 3.0:1$.
- **Typography**: Plus Jakarta Sans / Manrope for headings, Inter for body text.

## 4. Milestones Roadmap (M1 to M8)
- **M1: Shell, Public Home, Login, Dashboard**
  - Public marketing home (`/`) with CSS phone mockup, stats, flow guide, issue loop.
  - Split-screen Login (`/login`) with role demo switch (`VITE_DEMO_MODE=true`).
  - Workspace Shell (`/app`) with role-based navigation (Admin/Principal 6 items, Faculty 3, Issue Owners 2), orange dot alert.
  - Dashboard with 4 KPI cards, "From student list to ready-to-go" guide, Recent Campaigns & Open Issues lists.
- **M2: New Campaign Wizard, Steps 1-4**
  - 7-step stepper, breadcrumb chips, selectable radio cards with checkmarks.
  - Department $\to$ Year $\to$ Section $\to$ Module (Mentoring/Attendance or Feedback) + Date Picker.
  - Autosave draft to `localStorage` with resume capability.
- **M3: Students Step (Excel, Client-Side)**
  - Drag-and-drop zone (`.xlsx`, `.xls`, `.csv`), SheetJS template download.
  - Client-side column mapping & row parser.
  - Blocking errors (mismatches, missing cols, unknown attendance, duplicate roll numbers) vs Non-blocking warnings (missing/invalid phone).
  - Version N replacement modal for re-uploads of same class + date.
  - Sample Excel files in `/docs/sample-data/`.
- **M4: Questions, Review, Approval Flow**
  - Questions configuration (Telugu, English, Hindi, voice, script, topics, calling hours).
  - Review summary & checklist.
  - Role branching: Faculty "Send to Admin" (Pending Approval) vs Admin "Confirm and Start".
  - Admin approval/return workflow.
- **M5: Live Monitor (Demo Mode)**
  - Real-time simulation of queue: Queued $\to$ Calling $\to$ Connected $\to$ Completed/No Answer.
  - Timer progression, progress bars, call cards, Pause/Resume/Stop controls.
  - Automatic issue creation on negative feedback during feedback campaigns.
- **M6: Reports & History**
  - Dual tabs: Campaigns & Call History.
  - Filtering, search, pagination.
  - Call detail drawer with speaker-labeled Telugu/English transcripts and AI summaries.
  - Client-side Excel export with strictly masked phones.
- **M7: Issues (Orange Loop)**
  - Issues list and status board with category filtering.
  - Issue detail & timeline.
  - Status progression: Open $\to$ Owner Alerted $\to$ In Progress $\to$ Resolved $\to$ Confirmation Call Pending $\to$ Closed or Reopened.
  - Critical flag on 3 reopens (loop continues until parent confirmation).
- **M8: Users & Classes, Settings, Final Polish**
  - Academic hierarchy tree (Department $\to$ Year $\to$ Section) with add/edit/deactivate.
  - Faculty & issue owner management with class assignment matrix.
  - System settings & comprehensive activity log viewer.
  - 404 & 403 pages, keyboard navigation, full responsive polish.

## 5. Data Contract Summary (`src/data/api.ts`)
- All functions are asynchronous and typed.
- Storage is isolated per device in `localStorage`.
- Phone numbers are masked in all returned entities (`+91 98*** **345`).


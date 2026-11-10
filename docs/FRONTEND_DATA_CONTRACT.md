# Frontend Data Contract & API Specifications

## 1. Core Security & Privacy Rule
> **MANDATORY POLICY**: The real backend must return phone numbers masked by default. Full numbers are returned only to permitted roles after an explicit reveal action, and each reveal is logged.
>
> On the frontend, parent phone numbers are formatted strictly as `+91 98*** **345`. Raw 10-digit mobile numbers are never rendered into HTML elements, attributes, JavaScript state strings, exported files, or URL queries.

---

## 2. Phase 1 Database Mapping to TypeScript Entities

| Phase 1 Backend Table | Frontend TypeScript Interface | File Location | Key Attributes & Guarantees |
|-----------------------|------------------------------|---------------|-----------------------------|
| `academic_units` | `Department`, `AcademicYear`, `Section` | `src/data/types.ts` | Department code, year (1-4), section name, active flags. Soft deactivation only. |
| `students` | `Student` | `src/data/types.ts` | Roll number, student name, parent name, `parentPhone` (masked), residence, bus route. Soft archive (`archivedAt`). |
| `uploads` | `UploadRecord` | `src/data/types.ts` | Upload ID, class name, date, filename, version (1..N), counts (total, present, absent), `replacedBy`. |
| `campaigns` | `Campaign` | `src/data/types.ts` | Module (`mentoring` / `feedback`), target counts, status (`draft`, `pending_approval`, `confirmed`, `in_progress`, etc.), upload version linked. |
| `campaign_students` / `call_records` | `CallRecord` | `src/data/types.ts` | Student ID, masked phone, status (`queued`, `calling`, `completed`, `no_answer`, `failed`), Telugu/English transcript, AI summary, outcome, linked issue ID. |
| `issues` | `Issue` | `src/data/types.ts` | Category (`College`, `Hostel`, `Bus`), feedback, status, `reopenCount`, `isCritical` (true if $\ge 3$ reopens), owner. |
| `issue_timeline` | `IssueTimelineEvent` | `src/data/types.ts` | Issue ID, status transitions, performer, comments, ISO timestamps. |
| `faculty_class_assignments` | `User.assignedClasses` | `src/data/types.ts` | Scoped matrix mapping faculty to permitted department/year/section tuples. |
| `system_settings` | `SystemSettings` | `src/data/types.ts` | Institutional details, default language, calling hours, max duration, retries, demo mode. |
| `audit_logs` | `ActivityLogEntry` | `src/data/types.ts` | Action type, user role, entity, ISO timestamp, zero secrets logged. |

---

## 3. Data Layer API Functions (`src/data/api.ts`)

All screens interact exclusively through these asynchronous functions. In this milestone stage, data is persisted in browser `localStorage` ("Saved on this device") and will be hot-swapped for HTTP endpoints when the backend freeze is lifted.

### Authentication & Context
- `getActiveUser(): Promise<User>`: Returns active authenticated session.
- `setActiveUser(user: User): Promise<void>`: Switches active user role for demo testing.
- `setDemoDataMode(mode: 'demo' | 'empty'): void`: Toggles between populated demo dataset and fresh empty initial state.
- `getDemoDataMode(): 'demo' | 'empty'`: Inspects current demo mode.

### Dashboard & Analytics
- `getDashboardSummary(role: UserRole, department?: string): Promise<DashboardSummary>`:
  Returns KPI metric cards (Absent today, Completed calls, Open issues, Resolved this week) plus scoped recent campaigns, open issues, and pending approvals.

### Student Directory & Profiles
- `listStudents(filters?: StudentFilters): Promise<Student[]>`: Returns student roster with masked contact details.
- `getStudent(id: number): Promise<Student | null>`: Fetches single profile.
- `archiveStudent(id: number): Promise<void>`: Deactivates student record without deleting underlying references.
- `restoreStudent(id: number): Promise<void>`: Restores deactivated student.

### Uploads & Excel Processing
- `listUploads(filters?: UploadFilters): Promise<UploadRecord[]>`: Retrieves history of uploads for class.
- `checkDuplicateUpload(department, year, section, uploadDate): Promise<UploadRecord | null>`: Checks if an active upload exists for class and date to prompt Version N replacement.
- `saveUpload(upload, parsedStudents): Promise<UploadRecord>`: Registers upload record and merges students into database.

### Campaign Management & Approval Lifecycle
- `listCampaigns(filters?: CampaignFilters): Promise<Campaign[]>`: Retrieves scoped campaign list.
- `getCampaign(id: number): Promise<Campaign | null>`: Single campaign details.
- `saveDraftCampaign(draft: Partial<Campaign>): Promise<Campaign>`: Autosaves draft to storage.
- `submitToAdmin(campaignId: number): Promise<Campaign>`: Faculty transitions draft to `pending_approval`.
- `approveCampaign(campaignId: number): Promise<Campaign>`: Admin approves campaign (`confirmed`).
- `returnCampaignWithNote(campaignId: number, note: string): Promise<Campaign>`: Admin returns submission to draft.
- `confirmCampaign(campaignId: number): Promise<Campaign>`: Admin launches outbound campaign (`in_progress`).
- `controlCampaign(campaignId: number, action: 'pause' | 'resume' | 'stop'): Promise<Campaign>`: Admin runtime controls.

### Call History & Transcripts
- `listCallHistory(filters?: CallFilters): Promise<CallRecord[]>`: Retrieves call records with masked phones.
- `getCallRecord(id: number): Promise<CallRecord | null>`: Retrieves call detail with bilingual transcripts.

### Issue Resolution Loop (Orange Loop)
- `listIssues(filters?: IssueFilters): Promise<Issue[]>`: Scoped by role (`College`, `Hostel`, `Bus`).
- `getIssue(id: number): Promise<Issue | null>`: Issue detail and chronological audit timeline.
- `updateIssueStatus(issueId, newStatus, comment, performedBy, resolutionNotes?): Promise<Issue>`: Records status change.
- `runConfirmationCall(issueId, simulatedResponse: 'Yes' | 'No'): Promise<Issue>`:
  Simulates verification call. Parent "Yes" closes issue; parent "No" reopens and increments `reopenCount`. At $\ge 3$ reopens, `isCritical` is set to true.

### Administration & Settings
- `getClassStructure(): Promise<{ departments, years, sections }>`
- `saveClassStructure(departments, years, sections): Promise<void>`
- `listUsers(): Promise<User[]>`
- `createUser(user): Promise<User>`
- `updateUser(id, data): Promise<User>`
- `getSettings(): Promise<SystemSettings>`
- `saveSettings(settings): Promise<SystemSettings>`
- `listActivityLog(filters?): Promise<ActivityLogEntry[]>`
- `exportReport(type, role): Promise<string>`

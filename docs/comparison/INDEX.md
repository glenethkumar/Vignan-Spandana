# Reference Comparison Index: Video Reference vs. VIIT AI Feedback

This document provides a comparative visual and structural audit between the reference video (`sohel-frontend_.mp4`) and our production frontend implementation for **VIIT AI Feedback** (Department of CSE, Vignan's Institute of Information Technology).

---

## 1. Executive Summary

| Evaluation Dimension | Video Reference (`sohel-frontend_.mp4`) | VIIT AI Feedback Implementation | Parity Status |
| :--- | :--- | :--- | :---: |
| **Institutional Brand Identity** | Generic dark slate & blue | **VIIT Emblem Palette**: Brand Navy `#014A97`, Dark Ink `#0B2038`, Star Cyan `#0498ED`, Soft Tint `#EFF6FF`. Orange (`#C2410C` / `#EA580C`) strictly reserved for grievances/alerts. | **100% Logo-Aligned** |
| **Artwork & Illustrations** | Grayscale mountain landscape photo | **Vectorized SVG Mountain Topography**: Multi-layered gradients (`#CBD5E1`, `#94A3B8`, `#64748B`), responsive, zero raster artifacts, 100% recreated in code. | **100% Code-Recreated** |
| **Typography & Spacing** | Modern sans-serif, tight tracking, clean card padding | Inter variable typography, tabular numbers (`font-mono`), consistent 20px / 24px card padding, rounded-card (12px) borders. | **Matched** |
| **Copy & Verbal Identity** | College-grade, plain English ("Prepare your call list", "A simple flow", "Saved on this device") | Verbatim match of all video copy. All technical vendor terms ("Outpero", "mock", "adapter", "API", "SQLite") completely removed. | **100% Plain English** |
| **Multi-Role Governance** | Single administrator view shown | **Role Hierarchy**: Principal = Admin (full permissions), Faculty (drafts & uploads, steps 1–5), Issue Owners (Hostel Dean, Bus Correspondent, College Coordinator). | **Complete & Hardened** |
| **Issue Resolution Loop** | Conceptual marketing summary | **Interactive State Machine**: Grievance logging, resolution notes, automated confirmation calling loop with reopen counter (up to 3 reopens before Critical escalation). | **Functional & Automated** |

---

## 2. Visual Comparison Matrix (Side-by-Side Images)

All comparison images below are generated side-by-side at 2531×780 resolution (Reference Video Frame on the left, VIIT AI Feedback on the right):

| # | Screen Name | Video Timestamp & Frame | Comparison Image Link | Key Design Alignment |
| :-: | :--- | :-: | :--- | :--- |
| **01** | **Landing Hero** | 03s (`frame_03s.jpg`) | [compare_01_landing_hero.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_01_landing_hero.png) | Headline `Connect with parents. Listen. Act. Resolve.`, centered iPhone mockup with cyan waveform & English/Telugu pills, 4 floating cards, stat strip (4 items). |
| **02** | **Landing Flow** | 06s (`frame_06s.jpg`) | [compare_02_landing_flow.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_02_landing_flow.png) | Eyebrow `FROM DATA TO DIALOGUE`, title `A simple flow. A meaningful connection.`, 3 numbered cards `01 Start with student data`, `02 Prepare the conversation`, `03 Everything in view`. |
| **03** | **Issue Resolution** | 09s (`frame_09s.jpg`) | [compare_03_landing_action.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_03_landing_action.png) | Orange dot eyebrow `THE CONVERSATION DOESN'T END HERE`, title `Heard. Handled. Followed through.`, 3 category badges, 3-step action card container (`Alert`, `Address`, `Call back. Confirm. Close.`). |
| **04** | **Split-Screen Login** | 14s (`frame_14s.jpg`) | [compare_04_split_login.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_04_split_login.png) | 50% left panel with mountain SVG, 3-step checklist (`01 Choose your class`, `02 Prepare your campaign`, `03 Keep it all in view`), right panel with lock icon container `🔒`, leading input icons, demo account quick-picker. |
| **05** | **Admin Dashboard** | 24s (`frame_24s.jpg`) | [compare_05_admin_dashboard.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_05_admin_dashboard.png) | Eyebrow `YOUR WORKSPACE, AT A GLANCE`, title `Let's get connected.`, pill `+ New campaign`, 3 stat cards (`00`), 2-column guide panel with 3 stacked cards `01`-`03`. |
| **06** | **Wizard Step 1: Department** | 27s (`frame_27s.jpg`) | [compare_06_wizard_step1_dept.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_06_wizard_step1_dept.png) | 7 department cards in 3 columns (`CSE`, `CSE-AI`, `IT`, `ECE`, `EEE`, `MECH`, `CIVIL`), building icon in rounded box, radio check indicator, soft blue selection tint. |
| **07** | **Wizard Step 2: Academic Year** | 30s (`frame_30s.jpg`) | [compare_07_wizard_step2_year.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_07_wizard_step2_year.png) | 4 year cards (`01 1st Year` to `04 4th Year`) in a row with giant watermark numbers `01`-`04` in card background and graduation cap icons. |
| **08** | **Wizard Step 3: Section** | 36s (`frame_36s.jpg`) | [compare_08_wizard_step3_section.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_08_wizard_step3_section.png) | 6 cards in 3×2 grid (`A`, `B`, `C`, `D`, `E`, `F`) with people icon, uppercase `SECTION` eyebrow, large section letter, and radio indicator. |
| **09** | **Wizard Step 4: Module** | 39s (`frame_39s.jpg`) | [compare_09_wizard_step4_module.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_09_wizard_step4_module.png) | 2 cards: `Mentoring & attendance` (`Attendance, academics, and student support.`) and `Feedback` (`Class, hostel, and transport experiences.`) with date selector. |
| **10** | **Wizard Step 5: Upload & Roster** | 45s (`frame_45s.jpg`) | [compare_10_wizard_step5_upload_valid.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_10_wizard_step5_upload_valid.png) | Dropzone copy `Drop your student list here.`, `CSV or Excel · Up to 5 MB · 5,000 students`, button `Browse files →`, `First worksheet only`, `Download template`, and verified student roster table. |
| **11** | **Wizard Step 5: Inline Error Banner**| 47s (`frame_47s.jpg`) | [compare_11_wizard_step5_upload_error.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_11_wizard_step5_upload_error.png) | Inline red/peach error banner under dropzone: `Missing columns: student_id, student_name, parent_name, phone. Use the downloadable template.` with Excel error report export button. |
| **12** | **Reports & Analytics** | 61s (`frame_61s.jpg`) | [compare_12_reports_screen.png](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/comparison/compare_12_reports_screen.png) | 3 stat cards (`Campaigns prepared 00`, `Calls completed 00`, `Responses collected 00`), tabs (`Campaigns 0` with underline & `Call history`), search and module filter. |

---

## 3. High-Resolution Screenshot Gallery (`docs/screenshots-v2/`)

All screens captured by Playwright in both Desktop (1280×800) and Mobile (375×667) form factors:

- **Landing Page**: [Desktop Top](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/01_home_top_desktop.png) | [Desktop Flow](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/01_home_flow_desktop.png) | [Desktop Action](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/01_home_action_desktop.png) | [Mobile](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/01_home_top_mobile.png)
- **Split-Screen Login**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/02_login_split_desktop.png) | [Mobile](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/02_login_split_mobile.png)
- **Dashboards**: [Admin Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/03_dashboard_admin_desktop.png) | [Admin Mobile](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/03_dashboard_admin_mobile.png) | [Faculty Assigned CSE](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/03_dashboard_faculty_desktop.png)
- **Wizard Step 1 (Departments)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_01_dept_desktop.png)
- **Wizard Step 2 (Academic Year)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_02_year_desktop.png)
- **Wizard Step 3 (Sections A-F)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_03_section_desktop.png)
- **Wizard Step 4 (Module Selection)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_04_module_desktop.png)
- **Wizard Step 5 (Upload Error Banner)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_05_upload_error_desktop.png)
- **Wizard Step 5 (Upload Valid Roster)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_05_upload_valid_desktop.png)
- **Wizard Step 6 (Call Settings)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_06_settings_desktop.png)
- **Wizard Step 7 (Pre-Flight Review)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/04_wizard_07_review_desktop.png)
- **Live Calling Monitor**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/05_live_monitor_desktop.png)
- **Reports & History (Campaigns Tab)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/06_reports_campaigns_desktop.png)
- **Reports & History (Call History Tab)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/06_reports_call_history_desktop.png)
- **Issues Board (Hostel Grievance)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/07_issues_board_desktop.png)
- **Issues Loop (Confirmation Call Modal)**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/07_issues_confirmation_call_desktop.png)
- **Users & Classes Management**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/08_users_classes_desktop.png)
- **System Settings & Activity Log**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/09_settings_activity_log_desktop.png)
- **Security 403 Barrier**: [Desktop](file:///c:/Users/golag/OneDrive/Apps/Vignan%20Spandana/docs/screenshots-v2/10_forbidden_403_desktop.png)

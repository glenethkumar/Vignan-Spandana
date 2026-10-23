# 🏛️ Vignan Spandana — Institutional AI Parent Communication System

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/glenethkumar/Vignan-Spandana)

An automated, role-scoped college parent communication platform designed for institutional governance, academic monitoring, and automated parent communication.

> ⚠️ **Simulated Calls Notice**: All outbound phone calling features in this prototype are **strictly simulated** for demonstration and verification purposes. No real phone calls are dispatched, and no external telephony or AI API credits are consumed. See [`docs/REAL_CALLING_PLAN.md`](docs/REAL_CALLING_PLAN.md) for the architecture plan to connect real providers (Plivo, Sarvam, Pipecat).

---

## 🚀 Beginner Quick-Start Guide (Fresh Setup)

Follow these simple commands to run the application from scratch:

### 1. Clone & Set Up Virtual Environment
```powershell
# Navigate into the project folder
cd "Vignan Spandana"

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Windows Command Prompt:
.\venv\Scripts\activate.bat
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Initialize & Seed Demo Database
```powershell
# Resets the SQLite database and creates sample Excel spreadsheets
python seed_demo.py
```
This script resets `vignan_spandana.db` to a clean demo state with 10 fake students across CSE and ECE, demo calls, follow-up tickets, and creates `sample_import_good.xlsx` and `sample_import_errors.xlsx`.

### 4. Start the Application Server
```powershell
python app.py
```
Open your browser and navigate to: **`http://127.0.0.1:5000`**

*(Alternatively on Windows, you can simply double-click `run.bat`)*

---

## 🔑 Demo Login Credentials

The system provides pre-configured role-based institutional accounts:

| Username | Password | Role | Department Scope | Permissions & Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | **Admin** | All (Campus-Wide) | Full administrative oversight, user management, and security audit logs |
| **`principal`** | `principal123` | **Principal** | All (Campus-Wide) | Read-only campus monitoring; cannot dispatch calls or edit follow-ups |
| **`coord_cse`** | `coord123` | **Dept. Coordinator** | `CSE` | Enrolls students, manages CSE Excel imports, triggers calls, assigns tickets |
| **`coord_ece`** | `coord123` | **Dept. Coordinator** | `ECE` | Enrolls students, manages ECE Excel imports, triggers calls, assigns tickets |
| **`faculty_cse`** | `faculty123` | **Faculty** | `CSE` | Views CSE students, triggers calls, updates assigned follow-up tickets |
| **`faculty_ece`** | `faculty123` | **Faculty** | `ECE` | Views ECE students, triggers calls, updates assigned follow-up tickets |

---

## 📚 Key System Features & Modules

### 1. 📞 Interactive Simulated Call Demo
- **Status Timeline Stepper**: Visualizes real telephony progression:
  $$\text{Dialing... (2s)} \longrightarrow \text{Connected} \longrightarrow \text{Live Speech Streaming (~1.5s/line)} \longrightarrow \text{Call Ended}$$
- **Bilingual Dialogue Generator**: Choose between **English** and **Telugu (తెలుగు)** scripts.
- **Accurate Student Data Injection**: Uses verified attendance percentage and internal marks.
- **Strict Data Integrity (Never Guesses)**:
  - If attendance is missing, the AI states: *"Current attendance records are unavailable in departmental system and are pending faculty verification."* (Never defaults or displays `None%`).
  - If parent phone is missing, the AI notes that the contact number is unregistered and uses the campus demo line without crashing.
  - If internal marks are missing, the AI gracefully omits them or notes records are pending.
- **Automatic Follow-Up Escalation**: Parent questions beyond the AI scope (e.g. exam mark re-evaluation) automatically generate a Follow-Up ticket in the departmental queue.
- **Double-Click & Spam Prevention**:
  - Frontend disables the call button immediately upon click.
  - Backend applies a 2-second debounce guard returning `HTTP 429` if a duplicate call is attempted.
- **Persistence**: Call records are saved to SQLite table `call_records` and persist across page refreshes.

### 2. 📜 Call History & Call Detail Screens
- **Global Call History (`/calls`)**:
  - Filter by **Status** (`Completed`, `In Progress`, `No Answer`, `Failed`).
  - Filter by **Language** (`Telugu`, `English`, `Hindi`).
  - Filter by **Department** (strictly scoped to user's assigned department; Admin and Principal see all).
  - Filter by **Call Date** (`YYYY-MM-DD`).
  - Instant text search by **Roll Number** or **Student Name**.
- **Call Detail Screen (`/calls/<int:call_id>`)**:
  - Complete speaker-labelled conversation bubbles (`🤖 AI Assistant` vs `👤 Parent`).
  - Highlighting for AI Call Summary.
  - Embedded **Linked Follow-Up Ticket** with quick-edit form for status and faculty assignment.
  - Department security: cross-department viewing attempts return `HTTP 403 Forbidden`.

### 3. 📋 Department Follow-Ups Queue (`/follow-ups`)
- Centralized tracking for parent inquiries escalated from AI voice calls.
- Filter by ticket status: `open`, `in progress`, `closed`.
- Allows re-assigning tickets to specific departmental faculty, setting resolution due dates, and updating progress notes.
- Department-scoped: faculty and coordinators only access tickets for their own department.

### 4. 📥 Two-Step Secure Spreadsheet Import (`/import`)
- **Step 1: Staging Preview & Pre-Flight Validation**:
  - Validates required columns, catches duplicate roll numbers inside the uploaded file, verifies 10-digit Indian mobile formats (`^[6-9]\d{9}$`), and bounds attendance percentages between 0 and 100.
  - Automatically neutralizes formula injection attacks (`=`, `+`, `-`, `@`).
- **Step 2: Transactional Commit**: Commits only validated rows inside an atomic SQLite transaction with full audit logging.
- Includes `sample_import_good.xlsx` (clean demo data) and `sample_import_errors.xlsx` (intentional errors for demonstration).

---

## 📖 Faculty & Architecture Documentation

- 📘 **[5-Minute Demo Flow Guide](docs/DEMO_GUIDE.md)**: Click-by-click demonstration steps, script dialogue, and talking points for executive presentations.
- 📐 **[Real Calling Architecture Plan](docs/REAL_CALLING_PLAN.md)**: Architectural blueprint detailing how `TelephonyAdapter` (Plivo) and `AIAdapter` (Sarvam + Pipecat) replace mock simulation for production PSTN dialing.

---

## 🧪 Comprehensive Automated Test Suite

Run all automated unit and integration tests with pytest:
```powershell
python -m pytest -v
```

### Exact Test Suite Results (46/46 Passed):
```
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.1.1, pluggy-1.6.0
collected 46 items

test_app.py::test_endpoints_smoke PASSED                                 [  2%]
tests/test_call_history_and_followups.py::test_simulated_call_missing_attendance_never_guesses PASSED [  4%]
tests/test_call_history_and_followups.py::test_simulated_call_missing_phone_handled_safely PASSED [  6%]
tests/test_call_history_and_followups.py::test_simulated_call_double_click_debounce_guard PASSED [  8%]
tests/test_call_history_and_followups.py::test_simulated_call_persistence_after_page_refresh PASSED [ 10%]
tests/test_call_history_and_followups.py::test_call_history_global_view_and_scoping PASSED [ 13%]
tests/test_call_history_and_followups.py::test_call_history_filters PASSED [ 15%]
tests/test_call_history_and_followups.py::test_call_detail_view_and_cross_department_block PASSED [ 17%]
tests/test_call_history_and_followups.py::test_follow_ups_list_and_update_lifecycle PASSED [ 19%]
tests/test_call_history_and_followups.py::test_principal_cannot_update_follow_up PASSED [ 21%]
tests/test_call_history_and_followups.py::test_cross_department_followup_update_blocked PASSED [ 23%]
tests/test_fixes_and_twostep_import.py::test_secret_key_production_mode_refusal PASSED [ 26%]
tests/test_fixes_and_twostep_import.py::test_secret_key_debug_fallback PASSED [ 28%]
tests/test_fixes_and_twostep_import.py::test_upload_file_exceeds_max_content_length_413 PASSED [ 30%]
tests/test_fixes_and_twostep_import.py::test_flask_g_database_lifecycle PASSED [ 32%]
tests/test_fixes_and_twostep_import.py::test_sanitize_cell_value_formula_neutralization PASSED [ 34%]
tests/test_fixes_and_twostep_import.py::test_import_missing_required_columns PASSED [ 36%]
tests/test_fixes_and_twostep_import.py::test_import_empty_rows_flagged_as_error PASSED [ 39%]
tests/test_fixes_and_twostep_import.py::test_import_duplicate_roll_number_in_file PASSED [ 41%]
tests/test_fixes_and_twostep_import.py::test_import_invalid_10_digit_phone PASSED [ 43%]
tests/test_fixes_and_twostep_import.py::test_import_attendance_outside_range PASSED [ 45%]
tests/test_fixes_and_twostep_import.py::test_two_step_import_full_workflow_confirm_and_audit PASSED [ 47%]
tests/test_simulated_call.py::test_ai_adapter_english_script_low_attendance PASSED [ 50%]
tests/test_simulated_call.py::test_ai_adapter_telugu_script_high_attendance PASSED [ 52%]
tests/test_simulated_call.py::test_simulated_call_unauthenticated_redirects PASSED [ 54%]
tests/test_simulated_call.py::test_simulated_call_principal_is_read_only PASSED [ 56%]
tests/test_simulated_call.py::test_simulated_call_cross_department_blocked PASSED [ 58%]
tests/test_simulated_call.py::test_simulated_call_nonexistent_student_returns_404 PASSED [ 60%]
tests/test_simulated_call.py::test_simulated_call_full_execution_and_persistence_english PASSED [ 63%]
tests/test_simulated_call.py::test_simulated_call_full_execution_telugu PASSED [ 65%]
tests/test_stage1_roles_access.py::test_password_hashing PASSED          [ 67%]
tests/test_stage1_roles_access.py::test_seeded_users_are_hashed PASSED   [ 69%]
tests/test_stage1_roles_access.py::test_login_success_and_secure_cookie PASSED [ 71%]
tests/test_stage1_roles_access.py::test_login_failure_invalid_credentials PASSED [ 73%]
tests/test_stage1_roles_access.py::test_rate_limiting_after_5_failures PASSED [ 76%]
tests/test_stage1_roles_access.py::test_deactivated_user_cannot_login PASSED [ 78%]
tests/test_stage1_roles_access.py::test_csrf_missing_token_rejected PASSED [ 80%]
tests/test_stage1_roles_access.py::test_csrf_invalid_token_rejected PASSED [ 82%]
tests/test_stage1_roles_access.py::test_coordinator_sees_only_own_department_students PASSED [ 84%]
tests/test_stage1_roles_access.py::test_coordinator_accessing_other_department_gets_403 PASSED [ 86%]
tests/test_stage1_roles_access.py::test_faculty_cross_department_call_and_followup_blocked PASSED [ 89%]
tests/test_stage1_roles_access.py::test_principal_has_read_focused_campus_wide_access PASSED [ 91%]
tests/test_stage1_roles_access.py::test_non_admin_cannot_access_admin_pages PASSED [ 93%]
tests/test_stage1_roles_access.py::test_admin_create_user_and_audit PASSED [ 95%]
tests/test_stage1_roles_access.py::test_admin_deactivate_user_and_prevent_self_deactivation PASSED [ 97%]
tests/test_stage1_roles_access.py::test_audit_logs_contain_zero_secrets PASSED [100%]

======================= 46 passed in 114.86s =======================
```

---

## 📌 Short List: What Is Still Mocked or Simulated

1. **PSTN Telephony**: Calls run through `MockTelephonyAdapter` in memory. No live carrier SIP trunks are active.
2. **Speech Recognition (STT) & Synthesis (TTS)**: Dialogue audio streaming in the UI is simulated with timed text bubble streaming; audio packets are not streamed to speaker hardware.
3. **Background Calling Worker**: Single-call on-demand dispatch is implemented; batch multi-student calling queues (Redis/Celery) remain planned for production scaling.
4. **Automated Parent SMS Notifications**: SMS notifications on ticket closure or missed calls are simulated in logs.

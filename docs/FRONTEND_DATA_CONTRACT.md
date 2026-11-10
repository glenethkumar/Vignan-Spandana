# Frontend Data Contract

This document formalizes the data contract between UI presentation templates and the data layer for **VIIT AI Feedback** (Department of CSE, Vignan's Institute of Information Technology). During Phase 2, all views consume mock/sample data exclusively through the `frontend_demo.demo_data` module. In subsequent phases, the production backend service layer will implement these identical signatures without modifying template templates or frontend view logic.

---

## 1. Core Principles

1. **Role Scoping at Data Boundary**: Every data access function requires caller identity and role context (`role`, optional `user_dept`, `user_id`). Out-of-scope access raises `PermissionError` (which maps to HTTP 403 at the route layer).
2. **Privacy by Default**: Phone numbers returned to presentation templates are strictly pre-masked (`+91 98*** **345`). Raw 10-digit numbers or unmasked telephone identifiers are never passed to the presentation layer. The real backend must return phone numbers masked by default. Full numbers are returned only to permitted roles after an explicit reveal action, and each reveal is logged.
3. **No Database Dependencies in UI**: Templates consume dictionaries and standard Python collections returned by these helper functions.

---

## 2. API Contract Specification

### 2.1 Academic Hierarchy

#### `list_departments()`
- **Purpose**: Retrieves all available academic departments.
- **Parameters**: None
- **Returns**: `List[Dict[str, str]]`
  ```json
  [
    {"code": "CSE", "name": "Computer Science & Engineering"},
    {"code": "ECE", "name": "Electronics & Communication Engineering"}
  ]
  ```

#### `list_years()`
- **Purpose**: Retrieves academic year levels.
- **Parameters**: None
- **Returns**: `List[str]` (e.g., `["I", "II", "III", "IV"]`)

#### `list_sections()`
- **Purpose**: Retrieves section identifiers.
- **Parameters**: None
- **Returns**: `List[str]` (e.g., `["A", "B", "C"]`)

---

### 2.2 Dashboard Overview

#### `get_dashboard_summary(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None)`
- **Purpose**: Supplies the 4 top-level KPI metrics displayed on the dashboard header.
- **Parameters**:
  - `role`: User role (`Admin`, `Principal`, `Faculty`, `Hostel Dean`, `College Coordinator`, `Bus Correspondent`)
  - `user_dept`: Assigned department code for Faculty (e.g., `"CSE"`, `"ECE"`)
  - `user_id`: Unique user identifier
- **Returns**: `Dict[str, Any]`
  ```json
  {
    "absent_today": 7,
    "calls_completed": 34,
    "open_issues": 3,
    "resolved_this_week": 14,
    "scope_label": "Campus-Wide Oversight"
  }
  ```
- **Scoping Rules**:
  - `Admin` / `Principal`: Campus-wide totals across all departments.
  - `Faculty`: Scoped strictly to assigned department and sections.
  - `Hostel Dean`: Open/resolved metrics scoped to hostel issues; absent_today = 0.
  - `College Coordinator`: Scoped to academic/college issues; absent_today = 0.
  - `Bus Correspondent`: Scoped to transportation/bus issues; absent_today = 0.

#### `list_recent_campaigns(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None, limit: int = 5)`
- **Purpose**: Lists recent attendance or feedback campaigns for the dashboard summary table.
- **Parameters**:
  - `role`: Caller's role
  - `user_dept`: Department code
  - `user_id`: User identifier
  - `limit`: Maximum records to return (default: 5)
- **Returns**: `List[Dict[str, Any]]`
  ```json
  [
    {
      "id": 1,
      "name": "CSE III-A Daily Absence Notification",
      "module": "Mentoring/Attendance",
      "module_code": "attendance",
      "department": "CSE",
      "year": "III",
      "section": "A",
      "target_class": "CSE-III-A",
      "date": "2026-11-07",
      "created_by": "Dr. A. Srinivas",
      "status": "Completed",
      "student_count": 4,
      "completion_rate": "100%",
      "calls_placed": 4,
      "calls_answered": 4,
      "issues_raised": 1
    }
  ]
  ```
- **Scoping Rules**:
  - `Admin` / `Principal`: All recent campaigns.
  - `Faculty`: Only campaigns from their assigned department.
  - Issue Owners: Only feedback survey campaigns relevant to student welfare.

#### `list_open_issues(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None, limit: int = 5)`
- **Purpose**: Supplies active/unresolved issues for the dashboard alert table.
- **Parameters**:
  - `role`: Caller's role
  - `user_dept`: Department code
  - `user_id`: User identifier
  - `limit`: Maximum records (default: 5)
- **Returns**: `List[Dict[str, Any]]`
  ```json
  [
    {
      "id": 1,
      "title": "Block B Room 304 Ceiling Fan Vibration & Noise",
      "category": "hostel",
      "category_label": "Hostel Facilities",
      "owner_role": "Hostel Dean",
      "student_id": 2,
      "student_name": "V. Harshavardhan",
      "roll_number": "211FA04002",
      "class_name": "CSE-III-A",
      "department": "CSE",
      "status": "Open",
      "reopen_count": 1,
      "is_critical": 0,
      "created_date": "2026-11-06",
      "description": "Parent reported that the ceiling fan in room 304 is making an unbearable squeaking noise."
    }
  ]
  ```
- **Scoping Rules**:
  - `Admin` / `Principal`: All non-closed issues across all categories.
  - `Hostel Dean`: Strictly `category == 'hostel'`.
  - `College Coordinator`: Strictly `category == 'college'`.
  - `Bus Correspondent`: Strictly `category == 'bus'`.
  - `Faculty`: Issues originating from students in their assigned department.

---

### 2.3 Student Directory & Profiles

#### `list_students(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None, filters: Optional[Dict[str, Any]] = None, page: int = 1, per_page: int = 10)`
- **Purpose**: Returns paginated, searchable, and filtered student roster records.
- **Parameters**:
  - `role`: Caller's role
  - `user_dept`: Caller's assigned department
  - `user_id`: Caller's user ID
  - `filters`: Dictionary with optional keys:
    - `department`: Department code or `"All"`
    - `year`: Academic year (`"I"`, `"II"`, `"III"`, `"IV"`) or `"All"`
    - `section`: Section (`"A"`, `"B"`, `"C"`) or `"All"`
    - `query`: Free-text search string matched against name or roll number
    - `show_archived`: Boolean (Admin only) to include inactive records
  - `page`: Page index (1-based)
  - `per_page`: Records per page (default: 10)
- **Returns**: `Dict[str, Any]`
  ```json
  {
    "students": [
      {
        "id": 1,
        "roll_number": "211FA04001",
        "name": "K. Sai Praneeth",
        "department": "CSE",
        "year": "III",
        "section": "A",
        "class_name": "CSE-III-A",
        "parent_name": "K. Venkata Rao",
        "parent_phone_masked": "+91 98*** **345",
        "category": "Day Scholar",
        "status": "Active",
        "is_active": 1,
        "attendance_percentage": 74.5,
        "mentor_name": "Dr. A. Srinivas"
      }
    ],
    "total": 32,
    "page": 1,
    "per_page": 10,
    "total_pages": 4
  }
  ```
- **Scoping Rules**:
  - Issue Owners (`Hostel Dean`, `College Coordinator`, `Bus Correspondent`): **Permission Denied** (`PermissionError`).
  - `Faculty`: Restricted strictly to their assigned department. Inactive/archived students are excluded.
  - `Admin` / `Principal`: Full access; can toggle active/archived view.

#### `get_student_detail(student_id: int, role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None)`
- **Purpose**: Supplies full student profile, academic standing, call records, and logged issues.
- **Parameters**:
  - `student_id`: Unique identifier
  - `role`: Caller's role
  - `user_dept`: Faculty's assigned department
- **Returns**: `Optional[Dict[str, Any]]` including attached `call_history` and `issues` lists.
- **Scoping Rules**:
  - Issue Owners: Raises `PermissionError`.
  - `Faculty`: If student is outside their department, raises `PermissionError`.
  - `Admin` / `Principal`: Full access.

#### `archive_student_demo(student_id: int, role: str)`
- **Purpose**: Soft-archives a student record (`is_active = 0`, `status = "Archived"`).
- **Parameters**:
  - `student_id`: Student ID
  - `role`: Caller's role
- **Returns**: `bool` (True on success)
- **Scoping Rules**: Restricted to `Admin` / `Principal`. Faculty or Issue Owners raise `PermissionError`.

---

### 2.4 Issues & Escalation Management

#### `list_issues_board(role: str, category_filter: Optional[str] = None, status_filter: Optional[str] = None)`
- **Purpose**: Provides issues list for the resolution workflow board.
- **Parameters**:
  - `role`: Caller's role
  - `category_filter`: Category filter (`"all"`, `"hostel"`, `"college"`, `"bus"`)
  - `status_filter`: Status filter (`"all"`, `"open"`, `"in progress"`, `"resolved by owner"`, `"reopened"`, `"closed"`)
- **Returns**: `List[Dict[str, Any]]`
- **Scoping Rules**:
  - `Hostel Dean`: Hard-isolated to `category == 'hostel'`.
  - `College Coordinator`: Hard-isolated to `category == 'college'`.
  - `Bus Correspondent`: Hard-isolated to `category == 'bus'`.
  - `Admin`: Full access. Critical issues (`reopen_count >= 3`, `is_critical == 1`) flagged for priority oversight.

#### `get_issue_detail(issue_id: int, role: str)`
- **Purpose**: Supplies issue metadata, full timeline history, and escalation state.
- **Parameters**:
  - `issue_id`: Unique issue identifier
  - `role`: Caller's role
- **Returns**: `Optional[Dict[str, Any]]`
- **Scoping Rules**: Returns 403 / `PermissionError` if an issue owner requests an issue outside their category.

---

### 2.5 Administration & System Settings

#### `get_system_settings_demo(role: str)`
- **Purpose**: Returns system configuration parameters.
- **Parameters**: `role` (`Admin` / `Principal` only)
- **Returns**: `Dict[str, Any]`

#### `get_users_and_classes_demo(role: str)`
- **Purpose**: Returns institutional user roster and department/class allocation.
- **Parameters**: `role` (`Admin` / `Principal` only)
- **Returns**: `Dict[str, Any]` with `users`, `departments`, `years`, and `sections`.

#### `get_activity_log_demo(role: str)`
- **Purpose**: Returns audited administrative activity history.
- **Parameters**: `role` (`Admin` / `Principal` only)
- **Returns**: `List[Dict[str, str]]`

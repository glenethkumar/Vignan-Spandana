"""
Database configuration and SQLite helper for VIIT AI Feedback
(Department of CSE, Vignan's Institute of Information Technology).
"""

import sqlite3
import os
import json
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vignan_spandana.db")
ACTIVE_DB_PATH = DB_PATH


def set_active_db_path(path: str):
    """Sets the active database path (used by testing fixtures)."""
    global ACTIVE_DB_PATH
    ACTIVE_DB_PATH = path


def get_db():
    """Returns the database connection from Flask's g context, creating one if not present."""
    from flask import g
    if "db" not in g:
        g.db = sqlite3.connect(ACTIVE_DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON;")
    return g.db


def close_db(e=None):
    """Closes the database connection stored in Flask's g context at teardown."""
    from flask import g
    db = g.pop("db", None)
    if db is not None:
        db.close()


def get_db_connection(db_path=None):
    """
    Returns a database connection.
    If within a Flask request/app context and no custom path is requested, uses Flask's g context.
    """
    if db_path is not None:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    try:
        from flask import has_app_context
        if has_app_context():
            return get_db()
    except Exception:
        pass

    conn = sqlite3.connect(ACTIVE_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(seed_data=True, db_path=None):
    """Initializes tables and migrations for VIIT AI Feedback."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,           -- 'Admin', 'Faculty', 'College Coordinator', 'Hostel Dean', 'Bus Correspondent', 'Principal', 'Department Coordinator'
        full_name TEXT NOT NULL,
        department TEXT DEFAULT 'All', -- 'CSE', 'ECE', 'IT', 'MECH', 'All'
        is_active INTEGER DEFAULT 1,  -- 1 = active, 0 = deactivated
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Audit Log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT,
        details TEXT,
        ip_address TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Academic Units table (Departments, Years, Sections)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS academic_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_type TEXT NOT NULL,      -- 'department', 'year', 'section'
        code TEXT NOT NULL,           -- e.g. 'CSE', 'ECE', 'III', 'A'
        name TEXT NOT NULL,           -- e.g. 'Computer Science & Engineering', 'III Year', 'Section A'
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(unit_type, code)
    );
    """)

    # 4. Faculty Class Assignments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS faculty_class_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        department TEXT NOT NULL,
        year TEXT NOT NULL,
        section TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, department, year, section)
    );
    """)

    # 5. Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_number TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,     -- e.g. CSE, ECE
        year_semester TEXT NOT NULL,  -- e.g. "III Year - Sem 1" or "III"
        section TEXT NOT NULL,        -- e.g. "A", "B", "C"
        student_phone TEXT,
        student_email TEXT,
        parent_name TEXT NOT NULL,
        parent_relationship TEXT DEFAULT 'Parent',
        parent_phone TEXT,
        preferred_language TEXT NOT NULL DEFAULT 'Telugu',
        attendance_percentage REAL DEFAULT 85.0,
        marks_info TEXT,
        category TEXT DEFAULT 'Day Scholar', -- 'Day Scholar', 'Hostel'
        bus_route TEXT,                      -- e.g. 'Route 12 - Gajuwaka'
        is_active INTEGER DEFAULT 1,         -- 1 = Active, 0 = Archived/Deactivated
        archived_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Migration for students columns
    cursor.execute("PRAGMA table_info(students)")
    student_cols = [col[1] for col in cursor.fetchall()]
    if "is_active" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN is_active INTEGER DEFAULT 1")
    if "archived_at" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN archived_at TIMESTAMP")
    if "category" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN category TEXT DEFAULT 'Day Scholar'")
    if "bus_route" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN bus_route TEXT")
    if "marks_info" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN marks_info TEXT")
    if "student_phone" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN student_phone TEXT")
    if "student_email" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN student_email TEXT")
    if "parent_relationship" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN parent_relationship TEXT DEFAULT 'Parent'")

    # 6. Uploads table (Keeps history of class spreadsheet uploads)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department TEXT NOT NULL,
        year TEXT NOT NULL,
        section TEXT NOT NULL,
        attendance_date TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        filename TEXT NOT NULL,
        total_count INTEGER DEFAULT 0,
        present_count INTEGER DEFAULT 0,
        absent_count INTEGER DEFAULT 0,
        invalid_count INTEGER DEFAULT 0,
        no_phone_count INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active', -- 'active', 'replaced', 'archived'
        replaced_by INTEGER REFERENCES uploads(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_uploads_class_date ON uploads(department, year, section, attendance_date);")

    # 7. Campaigns table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        year TEXT NOT NULL,
        section TEXT NOT NULL,
        attendance_date TEXT NOT NULL,
        module_type TEXT NOT NULL,            -- 'mentoring' (Attendance/Mentoring) or 'feedback' (Feedback Call)
        upload_id INTEGER REFERENCES uploads(id),
        total_students INTEGER DEFAULT 0,
        target_count INTEGER DEFAULT 0,
        completed_count INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_approval', 'active', 'paused', 'stopped', 'completed'
        config_json TEXT,                     -- JSON: language, voice, hours, retries, topics, script
        created_by TEXT NOT NULL,
        confirmed_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 8. Campaign Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campaign_students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
        roll_number TEXT NOT NULL,
        student_name TEXT NOT NULL,
        parent_name TEXT NOT NULL,
        parent_phone TEXT,
        attendance_status TEXT,                -- 'Present', 'Absent'
        marks_info TEXT,
        category TEXT,                         -- 'Hostel', 'Day Scholar'
        bus_route TEXT,
        call_status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'calling', 'connected', 'no_answer', 'failed', 'completed'
        call_record_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_camp_stud ON campaign_students(campaign_id, call_status);")

    # 9. Call Records table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS call_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        call_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        status TEXT NOT NULL,          -- 'Scheduled', 'In Progress', 'Completed', 'No Answer', 'Failed'
        language TEXT,                 -- 'Telugu', 'Hindi', 'English'
        duration_seconds INTEGER DEFAULT 0,
        transcript TEXT,
        summary TEXT,
        notes TEXT,
        initiated_by TEXT,
        followup_id INTEGER,
        attendance_date TEXT,
        issue_flag INTEGER DEFAULT 0,
        issue_id INTEGER
    );
    """)

    cursor.execute("PRAGMA table_info(call_records)")
    call_cols = [col[1] for col in cursor.fetchall()]
    if "campaign_id" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN campaign_id INTEGER")
    if "issue_flag" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN issue_flag INTEGER DEFAULT 0")
    if "issue_id" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN issue_id INTEGER")

    # 10. Issues table (The Orange Resolution Loop)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        call_record_id INTEGER REFERENCES call_records(id) ON DELETE SET NULL,
        student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
        category TEXT NOT NULL CHECK(category IN ('college', 'hostel', 'bus')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        owner_role TEXT NOT NULL,              -- 'College Coordinator', 'Hostel Dean', 'Bus Correspondent'
        owner_name TEXT,
        status TEXT NOT NULL DEFAULT 'Open',   -- 'Open', 'Owner Alerted', 'In Progress', 'Resolved by Owner', 'Confirmation Call Pending', 'Closed', 'Reopened'
        reopen_count INTEGER DEFAULT 0,
        is_critical INTEGER DEFAULT 0,         -- 1 if reopen_count >= 3
        parent_feedback TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        closed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_issues_cat_status ON issues(category, status);")

    # Migration for issues columns if already present
    cursor.execute("PRAGMA table_info(issues)")
    issue_cols = [col[1] for col in cursor.fetchall()]
    if "reopen_count" not in issue_cols:
        cursor.execute("ALTER TABLE issues ADD COLUMN reopen_count INTEGER DEFAULT 0")
    if "is_critical" not in issue_cols:
        cursor.execute("ALTER TABLE issues ADD COLUMN is_critical INTEGER DEFAULT 0")

    # 11. Issue Timeline table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issue_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timeline_issue ON issue_timeline(issue_id);")

    # 12. Legacy follow_ups table (Preserved for compatibility)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS follow_ups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        call_record_id INTEGER REFERENCES call_records(id) ON DELETE SET NULL,
        teacher_name TEXT NOT NULL,
        assigned_to TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        notes TEXT NOT NULL,
        action_required TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 13. Legacy attendance_records table (Preserved for compatibility)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        attendance_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
        marked_by TEXT NOT NULL,
        call_record_id INTEGER REFERENCES call_records(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, attendance_date)
    );
    """)

    # 14. System Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    if seed_data:
        _seed_initial_data(cursor, conn)

    conn.close()


def archive_student(conn, student_id: int, username: str = "Admin") -> bool:
    """
    Safely archives / deactivates a student instead of permanent deletion.
    Never hard-deletes records linked to historical uploads or campaigns.
    """
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE students SET is_active = 0, archived_at = CURRENT_TIMESTAMP WHERE id = ?",
        (student_id,)
    )
    conn.commit()
    return cursor.rowcount > 0


def recalculate_student_attendance(conn, student_id: int):
    """
    Recalculates a student's attendance percentage from available attendance_records.
    """
    row = conn.execute(
        """
        SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days
        FROM attendance_records
        WHERE student_id = ?
        """,
        (student_id,)
    ).fetchone()

    if row and row["total_days"] > 0:
        total = row["total_days"]
        present = row["present_days"] or 0
        new_pct = round((present / total) * 100.0, 1)
        conn.execute(
            "UPDATE students SET attendance_percentage = ? WHERE id = ?",
            (new_pct, student_id)
        )
        return new_pct, total, present
    return None, 0, 0


def reopen_issue(conn, issue_id: int, changed_by: str = "AI Confirmation Call",
                 parent_feedback: str = None) -> dict:
    """
    Reopens an issue when the parent confirms the issue was not solved.
    Increments reopen_count, sets is_critical=1 when reopen_count >= 3,
    appends to issue_timeline, and keeps the loop running.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM issues WHERE id = ?", (issue_id,))
    issue = cursor.fetchone()
    if not issue:
        return {"success": False, "error": "Issue not found"}

    reopen_count = (issue["reopen_count"] or 0) + 1
    is_critical = 1 if reopen_count >= 3 else 0

    cursor.execute("""
        UPDATE issues
        SET status = 'Reopened',
            reopen_count = ?,
            is_critical = ?,
            parent_feedback = COALESCE(?, parent_feedback),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (reopen_count, is_critical, parent_feedback, issue_id))

    notes = f"Parent reported issue not resolved. Reopen cycle #{reopen_count}."
    if is_critical:
        notes += " Flagged CRITICAL (reopen count >= 3)."

    cursor.execute("""
        INSERT INTO issue_timeline (issue_id, from_status, to_status, changed_by, notes)
        VALUES (?, ?, 'Reopened', ?, ?)
    """, (issue_id, issue["status"], changed_by, notes))

    conn.commit()
    return {
        "success": True,
        "issue_id": issue_id,
        "reopen_count": reopen_count,
        "is_critical": is_critical,
        "status": "Reopened"
    }


def record_class_upload(conn, department: str, year: str, section: str, attendance_date: str,
                        uploaded_by: str, filename: str, total_count: int, present_count: int,
                        absent_count: int, invalid_count: int = 0, no_phone_count: int = 0) -> dict:
    """
    Records an upload for a class and date.
    Enforces the single active upload rule per class + date:
    If an existing active upload exists for this class + date, marks it as 'replaced'
    and links replaced_by = new_upload_id, preserving complete upload history.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id FROM uploads
        WHERE UPPER(department) = UPPER(?) AND UPPER(year) = UPPER(?) AND UPPER(section) = UPPER(?)
          AND attendance_date = ? AND status = 'active'
    """, (department, year, section, attendance_date))
    existing = cursor.fetchone()

    cursor.execute("""
        INSERT INTO uploads (
            department, year, section, attendance_date, uploaded_by, filename,
            total_count, present_count, absent_count, invalid_count, no_phone_count, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    """, (department.upper(), year.upper(), section.upper(), attendance_date, uploaded_by, filename,
          total_count, present_count, absent_count, invalid_count, no_phone_count))
    new_upload_id = cursor.lastrowid

    replaced_id = None
    if existing:
        replaced_id = existing[0]
        cursor.execute("UPDATE uploads SET status = 'replaced', replaced_by = ? WHERE id = ?",
                       (new_upload_id, replaced_id))

    conn.commit()
    return {
        "upload_id": new_upload_id,
        "replaced_upload_id": replaced_id,
        "status": "active"
    }


def _seed_initial_data(cursor, conn):
    """Inserts realistic demo data: departments, classes, ~40 students, campaigns, and issues."""
    # 1. Seed Academic Units (Departments, Years, Sections)
    academic_units = [
        ('department', 'CSE', 'Computer Science & Engineering', 1),
        ('department', 'ECE', 'Electronics & Communication Engineering', 1),
        ('year', 'I', 'I Year', 1),
        ('year', 'II', 'II Year', 1),
        ('year', 'III', 'III Year', 1),
        ('year', 'IV', 'IV Year', 1),
        ('section', 'A', 'Section A', 1),
        ('section', 'B', 'Section B', 1),
        ('section', 'C', 'Section C', 1),
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO academic_units (unit_type, code, name, is_active)
        VALUES (?, ?, ?, ?)
    """, academic_units)

    # 2. Seed Users across all required roles
    default_users = [
        ("admin", "admin123", "Admin", "Dean of Academics (Admin)", "All", 1),
        ("faculty_cse", "faculty123", "Faculty", "Dr. A. Srinivas (CSE Faculty)", "CSE", 1),
        ("faculty_ece", "faculty123", "Faculty", "Dr. P. Madhavi (ECE Faculty)", "ECE", 1),
        ("coordinator_college", "coord123", "College Coordinator", "Prof. M. Sridhar (College Coordinator)", "All", 1),
        ("dean_hostel", "dean123", "Hostel Dean", "Dr. B. Prasad (Hostel Dean)", "All", 1),
        ("correspondent_bus", "bus123", "Bus Correspondent", "Mr. K. Narayana (Transport Correspondent)", "All", 1),
        # Legacy accounts preserved for backward test compatibility
        ("principal", "principal123", "Principal", "Dr. K. V. S. Murthy (Principal)", "All", 1),
        ("coord_cse", "coord123", "Department Coordinator", "Prof. M. Sridhar (CSE Coord)", "CSE", 1),
        ("coord_ece", "coord123", "Department Coordinator", "Prof. V. Radhika (ECE Coord)", "ECE", 1),
    ]

    user_id_map = {}
    for username, plain_pass, role, full_name, dept, is_active in default_users:
        pass_hash = generate_password_hash(plain_pass)
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        existing = cursor.fetchone()
        if not existing:
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, full_name, department, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (username, pass_hash, role, full_name, dept, is_active))
            user_id_map[username] = cursor.lastrowid
        else:
            cursor.execute("""
                UPDATE users SET password_hash = ?, role = ?, full_name = ?, department = ?, is_active = ?
                WHERE username = ?
            """, (pass_hash, role, full_name, dept, is_active, username))
            user_id_map[username] = existing[0]

    # 3. Seed Faculty Class Assignments
    faculty_cse_id = user_id_map.get("faculty_cse")
    faculty_ece_id = user_id_map.get("faculty_ece")

    assignments = []
    if faculty_cse_id:
        assignments.append((faculty_cse_id, 'CSE', 'III', 'A'))
        assignments.append((faculty_cse_id, 'CSE', 'III', 'B'))
    if faculty_ece_id:
        assignments.append((faculty_ece_id, 'ECE', 'III', 'A'))

    cursor.executemany("""
        INSERT OR IGNORE INTO faculty_class_assignments (user_id, department, year, section)
        VALUES (?, ?, ?, ?)
    """, assignments)

    # 4. Seed ~40 Students across CSE-III-A, CSE-III-B, and ECE-III-A
    cursor.execute("SELECT COUNT(*) FROM students")
    student_count = cursor.fetchone()[0]

    if student_count < 35:
        # Clear existing sample students to create clean ~40 student roster
        cursor.execute("DELETE FROM students")
        
        students_data = [
            # CSE - III Year - Section A (15 students)
            ("211FA04001", "K. Sai Praneeth", "CSE", "III", "A", "+919848011001", "sai.praneeth@vignan.ac.in", "K. Venkateswara Rao", "Father", "+919848012345", "Telugu", 72.5, "Data Structures: 82/100, DBMS: 74/100", "Hostel", None, 1),
            ("211FA04002", "B. Divya Sri", "CSE", "III", "A", "+919848011002", "divya.sri@vignan.ac.in", "B. Nageswara Rao", "Father", "+919848023456", "Telugu", 94.0, "Data Structures: 95/100, DBMS: 91/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04003", "P. Rahul Varma", "CSE", "III", "A", "+919848011003", "rahul.varma@vignan.ac.in", "P. Satyanarayana", "Father", "+919848034567", "Telugu", 68.0, "Data Structures: 65/100, DBMS: 62/100", "Day Scholar", "Route 8 - Madhurawada", 1),
            ("211FA04004", "Ch. Hemanth Kumar", "CSE", "III", "A", "+919848011004", "hemanth.kumar@vignan.ac.in", "Ch. Srinivas", "Father", "+919848045678", "Telugu", 88.5, "Data Structures: 85/100, DBMS: 88/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04005", "G. Lakshmi Prasanna", "CSE", "III", "A", "+919848011005", "lakshmi.p@vignan.ac.in", "G. Appa Rao", "Father", "+919848056789", "Telugu", 91.0, "Data Structures: 90/100, DBMS: 89/100", "Hostel", None, 1),
            ("211FA04006", "S. Venkat Ram", "CSE", "III", "A", "+919848011006", "venkat.ram@vignan.ac.in", "S. Krishna Murthy", "Father", "+919848067890", "Telugu", 64.5, "Data Structures: 58/100, DBMS: 61/100", "Hostel", None, 1),
            ("211FA04007", "M. Satish", "CSE", "III", "A", "+919848011007", "m.satish@vignan.ac.in", "M. Someswara Rao", "Father", "+919848078901", "Telugu", 85.0, "Data Structures: 80/100, DBMS: 82/100", "Day Scholar", "Route 24 - NAD Junction", 1),
            ("211FA04008", "K. Bhavani Devi", "CSE", "III", "A", "+919848011008", "bhavani.devi@vignan.ac.in", "K. Rama Rao", "Father", "+919848089012", "Telugu", 79.0, "Data Structures: 78/100, DBMS: 76/100", "Day Scholar", "Route 5 - Steel Plant", 1),
            ("211FA04009", "V. Rakesh", "CSE", "III", "A", "+919848011009", "v.rakesh@vignan.ac.in", "V. Mohan Rao", "Father", "+919848090123", "Telugu", 87.0, "Data Structures: 84/100, DBMS: 86/100", "Hostel", None, 1),
            ("211FA04010", "V. Harshitha", "CSE", "III", "A", "+919848011010", "v.harshitha@vignan.ac.in", "V. Subba Rao", "Father", "+919848101234", "Telugu", 92.5, "Data Structures: 94/100, DBMS: 91/100", "Day Scholar", "Route 8 - Madhurawada", 1),
            ("211FA04011", "T. Akhil", "CSE", "III", "A", "+919848011011", "t.akhil@vignan.ac.in", "T. Govinda Rajulu", "Father", "+919848112345", "Telugu", 76.0, "Data Structures: 72/100, DBMS: 75/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04012", "D. Meghana", "CSE", "III", "A", "+919848011012", "d.meghana@vignan.ac.in", "D. Shankar", "Father", "+919848123456", "Telugu", 89.0, "Data Structures: 86/100, DBMS: 89/100", "Hostel", None, 1),
            ("211FA04013", "N. Tejaswi", "CSE", "III", "A", "+919848011013", "n.tejaswi@vignan.ac.in", "N. Prasad", "Father", "+919848134567", "Telugu", 83.0, "Data Structures: 81/100, DBMS: 84/100", "Day Scholar", "Route 24 - NAD Junction", 1),
            ("211FA04014", "A. Karthik", "CSE", "III", "A", "+919848011014", "a.karthik@vignan.ac.in", "A. Narayana Rao", "Father", "+919848145678", "Telugu", 70.0, "Data Structures: 68/100, DBMS: 71/100", "Hostel", None, 1),
            ("211FA04015", "J. Sandhya", "CSE", "III", "A", "+919848011015", "j.sandhya@vignan.ac.in", "J. Kameswara Rao", "Father", "+919848156789", "Telugu", 95.0, "Data Structures: 96/100, DBMS: 94/100", "Day Scholar", "Route 5 - Steel Plant", 1),

            # CSE - III Year - Section B (15 students)
            ("211FA04021", "M. Tarun Teja", "CSE", "III", "B", "+919848021001", "tarun.teja@vignan.ac.in", "M. Satyanarayana", "Father", "+919989056789", "Telugu", 71.0, "Data Structures: 70/100, DBMS: 69/100", "Hostel", None, 1),
            ("211FA04022", "K. Navya", "CSE", "III", "B", "+919848021002", "k.navya@vignan.ac.in", "K. Jagannadha Rao", "Father", "+919989067890", "Telugu", 88.0, "Data Structures: 85/100, DBMS: 87/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04023", "P. Dinesh", "CSE", "III", "B", "+919848021003", "p.dinesh@vignan.ac.in", "P. Simhachalam", "Father", "+919989078901", "Telugu", 66.5, "Data Structures: 60/100, DBMS: 64/100", "Day Scholar", "Route 8 - Madhurawada", 1),
            ("211FA04024", "R. Anusha", "CSE", "III", "B", "+919848021004", "r.anusha@vignan.ac.in", "R. Mallikarjuna", "Father", "+919989089012", "Telugu", 92.0, "Data Structures: 90/100, DBMS: 93/100", "Hostel", None, 1),
            ("211FA04025", "Y. Harish", "CSE", "III", "B", "+919848021005", "y.harish@vignan.ac.in", "Y. Ramana", "Father", "+919989090123", "Telugu", 81.5, "Data Structures: 80/100, DBMS: 82/100", "Day Scholar", "Route 24 - NAD Junction", 1),
            ("211FA04026", "G. Swathi", "CSE", "III", "B", "+919848021006", "g.swathi@vignan.ac.in", "G. Danayya", "Father", "+919989101234", "Telugu", 84.0, "Data Structures: 82/100, DBMS: 85/100", "Day Scholar", "Route 5 - Steel Plant", 1),
            ("211FA04027", "T. Manoj", "CSE", "III", "B", "+919848021007", "t.manoj@vignan.ac.in", "T. Suryanarayana", "Father", "+919989112345", "Telugu", 73.0, "Data Structures: 70/100, DBMS: 74/100", "Hostel", None, 1),
            ("211FA04028", "V. Rohini", "CSE", "III", "B", "+919848021008", "v.rohini@vignan.ac.in", "V. Chalapathi Rao", "Father", "+919989123456", "Telugu", 90.0, "Data Structures: 88/100, DBMS: 91/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04029", "S. Ajay Kumar", "CSE", "III", "B", "+919848021009", "s.ajay@vignan.ac.in", "S. Trimurthulu", "Father", "+919989134567", "Telugu", 67.0, "Data Structures: 65/100, DBMS: 68/100", "Day Scholar", "Route 8 - Madhurawada", 1),
            ("211FA04030", "B. Keerthana", "CSE", "III", "B", "+919848021010", "b.keerthana@vignan.ac.in", "B. Gurunadha Rao", "Father", "+919989145678", "Telugu", 93.5, "Data Structures: 94/100, DBMS: 92/100", "Hostel", None, 1),
            ("211FA04031", "K. Lokesh", "CSE", "III", "B", "+919848021011", "k.lokesh@vignan.ac.in", "K. Chandra Sekhar", "Father", "+919989156789", "Telugu", 78.0, "Data Structures: 76/100, DBMS: 79/100", "Day Scholar", "Route 24 - NAD Junction", 1),
            ("211FA04032", "N. Sravani", "CSE", "III", "B", "+919848021012", "n.sravani@vignan.ac.in", "N. Sambasiva Rao", "Father", "+919989167890", "Telugu", 86.5, "Data Structures: 84/100, DBMS: 87/100", "Day Scholar", "Route 5 - Steel Plant", 1),
            ("211FA04033", "C. Mahesh", "CSE", "III", "B", "+919848021013", "c.mahesh@vignan.ac.in", "C. Varaha Murthy", "Father", "+919989178901", "Telugu", 69.5, "Data Structures: 67/100, DBMS: 70/100", "Hostel", None, 1),
            ("211FA04034", "P. Mounika", "CSE", "III", "B", "+919848021014", "p.mounika@vignan.ac.in", "P. Bhaskara Rao", "Father", "+919989189012", "Telugu", 96.0, "Data Structures: 95/100, DBMS: 97/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04035", "D. Vikas", "CSE", "III", "B", "+919848021015", "d.vikas@vignan.ac.in", "D. Eswara Rao", "Father", "+919989190123", "Telugu", 75.0, "Data Structures: 72/100, DBMS: 76/100", "Hostel", None, 1),

            # ECE - III Year - Section A (10 students)
            ("211FA04101", "P. Ananya Sharma", "ECE", "III", "A", "+919848031001", "ananya.sharma@vignan.ac.in", "Suresh Sharma", "Father", "+919490145678", "English", 88.0, "Signals: 86/100, VLSI: 89/100", "Day Scholar", "Route 8 - Madhurawada", 1),
            ("211FA04102", "N. Tarun Kumar", "ECE", "III", "A", "+919848031002", "tarun.k@vignan.ac.in", "N. Venkatesh", "Father", "+919490156789", "Telugu", 74.0, "Signals: 70/100, VLSI: 75/100", "Hostel", None, 1),
            ("211FA04103", "R. Sneha Latha", "ECE", "III", "A", "+919848031003", "sneha.latha@vignan.ac.in", "R. Prabhakar", "Father", "+919866067890", "Telugu", 95.5, "Signals: 97/100, VLSI: 94/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04104", "K. Varun", "ECE", "III", "A", "+919848031004", "k.varun@vignan.ac.in", "K. Madhava Rao", "Father", "+919490178901", "Telugu", 65.0, "Signals: 62/100, VLSI: 64/100", "Day Scholar", "Route 24 - NAD Junction", 1),
            ("211FA04105", "S. Sai Teja", "ECE", "III", "A", "+919848031005", "sai.teja@vignan.ac.in", "S. Srinivasa Rao", "Father", "+919490189012", "Telugu", 82.0, "Signals: 80/100, VLSI: 83/100", "Day Scholar", "Route 8 - Madhurawada", 1),
            ("211FA04106", "T. Pooja", "ECE", "III", "A", "+919848031006", "t.pooja@vignan.ac.in", "T. Ramana Murthy", "Father", "+919490190123", "Telugu", 91.0, "Signals: 90/100, VLSI: 92/100", "Hostel", None, 1),
            ("211FA04107", "M. Nikhil", "ECE", "III", "A", "+919848031007", "m.nikhil@vignan.ac.in", "M. Sanyasi Rao", "Father", "+919490201234", "Telugu", 68.5, "Signals: 65/100, VLSI: 69/100", "Hostel", None, 1),
            ("211FA04108", "B. Lavanya", "ECE", "III", "A", "+919848031008", "b.lavanya@vignan.ac.in", "B. Dhanunjaya", "Father", "+919490212345", "Telugu", 89.5, "Signals: 88/100, VLSI: 90/100", "Day Scholar", "Route 5 - Steel Plant", 1),
            ("211FA04109", "V. Pradeep", "ECE", "III", "A", "+919848031009", "v.pradeep@vignan.ac.in", "V. Anand Kumar", "Father", "+919490223456", "Telugu", 77.0, "Signals: 75/100, VLSI: 78/100", "Day Scholar", "Route 12 - Gajuwaka", 1),
            ("211FA04110", "G. Sireesha", "ECE", "III", "A", "+919848031010", "g.sireesha@vignan.ac.in", "G. Krishna", "Father", "+919490234567", "Telugu", 93.0, "Signals: 92/100, VLSI: 94/100", "Hostel", None, 1),
        ]

        cursor.executemany("""
            INSERT INTO students (
                roll_number, name, department, year_semester, section,
                student_phone, student_email, parent_name, parent_relationship, parent_phone,
                preferred_language, attendance_percentage, marks_info, category, bus_route, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, students_data)

    # 5. Seed Uploads record
    cursor.execute("SELECT COUNT(*) FROM uploads")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO uploads (
                department, year, section, attendance_date, uploaded_by, filename,
                total_count, present_count, absent_count, invalid_count, no_phone_count, status
            ) VALUES ('CSE', 'III', 'A', '2026-11-07', 'faculty_cse', 'CSE_III_A_Attendance_2026-11-07.xlsx', 15, 12, 3, 0, 0, 'active')
        """)
        cse_upload_id = cursor.lastrowid
    else:
        cursor.execute("SELECT id FROM uploads WHERE department = 'CSE' AND year = 'III' AND section = 'A'")
        cse_upload_id = cursor.fetchone()[0]

    # 6. Seed Campaigns (One Module A, One Module B)
    cursor.execute("SELECT COUNT(*) FROM campaigns")
    if cursor.fetchone()[0] == 0:
        # Campaign 1: Module A (Attendance / Mentoring)
        config_a = json.dumps({
            "language": "Telugu",
            "voice": "kavitha",
            "calling_hours": "09:00 - 18:00",
            "retries": 2,
            "script_template": "నమస్కారం! మేము విఘ్నాన్ ఇంజనీరింగ్ కాలేజీ నుండి మాట్లాడుతున్నాము. మీ అబ్బాయి/అమ్మాయి నేటి తరగతికి గైర్హాజరయ్యారు."
        })
        cursor.execute("""
            INSERT INTO campaigns (
                name, department, year, section, attendance_date, module_type,
                upload_id, total_students, target_count, completed_count, status,
                config_json, created_by, confirmed_by
            ) VALUES (
                'CSE-III-A Daily Attendance & Mentoring Notice', 'CSE', 'III', 'A', '2026-11-07', 'mentoring',
                ?, 15, 3, 3, 'completed', ?, 'faculty_cse', 'admin'
            )
        """, (cse_upload_id, config_a))
        camp_a_id = cursor.lastrowid

        # Campaign 2: Module B (Feedback Call)
        config_b = json.dumps({
            "language": "Telugu",
            "voice": "pooja",
            "calling_hours": "10:00 - 17:00",
            "retries": 1,
            "topics": ["College", "Hostel", "Bus"],
            "script_template": "నమస్కారం! విఘ్నాన్ ఇన్స్టిట్యూట్ విద్యార్థుల సౌకర్యాల ఫీడ్బ్యాక్ సర్వే కోసం ఈ కాల్ చేస్తున్నాము."
        })
        cursor.execute("""
            INSERT INTO campaigns (
                name, department, year, section, attendance_date, module_type,
                upload_id, total_students, target_count, completed_count, status,
                config_json, created_by, confirmed_by
            ) VALUES (
                'ECE-III-A Institutional Facilities Feedback', 'ECE', 'III', 'A', '2026-11-06', 'feedback',
                NULL, 10, 10, 10, 'completed', ?, 'faculty_ece', 'admin'
            )
        """, (config_b,))
        camp_b_id = cursor.lastrowid

        # Seed Call Records for completed Campaign A (Absent students called)
        cursor.execute("SELECT id, roll_number, name, parent_phone FROM students WHERE roll_number IN ('211FA04001', '211FA04003', '211FA04006')")
        absent_studs = cursor.fetchall()
        for s in absent_studs:
            s_id, r_no, s_name, p_phone = s
            cursor.execute("""
                INSERT INTO call_records (
                    student_id, campaign_id, status, language, duration_seconds,
                    transcript, summary, initiated_by, attendance_date, issue_flag
                ) VALUES (?, ?, 'Completed', 'Telugu', 135,
                    'AI: నమస్కారం, నేను విఘ్నాన్ ఇంజనీరింగ్ కాలేజీ నుండి మాట్లాడుతున్నాను. నేడు మీ అబ్బాయి గైర్హాజరయ్యారు.\nతల్లిదండ్రులు: అవునండీ, కొద్దిగా జ్వరం ఉండటం వల్ల రాలేదు.\nAI: సరేనండి, త్వరగా కోలుకోవాలని కోరుకుంటున్నాము.',
                    'Parent confirmed student absence due to mild viral fever. Student advised rest.',
                    'admin', '2026-11-07', 0)
            """, (s_id, camp_a_id))

    # 7. Seed 5+ Realistic Issues in different statuses across College, Hostel, and Bus
    cursor.execute("SELECT COUNT(*) FROM issues")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04001'")
        s1_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04004'")
        s2_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04010'")
        s3_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04102'")
        s4_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04105'")
        s5_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04007'")
        s6_id = cursor.fetchone()[0]

        issues_data = [
            # Issue 1: Hostel - Open
            (None, None, s1_id, 'hostel', 'Water geyser maintenance in Block-B Hostel',
             'Parent reported during feedback call that hot water geyser in 2nd floor Block-B has been dysfunctional for 3 days.',
             'Hostel Dean', 'Dr. B. Prasad', 'Open', 0, 0, 'Parent requested urgent electrical repair before winter mornings.', None),
            
            # Issue 2: Bus - Owner Alerted
            (None, None, s2_id, 'bus', 'Route 12 morning delay at Kurmannapalem stop',
             'Parent reported that Bus Route 12 arrived 25 minutes late twice this week, causing student to miss 1st period class.',
             'Bus Correspondent', 'Mr. K. Narayana', 'Owner Alerted', 0, 0, 'Driver reported heavy junction traffic near Gajuwaka bridge.', None),
            
            # Issue 3: College - In Progress
            (None, None, s3_id, 'college', 'Access to Machine Learning Reference Textbooks in Library',
             'Parent requested longer library borrowing period for Sem-5 core subjects before mid-term exams.',
             'College Coordinator', 'Prof. M. Sridhar', 'In Progress', 0, 0, 'Parent requested 14-day checkout window instead of 7 days.', 'Library committee reviewing additional copy procurement.'),
            
            # Issue 4: Hostel - Resolved by Owner (Pending parent confirmation call)
            (None, None, s4_id, 'hostel', 'Hostel dining hall evening snacks nutritional variety',
             'Parent inquired about nutritionist-approved evening refreshments.',
             'Hostel Dean', 'Dr. B. Prasad', 'Resolved by Owner', 0, 0, 'Parent requested fruit options.', 'Mess contractor instructed to serve seasonal fresh fruits and boiled sprouts on alternate days.'),
            
            # Issue 5: Bus - Closed
            (None, None, s5_id, 'bus', 'Route 8 evening seating congestion',
             'Parent requested route expansion due to overcrowding from campus to Madhurawada.',
             'Bus Correspondent', 'Mr. K. Narayana', 'Closed', 0, 0, 'Confirmed comfortable seat available now.', 'Additional 32-seater feeder bus deployed on Route 8 starting 01-Nov.'),
            
            # Issue 6: College - Critical (3 reopens)
            (None, None, s6_id, 'college', 'IoT Lab hardware calibration and replacement of faulty breadboards',
             'Parent followed up repeatedly on malfunctioning sensor kits in 3rd floor IoT lab. Previous maintenance was incomplete.',
             'College Coordinator', 'Prof. M. Sridhar', 'Reopened', 3, 1, 'Parent verified on 05-Nov that students still faced faulty sensors in practical exam.', 'Lab technician replacing entire batch with certified Arduino sensor kits.')
        ]

        for camp_id, call_id, stud_id, cat, title, desc, o_role, o_name, status, reopens, is_crit, p_feed, res_notes in issues_data:
            cursor.execute("""
                INSERT INTO issues (
                    campaign_id, call_record_id, student_id, category, title, description,
                    owner_role, owner_name, status, reopen_count, is_critical,
                    parent_feedback, resolution_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (camp_id, call_id, stud_id, cat, title, desc, o_role, o_name, status, reopens, is_crit, p_feed, res_notes))
            issue_id = cursor.lastrowid

            # Add sample timeline entries
            cursor.execute("""
                INSERT INTO issue_timeline (issue_id, from_status, to_status, changed_by, notes)
                VALUES (?, NULL, 'Open', 'AI Voice System', 'Issue automatically logged from parent feedback call transcript.')
            """, (issue_id,))

            if status in ['Owner Alerted', 'In Progress', 'Resolved by Owner', 'Closed', 'Reopened']:
                cursor.execute("""
                    INSERT INTO issue_timeline (issue_id, from_status, to_status, changed_by, notes)
                    VALUES (?, 'Open', 'Owner Alerted', 'System Dispatcher', '[Demo Alert] Notification dispatched to designated department owner.')
                """, (issue_id,))

            if status in ['In Progress', 'Resolved by Owner', 'Closed', 'Reopened']:
                cursor.execute("""
                    INSERT INTO issue_timeline (issue_id, from_status, to_status, changed_by, notes)
                    VALUES (?, 'Owner Alerted', 'In Progress', ?, 'Owner opened case file and initiated verification.')
                """, (issue_id, o_name or "Department Head"))

            if status in ['Resolved by Owner', 'Closed']:
                cursor.execute("""
                    INSERT INTO issue_timeline (issue_id, from_status, to_status, changed_by, notes)
                    VALUES (?, 'In Progress', 'Resolved by Owner', ?, ?)
                """, (issue_id, o_name or "Department Head", res_notes or "Action completed."))

            if status == 'Closed':
                cursor.execute("""
                    INSERT INTO issue_timeline (issue_id, from_status, to_status, changed_by, notes)
                    VALUES (?, 'Resolved by Owner', 'Closed', 'AI Confirmation Call', 'Parent confirmed satisfaction during automated follow-up call.')
                """, (issue_id,))

            if status == 'Reopened':
                cursor.execute("""
                    INSERT INTO issue_timeline (issue_id, from_status, to_status, changed_by, notes)
                    VALUES (?, 'Resolved by Owner', 'Reopened', 'AI Confirmation Call', 'Parent reported issue persists. Case escalated to Critical Attention.')
                """, (issue_id,))

    # 8. Seed Default System Settings
    settings = [
        ('calling_hours', '09:00 - 18:00', 'Permitted automated parent calling window (IST)'),
        ('max_retries', '2', 'Maximum outbound call retries for unanswered or busy calls'),
        ('default_language', 'Telugu', 'Primary speech synthesis and dialogue language'),
        ('default_voice', 'kavitha', 'Default regional voice persona for regional synthesis'),
        ('max_call_duration_seconds', '180', 'Maximum automated parent conversation length in seconds'),
        ('phone_masking_enabled', '1', 'Enforce masked display of parental telephone numbers'),
        ('demo_mode', '1', 'Simulate telephony calls without dispatching real PSTN carrier minutes')
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO system_settings (key, value, description)
        VALUES (?, ?, ?)
    """, settings)

    conn.commit()


if __name__ == "__main__":
    init_db()
    print("VIIT AI Feedback database initialized successfully at:", DB_PATH)

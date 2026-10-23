"""
Database configuration and SQLite helper for Vignan Spandana
AI Parent Communication System.
"""

import sqlite3
import os
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
    """Initializes tables for Users, AuditLogs, Students, CallRecords, and FollowUps."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 1. Users table with secure password hash, role, department, and active status
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,           -- 'Principal', 'Admin', 'Department Coordinator', 'Faculty'
        full_name TEXT NOT NULL,
        department TEXT DEFAULT 'All', -- 'CSE', 'ECE', 'IT', 'MECH', 'All'
        is_active INTEGER DEFAULT 1,  -- 1 = active, 0 = deactivated
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Schema migration helper: if old 'users' table exists with plain 'password' column
    cursor.execute("PRAGMA table_info(users)")
    cols = [col[1] for col in cursor.fetchall()]
    if "password_hash" not in cols:
        # Recreate users table cleanly
        cursor.execute("DROP TABLE users")
        cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL,
            department TEXT DEFAULT 'All',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

    # 2. Audit Log table (Admin only viewer, no secrets logged)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        action TEXT NOT NULL,         -- 'login', 'login_failed', 'logout', 'user_created', 'user_deactivated', 'user_reactivated', 'role_changed', 'student_view', 'call_start', 'import', 'export'
        resource TEXT,
        details TEXT,
        ip_address TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_number TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,     -- e.g. CSE, ECE, IT, MECH
        year_semester TEXT NOT NULL,  -- e.g. "III Year - Sem 1"
        section TEXT NOT NULL,        -- e.g. "A", "B", "C"
        student_phone TEXT,
        student_email TEXT,
        parent_name TEXT NOT NULL,
        parent_relationship TEXT DEFAULT 'Parent',
        parent_phone TEXT,
        preferred_language TEXT NOT NULL DEFAULT 'Telugu', -- 'Telugu', 'Hindi', 'English'
        attendance_percentage REAL DEFAULT 85.0,
        marks_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. CallRecord table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS call_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
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
        followup_id INTEGER
    );
    """)

    # Migration helper for call_records schema upgrades
    cursor.execute("PRAGMA table_info(call_records)")
    call_cols = [col[1] for col in cursor.fetchall()]
    if "start_time" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN start_time TIMESTAMP")
    if "end_time" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN end_time TIMESTAMP")
    if "summary" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN summary TEXT")
    if "followup_id" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN followup_id INTEGER")
    if "attendance_date" not in call_cols:
        cursor.execute("ALTER TABLE call_records ADD COLUMN attendance_date TEXT")

    # Migration helper for students table upgrades (marks_info, student_phone, student_email, parent_relationship)
    cursor.execute("PRAGMA table_info(students)")
    student_cols = [col[1] for col in cursor.fetchall()]
    if "marks_info" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN marks_info TEXT")
    if "student_phone" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN student_phone TEXT")
    if "student_email" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN student_email TEXT")
    if "parent_relationship" not in student_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN parent_relationship TEXT DEFAULT 'Parent'")

    # 5. FollowUp notes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS follow_ups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        call_record_id INTEGER REFERENCES call_records(id) ON DELETE SET NULL,
        teacher_name TEXT NOT NULL,
        assigned_to TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in progress', 'closed'
        notes TEXT NOT NULL,
        action_required TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Migration helper for follow_ups table upgrades
    cursor.execute("PRAGMA table_info(follow_ups)")
    follow_cols = [col[1] for col in cursor.fetchall()]
    if "call_record_id" not in follow_cols:
        cursor.execute("ALTER TABLE follow_ups ADD COLUMN call_record_id INTEGER")
    if "assigned_to" not in follow_cols:
        cursor.execute("ALTER TABLE follow_ups ADD COLUMN assigned_to TEXT")
    if "due_date" not in follow_cols:
        cursor.execute("ALTER TABLE follow_ups ADD COLUMN due_date TEXT")
    if "status" not in follow_cols:
        cursor.execute("ALTER TABLE follow_ups ADD COLUMN status TEXT NOT NULL DEFAULT 'open'")
    if "updated_at" not in follow_cols:
        cursor.execute("ALTER TABLE follow_ups ADD COLUMN updated_at TIMESTAMP")

    # 6. Daily Attendance Records table
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
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);")

    # Migration helper for attendance_records schema upgrades
    cursor.execute("PRAGMA table_info(attendance_records)")
    att_cols = [col[1] for col in cursor.fetchall()]
    if "call_record_id" not in att_cols:
        cursor.execute("ALTER TABLE attendance_records ADD COLUMN call_record_id INTEGER REFERENCES call_records(id)")

    conn.commit()

    if seed_data:
        _seed_initial_data(cursor, conn)

    conn.close()


def recalculate_student_attendance(conn, student_id: int):
    """
    Recalculates a student's attendance percentage from available attendance_records.
    If no daily attendance records exist for the student, leaves the existing baseline untouched.
    If records exist, updates attendance_percentage to round((present / total) * 100.0, 1).
    Returns (calculated_pct, total_sessions, present_sessions).
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


def _seed_initial_data(cursor, conn):
    """Inserts default mock users with hashed passwords and demo students."""
    # Seed default users with roles: Principal, Admin, Department Coordinator, Faculty
    default_users = [
        ("admin", "admin123", "Admin", "Dean of Academics (Admin)", "All", 1),
        ("principal", "principal123", "Principal", "Dr. K. V. S. Murthy (Principal)", "All", 1),
        ("coord_cse", "coord123", "Department Coordinator", "Prof. M. Sridhar (CSE Coord)", "CSE", 1),
        ("coord_ece", "coord123", "Department Coordinator", "Prof. V. Radhika (ECE Coord)", "ECE", 1),
        ("faculty_cse", "faculty123", "Faculty", "Dr. A. Srinivas (CSE Faculty)", "CSE", 1),
        ("faculty_ece", "faculty123", "Faculty", "Dr. P. Madhavi (ECE Faculty)", "ECE", 1),
    ]

    for username, plain_pass, role, full_name, dept, is_active in default_users:
        pass_hash = generate_password_hash(plain_pass)
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        existing = cursor.fetchone()
        if not existing:
            cursor.execute("""
                INSERT INTO users (username, password_hash, role, full_name, department, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (username, pass_hash, role, full_name, dept, is_active))
        else:
            # Update password hash, role and department if already present
            cursor.execute("""
                UPDATE users SET password_hash = ?, role = ?, full_name = ?, department = ?, is_active = ?
                WHERE username = ?
            """, (pass_hash, role, full_name, dept, is_active, username))

    # Check if students already exist
    cursor.execute("SELECT COUNT(*) FROM students")
    count = cursor.fetchone()[0]

    if count == 0:
        demo_students = [
            ("211FA04001", "K. Sai Praneeth", "CSE", "III Year - Sem 1", "A", "Venkateswara Rao", "+91 98480 12345", "Telugu", 78.5),
            ("211FA04018", "B. Divya Sri", "CSE", "III Year - Sem 1", "A", "B. Nageswara Rao", "+91 98480 23456", "Telugu", 92.0),
            ("211FA04052", "Mohd. Arif Khan", "IT", "III Year - Sem 1", "B", "Abdul Rahim Khan", "+91 94401 34567", "Hindi", 64.0),
            ("211FA04099", "P. Ananya Sharma", "ECE", "II Year - Sem 1", "C", "Suresh Sharma", "+91 94901 45678", "English", 88.0),
            ("211FA04115", "M. Tarun Teja", "CSE", "IV Year - Sem 1", "A", "M. Satyanarayana", "+91 99890 56789", "Telugu", 71.0),
            ("211FA04140", "R. Sneha Latha", "ECE", "III Year - Sem 2", "B", "R. Prabhakar", "+91 98660 67890", "Telugu", 95.5),
        ]

        cursor.executemany("""
            INSERT INTO students (
                roll_number, name, department, year_semester, section,
                parent_name, parent_phone, preferred_language, attendance_percentage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, demo_students)

    conn.commit()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)

"""
Tests for Feature: Daily Attendance Marking & Simulated Parent Calling Integration.
Covers:
1. Faculty & Coordinator access to /attendance/mark
2. Department scoping & unauthorized access prevention (403)
3. Principal read-only enforcement
4. Recording Present and Absent attendance in SQLite
5. Uniqueness constraint & record editing (UPSERT without duplicate rows)
6. Dynamic attendance percentage recalculation
7. Absent student outreach display and call parent linkage
8. Student detail view attendance history tab
9. CSRF protection on mutating POST submissions
"""

import pytest
import sqlite3
from app import app
from database import get_db_connection, recalculate_student_attendance
from security import hash_password


@pytest.fixture(autouse=True)
def isolate_test_config():
    """Ensure CSRF skip and testing configs are isolated to this module and cleanly restored."""
    prev_testing = app.config.get("TESTING")
    prev_skip = app.config.get("TESTING_SKIP_CSRF")
    prev_csrf = app.config.get("WTF_CSRF_ENABLED")

    app.config["TESTING"] = True
    app.config["TESTING_SKIP_CSRF"] = True

    yield

    app.config["TESTING"] = prev_testing
    app.config["TESTING_SKIP_CSRF"] = prev_skip if prev_skip is not None else False
    app.config["WTF_CSRF_ENABLED"] = prev_csrf if prev_csrf is not None else True


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_faculty_cse():
    """Logs in as CSE Faculty."""
    client = app.test_client()
    with client.session_transaction() as sess:
        sess["user_id"] = 5
        sess["username"] = "faculty_cse"
        sess["full_name"] = "Dr. A. Srinivas (CSE Faculty)"
        sess["role"] = "Faculty"
        sess["department"] = "CSE"
    return client


@pytest.fixture
def auth_faculty_ece():
    """Logs in as ECE Faculty."""
    client = app.test_client()
    with client.session_transaction() as sess:
        sess["user_id"] = 6
        sess["username"] = "faculty_ece"
        sess["full_name"] = "Dr. P. Madhavi (ECE Faculty)"
        sess["role"] = "Faculty"
        sess["department"] = "ECE"
    return client


@pytest.fixture
def auth_principal():
    """Logs in as Principal (read-only oversight)."""
    client = app.test_client()
    with client.session_transaction() as sess:
        sess["user_id"] = 2
        sess["username"] = "principal"
        sess["full_name"] = "Dr. K. V. S. Murthy (Principal)"
        sess["role"] = "Principal"
        sess["department"] = "All"
    return client


def test_faculty_can_open_attendance_page(auth_faculty_cse):
    """Authorized faculty can open /attendance/mark for their department."""
    resp = auth_faculty_cse.get("/attendance/mark")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")
    assert "Daily Attendance Marking" in html
    assert "Student Attendance Roster" in html
    assert "attendanceDate" in html
    assert "Save Attendance Records" in html
    assert "All Present" in html
    assert "Mark All Absent" in html


def test_unauthenticated_redirects_to_login(client):
    """Anonymous visitors are redirected to the institutional login page."""
    resp = client.get("/attendance/mark")
    assert resp.status_code == 302
    assert "/login" in resp.headers["Location"]


def test_cross_department_attendance_blocked(auth_faculty_cse, auth_faculty_ece):
    """Faculty cannot access or mark attendance for departments outside their assignment."""
    # CSE Faculty attempting to access ECE department
    resp_cse = auth_faculty_cse.get("/attendance/mark?dept=ECE")
    assert resp_cse.status_code == 403

    # ECE Faculty attempting to access CSE department
    resp_ece = auth_faculty_ece.get("/attendance/mark?dept=CSE")
    assert resp_ece.status_code == 403


def test_principal_read_only_oversight(auth_principal):
    """Principal can inspect attendance campus-wide but cannot mutate attendance via POST."""
    # GET works for Principal
    resp_get = auth_principal.get("/attendance/mark?dept=CSE")
    assert resp_get.status_code == 200

    # POST is rejected with 403 Forbidden
    resp_post = auth_principal.post("/attendance/mark", data={
        "department": "CSE",
        "attendance_date": "2026-10-25"
    })
    assert resp_post.status_code == 403


def test_faculty_can_mark_present_and_absent(auth_faculty_cse):
    """Faculty can mark students Present and Absent on a date and save to SQLite."""
    conn = get_db_connection()
    # Find two CSE students
    students = conn.execute("SELECT id, roll_number FROM students WHERE department = 'CSE' ORDER BY id ASC LIMIT 2").fetchall()
    assert len(students) >= 2
    s1_id = students[0]["id"]
    s2_id = students[1]["id"]

    test_date = "2026-10-25"

    post_data = {
        "department": "CSE",
        "section": "All",
        "year_semester": "All",
        "attendance_date": test_date,
        f"status_{s1_id}": "Present",
        f"status_{s2_id}": "Absent"
    }

    resp = auth_faculty_cse.post("/attendance/mark", data=post_data, follow_redirects=True)
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")
    assert "Successfully saved attendance" in html

    # Verify directly in SQLite database
    rec1 = conn.execute(
        "SELECT * FROM attendance_records WHERE student_id = ? AND attendance_date = ?",
        (s1_id, test_date)
    ).fetchone()
    assert rec1 is not None
    assert rec1["status"] == "Present"
    assert rec1["marked_by"] == "faculty_cse"

    rec2 = conn.execute(
        "SELECT * FROM attendance_records WHERE student_id = ? AND attendance_date = ?",
        (s2_id, test_date)
    ).fetchone()
    assert rec2 is not None
    assert rec2["status"] == "Absent"
    assert rec2["marked_by"] == "faculty_cse"


def test_duplicate_records_prevented_and_edits_existing_record(auth_faculty_cse):
    """Editing attendance on the same date updates the existing record without duplicate rows."""
    conn = get_db_connection()
    student = conn.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    s_id = student["id"]
    test_date = "2026-10-26"

    # Step 1: Mark as Present
    auth_faculty_cse.post("/attendance/mark", data={
        "department": "CSE",
        "section": "All",
        "year_semester": "All",
        "attendance_date": test_date,
        f"status_{s_id}": "Present"
    })

    # Step 2: Correct to Absent on the same date
    auth_faculty_cse.post("/attendance/mark", data={
        "department": "CSE",
        "section": "All",
        "year_semester": "All",
        "attendance_date": test_date,
        f"status_{s_id}": "Absent"
    })

    # Verify uniqueness: Exactly 1 record exists for this student on this date
    rows = conn.execute(
        "SELECT * FROM attendance_records WHERE student_id = ? AND attendance_date = ?",
        (s_id, test_date)
    ).fetchall()
    assert len(rows) == 1
    assert rows[0]["status"] == "Absent"


def test_dynamic_attendance_percentage_recalculation(auth_faculty_cse):
    """Attendance percentage recalculates dynamically from verified attendance records."""
    conn = get_db_connection()
    student = conn.execute("SELECT id, roll_number FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    s_id = student["id"]

    # Clear any previous test records for this student
    conn.execute("DELETE FROM attendance_records WHERE student_id = ?", (s_id,))
    conn.commit()

    # 1. Mark 3 sessions: 2 Present, 1 Absent (2/3 = 66.7%)
    conn.execute("INSERT INTO attendance_records (student_id, attendance_date, status, marked_by) VALUES (?, '2026-10-10', 'Present', 'test')", (s_id,))
    conn.execute("INSERT INTO attendance_records (student_id, attendance_date, status, marked_by) VALUES (?, '2026-10-11', 'Present', 'test')", (s_id,))
    conn.execute("INSERT INTO attendance_records (student_id, attendance_date, status, marked_by) VALUES (?, '2026-10-12', 'Absent', 'test')", (s_id,))
    conn.commit()

    pct, total, present = recalculate_student_attendance(conn, s_id)
    conn.commit()

    assert total == 3
    assert present == 2
    assert pct == 66.7

    # Verify updated in students table
    updated_row = conn.execute("SELECT attendance_percentage FROM students WHERE id = ?", (s_id,)).fetchone()
    assert updated_row["attendance_percentage"] == 66.7


def test_absent_students_surfaced_with_call_parent_button(auth_faculty_cse):
    """Students marked Absent on a date are highlighted with an interactive Call Parent trigger."""
    conn = get_db_connection()
    student = conn.execute("SELECT id, name, roll_number FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    s_id = student["id"]
    test_date = "2026-10-27"

    # Mark as Absent
    auth_faculty_cse.post("/attendance/mark", data={
        "department": "CSE",
        "section": "All",
        "year_semester": "All",
        "attendance_date": test_date,
        f"status_{s_id}": "Absent"
    })

    # Load page for that date
    resp = auth_faculty_cse.get(f"/attendance/mark?dept=CSE&date={test_date}")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")
    assert f"Absent Students on {test_date}" in html
    assert student["name"] in html
    assert "triggerCallParent" in html
    assert "📞 Call Parent" in html


def test_student_detail_view_shows_attendance_history(auth_faculty_cse):
    """Student profile displays itemized Daily Attendance Session History."""
    conn = get_db_connection()
    student = conn.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    s_id = student["id"]

    resp = auth_faculty_cse.get(f"/student/{s_id}")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")
    assert "Daily Attendance Session History" in html
    assert "Date-wise classroom attendance recorded in SQLite" in html


def test_csrf_protection_on_attendance_post():
    """Mutating POST without valid CSRF token is rejected with 403."""
    prev_skip = app.config.get("TESTING_SKIP_CSRF")
    prev_csrf = app.config.get("WTF_CSRF_ENABLED")
    try:
        app.config["WTF_CSRF_ENABLED"] = True
        app.config["TESTING_SKIP_CSRF"] = False
        with app.test_client() as c:
            with c.session_transaction() as sess:
                sess["user_id"] = 5
                sess["username"] = "faculty_cse"
                sess["role"] = "Faculty"
                sess["department"] = "CSE"
                sess["csrf_token"] = "valid_csrf_token_12345"

            # Missing token
            resp_missing = c.post("/attendance/mark", data={"department": "CSE", "attendance_date": "2026-10-28"})
            assert resp_missing.status_code == 403
            assert "CSRF verification failed" in resp_missing.get_data(as_text=True)

            # Forged token
            resp_forged = c.post("/attendance/mark", data={
                "department": "CSE",
                "attendance_date": "2026-10-28",
                "csrf_token": "forged_fake_token_xyz"
            })
            assert resp_forged.status_code == 403
            assert "CSRF verification failed" in resp_forged.get_data(as_text=True)
    finally:
        app.config["TESTING_SKIP_CSRF"] = prev_skip
        app.config["WTF_CSRF_ENABLED"] = prev_csrf

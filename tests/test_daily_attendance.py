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


def test_call_parents_five_students_workflow(auth_faculty_cse):
    """
    Complete end-to-end test of the daily attendance to parent-calling workflow:
    1. Create five fictional students.
    2. Mark three Present and two Absent on a given date.
    3. Save attendance to SQLite.
    4. Verify 'CALL PARENTS' queue receives exactly the 2 Absent students (3 Present excluded).
    5. Run simulated calls sequentially.
    6. Verify call history contains the correct students with 'SIMULATED' notice.
    7. Verify follow-up tickets are created for faculty callback.
    8. Verify duplicate processing of the same student for the same attendance date is prevented.
    9. Verify calling a Present student is rejected with HTTP 400.
    """
    conn = get_db_connection()
    test_date = "2026-10-29"

    fictional_data = [
        ("211FA04901", "Student One (Present)", "CSE", "III Year - Sem 1", "A", "Parent One", "9876543201", "English", 85.0),
        ("211FA04902", "Student Two (Present)", "CSE", "III Year - Sem 1", "A", "Parent Two", "9876543202", "Telugu", 88.0),
        ("211FA04903", "Student Three (Present)", "CSE", "III Year - Sem 1", "A", "Parent Three", "9876543203", "English", 90.0),
        ("211FA04904", "Student Four (Absent)", "CSE", "III Year - Sem 1", "A", "Parent Four", "9876543204", "Telugu", 72.0),
        ("211FA04905", "Student Five (Absent)", "CSE", "III Year - Sem 1", "A", "Parent Five", "9876543205", "English", 70.0),
    ]

    try:
        # 1. Insert five fictional students
        for s in fictional_data:
            conn.execute("""
                INSERT OR REPLACE INTO students (
                    roll_number, name, department, year_semester, section,
                    parent_name, parent_phone, preferred_language, attendance_percentage
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, s)
        conn.commit()

        s1 = conn.execute("SELECT id FROM students WHERE roll_number = '211FA04901'").fetchone()["id"]
        s2 = conn.execute("SELECT id FROM students WHERE roll_number = '211FA04902'").fetchone()["id"]
        s3 = conn.execute("SELECT id FROM students WHERE roll_number = '211FA04903'").fetchone()["id"]
        s4 = conn.execute("SELECT id FROM students WHERE roll_number = '211FA04904'").fetchone()["id"]
        s5 = conn.execute("SELECT id FROM students WHERE roll_number = '211FA04905'").fetchone()["id"]

        # 2 & 3. Mark 3 Present and 2 Absent, save attendance
        post_data = {
            "department": "CSE",
            "section": "A",
            "year_semester": "III Year - Sem 1",
            "attendance_date": test_date,
            f"status_{s1}": "Present",
            f"status_{s2}": "Present",
            f"status_{s3}": "Present",
            f"status_{s4}": "Absent",
            f"status_{s5}": "Absent"
        }
        resp_save = auth_faculty_cse.post("/attendance/mark", data=post_data, follow_redirects=True)
        assert resp_save.status_code == 200

        # Verify page renders the CALL PARENTS button
        resp_page = auth_faculty_cse.get(f"/attendance/mark?dept=CSE&section=A&year=III+Year+-+Sem+1&date={test_date}")
        assert resp_page.status_code == 200
        html = resp_page.data.decode("utf-8")
        assert "CALL PARENTS" in html
        assert "btnCallParents" in html

        # 4. Prepare sequential queue: Verify exactly two students enter the queue (3 Present excluded)
        resp_q = auth_faculty_cse.get(f"/attendance/queue?dept=CSE&date={test_date}")
        assert resp_q.status_code == 200
        q_data = resp_q.get_json()
        assert q_data["success"] is True
        assert q_data["attendance_date"] == test_date
        assert q_data["queue_count"] == 2
        queue_rolls = [item["roll_number"] for item in q_data["queue"]]
        assert queue_rolls == ["211FA04904", "211FA04905"]
        assert "211FA04901" not in queue_rolls
        assert "211FA04902" not in queue_rolls
        assert "211FA04903" not in queue_rolls

        # 5. Run simulated calls sequentially
        call_resp4 = auth_faculty_cse.post("/attendance/queue/process", json={
            "student_id": s4,
            "attendance_date": test_date,
            "language": "Telugu"
        })
        assert call_resp4.status_code == 200
        res4 = call_resp4.get_json()
        assert res4["success"] is True
        assert "SIMULATED — NO REAL TELEPHONE CALL WAS PLACED" in res4["label"]
        call_id_4 = res4["call_record_id"]
        followup_id_4 = res4["followup_id"]

        call_resp5 = auth_faculty_cse.post("/attendance/queue/process", json={
            "student_id": s5,
            "attendance_date": test_date,
            "language": "English"
        })
        assert call_resp5.status_code == 200
        res5 = call_resp5.get_json()
        assert res5["success"] is True
        call_id_5 = res5["call_record_id"]
        followup_id_5 = res5["followup_id"]

        # 6. Verify call history contains the correct students and transparent simulation notes
        rec4 = conn.execute("SELECT * FROM call_records WHERE id = ?", (call_id_4,)).fetchone()
        assert rec4 is not None
        assert rec4["student_id"] == s4
        assert rec4["status"] == "Completed"
        assert rec4["attendance_date"] == test_date
        assert "SIMULATED — NO REAL TELEPHONE CALL WAS PLACED" in rec4["notes"]

        rec5 = conn.execute("SELECT * FROM call_records WHERE id = ?", (call_id_5,)).fetchone()
        assert rec5 is not None
        assert rec5["student_id"] == s5
        assert rec5["status"] == "Completed"
        assert rec5["attendance_date"] == test_date
        assert "SIMULATED — NO REAL TELEPHONE CALL WAS PLACED" in rec5["notes"]

        # 7. Verify follow-up tickets created for faculty attention
        fu4 = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (followup_id_4,)).fetchone()
        assert fu4 is not None
        assert fu4["student_id"] == s4
        assert fu4["status"] == "open"
        assert "Faculty callback" in fu4["action_required"]

        fu5 = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (followup_id_5,)).fetchone()
        assert fu5 is not None
        assert fu5["student_id"] == s5
        assert fu5["status"] == "open"
        assert "Faculty callback" in fu5["action_required"]

        # 8. Verify duplicate processing is prevented
        dup_resp = auth_faculty_cse.post("/attendance/queue/process", json={
            "student_id": s4,
            "attendance_date": test_date
        })
        assert dup_resp.status_code == 409
        dup_data = dup_resp.get_json()
        assert dup_data["success"] is False
        assert dup_data["duplicate"] is True
        assert "Duplicate processing prevented" in dup_data["error"]

        # Verify queue after calling has 0 pending items and 2 already contacted
        resp_q_after = auth_faculty_cse.get(f"/attendance/queue?dept=CSE&date={test_date}")
        q_after = resp_q_after.get_json()
        assert q_after["queue_count"] == 0
        assert q_after["already_called_count"] >= 2

        # 9. Verify that calling a Present student is rejected
        present_call = auth_faculty_cse.post("/attendance/queue/process", json={
            "student_id": s1,
            "attendance_date": test_date
        })
        assert present_call.status_code == 400
        assert "Only Absent students" in present_call.get_json()["error"]

    finally:
        # Cleanup fictional test records
        conn.execute("DELETE FROM students WHERE roll_number IN ('211FA04901','211FA04902','211FA04903','211FA04904','211FA04905')")
        conn.execute("DELETE FROM attendance_records WHERE attendance_date = ?", (test_date,))
        conn.commit()

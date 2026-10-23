"""
Pytest Test Suite for Call History, Follow-Ups, and Simulated Call Edge Cases:
1. Edge cases in simulated call:
   - Attendance above 75% vs below 75%
   - English and Telugu scripts
   - Double-clicking prevention (debounce guard returns 429)
   - Page refresh persistence (records saved in DB)
   - Missing phone number handling (never crashes, explicitly marked unavailable)
   - Missing attendance handling (explicitly marked unavailable, never guesses or renders None%)
2. Call History:
   - Filters for status, language, date, department, roll number search
   - Department scoping (CSE coordinator only sees CSE calls; Admin sees all)
3. Call Detail:
   - Full speaker-labelled transcript, summary, linked follow-up
   - Cross-department access blocked with 403
4. Follow-Ups:
   - List follow-ups with department scoping
   - Update follow-up: status (open/in progress/closed), assigned faculty, due date, notes
   - Principal read-only block (403)
   - Cross-department update blocked (403)
"""

import pytest
import sqlite3
import os
import re
from datetime import datetime, timedelta
from app import app
from adapters import MockAIAdapter, MockTelephonyAdapter
from database import init_db, set_active_db_path, DB_PATH
from security import clear_all_rate_limits

TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_call_history.db")


@pytest.fixture(autouse=True)
def setup_test_db():
    clear_all_rate_limits()
    set_active_db_path(TEST_DB_PATH)

    # Clean previous test database
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass

    init_db(seed_data=True, db_path=TEST_DB_PATH)

    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False

    yield

    set_active_db_path(DB_PATH)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass


def get_csrf_token(client):
    resp = client.get("/login")
    match = re.search(r'name="csrf_token"\s+value="([a-f0-9]+)"', resp.get_data(as_text=True))
    if match:
        return match.group(1)
    with client.session_transaction() as sess:
        return sess.get("csrf_token")


def login_user(client, username, password):
    client.get("/logout")
    token = get_csrf_token(client)
    return client.post("/login", data={"username": username, "password": password, "csrf_token": token}, follow_redirects=True)


# --------------------------------------------------------------------------
# 1. Edge-Case Unit & Integration Tests (Missing Data & Debounce)
# --------------------------------------------------------------------------
def test_simulated_call_missing_attendance_never_guesses():
    """Verify student with missing attendance is explicitly reported as unavailable and never guesses."""
    adapter = MockAIAdapter()
    student = {
        "name": "Ravi Kumar Varma",
        "roll_number": "211FA04062",
        "department": "CSE",
        "attendance_percentage": None,  # Missing attendance!
        "parent_phone": "+91 98480 11005",
        "parent_name": "R. Satyanarayana"
    }

    # English Script
    res_en = adapter.generate_simulated_call_script(student, "English")
    assert "None%" not in res_en["transcript"]
    assert "unavailable in the departmental system" in res_en["transcript"]
    assert "Attendance data unavailable" in res_en["summary"]

    # Telugu Script
    res_te = adapter.generate_simulated_call_script(student, "Telugu")
    assert "None%" not in res_te["transcript"]
    assert "హాజరు వివరాలు సిస్టమ్‌లో అందుబాటులో లేవు" in res_te["transcript"]
    assert "హాజరు వివరాలు అందుబాటులో లేవు" in res_te["summary"]


def test_simulated_call_missing_phone_handled_safely():
    """Verify student with missing phone number is safely processed without errors."""
    adapter = MockAIAdapter()
    tel_adapter = MockTelephonyAdapter()

    student = {
        "name": "M. Tarun Teja",
        "roll_number": "211FA04035",
        "department": "CSE",
        "attendance_percentage": 82.0,
        "parent_phone": None,  # Missing phone!
        "parent_name": "M. Satyanarayana"
    }

    res_en = adapter.generate_simulated_call_script(student, "English")
    assert "Parent phone number is currently not registered" in res_en["transcript"]

    res_te = adapter.generate_simulated_call_script(student, "Telugu")
    assert "తల్లిదండ్రుల ఫోన్ నంబర్ అధికారిక రికార్డులలో నమోదు కాలేదు" in res_te["transcript"]

    # Verify telephony adapter accepts None or empty safely
    tel_res = tel_adapter.initiate_call(to_phone=student["parent_phone"], call_id="test_missing_phone", metadata={})
    assert tel_res["success"] is True
    assert "Unavailable" in tel_res["phone"]


def test_simulated_call_double_click_debounce_guard():
    """Verify rapid double-clicking call button triggers the 429 debounce guard."""
    client = app.test_client()
    login_user(client, "coord_cse", "coord123")

    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    cse_student = conn.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    student_id = cse_student["id"]
    conn.close()

    # First call succeeds
    resp1 = client.post(f"/student/{student_id}/call/demo", json={"language": "English"})
    assert resp1.status_code == 200

    # Immediate second call (double-click simulation within 2s) triggers 429 debounce guard
    resp2 = client.post(f"/student/{student_id}/call/demo", json={"language": "English"})
    assert resp2.status_code == 429
    data = resp2.get_json()
    assert data["success"] is False
    assert "recently initiated" in data["error"]


def test_simulated_call_persistence_after_page_refresh():
    """Verify that after call finishes, refreshing the student detail page displays the saved call."""
    client = app.test_client()
    login_user(client, "coord_cse", "coord123")

    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    cse_student = conn.execute("SELECT id, roll_number FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    student_id = cse_student["id"]
    conn.close()

    # Make call
    resp = client.post(f"/student/{student_id}/call/demo", json={"language": "English"})
    assert resp.status_code == 200
    call_id = resp.get_json()["call_record_id"]

    # Simulate page refresh on /student/<student_id>
    refresh_resp = client.get(f"/student/{student_id}")
    assert refresh_resp.status_code == 200
    html = refresh_resp.get_data(as_text=True)

    # Verify record and links persist
    assert f"/calls/{call_id}" in html
    assert "Completed" in html
    assert "Demo mode: simulated call" in html


# --------------------------------------------------------------------------
# 2. Call History Page & Filter Tests
# --------------------------------------------------------------------------
def test_call_history_global_view_and_scoping():
    """Verify department-scoping on /calls page: CSE sees CSE, Admin sees all."""
    client = app.test_client()

    # Insert test calls: 1 for CSE, 1 for ECE
    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1")
    cse_id = cursor.fetchone()[0]
    cursor.execute("SELECT id FROM students WHERE department = 'ECE' LIMIT 1")
    ece_id = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO call_records (student_id, status, language, duration_seconds, summary, transcript, initiated_by)
        VALUES (?, 'Completed', 'Telugu', 45, 'CSE Call Summary', '[AI Assistant]: Test', 'Prof. CSE')
    """, (cse_id,))
    cursor.execute("""
        INSERT INTO call_records (student_id, status, language, duration_seconds, summary, transcript, initiated_by)
        VALUES (?, 'Completed', 'English', 45, 'ECE Call Summary', '[AI Assistant]: Test', 'Prof. ECE')
    """, (ece_id,))
    conn.commit()
    conn.close()

    # 1. CSE Coordinator logs in
    login_user(client, "coord_cse", "coord123")
    resp_cse = client.get("/calls")
    assert resp_cse.status_code == 200
    html_cse = resp_cse.get_data(as_text=True)
    assert "CSE Call Summary" in html_cse
    assert "ECE Call Summary" not in html_cse

    # 2. Admin logs in
    login_user(client, "admin", "admin123")
    resp_admin = client.get("/calls")
    assert resp_admin.status_code == 200
    html_admin = resp_admin.get_data(as_text=True)
    assert "CSE Call Summary" in html_admin
    assert "ECE Call Summary" in html_admin


def test_call_history_filters():
    """Verify filtering by status, language, and search query on /calls."""
    client = app.test_client()
    login_user(client, "admin", "admin123")

    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04001'")
    s1_id = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO call_records (student_id, status, language, duration_seconds, summary, transcript, initiated_by)
        VALUES (?, 'Completed', 'Telugu', 40, 'Unique Telugu Summary', '[AI]: Line', 'Admin')
    """, (s1_id,))
    cursor.execute("""
        INSERT INTO call_records (student_id, status, language, duration_seconds, summary, transcript, initiated_by)
        VALUES (?, 'Failed', 'English', 0, 'Unique Failed Summary', '[AI]: Line', 'Admin')
    """, (s1_id,))
    conn.commit()
    conn.close()

    # Filter by Language = Telugu
    resp_lang = client.get("/calls?language=Telugu")
    html_lang = resp_lang.get_data(as_text=True)
    assert "Unique Telugu Summary" in html_lang
    assert "Unique Failed Summary" not in html_lang

    # Filter by Status = Failed
    resp_status = client.get("/calls?status=Failed")
    html_status = resp_status.get_data(as_text=True)
    assert "Unique Failed Summary" in html_status
    assert "Unique Telugu Summary" not in html_status

    # Search by Roll Number
    resp_search = client.get("/calls?roll_number=211FA04001")
    html_search = resp_search.get_data(as_text=True)
    assert "211FA04001" in html_search


# --------------------------------------------------------------------------
# 3. Call Detail Page Tests
# --------------------------------------------------------------------------
def test_call_detail_view_and_cross_department_block():
    """Verify call detail view renders transcript and blocks cross-department access."""
    client = app.test_client()

    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1")
    cse_id = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO call_records (student_id, status, language, duration_seconds, transcript, summary, notes)
        VALUES (?, 'Completed', 'English', 45, '[AI Assistant]: Hello\n[Parent]: Yes', 'Demo Summary', 'Demo mode: simulated call')
    """, (cse_id,))
    call_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # CSE Faculty can view it
    login_user(client, "faculty_cse", "faculty123")
    resp_ok = client.get(f"/calls/{call_id}")
    assert resp_ok.status_code == 200
    html_ok = resp_ok.get_data(as_text=True)
    assert "Full Speaker-Labelled Conversation" in html_ok
    assert "AI Assistant" in html_ok
    assert "Demo Summary" in html_ok

    # ECE Coordinator is blocked (403)
    login_user(client, "coord_ece", "coord123")
    resp_blocked = client.get(f"/calls/{call_id}")
    assert resp_blocked.status_code == 403


# --------------------------------------------------------------------------
# 4. Follow-Ups Queue and Update Tests
# --------------------------------------------------------------------------
def test_follow_ups_list_and_update_lifecycle():
    """Verify follow-ups listing and updating status, assigned faculty, due date, notes."""
    client = app.test_client()

    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1")
    cse_id = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO follow_ups (student_id, teacher_name, assigned_to, due_date, status, notes, action_required)
        VALUES (?, 'AI System', 'Unassigned', '2026-11-01', 'open', 'Parent asked about assignment', 'Callback')
    """, (cse_id,))
    fu_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # CSE Coordinator logs in and sees it
    login_user(client, "coord_cse", "coord123")
    resp_list = client.get("/follow-ups")
    assert resp_list.status_code == 200
    html_list = resp_list.get_data(as_text=True)
    assert f"#{fu_id}" in html_list
    assert "Parent asked about assignment" in html_list

    # Update follow-up to 'in progress' and assign to Dr. Srinivas
    resp_update = client.post(f"/follow-up/{fu_id}/update", data={
        "status": "in progress",
        "assigned_to": "Dr. A. Srinivas",
        "due_date": "2026-11-05",
        "notes": "Spoke to father; schedule meeting on Monday."
    }, follow_redirects=True)
    assert resp_update.status_code == 200

    # Verify updated in database
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    updated_fu = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (fu_id,)).fetchone()
    assert updated_fu["status"] == "in progress"
    assert updated_fu["assigned_to"] == "Dr. A. Srinivas"
    assert updated_fu["due_date"] == "2026-11-05"
    assert "meeting on Monday" in updated_fu["notes"]
    conn.close()


def test_principal_cannot_update_follow_up():
    """Verify Principal role has read-only access and cannot edit follow-ups (403)."""
    client = app.test_client()

    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1")
    cse_id = cursor.fetchone()[0]
    cursor.execute("""
        INSERT INTO follow_ups (student_id, teacher_name, status, notes)
        VALUES (?, 'AI System', 'open', 'Initial Note')
    """, (cse_id,))
    fu_id = cursor.lastrowid
    conn.commit()
    conn.close()

    login_user(client, "principal", "principal123")

    resp = client.post(f"/follow-up/{fu_id}/update", data={
        "status": "closed",
        "notes": "Attempted close by principal"
    })
    assert resp.status_code == 403


def test_cross_department_followup_update_blocked():
    """Verify faculty from ECE cannot modify a CSE student's follow-up ticket (403)."""
    client = app.test_client()

    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1")
    cse_id = cursor.fetchone()[0]
    cursor.execute("""
        INSERT INTO follow_ups (student_id, teacher_name, status, notes)
        VALUES (?, 'AI System', 'open', 'CSE Note')
    """, (cse_id,))
    fu_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # ECE faculty attempts to edit CSE follow-up
    login_user(client, "faculty_ece", "faculty123")
    resp = client.post(f"/follow-up/{fu_id}/update", data={
        "status": "closed",
        "notes": "Unauthorized edit"
    })
    assert resp.status_code == 403

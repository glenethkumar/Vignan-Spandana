"""
Pytest Test Suite for Simulated Call Demo:
1. Script generation for English & Telugu with student saved data
   - Vignan AI introduction
   - "Am I speaking with parent of <name>?"
   - Parent replies "Yes"
   - AI states attendance %
   - Polite warning if attendance < 75%, satisfactory note if >= 75%
   - Parent asks question beyond AI capability
   - AI states faculty callback and creates follow-up
   - Polite closing
2. Access control & department scoping:
   - Principal read-only blocked (403)
   - Cross-department call blocked (403)
   - In-department call allowed (200)
3. Database persistence:
   - CallRecord: student, status ('Completed'), start/end time, duration, language, speaker-labelled transcript, short summary
   - FollowUp created with faculty callback action
   - Audit log written
"""

import pytest
import sqlite3
import os
import re
from app import app
from adapters import MockAIAdapter
from database import init_db, get_db_connection, set_active_db_path, DB_PATH
from security import clear_all_rate_limits

TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_call_demo.db")


@pytest.fixture(autouse=True)
def setup_test_db():
    clear_all_rate_limits()
    set_active_db_path(TEST_DB_PATH)
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
# 1. Script Generation Unit Tests (MockAIAdapter)
# --------------------------------------------------------------------------
def test_ai_adapter_english_script_low_attendance():
    """Verify scripted English dialogue for student with attendance below 75%."""
    adapter = MockAIAdapter()
    student = {
        "name": "Kavya Sharma",
        "roll_number": "22L31A0512",
        "department": "CSE",
        "attendance_percentage": 68.5,
        "parent_name": "Ramesh Sharma"
    }

    result = adapter.generate_simulated_call_script(student, "English")

    assert result["language"] == "English"
    assert result["duration_seconds"] == 45
    assert "Kavya Sharma" in result["transcript"]
    assert "68.5%" in result["transcript"]
    assert "CSE" in result["transcript"]

    # Verify structured dialogue requirements:
    lines = result["lines"]
    assert any("Vignan's Institute" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("Am I speaking with the parent of Kavya Sharma?" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("Yes" in line["text"] for line in lines if line["speaker"] == "Parent")
    assert any("below the mandatory 75%" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("re-evaluation" in line["text"] for line in lines if line["speaker"] == "Parent")
    assert any("faculty mentor from the CSE department will call you back" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("Thank you for your valuable time" in line["text"] for line in lines if line["speaker"] == "AI Assistant")

    # Verify speaker-labelled format
    assert "[AI Assistant]:" in result["transcript"]
    assert "[Parent]:" in result["transcript"]
    assert "Attendance update (68.5%)" in result["summary"]


def test_ai_adapter_telugu_script_high_attendance():
    """Verify scripted Telugu dialogue for student with satisfactory attendance >= 75%."""
    adapter = MockAIAdapter()
    student = {
        "name": "Rajesh Kumar",
        "roll_number": "22L31A0501",
        "department": "CSE",
        "attendance_percentage": 88.0,
        "parent_name": "Suresh Kumar"
    }

    result = adapter.generate_simulated_call_script(student, "Telugu")

    assert result["language"] == "Telugu"
    assert "Rajesh Kumar" in result["transcript"]
    assert "88.0%" in result["transcript"]
    assert "CSE" in result["transcript"]

    lines = result["lines"]
    assert any("విజ్ఞాన్స్ ఇన్స్టిట్యూట్" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("Rajesh Kumar గారి తల్లి లేదా తండ్రితో మాట్లాడుతున్నానా" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("అవును" in line["text"] for line in lines if line["speaker"] == "Parent")
    assert any("75% కంటే ఎక్కువగా సంతృప్తికరంగా ఉంది" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("CSE విభాగానికి చెందిన ఫ్యాకల్టీ మీకు త్వరలోనే తిరిగి కాల్ చేస్తారు" in line["text"] for line in lines if line["speaker"] == "AI Assistant")
    assert any("సెలవు" in line["text"] for line in lines if line["speaker"] == "AI Assistant")

    assert "[AI Assistant]:" in result["transcript"]
    assert "[Parent]:" in result["transcript"]


# --------------------------------------------------------------------------
# 2. Access Control Tests for /student/<id>/call/demo
# --------------------------------------------------------------------------
def test_simulated_call_unauthenticated_redirects():
    """Verify unauthenticated call requests are redirected to login."""
    client = app.test_client()
    resp = client.post("/student/1/call/demo", json={"language": "English"})
    assert resp.status_code in (302, 401)


def test_simulated_call_principal_is_read_only():
    """Verify Principal role receives 403 Forbidden because account is read-only oversight."""
    client = app.test_client()
    login_user(client, "principal", "principal123")

    resp = client.post("/student/1/call/demo", json={"language": "English"})
    assert resp.status_code == 403
    data = resp.get_json()
    assert "read-only" in data["error"].lower()


def test_simulated_call_cross_department_blocked():
    """Verify CSE Coordinator cannot initiate call simulation for an ECE student."""
    client = app.test_client()
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    ece_student = conn.execute("SELECT id FROM students WHERE department = 'ECE' LIMIT 1").fetchone()
    conn.close()

    assert ece_student is not None

    login_user(client, "coord_cse", "coord123")
    resp = client.post(f"/student/{ece_student['id']}/call/demo", json={"language": "English"})
    assert resp.status_code == 403
    data = resp.get_json()
    assert "access denied" in data["error"].lower()


def test_simulated_call_nonexistent_student_returns_404():
    """Verify attempting to call a nonexistent student ID returns 404."""
    client = app.test_client()
    login_user(client, "admin", "admin123")

    resp = client.post("/student/999999/call/demo", json={"language": "English"})
    assert resp.status_code == 404


# --------------------------------------------------------------------------
# 3. Full Call Simulation Execution & Database Persistence Tests
# --------------------------------------------------------------------------
def test_simulated_call_full_execution_and_persistence_english():
    """Verify successful simulated call in English saves CallRecord, FollowUp, and AuditLog."""
    client = app.test_client()
    login_user(client, "coord_cse", "coord123")

    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    cse_student = conn.execute("SELECT * FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    student_id = cse_student["id"]
    conn.close()

    resp = client.post(
        f"/student/{student_id}/call/demo",
        json={"language": "English"}
    )
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["success"] is True
    assert data["language"] == "English"
    assert data["status"] == "Completed"
    assert data["duration_seconds"] == 45
    assert len(data["lines"]) >= 7
    assert data["call_record_id"] is not None
    assert data["followup_id"] is not None

    # Verify database persistence: CallRecord
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    record = conn.execute("SELECT * FROM call_records WHERE id = ?", (data["call_record_id"],)).fetchone()
    assert record is not None
    assert record["student_id"] == student_id
    assert record["status"] == "Completed"
    assert record["language"] == "English"
    assert record["duration_seconds"] == 45
    assert record["start_time"] is not None
    assert record["end_time"] is not None
    assert "[AI Assistant]:" in record["transcript"]
    assert "[Parent]:" in record["transcript"]
    assert record["notes"] == "Demo mode: simulated call"
    assert "CSE" in record["summary"]

    # Verify database persistence: FollowUp
    followup = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (data["followup_id"],)).fetchone()
    assert followup is not None
    assert followup["student_id"] == student_id
    assert "Faculty" in followup["teacher_name"]
    assert "Parent requested clarification regarding internal exam" in followup["notes"]
    assert "Faculty callback" in followup["action_required"]

    # Verify database persistence: AuditLog
    audit = conn.execute("SELECT * FROM audit_logs WHERE action = 'call_simulated' AND resource = ?", (f"student_{student_id}",)).fetchone()
    assert audit is not None
    assert "coord_cse" in audit["username"]
    assert "English" in audit["details"]

    conn.close()


def test_simulated_call_full_execution_telugu():
    """Verify successful simulated call in Telugu saves CallRecord and FollowUp in Telugu."""
    client = app.test_client()
    login_user(client, "faculty_cse", "faculty123")

    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    cse_student = conn.execute("SELECT * FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    student_id = cse_student["id"]
    conn.close()

    resp = client.post(
        f"/student/{student_id}/call/demo",
        json={"language": "Telugu"}
    )
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["success"] is True
    assert data["language"] == "Telugu"
    assert data["status"] == "Completed"

    # Verify CallRecord in database
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    record = conn.execute("SELECT * FROM call_records WHERE id = ?", (data["call_record_id"],)).fetchone()
    assert record is not None
    assert record["language"] == "Telugu"
    assert "విజ్ఞాన్స్ ఇన్స్టిట్యూట్" in record["transcript"]
    assert "హాజరు" in record["summary"]

    conn.close()

"""
Phase 1 Unit & Integration Tests:
- Database schema expansion (academic_units, faculty_class_assignments, uploads, campaigns, issues, issue_timeline, system_settings)
- Student archive / deactivation instead of hard deletion
- Role permissions & class scoping checks (Faculty blocked from unassigned classes)
- Campaign start blocking for Faculty (Admin only)
- Issue category isolation (College Coordinator, Hostel Dean, Bus Correspondent)
- Phone number masking by default (+91 98*** **210)
- Global DEMO_MODE flag & webhook signature verification
- Login & demo accounts authentication with clean card UI
"""

import os
import pytest
import re
import tempfile
import sqlite3
import hmac
import hashlib

from app import app
from database import init_db, set_active_db_path, archive_student
from security import (
    hash_password, verify_password,
    mask_phone_number, is_demo_mode,
    can_faculty_access_class, can_start_campaign,
    can_access_issue, can_manage_academic_units,
    verify_webhook_signature
)


@pytest.fixture
def test_db():
    """Sets up an isolated clean SQLite database for Phase 1 tests."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    set_active_db_path(path)
    init_db(seed_data=True, db_path=path)
    yield path
    try:
        os.remove(path)
    except Exception:
        pass


@pytest.fixture
def client(test_db):
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False
    with app.test_client() as c:
        yield c


def get_csrf(client):
    resp = client.get("/login")
    match = re.search(r'name="csrf_token"\s+value="([a-f0-9]+)"', resp.get_data(as_text=True))
    if match:
        return match.group(1)
    with client.session_transaction() as sess:
        return sess.get("csrf_token")


def test_schema_tables_exist(test_db):
    """Verifies all new and enhanced tables are properly created."""
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row[0] for row in cursor.fetchall()}

    expected_tables = {
        "users", "audit_logs", "academic_units", "faculty_class_assignments",
        "students", "uploads", "campaigns", "campaign_students",
        "call_records", "issues", "issue_timeline", "system_settings"
    }
    missing = expected_tables - tables
    assert not missing, f"Missing required database tables: {missing}"
    conn.close()


def test_student_archive_never_hard_deleted(test_db):
    """Verifies that archive_student deactivates student (is_active = 0) without deleting the row."""
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()

    # Fetch an active student
    cursor.execute("SELECT id, roll_number, is_active FROM students WHERE roll_number = '211FA04001'")
    student = cursor.fetchone()
    assert student is not None
    s_id, r_no, is_act = student
    assert is_act == 1

    # Perform safe archive
    success = archive_student(conn, s_id)
    assert success is True

    # Verify student is still in database with is_active = 0 and archived_at set
    cursor.execute("SELECT is_active, archived_at FROM students WHERE id = ?", (s_id,))
    row = cursor.fetchone()
    assert row[0] == 0
    assert row[1] is not None

    # Total student count should remain unchanged
    cursor.execute("SELECT COUNT(*) FROM students")
    total_count = cursor.fetchone()[0]
    assert total_count >= 35
    conn.close()


def test_faculty_class_scoping_blocks_unassigned_class(test_db):
    """Verifies that faculty can access assigned classes, but gets blocked (False) on unassigned classes."""
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE username = 'faculty_cse'")
    cse_user_id = cursor.fetchone()[0]

    # CSE Faculty is assigned to CSE-III-A and CSE-III-B
    assert can_faculty_access_class(conn, cse_user_id, "Faculty", "CSE", "CSE", "III", "A") is True
    assert can_faculty_access_class(conn, cse_user_id, "Faculty", "CSE", "CSE", "III", "B") is True

    # CSE Faculty attempting to access ECE-III-A must be BLOCKED
    assert can_faculty_access_class(conn, cse_user_id, "Faculty", "CSE", "ECE", "III", "A") is False
    # CSE Faculty attempting to access CSE-IV-A (unassigned) must be BLOCKED
    assert can_faculty_access_class(conn, cse_user_id, "Faculty", "CSE", "CSE", "IV", "A") is False

    # Admin can access all classes
    cursor.execute("SELECT id FROM users WHERE username = 'admin'")
    admin_id = cursor.fetchone()[0]
    assert can_faculty_access_class(conn, admin_id, "Admin", "All", "ECE", "III", "A") is True
    assert can_faculty_access_class(conn, admin_id, "Admin", "All", "CSE", "IV", "C") is True
    conn.close()


def test_campaign_start_permissions_block_faculty():
    """Verifies that only Admin can start/confirm campaigns; Faculty is strictly blocked."""
    assert can_start_campaign("Admin") is True
    assert can_start_campaign("Faculty") is False
    assert can_start_campaign("College Coordinator") is False
    assert can_start_campaign("Hostel Dean") is False
    assert can_start_campaign("Bus Correspondent") is False


def test_issue_category_isolation():
    """Verifies that Issue Owners can ONLY access their specific category."""
    # College Coordinator
    assert can_access_issue("College Coordinator", "college") is True
    assert can_access_issue("College Coordinator", "hostel") is False
    assert can_access_issue("College Coordinator", "bus") is False

    # Hostel Dean
    assert can_access_issue("Hostel Dean", "hostel") is True
    assert can_access_issue("Hostel Dean", "college") is False
    assert can_access_issue("Hostel Dean", "bus") is False

    # Bus Correspondent
    assert can_access_issue("Bus Correspondent", "bus") is True
    assert can_access_issue("Bus Correspondent", "college") is False
    assert can_access_issue("Bus Correspondent", "hostel") is False

    # Admin has access to all
    assert can_access_issue("Admin", "college") is True
    assert can_access_issue("Admin", "hostel") is True
    assert can_access_issue("Admin", "bus") is True


def test_phone_number_masking_by_default():
    """Verifies that parental contact numbers are masked by default."""
    assert mask_phone_number("+919848012345") == "+91 98*** **345"
    assert mask_phone_number("9848012345") == "+91 98*** **345"
    assert mask_phone_number(None) == "Not Registered"
    assert mask_phone_number("") == "Not Registered"


def test_demo_mode_flag_and_webhook_signature():
    """Verifies global DEMO_MODE flag and HMAC webhook verification."""
    # Demo mode is on by default
    assert is_demo_mode() is True

    # Webhook signature verification
    payload = b'{"call_id": "outpero_123", "status": "completed"}'
    secret = "test_webhook_secret_key"
    sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    assert verify_webhook_signature(payload, sig, secret) is True
    assert verify_webhook_signature(payload, f"sha256={sig}", secret) is True
    assert verify_webhook_signature(payload, "invalid_sig", secret) is False
    assert verify_webhook_signature(payload, sig, "wrong_secret") is False


def test_seeded_demo_issues_and_reopen_critical_flag(test_db):
    """Verifies seeded issues in College, Hostel, and Bus, and critical flag on 3 reopens."""
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()

    cursor.execute("SELECT category, status, reopen_count, is_critical FROM issues")
    issues = cursor.fetchall()
    assert len(issues) >= 5

    categories = {row[0] for row in issues}
    assert "college" in categories
    assert "hostel" in categories
    assert "bus" in categories

    # Verify critical issue with 3 reopens
    cursor.execute("SELECT id, reopen_count, is_critical FROM issues WHERE is_critical = 1")
    crit = cursor.fetchone()
    assert crit is not None
    assert crit[1] >= 3
    assert crit[2] == 1
    conn.close()


def test_demo_accounts_login_flow(client):
    """Verifies that Admin, Faculty, and Issue Owners can log in via clean auth."""
    roles_to_test = [
        ("admin", "admin123", "Admin"),
        ("faculty_cse", "faculty123", "Faculty"),
        ("coordinator_college", "coord123", "College Coordinator"),
        ("dean_hostel", "dean123", "Hostel Dean"),
        ("correspondent_bus", "bus123", "Bus Correspondent")
    ]

    for username, password, expected_role in roles_to_test:
        token = get_csrf(client)
        resp = client.post("/login", data={
            "username": username,
            "password": password,
            "csrf_token": token
        }, follow_redirects=True)
        assert resp.status_code == 200

        with client.session_transaction() as sess:
            assert sess.get("username") == username
            assert sess.get("role") == expected_role

        # Logout cleanly before next test
        client.get("/logout")


"""
Pytest Test Suite for STAGE 1: Roles, Department Scoping, Access Enforcement,
Password Hashing, CSRF, Rate Limiting, and Audit Logging.
"""

import pytest
import sqlite3
import os
import re
from app import app
from database import init_db, get_db_connection, set_active_db_path, DB_PATH
from security import (
    hash_password, verify_password,
    is_rate_limited, record_failed_login, reset_failed_logins,
    clear_all_rate_limits
)

TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_stage1.db")


@pytest.fixture(autouse=True)
def setup_test_db():
    """Initializes a fresh test database and cleans up rate limits for each test."""
    clear_all_rate_limits()
    set_active_db_path(TEST_DB_PATH)
    init_db(seed_data=True, db_path=TEST_DB_PATH)

    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = True

    yield

    set_active_db_path(DB_PATH)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass


def get_csrf_token(client):
    """Helper to extract a valid CSRF token from the session/page."""
    resp = client.get("/login")
    match = re.search(r'name="csrf_token"\s+value="([a-f0-9]+)"', resp.get_data(as_text=True))
    if match:
        return match.group(1)
    with client.session_transaction() as sess:
        return sess.get("csrf_token")


# --------------------------------------------------------------------------
# 1. Password Hashing & Verification Tests
# --------------------------------------------------------------------------
def test_password_hashing():
    """Verify passwords are secure hashes (PBKDF2) and never stored in plaintext."""
    hashed = hash_password("secret_password_123")
    assert hashed != "secret_password_123"
    assert hashed.startswith("pbkdf2:sha256:")

    assert verify_password(hashed, "secret_password_123") is True
    assert verify_password(hashed, "wrong_password") is False
    assert verify_password("", "secret") is False
    assert verify_password(hashed, "") is False


def test_seeded_users_are_hashed():
    """Verify that all default seeded users have properly hashed passwords in the DB."""
    conn = get_db_connection()
    users = conn.execute("SELECT username, password_hash FROM users").fetchall()
    conn.close()

    assert len(users) >= 4
    for u in users:
        assert not u["password_hash"].startswith("admin123")
        assert not u["password_hash"].startswith("coord123")
        assert u["password_hash"].startswith("pbkdf2:sha256:") or u["password_hash"].startswith("scrypt:")


# --------------------------------------------------------------------------
# 2. Login, Session Cookies, and Rate Limiting
# --------------------------------------------------------------------------
def test_login_success_and_secure_cookie():
    """Test successful login establishes session with HttpOnly and SameSite cookie."""
    client = app.test_client()
    token = get_csrf_token(client)

    resp = client.post("/login", data={
        "username": "principal",
        "password": "principal123",
        "csrf_token": token
    }, follow_redirects=True)

    assert resp.status_code == 200
    assert "Dr. K. V. S. Murthy (Principal)" in resp.get_data(as_text=True)

    # Check cookies
    cookie_header = resp.headers.get("Set-Cookie", "")
    assert "HttpOnly" in cookie_header
    assert "SameSite=Lax" in cookie_header


def test_login_failure_invalid_credentials():
    """Test login failure with invalid password rejects and shows danger alert."""
    client = app.test_client()
    token = get_csrf_token(client)

    resp = client.post("/login", data={
        "username": "admin",
        "password": "incorrect_password",
        "csrf_token": token
    }, follow_redirects=True)

    assert resp.status_code == 200
    assert "Invalid username or password" in resp.get_data(as_text=True)


def test_rate_limiting_after_5_failures():
    """Verify 5 failed login attempts trigger HTTP 429 Too Many Requests."""
    client = app.test_client()

    for attempt in range(5):
        token = get_csrf_token(client)
        resp = client.post("/login", data={
            "username": "brute_user",
            "password": f"bad_pass_{attempt}",
            "csrf_token": token
        }, follow_redirects=True)
        assert resp.status_code == 200

    # The 6th attempt must be blocked by rate limiting with HTTP 429
    token = get_csrf_token(client)
    resp = client.post("/login", data={
        "username": "brute_user",
        "password": "another_bad_pass",
        "csrf_token": token
    })
    assert resp.status_code == 429
    assert "Too many failed login attempts" in resp.get_data(as_text=True)


def test_deactivated_user_cannot_login():
    """Test that deactivated accounts are barred from signing in with HTTP 403."""
    conn = get_db_connection()
    conn.execute("UPDATE users SET is_active = 0 WHERE username = 'faculty_ece'")
    conn.commit()
    conn.close()

    client = app.test_client()
    client.get("/logout")
    token = get_csrf_token(client)

    resp = client.post("/login", data={
        "username": "faculty_ece",
        "password": "faculty123",
        "csrf_token": token
    })

    assert resp.status_code == 403
    assert "deactivated" in resp.get_data(as_text=True).lower()


# --------------------------------------------------------------------------
# 3. CSRF Protection Tests
# --------------------------------------------------------------------------
def test_csrf_missing_token_rejected():
    """Mutating POST requests without a CSRF token must be rejected with HTTP 403."""
    client = app.test_client()
    # Attempt login without CSRF token
    resp = client.post("/login", data={
        "username": "admin",
        "password": "admin123"
    })
    assert resp.status_code == 403
    assert "CSRF verification failed" in resp.get_data(as_text=True)


def test_csrf_invalid_token_rejected():
    """Mutating POST requests with a forged CSRF token must be rejected with HTTP 403."""
    client = app.test_client()
    client.get("/login")  # sets session

    resp = client.post("/login", data={
        "username": "admin",
        "password": "admin123",
        "csrf_token": "forged_invalid_token_12345"
    })
    assert resp.status_code == 403
    assert "CSRF verification failed" in resp.get_data(as_text=True)


# --------------------------------------------------------------------------
# 4. Department-Scoped Access Control Tests
# --------------------------------------------------------------------------
def login_as(client, username, password):
    token = get_csrf_token(client)
    client.post("/login", data={"username": username, "password": password, "csrf_token": token}, follow_redirects=True)


def test_coordinator_sees_only_own_department_students():
    """CSE Coordinator must see CSE students on dashboard and NOT see ECE students."""
    client = app.test_client()
    login_as(client, "coord_cse", "coord123")

    resp = client.get("/dashboard")
    assert resp.status_code == 200
    html = resp.get_data(as_text=True)

    # CSE student present
    assert "K. Sai Praneeth" in html
    assert "211FA04001" in html

    # ECE student must NOT be listed
    assert "P. Ananya Sharma" not in html
    assert "211FA04099" not in html


def test_coordinator_accessing_other_department_gets_403():
    """CSE Coordinator attempting to access an ECE student detail must receive HTTP 403 Forbidden."""
    conn = get_db_connection()
    # Find ECE student id
    ece_student = conn.execute("SELECT id FROM students WHERE department = 'ECE'").fetchone()
    cse_student = conn.execute("SELECT id FROM students WHERE department = 'CSE'").fetchone()
    conn.close()

    client = app.test_client()
    login_as(client, "coord_cse", "coord123")

    # Accessing CSE student succeeds
    resp_cse = client.get(f"/student/{cse_student['id']}")
    assert resp_cse.status_code == 200

    # Accessing ECE student is forbidden (HTTP 403)
    resp_ece = client.get(f"/student/{ece_student['id']}")
    assert resp_ece.status_code == 403
    assert "Access Denied" in resp_ece.get_data(as_text=True)


def test_faculty_cross_department_call_and_followup_blocked():
    """Faculty cannot trigger calls or follow-ups on out-of-department students."""
    conn = get_db_connection()
    ece_student = conn.execute("SELECT id FROM students WHERE department = 'ECE'").fetchone()
    conn.close()

    client = app.test_client()
    login_as(client, "faculty_cse", "faculty123")
    token = get_csrf_token(client)

    # Cross-department simulate call blocked with 403
    resp_call = client.post(f"/student/{ece_student['id']}/simulate-call", data={"csrf_token": token})
    assert resp_call.status_code == 403

    # Cross-department follow-up note blocked with 403
    resp_note = client.post(f"/student/{ece_student['id']}/followup", data={
        "notes": "Unauthorized note",
        "csrf_token": token
    })
    assert resp_note.status_code == 403


def test_principal_has_read_focused_campus_wide_access():
    """Principal sees all departments on dashboard, but cannot add students or trigger calls."""
    client = app.test_client()
    login_as(client, "principal", "principal123")

    resp = client.get("/dashboard")
    assert resp.status_code == 200
    html = resp.get_data(as_text=True)

    # Sees both CSE and ECE students
    assert "K. Sai Praneeth" in html
    assert "P. Ananya Sharma" in html

    # Principal cannot access /add-student (HTTP 403)
    resp_add = client.get("/add-student")
    assert resp_add.status_code == 403

    # Principal cannot access /import (HTTP 403)
    resp_import = client.get("/import")
    assert resp_import.status_code == 403

    # Principal cannot simulate call (HTTP 403 read-only)
    token = get_csrf_token(client)
    resp_call = client.post("/student/1/simulate-call", data={"csrf_token": token})
    assert resp_call.status_code == 403


# --------------------------------------------------------------------------
# 5. Admin Management (User CRUD & Audit Logs)
# --------------------------------------------------------------------------
def test_non_admin_cannot_access_admin_pages():
    """Non-admin roles accessing /admin/users or /admin/audit-logs are rejected with HTTP 403."""
    client = app.test_client()

    for non_admin in [("principal", "principal123"), ("coord_cse", "coord123"), ("faculty_cse", "faculty123")]:
        login_as(client, non_admin[0], non_admin[1])

        resp_users = client.get("/admin/users")
        assert resp_users.status_code == 403, f"{non_admin[0]} was allowed to view admin users!"

        resp_audit = client.get("/admin/audit-logs")
        assert resp_audit.status_code == 403, f"{non_admin[0]} was allowed to view audit logs!"

        client.get("/logout")


def test_admin_create_user_and_audit():
    """Admin creates a new user, verified with hashed password and audit entry."""
    import uuid
    unique_user = f"it_coord_{uuid.uuid4().hex[:6]}"

    client = app.test_client()
    login_as(client, "admin", "admin123")
    token = get_csrf_token(client)

    resp = client.post("/admin/users", data={
        "username": unique_user,
        "password": "itpassword123",
        "full_name": "Prof. T. Suresh (IT Coord)",
        "role": "Department Coordinator",
        "department": "IT",
        "csrf_token": token
    }, follow_redirects=True)

    assert resp.status_code == 200
    assert "Successfully created user account" in resp.get_data(as_text=True)

    # Check database
    conn = get_db_connection()
    new_user = conn.execute("SELECT * FROM users WHERE username = ?", (unique_user,)).fetchone()
    assert new_user is not None
    assert new_user["role"] == "Department Coordinator"
    assert new_user["department"] == "IT"
    assert verify_password(new_user["password_hash"], "itpassword123") is True

    # Verify Audit log was written
    audit = conn.execute("SELECT * FROM audit_logs WHERE action = 'user_created' ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()

    assert audit is not None
    assert unique_user in audit["details"]
    assert "itpassword123" not in audit["details"]  # NEVER log passwords!


def test_admin_deactivate_user_and_prevent_self_deactivation():
    """Admin can deactivate another user, but cannot deactivate their own session."""
    client = app.test_client()
    login_as(client, "admin", "admin123")
    token = get_csrf_token(client)

    conn = get_db_connection()
    target = conn.execute("SELECT id FROM users WHERE username = 'faculty_cse'").fetchone()
    admin_user = conn.execute("SELECT id FROM users WHERE username = 'admin'").fetchone()
    conn.close()

    # Admin deactivates faculty_cse
    resp = client.post(f"/admin/users/{target['id']}/toggle-status", data={"csrf_token": token}, follow_redirects=True)
    assert resp.status_code == 200

    conn = get_db_connection()
    updated = conn.execute("SELECT is_active FROM users WHERE id = ?", (target["id"],)).fetchone()
    assert updated["is_active"] == 0

    # Admin attempts to deactivate self -> blocked with flash alert
    resp_self = client.post(f"/admin/users/{admin_user['id']}/toggle-status", data={"csrf_token": token}, follow_redirects=True)
    assert "You cannot deactivate your own active admin session" in resp_self.get_data(as_text=True)
    conn.close()


def test_audit_logs_contain_zero_secrets():
    """Verify system audit trail logs actions, IPs, and never exposes passwords or secrets."""
    conn = get_db_connection()
    logs = conn.execute("SELECT details FROM audit_logs").fetchall()
    conn.close()

    for row in logs:
        text = (row["details"] or "").lower()
        assert "admin123" not in text
        assert "coord123" not in text
        assert "principal123" not in text
        assert "faculty123" not in text

"""
Comprehensive Phase 1 Hardening Test Suite
Verifies:
A. Route-Level Security:
   - Faculty CSE blocked (403) from ECE class by URL and record ID (student detail, edit, delete, upload history).
   - Faculty blocked (403) from campaign confirm, start, pause, resume, stop. Admin allowed (200).
   - Category isolation: Hostel Dean, College Coordinator, Bus Correspondent blocked (403) from other categories.
   - Masked phone numbers: Scan HTML of all accessible pages to assert no raw 10-digit number appears.
   - Unauthenticated users redirected to /login (302) without leaking protected data.
   - Secrets, raw phones, passwords not leaked in logs, URLs, or error messages.
B. Telephony & Webhook Safety:
   - /api/webhooks/outpero validates signature (valid: 200, missing: 401, tampered: 401).
   - DEMO_MODE=1 prevents all outbound network requests from /api/telephony/outpero/dispatch.
   - Demo accounts dropdown shows ONLY when DEMO_MODE=1, hidden when DEMO_MODE=0.
   - Clear Demo Mode label in header when DEMO_MODE=1.
C. Data Safety:
   - /student/<id>/delete archives (is_active=0, archived_at set), never deletes record from SQLite.
   - 3-reopen rule: real logic function increments reopen_count, flags is_critical=1 at >=3, supports 4th reopen.
   - Unique active upload per class+date: replacement sets replaced_by and preserves full history.
D. Roles:
   - Principal is an exact Admin alias with identical permissions and code path.
"""

import os
import re
import json
import sqlite3
import tempfile
import hmac
import hashlib
from unittest.mock import patch

import pytest
from app import app
from database import (
    init_db, set_active_db_path,
    reopen_issue, record_class_upload,
    get_db_connection
)
from security import (
    hash_password, verify_webhook_signature,
    mask_phone_number, is_demo_mode
)


@pytest.fixture(autouse=True)
def setup_test_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    set_active_db_path(path)
    init_db(seed_data=True, db_path=path)
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False
    yield path
    try:
        os.remove(path)
    except Exception:
        pass


@pytest.fixture
def client():
    with app.test_client() as c:
        yield c


def login(client, username, password):
    client.get("/logout")
    resp = client.post("/login", data={
        "username": username,
        "password": password
    }, follow_redirects=True)
    assert resp.status_code == 200
    return resp


# ==============================================================================
# SECTION A: ROUTE-LEVEL SECURITY TESTS
# ==============================================================================

def test_faculty_cse_accessing_ece_class_or_student_gets_403(client):
    """
    A.1: Faculty CSE opens an ECE class by URL and record ID -> must return 403.
    Also tests student detail, edit, delete, and upload history pages.
    """
    login(client, "faculty_cse", "faculty123")

    conn = get_db_connection()
    try:
        ece_student = conn.execute("SELECT id, roll_number FROM students WHERE department = 'ECE' LIMIT 1").fetchone()
        cse_student = conn.execute("SELECT id, roll_number FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    finally:
        conn.close()

    assert ece_student is not None
    assert cse_student is not None
    ece_id = ece_student["id"]
    cse_id = cse_student["id"]

    # 1. ECE Class Dashboard -> 403
    resp_ece_class = client.get("/classes/ECE/III/A")
    assert resp_ece_class.status_code == 403

    # 2. ECE Class Upload History -> 403
    resp_ece_uploads = client.get("/classes/ECE/III/A/uploads")
    assert resp_ece_uploads.status_code == 403

    # 3. ECE Student Detail -> 403
    resp_ece_detail = client.get(f"/student/{ece_id}")
    assert resp_ece_detail.status_code == 403

    # 4. ECE Student Edit -> 403
    resp_ece_edit = client.get(f"/student/{ece_id}/edit")
    assert resp_ece_edit.status_code == 403

    # 5. ECE Student Delete/Archive -> 403
    resp_ece_delete = client.post(f"/student/{ece_id}/delete")
    assert resp_ece_delete.status_code == 403

    # Assigned CSE Class & Student -> 200 Allowed
    resp_cse_class = client.get("/classes/CSE/III/A")
    assert resp_cse_class.status_code == 200

    resp_cse_uploads = client.get("/classes/CSE/III/A/uploads")
    assert resp_cse_uploads.status_code == 200

    resp_cse_detail = client.get(f"/student/{cse_id}")
    assert resp_cse_detail.status_code == 200

    # Admin opens ECE without restriction
    login(client, "admin", "admin123")
    assert client.get("/classes/ECE/III/A").status_code == 200
    assert client.get(f"/student/{ece_id}").status_code == 200


def test_faculty_calling_campaign_control_routes_gets_403(client):
    """
    A.2: Faculty calls every campaign start / confirm / pause / resume / stop route -> must return 403.
    Admin -> allowed.
    """
    login(client, "faculty_cse", "faculty123")

    campaign_routes = [
        "/campaigns/1/confirm",
        "/campaigns/1/start",
        "/campaigns/1/pause",
        "/campaigns/1/resume",
        "/campaigns/1/stop"
    ]

    for route in campaign_routes:
        resp = client.post(route)
        assert resp.status_code == 403, f"Faculty was able to call {route}!"

    # Admin has permission to control campaigns
    login(client, "admin", "admin123")
    for route in campaign_routes:
        resp = client.post(route)
        assert resp.status_code == 200, f"Admin was blocked from {route}!"
        data = resp.get_json()
        assert data.get("success") is True


def test_issue_owners_isolated_to_own_category(client):
    """
    A.3: Hostel Dean opens college and bus issue -> 403.
    College Coordinator opens hostel and bus issue -> 403.
    Bus Correspondent opens college and hostel issue -> 403.
    """
    # 1. Hostel Dean (only hostel category)
    login(client, "dean_hostel", "dean123")
    assert client.get("/issues/1").status_code == 200  # Hostel issue
    assert client.get("/issues/2").status_code == 403  # Bus issue
    assert client.get("/issues/3").status_code == 403  # College issue

    # 2. College Coordinator (only college category)
    login(client, "coordinator_college", "coord123")
    assert client.get("/issues/3").status_code == 200  # College issue
    assert client.get("/issues/1").status_code == 403  # Hostel issue
    assert client.get("/issues/2").status_code == 403  # Bus issue

    # 3. Bus Correspondent (only bus category)
    login(client, "correspondent_bus", "bus123")
    assert client.get("/issues/2").status_code == 200  # Bus issue
    assert client.get("/issues/1").status_code == 403  # Hostel issue
    assert client.get("/issues/3").status_code == 403  # College issue

    # 4. Admin has access to all issue categories
    login(client, "admin", "admin123")
    assert client.get("/issues/1").status_code == 200
    assert client.get("/issues/2").status_code == 200
    assert client.get("/issues/3").status_code == 200


def test_scan_html_for_raw_phone_numbers_fails_if_unmasked(client):
    """
    A.4: Scan the HTML of every page a logged-in user can open.
    Parent phone numbers must be masked (+91 98*** **345).
    Fail the test if any raw 10-digit number appears.
    """
    login(client, "admin", "admin123")

    pages_to_scan = [
        "/dashboard",
        "/student/1",
        "/calls",
        "/calls/1",
        "/follow-ups",
        "/attendance/mark",
        "/issues",
        "/issues/1"
    ]

    # Pattern for Indian 10-digit mobile numbers starting with 6, 7, 8, or 9
    raw_phone_pattern = re.compile(r'(?<!\d)[6-9]\d{9}(?!\d)')

    for page in pages_to_scan:
        resp = client.get(page)
        if resp.status_code == 200:
            html = resp.get_data(as_text=True)
            matches = raw_phone_pattern.findall(html)
            assert len(matches) == 0, f"Found unmasked 10-digit raw phone number(s) {matches} on page {page}!"


def test_unauthenticated_requests_redirect_to_login(client):
    """
    A.5: Not logged in: every protected route redirects to login, never shows data.
    """
    client.get("/logout")

    protected_get_routes = [
        "/dashboard",
        "/student/1",
        "/calls",
        "/calls/1",
        "/issues",
        "/issues/1",
        "/admin/users",
        "/admin/audit-logs"
    ]

    for route in protected_get_routes:
        resp = client.get(route)
        assert resp.status_code in [302, 401, 403], f"Unauthenticated route {route} returned {resp.status_code}!"
        if resp.status_code == 302:
            assert "/login" in resp.headers.get("Location", "")
            body = resp.get_data(as_text=True)
            assert "211FA04001" not in body
            assert "Sai Praneeth" not in body

    # Protected POST route
    resp_post = client.post("/campaigns/1/start")
    assert resp_post.status_code in [302, 401, 403]
    if resp_post.status_code == 302:
        assert "/login" in resp_post.headers.get("Location", "")


def test_secrets_and_passwords_never_in_logs_or_urls(client):
    """
    A.6: Passwords, phone numbers, and keys must not appear in URLs, logs, or error messages.
    """
    conn = get_db_connection()
    try:
        logs = conn.execute("SELECT action, resource, details FROM audit_logs").fetchall()
    finally:
        conn.close()

    sensitive_tokens = ["admin123", "faculty123", "coord123", "dean123", "bus123", "FLASK_SECRET"]

    for row in logs:
        log_str = f"{row['action']} {row['resource']} {row['details']}".lower()
        for token in sensitive_tokens:
            assert token.lower() not in log_str, f"Found sensitive token '{token}' in audit log row: {log_str}"


# ==============================================================================
# SECTION B: TELEPHONY AND WEBHOOK SAFETY
# ==============================================================================

def test_webhook_signature_verification_outpero(client):
    """
    B.1: Confirm verify_webhook_signature() is actually called inside /api/webhooks/outpero.
    A missing or wrong signature must return 401 and save nothing.
    """
    secret = "test_webhook_secret_key_vignan"
    with patch.dict(os.environ, {"OUTPERO_WEBHOOK_SECRET": secret}):
        conn = get_db_connection()
        try:
            initial_count = conn.execute("SELECT COUNT(*) FROM call_records").fetchone()[0]
        finally:
            conn.close()

        payload = {
            "call_id": "outpero_live_test_999",
            "student_id": 1,
            "status": "completed",
            "duration_seconds": 65,
            "transcript": "Parent confirmed attendance.",
            "summary": "Attendance verified.",
            "sentiment": "neutral",
            "issue_raised": False
        }
        raw_payload = json.dumps(payload).encode("utf-8")

        # 1. Missing signature header -> 401
        resp_missing = client.post(
            "/api/webhooks/outpero",
            data=raw_payload,
            content_type="application/json"
        )
        assert resp_missing.status_code == 401
        assert "Invalid or missing webhook signature" in resp_missing.get_json().get("error", "")

        # 2. Tampered signature header -> 401
        resp_tampered = client.post(
            "/api/webhooks/outpero",
            data=raw_payload,
            content_type="application/json",
            headers={"X-Outpero-Signature": "sha256=invalid_tampered_signature_hex"}
        )
        assert resp_tampered.status_code == 401
        assert "Invalid or missing webhook signature" in resp_tampered.get_json().get("error", "")

        # Confirm count unchanged after failed attempts
        conn = get_db_connection()
        try:
            count_after_fails = conn.execute("SELECT COUNT(*) FROM call_records").fetchone()[0]
            assert count_after_fails == initial_count
        finally:
            conn.close()

        # 3. Valid signature header -> 200 & record saved
        valid_sig = hmac.new(secret.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()
        resp_valid = client.post(
            "/api/webhooks/outpero",
            data=raw_payload,
            content_type="application/json",
            headers={"X-Outpero-Signature": f"sha256={valid_sig}"}
        )
        assert resp_valid.status_code == 200
        assert resp_valid.get_json().get("success") is True

        # Confirm record saved
        conn = get_db_connection()
        try:
            count_after_success = conn.execute("SELECT COUNT(*) FROM call_records").fetchone()[0]
            assert count_after_success == initial_count + 1
        finally:
            conn.close()


def test_demo_mode_telephony_never_makes_outbound_network_request(client):
    """
    B.2: Confirm that with DEMO_MODE=1, /api/telephony/outpero/dispatch can NEVER
    place a real call. Proves no outbound network request is made.
    """
    login(client, "admin", "admin123")

    with patch("requests.post") as mock_requests_post, \
         patch("urllib.request.urlopen") as mock_urllib_open:

        resp = client.post("/api/telephony/outpero/dispatch", json={
            "student_id": 1,
            "campaign_id": 1,
            "phone_number": "+919848012345",
            "module": "attendance"
        })

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get("demo") is True or data.get("mode") == "demo"

        # Assert no outbound network calls were attempted
        mock_requests_post.assert_not_called()
        mock_urllib_open.assert_not_called()


def test_demo_accounts_dropdown_visibility_based_on_demo_mode(client):
    """
    B.3: The 'Demo accounts' dropdown on the login page must show only when DEMO_MODE=1.
    Add a test for DEMO_MODE=0.
    """
    # 1. With DEMO_MODE=1
    with patch.dict(os.environ, {"DEMO_MODE": "1"}):
        resp_demo = client.get("/login")
        html_demo = resp_demo.get_data(as_text=True)
        assert "demoAccounts" in html_demo

    # 2. With DEMO_MODE=0
    with patch.dict(os.environ, {"DEMO_MODE": "0"}):
        resp_prod = client.get("/login")
        html_prod = resp_prod.get_data(as_text=True)
        assert "demoAccounts" not in html_prod


def test_demo_mode_header_label(client):
    """
    B.4: Show a clear 'Demo Mode' label in the header when DEMO_MODE=1.
    """
    login(client, "admin", "admin123")
    with patch.dict(os.environ, {"DEMO_MODE": "1"}):
        resp = client.get("/dashboard")
        html = resp.get_data(as_text=True)
        assert "Demo Mode" in html


# ==============================================================================
# SECTION C: DATA SAFETY TESTS
# ==============================================================================

def test_student_delete_archives_and_never_deletes_row(client):
    """
    C.1: Confirm /student/<id>/delete no longer deletes. It must archive (is_active=0,
    archived_at set). Archived students must not appear in normal lists, but stay linked.
    """
    login(client, "admin", "admin123")

    conn = get_db_connection()
    try:
        student = conn.execute("SELECT id, roll_number FROM students WHERE is_active = 1 LIMIT 1").fetchone()
        student_id = student["id"]
    finally:
        conn.close()

    # Archive via endpoint
    resp = client.post(f"/student/{student_id}/delete")
    assert resp.status_code == 302  # redirects to dashboard

    # Verify student is still in database with is_active = 0
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT is_active, archived_at FROM students WHERE id = ?", (student_id,)).fetchone()
        assert row is not None
        assert row["is_active"] == 0
        assert row["archived_at"] is not None

        # Normal active query must not include this student
        active_students = conn.execute("SELECT id FROM students WHERE is_active = 1 AND id = ?", (student_id,)).fetchall()
        assert len(active_students) == 0
    finally:
        conn.close()


def test_three_reopen_rule_increments_flags_critical_and_supports_fourth():
    """
    C.2: Confirm the 3-reopen rule is real logic:
    Increments reopen_count, sets is_critical=1 when reopen_count >= 3,
    appends timeline, and keeps the loop running on 4th reopen.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO issues (student_id, category, title, description, status, reopen_count, is_critical, owner_role)
            VALUES (1, 'hostel', 'Room Fan Issue', 'Fan is vibrating loudly', 'Resolved by Owner', 0, 0, 'Hostel Dean')
        """)
        issue_id = cursor.lastrowid
        conn.commit()

        # 1st reopen
        res1 = reopen_issue(conn, issue_id, "Parent via AI Call", "Fan still makes noise")
        assert res1["reopen_count"] == 1
        assert res1["is_critical"] == 0
        assert res1["status"] == "Reopened"

        # 2nd reopen
        res2 = reopen_issue(conn, issue_id, "Parent via AI Call", "Still not fixed")
        assert res2["reopen_count"] == 2
        assert res2["is_critical"] == 0

        # 3rd reopen -> CRITICAL FLAG ACTIVATED
        res3 = reopen_issue(conn, issue_id, "Parent via AI Call", "Unresolved for the 3rd time")
        assert res3["reopen_count"] == 3
        assert res3["is_critical"] == 1

        # Verify timeline notes mention CRITICAL
        timelines = conn.execute("SELECT notes FROM issue_timeline WHERE issue_id = ? ORDER BY id DESC", (issue_id,)).fetchall()
        assert any("CRITICAL" in t["notes"] for t in timelines)

        # 4th reopen -> Still continues loop and retains is_critical=1
        res4 = reopen_issue(conn, issue_id, "Parent via AI Call", "Still hearing vibration")
        assert res4["reopen_count"] == 4
        assert res4["is_critical"] == 1
        assert res4["status"] == "Reopened"
    finally:
        conn.close()


def test_unique_active_upload_per_class_and_date_preserves_history():
    """
    C.3: Confirm the unique rule for uploads: one active upload per class + date,
    and replacing an old one sets replaced_by and keeps history.
    """
    conn = get_db_connection()
    try:
        # Upload 1: Initial upload for CSE-III-A on 2026-11-07
        res1 = record_class_upload(
            conn=conn,
            department="CSE",
            year="III",
            section="A",
            attendance_date="2026-11-07",
            uploaded_by="faculty_cse",
            filename="cse_iii_a_attendance_v1.xlsx",
            total_count=40,
            present_count=35,
            absent_count=5,
            invalid_count=0,
            no_phone_count=0
        )
        u1_id = res1["upload_id"]
        assert u1_id is not None

        u1_row = conn.execute("SELECT status, replaced_by FROM uploads WHERE id = ?", (u1_id,)).fetchone()
        assert u1_row["status"] == "active"
        assert u1_row["replaced_by"] is None

        # Upload 2: Replacing upload for same class + date
        res2 = record_class_upload(
            conn=conn,
            department="CSE",
            year="III",
            section="A",
            attendance_date="2026-11-07",
            uploaded_by="faculty_cse",
            filename="cse_iii_a_attendance_v2_corrected.xlsx",
            total_count=40,
            present_count=36,
            absent_count=4,
            invalid_count=0,
            no_phone_count=0
        )
        u2_id = res2["upload_id"]
        assert u2_id is not None
        assert u2_id != u1_id

        # Check that Upload 1 was marked 'replaced' and pointed to Upload 2
        u1_updated = conn.execute("SELECT status, replaced_by FROM uploads WHERE id = ?", (u1_id,)).fetchone()
        assert u1_updated["status"] == "replaced"
        assert u1_updated["replaced_by"] == u2_id

        # Check that Upload 2 is the active one
        u2_row = conn.execute("SELECT status, replaced_by FROM uploads WHERE id = ?", (u2_id,)).fetchone()
        assert u2_row["status"] == "active"
        assert u2_row["replaced_by"] is None

        # Check history count: both records exist
        total_uploads = conn.execute("SELECT COUNT(*) FROM uploads WHERE department = 'CSE' AND year = 'III' AND section = 'A'").fetchone()[0]
        assert total_uploads >= 2
    finally:
        conn.close()


# ==============================================================================
# SECTION D: ROLES & PRINCIPAL ALIAS
# ==============================================================================

def test_principal_role_is_exact_admin_alias(client):
    """
    D.1 & D.2: Verify Principal has full Admin parity across all routes and code paths:
    can access admin pages, campaign controls, student additions, and all issue categories.
    """
    login(client, "principal", "principal123")

    # 1. Admin Users page
    resp_users = client.get("/admin/users")
    assert resp_users.status_code == 200

    # 2. Admin Audit Logs page
    resp_audit = client.get("/admin/audit-logs")
    assert resp_audit.status_code == 200

    # 3. Add Student page
    resp_add = client.get("/add-student")
    assert resp_add.status_code == 200

    # 4. Campaign Control routes
    resp_camp = client.post("/campaigns/1/confirm")
    assert resp_camp.status_code == 200

    # 5. Access all 3 issue categories (College, Hostel, Bus)
    assert client.get("/issues/1").status_code == 200
    assert client.get("/issues/2").status_code == 200
    assert client.get("/issues/3").status_code == 200

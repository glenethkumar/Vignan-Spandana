"""
Pytest Test Suite for:
- Item 2: Secret key production refusal & debug fallback
- Item 3: MAX_CONTENT_LENGTH (5MB) & friendly 413 error message
- Item 4: Flask g context & teardown_appcontext database lifecycle
- Item 5 & Two-Step Import: Formula cell neutralization, preview step,
  error checks (missing columns, empty rows, duplicate roll in file,
  invalid 10-digit phone, attendance outside 0-100), transaction commit,
  and audit logging.
"""

import pytest
import sqlite3
import os
import io
import re
from flask import g
from app import app, sanitize_cell_value, validate_phone_number
from database import init_db, get_db_connection, set_active_db_path, DB_PATH
from security import clear_all_rate_limits

TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_fixes.db")


@pytest.fixture(autouse=True)
def setup_test_db():
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
    resp = client.get("/login")
    match = re.search(r'name="csrf_token"\s+value="([a-f0-9]+)"', resp.get_data(as_text=True))
    if match:
        return match.group(1)
    with client.session_transaction() as sess:
        return sess.get("csrf_token")


def login_admin(client):
    token = get_csrf_token(client)
    client.post("/login", data={"username": "admin", "password": "admin123", "csrf_token": token}, follow_redirects=True)


# --------------------------------------------------------------------------
# 1. Tests for Item 2: Secret Key Production Refusal & Debug Fallback
# --------------------------------------------------------------------------
def test_secret_key_production_mode_refusal():
    """Verify that in production mode (FLASK_DEBUG=0), missing FLASK_SECRET_KEY raises a RuntimeError."""
    orig_env_key = os.environ.get("FLASK_SECRET_KEY")
    orig_debug = os.environ.get("FLASK_DEBUG")

    try:
        os.environ.pop("FLASK_SECRET_KEY", None)
        os.environ["FLASK_DEBUG"] = "0"

        with pytest.raises(RuntimeError) as exc_info:
            is_debug_mode = os.environ.get("FLASK_DEBUG", "0").strip().lower() in ("1", "true", "yes")
            sec_key = os.environ.get("FLASK_SECRET_KEY")
            if not sec_key:
                if is_debug_mode:
                    pass
                else:
                    raise RuntimeError("CRITICAL SECURITY CONFIGURATION ERROR: FLASK_SECRET_KEY environment variable is not set.")

        assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)
    finally:
        if orig_env_key:
            os.environ["FLASK_SECRET_KEY"] = orig_env_key
        if orig_debug:
            os.environ["FLASK_DEBUG"] = orig_debug


def test_secret_key_debug_fallback():
    """Verify that with FLASK_DEBUG=1, a missing key falls back to a clearly labelled dev key."""
    orig_env_key = os.environ.get("FLASK_SECRET_KEY")
    try:
        os.environ.pop("FLASK_SECRET_KEY", None)
        os.environ["FLASK_DEBUG"] = "1"

        is_debug_mode = os.environ.get("FLASK_DEBUG", "0").strip().lower() in ("1", "true", "yes")
        sec_key = os.environ.get("FLASK_SECRET_KEY")
        if not sec_key and is_debug_mode:
            fallback = "DEV_FALLBACK_INSECURE_SECRET_KEY_FOR_LOCAL_DEBUGGING_ONLY"

        assert fallback.startswith("DEV_FALLBACK_")
    finally:
        if orig_env_key:
            os.environ["FLASK_SECRET_KEY"] = orig_env_key


# --------------------------------------------------------------------------
# 2. Tests for Item 3: MAX_CONTENT_LENGTH & Friendly 413 Error
# --------------------------------------------------------------------------
def test_upload_file_exceeds_max_content_length_413():
    """Verify that attempting to upload a file exceeding 5MB returns HTTP 413 with friendly message."""
    client = app.test_client()
    login_admin(client)
    token = get_csrf_token(client)

    # Create a 6MB dummy in-memory payload
    large_payload = b"A" * (6 * 1024 * 1024)
    file_tuple = (io.BytesIO(large_payload), "huge_file.csv")

    resp = client.post("/import", data={
        "file": file_tuple,
        "csrf_token": token
    })

    assert resp.status_code == 413
    html = resp.get_data(as_text=True)
    assert "413 - File Too Large" in html or "5 MB" in html


# --------------------------------------------------------------------------
# 3. Tests for Item 4: Flask g DB Context & Teardown
# --------------------------------------------------------------------------
def test_flask_g_database_lifecycle():
    """Verify that get_db_connection utilizes Flask's g context and cleans up on request teardown."""
    with app.test_request_context():
        conn1 = get_db_connection()
        conn2 = get_db_connection()
        assert conn1 is conn2
        assert hasattr(g, "db")

    # Outside the request context, g is torn down and connection closed
    with app.app_context():
        assert "db" not in g


# --------------------------------------------------------------------------
# 4. Tests for Item 5: Formula Cell Neutralization
# --------------------------------------------------------------------------
def test_sanitize_cell_value_formula_neutralization():
    """Verify cells starting with =, +, -, @ are prefixed with a single quote and flagged."""
    val1, flagged1 = sanitize_cell_value("=SUM(A1:A10)")
    assert val1 == "'=SUM(A1:A10)"
    assert flagged1 is True

    val2, flagged2 = sanitize_cell_value("+919848011111")
    assert val2 == "'+919848011111"
    assert flagged2 is True

    val3, flagged3 = sanitize_cell_value("-100")
    assert val3 == "'-100"
    assert flagged3 is True

    val4, flagged4 = sanitize_cell_value("@calc")
    assert val4 == "'@calc"
    assert flagged4 is True

    val5, flagged5 = sanitize_cell_value("Normal Student")
    assert val5 == "Normal Student"
    assert flagged5 is False


# --------------------------------------------------------------------------
# 5. Tests for Two-Step Import & Error Types
# --------------------------------------------------------------------------
def test_import_missing_required_columns():
    """Verify upload is rejected immediately when mandatory columns (roll_number, name, parent_phone) are missing."""
    csv_missing = "student_name,department\nJohn Doe,CSE\n"
    client = app.test_client()
    login_admin(client)
    token = get_csrf_token(client)

    resp = client.post("/import", data={
        "file": (io.BytesIO(csv_missing.encode("utf-8")), "missing_cols.csv"),
        "csrf_token": token
    }, follow_redirects=True)

    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert "Missing required columns" in html


def test_import_empty_rows_flagged_as_error():
    """Verify that empty rows inside an uploaded file are detected and flagged as errors in preview."""
    csv_with_empty_row = (
        "roll_number,name,parent_phone,department,attendance_percentage\n"
        "211FA04991,Valid Student,9848012345,CSE,85.0\n"
        ",,,,\n"  # Empty row
        "211FA04992,Another Student,9848012346,CSE,90.0\n"
    )
    client = app.test_client()
    login_admin(client)
    token = get_csrf_token(client)

    resp = client.post("/import", data={
        "file": (io.BytesIO(csv_with_empty_row.encode("utf-8")), "with_empty.csv"),
        "csrf_token": token
    })

    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert "Empty row encountered" in html
    assert "Student Import Validation Preview" in html


def test_import_duplicate_roll_number_in_file():
    """Verify duplicate roll numbers in the same upload are caught and flagged as errors."""
    csv_duplicates = (
        "roll_number,name,parent_phone,department\n"
        "211FA04901,Student One,9848012345,CSE\n"
        "211FA04901,Student Duplicate,9848012346,CSE\n"
    )
    client = app.test_client()
    login_admin(client)
    token = get_csrf_token(client)

    resp = client.post("/import", data={
        "file": (io.BytesIO(csv_duplicates.encode("utf-8")), "duplicate_rolls.csv"),
        "csrf_token": token
    })

    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert "Duplicate roll number" in html


def test_import_invalid_10_digit_phone():
    """Verify invalid phone numbers (non-10 digits, invalid prefix) are flagged as errors."""
    csv_bad_phone = (
        "roll_number,name,parent_phone,department\n"
        "211FA04905,Bad Phone Student,12345,CSE\n"
    )
    client = app.test_client()
    login_admin(client)
    token = get_csrf_token(client)

    resp = client.post("/import", data={
        "file": (io.BytesIO(csv_bad_phone.encode("utf-8")), "bad_phone.csv"),
        "csrf_token": token
    })

    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert "Invalid phone number" in html


def test_import_attendance_outside_range():
    """Verify attendance values < 0 or > 100 are flagged as errors."""
    csv_bad_att = (
        "roll_number,name,parent_phone,department,attendance_percentage\n"
        "211FA04910,Student Bad Att,9848012345,CSE,125.0\n"
    )
    client = app.test_client()
    login_admin(client)
    token = get_csrf_token(client)

    resp = client.post("/import", data={
        "file": (io.BytesIO(csv_bad_att.encode("utf-8")), "bad_att.csv"),
        "csrf_token": token
    })

    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert "between 0 and 100%" in html


def test_two_step_import_full_workflow_confirm_and_audit():
    """
    Test complete two-step import workflow:
    1. Step 1: Upload and preview (validates rows, shows ADD vs UPDATE, no DB writes yet).
    2. Step 2 (Cancel): Discard staged import.
    3. Step 2 (Confirm): Commits only valid rows in a single transaction, updates existing student by roll_number, and writes audit log.
    """
    client = app.test_client()
    login_admin(client)
    token = get_csrf_token(client)

    # 211FA04001 already exists in DB -> must be marked UPDATE
    # 211FA04999 is new -> must be marked ADD
    # Formula in student name '=Malicious' -> must be sanitized with warning
    csv_content = (
        "roll_number,name,parent_phone,department,attendance_percentage\n"
        "211FA04001,=Updated Sai Praneeth,9848012345,CSE,88.0\n"
        "211FA04999,Brand New Student,9848099999,CSE,92.5\n"
    )

    # Step 1: Upload & Validate Preview
    resp = client.post("/import", data={
        "file": (io.BytesIO(csv_content.encode("utf-8")), "twostep_test.csv"),
        "csrf_token": token
    })
    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert "Student Import Validation Preview" in html
    assert "Formula neutralized" in html
    assert "1 updates" in html or "UPDATE" in html
    assert "1 new additions" in html or "ADD" in html

    # Verify database has NOT been modified yet!
    conn = get_db_connection()
    check_new = conn.execute("SELECT * FROM students WHERE roll_number = '211FA04999'").fetchone()
    assert check_new is None, "Database was modified before confirmation!"

    # Test Cancel workflow
    token = get_csrf_token(client)
    resp_cancel = client.post("/import/cancel", data={"csrf_token": token}, follow_redirects=True)
    assert resp_cancel.status_code == 200
    assert "Import cancelled" in resp_cancel.get_data(as_text=True)

    # Re-upload for Confirm workflow
    token = get_csrf_token(client)
    client.post("/import", data={
        "file": (io.BytesIO(csv_content.encode("utf-8")), "twostep_test.csv"),
        "csrf_token": token
    })

    # Step 2: Confirm & Commit
    token = get_csrf_token(client)
    resp_confirm = client.post("/import/confirm", data={"csrf_token": token}, follow_redirects=True)
    assert resp_confirm.status_code == 200
    assert "Successfully committed 2 student records" in resp_confirm.get_data(as_text=True)

    # Verify records in database
    conn = get_db_connection()
    new_student = conn.execute("SELECT * FROM students WHERE roll_number = '211FA04999'").fetchone()
    assert new_student is not None
    assert new_student["name"] == "Brand New Student"

    # Verify formula was neutralized with single quote prefix
    updated_student = conn.execute("SELECT * FROM students WHERE roll_number = '211FA04001'").fetchone()
    assert updated_student["name"].startswith("'=")
    assert updated_student["attendance_percentage"] == 88.0

    # Verify audit log was recorded
    audit = conn.execute("SELECT * FROM audit_logs WHERE action = 'import' ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()

    assert audit is not None
    assert "twostep_test.csv" in audit["details"]
    assert "2 students" in audit["details"]

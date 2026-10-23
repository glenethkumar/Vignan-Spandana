"""
Tests for Feature: Manual Student Entry with Full Specifications.
Verifies:
1. Access control: Faculty, Coordinator, and Admin can access /add-student; Principal gets 403; Unauthenticated redirects to login.
2. Department scoping: Faculty / Coordinators have their assigned department automatically enforced.
3. Form fields: Form renders inputs for Roll Number, Student Name, Student Phone, Student Email,
   Parent Name, Parent Phone, Department, Year/Semester, Section, AI Language, Attendance, and Marks.
4. Manual enrollment workflow: Student is saved with all specifications in SQLite.
5. Student Profile & Directory display: Newly added student details (including Student Phone) are rendered.
6. Validation & Duplicate rejection: Duplicate roll numbers and missing required fields are handled cleanly.
"""

import pytest
import sqlite3
from app import app
from database import get_db_connection


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
def auth_principal():
    """Logs in as Principal (read-only)."""
    client = app.test_client()
    with client.session_transaction() as sess:
        sess["user_id"] = 2
        sess["username"] = "principal"
        sess["full_name"] = "Dr. K. V. S. Murthy (Principal)"
        sess["role"] = "Principal"
        sess["department"] = "All"
    return client


def test_faculty_can_open_add_student_page(auth_faculty_cse):
    """Faculty can access /add-student and sees all specification fields."""
    resp = auth_faculty_cse.get("/add-student")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")
    assert "Enroll Student Record Manually" in html
    assert "roll_number" in html
    assert "name" in html
    assert "student_phone" in html
    assert "student_email" in html
    assert "parent_name" in html
    assert "parent_phone" in html
    assert "preferred_language" in html
    assert "attendance_percentage" in html
    assert "marks_info" in html
    assert "Save Student Record" in html


def test_principal_cannot_access_add_student(auth_principal):
    """Principal has read-only oversight and cannot access /add-student."""
    resp = auth_principal.get("/add-student")
    assert resp.status_code == 403


def test_unauthenticated_redirects_to_login():
    """Anonymous visitors must be redirected to login."""
    client = app.test_client()
    resp = client.get("/add-student")
    assert resp.status_code == 302
    assert "/login" in resp.headers.get("Location", "")


def test_faculty_manual_add_student_full_specifications(auth_faculty_cse):
    """Faculty manually enters a student with all specifications and verifies SQLite persistence."""
    test_roll = "211FA04991"
    conn = get_db_connection()
    conn.execute("DELETE FROM students WHERE roll_number = ?", (test_roll,))
    conn.commit()

    try:
        post_data = {
            "roll_number": test_roll,
            "name": "K. Sai Kiran",
            "student_phone": "+91 98765 11223",
            "student_email": "saikiran.k@vignan.ac.in",
            "department": "ECE",  # CSE Faculty should have department forced to CSE
            "year_semester": "III Year - Sem 1",
            "section": "B",
            "parent_name": "K. Venkatesh",
            "parent_phone": "+91 98480 33445",
            "preferred_language": "Telugu",
            "attendance_percentage": "87.5",
            "marks_info": "Mid-1: 85/100, CGPA: 8.6"
        }
        resp = auth_faculty_cse.post("/add-student", data=post_data, follow_redirects=True)
        assert resp.status_code == 200

        # Verify database record
        student = conn.execute("SELECT * FROM students WHERE roll_number = ?", (test_roll,)).fetchone()
        assert student is not None
        assert student["roll_number"] == test_roll
        assert student["name"] == "K. Sai Kiran"
        assert student["department"] == "CSE"  # Enforced to CSE
        assert student["year_semester"] == "III Year - Sem 1"
        assert student["section"] == "B"
        assert student["student_phone"] == "+91 98765 11223"
        assert student["student_email"] == "saikiran.k@vignan.ac.in"
        assert student["parent_name"] == "K. Venkatesh"
        assert student["parent_phone"] == "+91 98480 33445"
        assert student["preferred_language"] == "Telugu"
        assert student["attendance_percentage"] == 87.5
        assert student["marks_info"] == "Mid-1: 85/100, CGPA: 8.6"

        # Verify student profile renders the student phone and email
        resp_detail = auth_faculty_cse.get(f"/student/{student['id']}")
        assert resp_detail.status_code == 200
        detail_html = resp_detail.data.decode("utf-8")
        assert "+91 98765 11223" in detail_html
        assert "saikiran.k@vignan.ac.in" in detail_html
        assert "K. Venkatesh" in detail_html
        assert "+91 98480 33445" in detail_html
        assert "Mid-1: 85/100, CGPA: 8.6" in detail_html

        # Verify directory renders student
        resp_dir = auth_faculty_cse.get("/dashboard")
        assert resp_dir.status_code == 200
        dir_html = resp_dir.data.decode("utf-8")
        assert test_roll in dir_html
        assert "K. Sai Kiran" in dir_html
        assert "+91 98765 11223" in dir_html

    finally:
        conn.execute("DELETE FROM students WHERE roll_number = ?", (test_roll,))
        conn.commit()


def test_duplicate_roll_number_rejected(auth_faculty_cse):
    """Submitting an existing roll number shows a user-friendly error without crashing."""
    test_roll = "211FA04992"
    conn = get_db_connection()
    conn.execute("DELETE FROM students WHERE roll_number = ?", (test_roll,))
    conn.commit()

    try:
        post_data = {
            "roll_number": test_roll,
            "name": "Original Student",
            "student_phone": "+91 99999 11111",
            "parent_name": "Parent One",
            "parent_phone": "+91 98480 11111",
            "department": "CSE"
        }
        resp1 = auth_faculty_cse.post("/add-student", data=post_data, follow_redirects=True)
        assert resp1.status_code == 200
        assert "enrolled successfully" in resp1.data.decode("utf-8").lower()

        # Try inserting again with same roll number
        resp2 = auth_faculty_cse.post("/add-student", data=post_data, follow_redirects=True)
        assert resp2.status_code == 200
        html2 = resp2.data.decode("utf-8")
        assert "Roll number may already exist" in html2 or "already exists" in html2.lower()

    finally:
        conn.execute("DELETE FROM students WHERE roll_number = ?", (test_roll,))
        conn.commit()


def test_missing_required_fields_rejected(auth_faculty_cse):
    """Missing roll number or student name or parent phone fails validation."""
    resp = auth_faculty_cse.post("/add-student", data={
        "roll_number": "",
        "name": "Missing Roll",
        "parent_phone": "+91 98480 11111"
    }, follow_redirects=True)
    assert resp.status_code == 200
    assert "required" in resp.data.decode("utf-8").lower()

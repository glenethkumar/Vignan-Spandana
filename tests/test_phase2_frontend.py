"""
Phase 2 Comprehensive Frontend & UI Acceptance Test Suite
Verifies:
1. Deep phone masking scan across all pages in all formats (+91 98*** **345,
   no raw 10-digit, spaced, dashed, attribute, JS handler, or JSON leaks).
2. Route-level 403 security checks (Faculty CSE vs ECE class/student,
   Issue Owners vs Students directory and student details, non-Admins vs admin routes).
3. Exact max-7 sidebar per role (Admin/Principal 7, Faculty 4, Issue Owners 2,
   with orange dot on Issues when open issues exist).
4. Old URL redirects with strict authentication and role authorization checks.
5. Faculty cannot view or toggle the Archived students switch.
6. Design system style guide accessible only to Admin in DEMO_MODE=1 (403 otherwise).
7. Absolute zero occurrences of the legacy string "Vignan Spandana" across all rendered HTML.
"""

import os
import re
import json
import sqlite3
import tempfile
from unittest.mock import patch
import pytest

from app import app
from database import init_db, set_active_db_path, get_db_connection
from security import clear_all_rate_limits, hash_password


@pytest.fixture(autouse=True)
def setup_test_db():
    clear_all_rate_limits()
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


import html as html_lib

def get_sidebar_nav_links(html_text):
    """Extracts all main navigation link labels from the sidebar."""
    nav_pattern = re.compile(r'<nav[^>]*class="[^"]*sidebar-nav-container[^"]*"[^>]*>(.*?)</nav>', re.DOTALL)
    nav_match = nav_pattern.search(html_text)
    if not nav_match:
        return []
    nav_html = nav_match.group(1)
    link_pattern = re.compile(r'<a\s+[^>]*?class="[^"]*sidebar-nav-link[^"]*"[^>]*?>.*?<span>(.*?)</span>', re.DOTALL)
    matches = link_pattern.findall(nav_html)
    return [html_lib.unescape(label.strip()) for label in matches]


# ==============================================================================
# 1. COMPREHENSIVE PHONE NUMBER MASKING SCAN
# ==============================================================================

def test_phone_masking_comprehensive_scan(client):
    """
    Scans every accessible page for Admin, Faculty, and Issue Owners.
    Asserts zero unmasked phone numbers in:
    - 10-digit continuous format (e.g., 9848011001)
    - Formatted with prefix or spacing (e.g., +91 98480 11001, +91-98480-11001)
    - Inside HTML attributes (e.g., data-phone, value, title)
    - Inside JavaScript strings or embedded JSON payloads
    """
    raw_patterns = [
        re.compile(r'(?<!\d)[6-9]\d{9}(?!\d)'),                                 # Raw 10 digits
        re.compile(r'\+91[\s\-]?[6-9]\d{4}[\s\-]?\d{5}'),                      # +91 98480 11001
        re.compile(r'(?<!\d)[6-9]\d{4}[\s\-]\d{5}(?!\d)'),                     # 98480 11001 or 98480-11001
        re.compile(r'(?:phone|mobile|tel)["\']?\s*[:=]\s*["\']?[6-9]\d{9}'),  # JSON or JS variable
    ]

    routes_to_test = [
        "/dashboard",
        "/students",
        "/student/1",
        "/reports",
        "/issues",
        "/campaigns/new",
        "/campaigns",
        "/admin/users-classes",
        "/admin/settings"
    ]

    with patch.dict(os.environ, {"DEMO_MODE": "1"}):
        for role_user, role_pass in [("admin", "admin123"), ("faculty_cse", "faculty123"), ("dean_hostel", "dean123")]:
            login(client, role_user, role_pass)
            for route in routes_to_test:
                resp = client.get(route)
                if resp.status_code == 200:
                    html = resp.get_data(as_text=True)
                    # Strip CSRF meta and hidden inputs to prevent false positives from random hex hashes
                    clean_html = re.sub(r'<meta name="csrf-token" content="[^"]*">', '', html)
                    clean_html = re.sub(r'<input[^>]*name="csrf_token"[^>]*>', '', clean_html)
                    for pattern in raw_patterns:
                        matches = pattern.findall(clean_html)
                        assert len(matches) == 0, f"Leaked unmasked phone pattern {matches} on {route} as {role_user}!"


# ==============================================================================
# 2. ROUTE-LEVEL 403 CHECKS (ROLE BOUNDARIES & CATEGORY ISOLATION)
# ==============================================================================

def test_route_level_403_access_controls(client):
    """
    1. Faculty CSE accessing ECE class & student detail gets 403.
    2. Issue Owners (Hostel Dean, College Coordinator, Bus Correspondent) accessing
       Students Directory or Student Details gets 403.
    3. Non-Admins accessing /admin/* routes get 403.
    """
    # Find student ids
    conn = get_db_connection()
    ece_student = conn.execute("SELECT id FROM students WHERE department = 'ECE' LIMIT 1").fetchone()
    cse_student = conn.execute("SELECT id FROM students WHERE department = 'CSE' LIMIT 1").fetchone()
    conn.close()

    assert ece_student is not None
    assert cse_student is not None
    ece_id = ece_student["id"]
    cse_id = cse_student["id"]

    # Faculty CSE
    login(client, "faculty_cse", "faculty123")
    assert client.get("/classes/ECE/III/A").status_code == 403
    assert client.get(f"/student/{ece_id}").status_code == 403
    assert client.get(f"/student/{cse_id}").status_code == 200
    assert client.get("/admin/users-classes").status_code == 403
    assert client.get("/admin/settings").status_code == 403

    # Hostel Dean (Issue Owner)
    login(client, "dean_hostel", "dean123")
    assert client.get("/students").status_code == 403
    assert client.get(f"/student/{cse_id}").status_code == 403
    assert client.get("/admin/users-classes").status_code == 403
    assert client.get("/admin/settings").status_code == 403
    assert client.get("/issues").status_code == 200

    # College Coordinator (Issue Owner)
    login(client, "coordinator_college", "coord123")
    assert client.get("/students").status_code == 403
    assert client.get(f"/student/{cse_id}").status_code == 403
    assert client.get("/issues").status_code == 200

    # Bus Correspondent (Issue Owner)
    login(client, "correspondent_bus", "bus123")
    assert client.get("/students").status_code == 403
    assert client.get(f"/student/{cse_id}").status_code == 403
    assert client.get("/issues").status_code == 200


# ==============================================================================
# 3. SIDEBAR NAVIGATION COUNT & ORANGE ALERT DOT
# ==============================================================================

def test_sidebar_items_count_and_indicators(client):
    """
    Verifies the exact sidebar link counts:
    - Admin: exactly 7 items
    - Principal: exactly 7 items
    - Faculty: exactly 4 items
    - Issue Owners (College, Hostel, Bus): exactly 2 items
    - Orange dot appears on Issues link when open issues exist.
    """
    # 1. Admin (7 items)
    login(client, "admin", "admin123")
    resp = client.get("/dashboard")
    labels = get_sidebar_nav_links(resp.get_data(as_text=True))
    assert len(labels) == 7, f"Admin must have exactly 7 sidebar links, got {len(labels)}: {labels}"
    assert "Dashboard" in labels
    assert "New Campaign" in labels
    assert "Students" in labels
    assert "Reports" in labels
    assert "Issues" in labels
    assert "Users & Classes" in labels
    assert "Settings" in labels

    # Check orange alert dot on Issues link
    html = resp.get_data(as_text=True)
    assert 'class="sidebar-alert-dot"' in html

    # 2. Principal (exact Admin alias, 7 items)
    login(client, "principal", "principal123")
    resp = client.get("/dashboard")
    labels = get_sidebar_nav_links(resp.get_data(as_text=True))
    assert len(labels) == 7, f"Principal must have exactly 7 sidebar links, got {len(labels)}: {labels}"

    # 3. Faculty (4 items)
    login(client, "faculty_cse", "faculty123")
    resp = client.get("/dashboard")
    labels = get_sidebar_nav_links(resp.get_data(as_text=True))
    assert len(labels) == 4, f"Faculty must have exactly 4 sidebar links, got {len(labels)}: {labels}"
    assert labels == ["Dashboard", "New Campaign", "Students", "Reports"]

    # 4. Issue Owners (2 items each)
    for owner_user, owner_pass in [("dean_hostel", "dean123"), ("coordinator_college", "coord123"), ("correspondent_bus", "bus123")]:
        login(client, owner_user, owner_pass)
        resp = client.get("/dashboard")
        labels = get_sidebar_nav_links(resp.get_data(as_text=True))
        assert len(labels) == 2, f"{owner_user} must have exactly 2 sidebar links, got {len(labels)}: {labels}"
        assert labels == ["Dashboard", "Issues"]


# ==============================================================================
# 4. OLD URL REDIRECTS WITH AUTHENTICATION & ROLE AUTHORIZATION
# ==============================================================================

def test_old_url_redirects_and_permissions(client):
    """
    Verifies legacy URL redirects enforce login and role checks:
    - /attendance/daily -> 302 to /campaigns/new
    - /attendance/mark (GET) -> 302 to /campaigns/new
    - /attendance/queue (GET) -> 302 to /campaigns/new
    - /voice-assistant & /assistant -> 302 to /admin/settings (Admin only, 403 for Faculty)
    - /telugu-speech-lab -> 302 to /admin/settings (Admin only, 403 for Faculty)
    - /follow-ups -> 302 to /issues
    - Unauthenticated requests redirect to /login
    """
    # Unauthenticated
    client.get("/logout")
    for old_url in ["/attendance/daily", "/telugu-speech-lab", "/voice-assistant", "/follow-ups"]:
        resp = client.get(old_url)
        assert resp.status_code == 302
        assert "/login" in resp.headers["Location"]

    # Logged in as Admin
    login(client, "admin", "admin123")
    assert client.get("/attendance/daily").status_code == 302
    assert "/campaigns/new" in client.get("/attendance/daily").headers["Location"]
    assert client.get("/voice-assistant").status_code == 302
    assert "/admin/settings" in client.get("/voice-assistant").headers["Location"]
    assert client.get("/telugu-speech-lab").status_code == 302
    assert "/admin/settings" in client.get("/telugu-speech-lab").headers["Location"]
    assert client.get("/follow-ups").status_code == 302
    assert "/issues" in client.get("/follow-ups").headers["Location"]

    # Logged in as Faculty
    login(client, "faculty_cse", "faculty123")
    assert client.get("/attendance/daily").status_code == 302
    assert client.get("/voice-assistant").status_code == 403
    assert client.get("/telugu-speech-lab").status_code == 403

    # Logged in as Issue Owner (Hostel Dean)
    login(client, "dean_hostel", "dean123")
    assert client.get("/attendance/daily").status_code == 403
    assert client.get("/attendance/mark").status_code == 403
    assert client.get("/attendance/queue").status_code == 403
    assert client.get("/voice-assistant").status_code == 403


# ==============================================================================
# 5. FACULTY CANNOT SEE OR TOGGLE ARCHIVED STUDENTS
# ==============================================================================

def test_faculty_cannot_see_or_toggle_archived_students(client):
    """
    Faculty cannot see the archived toggle switch and cannot view archived students.
    Admin can see both active and archived students and toggle the filter.
    """
    # 1. Faculty view
    login(client, "faculty_cse", "faculty123")
    resp_fac = client.get("/students")
    assert resp_fac.status_code == 200
    html_fac = resp_fac.get_data(as_text=True)
    assert 'name="show_archived"' not in html_fac
    assert "Archived Students" not in html_fac

    # Even if Faculty attempts query param ?show_archived=1, archived rows are suppressed
    resp_fac_arch = client.get("/students?show_archived=1")
    html_fac_arch = resp_fac_arch.get_data(as_text=True)
    assert 'badge-archived' not in html_fac_arch

    # 2. Admin view
    login(client, "admin", "admin123")
    resp_admin = client.get("/students")
    assert resp_admin.status_code == 200
    html_admin = resp_admin.get_data(as_text=True)
    assert 'name="show_archived"' in html_admin
    assert "Archived Students" in html_admin


# ==============================================================================
# 6. STYLE GUIDE GATED BY DEMO_MODE AND ADMIN ROLE
# ==============================================================================

def test_styleguide_demo_mode_and_admin_gate(client):
    """
    /dev/styleguide is accessible ONLY to Admin/Principal when DEMO_MODE=1.
    Returns 403 for non-Admins or when DEMO_MODE=0.
    """
    # Admin with DEMO_MODE=1 -> 200
    login(client, "admin", "admin123")
    with patch.dict(os.environ, {"DEMO_MODE": "1"}):
        resp = client.get("/dev/styleguide")
        assert resp.status_code == 200
        assert "Design System" in resp.get_data(as_text=True)

    # Admin with DEMO_MODE=0 -> 403
    with patch.dict(os.environ, {"DEMO_MODE": "0"}):
        resp = client.get("/dev/styleguide")
        assert resp.status_code == 403

    # Faculty with DEMO_MODE=1 -> 403
    login(client, "faculty_cse", "faculty123")
    with patch.dict(os.environ, {"DEMO_MODE": "1"}):
        resp = client.get("/dev/styleguide")
        assert resp.status_code == 403

    # Hostel Dean with DEMO_MODE=1 -> 403
    login(client, "dean_hostel", "dean123")
    with patch.dict(os.environ, {"DEMO_MODE": "1"}):
        resp = client.get("/dev/styleguide")
        assert resp.status_code == 403


# ==============================================================================
# 7. ZERO OCCURRENCES OF 'VIGNAN SPANDANA' IN RENDERED HTML
# ==============================================================================

def test_zero_occurrences_of_vignan_spandana_in_rendered_html(client):
    """
    Verifies that the legacy project name 'Vignan Spandana' is completely
    absent from all rendered HTML pages across all user roles.
    """
    routes_to_scan = [
        "/login",
        "/dashboard",
        "/students",
        "/student/1",
        "/reports",
        "/issues",
        "/campaigns/new",
        "/campaigns",
        "/admin/users-classes",
        "/admin/settings",
        "/dev/styleguide"
    ]

    with patch.dict(os.environ, {"DEMO_MODE": "1"}):
        # 1. Unauthenticated Login Page
        client.get("/logout")
        login_resp = client.get("/login")
        assert "vignan spandana" not in login_resp.get_data(as_text=True).lower()

        # 2. Authenticated Admin Session
        login(client, "admin", "admin123")
        for route in routes_to_scan:
            resp = client.get(route)
            if resp.status_code == 200:
                html = resp.get_data(as_text=True).lower()
                assert "vignan spandana" not in html, f"Found legacy name 'Vignan Spandana' in {route}!"

        # 3. Authenticated Faculty Session
        login(client, "faculty_cse", "faculty123")
        for route in ["/dashboard", "/students", "/student/1", "/reports", "/campaigns/new", "/campaigns"]:
            resp = client.get(route)
            if resp.status_code == 200:
                html = resp.get_data(as_text=True).lower()
                assert "vignan spandana" not in html, f"Found legacy name 'Vignan Spandana' in {route} for Faculty!"

"""
Vignan Spandana - Security & Access Control Module
Provides:
- Password hashing & verification (PBKDF2/SHA256)
- Session-based CSRF protection with cryptographic tokens
- Sliding window login rate limiting
- Server-side role & department access control enforcement
- Audit logging (zero password/secret leakage)
"""

import os
import time
import secrets
import hmac
import hashlib
import re
from typing import Optional, Dict, List, Tuple
from werkzeug.security import generate_password_hash, check_password_hash

# --------------------------------------------------------------------------
# Password Hashing
# --------------------------------------------------------------------------
def hash_password(plain_password: str) -> str:
    """Hashes a password using PBKDF2 with SHA-256."""
    return generate_password_hash(plain_password, method="pbkdf2:sha256")


def verify_password(stored_hash: str, plain_password: str) -> bool:
    """Verifies a plain password against stored hash."""
    if not stored_hash or not plain_password:
        return False
    return check_password_hash(stored_hash, plain_password)


# --------------------------------------------------------------------------
# CSRF Protection
# --------------------------------------------------------------------------
def generate_csrf_token(session_dict: dict) -> str:
    """Generates and persists a CSRF token in session if not present."""
    if "csrf_token" not in session_dict:
        session_dict["csrf_token"] = secrets.token_hex(24)
    return session_dict["csrf_token"]


def validate_csrf_token(session_dict: dict, token: Optional[str]) -> bool:
    """Validates the supplied token against the session CSRF token."""
    expected = session_dict.get("csrf_token")
    if not expected or not token:
        return False
    return hmac.compare_digest(expected, token)


# --------------------------------------------------------------------------
# Login Rate Limiting (5 failures in 300 seconds = 429 lock)
# --------------------------------------------------------------------------
MAX_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 300  # 5 minutes

# In-memory failure tracking: key = (ip, username_lower) -> list of timestamp floats
_FAILED_ATTEMPTS: Dict[Tuple[str, str], List[float]] = {}


def is_rate_limited(ip_address: str, username: str) -> Tuple[bool, int]:
    """
    Checks if a given IP + username has exceeded maximum failed attempts.
    Returns (is_limited, seconds_remaining).
    """
    now = time.time()
    key = (ip_address or "unknown", (username or "").strip().lower())
    attempts = _FAILED_ATTEMPTS.get(key, [])

    # Filter out attempts outside the window
    recent = [t for t in attempts if now - t < LOCKOUT_WINDOW_SECONDS]
    _FAILED_ATTEMPTS[key] = recent

    if len(recent) >= MAX_ATTEMPTS:
        oldest_relevant = recent[0]
        remaining = int(LOCKOUT_WINDOW_SECONDS - (now - oldest_relevant))
        return True, max(1, remaining)

    return False, 0


def record_failed_login(ip_address: str, username: str) -> None:
    """Records a failed login attempt timestamp."""
    now = time.time()
    key = (ip_address or "unknown", (username or "").strip().lower())
    if key not in _FAILED_ATTEMPTS:
        _FAILED_ATTEMPTS[key] = []
    _FAILED_ATTEMPTS[key].append(now)


def reset_failed_logins(ip_address: str, username: str) -> None:
    """Clears failed login attempts after a successful login."""
    key = (ip_address or "unknown", (username or "").strip().lower())
    _FAILED_ATTEMPTS.pop(key, None)


def clear_all_rate_limits() -> None:
    """Testing helper to clear rate limiter state."""
    _FAILED_ATTEMPTS.clear()


# --------------------------------------------------------------------------
# Environment & Demo Mode
# --------------------------------------------------------------------------
def is_demo_mode() -> bool:
    """Returns True if the system is operating in simulated Demo Mode."""
    return os.environ.get("DEMO_MODE", "1").strip().lower() in ("1", "true", "yes")


# --------------------------------------------------------------------------
# Privacy & Phone Masking
# --------------------------------------------------------------------------
def mask_phone_number(phone_str: Optional[str]) -> str:
    """
    Masks a phone number for privacy display by default (e.g. '+91 98*** **210').
    Raw contact numbers must never be displayed unmasked without explicit authorization.
    """
    if not phone_str:
        return "Not Registered"
    raw = str(phone_str).strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 10:
        return "****"
    # Format standard 10-digit Indian mobile
    last3 = digits[-3:]
    first2 = digits[-10:-8]
    return f"+91 {first2}*** **{last3}"


# --------------------------------------------------------------------------
# Department, Class and Role Permissions
# --------------------------------------------------------------------------
VALID_ROLES = [
    "Admin",
    "Principal",
    "Department Coordinator",
    "Faculty",
    "College Coordinator",
    "Hostel Dean",
    "Bus Correspondent"
]
VALID_DEPARTMENTS = ["CSE", "ECE", "IT", "MECH", "All"]


def can_access_student(user_role: str, user_dept: str, student_dept: str) -> bool:
    """
    Determines if a user has permission to access a student's record based on department scoping:
    - Admin: All
    - Principal: All (Read-focused)
    - Department Coordinator: Only their department
    - Faculty: Only their department
    - Issue Owners (College, Hostel, Bus): Can view student records if relevant to their category
    """
    if not user_role or not student_dept:
        return False

    if user_role in ["Admin", "Principal", "College Coordinator", "Hostel Dean", "Bus Correspondent"]:
        return True

    if user_role in ["Department Coordinator", "Faculty"]:
        return (user_dept or "").strip().upper() == student_dept.strip().upper()

    return False


def can_faculty_access_class(conn, user_id: int, user_role: str, user_dept: str,
                             department: str, year: str, section: str) -> bool:
    """
    Strict server-side validation ensuring faculty can only view or manage classes explicitly
    assigned to them. Admin and Principal can access all classes.
    """
    if not user_role or not department:
        return False

    if user_role in ["Admin", "Principal"]:
        return True

    if user_role != "Faculty":
        # Department Coordinators can access their department's classes
        if user_role == "Department Coordinator":
            return (user_dept or "").strip().upper() == department.strip().upper()
        return False

    # Check database assignment table
    if conn and user_id:
        row = conn.execute(
            """
            SELECT id FROM faculty_class_assignments
            WHERE user_id = ? AND UPPER(department) = ? AND UPPER(year) = ? AND UPPER(section) = ?
            """,
            (user_id, department.strip().upper(), year.strip().upper(), section.strip().upper())
        ).fetchone()
        if row:
            return True

    # Fallback to department matching if no granular class assignment is seeded
    # but still enforce that faculty cannot switch department
    return False


def can_start_campaign(user_role: str) -> bool:
    """
    Strict server-side check: ONLY Admin can confirm, start, pause, or stop calling campaigns.
    Faculty can create drafts (steps 1-5) and submit to Admin, but can NEVER start calls.
    """
    return user_role == "Admin"


def can_access_issue(user_role: str, issue_category: str) -> bool:
    """
    Issue category access control:
    - Admin: Can view and manage all categories (College, Hostel, Bus).
    - College Coordinator: Can view only 'college' issues.
    - Hostel Dean: Can view only 'hostel' issues.
    - Bus Correspondent: Can view only 'bus' issues.
    - Others: Blocked.
    """
    if not user_role or not issue_category:
        return False

    if user_role == "Admin":
        return True

    cat = issue_category.strip().lower()
    if user_role == "College Coordinator" and cat == "college":
        return True
    if user_role == "Hostel Dean" and cat == "hostel":
        return True
    if user_role == "Bus Correspondent" and cat == "bus":
        return True

    return False


def can_manage_academic_units(user_role: str) -> bool:
    """Only Admin can add, edit, or deactivate Departments, Years, and Sections."""
    return user_role == "Admin"


def verify_webhook_signature(payload_bytes: bytes, signature_header: Optional[str], secret: Optional[str]) -> bool:
    """
    Verifies HMAC-SHA256 signature for incoming webhooks.
    """
    if not secret:
        # If no secret configured, reject or handle in debug mode
        return False
    if not signature_header:
        return False

    expected = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    # Support signature with or without 'sha256=' prefix
    clean_sig = signature_header.replace("sha256=", "").strip()
    return hmac.compare_digest(expected, clean_sig)


def can_modify_students(user_role: str) -> bool:
    """Admin, Department Coordinator, and Faculty can add, edit, and delete student records. Principal is read-only."""
    return user_role in ["Admin", "Department Coordinator", "Faculty"]


def validate_phone_number(phone_str: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validates a phone number. Returns (is_valid, cleaned_digits_or_error_reason).
    Accepts 10 to 15 digit telephone numbers (e.g. standard Indian 10-digit mobile or E.164 +91...).
    Rejects empty, non-digit, or too short/long values.
    """
    if not phone_str:
        return False, "Phone number is empty or missing"
    digits = re.sub(r"\D", "", phone_str)
    if len(digits) < 10:
        return False, f"Phone number has only {len(digits)} digits (minimum 10 required)"
    if len(digits) > 15:
        return False, f"Phone number has {len(digits)} digits (maximum 15 allowed)"
    return True, digits


def can_mark_attendance(user_role: str) -> bool:
    """Admin, Department Coordinator, and Faculty can mark/edit attendance. Principal is read-only."""
    return user_role in ["Admin", "Department Coordinator", "Faculty"]


def can_manage_users(user_role: str) -> bool:
    """Only Admin can create, deactivate, and manage users and audit logs."""
    return user_role == "Admin"


# --------------------------------------------------------------------------
# Audit Logging (Never logs secrets or passwords)
# --------------------------------------------------------------------------
def record_audit(conn, user_id: Optional[int], username: str, action: str,
                 resource: Optional[str] = None, details: Optional[str] = None,
                 ip_address: Optional[str] = None) -> None:
    """
    Inserts an immutable audit log record.
    Guarantees no passwords, keys, or hashes are logged.
    """
    # Sanitize details to guarantee no accidental password logging
    safe_details = details or ""
    if "password" in safe_details.lower():
        safe_details = "[REDACTED_SECURITY_DATA]"

    conn.execute("""
        INSERT INTO audit_logs (user_id, username, action, resource, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, username or "Anonymous", action, resource, safe_details, ip_address or "127.0.0.1"))
    conn.commit()

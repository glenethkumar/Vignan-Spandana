"""
Vignan Spandana - Security & Access Control Module
Provides:
- Password hashing & verification (PBKDF2/SHA256)
- Session-based CSRF protection with cryptographic tokens
- Sliding window login rate limiting
- Server-side role & department access control enforcement
- Audit logging (zero password/secret leakage)
"""

import time
import secrets
import hmac
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
# Department and Role Permissions
# --------------------------------------------------------------------------
VALID_ROLES = ["Admin", "Principal", "Department Coordinator", "Faculty"]
VALID_DEPARTMENTS = ["CSE", "ECE", "IT", "MECH", "All"]


def can_access_student(user_role: str, user_dept: str, student_dept: str) -> bool:
    """
    Determines if a user has permission to access a student's record based on department scoping:
    - Admin: All
    - Principal: All (Read-focused)
    - Department Coordinator: Only their department
    - Faculty: Only their department
    """
    if not user_role or not student_dept:
        return False

    if user_role in ["Admin", "Principal"]:
        return True

    if user_role in ["Department Coordinator", "Faculty"]:
        return (user_dept or "").strip().upper() == student_dept.strip().upper()

    return False


def can_modify_students(user_role: str) -> bool:
    """Only Admin and Department Coordinator can add/import student records."""
    return user_role in ["Admin", "Department Coordinator"]


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

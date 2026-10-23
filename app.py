"""
Vignan Spandana - AI Parent Communication System
Web Application Server with Institutional Role-Based Access Control,
Department Scoping, Password Hashing, CSRF Protection, Rate Limiting,
Safe DB Lifecycle (g context & teardown), Upload Limits & Two-Step Import.
"""

import os
import re
from functools import wraps
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash, send_file, abort, jsonify
)
from datetime import datetime, timedelta
import pandas as pd

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from database import init_db, get_db_connection, close_db, DB_PATH, recalculate_student_attendance
from security import (
    hash_password, verify_password,
    generate_csrf_token, validate_csrf_token,
    is_rate_limited, record_failed_login, reset_failed_logins,
    can_access_student, can_modify_students, can_manage_users,
    can_mark_attendance,
    record_audit,
    validate_phone_number
)
from adapters import MockTelephonyAdapter, MockAIAdapter, VoiceAssistantEngine

app = Flask(__name__)

# --------------------------------------------------------------------------
# Secret Key Configuration & Production Safeguard
# --------------------------------------------------------------------------
is_debug = os.environ.get("FLASK_DEBUG", "0").strip().lower() in ("1", "true", "yes")
secret_key = os.environ.get("FLASK_SECRET_KEY")

if not secret_key:
    if is_debug:
        app.secret_key = "DEV_FALLBACK_INSECURE_SECRET_KEY_FOR_LOCAL_DEBUGGING_ONLY"
        app.logger.warning("WARNING: Running in DEBUG mode with developmental fallback secret key. Set FLASK_SECRET_KEY in .env for production.")
    else:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: FLASK_SECRET_KEY environment variable is not set. "
            "Refusing to start in production mode without a secure cryptographic key."
        )
else:
    app.secret_key = secret_key

# --------------------------------------------------------------------------
# Security & Upload Configuration
# --------------------------------------------------------------------------
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # Set to True in production with HTTPS
    MAX_CONTENT_LENGTH=5 * 1024 * 1024  # 5 MB maximum upload limit
)

# Register teardown to guarantee DB connections are always closed
app.teardown_appcontext(close_db)

# Initialize Mock & Voice Assistant Adapters
telephony_adapter = MockTelephonyAdapter()
ai_adapter = MockAIAdapter()
voice_assistant_engine = VoiceAssistantEngine()

# Ensure database and seed records exist at startup
init_db(seed_data=True)


# --------------------------------------------------------------------------
# Context Processors & Middleware (CSRF Protection)
# --------------------------------------------------------------------------
@app.context_processor
def inject_security_context():
    """Provides csrf_token generator and current user details to all Jinja templates."""
    return {
        "csrf_token": lambda: generate_csrf_token(session),
        "user_role": session.get("role"),
        "user_dept": session.get("department"),
        "user_full_name": session.get("full_name")
    }


@app.before_request
def csrf_protect():
    """Validates CSRF tokens on all mutating HTTP methods (POST, PUT, DELETE, PATCH)."""
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        if app.config.get("TESTING_SKIP_CSRF", False) or app.config.get("WTF_CSRF_ENABLED") is False:
            return

        token = (
            request.form.get("csrf_token")
            or request.headers.get("X-CSRF-Token")
            or request.headers.get("X-CSRFToken")
        )
        if not token and request.is_json:
            json_data = request.get_json(silent=True) or {}
            token = json_data.get("csrf_token")

        # Allow conversational assistant API if called without stored session token
        if request.path == "/api/assistant/chat":
            if token and validate_csrf_token(session, token):
                return
            if not token:
                return

        if not validate_csrf_token(session, token):
            app.logger.warning(f"CSRF validation failed for path {request.path} from IP {request.remote_addr}")
            abort(403, description="CSRF verification failed. Form submission rejected.")


# --------------------------------------------------------------------------
# Auth & Role Enforcement Decorators
# --------------------------------------------------------------------------
def login_required(allowed_roles=None):
    """Decorator to enforce authentication and optional role-level authorization."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if "user_id" not in session:
                flash("Please log in with institutional credentials to access this portal.", "warning")
                return redirect(url_for("login"))

            if allowed_roles and session.get("role") not in allowed_roles:
                conn = get_db_connection()
                record_audit(
                    conn,
                    session.get("user_id"),
                    session.get("username", "Unknown"),
                    "unauthorized_access_attempt",
                    request.path,
                    f"Role '{session.get('role')}' unauthorized for endpoint",
                    request.remote_addr
                )
                abort(403, description="Access Denied: You do not have permission to access this resource.")

            return f(*args, **kwargs)
        return decorated_function
    return decorator


# --------------------------------------------------------------------------
# Routes: Authentication & Session
# --------------------------------------------------------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        client_ip = request.remote_addr or "127.0.0.1"

        # 1. Rate Limiting Check (5 attempts / 300s window)
        limited, remaining_secs = is_rate_limited(client_ip, username)
        if limited:
            conn = get_db_connection()
            record_audit(
                conn, None, username, "login_rate_limited", "auth",
                f"Rate limit exceeded: locked for {remaining_secs}s", client_ip
            )
            abort(429, description=f"Too many failed login attempts. Please wait {remaining_secs} seconds before trying again.")

        conn = get_db_connection()
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()

        if user and verify_password(user["password_hash"], password):
            if not user["is_active"]:
                record_audit(
                    conn, user["id"], user["username"], "login_failed", "auth",
                    "Attempted login to deactivated account", client_ip
                )
                flash("This institutional account has been deactivated. Please contact the College Administrator.", "danger")
                return render_template("login.html"), 403

            reset_failed_logins(client_ip, username)

            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session["role"] = user["role"]
            session["full_name"] = user["full_name"]
            session["department"] = user["department"]

            record_audit(
                conn, user["id"], user["username"], "login", "auth",
                f"Successful sign-in as {user['role']} (Dept: {user['department']})", client_ip
            )

            flash(f"Welcome, {user['full_name']}! Signed in as {user['role']}.", "success")
            return redirect(url_for("dashboard"))

        else:
            record_failed_login(client_ip, username)
            record_audit(
                conn, None, username or "unknown", "login_failed", "auth",
                f"Invalid credentials attempt from IP {client_ip}", client_ip
            )
            flash("Invalid username or password. Please use valid institutional credentials.", "danger")

    return render_template("login.html")


@app.route("/logout")
def logout():
    user_id = session.get("user_id")
    username = session.get("username", "Unknown")
    client_ip = request.remote_addr

    if user_id:
        conn = get_db_connection()
        record_audit(conn, user_id, username, "logout", "auth", "User signed out", client_ip)

    session.clear()
    flash("You have been signed out successfully.", "info")
    return redirect(url_for("login"))


# --------------------------------------------------------------------------
# Routes: Dashboard (Department Scoped)
# --------------------------------------------------------------------------
@app.route("/")
@app.route("/dashboard")
@login_required()
def dashboard():
    user_role = session.get("role")
    user_dept = session.get("department", "All")

    conn = get_db_connection()

    if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
        students = conn.execute(
            "SELECT * FROM students WHERE UPPER(department) = UPPER(?) ORDER BY roll_number ASC",
            (user_dept,)
        ).fetchall()
    else:
        students = conn.execute("SELECT * FROM students ORDER BY roll_number ASC").fetchall()

    total_students = len(students)
    low_attendance_count = sum(1 for s in students if s["attendance_percentage"] is not None and s["attendance_percentage"] < 75.0)

    if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
        total_calls_row = conn.execute("""
            SELECT COUNT(*) AS count FROM call_records cr
            JOIN students s ON cr.student_id = s.id
            WHERE UPPER(s.department) = UPPER(?)
        """, (user_dept,)).fetchone()
    else:
        total_calls_row = conn.execute("SELECT COUNT(*) AS count FROM call_records").fetchone()

    total_calls = total_calls_row["count"] if total_calls_row else 0

    return render_template(
        "dashboard.html",
        students=students,
        total_students=total_students,
        low_attendance_count=low_attendance_count,
        total_calls=total_calls,
        user_dept=user_dept
    )


# --------------------------------------------------------------------------
# Routes: Student Detail (Department Scoped)
# --------------------------------------------------------------------------
@app.route("/student/<int:student_id>")
@login_required()
def student_detail(student_id):
    user_role = session.get("role")
    user_dept = session.get("department", "All")

    conn = get_db_connection()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()

    if not student:
        flash("Student record not found.", "danger")
        return redirect(url_for("dashboard"))

    if not can_access_student(user_role, user_dept, student["department"]):
        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "unauthorized_access_attempt", f"student_{student_id}",
            f"Blocked cross-department view attempt ({user_dept} tried to view {student['department']})",
            request.remote_addr
        )
        abort(403, description=f"Access Denied: You can only view students in your assigned department ({user_dept}).")

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "student_view", f"student_{student_id}",
        f"Viewed profile for {student['roll_number']} ({student['department']})",
        request.remote_addr
    )

    call_records = conn.execute(
        "SELECT * FROM call_records WHERE student_id = ? ORDER BY call_time DESC",
        (student_id,)
    ).fetchall()

    follow_ups = conn.execute(
        "SELECT * FROM follow_ups WHERE student_id = ? ORDER BY created_at DESC",
        (student_id,)
    ).fetchall()

    attendance_records = conn.execute(
        "SELECT * FROM attendance_records WHERE student_id = ? ORDER BY attendance_date DESC LIMIT 30",
        (student_id,)
    ).fetchall()

    return render_template(
        "student_detail.html",
        student=student,
        call_records=call_records,
        follow_ups=follow_ups,
        attendance_records=attendance_records
    )


# --------------------------------------------------------------------------
# Routes: Call Record Simulation
# --------------------------------------------------------------------------
@app.route("/student/<int:student_id>/call/demo", methods=["POST"])
@login_required()
def simulate_call_demo(student_id):
    """
    Simulated Call Demo API:
    - Verifies role access & department scoping (Principal excluded as read-only)
    - Generates scripted lines in English or Telugu using student's academic data
    - Saves CallRecord: student, status, start/end time, duration, language, speaker-labelled transcript, short summary
    - Creates FollowUp record for parent inquiry beyond AI capability
    - Records security audit log
    - Returns JSON payload with timeline events and dialogue lines
    """
    if session.get("role") == "Principal":
        return jsonify({
            "success": False,
            "error": "Principal role is read-only and cannot trigger communication actions."
        }), 403

    user_role = session.get("role")
    user_dept = session.get("department", "All")

    conn = get_db_connection()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()

    if not student:
        return jsonify({"success": False, "error": "Student record not found."}), 404

    if not can_access_student(user_role, user_dept, student["department"]):
        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "unauthorized_access_attempt", f"student_{student_id}",
            f"Blocked cross-department call attempt ({user_dept} tried to call {student['department']})",
            request.remote_addr
        )
        return jsonify({
            "success": False,
            "error": f"Access Denied: You cannot initiate calls for students outside your department ({user_dept})."
        }), 403

    # Determine requested language and optional attendance_date
    req_data = request.get_json(silent=True) or {}
    lang = req_data.get("language") or request.form.get("language") or student["preferred_language"] or "English"
    attendance_date = (req_data.get("attendance_date") or request.form.get("attendance_date") or "").strip()

    att_record = None
    if attendance_date:
        att_record = conn.execute(
            "SELECT * FROM attendance_records WHERE student_id = ? AND attendance_date = ?",
            (student_id, attendance_date)
        ).fetchone()
        if not att_record:
            return jsonify({
                "success": False,
                "error": f"No attendance record found for {student['roll_number']} on {attendance_date}."
            }), 400
        if att_record["status"] != "Absent":
            return jsonify({
                "success": False,
                "error": f"Student {student['roll_number']} is marked {att_record['status']} on {attendance_date}. Only Absent students can be processed for parent absence calls."
            }), 400
        if att_record["call_record_id"] is not None:
            return jsonify({
                "success": False,
                "error": f"Duplicate processing prevented: {student['name']} ({student['roll_number']}) was already processed for attendance on {attendance_date} (CallRecord #{att_record['call_record_id']}).",
                "duplicate": True,
                "call_record_id": att_record["call_record_id"]
            }), 409

    # Prevent double-click spam / duplicate call collision (debounce within 2 seconds)
    now = datetime.now()
    last_call_key = f"last_call_ts_{student_id}"
    last_call_ts = session.get(last_call_key)
    if last_call_ts:
        try:
            if (now.timestamp() - float(last_call_ts)) < 2.0:
                return jsonify({
                    "success": False,
                    "error": "A call was recently initiated for this student. Please wait before starting another call."
                }), 429
        except Exception:
            pass

    recent_call = conn.execute(
        "SELECT id, call_time FROM call_records WHERE student_id = ? ORDER BY id DESC LIMIT 1",
        (student_id,)
    ).fetchone()
    if recent_call and recent_call["call_time"]:
        try:
            prev_time = datetime.strptime(str(recent_call["call_time"])[:19], "%Y-%m-%d %H:%M:%S")
            if abs((now - prev_time).total_seconds()) < 2.0:
                return jsonify({
                    "success": False,
                    "error": "A call was recently initiated for this student. Please wait before starting another call."
                }), 429
        except Exception:
            pass

    session[last_call_key] = now.timestamp()

    # Generate script using MockAIAdapter with student's saved data
    script_data = ai_adapter.generate_simulated_call_script(dict(student), lang)

    # Calculate timestamps and duration
    duration_seconds = script_data.get("duration_seconds", 45)
    start_time = now - timedelta(seconds=duration_seconds)
    end_time = now
    start_time_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
    end_time_str = end_time.strftime("%Y-%m-%d %H:%M:%S")

    # Mock Telephony provider integration
    telephony_adapter.initiate_call(
        to_phone=student["parent_phone"] or "Unavailable / Campus Demo Line",
        call_id=f"sim_demo_{student_id}_{int(os.times().elapsed)}",
        metadata={"student_id": student_id, "language": script_data["language"], "attendance_date": attendance_date}
    )

    cursor = conn.cursor()

    # Create FollowUp record (since parent asked question beyond AI scope)
    due_date_str = (now + timedelta(days=2)).strftime("%Y-%m-%d")
    assigned_faculty = f"Dr. {student['department']} Mentor"
    action_text = f"Faculty callback regarding absence on {attendance_date} (Attendance: {student['attendance_percentage']}%)" if attendance_date else f"Faculty callback regarding exam evaluation for {student['name']}"
    escalation_text = script_data.get("escalation_notes", f"Parent informed of absence on {attendance_date}. Question beyond AI scope escalated.") if attendance_date else script_data.get("escalation_notes", "Parent inquired regarding exam marks during AI call.")

    cursor.execute("""
        INSERT INTO follow_ups (
            student_id, teacher_name, assigned_to, due_date, status, notes, action_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        student_id,
        f"AI System (Escalated to {student['department']} Faculty)",
        assigned_faculty,
        due_date_str,
        "open",
        escalation_text,
        action_text
    ))
    followup_id = cursor.lastrowid

    sim_notes = f"SIMULATED — NO REAL TELEPHONE CALL WAS PLACED. Attendance absence outreach for {attendance_date}." if attendance_date else "Demo mode: simulated call"
    sim_summary = f"[SIMULATED — NO REAL TELEPHONE CALL WAS PLACED] {script_data['summary']}" if attendance_date else script_data["summary"]

    # Save CallRecord with all required fields including linked followup_id, explicit call_time, and attendance_date
    cursor.execute("""
        INSERT INTO call_records (
            student_id, status, language, duration_seconds, start_time, end_time,
            transcript, summary, notes, initiated_by, followup_id, call_time, attendance_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        student_id,
        "Completed",
        script_data["language"],
        duration_seconds,
        start_time_str,
        end_time_str,
        script_data["transcript"],
        sim_summary,
        sim_notes,
        session.get("full_name", session.get("username")),
        followup_id,
        now.strftime("%Y-%m-%d %H:%M:%S"),
        attendance_date or None
    ))
    call_record_id = cursor.lastrowid

    # Link call_record_id back into follow_ups and attendance_records
    cursor.execute("UPDATE follow_ups SET call_record_id = ? WHERE id = ?", (call_record_id, followup_id))
    if att_record:
        cursor.execute("UPDATE attendance_records SET call_record_id = ? WHERE id = ?", (call_record_id, att_record["id"]))

    # Record institutional security audit
    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "call_simulated", f"student_{student_id}",
        f"Completed simulated AI demo call in {script_data['language']} for {student['roll_number']}; Follow-up #{followup_id} created.",
        request.remote_addr
    )
    conn.commit()

    return jsonify({
        "success": True,
        "call_record_id": call_record_id,
        "followup_id": followup_id,
        "student": {
            "id": student["id"],
            "name": student["name"],
            "roll_number": student["roll_number"],
            "department": student["department"],
            "parent_phone": student["parent_phone"],
            "attendance_percentage": student["attendance_percentage"]
        },
        "attendance_date": attendance_date,
        "language": script_data["language"],
        "status": "Completed",
        "start_time": start_time_str,
        "end_time": end_time_str,
        "duration_seconds": duration_seconds,
        "summary": sim_summary,
        "transcript": script_data["transcript"],
        "lines": script_data["lines"],
        "label": "SIMULATED — NO REAL TELEPHONE CALL WAS PLACED"
    })


# --------------------------------------------------------------------------
# Routes: Daily Attendance Parent Calling Queue
# --------------------------------------------------------------------------
@app.route("/attendance/queue", methods=["GET"])
@login_required()
def attendance_queue():
    """
    Returns sequential call queue of absent students for the selected date.
    Excludes Present students.
    Shows queue count and filters out already processed students.
    """
    user_role = session.get("role")
    user_dept = session.get("department", "All")
    conn = get_db_connection()

    req_dept = request.args.get("dept") or request.args.get("department")
    if user_dept and user_dept != "All":
        selected_dept = user_dept
    else:
        selected_dept = req_dept or "CSE"

    if user_dept and user_dept != "All" and req_dept and req_dept != user_dept:
        abort(403, description=f"Access Denied: You cannot view queue for department {req_dept}.")

    selected_date = (request.args.get("date") or request.args.get("attendance_date") or "").strip()
    if not selected_date:
        selected_date = datetime.now().strftime("%Y-%m-%d")

    rows = conn.execute("""
        SELECT s.id, s.roll_number, s.name, s.department, s.year_semester, s.section,
               s.parent_name, s.parent_relationship, s.parent_phone, s.preferred_language, s.attendance_percentage,
               ar.id as attendance_record_id, ar.status, ar.call_record_id, ar.attendance_date
        FROM students s
        JOIN attendance_records ar ON s.id = ar.student_id
        WHERE ar.attendance_date = ? AND s.department = ? AND ar.status = 'Absent'
        ORDER BY s.roll_number ASC
    """, (selected_date, selected_dept)).fetchall()

    queue = []
    already_called = []
    invalid_contacts = []
    queue_pos = 1

    for r in rows:
        phone_raw = r["parent_phone"] or ""
        clean_phone, is_valid_phone = validate_phone_number(phone_raw)
        p_rel = r["parent_relationship"] or "Parent"

        item = {
            "id": r["id"],
            "student_id": r["id"],
            "roll_number": r["roll_number"],
            "name": r["name"],
            "department": r["department"],
            "year_semester": r["year_semester"],
            "section": r["section"],
            "parent_name": r["parent_name"],
            "parent_relationship": p_rel,
            "parent_phone": phone_raw,
            "preferred_language": r["preferred_language"] or "Telugu",
            "attendance_percentage": r["attendance_percentage"],
            "attendance_record_id": r["attendance_record_id"],
            "attendance_date": r["attendance_date"],
            "call_record_id": r["call_record_id"],
            "already_processed": bool(r["call_record_id"]),
            "phone_valid": is_valid_phone
        }

        if not is_valid_phone:
            item["contact_status"] = "Invalid Phone" if phone_raw else "Missing Phone"
            item["failure_reason"] = f"Invalid phone format ({phone_raw or 'empty'}). Must contain at least 10 digits."
            invalid_contacts.append(item)
        else:
            item["failure_reason"] = None

        if r["call_record_id"]:
            item["contact_status"] = f"Already Contacted (#{r['call_record_id']})"
            already_called.append(item)
        else:
            if is_valid_phone:
                item["contact_status"] = "Eligible"
            item["queue_position"] = queue_pos
            queue_pos += 1
            queue.append(item)

    return jsonify({
        "success": True,
        "department": selected_dept,
        "attendance_date": selected_date,
        "total_absent": len(rows),
        "queue_count": len(queue),
        "queue": queue,
        "already_called_count": len(already_called),
        "already_called": already_called,
        "invalid_contacts": invalid_contacts,
        "label": "SIMULATED — NO REAL TELEPHONE CALL WAS PLACED"
    })


@app.route("/attendance/queue/process", methods=["POST"])
@login_required()
def attendance_queue_process():
    """
    Processes one absent student from the daily attendance queue sequentially.
    Enforces:
    - Scoping and Principal read-only block
    - Student must be marked Absent on attendance_date (excludes Present)
    - Prevents duplicate calls for the same attendance date
    - Handles skip requests and skips missing/invalid numbers with recorded explanation
    - Simulates call via MockTelephonyAdapter and MockAIAdapter
    - Creates CallRecord with explicit 'SIMULATED — NO REAL TELEPHONE CALL WAS PLACED'
    - Creates FollowUp ticket for human faculty callback
    - Updates attendance_records.call_record_id
    """
    if session.get("role") == "Principal":
        return jsonify({
            "success": False,
            "error": "Principal role is read-only and cannot process call queue."
        }), 403

    user_role = session.get("role")
    user_dept = session.get("department", "All")
    data = request.get_json(silent=True) or request.form.to_dict()

    student_id = data.get("student_id")
    attendance_date = (data.get("attendance_date") or data.get("date") or "").strip()
    selected_lang = data.get("language")
    action = (data.get("action") or "call").strip().lower()
    reason = (data.get("reason") or "").strip()

    if not student_id or not attendance_date:
        return jsonify({"success": False, "error": "student_id and attendance_date are required."}), 400

    conn = get_db_connection()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        return jsonify({"success": False, "error": "Student record not found."}), 404

    if not can_access_student(user_role, user_dept, student["department"]):
        return jsonify({"success": False, "error": f"Access Denied: You cannot call students outside your department ({user_dept})."}), 403

    att_record = conn.execute(
        "SELECT * FROM attendance_records WHERE student_id = ? AND attendance_date = ?",
        (student_id, attendance_date)
    ).fetchone()

    if not att_record:
        return jsonify({"success": False, "error": f"No attendance record found for {student['roll_number']} on {attendance_date}."}), 400

    if att_record["status"] != "Absent":
        return jsonify({
            "success": False,
            "error": f"Student {student['roll_number']} is marked {att_record['status']} on {attendance_date}. Only Absent students can enter the call queue."
        }), 400

    if att_record["call_record_id"] is not None:
        return jsonify({
            "success": False,
            "error": f"Duplicate processing prevented: {student['name']} ({student['roll_number']}) was already processed for attendance on {attendance_date} (CallRecord #{att_record['call_record_id']}).",
            "duplicate": True,
            "call_record_id": att_record["call_record_id"]
        }), 409

    now = datetime.now()

    # Handle teacher skip action
    if action == "skip":
        skip_reason = reason or "Skipped by teacher during queue execution"
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO follow_ups (
                student_id, teacher_name, assigned_to, due_date, status, notes, action_required
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            student_id,
            session.get("username", "Faculty"),
            f"Dr. {student['department']} Mentor",
            (now + timedelta(days=2)).strftime("%Y-%m-%d"),
            "open",
            f"Queue outreach skipped for {student['name']} ({student['roll_number']}) on {attendance_date}. Reason: {skip_reason}",
            "Parent Meeting Scheduled"
        ))
        followup_id = cursor.lastrowid
        conn.commit()

        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "queue_student_skipped", f"student_{student_id}",
            f"Skipped parent call for {student['roll_number']} on {attendance_date}: {skip_reason}. FollowUp #{followup_id} created.",
            request.remote_addr
        )

        return jsonify({
            "success": True,
            "skipped": True,
            "status": "Skipped",
            "student_id": student_id,
            "student_name": student["name"],
            "reason": skip_reason,
            "followup_id": followup_id
        })

    # Validate parent mobile number
    clean_phone, is_valid_phone = validate_phone_number(student["parent_phone"])
    if not is_valid_phone:
        failure_msg = f"Invalid or missing parent mobile number: '{student['parent_phone'] or 'empty'}'. Must contain at least 10 digits."
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO follow_ups (
                student_id, teacher_name, assigned_to, due_date, status, notes, action_required
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            student_id,
            "AI Calling Queue (Auto-Check)",
            f"Dr. {student['department']} Mentor",
            (now + timedelta(days=1)).strftime("%Y-%m-%d"),
            "open",
            f"Automated absence call skipped on {attendance_date}: Student {student['name']} ({student['roll_number']}) has invalid parent contact ({student['parent_phone'] or 'empty'}). Immediate phone number verification required.",
            "Attendance Warning Issued"
        ))
        followup_id = cursor.lastrowid
        conn.commit()

        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "queue_call_skipped_invalid_contact", f"student_{student_id}",
            f"Skipped call for {student['roll_number']} on {attendance_date}: {failure_msg}. FollowUp #{followup_id} created.",
            request.remote_addr
        )

        return jsonify({
            "success": False,
            "skipped": True,
            "status": "Skipped - Invalid Contact",
            "student_id": student_id,
            "student_name": student["name"],
            "failure_reason": failure_msg,
            "followup_id": followup_id
        })

    lang = selected_lang or student["preferred_language"] or "Telugu"
    script_data = ai_adapter.generate_simulated_call_script(dict(student), lang)

    duration_seconds = script_data.get("duration_seconds", 45)
    start_time = now - timedelta(seconds=duration_seconds)
    end_time = now
    start_time_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
    end_time_str = end_time.strftime("%Y-%m-%d %H:%M:%S")

    telephony_adapter.initiate_call(
        to_phone=student["parent_phone"] or "Unavailable / Demo Line",
        call_id=f"sim_queue_{student_id}_{int(os.times().elapsed)}",
        metadata={"student_id": student_id, "language": script_data["language"], "attendance_date": attendance_date}
    )

    cursor = conn.cursor()
    due_date_str = (now + timedelta(days=2)).strftime("%Y-%m-%d")
    assigned_faculty = f"Dr. {student['department']} Mentor"
    cursor.execute("""
        INSERT INTO follow_ups (
            student_id, teacher_name, assigned_to, due_date, status, notes, action_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        student_id,
        f"AI System (Escalated to {student['department']} Faculty)",
        assigned_faculty,
        due_date_str,
        "open",
        script_data.get("escalation_notes", f"Parent informed of absence on {attendance_date}. Question beyond AI scope escalated."),
        f"Faculty callback: Student absent on {attendance_date} (Attendance: {student['attendance_percentage']}%)"
    ))
    followup_id = cursor.lastrowid

    sim_notes = f"SIMULATED — NO REAL TELEPHONE CALL WAS PLACED. Attendance absence outreach for {attendance_date}."
    sim_summary = f"[SIMULATED — NO REAL TELEPHONE CALL WAS PLACED] {script_data['summary']}"

    cursor.execute("""
        INSERT INTO call_records (
            student_id, status, language, duration_seconds, start_time, end_time,
            transcript, summary, notes, initiated_by, followup_id, call_time, attendance_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        student_id,
        "Completed",
        script_data["language"],
        duration_seconds,
        start_time_str,
        end_time_str,
        script_data["transcript"],
        sim_summary,
        sim_notes,
        session.get("full_name", session.get("username")),
        followup_id,
        now.strftime("%Y-%m-%d %H:%M:%S"),
        attendance_date
    ))
    call_record_id = cursor.lastrowid

    cursor.execute("UPDATE follow_ups SET call_record_id = ? WHERE id = ?", (call_record_id, followup_id))
    cursor.execute("UPDATE attendance_records SET call_record_id = ? WHERE id = ?", (call_record_id, att_record["id"]))

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "call_simulated", f"student_{student_id}",
        f"Queue call processed for {student['roll_number']} (Absent on {attendance_date}); Call #{call_record_id}, Follow-up #{followup_id} created.",
        request.remote_addr
    )
    conn.commit()

    return jsonify({
        "success": True,
        "status": "Completed",
        "call_record_id": call_record_id,
        "followup_id": followup_id,
        "student": {
            "id": student["id"],
            "name": student["name"],
            "roll_number": student["roll_number"],
            "department": student["department"],
            "parent_phone": student["parent_phone"],
            "attendance_percentage": student["attendance_percentage"]
        },
        "attendance_date": attendance_date,
        "language": script_data["language"],
        "duration_seconds": duration_seconds,
        "summary": sim_summary,
        "transcript": script_data["transcript"],
        "lines": script_data.get("lines", []),
        "label": "SIMULATED — NO REAL TELEPHONE CALL WAS PLACED"
    })


# --------------------------------------------------------------------------
# Routes: Daily Attendance Marking
# --------------------------------------------------------------------------
@app.route("/attendance/mark", methods=["GET", "POST"])
@login_required(allowed_roles=["Admin", "Principal", "Department Coordinator", "Faculty"])
def attendance_mark():
    """
    Daily attendance marking portal for faculty and coordinators.
    Allows filtering by department, section, class/year, and date.
    Supports viewing, recording, and correcting daily attendance records.
    Automatically recalculates dynamic attendance percentages and surfaces absent students for parent calling.
    """
    user_role = session.get("role")
    user_dept = session.get("department", "All")
    conn = get_db_connection()

    # Department scoping
    req_dept = request.values.get("dept") or request.values.get("department")
    if user_dept and user_dept != "All":
        # Scoped faculty/coordinator can only access their assigned department
        selected_dept = user_dept
    else:
        # Campus-wide role (Admin/Principal)
        selected_dept = req_dept or "CSE"

    if user_dept and user_dept != "All" and req_dept and req_dept != user_dept:
        abort(403, description=f"Access Denied: You cannot mark attendance for department {req_dept}.")

    # Date handling (defaults to today's date)
    selected_date = (request.values.get("date") or request.values.get("attendance_date") or "").strip()
    if not selected_date:
        selected_date = datetime.now().strftime("%Y-%m-%d")
    else:
        try:
            datetime.strptime(selected_date, "%Y-%m-%d")
        except ValueError:
            flash("Invalid date format. Expected YYYY-MM-DD.", "danger")
            selected_date = datetime.now().strftime("%Y-%m-%d")

    # Section and Year/Semester filters
    selected_section = request.values.get("section") or "All"
    selected_year = request.values.get("year") or request.values.get("year_semester") or "All"

    if request.method == "POST":
        # Principal has read-only oversight
        if user_role == "Principal":
            abort(403, description="Principal role has read-only oversight and cannot modify attendance.")

        # Query all students in this scope to validate submitted IDs
        query = "SELECT * FROM students WHERE department = ?"
        params = [selected_dept]
        if selected_section != "All":
            query += " AND section = ?"
            params.append(selected_section)
        if selected_year != "All":
            query += " AND year_semester = ?"
            params.append(selected_year)

        students_in_scope = conn.execute(query, params).fetchall()
        student_id_map = {s["id"]: s for s in students_in_scope}

        saved_count = 0
        present_count = 0
        absent_count = 0

        for s_id, s in student_id_map.items():
            form_status = request.form.get(f"status_{s_id}")
            if form_status in ["Present", "Absent"]:
                # UPSERT record
                conn.execute(
                    """
                    INSERT INTO attendance_records (student_id, attendance_date, status, marked_by, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(student_id, attendance_date) DO UPDATE SET
                        status = excluded.status,
                        marked_by = excluded.marked_by,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (s_id, selected_date, form_status, session.get("username", "Unknown"))
                )
                recalculate_student_attendance(conn, s_id)
                saved_count += 1
                if form_status == "Present":
                    present_count += 1
                else:
                    absent_count += 1

        conn.commit()

        # Audit log
        record_audit(
            conn,
            session.get("user_id"),
            session.get("username", "Unknown"),
            "attendance_marked",
            resource=f"Dept: {selected_dept}, Date: {selected_date}",
            details=f"Saved {saved_count} records (Present: {present_count}, Absent: {absent_count})",
            ip_address=request.remote_addr
        )

        flash(
            f"Successfully saved attendance for {saved_count} students on {selected_date} "
            f"({present_count} Present, {absent_count} Absent).",
            "success"
        )

        return redirect(url_for(
            "attendance_mark",
            dept=selected_dept,
            section=selected_section,
            year=selected_year,
            date=selected_date
        ))

    # GET Method: Retrieve list of students and existing status on selected_date
    if user_dept and user_dept != "All":
        departments = [user_dept]
    else:
        dept_rows = conn.execute("SELECT DISTINCT department FROM students ORDER BY department ASC").fetchall()
        departments = [d["department"] for d in dept_rows] or ["CSE", "ECE"]

    section_rows = conn.execute(
        "SELECT DISTINCT section FROM students WHERE department = ? ORDER BY section ASC",
        (selected_dept,)
    ).fetchall()
    sections = [s["section"] for s in section_rows]

    year_rows = conn.execute(
        "SELECT DISTINCT year_semester FROM students WHERE department = ? ORDER BY year_semester ASC",
        (selected_dept,)
    ).fetchall()
    years = [y["year_semester"] for y in year_rows]

    # Fetch students matching criteria
    student_query = "SELECT * FROM students WHERE department = ?"
    student_params = [selected_dept]
    if selected_section != "All":
        student_query += " AND section = ?"
        student_params.append(selected_section)
    if selected_year != "All":
        student_query += " AND year_semester = ?"
        student_params.append(selected_year)
    student_query += " ORDER BY roll_number ASC"

    students = conn.execute(student_query, student_params).fetchall()

    # Fetch existing attendance records for these students on selected_date (including call_record_id)
    student_ids = [s["id"] for s in students]
    records_by_student = {}
    if student_ids:
        placeholders = ",".join("?" for _ in student_ids)
        rec_query = f"""
            SELECT student_id, status, marked_by, updated_at, call_record_id
            FROM attendance_records
            WHERE attendance_date = ? AND student_id IN ({placeholders})
        """
        records = conn.execute(rec_query, [selected_date] + student_ids).fetchall()
        records_by_student = {r["student_id"]: r for r in records}

    students_data = []
    absent_students = []
    present_total = 0
    absent_total = 0

    for s in students:
        rec = records_by_student.get(s["id"])
        is_recorded = rec is not None
        status = rec["status"] if is_recorded else "Present"

        if is_recorded:
            if status == "Present":
                present_total += 1
            else:
                absent_total += 1

        s_dict = dict(s)
        s_dict["date_status"] = status
        s_dict["is_recorded"] = is_recorded
        s_dict["marked_by"] = rec["marked_by"] if is_recorded else None
        s_dict["call_record_id"] = rec["call_record_id"] if is_recorded else None
        students_data.append(s_dict)

        if is_recorded and status == "Absent":
            absent_students.append(s_dict)

    queue_pending_count = sum(1 for s in absent_students if not s.get("call_record_id"))
    queue_processed_count = sum(1 for s in absent_students if s.get("call_record_id"))

    return render_template(
        "attendance_mark.html",
        departments=departments,
        selected_dept=selected_dept,
        sections=sections,
        selected_section=selected_section,
        years=years,
        selected_year=selected_year,
        selected_date=selected_date,
        students=students_data,
        absent_students=absent_students,
        total_students=len(students_data),
        present_count=present_total,
        absent_count=absent_total,
        queue_pending_count=queue_pending_count,
        queue_processed_count=queue_processed_count,
        has_saved_records=bool(records_by_student),
        user_role=user_role
    )


# --------------------------------------------------------------------------
# Routes: Call History (Global, Scoped, Filterable)
# --------------------------------------------------------------------------
@app.route("/calls")
@login_required()
def call_history():
    user_role = session.get("role")
    user_dept = session.get("department", "All")

    status_filter = request.args.get("status", "All").strip()
    lang_filter = request.args.get("language", "All").strip()
    dept_filter = request.args.get("department", "All").strip()
    date_filter = request.args.get("date", "").strip()
    search_query = request.args.get("roll_number", "").strip()

    conn = get_db_connection()

    # Department restriction for Coordinator & Faculty
    if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
        dept_filter = user_dept

    query = """
        SELECT 
            c.id AS id, c.student_id, c.call_time, c.start_time, c.end_time,
            c.status, c.language, c.duration_seconds, c.transcript, c.summary,
            c.notes, c.initiated_by, c.followup_id,
            s.roll_number, s.name AS student_name, s.department, s.parent_name, s.parent_phone
        FROM call_records c
        JOIN students s ON c.student_id = s.id
        WHERE 1=1
    """
    params = []

    if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
        query += " AND s.department = ?"
        params.append(user_dept)
    elif dept_filter != "All" and dept_filter != "":
        query += " AND s.department = ?"
        params.append(dept_filter)

    if status_filter != "All" and status_filter != "":
        query += " AND c.status = ?"
        params.append(status_filter)

    if lang_filter != "All" and lang_filter != "":
        query += " AND c.language = ?"
        params.append(lang_filter)

    if date_filter:
        query += " AND DATE(c.call_time) = ?"
        params.append(date_filter)

    if search_query:
        query += " AND (s.roll_number LIKE ? OR s.name LIKE ?)"
        params.append(f"%{search_query}%")
        params.append(f"%{search_query}%")

    query += " ORDER BY c.id DESC LIMIT 300"
    calls = conn.execute(query, params).fetchall()

    if user_role in ["Admin", "Principal"]:
        available_depts = [row[0] for row in conn.execute("SELECT DISTINCT department FROM students ORDER BY department").fetchall()]
    else:
        available_depts = [user_dept]

    return render_template(
        "call_history.html",
        calls=calls,
        selected_status=status_filter,
        selected_lang=lang_filter,
        selected_dept=dept_filter,
        selected_date=date_filter,
        search_query=search_query,
        available_depts=available_depts
    )


# --------------------------------------------------------------------------
# Routes: Call Detail (Transcript, Summary, Linked Follow-Up)
# --------------------------------------------------------------------------
@app.route("/calls/<int:call_id>")
@login_required()
def call_detail(call_id):
    user_role = session.get("role")
    user_dept = session.get("department", "All")

    conn = get_db_connection()
    call = conn.execute("""
        SELECT 
            c.*, 
            s.roll_number, s.name AS student_name, s.department, 
            s.parent_name, s.parent_phone, s.attendance_percentage, s.year_semester, s.section
        FROM call_records c
        JOIN students s ON c.student_id = s.id
        WHERE c.id = ?
    """, (call_id,)).fetchone()

    if not call:
        abort(404, description="Call record not found.")

    if not can_access_student(user_role, user_dept, call["department"]):
        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "unauthorized_access_attempt", f"call_{call_id}",
            f"Blocked cross-department call detail attempt ({user_dept} tried to view {call['department']})",
            request.remote_addr
        )
        abort(403, description=f"Access Denied: You cannot view call details for {call['department']}.")

    # Linked follow-up
    followup = None
    if call["followup_id"]:
        followup = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (call["followup_id"],)).fetchone()
    if not followup:
        followup = conn.execute("SELECT * FROM follow_ups WHERE call_record_id = ? ORDER BY id DESC LIMIT 1", (call_id,)).fetchone()

    # Parse speaker-labelled lines
    lines = []
    if call["transcript"]:
        for raw_line in call["transcript"].split("\n"):
            line_str = raw_line.strip()
            if not line_str:
                continue
            if line_str.startswith("[AI Assistant]:"):
                lines.append({"speaker": "AI Assistant", "text": line_str.replace("[AI Assistant]:", "").strip()})
            elif line_str.startswith("[Parent]:"):
                lines.append({"speaker": "Parent", "text": line_str.replace("[Parent]:", "").strip()})
            else:
                lines.append({"speaker": "Note", "text": line_str})

    faculty_users = conn.execute(
        "SELECT id, username, full_name, role, department FROM users WHERE is_active = 1 AND (department = ? OR department = 'All') ORDER BY full_name",
        (call["department"],)
    ).fetchall()

    return render_template(
        "call_detail.html",
        call=call,
        lines=lines,
        followup=followup,
        faculty_users=faculty_users
    )


# --------------------------------------------------------------------------
# Routes: Follow-Ups Page (List, Assign, Status, Due Date, Notes)
# --------------------------------------------------------------------------
@app.route("/follow-ups")
@login_required()
def follow_ups_list():
    user_role = session.get("role")
    user_dept = session.get("department", "All")

    status_filter = request.args.get("status", "All").strip()
    dept_filter = request.args.get("department", "All").strip()

    conn = get_db_connection()

    if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
        dept_filter = user_dept

    query = """
        SELECT 
            f.id AS id, f.student_id, f.call_record_id, f.teacher_name,
            f.assigned_to, f.due_date, f.status, f.notes, f.action_required,
            f.created_at, f.updated_at,
            s.roll_number, s.name AS student_name, s.department, s.parent_name, s.parent_phone,
            c.language AS call_language, c.duration_seconds AS call_duration
        FROM follow_ups f
        JOIN students s ON f.student_id = s.id
        LEFT JOIN call_records c ON f.call_record_id = c.id
        WHERE 1=1
    """
    params = []

    if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
        query += " AND s.department = ?"
        params.append(user_dept)
    elif dept_filter != "All" and dept_filter != "":
        query += " AND s.department = ?"
        params.append(dept_filter)

    if status_filter != "All" and status_filter != "":
        query += " AND f.status = ?"
        params.append(status_filter)

    query += """
        ORDER BY 
            CASE f.status 
                WHEN 'open' THEN 1 
                WHEN 'in progress' THEN 2 
                WHEN 'closed' THEN 3 
                ELSE 4 
            END,
            f.id DESC
    """
    follow_ups = conn.execute(query, params).fetchall()

    if user_role in ["Admin", "Principal"]:
        available_depts = [row[0] for row in conn.execute("SELECT DISTINCT department FROM students ORDER BY department").fetchall()]
    else:
        available_depts = [user_dept]

    faculty_users = conn.execute(
        "SELECT id, username, full_name, department FROM users WHERE is_active = 1 AND (role = 'Faculty' OR role = 'Department Coordinator') ORDER BY department, full_name"
    ).fetchall()

    return render_template(
        "follow_ups.html",
        follow_ups=follow_ups,
        selected_status=status_filter,
        selected_dept=dept_filter,
        available_depts=available_depts,
        faculty_users=faculty_users
    )


@app.route("/follow-up/<int:followup_id>/update", methods=["POST"])
@login_required()
def update_followup(followup_id):
    if session.get("role") == "Principal":
        abort(403, description="Principal account is read-only and cannot modify follow-ups.")

    user_role = session.get("role")
    user_dept = session.get("department", "All")

    conn = get_db_connection()
    row = conn.execute("""
        SELECT f.*, s.department, s.roll_number
        FROM follow_ups f
        JOIN students s ON f.student_id = s.id
        WHERE f.id = ?
    """, (followup_id,)).fetchone()

    if not row:
        flash("Follow-up ticket not found.", "danger")
        return redirect(url_for("follow_ups_list"))

    if not can_access_student(user_role, user_dept, row["department"]):
        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "unauthorized_access_attempt", f"followup_{followup_id}",
            f"Blocked cross-department follow-up edit attempt ({user_dept} tried to edit {row['department']})",
            request.remote_addr
        )
        abort(403, description=f"Access Denied: You cannot edit follow-ups for {row['department']}.")

    new_status = request.form.get("status", row["status"]).strip().lower()
    if new_status not in ["open", "in progress", "closed"]:
        new_status = row["status"]

    new_assigned = request.form.get("assigned_to", row["assigned_to"] or "").strip()
    new_due_date = request.form.get("due_date", row["due_date"] or "").strip()
    new_notes = request.form.get("notes", row["notes"]).strip()

    conn.execute("""
        UPDATE follow_ups 
        SET status = ?, assigned_to = ?, due_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_status, new_assigned, new_due_date, new_notes, followup_id))
    conn.commit()

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "followup_updated", f"followup_{followup_id}",
        f"Updated Follow-up #{followup_id} for {row['roll_number']} to status '{new_status}', assigned to '{new_assigned}'",
        request.remote_addr
    )

    flash(f"Follow-up #{followup_id} updated successfully.", "success")
    return redirect(request.referrer or url_for("follow_ups_list"))


@app.route("/student/<int:student_id>/simulate-call", methods=["POST"])
@login_required()
def simulate_call(student_id):
    if session.get("role") == "Principal":
        abort(403, description="Principal account is read-only and cannot trigger communication actions.")

    user_role = session.get("role")
    user_dept = session.get("department", "All")

    conn = get_db_connection()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()

    if not student:
        flash("Student not found.", "danger")
        return redirect(url_for("dashboard"))

    if not can_access_student(user_role, user_dept, student["department"]):
        abort(403, description="Access Denied: You cannot initiate calls for students outside your department.")

    lang = request.form.get("language") or student["preferred_language"] or "Telugu"
    script_data = ai_adapter.generate_simulated_call_script(dict(student), lang)

    now = datetime.now()
    duration_seconds = script_data.get("duration_seconds", 45)
    start_time = now - timedelta(seconds=duration_seconds)
    end_time = now
    start_time_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
    end_time_str = end_time.strftime("%Y-%m-%d %H:%M:%S")

    telephony_adapter.initiate_call(
        to_phone=student["parent_phone"],
        call_id=f"sim_{student_id}_{int(os.times().elapsed)}",
        metadata={"student_id": student_id, "language": script_data["language"]}
    )

    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO call_records (
            student_id, status, language, duration_seconds, start_time, end_time,
            transcript, summary, notes, initiated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        student_id,
        "Completed",
        script_data["language"],
        duration_seconds,
        start_time_str,
        end_time_str,
        script_data["transcript"],
        script_data["summary"],
        "Demo mode: simulated call",
        session.get("full_name", session.get("username"))
    ))
    call_record_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO follow_ups (
            student_id, teacher_name, notes, action_required
        ) VALUES (?, ?, ?, ?)
    """, (
        student_id,
        f"AI System (Escalated to {student['department']} Faculty)",
        script_data.get("escalation_notes", "Parent inquired regarding exam marks during AI call."),
        script_data.get("action_required", f"Faculty callback regarding exam evaluation for {student['name']}")
    ))
    followup_id = cursor.lastrowid

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "call_simulated", f"student_{student_id}",
        f"Simulated AI call initiated to {student['parent_phone']} in {script_data['language']}; Follow-up #{followup_id} created.",
        request.remote_addr
    )
    conn.commit()

    flash(f"Mock AI call logged successfully in {script_data['language']} via MockTelephonyAdapter.", "success")
    return redirect(url_for("student_detail", student_id=student_id))


# --------------------------------------------------------------------------
# Routes: Follow-Up Notes
# --------------------------------------------------------------------------
@app.route("/student/<int:student_id>/followup", methods=["POST"])
@login_required()
def add_followup(student_id):
    if session.get("role") == "Principal":
        abort(403, description="Principal role has read-only access and cannot record follow-up notes.")

    user_role = session.get("role")
    user_dept = session.get("department", "All")

    conn = get_db_connection()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()

    if not student or not can_access_student(user_role, user_dept, student["department"]):
        abort(403, description="Access Denied: You cannot record notes for students outside your department.")

    notes = request.form.get("notes", "").strip()
    action_required = request.form.get("action_required", "Attendance Warning Issued").strip()

    if not notes:
        flash("Notes cannot be empty.", "warning")
        return redirect(url_for("student_detail", student_id=student_id))

    teacher_name = session.get("full_name", session.get("username"))

    conn.execute("""
        INSERT INTO follow_ups (student_id, teacher_name, notes, action_required)
        VALUES (?, ?, ?, ?)
    """, (student_id, teacher_name, notes, action_required))
    conn.commit()

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "followup_created", f"student_{student_id}",
        f"Created follow-up note ({action_required})",
        request.remote_addr
    )

    flash("Follow-up observation recorded successfully.", "success")
    return redirect(url_for("student_detail", student_id=student_id))


# --------------------------------------------------------------------------
# Helpers: Two-Step Import Sanitization & Validation
# --------------------------------------------------------------------------
def sanitize_cell_value(val):
    """
    Checks if a cell value begins with a formula trigger (=, +, -, @).
    If so, prefixes with a single quote to neutralize and returns (sanitized_val, was_sanitized).
    """
    if val is None or pd.isna(val):
        return "", False
    s_val = str(val).strip()
    if s_val.startswith(("=", "+", "-", "@")):
        return "'" + s_val, True
    return s_val, False


def validate_phone_number(phone_str):
    """
    Validates phone number contains exactly 10 digits (allowing optional +91 or 0 prefix).
    Returns (cleaned_10_digit_str, is_valid).
    """
    digits = re.sub(r"\D", "", phone_str or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) == 10 and digits[0] in "6789":
        return digits, True
    return digits, False


# --------------------------------------------------------------------------
# Routes: Two-Step Excel / CSV Import (Step 1: Upload & Validate Preview)
# --------------------------------------------------------------------------
@app.route("/import", methods=["GET", "POST"])
@login_required(allowed_roles=["Admin", "Department Coordinator"])
def import_students():
    user_role = session.get("role")
    user_dept = session.get("department", "All")

    if request.method == "POST":
        if "file" not in request.files:
            flash("No file was selected for upload.", "danger")
            return redirect(request.url)

        file = request.files["file"]
        if file.filename == "":
            flash("Please choose a file to upload.", "warning")
            return redirect(request.url)

        filename = file.filename.lower()
        if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
            flash("Invalid format. Please upload a .CSV or .XLSX file.", "danger")
            return redirect(request.url)

        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)

            # Normalize column names: lowercase, strip spaces, remove punctuation
            normalized_cols = {col: str(col).lower().strip().replace(" ", "_").replace("-", "_") for col in df.columns}
            df.rename(columns=normalized_cols, inplace=True)

            def find_col(possible_names):
                for name in possible_names:
                    if name in df.columns:
                        return name
                return None

            col_roll = find_col(["roll_number", "roll_no", "roll", "rollno", "id"])
            col_name = find_col(["name", "student_name", "student"])
            col_dept = find_col(["department", "dept", "branch"])
            col_year = find_col(["year_semester", "class", "year", "sem", "semester"])
            col_sec = find_col(["section", "sec"])
            col_parent = find_col(["parent_name", "parent", "guardian"])
            col_phone = find_col(["parent_phone", "phone", "mobile", "contact"])
            col_lang = find_col(["preferred_language", "language", "lang"])
            col_att = find_col(["attendance_percentage", "attendance", "att"])

            # 1. Missing Required Columns Check
            missing_cols = []
            if not col_roll: missing_cols.append("Roll Number")
            if not col_name: missing_cols.append("Student Name")
            if not col_phone: missing_cols.append("Parent Phone")

            if missing_cols:
                flash(f"Upload rejected: Missing required columns: {', '.join(missing_cols)}.", "danger")
                return redirect(request.url)

            # Fetch existing student roll numbers for Add vs Update tracking
            conn = get_db_connection()
            existing_rows = conn.execute("SELECT roll_number FROM students").fetchall()
            existing_rolls = {r["roll_number"].upper() for r in existing_rows}

            staged_rows = []
            seen_file_rolls = set()
            valid_count = 0
            error_count = 0
            warning_count = 0
            add_count = 0
            update_count = 0

            for idx, raw_row in df.iterrows():
                row_num = idx + 2  # Excel 1-based index including header
                errors = []
                warnings = []

                # 2. Empty Row Check
                if raw_row.dropna().empty or all(str(val).strip() == "" for val in raw_row.values if pd.notna(val)):
                    errors.append("Empty row encountered.")
                    error_count += 1
                    staged_rows.append({
                        "row_num": row_num,
                        "roll_number": "",
                        "name": "",
                        "department": "",
                        "year_semester": "",
                        "section": "",
                        "parent_name": "",
                        "parent_phone": "",
                        "preferred_language": "",
                        "attendance_percentage": "",
                        "status": "ERROR",
                        "action": "SKIP",
                        "errors": errors,
                        "warnings": warnings
                    })
                    continue

                # Cell Sanitization (Formula Neutralization)
                roll_raw, roll_san = sanitize_cell_value(raw_row.get(col_roll, ""))
                if roll_san:
                    warnings.append(f"Formula neutralized in roll number: {roll_raw}")

                name_raw, name_san = sanitize_cell_value(raw_row.get(col_name, ""))
                if name_san:
                    warnings.append(f"Formula neutralized in student name: {name_raw}")

                dept_raw, dept_san = sanitize_cell_value(raw_row.get(col_dept, ""))
                dept = dept_raw.upper() if dept_raw else (user_dept if user_dept != "All" else "CSE")

                year_sem_raw, _ = sanitize_cell_value(raw_row.get(col_year, "III Year - Sem 1"))
                year_sem = year_sem_raw or "III Year - Sem 1"

                sec_raw, _ = sanitize_cell_value(raw_row.get(col_sec, "A"))
                sec = sec_raw.upper() or "A"

                parent_name_raw, p_san = sanitize_cell_value(raw_row.get(col_parent, "Parent"))
                if p_san:
                    warnings.append(f"Formula neutralized in parent name: {parent_name_raw}")
                parent_name = parent_name_raw or "Parent"

                phone_raw, _ = sanitize_cell_value(raw_row.get(col_phone, ""))
                lang_raw, _ = sanitize_cell_value(raw_row.get(col_lang, "Telugu"))
                lang = lang_raw.capitalize() if lang_raw else "Telugu"

                att_raw, _ = sanitize_cell_value(raw_row.get(col_att, "85.0"))

                roll_clean = roll_raw.strip().upper()
                name_clean = name_raw.strip()

                # Check Roll Number Present
                if not roll_clean or roll_clean == "NAN":
                    errors.append("Roll number is missing or empty.")

                # 3. Duplicate Roll Numbers inside the file
                if roll_clean in seen_file_rolls:
                    errors.append(f"Duplicate roll number '{roll_clean}' found within this upload file.")
                else:
                    seen_file_rolls.add(roll_clean)

                # Check Name Present
                if not name_clean or name_clean == "NAN":
                    errors.append("Student name is missing or empty.")

                # 4. Valid 10-digit Phone Check
                clean_phone, is_phone_valid = validate_phone_number(phone_raw)
                if not is_phone_valid:
                    errors.append(f"Invalid phone number '{phone_raw}'. Must be a valid 10-digit mobile number.")
                formatted_phone = f"+91 {clean_phone}" if is_phone_valid else phone_raw

                # 5. Attendance outside 0-100 Check
                try:
                    att_float = float(att_raw) if att_raw and att_raw != "NAN" else 85.0
                    if att_float < 0.0 or att_float > 100.0:
                        errors.append(f"Attendance percentage must be between 0 and 100% (got: {att_raw}%).")
                except ValueError:
                    errors.append(f"Attendance percentage must be a valid number (got: '{att_raw}').")
                    att_float = 85.0

                # 6. Department Scoping Enforcement for Coordinators
                if user_role == "Department Coordinator" and user_dept != "All" and dept != user_dept.upper():
                    errors.append(f"Department '{dept}' is outside your coordinator scope ({user_dept}).")

                # Match against existing students strictly by roll_number (never by name)
                if roll_clean in existing_rolls:
                    action = "UPDATE"
                else:
                    action = "ADD"

                if errors:
                    status = "ERROR"
                    error_count += 1
                elif warnings:
                    status = "WARNING"
                    warning_count += 1
                    valid_count += 1
                    if action == "ADD": add_count += 1
                    else: update_count += 1
                else:
                    status = "VALID"
                    valid_count += 1
                    if action == "ADD": add_count += 1
                    else: update_count += 1

                staged_rows.append({
                    "row_num": row_num,
                    "roll_number": roll_clean,
                    "name": name_clean,
                    "department": dept,
                    "year_semester": year_sem,
                    "section": sec,
                    "parent_name": parent_name,
                    "parent_phone": formatted_phone,
                    "preferred_language": lang,
                    "attendance_percentage": att_float,
                    "status": status,
                    "action": action if not errors else "SKIP",
                    "errors": errors,
                    "warnings": warnings
                })

            # Store validated preview in session for Step 2 confirmation
            session["import_staging"] = {
                "filename": file.filename,
                "rows": [r for r in staged_rows if r["status"] in ["VALID", "WARNING"]],
                "valid_count": valid_count,
                "add_count": add_count,
                "update_count": update_count
            }

            return render_template(
                "import_preview.html",
                filename=file.filename,
                total_rows=len(staged_rows),
                valid_count=valid_count,
                error_count=error_count,
                warning_count=warning_count,
                add_count=add_count,
                update_count=update_count,
                staged_rows=staged_rows
            )

        except Exception as e:
            flash(f"Error reading spreadsheet file: {str(e)}", "danger")
            return redirect(request.url)

    return render_template("import_students.html")


# --------------------------------------------------------------------------
# Routes: Two-Step Import (Step 2: Commit inside a single transaction)
# --------------------------------------------------------------------------
@app.route("/import/confirm", methods=["POST"])
@login_required(allowed_roles=["Admin", "Department Coordinator"])
def import_confirm():
    staging = session.get("import_staging")
    if not staging or not staging.get("rows"):
        flash("No staged import data found or session expired. Please re-upload your file.", "warning")
        return redirect(url_for("import_students"))

    rows_to_save = staging["rows"]
    filename = staging.get("filename", "spreadsheet")
    add_count = staging.get("add_count", 0)
    update_count = staging.get("update_count", 0)

    conn = get_db_connection()
    try:
        # Save valid rows inside a single atomic SQLite transaction
        with conn:
            for r in rows_to_save:
                conn.execute("""
                    INSERT INTO students (
                        roll_number, name, department, year_semester, section,
                        parent_name, parent_phone, preferred_language, attendance_percentage
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(roll_number) DO UPDATE SET
                        name = excluded.name,
                        department = excluded.department,
                        year_semester = excluded.year_semester,
                        section = excluded.section,
                        parent_name = excluded.parent_name,
                        parent_phone = excluded.parent_phone,
                        preferred_language = excluded.preferred_language,
                        attendance_percentage = excluded.attendance_percentage
                """, (
                    r["roll_number"], r["name"], r["department"],
                    r["year_semester"], r["section"], r["parent_name"],
                    r["parent_phone"], r["preferred_language"], r["attendance_percentage"]
                ))

        # Record audit log entry for the committed import
        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "import", "students",
            f"Successfully committed import of {len(rows_to_save)} students ({add_count} added, {update_count} updated) from {filename}",
            request.remote_addr
        )

        session.pop("import_staging", None)
        flash(f"Successfully committed {len(rows_to_save)} student records ({add_count} added, {update_count} updated) to the database!", "success")
        return redirect(url_for("dashboard"))

    except Exception as e:
        flash(f"Transaction failed while committing import: {str(e)}", "danger")
        return redirect(url_for("import_students"))


@app.route("/import/cancel", methods=["POST"])
@login_required(allowed_roles=["Admin", "Department Coordinator"])
def import_cancel():
    session.pop("import_staging", None)
    flash("Import cancelled. Staged records were discarded without saving to the database.", "info")
    return redirect(url_for("import_students"))


@app.route("/sample-csv")
def download_sample_csv():
    """Serves the sample CSV template for testing import."""
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_students.csv")
    return send_file(
        csv_path,
        mimetype="text/csv",
        as_attachment=True,
        download_name="sample_students.csv"
    )


# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# Routes: Manual Add, Edit, Delete Student Records (Faculty/Coordinator/Admin)
# --------------------------------------------------------------------------
@app.route("/add-student", methods=["GET", "POST"])
@login_required(allowed_roles=["Admin", "Department Coordinator", "Faculty"])
def add_student():
    user_role = session.get("role")
    user_dept = session.get("department", "All")
    conn = get_db_connection()

    if user_dept and user_dept != "All":
        departments = [user_dept]
    else:
        dept_rows = conn.execute("SELECT DISTINCT department FROM students ORDER BY department ASC").fetchall()
        departments = [d["department"] for d in dept_rows] or ["CSE", "ECE", "IT", "MECH"]

    if request.method == "POST":
        roll_number = request.form.get("roll_number", "").strip().upper()
        name = request.form.get("name", "").strip()
        student_phone = request.form.get("student_phone", "").strip()
        student_email = request.form.get("student_email", "").strip()
        year_semester = request.form.get("year_semester", "III Year - Sem 1").strip()
        section = request.form.get("section", "A").strip().upper()
        parent_name = request.form.get("parent_name", "").strip()
        parent_relationship = request.form.get("parent_relationship", "Parent").strip()
        parent_phone = request.form.get("parent_phone", "").strip()
        preferred_language = request.form.get("preferred_language", "Telugu").strip()
        marks_info = request.form.get("marks_info", "").strip()

        if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
            department = user_dept
        else:
            department = request.form.get("department", "CSE").strip().upper()

        try:
            attendance_percentage = float(request.form.get("attendance_percentage", 85.0))
            if attendance_percentage < 0.0:
                attendance_percentage = 0.0
            elif attendance_percentage > 100.0:
                attendance_percentage = 100.0
        except ValueError:
            attendance_percentage = 85.0

        if not roll_number or not name or not parent_phone:
            flash("Roll Number, Student Name, and Parent Mobile Phone are required.", "danger")
            return render_template("add_student.html", departments=departments, user_dept=user_dept, user_role=user_role)

        clean_phone, is_p_valid = validate_phone_number(parent_phone)
        if not is_p_valid:
            flash(f"Invalid parent phone: '{parent_phone}'. Please enter a valid 10-digit number.", "danger")
            return render_template("add_student.html", departments=departments, user_dept=user_dept, user_role=user_role)

        if student_phone:
            clean_s_phone, is_s_valid = validate_phone_number(student_phone)
            if not is_s_valid:
                flash(f"Invalid student phone: '{student_phone}'. Please enter a valid 10-digit number.", "danger")
                return render_template("add_student.html", departments=departments, user_dept=user_dept, user_role=user_role)

        try:
            conn.execute("""
                INSERT INTO students (
                    roll_number, name, department, year_semester, section,
                    student_phone, student_email,
                    parent_name, parent_relationship, parent_phone, preferred_language, attendance_percentage, marks_info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                roll_number, name, department, year_semester, section,
                student_phone or None, student_email or None,
                parent_name, parent_relationship or "Parent", parent_phone, preferred_language, attendance_percentage, marks_info or None
            ))
            conn.commit()

            record_audit(
                conn, session.get("user_id"), session.get("username"),
                "student_created", f"student_{roll_number}",
                f"Enrolled student {name} ({roll_number}) in {department} (Student Phone: {student_phone or 'N/A'}, Parent: {parent_name} [{parent_relationship}] / {parent_phone})",
                request.remote_addr
            )

            flash(f"Student {name} ({roll_number}) enrolled successfully in department {department}!", "success")
            return redirect(url_for("dashboard"))
        except Exception as e:
            flash(f"Error saving student (Roll number may already exist): {str(e)}", "danger")

    return render_template("add_student.html", departments=departments, user_dept=user_dept, user_role=user_role)


@app.route("/student/<int:student_id>/edit", methods=["GET", "POST"])
@login_required(allowed_roles=["Admin", "Department Coordinator", "Faculty"])
def edit_student(student_id):
    user_role = session.get("role")
    user_dept = session.get("department", "All")
    conn = get_db_connection()

    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        abort(404, description="Student record not found.")

    if not can_access_student(user_role, user_dept, student["department"]):
        abort(403, description=f"Access Denied: You cannot edit students outside your department ({user_dept}).")

    if user_dept and user_dept != "All":
        departments = [user_dept]
    else:
        dept_rows = conn.execute("SELECT DISTINCT department FROM students ORDER BY department ASC").fetchall()
        departments = [d["department"] for d in dept_rows] or ["CSE", "ECE", "IT", "MECH"]

    if request.method == "POST":
        roll_number = request.form.get("roll_number", "").strip().upper()
        name = request.form.get("name", "").strip()
        student_phone = request.form.get("student_phone", "").strip()
        student_email = request.form.get("student_email", "").strip()
        year_semester = request.form.get("year_semester", "III Year - Sem 1").strip()
        section = request.form.get("section", "A").strip().upper()
        parent_name = request.form.get("parent_name", "").strip()
        parent_relationship = request.form.get("parent_relationship", "Parent").strip()
        parent_phone = request.form.get("parent_phone", "").strip()
        preferred_language = request.form.get("preferred_language", "Telugu").strip()
        marks_info = request.form.get("marks_info", "").strip()

        if user_role in ["Department Coordinator", "Faculty"] and user_dept != "All":
            department = user_dept
        else:
            department = request.form.get("department", student["department"]).strip().upper()

        try:
            attendance_percentage = float(request.form.get("attendance_percentage", student["attendance_percentage"] or 85.0))
            attendance_percentage = max(0.0, min(100.0, attendance_percentage))
        except ValueError:
            attendance_percentage = student["attendance_percentage"] or 85.0

        if not roll_number or not name or not parent_phone:
            flash("Roll Number, Student Name, and Parent Mobile Phone are required.", "danger")
            return render_template("edit_student.html", student=student, departments=departments, user_dept=user_dept, user_role=user_role)

        clean_phone, is_p_valid = validate_phone_number(parent_phone)
        if not is_p_valid:
            flash(f"Invalid parent phone: '{parent_phone}'. Please enter a valid 10-digit number.", "danger")
            return render_template("edit_student.html", student=student, departments=departments, user_dept=user_dept, user_role=user_role)

        if student_phone:
            clean_s_phone, is_s_valid = validate_phone_number(student_phone)
            if not is_s_valid:
                flash(f"Invalid student phone: '{student_phone}'. Please enter a valid 10-digit number.", "danger")
                return render_template("edit_student.html", student=student, departments=departments, user_dept=user_dept, user_role=user_role)

        # Check duplicate roll number if roll number changed
        if roll_number != student["roll_number"]:
            conflict = conn.execute("SELECT id FROM students WHERE roll_number = ? AND id != ?", (roll_number, student_id)).fetchone()
            if conflict:
                flash(f"Another student already exists with roll number '{roll_number}'.", "danger")
                return render_template("edit_student.html", student=student, departments=departments, user_dept=user_dept, user_role=user_role)

        try:
            conn.execute("""
                UPDATE students SET
                    roll_number = ?,
                    name = ?,
                    department = ?,
                    year_semester = ?,
                    section = ?,
                    student_phone = ?,
                    student_email = ?,
                    parent_name = ?,
                    parent_relationship = ?,
                    parent_phone = ?,
                    preferred_language = ?,
                    attendance_percentage = ?,
                    marks_info = ?
                WHERE id = ?
            """, (
                roll_number, name, department, year_semester, section,
                student_phone or None, student_email or None,
                parent_name, parent_relationship or "Parent", parent_phone,
                preferred_language, attendance_percentage, marks_info or None,
                student_id
            ))
            conn.commit()

            recalculate_student_attendance(conn, student_id)
            conn.commit()

            record_audit(
                conn, session.get("user_id"), session.get("username"),
                "student_updated", f"student_{roll_number}",
                f"Updated student record for {name} ({roll_number}) in {department}",
                request.remote_addr
            )

            flash(f"Student details for {name} ({roll_number}) updated successfully!", "success")
            return redirect(url_for("student_detail", student_id=student_id))
        except Exception as e:
            flash(f"Error updating student: {str(e)}", "danger")

    return render_template("edit_student.html", student=student, departments=departments, user_dept=user_dept, user_role=user_role)


@app.route("/student/<int:student_id>/delete", methods=["POST"])
@login_required(allowed_roles=["Admin", "Department Coordinator", "Faculty"])
def delete_student(student_id):
    user_role = session.get("role")
    user_dept = session.get("department", "All")
    conn = get_db_connection()

    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        abort(404, description="Student record not found.")

    if not can_access_student(user_role, user_dept, student["department"]):
        abort(403, description=f"Access Denied: You cannot delete students outside your department ({user_dept}).")

    name = student["name"]
    roll_number = student["roll_number"]
    dept = student["department"]

    conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "student_deleted", f"student_{roll_number}",
        f"Deleted student {name} ({roll_number}) from department {dept}",
        request.remote_addr
    )

    flash(f"Student {name} ({roll_number}) has been removed from the directory.", "info")
    return redirect(url_for("dashboard"))


# --------------------------------------------------------------------------
# Routes: Admin Management (Users & Roles & Audit Logs)
# --------------------------------------------------------------------------
@app.route("/admin/users", methods=["GET", "POST"])
@login_required(allowed_roles=["Admin"])
def admin_users():
    conn = get_db_connection()

    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "").strip()
        full_name = request.form.get("full_name", "").strip()
        role = request.form.get("role", "Faculty").strip()
        department = request.form.get("department", "CSE").strip().upper()

        if not username or not password or not full_name:
            flash("Username, password, and full name are required.", "danger")
            return redirect(url_for("admin_users"))

        if len(password) < 6:
            flash("Password must be at least 6 characters long.", "warning")
            return redirect(url_for("admin_users"))

        existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if existing:
            flash(f"User '{username}' already exists in the system.", "danger")
            return redirect(url_for("admin_users"))

        pass_hash = hash_password(password)
        conn.execute("""
            INSERT INTO users (username, password_hash, role, full_name, department, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (username, pass_hash, role, full_name, department))
        conn.commit()

        record_audit(
            conn, session.get("user_id"), session.get("username"),
            "user_created", f"user_{username}",
            f"Created account for {full_name} ({username}) with role {role} and department {department}",
            request.remote_addr
        )

        flash(f"Successfully created user account for '{username}' ({role}).", "success")
        return redirect(url_for("admin_users"))

    users = conn.execute("SELECT id, username, role, full_name, department, is_active, created_at FROM users ORDER BY id ASC").fetchall()
    return render_template("admin_users.html", users=users)


@app.route("/admin/users/<int:user_id>/toggle-status", methods=["POST"])
@login_required(allowed_roles=["Admin"])
def admin_toggle_user(user_id):
    if user_id == session.get("user_id"):
        flash("You cannot deactivate your own active admin session.", "danger")
        return redirect(url_for("admin_users"))

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("admin_users"))

    new_status = 0 if user["is_active"] else 1
    action_name = "user_deactivated" if new_status == 0 else "user_reactivated"

    conn.execute("UPDATE users SET is_active = ? WHERE id = ?", (new_status, user_id))
    conn.commit()

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        action_name, f"user_{user['username']}",
        f"Updated active state of {user['username']} to {'Active' if new_status else 'Deactivated'}",
        request.remote_addr
    )

    state_str = "reactivated" if new_status else "deactivated"
    flash(f"Account for '{user['username']}' has been {state_str}.", "info")
    return redirect(url_for("admin_users"))


@app.route("/admin/users/<int:user_id>/update-role", methods=["POST"])
@login_required(allowed_roles=["Admin"])
def admin_update_role(user_id):
    new_role = request.form.get("role", "Faculty").strip()
    new_dept = request.form.get("department", "CSE").strip()

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("admin_users"))

    conn.execute(
        "UPDATE users SET role = ?, department = ? WHERE id = ?",
        (new_role, new_dept, user_id)
    )
    conn.commit()

    record_audit(
        conn, session.get("user_id"), session.get("username"),
        "role_changed", f"user_{user['username']}",
        f"Modified {user['username']} role from {user['role']} to {new_role}, dept {user['department']} to {new_dept}",
        request.remote_addr
    )

    flash(f"Updated role for '{user['username']}' to {new_role} ({new_dept}).", "success")
    return redirect(url_for("admin_users"))


@app.route("/admin/audit-logs")
@login_required(allowed_roles=["Admin"])
def admin_audit_logs():
    action_filter = request.args.get("action", "").strip()

    conn = get_db_connection()
    if action_filter:
        logs = conn.execute(
            "SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT 200",
            (action_filter,)
        ).fetchall()
    else:
        logs = conn.execute(
            "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200"
        ).fetchall()

    return render_template("admin_audit_logs.html", logs=logs, selected_action=action_filter)


# --------------------------------------------------------------------------
# AI Voice Assistant Prototype Routes
# --------------------------------------------------------------------------
@app.route("/assistant")
@app.route("/voice-assistant")
def voice_assistant():
    """Renders the interactive AI Voice Assistant page."""
    status = voice_assistant_engine.get_service_status()
    return render_template("voice_assistant.html", service_status=status)


@app.route("/api/assistant/status", methods=["GET"])
def api_assistant_status():
    """Returns the operational status of the voice assistant pipeline."""
    return jsonify(voice_assistant_engine.get_service_status())


@app.route("/api/assistant/chat", methods=["POST"])
def api_assistant_chat():
    """
    Processes voice transcript / text message through the AI assistant engine.
    Supports Telugu & English, multi-turn history context, and returns speech-ready text.
    """
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    language = str(data.get("language", "en")).strip().lower()
    history = data.get("history", [])

    if not isinstance(history, list):
        history = []

    # Process through assistant engine
    result = voice_assistant_engine.generate_response(
        message=message,
        language=language,
        history=history
    )

    return jsonify(result)


# --------------------------------------------------------------------------
# Custom Error Handlers
# --------------------------------------------------------------------------
@app.errorhandler(403)
def forbidden_error(e):
    desc = getattr(e, "description", "Access Denied: You do not have permission to view or modify this resource.")
    return render_template("error.html", code=403, title="403 - Access Forbidden", description=desc), 403


@app.errorhandler(404)
def not_found_error(e):
    desc = getattr(e, "description", "The requested page or record could not be found.")
    return render_template("error.html", code=404, title="404 - Page Not Found", description=desc), 404


@app.errorhandler(413)
def request_entity_too_large(e):
    desc = "The uploaded file exceeds the maximum allowed size limit of 5 MB. Please reduce the file size and try again."
    return render_template("error.html", code=413, title="413 - File Too Large", description=desc), 413


@app.errorhandler(429)
def ratelimit_error(e):
    desc = getattr(e, "description", "Too many requests. Please wait a few moments before trying again.")
    return render_template("error.html", code=429, title="429 - Rate Limit Exceeded", description=desc), 429


# --------------------------------------------------------------------------
# Application Runner
# --------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Vignan Spandana System on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=is_debug)

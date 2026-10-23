"""
Comprehensive Integration Tests for Prompt 2 & Prompt 3:
- PROMPT 2: Student Management and Attendance
  1. Add, edit, and delete student records with required validation and phone checks
  2. Store ID, name, class/year, department, section, parent name, relationship, phone, language
  3. Mark students Present or Absent for selected date
  4. Save attendance persistently in SQLite database
  5. Display total, present, and absent student counts
  6. Search and filter student roster
  7. Confirm refresh does not erase saved attendance data
  8. Test with 5 fictional students: 3 Present, 2 Absent, counts verified

- PROMPT 3: Automatic Parent Calling Queue
  1. Prominent CALL PARENTS button at bottom of attendance dashboard
  2. Sequential queue finds all Absent students for selected date
  3. Strictly excludes Present students (confirming only the 2 absent students enter queue)
  4. Validate authorized parent contacts (validates 10-15 digit phone format)
  5. Sequential queue displays queue position, student name, relationship, contact status
  6. Process one student at a time
  7. Prevent duplicate queue entries and duplicate calls (HTTP 409 Conflict)
  8. Start, Stop, and Skip controls
  9. Record processing status and failure reason
  10. Skip missing/invalid numbers with recorded explanation and follow-up ticket
"""

import pytest
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
def auth_admin():
    """Logs in as Admin."""
    client = app.test_client()
    with client.session_transaction() as sess:
        sess["user_id"] = 1
        sess["username"] = "admin"
        sess["full_name"] = "Administrator"
        sess["role"] = "Admin"
        sess["department"] = "All"
    return client


@pytest.fixture
def five_fictional_students(auth_faculty_cse):
    """
    Creates 5 distinct fictional students in CSE department with valid 10-digit parent numbers
    and different parent relationships for Prompt 2 & Prompt 3 testing.
    Cleaned up after test run.
    """
    conn = get_db_connection()
    test_rolls = [
        "211FA04991", "211FA04992", "211FA04993", "211FA04994", "211FA04995"
    ]

    try:
        # Clean existing test data
        placeholders = ",".join("?" for _ in test_rolls)
        conn.execute(f"DELETE FROM students WHERE roll_number IN ({placeholders})", test_rolls)
        conn.commit()

        students_data = [
            {
                "roll_number": "211FA04991",
                "name": "K. Ananya",
                "department": "CSE",
                "year_semester": "III Year - Sem 1",
                "section": "Z",
                "student_phone": "9848111111",
                "student_email": "ananya.k@vignan.ac.in",
                "parent_name": "K. Narayana",
                "parent_relationship": "Father",
                "parent_phone": "9848222222",
                "preferred_language": "Telugu",
                "attendance_percentage": 88.0,
                "marks_info": "CGPA: 8.8, Mid-1: 85/100"
            },
            {
                "roll_number": "211FA04992",
                "name": "M. Rahul",
                "department": "CSE",
                "year_semester": "III Year - Sem 1",
                "section": "Z",
                "student_phone": "9848333333",
                "student_email": "rahul.m@vignan.ac.in",
                "parent_name": "M. Lakshmi",
                "parent_relationship": "Mother",
                "parent_phone": "9848444444",
                "preferred_language": "Telugu",
                "attendance_percentage": 82.5,
                "marks_info": "CGPA: 8.1, Mid-1: 78/100"
            },
            {
                "roll_number": "211FA04993",
                "name": "S. Sneha",
                "department": "CSE",
                "year_semester": "III Year - Sem 1",
                "section": "Z",
                "student_phone": "9848555555",
                "student_email": "sneha.s@vignan.ac.in",
                "parent_name": "S. Raghava",
                "parent_relationship": "Guardian",
                "parent_phone": "9848666666",
                "preferred_language": "English",
                "attendance_percentage": 79.0,
                "marks_info": "CGPA: 7.9, Mid-1: 74/100"
            },
            {
                "roll_number": "211FA04994",
                "name": "P. Karthik",
                "department": "CSE",
                "year_semester": "III Year - Sem 1",
                "section": "Z",
                "student_phone": "9848777777",
                "student_email": "karthik.p@vignan.ac.in",
                "parent_name": "P. Venkatesh",
                "parent_relationship": "Father",
                "parent_phone": "9848888888",
                "preferred_language": "Telugu",
                "attendance_percentage": 71.5,
                "marks_info": "CGPA: 6.9, Mid-1: 62/100"
            },
            {
                "roll_number": "211FA04995",
                "name": "B. Divya",
                "department": "CSE",
                "year_semester": "III Year - Sem 1",
                "section": "Z",
                "student_phone": "9848999991",
                "student_email": "divya.b@vignan.ac.in",
                "parent_name": "B. Shanti",
                "parent_relationship": "Mother",
                "parent_phone": "9848999992",
                "preferred_language": "English",
                "attendance_percentage": 73.0,
                "marks_info": "CGPA: 7.2, Mid-1: 68/100"
            }
        ]

        inserted_ids = []
        for s in students_data:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO students (
                    roll_number, name, department, year_semester, section,
                    student_phone, student_email, parent_name, parent_relationship,
                    parent_phone, preferred_language, attendance_percentage, marks_info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s["roll_number"], s["name"], s["department"], s["year_semester"], s["section"],
                s["student_phone"], s["student_email"], s["parent_name"], s["parent_relationship"],
                s["parent_phone"], s["preferred_language"], s["attendance_percentage"], s["marks_info"]
            ))
            inserted_ids.append(cur.lastrowid)
        conn.commit()
    finally:
        conn.close()

    yield {
        "test_rolls": test_rolls,
        "inserted_ids": inserted_ids,
        "students_data": students_data
    }

    # Teardown
    conn = get_db_connection()
    try:
        placeholders = ",".join("?" for _ in test_rolls)
        id_placeholders = ",".join("?" for _ in inserted_ids)
        conn.execute(f"DELETE FROM attendance_records WHERE student_id IN ({id_placeholders})", inserted_ids)
        conn.execute(f"DELETE FROM call_records WHERE student_id IN ({id_placeholders})", inserted_ids)
        conn.execute(f"DELETE FROM follow_ups WHERE student_id IN ({id_placeholders})", inserted_ids)
        conn.execute(f"DELETE FROM students WHERE roll_number IN ({placeholders})", test_rolls)
        conn.commit()
    finally:
        conn.close()


# ==============================================================================
# PROMPT 2 TESTS: STUDENT MANAGEMENT AND ATTENDANCE
# ==============================================================================

def test_prompt2_field_validation_and_phone_checks(auth_faculty_cse):
    """
    Test validation of required fields and 10-digit phone number validation on /add-student.
    """
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM students WHERE roll_number IN ('211FA04888', '211FA04889')")
        conn.commit()
    finally:
        conn.close()

    # 1. Invalid phone number (less than 10 digits)
    resp = auth_faculty_cse.post("/add-student", data={
        "roll_number": "211FA04888",
        "name": "Invalid Phone Student",
        "department": "CSE",
        "year_semester": "III Year - Sem 1",
        "section": "A",
        "parent_name": "Test Parent",
        "parent_relationship": "Father",
        "parent_phone": "12345",  # Invalid!
        "preferred_language": "Telugu"
    }, follow_redirects=True)
    assert b"Invalid parent phone" in resp.data or b"Please enter a valid 10-digit number" in resp.data

    # 2. Missing required fields (e.g. empty student name)
    resp2 = auth_faculty_cse.post("/add-student", data={
        "roll_number": "211FA04889",
        "name": "",  # Missing!
        "department": "CSE",
        "year_semester": "III Year - Sem 1",
        "section": "A",
        "parent_name": "Test Parent",
        "parent_phone": "9848011223",
        "preferred_language": "Telugu"
    }, follow_redirects=True)
    assert b"Roll Number, Student Name, and Parent Mobile Phone are required" in resp2.data


def test_prompt2_edit_student_record(auth_faculty_cse, five_fictional_students):
    """
    Test editing student details (name, parent relationship, phone, language) and persistent update.
    """
    student_id = five_fictional_students["inserted_ids"][0]

    # Verify GET edit page loads with pre-populated values
    get_resp = auth_faculty_cse.get(f"/student/{student_id}/edit")
    assert get_resp.status_code == 200
    assert b"Edit Student Record" in get_resp.data
    assert b"211FA04991" in get_resp.data
    assert b"K. Ananya" in get_resp.data

    # Post update: update name to 'K. Ananya Sharma', relationship to 'Mother', phone to '9848222333'
    post_resp = auth_faculty_cse.post(f"/student/{student_id}/edit", data={
        "roll_number": "211FA04991",
        "name": "K. Ananya Sharma",
        "department": "CSE",
        "year_semester": "III Year - Sem 2",
        "section": "Z",
        "student_phone": "9848111999",
        "student_email": "ananya.sharma@vignan.ac.in",
        "parent_name": "K. Sharda",
        "parent_relationship": "Mother",
        "parent_phone": "9848222333",
        "preferred_language": "English",
        "attendance_percentage": "90.0",
        "marks_info": "CGPA: 9.0"
    }, follow_redirects=True)
    assert post_resp.status_code == 200

    # Verify in DB
    conn = get_db_connection()
    try:
        updated = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        assert updated["name"] == "K. Ananya Sharma"
        assert updated["parent_relationship"] == "Mother"
        assert updated["parent_phone"] == "9848222333"
        assert updated["preferred_language"] == "English"
        assert updated["year_semester"] == "III Year - Sem 2"
    finally:
        conn.close()


def test_prompt2_delete_student_record(auth_faculty_cse):
    """
    Test deleting a student record and verifying removal from directory.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO students (roll_number, name, department, year_semester, section, parent_name, parent_phone)
            VALUES ('211FA04999', 'To Be Deleted', 'CSE', 'III Year - Sem 1', 'A', 'Parent Test', '9848099887')
        """)
        del_id = cur.lastrowid
        conn.commit()
    finally:
        conn.close()

    # Delete request
    resp = auth_faculty_cse.post(f"/student/{del_id}/delete", follow_redirects=True)
    assert resp.status_code == 200
    assert b"has been removed from the directory" in resp.data

    # Verify deletion in DB
    conn = get_db_connection()
    try:
        check = conn.execute("SELECT * FROM students WHERE id = ?", (del_id,)).fetchone()
        assert check is None
    finally:
        conn.close()


def test_prompt2_mark_attendance_three_present_two_absent_and_refresh_persistence(auth_faculty_cse, five_fictional_students):
    """
    TEST REQUIREMENT:
    Add five students, mark three Present and two Absent, check counts, refresh, and confirm records remain saved.
    """
    ids = five_fictional_students["inserted_ids"]
    test_date = "2026-10-24"

    # We mark first 3 Present, and last 2 Absent
    form_data = {
        "department": "CSE",
        "section": "Z",
        "year_semester": "All",
        "attendance_date": test_date,
        f"status_{ids[0]}": "Present",
        f"status_{ids[1]}": "Present",
        f"status_{ids[2]}": "Present",
        f"status_{ids[3]}": "Absent",
        f"status_{ids[4]}": "Absent"
    }

    # 1. Post daily attendance
    post_resp = auth_faculty_cse.post("/attendance/mark", data=form_data, follow_redirects=True)
    assert post_resp.status_code == 200
    assert b"Successfully saved attendance for 5 students" in post_resp.data
    assert b"3 Present, 2 Absent" in post_resp.data

    # 2. Check counts on page
    html = post_resp.data.decode("utf-8")
    assert 'id="statTotal"' in html
    assert 'id="statPresent"' in html
    assert 'id="statAbsent"' in html

    # 3. Verify directly in SQLite persistence
    conn = get_db_connection()
    try:
        records = conn.execute("""
            SELECT student_id, status FROM attendance_records
            WHERE attendance_date = ? AND student_id IN (?, ?, ?, ?, ?)
            ORDER BY student_id ASC
        """, [test_date] + ids).fetchall()

        assert len(records) == 5
        status_map = {r["student_id"]: r["status"] for r in records}
        assert status_map[ids[0]] == "Present"
        assert status_map[ids[1]] == "Present"
        assert status_map[ids[2]] == "Present"
        assert status_map[ids[3]] == "Absent"
        assert status_map[ids[4]] == "Absent"
    finally:
        conn.close()

    # 4. Refresh: Perform a GET request on /attendance/mark for the same department, section, and date
    refresh_resp = auth_faculty_cse.get(f"/attendance/mark?dept=CSE&section=Z&date={test_date}")
    assert refresh_resp.status_code == 200
    refresh_html = refresh_resp.data.decode("utf-8")

    # Confirm Existing Record Loaded alert is displayed (records remain saved across refresh)
    assert "Existing Record Loaded" in refresh_html
    assert "Saved in SQLite" in refresh_html

    # Confirm status radio presence
    for s_id in ids:
        assert f'name="status_{s_id}"' in refresh_html


def test_prompt2_roster_search_filtering(auth_faculty_cse):
    """
    Test presence of instant roster search and filter components.
    """
    resp = auth_faculty_cse.get("/attendance/mark?dept=CSE")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")
    assert 'id="rosterSearch"' in html
    assert 'filterRosterTable()' in html


# ==============================================================================
# PROMPT 3 TESTS: AUTOMATIC CALLING QUEUE
# ==============================================================================

def test_prompt3_prominent_call_parents_button_rendered(auth_faculty_cse, five_fictional_students):
    """
    PROMPT 3 — Requirement 1:
    Add a prominent CALL PARENTS button at the bottom of the attendance dashboard.
    """
    ids = five_fictional_students["inserted_ids"]
    test_date = "2026-10-24"

    # Save attendance (3 Present, 2 Absent)
    auth_faculty_cse.post("/attendance/mark", data={
        "department": "CSE",
        "section": "Z",
        "attendance_date": test_date,
        f"status_{ids[0]}": "Present",
        f"status_{ids[1]}": "Present",
        f"status_{ids[2]}": "Present",
        f"status_{ids[3]}": "Absent",
        f"status_{ids[4]}": "Absent"
    }, follow_redirects=True)

    resp = auth_faculty_cse.get(f"/attendance/mark?dept=CSE&section=Z&date={test_date}")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")

    # Prominent bottom CALL PARENTS button
    assert 'id="btnCallParentsBottom"' in html
    assert "CALL PARENTS" in html
    assert "openCallQueueModal" in html


def test_prompt3_queue_strictly_selects_only_absent_students(auth_faculty_cse, five_fictional_students):
    """
    PROMPT 3 — Requirements 2 & 3:
    - Find all students marked Absent for the selected date.
    - Do not select Present students.
    - Test with five fictional students and confirm only the two absent students enter the queue.
    """
    ids = five_fictional_students["inserted_ids"]
    test_date = "2026-10-24"

    # Save attendance: 3 Present (ids[0], ids[1], ids[2]), 2 Absent (ids[3], ids[4])
    auth_faculty_cse.post("/attendance/mark", data={
        "department": "CSE",
        "section": "Z",
        "attendance_date": test_date,
        f"status_{ids[0]}": "Present",
        f"status_{ids[1]}": "Present",
        f"status_{ids[2]}": "Present",
        f"status_{ids[3]}": "Absent",
        f"status_{ids[4]}": "Absent"
    }, follow_redirects=True)

    # Fetch queue
    resp = auth_faculty_cse.get(f"/attendance/queue?dept=CSE&date={test_date}")
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["success"] is True
    assert data["total_absent"] == 2
    assert len(data["queue"]) == 2

    queued_ids = [s["id"] for s in data["queue"]]
    # Confirm strictly only the 2 absent students enter queue
    assert ids[3] in queued_ids
    assert ids[4] in queued_ids

    # Confirm present students are strictly excluded
    assert ids[0] not in queued_ids
    assert ids[1] not in queued_ids
    assert ids[2] not in queued_ids

    # Check queue position and details
    assert data["queue"][0]["queue_position"] == 1
    assert data["queue"][1]["queue_position"] == 2
    assert data["queue"][0]["phone_valid"] is True
    assert data["queue"][0]["contact_status"] == "Eligible"
    assert "parent_relationship" in data["queue"][0]


def test_prompt3_process_one_student_and_prevent_duplicates(auth_faculty_cse, five_fictional_students):
    """
    PROMPT 3 — Requirements 5, 6, 7, 8:
    - Process one student at a time.
    - Record processing status and failure reason.
    - Prevent duplicate queue entries and duplicate calls (HTTP 409).
    """
    ids = five_fictional_students["inserted_ids"]
    test_date = "2026-10-24"

    # Save attendance
    auth_faculty_cse.post("/attendance/mark", data={
        "department": "CSE",
        "section": "Z",
        "attendance_date": test_date,
        f"status_{ids[0]}": "Present",
        f"status_{ids[1]}": "Present",
        f"status_{ids[2]}": "Present",
        f"status_{ids[3]}": "Absent",
        f"status_{ids[4]}": "Absent"
    }, follow_redirects=True)

    # Process first absent student (ids[3])
    resp1 = auth_faculty_cse.post("/attendance/queue/process", json={
        "student_id": ids[3],
        "attendance_date": test_date,
        "language": "Telugu"
    })
    assert resp1.status_code == 200
    data1 = resp1.get_json()
    assert data1["success"] is True
    assert data1["status"] == "Completed"
    assert "call_record_id" in data1
    assert "followup_id" in data1
    call_id = data1["call_record_id"]

    # Verify SQLite attendance record links the call_record_id
    conn = get_db_connection()
    try:
        att_row = conn.execute("SELECT * FROM attendance_records WHERE student_id = ? AND attendance_date = ?", (ids[3], test_date)).fetchone()
        assert att_row["call_record_id"] == call_id
    finally:
        conn.close()

    # Attempt to process the same student again for the same date -> Duplicate prevented (HTTP 409)
    resp_dup = auth_faculty_cse.post("/attendance/queue/process", json={
        "student_id": ids[3],
        "attendance_date": test_date
    })
    assert resp_dup.status_code == 409
    data_dup = resp_dup.get_json()
    assert data_dup["duplicate"] is True
    assert data_dup["call_record_id"] == call_id

    # Now re-query queue: student 1 should be in already_called, student 2 still in queue
    q_resp = auth_faculty_cse.get(f"/attendance/queue?dept=CSE&date={test_date}")
    q_data = q_resp.get_json()
    assert len(q_data["queue"]) == 1
    assert q_data["queue"][0]["id"] == ids[4]
    assert len(q_data["already_called"]) == 1
    assert q_data["already_called"][0]["id"] == ids[3]


def test_prompt3_skip_control_and_followup_ticket(auth_faculty_cse, five_fictional_students):
    """
    PROMPT 3 — Requirements 9 & 10:
    - Provide Skip controls.
    - Record each student's processing status and reason.
    """
    ids = five_fictional_students["inserted_ids"]
    test_date = "2026-10-24"

    # Save attendance
    auth_faculty_cse.post("/attendance/mark", data={
        "department": "CSE",
        "section": "Z",
        "attendance_date": test_date,
        f"status_{ids[0]}": "Present",
        f"status_{ids[1]}": "Present",
        f"status_{ids[2]}": "Present",
        f"status_{ids[3]}": "Absent",
        f"status_{ids[4]}": "Absent"
    }, follow_redirects=True)

    # Teacher skips student 2 (ids[4]) with a custom reason
    skip_resp = auth_faculty_cse.post("/attendance/queue/process", json={
        "student_id": ids[4],
        "attendance_date": test_date,
        "action": "skip",
        "reason": "Parent informed in advance of medical appointment"
    })
    assert skip_resp.status_code == 200
    skip_data = skip_resp.get_json()
    assert skip_data["success"] is True
    assert skip_data["status"] == "Skipped"
    assert "medical appointment" in skip_data["reason"]
    assert "followup_id" in skip_data

    # Verify a follow-up ticket was created in DB
    conn = get_db_connection()
    try:
        fu = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (skip_data["followup_id"],)).fetchone()
        assert fu is not None
        assert "medical appointment" in fu["notes"]
    finally:
        conn.close()


def test_prompt3_skip_missing_or_invalid_phone_numbers(auth_faculty_cse):
    """
    PROMPT 3 — Requirements 10 & 11:
    - Skip missing/invalid numbers and explain why.
    """
    conn = get_db_connection()
    try:
        # Insert a student with invalid phone number
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO students (roll_number, name, department, year_semester, section, parent_name, parent_phone)
            VALUES ('211FA04998', 'No Phone Student', 'CSE', 'III Year - Sem 1', 'A', 'Test Parent', '123')
        """)
        invalid_student_id = cur.lastrowid

        test_date = "2026-10-25"
        cur.execute("""
            INSERT INTO attendance_records (student_id, attendance_date, status, marked_by)
            VALUES (?, ?, 'Absent', 'faculty_cse')
        """, (invalid_student_id, test_date))
        conn.commit()
    finally:
        conn.close()

    try:
        # Query queue: verify flagged as Invalid Phone
        q_resp = auth_faculty_cse.get(f"/attendance/queue?dept=CSE&date={test_date}")
        q_data = q_resp.get_json()
        invalid_item = next(s for s in q_data["queue"] if s["id"] == invalid_student_id)
        assert invalid_item["phone_valid"] is False
        assert invalid_item["contact_status"] == "Invalid Phone"
        assert "Invalid phone format" in invalid_item["failure_reason"]

        # Process queue item: backend skips call and creates follow-up ticket
        proc_resp = auth_faculty_cse.post("/attendance/queue/process", json={
            "student_id": invalid_student_id,
            "attendance_date": test_date
        })
        assert proc_resp.status_code == 200
        proc_data = proc_resp.get_json()
        assert proc_data["skipped"] is True
        assert proc_data["status"] == "Skipped - Invalid Contact"
        assert "Invalid or missing parent mobile number" in proc_data["failure_reason"]

        # Verify follow-up verification ticket created
        conn = get_db_connection()
        try:
            fu = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (proc_data["followup_id"],)).fetchone()
            assert fu is not None
            assert "Immediate phone number verification required" in fu["notes"]
        finally:
            conn.close()
    finally:
        # Clean up
        conn = get_db_connection()
        try:
            conn.execute("DELETE FROM follow_ups WHERE student_id = ?", (invalid_student_id,))
            conn.execute("DELETE FROM attendance_records WHERE student_id = ?", (invalid_student_id,))
            conn.execute("DELETE FROM students WHERE id = ?", (invalid_student_id,))
            conn.commit()
        finally:
            conn.close()


def test_prompt3_teacher_confirmation_ui_elements(auth_faculty_cse):
    """
    PROMPT 3 — Requirement 12:
    - Require teacher confirmation before a real calling campaign.
    """
    resp = auth_faculty_cse.get("/attendance/mark?dept=CSE")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")
    assert 'id="queueControlCard"' in html
    assert 'Faculty Confirmation Required' in html
    assert 'btnStartQueueExec' in html
    assert 'btnStopQueueExec' in html
    assert 'btnSkipQueueExec' in html

"""
Vignan Spandana - Demo Database Reset and Seed Script
Resets the database to a clean, deterministic demo state with 10 fake students
across 2 departments (CSE & ECE), covering all required test cases:
- Good attendance (>= 75%)
- Low attendance (< 75%)
- Missing phone number
- Missing marks value
- Missing attendance value
- Pre-populated demo call history and follow-up tickets

Also generates:
- sample_import_good.xlsx (5 valid rows)
- sample_import_errors.xlsx (duplicate roll numbers, invalid phone, out-of-range attendance, formulas)

Safe to run repeatedly.
"""

import os
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from database import DB_PATH, init_db, get_db_connection

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GOOD_EXCEL_PATH = os.path.join(BASE_DIR, "sample_import_good.xlsx")
ERROR_EXCEL_PATH = os.path.join(BASE_DIR, "sample_import_errors.xlsx")


def reset_and_seed_database(target_db_path=DB_PATH):
    """Resets database and seeds fresh demo data."""
    print(f"[*] Resetting database at: {target_db_path}")

    # Drop tables cleanly so table schema updates take effect
    if os.path.exists(target_db_path):
        conn = sqlite3.connect(target_db_path)
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS audit_logs")
        cursor.execute("DROP TABLE IF EXISTS follow_ups")
        cursor.execute("DROP TABLE IF EXISTS call_records")
        cursor.execute("DROP TABLE IF EXISTS students")
        cursor.execute("DROP TABLE IF EXISTS users")
        conn.commit()
        conn.close()

    # Recreate tables with clean updated schema
    init_db(seed_data=False, db_path=target_db_path)

    conn = get_db_connection(target_db_path)
    cursor = conn.cursor()

    # 1. Seed Demo Users with Secure Hashes
    users = [
        ("admin", "admin123", "Admin", "Dean of Academics (Admin)", "All", 1),
        ("principal", "principal123", "Principal", "Dr. K. V. S. Murthy (Principal)", "All", 1),
        ("coord_cse", "coord123", "Department Coordinator", "Prof. M. Sridhar (CSE Coord)", "CSE", 1),
        ("coord_ece", "coord123", "Department Coordinator", "Prof. V. Radhika (ECE Coord)", "ECE", 1),
        ("faculty_cse", "faculty123", "Faculty", "Dr. A. Srinivas (CSE Faculty)", "CSE", 1),
        ("faculty_ece", "faculty123", "Faculty", "Dr. P. Madhavi (ECE Faculty)", "ECE", 1),
    ]

    for username, plain_pass, role, full_name, dept, is_active in users:
        pass_hash = generate_password_hash(plain_pass)
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, full_name, department, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (username, pass_hash, role, full_name, dept, is_active))

    print(f"[+] Seeded {len(users)} institutional user accounts.")

    # 2. Seed 10 Fake Students across CSE & ECE
    # Cases:
    # 1. Good attendance (>= 75%)
    # 2. Low attendance (< 75%)
    # 3. Missing phone number
    # 4. Missing marks value
    # 5. Missing attendance value
    students = [
        # --- CSE Department (5 students) ---
        (
            "211FA04001", "K. Sai Praneeth", "CSE", "III Year - Sem 1", "A",
            "K. Venkateswara Rao", "+91 98480 11001", "Telugu", 91.5, "88/100 (Mid-1)"
        ),
        (
            "211FA04018", "B. Divya Sri", "CSE", "III Year - Sem 1", "A",
            "B. Nageswara Rao", "+91 98480 11002", "Telugu", 64.0, "52/100 (Mid-1)"
        ),
        (
            "211FA04035", "M. Tarun Teja", "CSE", "III Year - Sem 1", "B",
            "M. Satyanarayana", None, "Telugu", 82.0, "76/100 (Mid-1)"  # Missing phone
        ),
        (
            "211FA04049", "Kavya Sharma", "CSE", "III Year - Sem 1", "B",
            "Ramesh Sharma", "+91 98480 11004", "English", 78.5, None  # Missing marks
        ),
        (
            "211FA04062", "Ravi Kumar Varma", "CSE", "III Year - Sem 1", "C",
            "R. V. V. Satyanarayana", "+91 98480 11005", "Telugu", None, "84/100 (Mid-1)"  # Missing attendance
        ),

        # --- ECE Department (5 students) ---
        (
            "211FA05001", "P. Ananya Sharma", "ECE", "III Year - Sem 1", "A",
            "P. Suresh Sharma", "+91 98480 22001", "English", 89.0, "92/100 (Mid-1)"
        ),
        (
            "211FA05022", "R. Sneha Latha", "ECE", "III Year - Sem 1", "A",
            "R. Prabhakar", "+91 98480 22002", "Telugu", 61.5, "48/100 (Mid-1)"  # Low attendance
        ),
        (
            "211FA05040", "Manoj Varma", "ECE", "III Year - Sem 1", "B",
            "M. Krishnam Raju", "", "Telugu", 85.0, "79/100 (Mid-1)"  # Missing phone
        ),
        (
            "211FA05058", "Pooja Reddy", "ECE", "III Year - Sem 1", "B",
            "Venkat Reddy", "+91 98480 22004", "English", 71.0, None  # Missing marks & low attendance
        ),
        (
            "211FA05075", "Aditya Krishna", "ECE", "III Year - Sem 1", "C",
            "A. Gopala Krishna", "+91 98480 22005", "Telugu", None, "77/100 (Mid-1)"  # Missing attendance
        ),
    ]

    cursor.executemany("""
        INSERT INTO students (
            roll_number, name, department, year_semester, section,
            parent_name, parent_phone, preferred_language, attendance_percentage, marks_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, students)

    print(f"[+] Seeded {len(students)} fake student profiles across CSE and ECE.")

    # 3. Seed Demo Call Records and Linked Follow-Up Tickets
    now = datetime.now()

    # Call 1: CSE student with low attendance (Telugu)
    cursor.execute("SELECT id FROM students WHERE roll_number = '211FA04018'")
    divya_id = cursor.fetchone()[0]

    call_1_time = now - timedelta(hours=2)
    start_1 = call_1_time - timedelta(seconds=45)
    end_1 = call_1_time

    cursor.execute("""
        INSERT INTO follow_ups (
            student_id, teacher_name, assigned_to, due_date, status, notes, action_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        divya_id,
        "AI System (Escalated to CSE Faculty)",
        "Dr. A. Srinivas (CSE Faculty)",
        (now + timedelta(days=2)).strftime("%Y-%m-%d"),
        "open",
        "Parent inquired regarding 12 marks deducted in Mid-1 DBMS exam. Callback requested.",
        "Faculty callback regarding exam re-evaluation for B. Divya Sri"
    ))
    fu_1_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO call_records (
            student_id, status, language, duration_seconds, start_time, end_time,
            transcript, summary, notes, initiated_by, followup_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        divya_id,
        "Completed",
        "Telugu",
        45,
        start_1.strftime("%Y-%m-%d %H:%M:%S"),
        end_1.strftime("%Y-%m-%d %H:%M:%S"),
        "[AI Assistant]: నమస్కారం, నేను విజ్ఞాన్స్ ఇన్స్టిట్యూట్ నుండి మాట్లాడుతున్న ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ సహాయకురాలిని.\n[AI Assistant]: నేను B. Divya Sri గారి తల్లి లేదా తండ్రితో మాట్లాడుతున్నానా అండి?\n[Parent]: అవును, నేను తండ్రినే మాట్లాడుతున్నాను.\n[AI Assistant]: కాలేజ్ నుండి అకడమిక్ వివరాలు తెలియజేయడానికి కాల్ చేశాను. విద్యార్థి ప్రస్తుత హాజరు 64.0% గా నమోదైంది. ఈ హాజరు 75% కనీస పరిమితి కంటే తక్కువగా ఉంది.\n[Parent]: పరీక్ష మార్కులు ఎందుకు తక్కువగా వచ్చాయి? పేపర్ రీ-ఇవాల్యుయేషన్ సాధ్యమా?\n[AI Assistant]: పరీక్ష మూల్యాంకనం నా పరిధిలో లేదు. CSE ఫ్యాకల్టీ మీకు తిరిగి కాల్ చేస్తారు.\n[AI Assistant]: ధన్యవాదాలు. సెలవు!",
        "హాజరు సమాచారం (64.0%). పరీక్ష మార్కుల పునఃపరిశీలనపై CSE ఫ్యాకల్టీ కాల్‌బ్యాక్ టికెట్ కేటాయించబడింది.",
        "Demo mode: simulated call",
        "Prof. M. Sridhar (CSE Coord)",
        fu_1_id
    ))
    call_1_id = cursor.lastrowid
    cursor.execute("UPDATE follow_ups SET call_record_id = ? WHERE id = ?", (call_1_id, fu_1_id))

    # Call 2: ECE student with good attendance (English)
    cursor.execute("SELECT id FROM students WHERE roll_number = '211FA05001'")
    ananya_id = cursor.fetchone()[0]

    call_2_time = now - timedelta(hours=5)
    start_2 = call_2_time - timedelta(seconds=45)
    end_2 = call_2_time

    cursor.execute("""
        INSERT INTO follow_ups (
            student_id, teacher_name, assigned_to, due_date, status, notes, action_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        ananya_id,
        "AI System (Escalated to ECE Faculty)",
        "Dr. P. Madhavi (ECE Faculty)",
        (now + timedelta(days=1)).strftime("%Y-%m-%d"),
        "in progress",
        "Parent asked about upcoming National Hackathon sponsorship guidelines.",
        "Faculty mentor consultation regarding project funding for P. Ananya Sharma"
    ))
    fu_2_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO call_records (
            student_id, status, language, duration_seconds, start_time, end_time,
            transcript, summary, notes, initiated_by, followup_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ananya_id,
        "Completed",
        "English",
        45,
        start_2.strftime("%Y-%m-%d %H:%M:%S"),
        end_2.strftime("%Y-%m-%d %H:%M:%S"),
        "[AI Assistant]: Hello, I am the automated AI Assistant calling from Vignan's Institute of Information Technology.\n[AI Assistant]: Am I speaking with the parent of P. Ananya Sharma?\n[Parent]: Yes, I am speaking. How can I help you?\n[AI Assistant]: I am calling to share an academic progress update. Overall attendance is 89.0%. Latest internal score: 92/100 (Mid-1). The student is maintaining satisfactory attendance.\n[Parent]: That is great. How can she apply for travel sponsorship for the upcoming smart India hackathon?\n[AI Assistant]: I am escalating this inquiry to the ECE Faculty Coordinator who will call you back.\n[AI Assistant]: Thank you for your cooperation.",
        "Attendance update (89.0%). Parent inquired regarding hackathon travel sponsorship; escalated to ECE faculty callback.",
        "Demo mode: simulated call",
        "Prof. V. Radhika (ECE Coord)",
        fu_2_id
    ))
    call_2_id = cursor.lastrowid
    cursor.execute("UPDATE follow_ups SET call_record_id = ? WHERE id = ?", (call_2_id, fu_2_id))

    # 4. Seed Sample Daily Attendance Records (Recent days)
    cursor.execute("SELECT id, roll_number FROM students")
    all_students = cursor.fetchall()
    sample_dates = ["2026-10-20", "2026-10-21", "2026-10-22"]
    for s_row in all_students:
        s_id = s_row[0]
        roll = s_row[1]
        # Keep students with intentionally missing attendance unrecorded
        if roll not in ("211FA04062", "211FA05075"):
            for dt in sample_dates:
                # Student 2 (B. Divya Sri) marked Absent on 2026-10-22 to showcase absent student escalation
                status = "Absent" if (s_id == divya_id and dt == "2026-10-22") else "Present"
                cursor.execute("""
                    INSERT INTO attendance_records (student_id, attendance_date, status, marked_by)
                    VALUES (?, ?, ?, 'Dr. A. Srinivas (CSE Faculty)')
                """, (s_id, dt, status))

    # Audit log
    cursor.execute("""
        INSERT INTO audit_logs (username, action, resource, details, ip_address)
        VALUES ('system_seed', 'database_reset', 'system', 'Reset demo state with 10 students, 2 calls, 2 follow-ups, and daily attendance logs', '127.0.0.1')
    """)

    conn.commit()
    conn.close()
    print("[+] Successfully seeded demo call records, follow-up tickets, and daily attendance.")


def generate_sample_spreadsheets():
    """Generates sample Excel files for the two-step import demo."""
    # 1. sample_import_good.xlsx (5 valid rows with clean data)
    good_rows = [
        {
            "roll_number": "211FA04201",
            "name": "N. Sravan Kumar",
            "department": "CSE",
            "year_semester": "III Year - Sem 1",
            "section": "A",
            "parent_name": "N. Prasad",
            "parent_phone": "+91 98480 33001",
            "preferred_language": "Telugu",
            "attendance_percentage": 86.5
        },
        {
            "roll_number": "211FA04202",
            "name": "G. Keerthana",
            "department": "CSE",
            "year_semester": "III Year - Sem 1",
            "section": "B",
            "parent_name": "G. Subba Rao",
            "parent_phone": "+91 98480 33002",
            "preferred_language": "English",
            "attendance_percentage": 73.0
        },
        {
            "roll_number": "211FA05201",
            "name": "Ch. Sai Teja",
            "department": "ECE",
            "year_semester": "III Year - Sem 1",
            "section": "A",
            "parent_name": "Ch. Appa Rao",
            "parent_phone": "+91 98480 44001",
            "preferred_language": "Telugu",
            "attendance_percentage": 94.0
        },
        {
            "roll_number": "211FA05202",
            "name": "K. Meenakshi",
            "department": "ECE",
            "year_semester": "III Year - Sem 1",
            "section": "B",
            "parent_name": "K. Ramana",
            "parent_phone": "+91 98480 44002",
            "preferred_language": "Telugu",
            "attendance_percentage": 81.5
        },
        {
            "roll_number": "211FA05203",
            "name": "V. Nikhil Kumar",
            "department": "ECE",
            "year_semester": "III Year - Sem 1",
            "section": "C",
            "parent_name": "V. Jagannadham",
            "parent_phone": "+91 98480 44003",
            "preferred_language": "English",
            "attendance_percentage": 68.0
        }
    ]

    df_good = pd.DataFrame(good_rows)
    df_good.to_excel(GOOD_EXCEL_PATH, index=False)
    print(f"[+] Created clean import spreadsheet: {GOOD_EXCEL_PATH}")

    # 2. sample_import_errors.xlsx (Contains intentional errors for demo)
    # - Duplicate roll number in file
    # - Invalid 10-digit phone
    # - Attendance > 100% or < 0%
    # - Missing mandatory name
    # - Formula cell (=1+1) for formula neutralization demo
    error_rows = [
        {
            "roll_number": "211FA04991",
            "name": "P. Valid Record One",
            "department": "CSE",
            "year_semester": "III Year - Sem 1",
            "section": "A",
            "parent_name": "P. Parent",
            "parent_phone": "+91 98480 99001",
            "preferred_language": "Telugu",
            "attendance_percentage": 88.0
        },
        {
            "roll_number": "211FA04991",  # Duplicate roll number in file!
            "name": "P. Duplicate Roll in File",
            "department": "CSE",
            "year_semester": "III Year - Sem 1",
            "section": "A",
            "parent_name": "P. Parent",
            "parent_phone": "+91 98480 99002",
            "preferred_language": "Telugu",
            "attendance_percentage": 76.0
        },
        {
            "roll_number": "211FA04992",
            "name": "T. Bad Phone Number",
            "department": "CSE",
            "year_semester": "III Year - Sem 1",
            "section": "B",
            "parent_name": "T. Parent",
            "parent_phone": "12345",  # Invalid phone (less than 10 digits)
            "preferred_language": "English",
            "attendance_percentage": 80.0
        },
        {
            "roll_number": "211FA05991",
            "name": "R. Out Of Range Attendance",
            "department": "ECE",
            "year_semester": "III Year - Sem 1",
            "section": "A",
            "parent_name": "R. Parent",
            "parent_phone": "+91 98480 99003",
            "preferred_language": "Telugu",
            "attendance_percentage": 145.0  # Invalid attendance percentage (> 100%)
        },
        {
            "roll_number": "211FA05992",
            "name": "=1+1",  # Formula injection demonstration
            "department": "ECE",
            "year_semester": "III Year - Sem 1",
            "section": "B",
            "parent_name": "Formula Parent",
            "parent_phone": "+91 98480 99004",
            "preferred_language": "Telugu",
            "attendance_percentage": 75.0
        }
    ]

    df_errors = pd.DataFrame(error_rows)
    df_errors.to_excel(ERROR_EXCEL_PATH, index=False)
    print(f"[+] Created intentional error demo spreadsheet: {ERROR_EXCEL_PATH}")


if __name__ == "__main__":
    reset_and_seed_database()
    generate_sample_spreadsheets()
    print("\n[SUCCESS] Seed process completed successfully!")

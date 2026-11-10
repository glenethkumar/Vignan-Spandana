"""
Frontend Demo Data Provider for Vignan Spandana.
Supplies structured, role-scoped sample data for UI templates without modifying backend models.
"""

from typing import Dict, Any, List, Optional
import copy

DEPARTMENTS = [
    {"code": "CSE", "name": "Computer Science & Engineering"},
    {"code": "ECE", "name": "Electronics & Communication Engineering"}
]

YEARS = ["I", "II", "III", "IV"]
SECTIONS = ["A", "B", "C"]

# Pre-populated ~40 realistic students across CSE and ECE
DEMO_STUDENTS: List[Dict[str, Any]] = [
    # CSE-III-A (Dr. A. Srinivas)
    {"id": 1, "roll_number": "211FA04001", "name": "K. Sai Praneeth", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "K. Venkata Rao", "parent_phone_masked": "+91 98*** **345",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 74.5, "mentor_name": "Dr. A. Srinivas"},
    {"id": 2, "roll_number": "211FA04002", "name": "V. Harshavardhan", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "V. Satyanarayana", "parent_phone_masked": "+91 94*** **890",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 88.0, "mentor_name": "Dr. A. Srinivas"},
    {"id": 3, "roll_number": "211FA04003", "name": "B. Tejaswi", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "B. Rama Krishna", "parent_phone_masked": "+91 91*** **123",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 92.4, "mentor_name": "Dr. A. Srinivas"},
    {"id": 4, "roll_number": "211FA04004", "name": "G. Manasa Reddy", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "G. Srinivas Reddy", "parent_phone_masked": "+91 99*** **456",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 68.2, "mentor_name": "Dr. A. Srinivas"},
    {"id": 5, "roll_number": "211FA04005", "name": "M. Tarun Kumar", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "M. Narayana Rao", "parent_phone_masked": "+91 98*** **678",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 81.0, "mentor_name": "Dr. A. Srinivas"},
    {"id": 6, "roll_number": "211FA04006", "name": "D. Likhitha", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "D. Appala Naidu", "parent_phone_masked": "+91 96*** **912",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 89.5, "mentor_name": "Dr. A. Srinivas"},
    {"id": 7, "roll_number": "211FA04007", "name": "R. Vignesh", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "R. Chandra Sekhar", "parent_phone_masked": "+91 93*** **341",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 76.0, "mentor_name": "Dr. A. Srinivas"},
    {"id": 8, "roll_number": "211FA04008", "name": "S. Sneha Latha", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "S. Prasad", "parent_phone_masked": "+91 95*** **782",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 94.0, "mentor_name": "Dr. A. Srinivas"},
    {"id": 9, "roll_number": "211FA04009", "name": "P. Karthik Reddy", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "P. Ramana Reddy", "parent_phone_masked": "+91 97*** **234",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 71.5, "mentor_name": "Dr. A. Srinivas"},
    {"id": 10, "roll_number": "211FA04010", "name": "T. Bhavani Shankar", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "T. Simhachalam", "parent_phone_masked": "+91 90*** **567",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 85.3, "mentor_name": "Dr. A. Srinivas"},
    {"id": 11, "roll_number": "211FA04011", "name": "N. Sravanthi", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "N. Koteswara Rao", "parent_phone_masked": "+91 98*** **890",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 91.2, "mentor_name": "Dr. A. Srinivas"},
    {"id": 12, "roll_number": "211FA04012", "name": "Ch. Akhil Varma", "department": "CSE", "year": "III", "section": "A",
     "class_name": "CSE-III-A", "parent_name": "Ch. Srinivasa Raju", "parent_phone_masked": "+91 94*** **432",
     "category": "Hosteler", "status": "Archived", "is_active": 0, "attendance_percentage": 58.0, "mentor_name": "Dr. A. Srinivas"},

    # CSE-III-B (Dr. A. Srinivas)
    {"id": 13, "roll_number": "211FA04013", "name": "J. Rohith", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "J. Madhava Rao", "parent_phone_masked": "+91 99*** **111",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 83.0, "mentor_name": "Prof. M. Sridhar"},
    {"id": 14, "roll_number": "211FA04014", "name": "K. Divya Sree", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "K. Govinda Rao", "parent_phone_masked": "+91 91*** **222",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 95.5, "mentor_name": "Prof. M. Sridhar"},
    {"id": 15, "roll_number": "211FA04015", "name": "L. Naveen", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "L. Gurunadham", "parent_phone_masked": "+91 93*** **333",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 78.4, "mentor_name": "Prof. M. Sridhar"},
    {"id": 16, "roll_number": "211FA04016", "name": "P. Mounika", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "P. Ananda Rao", "parent_phone_masked": "+91 96*** **444",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 72.0, "mentor_name": "Prof. M. Sridhar"},
    {"id": 17, "roll_number": "211FA04017", "name": "S. Rahul", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "S. Appa Rao", "parent_phone_masked": "+91 97*** **555",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 86.1, "mentor_name": "Prof. M. Sridhar"},
    {"id": 18, "roll_number": "211FA04018", "name": "Y. Anjali", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "Y. Venkateswara Rao", "parent_phone_masked": "+91 98*** **666",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 90.0, "mentor_name": "Prof. M. Sridhar"},
    {"id": 19, "roll_number": "211FA04019", "name": "B. Ganesh", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "B. Jagannadham", "parent_phone_masked": "+91 94*** **777",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 79.5, "mentor_name": "Prof. M. Sridhar"},
    {"id": 20, "roll_number": "211FA04020", "name": "E. Hemanth", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "E. Suryanarayana", "parent_phone_masked": "+91 95*** **888",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 84.2, "mentor_name": "Prof. M. Sridhar"},
    {"id": 21, "roll_number": "211FA04021", "name": "V. Sandhya", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "V. Malleswara Rao", "parent_phone_masked": "+91 90*** **999",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 93.0, "mentor_name": "Prof. M. Sridhar"},
    {"id": 22, "roll_number": "211FA04022", "name": "K. Nitin", "department": "CSE", "year": "III", "section": "B",
     "class_name": "CSE-III-B", "parent_name": "K. Venugopal", "parent_phone_masked": "+91 99*** **000",
     "category": "Day Scholar", "status": "Archived", "is_active": 0, "attendance_percentage": 61.2, "mentor_name": "Prof. M. Sridhar"},

    # ECE-III-A (Dr. P. Madhavi)
    {"id": 23, "roll_number": "211FA04099", "name": "P. Ananya Sharma", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "P. Bhaskara Rao", "parent_phone_masked": "+91 98*** **301",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 82.5, "mentor_name": "Dr. P. Madhavi"},
    {"id": 24, "roll_number": "211FA04100", "name": "A. Sumanth", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "A. Krishna Murthy", "parent_phone_masked": "+91 94*** **302",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 89.0, "mentor_name": "Dr. P. Madhavi"},
    {"id": 25, "roll_number": "211FA04101", "name": "C. Keerthi", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "C. Visweswara Rao", "parent_phone_masked": "+91 91*** **303",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 94.2, "mentor_name": "Dr. P. Madhavi"},
    {"id": 26, "roll_number": "211FA04102", "name": "K. Rakesh", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "K. Prabhakar", "parent_phone_masked": "+91 99*** **304",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 73.0, "mentor_name": "Dr. P. Madhavi"},
    {"id": 27, "roll_number": "211FA04103", "name": "M. Swathi", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "M. Lokanadham", "parent_phone_masked": "+91 98*** **305",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 87.5, "mentor_name": "Dr. P. Madhavi"},
    {"id": 28, "roll_number": "211FA04104", "name": "N. Harish", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "N. Subba Rao", "parent_phone_masked": "+91 96*** **306",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 79.0, "mentor_name": "Dr. P. Madhavi"},
    {"id": 29, "roll_number": "211FA04105", "name": "R. Deepthi", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "R. Mohan Rao", "parent_phone_masked": "+91 93*** **307",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 96.0, "mentor_name": "Dr. P. Madhavi"},
    {"id": 30, "roll_number": "211FA04106", "name": "T. Pradeep", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "T. Sambasiva Rao", "parent_phone_masked": "+91 95*** **308",
     "category": "Day Scholar", "status": "Active", "is_active": 1, "attendance_percentage": 70.2, "mentor_name": "Dr. P. Madhavi"},
    {"id": 31, "roll_number": "211FA04107", "name": "V. Pooja", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "V. Jagadeesh", "parent_phone_masked": "+91 97*** **309",
     "category": "Hosteler", "status": "Active", "is_active": 1, "attendance_percentage": 91.8, "mentor_name": "Dr. P. Madhavi"},
    {"id": 32, "roll_number": "211FA04108", "name": "Y. Santosh", "department": "ECE", "year": "III", "section": "A",
     "class_name": "ECE-III-A", "parent_name": "Y. Veerabhadra Rao", "parent_phone_masked": "+91 90*** **310",
     "category": "Day Scholar", "status": "Archived", "is_active": 0, "attendance_percentage": 62.5, "mentor_name": "Dr. P. Madhavi"}
]

# Realistic Campaigns
DEMO_CAMPAIGNS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "CSE III-A Daily Absence Notification",
        "module": "Mentoring/Attendance",
        "module_code": "attendance",
        "department": "CSE",
        "year": "III",
        "section": "A",
        "target_class": "CSE-III-A",
        "date": "2026-11-07",
        "created_by": "Dr. A. Srinivas",
        "status": "Completed",
        "student_count": 4,
        "completion_rate": "100%",
        "calls_placed": 4,
        "calls_answered": 4,
        "issues_raised": 1
    },
    {
        "id": 2,
        "name": "ECE III-A Daily Absence Notification",
        "module": "Mentoring/Attendance",
        "module_code": "attendance",
        "department": "ECE",
        "year": "III",
        "section": "A",
        "target_class": "ECE-III-A",
        "date": "2026-11-07",
        "created_by": "Dr. P. Madhavi",
        "status": "Completed",
        "student_count": 3,
        "completion_rate": "100%",
        "calls_placed": 3,
        "calls_answered": 3,
        "issues_raised": 0
    },
    {
        "id": 3,
        "name": "Campus Hostel Facilities Quality Survey",
        "module": "Feedback",
        "module_code": "feedback",
        "department": "CSE",
        "year": "III",
        "section": "A",
        "target_class": "CSE-III-A",
        "date": "2026-11-06",
        "created_by": "Admin",
        "status": "Completed",
        "student_count": 12,
        "completion_rate": "92%",
        "calls_placed": 12,
        "calls_answered": 11,
        "issues_raised": 2
    },
    {
        "id": 4,
        "name": "Transportation & Bus Route Quality Survey",
        "module": "Feedback",
        "module_code": "feedback",
        "department": "CSE",
        "year": "III",
        "section": "B",
        "target_class": "CSE-III-B",
        "date": "2026-11-05",
        "created_by": "Admin",
        "status": "Completed",
        "student_count": 15,
        "completion_rate": "100%",
        "calls_placed": 15,
        "calls_answered": 15,
        "issues_raised": 1
    },
    {
        "id": 5,
        "name": "CSE III-B Monthly Academic Mentoring",
        "module": "Mentoring/Attendance",
        "module_code": "attendance",
        "department": "CSE",
        "year": "III",
        "section": "B",
        "target_class": "CSE-III-B",
        "date": "2026-11-04",
        "created_by": "Prof. M. Sridhar",
        "status": "Completed",
        "student_count": 5,
        "completion_rate": "100%",
        "calls_placed": 5,
        "calls_answered": 5,
        "issues_raised": 1
    }
]

# Realistic Issues across categories and statuses (with 3-reopen critical escalation)
DEMO_ISSUES: List[Dict[str, Any]] = [
    {
        "id": 1,
        "title": "Block B Room 304 Ceiling Fan Vibration & Noise",
        "category": "hostel",
        "category_label": "Hostel Facilities",
        "owner_role": "Hostel Dean",
        "student_id": 2,
        "student_name": "V. Harshavardhan",
        "roll_number": "211FA04002",
        "class_name": "CSE-III-A",
        "department": "CSE",
        "status": "Open",
        "reopen_count": 1,
        "is_critical": 0,
        "created_date": "2026-11-06",
        "description": "Parent reported that the ceiling fan in room 304 is making an unbearable squeaking noise, disturbing sleep and studies.",
        "timeline": [
            {"date": "2026-11-06 11:30", "actor": "AI System", "action": "Issue Created", "notes": "Raised during hostel feedback call."},
            {"date": "2026-11-06 14:00", "actor": "Hostel Dean", "action": "Owner Alerted", "notes": "Maintenance request dispatched."}
        ]
    },
    {
        "id": 2,
        "title": "Route 14 Bus Repeated Morning Delay at Gajuwaka Junction",
        "category": "bus",
        "category_label": "Bus Transportation",
        "owner_role": "Bus Correspondent",
        "student_id": 1,
        "student_name": "K. Sai Praneeth",
        "roll_number": "211FA04001",
        "class_name": "CSE-III-A",
        "department": "CSE",
        "status": "In Progress",
        "reopen_count": 0,
        "is_critical": 0,
        "created_date": "2026-11-05",
        "description": "Route 14 bus regularly arrives 25 minutes late at the Gajuwaka stop, causing students to miss the 8:40 AM first hour attendance.",
        "timeline": [
            {"date": "2026-11-05 10:15", "actor": "AI System", "action": "Issue Created", "notes": "Parent reported transportation delay during call."},
            {"date": "2026-11-05 16:45", "actor": "Bus Correspondent", "action": "In Progress", "notes": "Driver route timeline adjusted."}
        ]
    },
    {
        "id": 3,
        "title": "Mid-1 Database Lab Marks Discrepancy on Portal",
        "category": "college",
        "category_label": "College Academic",
        "owner_role": "College Coordinator",
        "student_id": 4,
        "student_name": "G. Manasa Reddy",
        "roll_number": "211FA04004",
        "class_name": "CSE-III-A",
        "department": "CSE",
        "status": "Resolved by Owner",
        "reopen_count": 0,
        "is_critical": 0,
        "created_date": "2026-11-04",
        "description": "Parent noted that student secured 28/30 in DBMS Lab internal assessment, but portal displayed 18/30 due to manual entry keying error.",
        "timeline": [
            {"date": "2026-11-04 09:20", "actor": "AI System", "action": "Issue Created", "notes": "Parent queried portal mark entry."},
            {"date": "2026-11-04 15:30", "actor": "College Coordinator", "action": "Resolved by Owner", "notes": "Marks verified with lab sheet and updated on portal to 28."}
        ]
    },
    {
        "id": 4,
        "title": "Hostel Block A 2nd Floor Hot Water Geyser Tripping",
        "category": "hostel",
        "category_label": "Hostel Facilities",
        "owner_role": "Hostel Dean",
        "student_id": 6,
        "student_name": "D. Likhitha",
        "roll_number": "211FA04006",
        "class_name": "CSE-III-A",
        "department": "CSE",
        "status": "Reopened",
        "reopen_count": 3,
        "is_critical": 1,
        "created_date": "2026-10-28",
        "description": "Geyser on 2nd floor trips the circuit breaker repeatedly every morning. Issue marked critical after 3 repeated reopens.",
        "timeline": [
            {"date": "2026-10-28 08:30", "actor": "AI System", "action": "Issue Created", "notes": "Initial complaint logged."},
            {"date": "2026-10-30 11:00", "actor": "Hostel Dean", "action": "Resolved by Owner", "notes": "Breaker reset."},
            {"date": "2026-10-31 09:00", "actor": "Parent via AI Call", "action": "Reopened", "notes": "Parent said still no hot water. Reopen #1."},
            {"date": "2026-11-02 14:00", "actor": "Hostel Dean", "action": "Resolved by Owner", "notes": "Thermostat checked."},
            {"date": "2026-11-03 09:30", "actor": "Parent via AI Call", "action": "Reopened", "notes": "Parent confirmed breaker tripped again. Reopen #2."},
            {"date": "2026-11-04 16:00", "actor": "Hostel Dean", "action": "Resolved by Owner", "notes": "Wiring checked."},
            {"date": "2026-11-05 10:00", "actor": "Parent via AI Call", "action": "Reopened", "notes": "CRITICAL: Tripping persists. Reopen #3 escalated to Admin."}
        ]
    },
    {
        "id": 5,
        "title": "Route 22 AC Bus Window Latch Jammed",
        "category": "bus",
        "category_label": "Bus Transportation",
        "owner_role": "Bus Correspondent",
        "student_id": 13,
        "student_name": "J. Rohith",
        "roll_number": "211FA04013",
        "class_name": "CSE-III-B",
        "department": "CSE",
        "status": "Closed",
        "reopen_count": 0,
        "is_critical": 0,
        "created_date": "2026-10-25",
        "description": "Emergency window latch vibrating loudly during transit on Anakapalle route.",
        "timeline": [
            {"date": "2026-10-25 12:00", "actor": "AI System", "action": "Issue Created", "notes": "Logged via feedback survey."},
            {"date": "2026-10-26 15:30", "actor": "Bus Correspondent", "action": "Resolved by Owner", "notes": "Mechanic replaced rubber damper."},
            {"date": "2026-10-27 10:00", "actor": "AI Confirmation Call", "action": "Closed", "notes": "Parent confirmed issue resolved."}
        ]
    }
]

# Sample Call Records with realistic English & Telugu transcripts
DEMO_CALL_RECORDS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "student_id": 1,
        "campaign_id": 1,
        "student_name": "K. Sai Praneeth",
        "roll_number": "211FA04001",
        "parent_name": "K. Venkata Rao",
        "parent_phone_masked": "+91 98*** **345",
        "call_time": "2026-11-07 09:45:12",
        "duration_seconds": 68,
        "language": "Telugu",
        "status": "Completed",
        "summary": "పేరెంట్‌తో మాట్లాడటం జరిగింది. విద్యార్థి బస్సు ఆలస్యం కారణంగా 1వ పిరియడ్ హాజరు కాలేదని ధృవీకరించారు. రవాణా సమస్యను నమోదు చేశాము.",
        "transcript": "AI: నమస్కారం అండి, ఇది విజ్ఞాన్స్ ఇంజనీరింగ్ కళాశాల నుండి ఆటోమేటెడ్ అటెండెన్స్ కాల్. మీ అబ్బాయి సాయి ప్రణీత్ ఈరోజు 1వ పీరియడ్‌కు రాలేదు.\nపేరెంట్: అవునండి, రూట్ 14 బస్సు గాజువాక దగ్గర అరగంట లేట్ అయింది. అందుకే మొదటి పీరియడ్ మిస్ అయ్యాడు.\nAI: సరేనండి, ఈ సమాచారాన్ని నమోదు చేశాము. కళాశాల బస్సు ఇన్ఛార్జ్‌కు ఈ వివరాలు తెలియజేస్తాము. ధన్యవాదాలు.",
        "issue_raised": True,
        "issue_id": 2
    },
    {
        "id": 2,
        "student_id": 2,
        "campaign_id": 3,
        "student_name": "V. Harshavardhan",
        "roll_number": "211FA04002",
        "parent_name": "V. Satyanarayana",
        "parent_phone_masked": "+91 94*** **890",
        "call_time": "2026-11-06 11:20:05",
        "duration_seconds": 84,
        "language": "English",
        "status": "Completed",
        "summary": "Parent shared feedback on hostel accommodation. Expressed concern over continuous ceiling fan noise in Room 304. Maintenance ticket raised.",
        "transcript": "AI: Good morning sir. This is Vignan's Institute of Information Technology calling regarding campus hostel facilities feedback for your ward Harshavardhan.\nParent: Hello. Overall facilities and food are fine, but in his room 304, the ceiling fan has been squeaking very loudly for 3 days.\nAI: Thank you for bringing this to our attention. We have registered a maintenance alert directly to the Hostel Dean. A technician will inspect today.\nParent: Thank you very much, that would be helpful.",
        "issue_raised": True,
        "issue_id": 1
    }
]

# System Settings Demo Object
DEMO_SYSTEM_SETTINGS = {
    "institution_name": "Vignan's Institute of Information Technology (Autonomous)",
    "department_label": "Department of Computer Science & Engineering",
    "calling_window_start": "09:00",
    "calling_window_end": "17:30",
    "primary_language": "Telugu",
    "fallback_language": "English",
    "max_retries": 2,
    "max_call_duration_seconds": 120,
    "demo_mode": True,
    "data_masking_enabled": True
}

# Activity Log
DEMO_ACTIVITY_LOG = [
    {"timestamp": "2026-11-07 10:30", "user": "admin", "action": "Campaign Confirmed", "details": "Started CSE III-A Absence Notification campaign"},
    {"timestamp": "2026-11-07 09:15", "user": "faculty_cse", "action": "Roster Upload", "details": "Uploaded attendance Excel for CSE-III-A (38 present, 4 absent)"},
    {"timestamp": "2026-11-06 16:45", "user": "dean_hostel", "action": "Issue Updated", "details": "Assigned technician to Room 304 ceiling fan complaint"},
    {"timestamp": "2026-11-05 14:20", "user": "coordinator_college", "action": "Issue Resolved", "details": "Corrected DBMS Lab internal mark on university portal"},
    {"timestamp": "2026-11-04 11:10", "user": "admin", "action": "Settings Updated", "details": "Enabled phone masking across institutional dashboards"}
]


# ==============================================================================
# DATA ACCESS FUNCTIONS
# ==============================================================================

def list_departments() -> List[Dict[str, str]]:
    """Returns all academic departments."""
    return copy.deepcopy(DEPARTMENTS)


def list_years() -> List[str]:
    """Returns valid academic years."""
    return list(YEARS)


def list_sections() -> List[str]:
    """Returns valid class sections."""
    return list(SECTIONS)


def get_dashboard_summary(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Returns 4 top-level summary metrics scoped strictly by user role:
    - Absent Today
    - Calls Completed
    - Open Issues (orange alert)
    - Resolved This Week
    """
    norm_role = (role or "").strip()

    if norm_role in ("Admin", "Principal"):
        return {
            "absent_today": 7,
            "calls_completed": 34,
            "open_issues": 3,
            "resolved_this_week": 14,
            "scope_label": "Campus-Wide Oversight"
        }
    elif norm_role == "Faculty":
        # Scoped to assigned CSE classes
        return {
            "absent_today": 4,
            "calls_completed": 18,
            "open_issues": 1,
            "resolved_this_week": 8,
            "scope_label": "Assigned Classes (CSE III-A & III-B)"
        }
    elif norm_role == "Hostel Dean":
        return {
            "absent_today": 0,
            "calls_completed": 12,
            "open_issues": 2,
            "resolved_this_week": 5,
            "scope_label": "Hostel Facilities Issues"
        }
    elif norm_role == "College Coordinator":
        return {
            "absent_today": 0,
            "calls_completed": 8,
            "open_issues": 1,
            "resolved_this_week": 6,
            "scope_label": "Campus Academic Issues"
        }
    elif norm_role == "Bus Correspondent":
        return {
            "absent_today": 0,
            "calls_completed": 14,
            "open_issues": 1,
            "resolved_this_week": 3,
            "scope_label": "Transportation & Bus Issues"
        }
    return {
        "absent_today": 0,
        "calls_completed": 0,
        "open_issues": 0,
        "resolved_this_week": 0,
        "scope_label": "Institutional Portal"
    }


def list_recent_campaigns(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Returns recent campaigns scoped by role:
    - Admin/Principal: all campaigns
    - Faculty: only campaigns matching assigned department
    - Issue owners: only relevant feedback surveys
    """
    norm_role = (role or "").strip()
    if norm_role in ("Admin", "Principal"):
        return copy.deepcopy(DEMO_CAMPAIGNS[:limit])
    elif norm_role == "Faculty":
        dept = (user_dept or "CSE").upper()
        filtered = [c for c in DEMO_CAMPAIGNS if c["department"].upper() == dept]
        return copy.deepcopy(filtered[:limit])
    elif norm_role in ("Hostel Dean", "College Coordinator", "Bus Correspondent"):
        # Issue owners only review feedback survey campaigns
        filtered = [c for c in DEMO_CAMPAIGNS if c["module_code"] == "feedback"]
        return copy.deepcopy(filtered[:limit])
    return []


def list_open_issues(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Returns open issues scoped strictly by role category:
    - Admin/Principal: all issues
    - Hostel Dean: only 'hostel'
    - College Coordinator: only 'college'
    - Bus Correspondent: only 'bus'
    - Faculty: issues from their assigned students
    """
    norm_role = (role or "").strip()
    all_issues = copy.deepcopy(DEMO_ISSUES)

    if norm_role in ("Admin", "Principal"):
        open_only = [i for i in all_issues if i["status"] != "Closed"]
        return open_only[:limit]
    elif norm_role == "Hostel Dean":
        return [i for i in all_issues if i["category"] == "hostel" and i["status"] != "Closed"][:limit]
    elif norm_role == "College Coordinator":
        return [i for i in all_issues if i["category"] == "college" and i["status"] != "Closed"][:limit]
    elif norm_role == "Bus Correspondent":
        return [i for i in all_issues if i["category"] == "bus" and i["status"] != "Closed"][:limit]
    elif norm_role == "Faculty":
        dept = (user_dept or "CSE").upper()
        return [i for i in all_issues if i["department"].upper() == dept and i["status"] != "Closed"][:limit]
    return []


def list_students(role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None,
                  filters: Optional[Dict[str, Any]] = None, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
    """
    Returns paginated student directory strictly scoped by permissions:
    - Issue owners: NOT ALLOWED (raises PermissionError)
    - Faculty: strictly restricted to their department/classes
    - Admin: can filter by department, year, section, search, active/archived
    """
    norm_role = (role or "").strip()
    if norm_role in ("Hostel Dean", "College Coordinator", "Bus Correspondent"):
        raise PermissionError("Access Denied: Issue Owners do not have access to the student directory.")

    filters = filters or {}
    results = copy.deepcopy(DEMO_STUDENTS)

    # Scoping for Faculty
    if norm_role == "Faculty":
        allowed_dept = (user_dept or "CSE").upper()
        results = [s for s in results if s["department"].upper() == allowed_dept]
        # Faculty cannot view archived students
        results = [s for s in results if s.get("is_active", 1) == 1]
    else:
        # Admin can toggle archived
        show_archived = filters.get("show_archived", False)
        if not show_archived:
            results = [s for s in results if s.get("is_active", 1) == 1]

    # Filters
    dept_filter = filters.get("department")
    if dept_filter and dept_filter != "All":
        # If faculty tries to filter out-of-scope dept, return empty
        if norm_role == "Faculty" and dept_filter.upper() != (user_dept or "CSE").upper():
            results = []
        else:
            results = [s for s in results if s["department"].upper() == dept_filter.upper()]

    year_filter = filters.get("year")
    if year_filter and year_filter != "All":
        results = [s for s in results if s["year"] == year_filter]

    sec_filter = filters.get("section")
    if sec_filter and sec_filter != "All":
        results = [s for s in results if s["section"] == sec_filter]

    query = (filters.get("query") or "").strip().lower()
    if query:
        results = [s for s in results if query in s["name"].lower() or query in s["roll_number"].lower()]

    total = len(results)
    total_pages = max(1, (total + per_page - 1) // per_page)
    start_idx = (page - 1) * per_page
    paginated = results[start_idx:start_idx + per_page]

    return {
        "students": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }


def get_student_detail(student_id: int, role: str, user_dept: Optional[str] = None, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Returns student profile details, privacy masked contact info, and related call records.
    Enforces server-side permissions: Faculty cannot view out-of-department students.
    """
    norm_role = (role or "").strip()
    if norm_role in ("Hostel Dean", "College Coordinator", "Bus Correspondent"):
        raise PermissionError("Access Denied: Issue Owners do not have access to student detail pages.")

    student = next((copy.deepcopy(s) for s in DEMO_STUDENTS if s["id"] == student_id), None)
    if not student:
        return None

    if norm_role == "Faculty":
        allowed_dept = (user_dept or "CSE").upper()
        if student["department"].upper() != allowed_dept:
            raise PermissionError(f"Access Denied: Faculty cannot access student in department {student['department']}.")

    # Attach related calls and issues
    student["call_history"] = [copy.deepcopy(c) for c in DEMO_CALL_RECORDS if c["student_id"] == student_id]
    student["issues"] = [copy.deepcopy(i) for i in DEMO_ISSUES if i["student_id"] == student_id]

    return student


def archive_student_demo(student_id: int, role: str) -> bool:
    """Soft-archives a student (Admin/Principal only)."""
    norm_role = (role or "").strip()
    if norm_role not in ("Admin", "Principal"):
        raise PermissionError("Access Denied: Only Admin can archive students.")

    for s in DEMO_STUDENTS:
        if s["id"] == student_id:
            s["is_active"] = 0
            s["status"] = "Archived"
            return True
    return False


def list_issues_board(role: str, category_filter: Optional[str] = None, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns all issues for the Issues board, enforcing strict category isolation for issue owners.
    """
    norm_role = (role or "").strip()
    issues = copy.deepcopy(DEMO_ISSUES)

    if norm_role == "Hostel Dean":
        issues = [i for i in issues if i["category"] == "hostel"]
    elif norm_role == "College Coordinator":
        issues = [i for i in issues if i["category"] == "college"]
    elif norm_role == "Bus Correspondent":
        issues = [i for i in issues if i["category"] == "bus"]
    elif category_filter and category_filter != "all":
        issues = [i for i in issues if i["category"] == category_filter]

    if status_filter and status_filter != "all":
        issues = [i for i in issues if i["status"].lower() == status_filter.lower()]

    return issues


def get_issue_detail(issue_id: int, role: str) -> Optional[Dict[str, Any]]:
    """Fetches single issue, enforcing category isolation."""
    norm_role = (role or "").strip()
    issue = next((copy.deepcopy(i) for i in DEMO_ISSUES if i["id"] == issue_id), None)
    if not issue:
        return None

    if norm_role == "Hostel Dean" and issue["category"] != "hostel":
        raise PermissionError("Access Denied: Cannot view non-hostel issues.")
    if norm_role == "College Coordinator" and issue["category"] != "college":
        raise PermissionError("Access Denied: Cannot view non-college issues.")
    if norm_role == "Bus Correspondent" and issue["category"] != "bus":
        raise PermissionError("Access Denied: Cannot view non-bus issues.")

    return issue


def get_system_settings_demo(role: str) -> Dict[str, Any]:
    """Returns system settings (Admin only)."""
    norm_role = (role or "").strip()
    if norm_role not in ("Admin", "Principal"):
        raise PermissionError("Access Denied: Settings are restricted to Administrators.")
    return copy.deepcopy(DEMO_SYSTEM_SETTINGS)


def get_users_and_classes_demo(role: str) -> Dict[str, Any]:
    """Returns user roster and class assignments (Admin only)."""
    norm_role = (role or "").strip()
    if norm_role not in ("Admin", "Principal"):
        raise PermissionError("Access Denied: Users & Classes management is restricted to Administrators.")

    return {
        "users": [
            {"id": 1, "username": "admin", "full_name": "System Administrator", "role": "Admin", "department": "All", "status": "Active"},
            {"id": 2, "username": "principal", "full_name": "Dr. K. V. S. Murthy (Principal)", "role": "Principal", "department": "All", "status": "Active"},
            {"id": 3, "username": "faculty_cse", "full_name": "Dr. A. Srinivas", "role": "Faculty", "department": "CSE", "status": "Active", "assigned_classes": ["CSE-III-A", "CSE-III-B"]},
            {"id": 4, "username": "faculty_ece", "full_name": "Dr. P. Madhavi", "role": "Faculty", "department": "ECE", "status": "Active", "assigned_classes": ["ECE-III-A"]},
            {"id": 5, "username": "coordinator_college", "full_name": "Prof. R. V. Ramanamurthy", "role": "College Coordinator", "department": "All", "status": "Active"},
            {"id": 6, "username": "dean_hostel", "full_name": "Prof. K. Venkateswarlu", "role": "Hostel Dean", "department": "All", "status": "Active"},
            {"id": 7, "username": "correspondent_bus", "full_name": "Mr. B. Nageswara Rao", "role": "Bus Correspondent", "department": "All", "status": "Active"}
        ],
        "departments": list_departments(),
        "years": list_years(),
        "sections": list_sections()
    }


def get_activity_log_demo(role: str) -> List[Dict[str, str]]:
    """Returns audited activity log (Admin only)."""
    norm_role = (role or "").strip()
    if norm_role not in ("Admin", "Principal"):
        raise PermissionError("Access Denied: Activity log is restricted to Administrators.")
    return copy.deepcopy(DEMO_ACTIVITY_LOG)

# Vignan Spandana: 5-Minute Faculty & Leadership Demo Guide

This guide is designed for presenting the **Vignan Spandana AI Parent Communication System** to university deans, department heads, and faculty coordinators.

> **Demonstration Mode Notice**: All outbound parent voice calls are **strictly simulated** using rule-based and template-driven mock speech adapters (`MockTelephonyAdapter` and `MockAIAdapter`). No real phone calls are dispatched, and no external telephony or AI API credits are consumed.

---

## Pre-Demo Quick Setup (Under 30 Seconds)

1. Open PowerShell / Terminal in the project root:
   ```powershell
   python seed_demo.py
   python app.py
   ```
2. Open your web browser to: **`http://127.0.0.1:5000`**
3. Verify that `sample_import_errors.xlsx` and `sample_import_good.xlsx` are located in the project root.

---

## 5-Minute Click-by-Click Demo Flow

```
[1. Login] ➔ [2. Student Directory] ➔ [3. Two-Step Import] ➔ [4. Simulated Call Timeline] ➔ [5. Transcript & Follow-Up]
```

---

### Step 1: Institutional Role-Based Login (30 Seconds)

- **Target Action**: Log in as Department Coordinator for CSE (`coord_cse`).
- **Click-by-Click Steps**:
  1. Navigate to `http://127.0.0.1:5000/login`.
  2. Click the quick-fill button labeled **`CSE Coord (Prof. M. Sridhar)`** or manually enter:
     - **Username**: `coord_cse`
     - **Password**: `coord123`
  3. Click **Sign In Securely**.
- **What to Say**:
  > *"Good morning, esteemed faculty. Vignan Spandana is designed with strict institutional role-based access control. Rather than giving every user open access, our system enforces departmental scoping. Here, I am logging in as Professor M. Sridhar, Department Coordinator for Computer Science & Engineering. Notice that the session cookie is encrypted and protected with HttpOnly and SameSite flags."*

---

### Step 2: Department-Scoped Student Directory & Search (45 Seconds)

- **Target Action**: Explore the active student directory and demonstrate instant filtering.
- **Click-by-Click Steps**:
  1. Observe the top notification banner showing department scope (`CSE`).
  2. In the **Instant Search** box, type `Divya` or `211FA04018`.
  3. Notice the table filters in real time without a page refresh.
  4. Clear the search box.
  5. Point out the color-coded attendance badges (students below 75% display in red warning badges, above 75% in green).
- **What to Say**:
  > *"Upon landing on the dashboard, Coordinator Sridhar sees only CSE students. If an ECE coordinator logs in, they only see ECE records. Notice our attendance status tags: students maintaining above 75% attendance are marked in green, while students with attendance shortage are immediately flagged in red for faculty intervention."*

---

### Step 3: Two-Step Secure Spreadsheet Import Demo (75 Seconds)

- **Target Action**: Upload `sample_import_errors.xlsx` to demonstrate validation, then import `sample_import_good.xlsx`.
- **Click-by-Click Steps**:
  1. Click **Import Data** in the top navigation bar (`/import`).
  2. Click **Browse** and select **`sample_import_errors.xlsx`**.
  3. Click **Upload & Preview Spreadsheet**.
  4. Point out the **Step 1 Staging & Validation Preview**:
     - *Row 2*: Marked as `ERROR` &mdash; Duplicate roll number within file (`211FA04991`).
     - *Row 3*: Marked as `ERROR` &mdash; Invalid phone number (`12345` &mdash; must be a valid 10-digit phone number).
     - *Row 4*: Marked as `ERROR` &mdash; Attendance out of range (`145.0%`).
     - *Row 5*: Formula cell neutralized (`=1+1` sanitized to `'=1+1` to protect against CSV/Excel formula injection).
  5. Notice the **Commit to Database** button is intelligently disabled or shows that invalid rows will be skipped.
  6. Click **Discard & Cancel Import**.
  7. Now click **Upload & Preview Spreadsheet** with **`sample_import_good.xlsx`**.
  8. All 5 rows show green `VALID` checkmarks.
  9. Click **Confirm & Commit Valid Records**.
  10. The dashboard updates with a flash message confirming atomic SQLite transaction commit.
- **What to Say**:
  > *"Academic institutions frequently struggle with dirty data when importing large Excel rosters. Vignan Spandana implements a mandatory Two-Step Import Pipeline. When we upload our error test spreadsheet, the system catches duplicate roll numbers, invalid phone numbers, out-of-range percentages, and formula injection vulnerabilities before any data touches the database. Once we upload a verified spreadsheet, the records are committed atomically in a single transaction."*

---

### Step 4: Outbound AI Call Simulation & Live Timeline (90 Seconds)

- **Target Action**: Trigger a simulated AI parent phone call with line-by-line streaming.
- **Click-by-Click Steps**:
  1. Locate student **`B. Divya Sri`** (`211FA04018`) with 64.0% attendance.
  2. Click the **Call Parent** button.
  3. The **Simulated Call Popup Modal** appears:
     - Note the badge: `Demo mode: simulated call`.
     - Student details are displayed: Name, Roll, Dept (`CSE`), Attendance (`64.0%`).
  4. Select **Language**: Choose **Telugu (తెలుగు)** or **English**. (Let's select *Telugu* first).
  5. Click **▶️ Start Call**.
  6. Watch the **Interactive Timeline Stepper**:
     - **Dialing... (2s)**: Yellow pulsing indicator simulates network connection.
     - **Connected**: Green indicator turns on, call duration ticker starts (`00:01`, `00:02`...).
     - **Live Speech Stream**: Scripted dialogue lines appear one by one (~1.5s per line):
       - *AI Assistant*: Introduces as AI assistant from Vignan's Institute.
       - *AI Assistant*: "Am I speaking with the parent of B. Divya Sri?"
       - *Parent*: "Yes, I am speaking. Please go ahead."
       - *AI Assistant*: Reports 64.0% attendance and politely warns that it is below the university 75% minimum threshold.
       - *Parent*: Asks an internal evaluation question ("Why were marks deducted in DBMS exam? Can assignment be re-evaluated?").
       - *AI Assistant*: Politely notes exam evaluation is outside AI scope, registers an inquiry ticket, and promises a CSE faculty callback.
       - *AI Assistant*: Closes politely ("Thank you for cooperating with Vignan's Institute. Have a nice day.").
     - **Call Ended**: Duration banner updates and post-call summary card appears.
- **What to Say**:
  > *"When faculty initiate communication, our outbound calling engine simulates the complete telephony handshake. Dialing takes 2 seconds to simulate network connection, followed by active speech streaming in the parent's chosen language — Telugu or English. The AI never guesses missing data; it reads strictly from verified records. When the parent asks a question outside the AI's scope — in this case regarding exam marks re-evaluation — the AI smoothly acknowledges the limitation and registers a faculty callback request."*

---

### Step 5: Speaker-Labelled Transcript, Summary & Follow-Up Resolution (60 Seconds)

- **Target Action**: Inspect the saved Call Record and resolve the linked Follow-Up ticket.
- **Click-by-Click Steps**:
  1. Click **Close** on the modal.
  2. Click **Call History** in the top navigation bar (`/calls`).
  3. Observe the newly created call at the top of the table with status `Completed` and language `Telugu`.
  4. Click **📜 View Details** on that call row.
  5. The **Call Transcript & Record** page (`/calls/<id>`) opens:
     - Point out the full speaker-labelled dialogue bubbles.
     - Point out the **AI Call Summary** box.
     - Point out the **Linked Follow-Up Ticket** on the right side.
  6. Under **Update Follow-Up Assignment & Status**:
     - Change **Status** from `Open` to `In Progress` or `Closed`.
     - Assign to `Dr. A. Srinivas (CSE Faculty)`.
     - Set a **Due Date** (e.g. tomorrow).
     - Enter notes: *"Contacted father Mr. B. Nageswara Rao; explained Mid-1 DBMS paper rubrics. Parent satisfied."*
     - Click **💾 Save Ticket Updates**.
  7. Click **Follow-Ups** in the top navigation bar (`/follow-ups`) to demonstrate the departmental follow-up queue.
- **What to Say**:
  > *"Every call interaction is permanently saved with full speaker-labelled transcripts, duration metadata, and AI-generated summaries. Most importantly, parent concerns don't get lost in the shuffle: the unanswered question was automatically converted into an institutional Follow-Up ticket. The coordinator or mentor can assign it to a faculty member, set a resolution deadline, and track the status to closure. This closes the loop between automated outreach and personalized student mentoring."*

---

## Handling Edge Cases During Live Q&A

| Edge Case | How System Handles It | Live Demonstration Reference |
| :--- | :--- | :--- |
| **Missing Phone Number** | AI notices phone is unregistered and uses campus demo line; system never crashes. | Student `M. Tarun Teja` (`211FA04035`) |
| **Missing Attendance** | AI states attendance records are pending faculty entry; **never guesses or displays None%**. | Student `Ravi Kumar Varma` (`211FA04062`) |
| **Missing Marks** | AI omits or notes marks are pending departmental upload; never guesses. | Student `Kavya Sharma` (`211FA04049`) |
| **Double-Clicking Button** | Button disables immediately, and backend debounce rejects duplicate requests with HTTP 429. | Front-end and backend debounce guards |
| **Page Refresh** | Call record is permanently stored in SQLite `call_records` table and remains after refresh. | Refresh `/calls` or `/student/<id>` |
| **Cross-Department Snooping** | Coordinator attempting to access another branch receives strict `HTTP 403 Forbidden`. | Scoped security decorators in `app.py` |
| **Principal Read-Only** | Principal can audit campus-wide calls but cannot initiate calls or tamper with tickets. | Login as `principal` / `principal123` |

---

## Demo Credentials Cheat Sheet

| Username | Password | Role | Department Scope |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | Admin | All (Campus-Wide) |
| `principal` | `principal123` | Principal | All (Campus-Wide Read-Only) |
| `coord_cse` | `coord123` | Department Coordinator | CSE Only |
| `coord_ece` | `coord123` | Department Coordinator | ECE Only |
| `faculty_cse` | `faculty123` | Faculty | CSE Only |
| `faculty_ece` | `faculty123` | Faculty | ECE Only |

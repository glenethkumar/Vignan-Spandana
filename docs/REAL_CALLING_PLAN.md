# Vignan Spandana: Real Outbound Calling Architecture Plan (Outpero AI)

This document outlines the architectural blueprint for transitioning **Vignan Spandana** from the simulation and mock demonstration mode to production real-world telephone calling to parents across India using **Outpero** ([https://outpero.com/](https://outpero.com/) and [https://docs.outpero.com/](https://docs.outpero.com/)).

---

## 1. Architectural Philosophy: The Adapter Pattern

To protect core business logic, database models, and institutional workflows from changes in telephony or AI vendors, Vignan Spandana uses the **Adapter Pattern** with clean abstract base interfaces.

```
       +---------------------------------------------+
       |         Flask Web Application & APIs         |
       |  (/student/<id>/call, /calls, /follow-ups)  |
       +----------------------+----------------------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
    +-------------------+           +-------------------+
    | TelephonyAdapter  |           |     AIAdapter     |
    | (Abstract Base)   |           |  (Abstract Base)  |
    +---------+---------+           +---------+---------+
              |                               |
      +-------+-------+               +-------+-------+
      |               |               |               |
      v               v               v               v
+------------+  +-----------+   +-----------+   +-----------+
|    Mock    |  |  Outpero  |   |   Mock    |  |  Gemini / |
| Telephony  |  | Telephony |   | AIAdapter |  |  OpenAI   |
| (Default)  |  | (Adapter) |   | (Default) |  | Assistant |
+------------+  +-----------+   +-----------+   +-----------+
```

No external API keys or vendor secrets are coupled directly to route handlers. Swapping between mock simulation and production telephony requires only registering production implementations of these interfaces.

---

## 2. Outpero AI Telephony Architecture

### 2.1 Outpero Overview
- **Role**: AI phone calling platform engineered for Indian institutions and businesses, supporting conversational calling in **Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, and English**.
- **Interface**: Implements `TelephonyAdapter` via [`adapters/outpero.py`](../adapters/outpero.py).
- **Documentation**: [https://docs.outpero.com/](https://docs.outpero.com/) and [https://outpero.com/](https://outpero.com/).

### 2.2 Credential & Authentication Model
- **Endpoint**: `POST https://api.outpero.com/lead-intake/{campaign_slug}`
- **Authentication Header**: `X-Outpero-Lead-Secret: <your_secret>`
- **Important Credential Distinction**:
  > **Note**: `OUTPERO_LEAD_SECRET` is an intake-specific authentication secret designed to authorize programmatic injection of outbound calls via `POST /lead-intake/{slug}`. It is **not** a general-purpose REST API key or PSTN SIP trunk credential.
- **Environment Variables**:
  * `OUTPERO_LEAD_SECRET`: Secret header token (`X-Outpero-Lead-Secret`).
  * `OUTPERO_CAMPAIGN_SLUG`: The campaign or voice-agent identifier configured in the Outpero dashboard.
  * `OUTPERO_API_BASE_URL`: Base URL (default: `https://api.outpero.com`).
  * `OUTPERO_WEBHOOK_SECRET`: Optional secret token to verify incoming post-call webhooks.

### 2.3 Lead Intake Request Schema
When a faculty member or coordinator initiates an outbound academic notice, the backend sends:
```json
{
  "phone": "+919876543210",
  "name": "K. Venkateswara Rao (Parent)",
  "custom_variables": {
    "call_id": "outpero_1_1729740000",
    "student_id": "1",
    "student_name": "K. Sai Praneeth",
    "roll_number": "211FA04001",
    "department": "CSE",
    "attendance_percentage": "68.4",
    "attendance_date": "2026-10-24",
    "language": "Telugu",
    "source": "Vignan Spandana Attendance System"
  }
}
```

### 2.4 Post-Call Webhook Ingestion
Upon call completion, Outpero pushes call outcomes to the Vignan Spandana webhook receiver at `POST /api/webhooks/outpero`:
```json
{
  "call_id": "call_outpero_991823",
  "phone": "+919876543210",
  "status": "completed",
  "outcome": "parent_informed",
  "duration": 48,
  "summary": "Parent informed of absent status on 2026-10-24. Parent stated student was unwell and will submit medical certificate.",
  "transcript": "[00:01] AI: నమస్కారం, విజ్ఞాన్ ఇన్స్టిట్యూట్ నుండి స్పందన AI అసిస్టెంట్ మాట్లాడుతున్నాను...\n[00:10] Parent: అవునండి, బాబుకి జ్వరం వచ్చి రాలేకపోయాడు...",
  "custom_fields": {
    "call_id": "outpero_1_1729740000",
    "student_id": "1"
  }
}
```
The webhook handler verifies optional webhook tokens, updates the SQLite `call_records` table, and associates notes with departmental follow-up tickets.

---

## 3. End-to-End Production Flow

```
[Faculty / Coordinator clicks "Call Parent"]
                     │
                     ▼
             [Web Application]
                     │
                     ▼
           [OutperoTelephonyAdapter]
        (Formats payload & E.164 phone)
                     │
                     ▼
       [POST /lead-intake/{slug}]
       (Header: X-Outpero-Lead-Secret)
                     │
                     ▼
      [Outpero AI Calling Engine]
   (Dispatches PSTN call in Telugu/English)
                     │
       Parent Phone Rings & Answers
                     │
                     ▼
       [Outpero Conversational Voice]
  (Discusses attendance & captures responses)
                     │
     Call Completes & Outcomes Processed
                     │
                     ▼
       [POST /api/webhooks/outpero]
                     │
                     ▼
      [Database Persistence: Vignan Spandana]
  - Saves CallRecord (duration, status, transcript, summary)
  - Updates FollowUp ticket in department queue
  - Records security audit log entry
```

---

## 4. Current Mock Implementation vs. Outpero Calling

| Step | Current Simulated Call | Outpero AI Telephony Pipeline |
| :--- | :--- | :--- |
| **Trigger** | Frontend POST to `/student/<id>/call` | Dispatched via `OutperoTelephonyAdapter.initiate_call` |
| **Dialing** | In-memory simulated call | Outpero PSTN telephony dialing via Lead Intake API |
| **Speech Generation** | Rule-based dialogue generator in `MockAIAdapter` | Outpero native multilingual voice agents (Telugu, English, etc.) |
| **Interruption** | Scripted turn-taking timeline | Outpero real-time natural turn-taking and conversational barge-in |
| **Transcript** | Formatted string generated from scripted lines | Speech-to-text transcript returned via Outpero webhook |
| **Summary & Ticket** | Deterministic rule-based summary string | Outpero conversation summary and extracted parent commitments |
| **Database Save** | Directly inserted in call route | Staged upon initiation and finalized via post-call webhook |

---

## 5. Security, Telecom Compliance & Consent (TRAI Guidelines)

When deploying real outbound calls to Indian telephone numbers, the system adheres to Telecom Regulatory Authority of India (TRAI) and institutional guidelines:

1. **Authorized Calling Hours**: Outbound calls must only be dispatched between **09:00 AM and 08:00 PM IST**.
2. **Credential Isolation**: `OUTPERO_LEAD_SECRET` and `OUTPERO_CAMPAIGN_SLUG` are read exclusively from backend server environments and are never exposed to browser JavaScript or client templates.
3. **Disclosure Announcement**: Every AI telephone call begins with an institutional disclosure:
   > *"నమస్కారం, ఇది విజ్ఞాన్ ఇన్స్టిట్యూట్ ఆఫ్ ఇన్ఫర్మేషన్ టెక్నాలజీ నుండి విద్యార్థి హాజరు సమాచార ఆటోమేటెడ్ కాల్."*
4. **Recording Consent & Data Security**: Call audio and transcripts contain student academic performance data (FERPA/DPDP Act 2023). Audio recordings and transcripts are encrypted at rest with restricted departmental access.
5. **No Hallucinations**: Missing data is never synthesized. If attendance or marks are pending in university ERP, the AI agent states: *"Current semester records are pending departmental upload."*

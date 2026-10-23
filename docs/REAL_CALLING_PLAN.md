# Vignan Spandana: Real Outbound Calling Architecture Plan

This document outlines the architectural blueprint for transitioning **Vignan Spandana** from the current simulation and mock demonstration mode to production real-world PSTN phone calling to parents across India.

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
|    Mock    |  |   Plivo   |   |   Mock    |  |  Sarvam / |
| Telephony  |  |  Adapter  |   | AIAdapter |  |  Pipecat  |
|  (Current) |  | (Future)  |   | (Current) |  | (Future)  |
+------------+  +-----------+   +-----------+   +-----------+
```

No external API keys or vendor SDKs are coupled directly to route handlers. Swapping from mock simulation to production telephony requires only registering production implementations of these interfaces.

---

## 2. Component Roles & Provider Responsibilities

### 2.1 Telephony Carrier: Plivo (or Exotel)
- **Role**: Handles the public switched telephone network (PSTN) connection to Indian mobile carriers (Airtel, Jio, Vi, BSNL).
- **Interface**: Implements `TelephonyAdapter`.
- **Key Responsibilities**:
  - Initiates outbound calls via REST API (`POST /v1/Account/{auth_id}/Call/`).
  - Emits real-time call status webhooks (`initiated`, `ringing`, `answered`, `completed`, `busy`, `no-answer`).
  - Streams bi-directional raw audio (mu-law / PCM 8kHz) over WebSockets for conversational voice processing.

### 2.2 Indic Voice AI: Sarvam AI
- **Role**: Provides state-of-the-art conversational voice synthesis and recognition optimized for Indian languages, specifically Telugu and Indian English.
- **Key Capabilities**:
  - **Saarika (STT)**: High-accuracy speech-to-text with code-switching support (Telugu + English mixed phrases commonly used in Andhra Pradesh).
  - **Bulbul (TTS)**: Expressive, low-latency text-to-speech with natural regional intonation, clear Telugu pronunciation, and academic terminology phrasing.

### 2.3 Real-Time Voice Orchestrator: Pipecat
- **Role**: The open-source framework for building real-time multi-modal voice agents.
- **Key Capabilities**:
  - Manages the audio stream between the telephony carrier (Plivo) and AI models.
  - Handles **Voice Activity Detection (VAD)** and **barge-in / interruptions** (when a parent speaks while the AI is talking, Pipecat immediately cuts the audio output and listens).
  - Coordinates latency-critical pipeline steps:
    $$\text{Audio Packet} \xrightarrow{\text{VAD}} \text{Sarvam STT} \xrightarrow{\text{Prompt Context}} \text{LLM Generation} \xrightarrow{\text{Streaming Chunk}} \text{Sarvam TTS} \xrightarrow{\text{Audio Output}}$$

---

## 3. End-to-End Production Flow

```
[Faculty / Coordinator clicks "Call Parent"]
                     │
                     ▼
             [Web Application]
                     │
                     ▼
          [Async Call Queue (Redis/Celery)]
   (Enforces concurrency limits & time-of-day policies)
                     │
                     ▼
           [TelephonyAdapter: Plivo]
           (Initiates Outbound PSTN Dial)
                     │
      Parent Phone Rings & Answers
                     │
                     ▼
          [Bi-directional WebSocket]
                     │
                     ▼
          [Voice AI Engine: Pipecat]
                     │
     ┌───────────────┴───────────────┐
     ▼                               ▼
[Sarvam Indic STT]           [Sarvam Indic TTS]
     │                               ▲
     ▼                               │
[Conversational LLM / Business Rules Engine]
(Uses verified student data: attendance %, internal marks, dues)
                     │
     Parent Asks Complex / Evaluation Question
                     │
                     ▼
     [AI Escalation: Register Callback]
                     │
     Call Completes & Telephony Ends
                     │
                     ▼
          [Webhook to /webhooks/call-ended]
                     │
                     ▼
      [Database Persistence: Vignan Spandana]
  - Saves CallRecord (duration, status, speaker transcript, summary)
  - Creates FollowUp ticket in department queue
  - Records security audit log entry
```

---

## 4. Current Mock Implementation vs. Real Calling Implementation

| Step | Current Simulated Call | Real Calling Pipeline |
| :--- | :--- | :--- |
| **Trigger** | Frontend POST to `/student/<id>/call/demo` | Frontend POST to `/student/<id>/call` (enqueues async worker task) |
| **Dialing** | 2-second UI timeout simulated in modal | Plivo dials carrier; webhook notifies app on `ringing` and `answered` |
| **Speech Generation** | Rule-based dialogue generator in `MockAIAdapter` | Pipecat orchestrates Sarvam STT $\rightarrow$ Gemini LLM $\rightarrow$ Sarvam TTS |
| **Interruption** | Scripted turn-taking timeline | Real-time Silero VAD detects parent voice and cuts TTS output immediately |
| **Transcript** | Formatted string generated from scripted lines | Timestamped word-level audio transcript generated from STT stream |
| **Summary & Ticket** | Deterministic rule-based summary string | LLM-generated JSON summary with extracted parent action items |
| **Database Save** | Directly inserted inside `/student/<id>/call/demo` | Saved by backend webhook worker upon Plivo `call.completed` event |

---

## 5. Security, Telecom Compliance & Consent (TRAI Guidelines)

When deploying real outbound calls to Indian telephone numbers, the system must adhere to Telecom Regulatory Authority of India (TRAI) and institutional guidelines:

1. **Authorized Calling Hours**: Outbound calls must only be dispatched between **09:00 AM and 08:00 PM IST** (configurable in `.env`).
2. **Do-Not-Disturb (DND) Verification**: Academic transactional alerts must use registered Service Implicit / Service Explicit DLT headers (e.g., `VIGNAN-ACAD`).
3. **Disclosure Announcement**: Every call must begin with an explicit disclosure:
   > *"Namaskaram, this is an automated academic update call from Vignan's Institute of Information Technology."*
4. **Recording Consent & Data Security**: Call audio and transcripts contain student academic performance data (FERPA/DPDP Act 2023). Audio recordings must be encrypted at rest in cloud storage with restricted departmental access.
5. **No Hallucinations**: Missing data must never be synthesized. If attendance or marks are pending in university ERP, the AI agent must state: *"Current semester records are pending departmental upload."*

---

## 6. How to Plug In Real Providers (Future Code Walkthrough)

To activate real calling, developers will add two concrete classes under `adapters/`:

1. **`adapters/plivo_telephony.py`**:
   ```python
   # Future implementation snippet:
   import plivo
   from .base import TelephonyAdapter

   class PlivoTelephonyAdapter(TelephonyAdapter):
       def __init__(self, auth_id: str, auth_token: str, outbound_number: str):
           self.client = plivo.RestClient(auth_id, auth_token)
           self.outbound_number = outbound_number

       def initiate_call(self, to_phone: str, call_id: str, metadata: dict):
           # Dispatches actual PSTN call linking to audio WebSocket endpoint
           ...
   ```

2. **`adapters/sarvam_ai.py`**:
   ```python
   # Future implementation snippet:
   from .base import AIAdapter

   class SarvamAIAdapter(AIAdapter):
       def __init__(self, api_key: str):
           self.api_key = api_key

       def generate_greeting(self, student_name: str, language: str):
           ...
   ```

3. **Dependency Injection in `app.py`**:
   ```python
   # Toggle based on environment variable:
   USE_REAL_TELEPHONY = os.environ.get("USE_REAL_TELEPHONY", "False").lower() == "true"

   if USE_REAL_TELEPHONY:
       telephony_adapter = PlivoTelephonyAdapter(...)
       ai_adapter = SarvamAIAdapter(...)
   else:
       telephony_adapter = MockTelephonyAdapter()
       ai_adapter = MockAIAdapter()
   ```

Because all web routes interact exclusively with `telephony_adapter` and `ai_adapter`, zero changes to templates, database schemas, or permission checks are needed.

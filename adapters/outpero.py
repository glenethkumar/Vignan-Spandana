"""
Vignan Spandana - Outpero AI Telephony Adapter
Integration adapter for Outpero AI Telephone Calling (https://outpero.com).

Authentication & Architecture:
- Uses server-side environment variables:
    * OUTPERO_LEAD_SECRET: Header token (X-Outpero-Lead-Secret) for lead-intake API.
      NOTE: This is an endpoint authorization credential specifically used for triggering
      calls via POST /lead-intake/{slug}. It is NOT a general-purpose API key.
    * OUTPERO_CAMPAIGN_SLUG: The campaign / voice agent slug configured in Outpero.
    * OUTPERO_API_BASE_URL: Base URL for Outpero API (default: https://api.outpero.com).
    * OUTPERO_WEBHOOK_SECRET: Optional secret token to verify incoming post-call webhooks.
- Security:
    * Credentials are kept strictly on the backend and never exposed in client JavaScript,
      HTML templates, API responses, or logs.
    * Real calls are never falsely reported as succeeded when unconfigured or failing.
"""

import os
import re
import logging
from typing import Dict, Any, Optional
import requests
from .base import TelephonyAdapter

logger = logging.getLogger(__name__)


class OutperoTelephonyAdapter(TelephonyAdapter):
    """
    Adapter for Outpero AI Phone Calling.
    Dispatches outbound AI telephone calls using Outpero's Lead Intake API
    and processes post-call webhook outcomes.
    """

    DEFAULT_BASE_URL = "https://api.outpero.com"

    def __init__(
        self,
        lead_secret: Optional[str] = None,
        campaign_slug: Optional[str] = None,
        base_url: Optional[str] = None,
        webhook_secret: Optional[str] = None
    ):
        self._explicit_lead_secret = lead_secret
        self._explicit_campaign_slug = campaign_slug
        self._explicit_base_url = base_url
        self._explicit_webhook_secret = webhook_secret
        self._calls: Dict[str, Dict[str, Any]] = {}

    @property
    def lead_secret(self) -> str:
        """Retrieves active Outpero lead secret from explicit config or environment."""
        if self._explicit_lead_secret is not None:
            return self._explicit_lead_secret.strip()
        return (os.environ.get("OUTPERO_LEAD_SECRET") or "").strip()

    @property
    def campaign_slug(self) -> str:
        """Retrieves active Outpero campaign slug from explicit config or environment."""
        if self._explicit_campaign_slug is not None:
            return self._explicit_campaign_slug.strip()
        return (os.environ.get("OUTPERO_CAMPAIGN_SLUG") or "").strip()

    @property
    def base_url(self) -> str:
        """Retrieves base URL for Outpero API."""
        if self._explicit_base_url is not None:
            return self._explicit_base_url.rstrip("/")
        url = os.environ.get("OUTPERO_API_BASE_URL") or self.DEFAULT_BASE_URL
        return url.rstrip("/")

    @property
    def webhook_secret(self) -> str:
        """Retrieves optional Outpero webhook verification secret."""
        if self._explicit_webhook_secret is not None:
            return self._explicit_webhook_secret.strip()
        return (os.environ.get("OUTPERO_WEBHOOK_SECRET") or "").strip()

    def is_configured(self) -> bool:
        """
        Returns True if both OUTPERO_LEAD_SECRET and OUTPERO_CAMPAIGN_SLUG are configured.
        """
        return bool(self.lead_secret and self.campaign_slug)

    @staticmethod
    def normalize_phone_number(phone: Optional[str]) -> Optional[str]:
        """
        Normalizes a phone number to Indian E.164 format (+91XXXXXXXXXX).
        Returns None if invalid.
        """
        if not phone:
            return None
        cleaned = re.sub(r"[^\d+]", "", str(phone).strip())
        if not cleaned:
            return None

        # Check if already in +91... format
        if cleaned.startswith("+91") and len(cleaned) == 13 and cleaned[3:].isdigit():
            return cleaned
        if cleaned.startswith("91") and len(cleaned) == 12 and cleaned.isdigit():
            return f"+{cleaned}"
        if cleaned.startswith("0") and len(cleaned) == 11 and cleaned[1:].isdigit():
            return f"+91{cleaned[1:]}"
        if len(cleaned) == 10 and cleaned.isdigit():
            return f"+91{cleaned}"
        if cleaned.startswith("+") and len(cleaned) >= 10:
            return cleaned

        return None

    def initiate_call(
        self,
        to_phone: Optional[str],
        call_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Dispatches an outbound AI call via Outpero's Lead Intake API.
        POST {base_url}/lead-intake/{slug}
        Header: X-Outpero-Lead-Secret: {lead_secret}
        """
        metadata = metadata or {}

        if not self.is_configured():
            return {
                "success": False,
                "status": "unconfigured",
                "error": "Outpero AI calling is not configured. OUTPERO_LEAD_SECRET and OUTPERO_CAMPAIGN_SLUG must be set in the server environment.",
                "error_code": "NOT_CONFIGURED",
                "provider": "outpero"
            }

        normalized_phone = self.normalize_phone_number(to_phone)
        if not normalized_phone:
            return {
                "success": False,
                "status": "failed",
                "error": f"Invalid recipient phone number for Outpero calling: '{to_phone}'. Must be a valid 10-digit Indian phone number.",
                "error_code": "INVALID_PHONE",
                "provider": "outpero"
            }

        target_url = f"{self.base_url}/lead-intake/{self.campaign_slug}"
        headers = {
            "X-Outpero-Lead-Secret": self.lead_secret,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "VignanSpandana-Telephony/1.0"
        }

        recipient_name = (
            metadata.get("parent_name")
            or metadata.get("student_name")
            or "Parent/Guardian"
        )

        payload = {
            "phone": normalized_phone,
            "name": recipient_name,
            "custom_variables": {
                "call_id": call_id,
                "student_id": str(metadata.get("student_id", "")),
                "student_name": str(metadata.get("student_name", "")),
                "roll_number": str(metadata.get("roll_number", "")),
                "department": str(metadata.get("department", "")),
                "attendance_percentage": str(metadata.get("attendance_percentage", "")),
                "attendance_date": str(metadata.get("attendance_date", "")),
                "language": str(metadata.get("language", "Telugu")),
                "source": "Vignan Spandana Attendance System"
            }
        }

        try:
            response = requests.post(
                target_url,
                json=payload,
                headers=headers,
                timeout=15
            )
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "status": "failed",
                "error": "Outpero Lead Intake connection timed out.",
                "error_code": "TIMEOUT",
                "provider": "outpero"
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "status": "failed",
                "error": f"Failed to connect to Outpero Lead Intake API: {type(e).__name__}",
                "error_code": "NETWORK_ERROR",
                "provider": "outpero"
            }

        if response.status_code in (200, 201, 202):
            resp_data = {}
            try:
                resp_data = response.json()
            except Exception:
                pass

            provider_call_id = resp_data.get("call_id") or resp_data.get("id") or f"outpero_{call_id}"
            call_record = {
                "call_id": call_id,
                "provider_call_id": provider_call_id,
                "to_phone": normalized_phone,
                "status": "queued",
                "provider": "outpero",
                "metadata": metadata
            }
            self._calls[call_id] = call_record

            return {
                "success": True,
                "status": "queued",
                "call_id": call_id,
                "provider_call_id": provider_call_id,
                "phone": normalized_phone,
                "provider": "outpero",
                "message": "Call queued successfully with Outpero AI calling."
            }

        # Handle specific Outpero HTTP error codes
        if response.status_code in (401, 403):
            return {
                "success": False,
                "status": "failed",
                "status_code": response.status_code,
                "error": "Outpero authentication failed. Please verify OUTPERO_LEAD_SECRET in your server environment.",
                "error_code": "AUTHENTICATION_FAILED",
                "provider": "outpero"
            }
        elif response.status_code == 404:
            return {
                "success": False,
                "status": "failed",
                "status_code": 404,
                "error": f"Outpero campaign slug '{self.campaign_slug}' not found. Please verify OUTPERO_CAMPAIGN_SLUG.",
                "error_code": "CAMPAIGN_NOT_FOUND",
                "provider": "outpero"
            }
        elif response.status_code == 429:
            return {
                "success": False,
                "status": "failed",
                "status_code": 429,
                "error": "Outpero rate limit exceeded. Please wait a moment before queueing additional calls.",
                "error_code": "RATE_LIMIT_EXCEEDED",
                "provider": "outpero"
            }

        # Other error statuses
        error_msg = f"Outpero call dispatch failed with HTTP {response.status_code}"
        try:
            err_json = response.json()
            detail = err_json.get("message") or err_json.get("error") or err_json.get("detail")
            if detail:
                error_msg = f"{error_msg}: {detail}"
        except Exception:
            pass

        return {
            "success": False,
            "status": "failed",
            "status_code": response.status_code,
            "error": error_msg,
            "error_code": "OUTPERO_ERROR",
            "provider": "outpero"
        }

    def get_call_status(self, call_id: str) -> Dict[str, Any]:
        """
        Retrieves status of a call record.
        Outpero updates call outcomes asynchronously via post-call webhook.
        """
        if call_id in self._calls:
            return self._calls[call_id]
        return {
            "call_id": call_id,
            "status": "unknown",
            "provider": "outpero"
        }

    def terminate_call(self, call_id: str) -> bool:
        """
        Outpero Lead Intake is an asynchronous call-queueing trigger.
        Immediate call termination is not exposed via lead-intake API.
        """
        if call_id in self._calls:
            self._calls[call_id]["status"] = "cancelled"
            return True
        return False

    def verify_webhook_secret(self, provided_secret: Optional[str]) -> bool:
        """
        Verifies incoming webhook authentication secret if OUTPERO_WEBHOOK_SECRET is configured.
        """
        expected = self.webhook_secret
        if not expected:
            # If no webhook secret is configured on the server, allow webhook processing
            return True
        return bool(provided_secret and provided_secret.strip() == expected)

    def parse_post_call_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes and parses a post-call webhook payload from Outpero.
        Expected payload format:
        {
            "call_id": "call_12345",
            "phone": "+919812345678",
            "status": "connected" / "completed" / "no-answer" / "busy" / "failed",
            "outcome": "interested" / "resolved",
            "summary": "...",
            "transcript": "...",
            "duration": 45,
            "custom_fields": {
                "call_id": "...",
                "student_id": "..."
            }
        }
        """
        custom_fields = data.get("custom_fields") or data.get("custom_variables") or {}
        internal_call_id = custom_fields.get("call_id") or data.get("call_id") or ""
        student_id_str = custom_fields.get("student_id") or data.get("student_id") or ""
        student_id = int(student_id_str) if (student_id_str and str(student_id_str).isdigit()) else None

        duration = data.get("duration") or data.get("duration_seconds") or 0
        try:
            duration = int(duration)
        except (ValueError, TypeError):
            duration = 0

        raw_status = (data.get("status") or "completed").lower()
        if raw_status in ("connected", "completed", "answered"):
            normalized_status = "Completed"
        elif raw_status in ("busy", "no-answer", "no_answer"):
            normalized_status = "Unanswered"
        else:
            normalized_status = "Failed"

        summary = data.get("summary") or data.get("call_summary") or "AI Telephone Call via Outpero"
        transcript = data.get("transcript") or data.get("call_transcript") or ""

        parsed = {
            "internal_call_id": internal_call_id,
            "provider_call_id": data.get("call_id"),
            "student_id": student_id,
            "phone": data.get("phone"),
            "status": normalized_status,
            "raw_status": raw_status,
            "outcome": data.get("outcome", ""),
            "summary": summary,
            "transcript": transcript,
            "duration_seconds": duration,
            "custom_fields": custom_fields
        }

        # Update in-memory record if exists
        if internal_call_id and internal_call_id in self._calls:
            self._calls[internal_call_id].update({
                "status": normalized_status,
                "summary": summary,
                "transcript": transcript,
                "duration_seconds": duration
            })

        return parsed

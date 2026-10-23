"""
Vignan Spandana - Mock Telephony Adapter
Simulates telephony operations in-memory without making real outbound phone calls.
Handles missing phone numbers gracefully for demo purposes.
"""

from typing import Dict, Any, Optional
from .base import TelephonyAdapter


class MockTelephonyAdapter(TelephonyAdapter):
    """In-memory mock telephony provider for safe testing and faculty demonstration."""

    def __init__(self):
        self._calls: Dict[str, Dict[str, Any]] = {}

    def initiate_call(self, to_phone: Optional[str], call_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        phone_target = to_phone if (to_phone and str(to_phone).strip()) else "Unavailable / Campus Line"
        call_info = {
            "call_id": call_id,
            "to_phone": phone_target,
            "status": "in_progress",
            "metadata": metadata,
            "provider": "MockTelephony",
        }
        self._calls[call_id] = call_info
        return {
            "success": True,
            "provider_call_id": f"mock_tel_{call_id}",
            "status": "in_progress",
            "phone": phone_target
        }

    def get_call_status(self, call_id: str) -> Dict[str, Any]:
        return self._calls.get(call_id, {
            "call_id": call_id,
            "status": "completed"
        })

    def terminate_call(self, call_id: str) -> bool:
        if call_id in self._calls:
            self._calls[call_id]["status"] = "cancelled"
            return True
        return False

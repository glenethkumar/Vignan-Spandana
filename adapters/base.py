"""
Vignan Spandana - Mock Provider Adapters Interface
Establishes clean abstract interfaces for telephony and speech/AI
so real external providers (Plivo, Exotel, Sarvam, Gemini) can be
cleanly plugged in later without altering core business logic.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class TelephonyAdapter(ABC):
    """Abstract interface for Telephony providers (Plivo, Twilio, Exotel, etc.)."""

    @abstractmethod
    def initiate_call(self, to_phone: str, call_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Initiates an outbound phone call."""
        pass

    @abstractmethod
    def get_call_status(self, call_id: str) -> Dict[str, Any]:
        """Retrieves the current status of a call."""
        pass

    @abstractmethod
    def terminate_call(self, call_id: str) -> bool:
        """Terminates an active call."""
        pass


class AIAdapter(ABC):
    """Abstract interface for Conversational Speech/AI providers (Sarvam, Bhashini, Gemini, etc.)."""

    @abstractmethod
    def generate_greeting(self, student_name: str, language: str) -> str:
        """Generates the opening greeting in the requested language."""
        pass

    @abstractmethod
    def process_parent_response(self, context: Dict[str, Any], user_utterance: str) -> Dict[str, Any]:
        """Processes a parent response and returns next agent response and actions."""
        pass

    @abstractmethod
    def generate_simulated_call_script(self, student: Dict[str, Any], language: str) -> Dict[str, Any]:
        """Generates a complete scripted simulation dialogue using student academic records."""
        pass

"""
Vignan Spandana - Sarvam AI Indic Speech Adapter
Backend service for Telugu Text-to-Speech (TTS) and Speech-to-Text (STT)
using Sarvam AI Indic Voice APIs (Bulbul and Saarika/Saaras).

Security:
- Reads SARVAM_API_KEY exclusively from backend environment/dotenv.
- Never exposes secret keys to client-side code or API responses.
- Enforces strict failure handling (never pretends an API call succeeded).
"""

import os
import requests
from typing import Dict, Any, Optional


class SarvamAIService:
    """
    Client for Sarvam AI Text-to-Speech (Bulbul) and Speech-to-Text (Saarika/Saaras) APIs.
    Telugu (te-IN) is configured as the primary language.
    """

    DEFAULT_TTS_URL = "https://api.sarvam.ai/text-to-speech"
    DEFAULT_STT_URL = "https://api.sarvam.ai/speech-to-text"
    PRIMARY_LANGUAGE_CODE = "te-IN"

    def __init__(self, api_key: Optional[str] = None):
        # Read API key dynamically from environment if not explicitly provided
        self._explicit_key = api_key

    @property
    def api_key(self) -> str:
        """Retrieves active API key from explicit constructor or SARVAM_API_KEY environment variable."""
        return (self._explicit_key or os.environ.get("SARVAM_API_KEY") or "").strip()

    def is_configured(self) -> bool:
        """Returns True if a non-empty SARVAM_API_KEY is detected."""
        return bool(self.api_key)

    def text_to_speech(
        self,
        text: str,
        language_code: str = PRIMARY_LANGUAGE_CODE,
        speaker: str = "meera",
        model: str = "bulbul:v1",
        pace: float = 1.0,
        speech_sample_rate: int = 22050
    ) -> Dict[str, Any]:
        """
        Converts Telugu text into synthesized speech audio using Sarvam Bulbul TTS.
        
        Returns:
            Dict containing success flag, audio_base64 string, and metadata,
            or success=False with clear error reason.
        """
        clean_text = (text or "").strip()
        if not clean_text:
            return {
                "success": False,
                "error": "Telugu text input is empty. Please enter text to synthesize.",
                "error_code": "EMPTY_TEXT"
            }

        if not self.is_configured():
            return {
                "success": False,
                "error": "SARVAM_API_KEY is not configured on the server. Please set SARVAM_API_KEY in your .env file or server environment.",
                "error_code": "KEY_MISSING"
            }

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }

        # Compatible payload supporting both v1 and v4 schemas
        payload = {
            "inputs": [clean_text],
            "text": clean_text,
            "target_language_code": language_code,
            "speaker": speaker or "meera",
            "pitch": 0,
            "pace": max(0.5, min(2.0, pace)),
            "loudness": 1.5,
            "speech_sample_rate": speech_sample_rate,
            "enable_preprocessing": True,
            "model": model or "bulbul:v1"
        }

        try:
            response = requests.post(
                self.DEFAULT_TTS_URL,
                json=payload,
                headers=headers,
                timeout=18
            )
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Sarvam AI TTS connection timed out. The service may be busy; please retry in a moment.",
                "error_code": "TIMEOUT"
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Failed to reach Sarvam AI Text-to-Speech API: {str(e)}",
                "error_code": "NETWORK_ERROR"
            }

        if response.status_code != 200:
            error_detail = ""
            try:
                err_json = response.json()
                error_detail = err_json.get("message") or err_json.get("error") or err_json.get("detail") or ""
            except Exception:
                error_detail = response.text[:200]

            return {
                "success": False,
                "error": f"Sarvam AI TTS API error (HTTP {response.status_code}): {error_detail or 'Service error'}",
                "status_code": response.status_code,
                "error_code": "API_ERROR"
            }

        try:
            data = response.json()
            audios = data.get("audios", [])
            if not audios or not audios[0]:
                return {
                    "success": False,
                    "error": "Sarvam AI responded with 200 OK but returned an empty audio payload.",
                    "error_code": "EMPTY_AUDIO_RESPONSE"
                }

            return {
                "success": True,
                "audio_base64": audios[0],
                "mime_type": "audio/wav",
                "format": "wav",
                "language_code": language_code,
                "speaker": speaker,
                "text": clean_text
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to parse Sarvam AI TTS response: {str(e)}",
                "error_code": "PARSE_ERROR"
            }

    def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str = "telugu_recording.wav",
        language_code: str = PRIMARY_LANGUAGE_CODE,
        model: str = "saaras:v1"
    ) -> Dict[str, Any]:
        """
        Transcribes spoken Telugu audio into text using Sarvam Saarika/Saaras STT.
        
        Returns:
            Dict containing success flag, transcribed text string, and language code,
            or success=False with clear error reason.
        """
        if not audio_bytes or len(audio_bytes) < 44:
            return {
                "success": False,
                "error": "Audio data is empty or too short to contain a valid voice recording.",
                "error_code": "EMPTY_AUDIO"
            }

        if not self.is_configured():
            return {
                "success": False,
                "error": "SARVAM_API_KEY is not configured on the server. Please set SARVAM_API_KEY in your .env file or server environment.",
                "error_code": "KEY_MISSING"
            }

        headers = {
            "api-subscription-key": self.api_key
        }

        # Determine reasonable content-type based on filename
        content_type = "audio/wav"
        if filename.endswith(".mp3"):
            content_type = "audio/mpeg"
        elif filename.endswith(".ogg") or filename.endswith(".opus"):
            content_type = "audio/ogg"
        elif filename.endswith(".webm"):
            content_type = "audio/webm"

        files = {
            "file": (filename, audio_bytes, content_type)
        }
        data = {
            "model": model or "saaras:v1",
            "language_code": language_code
        }

        try:
            response = requests.post(
                self.DEFAULT_STT_URL,
                files=files,
                data=data,
                headers=headers,
                timeout=25
            )
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Sarvam AI STT transcription request timed out. Please try again.",
                "error_code": "TIMEOUT"
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Failed to reach Sarvam AI Speech-to-Text API: {str(e)}",
                "error_code": "NETWORK_ERROR"
            }

        if response.status_code != 200:
            error_detail = ""
            try:
                err_json = response.json()
                error_detail = err_json.get("message") or err_json.get("error") or err_json.get("detail") or ""
            except Exception:
                error_detail = response.text[:200]

            return {
                "success": False,
                "error": f"Sarvam AI STT API error (HTTP {response.status_code}): {error_detail or 'Transcription error'}",
                "status_code": response.status_code,
                "error_code": "API_ERROR"
            }

        try:
            res_data = response.json()
            transcript = res_data.get("transcript", "")
            return {
                "success": True,
                "transcript": transcript,
                "language_code": res_data.get("language_code", language_code)
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to parse Sarvam AI STT response: {str(e)}",
                "error_code": "PARSE_ERROR"
            }

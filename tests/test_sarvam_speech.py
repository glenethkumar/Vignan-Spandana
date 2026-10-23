"""
Integration Tests for Prompt 4: Telugu AI Speech using Sarvam AI.
Verifies:
1. Text-to-speech (TTS) Telugu audio generation via Sarvam Bulbul.
2. Speech-to-text (STT) spoken Telugu transcription via Sarvam Saarika/Saaras.
3. Secret API calls stay strictly on the backend.
4. Reads key from SARVAM_API_KEY.
5. Never exposes secret key in frontend JavaScript, HTML, or API responses.
6. Loading indicators and informative error messages present on UI.
7. Telugu is the primary language (te-IN).
8. Interface labels in English.
9. Telugu audio generation execution.
10. Transcription of Telugu voice recording execution.
11. Strict failure reporting: Never pretends an API call succeeded if it failed.
"""

import os
import io
import json
import pytest
from unittest.mock import patch, MagicMock
from app import app
from adapters.sarvam_ai import SarvamAIService


@pytest.fixture(autouse=True)
def isolate_test_config():
    """Ensure testing configuration is cleanly isolated."""
    prev_testing = app.config.get("TESTING")
    prev_skip = app.config.get("TESTING_SKIP_CSRF")
    app.config["TESTING"] = True
    app.config["TESTING_SKIP_CSRF"] = True
    yield
    app.config["TESTING"] = prev_testing
    app.config["TESTING_SKIP_CSRF"] = prev_skip if prev_skip is not None else False


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_faculty(client):
    with client.session_transaction() as sess:
        sess["user_id"] = 5
        sess["username"] = "faculty_cse"
        sess["full_name"] = "Dr. A. Srinivas (CSE Faculty)"
        sess["role"] = "Faculty"
        sess["department"] = "CSE"
    return client


# ==============================================================================
# 1. UI Page & Component Rendering Tests
# ==============================================================================

def test_telugu_speech_lab_page_renders(client):
    """
    Verify /telugu-speech and /speech-test load successfully with all required UI controls:
    - Telugu TTS text area, speaker persona, pace selector, generate button
    - Audio player and download button
    - Telugu STT microphone recording & file upload tabs, transcribe button
    - Dedicated loading spinners and dismissible error alert containers
    """
    for endpoint in ["/telugu-speech", "/speech-test"]:
        resp = client.get(endpoint)
        assert resp.status_code == 200
        html = resp.data.decode("utf-8")

        # Page Header & Context
        assert "Telugu AI Speech Laboratory" in html
        assert "Sarvam AI" in html
        assert "te-IN" in html

        # TTS Controls
        assert 'id="ttsTextInput"' in html
        assert 'id="ttsSpeakerSelect"' in html
        assert 'id="ttsPaceSelect"' in html
        assert 'id="btnGenerateTTS"' in html
        assert 'id="ttsLoadingSpinner"' in html
        assert 'id="ttsErrorAlert"' in html
        assert 'id="ttsAudioPlayer"' in html

        # STT Controls
        assert 'id="btnToggleRecord"' in html
        assert 'id="sttAudioFileInput"' in html
        assert 'id="btnTranscribeSTT"' in html
        assert 'id="sttLoadingSpinner"' in html
        assert 'id="sttErrorAlert"' in html
        assert 'id="sttTranscriptText"' in html


def test_speech_status_endpoint(client):
    """
    Verify /api/speech/status returns service capability metadata with Telugu as primary language.
    Guarantees no secret keys are leaked in the JSON payload.
    """
    resp = client.get("/api/speech/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "configured" in data
    assert "Telugu" in data["primary_language"]
    assert "te-IN" in data["primary_language"]
    assert "model_tts" in data
    assert "model_stt" in data
    # Ensure no secrets leaked
    assert "key" not in data
    assert "api_key" not in data
    assert "sarvam_api_key" not in data


# ==============================================================================
# 2. Text-to-Speech (TTS) Backend & API Tests
# ==============================================================================

def test_tts_missing_text_rejected(client):
    """Verify TTS request with empty or missing text is rejected with HTTP 400."""
    resp = client.post("/api/speech/tts", json={
        "text": "",
        "speaker": "meera"
    })
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False
    assert "required" in data["error"].lower()


def test_tts_missing_api_key_honest_failure(client, monkeypatch):
    """
    Requirement 11: Do not pretend an API call succeeded if it failed.
    When SARVAM_API_KEY is not configured, the endpoint must report an honest error.
    """
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    # Re-instantiate or ensure service reflects missing key
    service = SarvamAIService(api_key="")
    assert service.is_configured() is False

    resp = client.post("/api/speech/tts", json={
        "text": "నమస్కారం, మీ అబ్బాయి ఈరోజు కాలేజీకి రాలేదు.",
        "speaker": "meera"
    })
    # Must fail honestly with 503 / 400, not pretend success
    assert resp.status_code in [400, 503]
    data = resp.get_json()
    assert data["success"] is False
    assert "SARVAM_API_KEY" in data["error"]


def test_tts_successful_telugu_audio_generation_mocked(client, monkeypatch):
    """
    Test Telugu audio generation when Sarvam AI returns valid audio payload.
    Verifies backend sends correct headers and payload to Sarvam AI and returns base64 audio.
    """
    fake_api_key = "test_sarvam_sub_key_12345"
    monkeypatch.setenv("SARVAM_API_KEY", fake_api_key)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "audios": ["UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQoGAACBhYq..."]
    }

    with patch("requests.post", return_value=mock_response) as mock_post:
        telugu_text = "నమస్కారం, మీ అబ్బాయి ఈరోజు కళాశాలకు రాలేదు. దయచేసి గమనించండి."
        resp = client.post("/api/speech/tts", json={
            "text": telugu_text,
            "speaker": "meera",
            "pace": 1.0,
            "language_code": "te-IN"
        })

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["mime_type"] == "audio/wav"
        assert len(data["audio_base64"]) > 10
        assert data["language_code"] == "te-IN"
        assert data["text"] == telugu_text

        # Verify backend made correct request to Sarvam AI with hidden secret key
        mock_post.assert_called_once()
        called_url = mock_post.call_args[0][0]
        called_kwargs = mock_post.call_args[1]

        assert "api.sarvam.ai/text-to-speech" in called_url
        assert called_kwargs["headers"]["api-subscription-key"] == fake_api_key
        assert called_kwargs["json"]["target_language_code"] == "te-IN"
        assert called_kwargs["json"]["speaker"] == "meera"


def test_tts_api_upstream_error_propagation(client, monkeypatch):
    """
    Requirement 11: Do not pretend an API call succeeded if it failed.
    When Sarvam AI returns HTTP 401 Unauthorized or HTTP 429 Quota Exceeded,
    the backend must propagate the real failure reason to the user.
    """
    monkeypatch.setenv("SARVAM_API_KEY", "invalid_or_expired_key")

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = '{"message": "Invalid Subscription Key"}'
    mock_response.json.return_value = {"message": "Invalid Subscription Key"}

    with patch("requests.post", return_value=mock_response):
        resp = client.post("/api/speech/tts", json={
            "text": "నమస్కారం",
            "speaker": "meera"
        })

        assert resp.status_code in [400, 401]
        data = resp.get_json()
        assert data["success"] is False
        assert "Invalid Subscription Key" in data["error"] or "401" in data["error"]


# ==============================================================================
# 3. Speech-to-Text (STT) Backend & API Tests
# ==============================================================================

def test_stt_missing_file_rejected(client):
    """Verify STT request with missing audio file is rejected with HTTP 400."""
    resp = client.post("/api/speech/stt", data={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False
    assert "audio file" in data["error"].lower()


def test_stt_empty_audio_bytes_rejected(client):
    """Verify STT request with empty / zero-byte audio file is rejected."""
    resp = client.post("/api/speech/stt", data={
        "audio_file": (io.BytesIO(b"short"), "empty.wav")
    })
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False
    assert "too short" in data["error"].lower() or "empty" in data["error"].lower()


def test_stt_missing_api_key_honest_failure(client, monkeypatch):
    """
    Requirement 11: Do not pretend an API call succeeded if it failed.
    When SARVAM_API_KEY is missing, STT must report an honest error.
    """
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    sample_wav = b"RIFF" + b"\x00" * 100

    resp = client.post("/api/speech/stt", data={
        "audio_file": (io.BytesIO(sample_wav), "sample.wav")
    })
    assert resp.status_code in [400, 503]
    data = resp.get_json()
    assert data["success"] is False
    assert "SARVAM_API_KEY" in data["error"]


def test_stt_successful_telugu_transcription_mocked(client, monkeypatch):
    """
    Test transcription of a Telugu voice recording when Sarvam AI returns transcript.
    Verifies backend sends binary file to Sarvam Saarika/Saaras with language_code='te-IN'.
    """
    fake_api_key = "test_sarvam_sub_key_99999"
    monkeypatch.setenv("SARVAM_API_KEY", fake_api_key)

    expected_telugu_transcript = "నమస్కారం సార్, నేను రేపు ఉదయం కళాశాలకు వస్తాను."

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "transcript": expected_telugu_transcript,
        "language_code": "te-IN"
    }

    dummy_audio = b"RIFF" + b"\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00" + b"\x00" * 80

    with patch("requests.post", return_value=mock_response) as mock_post:
        resp = client.post("/api/speech/stt", data={
            "audio_file": (io.BytesIO(dummy_audio), "parent_telugu_response.wav"),
            "language_code": "te-IN"
        })

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["transcript"] == expected_telugu_transcript
        assert data["language_code"] == "te-IN"

        # Verify backend called Sarvam AI with correct headers and payload
        mock_post.assert_called_once()
        called_url = mock_post.call_args[0][0]
        called_kwargs = mock_post.call_args[1]

        assert "api.sarvam.ai/speech-to-text" in called_url
        assert called_kwargs["headers"]["api-subscription-key"] == fake_api_key
        assert called_kwargs["data"]["language_code"] == "te-IN"


def test_stt_api_upstream_error_propagation(client, monkeypatch):
    """
    Requirement 11: Do not pretend an API call succeeded if it failed.
    When Sarvam AI returns an error during transcription, the backend propagates it accurately.
    """
    monkeypatch.setenv("SARVAM_API_KEY", "valid_looking_key")

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = '{"message": "Internal Server Error in Audio Processing"}'
    mock_response.json.return_value = {"message": "Internal Server Error in Audio Processing"}

    dummy_audio = b"RIFF" + b"\x24\x00\x00\x00WAVEfmt " + b"\x00" * 80

    with patch("requests.post", return_value=mock_response):
        resp = client.post("/api/speech/stt", data={
            "audio_file": (io.BytesIO(dummy_audio), "test.wav")
        })

        assert resp.status_code in [400, 500]
        data = resp.get_json()
        assert data["success"] is False
        assert "Internal Server Error" in data["error"] or "500" in data["error"]


# ==============================================================================
# 4. Security & Privacy Safeguards
# ==============================================================================

def test_security_sarvam_key_never_exposed_in_client():
    """
    Requirements 3, 4, 5:
    - Keep secret API calls on backend
    - Read key from SARVAM_API_KEY
    - Never expose key in frontend JavaScript or commit it to GitHub.
    """
    template_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "templates",
        "telugu_speech_lab.html"
    )
    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()

    # The template must never contain API keys or secret references in script
    assert "SARVAM_API_KEY=" not in template_content
    assert "api-subscription-key" not in template_content  # Header only set on backend!

    # Check gitignore ensures .env is ignored
    gitignore_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        ".gitignore"
    )
    with open(gitignore_path, "r", encoding="utf-8") as f:
        gitignore_content = f.read()
    assert ".env" in gitignore_content

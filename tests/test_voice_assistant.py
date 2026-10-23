"""
Tests for Vignan Spandana AI Voice Assistant Prototype.
Verifies page rendering, API endpoints, bilingual responses (Telugu & English),
fictional attendance disclaimers, multi-turn conversational context, and error states.
"""

import pytest
import json
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["TESTING_SKIP_CSRF"] = True
    with app.test_client() as client:
        yield client


def test_voice_assistant_page_renders(client):
    """Test that /assistant and /voice-assistant load successfully with required UI components."""
    for path in ["/assistant", "/voice-assistant"]:
        resp = client.get(path)
        assert resp.status_code == 200
        html = resp.data.decode("utf-8")
        assert "AI Voice Assistant Prototype" in html
        assert "vaMicBtn" in html
        assert "vaStartBtn" in html
        assert "vaEndBtn" in html
        assert "vaLangSelect" in html
        assert "vaTranscriptBody" in html
        assert "vaWaveformCanvas" in html
        assert "vaTextInput" in html
        assert "vaStatusPill" in html


def test_api_assistant_status(client):
    """Test that /api/assistant/status returns service capability metadata."""
    resp = client.get("/api/assistant/status")
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert "mode" in data
    assert "provider" in data
    assert "languages_supported" in data
    assert "en" in data["languages_supported"]
    assert "te" in data["languages_supported"]
    assert "speech_recognition" in data
    assert "speech_synthesis" in data


def test_api_assistant_chat_english_greeting(client):
    """Test English greeting and assistant personality introduction."""
    payload = {
        "message": "Hello, who are you?",
        "language": "en",
        "history": []
    }
    resp = client.post("/api/assistant/chat", json=payload)
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert data["status"] == "success"
    assert "Vignan Spandana AI Assistant" in data["response"]
    assert "Telugu or English" in data["response"]


def test_api_assistant_chat_telugu_greeting(client):
    """Test Telugu greeting and assistant personality introduction."""
    payload = {
        "message": "నమస్కారం, మీరెవరు?",
        "language": "te",
        "history": []
    }
    resp = client.post("/api/assistant/chat", json=payload)
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert data["status"] == "success"
    assert "విఘ్నాన్ స్పందన AI అసిస్టెంట్" in data["response"]
    assert "తెలుగు" in data["response"]


def test_api_assistant_chat_attendance_disclaimer_english(client):
    """
    Test mandatory fictional disclaimer on attendance query:
    'In this demonstration, the sample attendance record shows the student as absent.
     In a real system, I would check the verified college attendance record before answering.'
    """
    payload = {
        "message": "Why was the student marked absent?",
        "language": "en",
        "history": []
    }
    resp = client.post("/api/assistant/chat", json=payload)
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert data["status"] == "success"
    expected_clause = (
        "In this demonstration, the sample attendance record shows the student as absent. "
        "In a real system, I would check the verified college attendance record before answering."
    )
    assert expected_clause in data["response"]


def test_api_assistant_chat_attendance_disclaimer_telugu(client):
    """Test mandatory fictional disclaimer on attendance query in Telugu."""
    payload = {
        "message": "విద్యార్థి ఎందుకు గైర్హాజరు (absent) అయ్యారు?",
        "language": "te",
        "history": []
    }
    resp = client.post("/api/assistant/chat", json=payload)
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert data["status"] == "success"
    expected_te_clause = (
        "ఈ ప్రదర్శనలో, నమూనా హాజరు రికార్డు ప్రకారం విద్యార్థి గైర్హాజరైనట్లు చూపుతోంది. "
        "వాస్తవ వ్యవస్థలో, సమాధానం ఇచ్చే ముందు నేను ధృవీకరించబడిన కళాశాల హాజరు రికార్డును తనిఖీ చేస్తాను."
    )
    assert expected_te_clause in data["response"]


def test_api_assistant_chat_how_it_works(client):
    """Test explanation of voice assistant microphone, STT, AI engine, and TTS."""
    payload = {
        "message": "How does this voice assistant work?",
        "language": "en",
        "history": []
    }
    resp = client.post("/api/assistant/chat", json=payload)
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert data["status"] == "success"
    assert "microphone" in data["response"].lower()
    assert "speech" in data["response"].lower()


def test_api_assistant_chat_multi_turn_history(client):
    """Test multi-turn conversation maintains continuity."""
    history = [
        {"role": "user", "text": "Hello"},
        {"role": "assistant", "text": "Hello! I am Vignan Spandana AI Assistant. How can I help you?"}
    ]
    payload = {
        "message": "Can a faculty member call me back regarding exam dates?",
        "language": "en",
        "history": history
    }
    resp = client.post("/api/assistant/chat", json=payload)
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert data["status"] == "success"
    assert ("faculty" in data["response"].lower() or "coordinator" in data["response"].lower())


def test_api_assistant_chat_empty_message(client):
    """Test graceful handling of empty or whitespace speech."""
    payload = {
        "message": "   ",
        "language": "en",
        "history": []
    }
    resp = client.post("/api/assistant/chat", json=payload)
    assert resp.status_code == 200
    data = json.loads(resp.data.decode("utf-8"))
    assert data.get("is_empty") is True
    assert "didn't catch that" in data["response"]

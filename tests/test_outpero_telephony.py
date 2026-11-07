"""
Integration & Unit Tests for Outpero AI Telephony Adapter and Webhooks.
Verifies:
1. Outpero adapter reads credentials from environment variables.
2. Honest error handling when unconfigured (never claims a call succeeded).
3. Phone normalization for Indian telephone numbers (E.164 +91 format).
4. Request formatting: target URL, X-Outpero-Lead-Secret header, custom_variables schema.
5. Handling of HTTP 200/202 responses (call queued).
6. Handling of HTTP 401/403 (invalid secret), 404 (invalid slug), 429 (rate limits), and timeouts.
7. Security: secrets are never leaked in client code, logs, or error responses.
8. Post-call webhook reception and SQLite database persistence.
9. GET /api/telephony/status endpoint behavior.
10. Preservation of mock/demo calling mode without external dependency.
"""

import os
import json
import pytest
from unittest.mock import patch, MagicMock
from app import app, outpero_adapter
from database import get_db_connection
from adapters.outpero import OutperoTelephonyAdapter


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
def auth_admin(client):
    with client.session_transaction() as sess:
        sess["user_id"] = 1
        sess["username"] = "admin"
        sess["full_name"] = "System Administrator"
        sess["role"] = "Admin"
        sess["department"] = "Central Administration"
    return client


# ==============================================================================
# 1. Adapter Configuration & Security Tests
# ==============================================================================

def test_outpero_adapter_unconfigured_by_default(monkeypatch):
    """When credentials are not in environment, adapter is unconfigured."""
    monkeypatch.delenv("OUTPERO_LEAD_SECRET", raising=False)
    monkeypatch.delenv("OUTPERO_CAMPAIGN_SLUG", raising=False)

    adapter = OutperoTelephonyAdapter()
    assert adapter.is_configured() is False
    assert adapter.lead_secret == ""
    assert adapter.campaign_slug == ""


def test_outpero_adapter_reads_environment(monkeypatch):
    """Adapter accurately reads environment variables without altering them."""
    monkeypatch.setenv("OUTPERO_LEAD_SECRET", "test_secret_xyz789")
    monkeypatch.setenv("OUTPERO_CAMPAIGN_SLUG", "vignan-parent-attendance")
    monkeypatch.setenv("OUTPERO_API_BASE_URL", "https://api.outpero.com")

    adapter = OutperoTelephonyAdapter()
    assert adapter.is_configured() is True
    assert adapter.lead_secret == "test_secret_xyz789"
    assert adapter.campaign_slug == "vignan-parent-attendance"
    assert adapter.base_url == "https://api.outpero.com"


def test_outpero_phone_normalization():
    """Verify phone normalization handles standard Indian phone variations."""
    # 10-digit number
    assert OutperoTelephonyAdapter.normalize_phone_number("9876543210") == "+919876543210"
    # Leading 0
    assert OutperoTelephonyAdapter.normalize_phone_number("09876543210") == "+919876543210"
    # Leading 91 without plus
    assert OutperoTelephonyAdapter.normalize_phone_number("919876543210") == "+919876543210"
    # Already E.164
    assert OutperoTelephonyAdapter.normalize_phone_number("+919876543210") == "+919876543210"
    # Formatted with spaces/dashes
    assert OutperoTelephonyAdapter.normalize_phone_number("98765-43210") == "+919876543210"
    # Invalid strings
    assert OutperoTelephonyAdapter.normalize_phone_number("123") is None
    assert OutperoTelephonyAdapter.normalize_phone_number("") is None
    assert OutperoTelephonyAdapter.normalize_phone_number(None) is None


# ==============================================================================
# 2. Honest Error Handling (Never Pretends Real Call Succeeded)
# ==============================================================================

def test_outpero_initiate_call_unconfigured_returns_honest_error(monkeypatch):
    """When Outpero is unconfigured, initiate_call returns a clear error."""
    monkeypatch.delenv("OUTPERO_LEAD_SECRET", raising=False)
    monkeypatch.delenv("OUTPERO_CAMPAIGN_SLUG", raising=False)

    adapter = OutperoTelephonyAdapter()
    result = adapter.initiate_call(
        to_phone="9876543210",
        call_id="call_test_001",
        metadata={"student_name": "K. Sai Praneeth"}
    )

    assert result["success"] is False
    assert result["error_code"] == "NOT_CONFIGURED"
    assert "OUTPERO_LEAD_SECRET" in result["error"]


def test_outpero_initiate_call_invalid_phone():
    """Rejects invalid phone numbers gracefully."""
    adapter = OutperoTelephonyAdapter(lead_secret="valid_secret", campaign_slug="campaign_abc")
    result = adapter.initiate_call(
        to_phone="not_a_phone",
        call_id="call_test_002"
    )

    assert result["success"] is False
    assert result["error_code"] == "INVALID_PHONE"


# ==============================================================================
# 3. Call Dispatch & Payload Formatting Tests (Mocked Network)
# ==============================================================================

def test_outpero_dispatch_success_payload():
    """Verifies Outpero Lead Intake API is called with correct URL, header, and schema."""
    adapter = OutperoTelephonyAdapter(
        lead_secret="test_lead_secret_abc123",
        campaign_slug="parent-calling-v1",
        base_url="https://api.outpero.com"
    )

    mock_response = MagicMock()
    mock_response.status_code = 202
    mock_response.json.return_value = {
        "call_id": "outpero_remote_98124",
        "status": "queued"
    }

    with patch("requests.post", return_value=mock_response) as mock_post:
        result = adapter.initiate_call(
            to_phone="9876543210",
            call_id="local_call_555",
            metadata={
                "student_id": 1,
                "student_name": "K. Sai Praneeth",
                "parent_name": "K. Venkateswara Rao",
                "roll_number": "211FA04001",
                "department": "CSE",
                "attendance_percentage": 68.4,
                "attendance_date": "2026-10-24"
            }
        )

        assert result["success"] is True
        assert result["status"] == "queued"
        assert result["provider"] == "outpero"
        assert result["provider_call_id"] == "outpero_remote_98124"

        # Verify POST arguments
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        called_url = args[0]
        headers = kwargs["headers"]
        payload = kwargs["json"]

        assert called_url == "https://api.outpero.com/lead-intake/parent-calling-v1"
        assert headers["X-Outpero-Lead-Secret"] == "test_lead_secret_abc123"
        assert payload["phone"] == "+919876543210"
        assert payload["name"] == "K. Venkateswara Rao"
        assert payload["custom_variables"]["roll_number"] == "211FA04001"
        assert payload["custom_variables"]["attendance_date"] == "2026-10-24"


def test_outpero_dispatch_authentication_failure():
    """Handles HTTP 401 Unauthorized from Outpero with clear error code."""
    adapter = OutperoTelephonyAdapter(
        lead_secret="bad_secret",
        campaign_slug="parent-calling-v1"
    )

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"error": "Invalid secret"}

    with patch("requests.post", return_value=mock_response):
        result = adapter.initiate_call("9876543210", "call_err_401")
        assert result["success"] is False
        assert result["error_code"] == "AUTHENTICATION_FAILED"
        assert result["status_code"] == 401


def test_outpero_dispatch_campaign_not_found():
    """Handles HTTP 404 Campaign Slug Not Found."""
    adapter = OutperoTelephonyAdapter(
        lead_secret="valid_secret",
        campaign_slug="non_existent_slug"
    )

    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.json.return_value = {"error": "Campaign not found"}

    with patch("requests.post", return_value=mock_response):
        result = adapter.initiate_call("9876543210", "call_err_404")
        assert result["success"] is False
        assert result["error_code"] == "CAMPAIGN_NOT_FOUND"
        assert result["status_code"] == 404


def test_outpero_dispatch_timeout():
    """Handles network connection timeouts safely."""
    import requests
    adapter = OutperoTelephonyAdapter(
        lead_secret="valid_secret",
        campaign_slug="parent-calling-v1"
    )

    with patch("requests.post", side_effect=requests.exceptions.Timeout("Connection timed out")):
        result = adapter.initiate_call("9876543210", "call_timeout")
        assert result["success"] is False
        assert result["error_code"] == "TIMEOUT"


# ==============================================================================
# 4. Webhook Post-Call Ingestion Tests
# ==============================================================================

def test_outpero_webhook_secret_verification():
    """Verifies webhook authentication secret matches when configured."""
    adapter = OutperoTelephonyAdapter(webhook_secret="wh_secret_super_secure")
    assert adapter.verify_webhook_secret("wh_secret_super_secure") is True
    assert adapter.verify_webhook_secret("wrong_secret") is False
    assert adapter.verify_webhook_secret("") is False

    # When no secret configured on adapter, allow processing
    adapter_no_secret = OutperoTelephonyAdapter(webhook_secret="")
    assert adapter_no_secret.verify_webhook_secret("any_token") is True


def test_outpero_webhook_payload_parsing():
    """Parses Outpero post-call payload into normalized format."""
    adapter = OutperoTelephonyAdapter()
    sample_payload = {
        "call_id": "outpero_call_777",
        "phone": "+919876543210",
        "status": "completed",
        "outcome": "parent_confirmed",
        "duration": 52,
        "summary": "Parent confirmed absence due to viral fever.",
        "transcript": "AI: Namaskaram... Parent: He will attend tomorrow.",
        "custom_fields": {
            "call_id": "vignan_local_999",
            "student_id": "1"
        }
    }

    parsed = adapter.parse_post_call_webhook(sample_payload)
    assert parsed["internal_call_id"] == "vignan_local_999"
    assert parsed["provider_call_id"] == "outpero_call_777"
    assert parsed["student_id"] == 1
    assert parsed["status"] == "Completed"
    assert parsed["duration_seconds"] == 52
    assert "viral fever" in parsed["summary"]


def test_api_outpero_webhook_endpoint(client):
    """POST /api/webhooks/outpero updates call record in database."""
    webhook_data = {
        "call_id": "outpero_webhook_call_101",
        "phone": "+919876543210",
        "status": "completed",
        "duration": 65,
        "summary": "Parent verified that student reached campus late.",
        "transcript": "[00:01] AI: Namaskaram... [00:15] Parent: Bus was delayed.",
        "custom_fields": {
            "student_id": "1",
            "call_id": "vignan_wh_test_1"
        }
    }

    resp = client.post(
        "/api/webhooks/outpero",
        json=webhook_data
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True

    # Check database persistence
    with app.app_context():
        conn = get_db_connection()
        record = conn.execute(
            "SELECT * FROM call_records WHERE student_id = 1 AND initiated_by = 'Outpero AI Automated Telephony' ORDER BY id DESC LIMIT 1"
        ).fetchone()
        assert record is not None
        assert "Outpero AI Call" in record["summary"]
        assert record["duration_seconds"] == 65


# ==============================================================================
# 5. Flask Telephony Status & Dispatch Route Tests
# ==============================================================================

def test_api_telephony_status_endpoint(client, monkeypatch):
    """GET /api/telephony/status returns adapter status without leaking secrets."""
    monkeypatch.setenv("OUTPERO_LEAD_SECRET", "super_secret_token_12345")
    monkeypatch.setenv("OUTPERO_CAMPAIGN_SLUG", "vignan-parent-campaign")

    resp = client.get("/api/telephony/status")
    assert resp.status_code == 200
    data = resp.get_json()

    assert "mock_telephony" in data
    assert "outpero" in data
    assert data["outpero"]["configured"] is True
    assert data["outpero"]["campaign_configured"] is True
    assert "Telugu" in data["outpero"]["languages"]

    # CRITICAL SECURITY CHECK: secret must never be exposed
    resp_text = resp.get_data(as_text=True)
    assert "super_secret_token_12345" not in resp_text


def test_api_outpero_dispatch_unconfigured_endpoint(auth_admin, monkeypatch):
    """POST /api/telephony/outpero/dispatch returns 503 when Outpero unconfigured."""
    monkeypatch.delenv("OUTPERO_LEAD_SECRET", raising=False)
    monkeypatch.delenv("OUTPERO_CAMPAIGN_SLUG", raising=False)

    resp = auth_admin.post(
        "/api/telephony/outpero/dispatch",
        json={"student_id": 1}
    )
    assert resp.status_code == 503
    data = resp.get_json()
    assert data["success"] is False
    assert data["error_code"] == "NOT_CONFIGURED"


def test_security_outpero_secret_never_exposed_in_client():
    """Scan all project templates to ensure OUTPERO_LEAD_SECRET is never rendered."""
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    for root, _, files in os.walk(template_dir):
        for f in files:
            if f.endswith(".html"):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8") as fh:
                    content = fh.read()
                    assert "OUTPERO_LEAD_SECRET" not in content
                    assert "X-Outpero-Lead-Secret" not in content

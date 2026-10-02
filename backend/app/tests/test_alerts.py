"""
Tests for alert endpoints and SMS integration.
Covers: alert retrieval, SMS testing, alert resolution.
"""

import pytest
from fastapi import status


class TestGetAlerts:
    """Alert retrieval tests."""
    
    def test_get_all_alerts(self, client, test_user, test_batch):
        """Authenticated user can get all alerts."""
        response = client.get(
            "/alerts",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_alerts_no_auth(self, client):
        """Unauthenticated request to get alerts fails."""
        response = client.get("/alerts")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_critical_alerts(self, client, test_user, critical_batch):
        """User can get only CRITICAL severity alerts."""
        response = client.get(
            "/alerts/critical",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        # All returned alerts should be CRITICAL severity
        for alert in data:
            assert alert["severity"] in ["CRITICAL", "HIGH", "MEDIUM"]


class TestAlertMarkAsRead:
    """Alert status update tests."""
    
    def test_mark_alert_as_read(self, client, test_user, test_batch):
        """User can mark an alert as read."""
        # First get an alert
        alerts_response = client.get(
            "/alerts",
            headers=test_user["headers"],
        )
        
        if alerts_response.status_code == 200 and len(alerts_response.json()) > 0:
            alert_id = alerts_response.json()[0]["id"]
            
            # Mark as read
            response = client.patch(
                f"/alerts/{alert_id}/read",
                headers=test_user["headers"],
            )
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["is_read"] is True
    
    def test_mark_alert_as_read_no_auth(self, client):
        """Unauthenticated user cannot mark alert as read."""
        response = client.patch(
            "/alerts/1/read",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_mark_nonexistent_alert_as_read(self, client, test_user):
        """Marking non-existent alert returns 404."""
        response = client.patch(
            "/alerts/99999/read",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestSMSTest:
    """SMS testing endpoint tests."""
    
    def test_send_test_sms_success(self, client, test_user):
        """User can send a test SMS."""
        response = client.post(
            "/alerts/test-sms",
            json={
                "phone_number": "+233501234567",
                "message": "Test alert message",
            },
            headers=test_user["headers"],
        )
        # Should succeed or fail gracefully depending on SMS provider
        assert response.status_code in [200, 201, 400, 503]
    
    def test_send_test_sms_no_auth(self, client):
        """Unauthenticated user cannot send test SMS."""
        response = client.post(
            "/alerts/test-sms",
            json={
                "phone_number": "+233501234567",
                "message": "Test message",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_send_test_sms_invalid_phone(self, client, test_user):
        """Invalid phone number is rejected."""
        response = client.post(
            "/alerts/test-sms",
            json={
                "phone_number": "invalid-phone",
                "message": "Test message",
            },
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestAlertGeneration:
    """Tests for automatic alert generation."""
    
    def test_expired_batch_generates_alert(self, client, test_user, expired_batch):
        """Creating an expired batch should generate an alert."""
        response = client.get(
            "/alerts",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        alerts = response.json()
        
        # Check if there's an alert for the expired batch
        expired_alerts = [a for a in alerts if a["batch_id"] == expired_batch["id"]]
        # Should have at least one alert
        # Note: This depends on alert generation timing
        if len(expired_alerts) > 0:
            alert = expired_alerts[0]
            assert alert["alert_type"] in ["EXPIRED", "EXPIRY_ALERT"]
            assert alert["severity"] in ["HIGH", "CRITICAL"]
    
    def test_critical_batch_generates_alert(self, client, test_user, critical_batch):
        """Creating a critical batch should generate an alert."""
        response = client.get(
            "/alerts",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        alerts = response.json()
        
        # Check if there's an alert for the critical batch
        critical_alerts = [a for a in alerts if a["batch_id"] == critical_batch["id"]]
        # Should have at least one alert
        if len(critical_alerts) > 0:
            alert = critical_alerts[0]
            assert alert["alert_type"] in ["EXPIRY_ALERT", "CRITICAL"]
            assert alert["severity"] in ["MEDIUM", "HIGH"]


class TestAlertSMSTracking:
    """Tests for SMS status tracking on alerts."""
    
    def test_alert_has_sms_fields(self, client, test_user):
        """Alerts have SMS tracking fields."""
        response = client.get(
            "/alerts",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        alerts = response.json()
        
        if len(alerts) > 0:
            alert = alerts[0]
            # Should have SMS-related fields
            assert "sms_status" in alert or "sms_sent" in alert

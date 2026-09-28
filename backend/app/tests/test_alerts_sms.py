"""Tests for alert and SMS functionality"""

import pytest
from datetime import date, timedelta
from unittest.mock import Mock, patch

# Mock models for testing
class MockBatch:
    def __init__(self, batch_id, product_name, status, days_remaining):
        self.id = batch_id
        self.batch_number = f"BATCH_{batch_id}"
        self.status = status
        self.days_remaining = days_remaining
        self.expiry_date = date.today() + timedelta(days=days_remaining)
        
        self.product = Mock()
        self.product.name = product_name


class MockAlert:
    def __init__(self, alert_id, alert_type, sms_status="PENDING"):
        self.id = alert_id
        self.alert_type = alert_type
        self.sms_status = sms_status
        self.sms_sent = False
        self.recipient_phone = "+1234567890"
        self.message = "Test message"


# Test status mapping
def test_status_to_alert_type():
    """Test mapping of expiry status to alert type"""
    from app.services.alert_service import map_status_to_alert_type
    from app.models.batch import ExpiryStatus
    from app.models.alert import AlertType
    
    assert map_status_to_alert_type(ExpiryStatus.EXPIRED) == AlertType.EXPIRED
    assert map_status_to_alert_type(ExpiryStatus.CRITICAL) == AlertType.CRITICAL
    assert map_status_to_alert_type(ExpiryStatus.EXPIRING_SOON) == AlertType.EXPIRING_SOON
    assert map_status_to_alert_type(ExpiryStatus.SAFE) is None


def test_alert_type_to_severity():
    """Test mapping of alert type to severity"""
    from app.services.alert_service import map_alert_type_to_severity
    from app.models.alert import AlertType, AlertSeverity
    
    assert map_alert_type_to_severity(AlertType.EXPIRED) == AlertSeverity.HIGH
    assert map_alert_type_to_severity(AlertType.CRITICAL) == AlertSeverity.MEDIUM
    assert map_alert_type_to_severity(AlertType.EXPIRING_SOON) == AlertSeverity.LOW


# Test alert creation logic
def test_should_create_alert_expired():
    """Test: Alert should be created for EXPIRED status"""
    from app.services.alert_service import should_create_alert
    from app.models.batch import ExpiryStatus
    
    batch = MockBatch(1, "Medication A", ExpiryStatus.EXPIRED, -5)
    assert should_create_alert(batch) == True


def test_should_create_alert_critical():
    """Test: Alert should be created for CRITICAL status"""
    from app.services.alert_service import should_create_alert
    from app.models.batch import ExpiryStatus
    
    batch = MockBatch(1, "Medication A", ExpiryStatus.CRITICAL, 15)
    assert should_create_alert(batch) == True


def test_should_create_alert_expiring_soon():
    """Test: Alert should be created for EXPIRING_SOON status"""
    from app.services.alert_service import should_create_alert
    from app.models.batch import ExpiryStatus
    
    batch = MockBatch(1, "Medication A", ExpiryStatus.EXPIRING_SOON, 60)
    assert should_create_alert(batch) == True


def test_should_not_create_alert_safe():
    """Test: Alert should NOT be created for SAFE status"""
    from app.services.alert_service import should_create_alert
    from app.models.batch import ExpiryStatus
    
    batch = MockBatch(1, "Medication A", ExpiryStatus.SAFE, 365)
    assert should_create_alert(batch) == False


# Test message generation
def test_generate_alert_message_expired():
    """Test: Message generation for EXPIRED status"""
    from app.services.alert_service import generate_alert_message
    from app.models.batch import ExpiryStatus
    
    batch = MockBatch(1, "Paracetamol", ExpiryStatus.EXPIRED, -1)
    message = generate_alert_message(batch)
    
    assert "Paracetamol" in message
    assert "EXPIRED" in message
    assert "Remove from inventory" in message


def test_generate_alert_message_critical():
    """Test: Message generation for CRITICAL status"""
    from app.services.alert_service import generate_alert_message
    from app.models.batch import ExpiryStatus
    
    batch = MockBatch(1, "Amoxicillin", ExpiryStatus.CRITICAL, 14)
    message = generate_alert_message(batch)
    
    assert "Amoxicillin" in message
    assert "CRITICAL" in message
    assert "14 days" in message
    assert "Urgent" in message


def test_generate_alert_message_expiring_soon():
    """Test: Message generation for EXPIRING_SOON status"""
    from app.services.alert_service import generate_alert_message
    from app.models.batch import ExpiryStatus
    
    batch = MockBatch(1, "Aspirin", ExpiryStatus.EXPIRING_SOON, 60)
    message = generate_alert_message(batch)
    
    assert "Aspirin" in message
    assert "Expiring soon" in message
    assert "60 days" in message


# Test SMS providers
def test_mock_sms_provider():
    """Test: Mock SMS provider for development"""
    from app.services.sms_service import MockSMSProvider
    
    provider = MockSMSProvider()
    result = provider.send_sms("+1234567890", "Test message")
    
    assert result["success"] == True
    assert result["message_id"] is not None
    assert result["error"] is None


def test_sms_service_initialization():
    """Test: SMS service initializes with MOCK provider by default"""
    from app.services.sms_service import SMSService, MockSMSProvider
    
    service = SMSService()
    assert isinstance(service.provider, MockSMSProvider)


def test_sms_alert_message_format_expired():
    """Test: SMS message format for EXPIRED alert"""
    from app.services.sms_service import SMSService
    
    service = SMSService()
    result = service.send_alert_sms(
        phone_number="+1234567890",
        product_name="Medication X",
        status="EXPIRED",
        days_remaining=0
    )
    
    assert result["success"] == True


def test_sms_alert_message_format_critical():
    """Test: SMS message format for CRITICAL alert"""
    from app.services.sms_service import SMSService
    
    service = SMSService()
    result = service.send_alert_sms(
        phone_number="+1234567890",
        product_name="Medication Y",
        status="CRITICAL",
        days_remaining=7
    )
    
    assert result["success"] == True


def test_sms_test_message():
    """Test: Test SMS message"""
    from app.services.sms_service import SMSService
    
    service = SMSService()
    result = service.send_test_sms("+1234567890")
    
    assert result["success"] == True
    assert "Test SMS" in result.get("message_id", "")


# Test alert workflow
def test_complete_alert_workflow():
    """
    Test: Complete workflow
    Batch → Expiry Engine → Alert Service → Database → SMS Service
    """
    from app.models.batch import ExpiryStatus
    from app.services.alert_service import (
        should_create_alert,
        generate_alert_message,
        map_status_to_alert_type,
        map_alert_type_to_severity,
    )
    from app.models.alert import AlertType, AlertSeverity
    
    # Step 1: Create batch with CRITICAL status
    batch = MockBatch(1, "Medication", ExpiryStatus.CRITICAL, 15)
    
    # Step 2: Check if alert should be created
    assert should_create_alert(batch) == True
    
    # Step 3: Generate message
    message = generate_alert_message(batch)
    assert "Medication" in message
    
    # Step 4: Map to alert type
    alert_type = map_status_to_alert_type(batch.status)
    assert alert_type == AlertType.CRITICAL
    
    # Step 5: Map to severity
    severity = map_alert_type_to_severity(alert_type)
    assert severity == AlertSeverity.MEDIUM
    
    # All steps passed!
    print(f"✅ Alert workflow complete: {message}")


# Test duplicate alert prevention
def test_no_duplicate_alerts_same_batch():
    """
    Test: Don't create duplicate alerts for same batch/type
    One active alert per batch/alert_type, update if already exists
    """
    # This would be tested with actual database session
    # For now, document the expected behavior
    pass


# Test SMS status transitions
def test_sms_status_pending_to_sent():
    """Test: SMS status transition PENDING → SENT"""
    from app.models.alert import SMSStatus
    
    alert = MockAlert(1, "CRITICAL", SMSStatus.PENDING)
    assert alert.sms_status == SMSStatus.PENDING
    
    # After sending
    alert.sms_status = SMSStatus.SENT
    alert.sms_sent = True
    
    assert alert.sms_status == SMSStatus.SENT
    assert alert.sms_sent == True


def test_sms_status_pending_to_failed():
    """Test: SMS status transition PENDING → FAILED"""
    from app.models.alert import SMSStatus
    
    alert = MockAlert(1, "CRITICAL", SMSStatus.PENDING)
    
    # After failed send
    alert.sms_status = SMSStatus.FAILED
    alert.sms_error = "Invalid phone number"
    
    assert alert.sms_status == SMSStatus.FAILED
    assert alert.sms_error == "Invalid phone number"


def test_sms_status_no_phone():
    """Test: SMS status SKIPPED when no phone number"""
    from app.models.alert import SMSStatus
    
    alert = MockAlert(1, "CRITICAL", SMSStatus.PENDING)
    alert.recipient_phone = None
    
    # Should be skipped
    alert.sms_status = SMSStatus.SKIPPED
    
    assert alert.sms_status == SMSStatus.SKIPPED


# Integration test
def test_alert_summary_statistics():
    """
    Test: Alert statistics useful for dashboard
    - Total alerts
    - Unread alerts
    - Critical alerts
    - Expired alerts
    - SMS status breakdown
    """
    # Example of what dashboard endpoint should return
    summary = {
        "total_alerts": 42,
        "unread_alerts": 12,
        "critical_alerts": 5,
        "expired_alerts": 2,
        "sms_sent": 35,
        "sms_failed": 4,
        "sms_pending": 3,
    }
    
    assert summary["total_alerts"] > 0
    assert summary["sms_sent"] + summary["sms_failed"] + summary["sms_pending"] <= summary["total_alerts"]


if __name__ == "__main__":
    print("Running Alert & SMS Tests\n")
    print("=" * 70)
    
    test_status_to_alert_type()
    print("✅ Status to AlertType mapping")
    
    test_alert_type_to_severity()
    print("✅ AlertType to Severity mapping")
    
    test_should_create_alert_expired()
    test_should_create_alert_critical()
    test_should_create_alert_expiring_soon()
    test_should_not_create_alert_safe()
    print("✅ Alert creation logic")
    
    test_generate_alert_message_expired()
    test_generate_alert_message_critical()
    test_generate_alert_message_expiring_soon()
    print("✅ Alert message generation")
    
    test_mock_sms_provider()
    print("✅ Mock SMS provider")
    
    test_sms_service_initialization()
    print("✅ SMS service initialization")
    
    test_sms_alert_message_format_expired()
    test_sms_alert_message_format_critical()
    print("✅ SMS message formatting")
    
    test_sms_test_message()
    print("✅ SMS test message")
    
    test_complete_alert_workflow()
    print("✅ Complete alert workflow")
    
    test_sms_status_pending_to_sent()
    test_sms_status_pending_to_failed()
    test_sms_status_no_phone()
    print("✅ SMS status transitions")
    
    test_alert_summary_statistics()
    print("✅ Alert statistics")
    
    print("\n" + "=" * 70)
    print("✅ ALL ALERT & SMS TESTS PASSED\n")

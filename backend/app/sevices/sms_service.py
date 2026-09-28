"""SMS Service - Abstracted SMS provider for sending alerts"""

from abc import ABC, abstractmethod
from enum import Enum
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SMSProvider(str, Enum):
    """Supported SMS providers"""
    MOCK = "MOCK"
    TWILIO = "TWILIO"
    AFRICASTALKING = "AFRICASTALKING"


class BaseSMSProvider(ABC):
    """Abstract base class for SMS providers"""
    
    @abstractmethod
    def send_sms(self, phone_number: str, message: str) -> dict:
        """
        Send SMS message
        
        Args:
            phone_number: Recipient phone number
            message: SMS message text
            
        Returns:
            {
                "success": bool,
                "message_id": str or None,
                "error": str or None
            }
        """
        pass


class MockSMSProvider(BaseSMSProvider):
    """Mock SMS provider for development/testing"""
    
    def send_sms(self, phone_number: str, message: str) -> dict:
        """
        Simulate SMS sending without actually sending
        Useful for development and testing
        """
        logger.info(f"[MOCK SMS] To: {phone_number}")
        logger.info(f"[MOCK SMS] Message: {message}")
        
        return {
            "success": True,
            "message_id": f"mock-{phone_number}-{id(message)}",
            "error": None
        }


class TwilioSMSProvider(BaseSMSProvider):
    """Twilio SMS provider for production"""
    
    def __init__(self):
        """Initialize Twilio client"""
        try:
            from twilio.rest import Client
            
            account_sid = settings.twilio_account_sid
            auth_token = settings.twilio_auth_token
            self.twilio_phone = settings.twilio_phone_number
            
            if not all([account_sid, auth_token, self.twilio_phone]):
                raise ValueError("Missing Twilio credentials in .env")
            
            self.client = Client(account_sid, auth_token)
            logger.info("Twilio SMS provider initialized")
        except ImportError:
            logger.error("Twilio not installed. Run: pip install twilio")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Twilio: {e}")
            raise
    
    def send_sms(self, phone_number: str, message: str) -> dict:
        """Send SMS via Twilio"""
        try:
            sms = self.client.messages.create(
                body=message,
                from_=self.twilio_phone,
                to=phone_number
            )
            
            logger.info(f"SMS sent via Twilio: {sms.sid}")
            
            return {
                "success": True,
                "message_id": sms.sid,
                "error": None
            }
        except Exception as e:
            logger.error(f"Twilio SMS failed: {str(e)}")
            
            return {
                "success": False,
                "message_id": None,
                "error": str(e)
            }


class AfricasTalkingSMSProvider(BaseSMSProvider):
    """Africa's Talking SMS provider (popular in Africa)"""
    
    def __init__(self):
        """Initialize Africa's Talking client"""
        try:
            import africastalking
            
            api_key = settings.africastalking_api_key
            username = settings.africastalking_username
            
            if not all([api_key, username]):
                raise ValueError("Missing Africa's Talking credentials in .env")
            
            africastalking.initialize(username, api_key)
            self.sms = africastalking.SMS
            
            logger.info("Africa's Talking SMS provider initialized")
        except ImportError:
            logger.error("Africa's Talking not installed. Run: pip install africastalking")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Africa's Talking: {e}")
            raise
    
    def send_sms(self, phone_number: str, message: str) -> dict:
        """Send SMS via Africa's Talking"""
        try:
            response = self.sms.send(message, [phone_number])
            
            logger.info(f"SMS sent via Africa's Talking: {response}")
            
            return {
                "success": True,
                "message_id": response.get("id"),
                "error": None
            }
        except Exception as e:
            logger.error(f"Africa's Talking SMS failed: {str(e)}")
            
            return {
                "success": False,
                "message_id": None,
                "error": str(e)
            }


class SMSService:
    """SMS Service - abstracted from provider"""
    
    def __init__(self):
        """Initialize SMS service with configured provider"""
        self.provider_name = getattr(settings, "sms_provider", "MOCK").upper()
        self.provider = self._initialize_provider()
        logger.info(f"SMS Service initialized with provider: {self.provider_name}")
    
    def _initialize_provider(self) -> BaseSMSProvider:
        """Initialize the configured SMS provider"""
        if self.provider_name == "MOCK":
            return MockSMSProvider()
        elif self.provider_name == "TWILIO":
            return TwilioSMSProvider()
        elif self.provider_name == "AFRICASTALKING":
            return AfricasTalkingSMSProvider()
        else:
            logger.warning(f"Unknown SMS provider: {self.provider_name}, using MOCK")
            return MockSMSProvider()
    
    def send_alert_sms(self, phone_number: str, product_name: str, 
                       status: str, days_remaining: int) -> dict:
        """
        Send alert SMS for batch expiry
        
        Args:
            phone_number: Recipient phone number
            product_name: Name of product
            status: Expiry status (EXPIRED, CRITICAL, EXPIRING_SOON)
            days_remaining: Days until expiry
            
        Returns:
            {"success": bool, "message_id": str or None, "error": str or None}
        """
        
        # Build message
        if status == "EXPIRED":
            message = f"🚨 EXPIRED: {product_name} has expired and should not be used."
        elif status == "CRITICAL":
            message = f"🔴 CRITICAL: {product_name} expires in {days_remaining} days. Urgent action required."
        else:  # EXPIRING_SOON
            message = f"⚠️ EXPIRING SOON: {product_name} expires in {days_remaining} days. Plan accordingly."
        
        # Add branding
        message += " - ExpireGuard"
        
        # Send via provider
        try:
            result = self.provider.send_sms(phone_number, message)
            return result
        except Exception as e:
            logger.error(f"SMS service error: {str(e)}")
            return {
                "success": False,
                "message_id": None,
                "error": str(e)
            }
    
    def send_test_sms(self, phone_number: str, test_message: str = None) -> dict:
        """
        Send test SMS to verify SMS service is working
        
        Args:
            phone_number: Recipient phone number
            test_message: Optional custom message (default: generic test message)
            
        Returns:
            {"success": bool, "message_id": str or None, "error": str or None}
        """
        if not test_message:
            test_message = f"✅ Test SMS from ExpireGuard. If you see this, SMS is working! Provider: {self.provider_name}"
        
        try:
            result = self.provider.send_sms(phone_number, test_message)
            return result
        except Exception as e:
            logger.error(f"Test SMS failed: {str(e)}")
            return {
                "success": False,
                "message_id": None,
                "error": str(e)
            }


# Singleton instance
_sms_service = None

def get_sms_service() -> SMSService:
    """Get or create SMS service singleton"""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service

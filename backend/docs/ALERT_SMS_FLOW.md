# ExpireGuard Alert & SMS Flow Documentation

## Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ALERT & SMS SYSTEM                                   │
└─────────────────────────────────────────────────────────────────────────────┘

BATCH LIFECYCLE
    ↓
[Batch Created/Updated]
    ↓
    ▼
┌──────────────────────────┐
│   EXPIRY ENGINE          │
│ (services/expiry_service)│
├──────────────────────────┤
│ • Calculate days_remaining│
│ • Map to status:         │
│   - SAFE (>90 days)      │
│   - EXPIRING_SOON (31-90)│
│   - CRITICAL (1-30)      │
│   - EXPIRED (0 or less)  │
└──────────────┬───────────┘
               ↓
┌──────────────────────────────────┐
│   ALERT SERVICE                  │
│ (services/alert_service.py)      │
├──────────────────────────────────┤
│ • Should create alert?           │
│ • Check for duplicates           │
│ • Create or update alert         │
│ • Generate human-readable msg    │
│ • Trigger SMS send               │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│   POSTGRESQL DATABASE            │
│ (alerts table)                   │
├──────────────────────────────────┤
│ • id                             │
│ • batch_id                       │
│ • alert_type                     │
│ • severity                       │
│ • message                        │
│ • recipient_phone                │
│ • sms_status (PENDING/SENT/...) │
│ • sms_sent_at                    │
│ • sms_error (if failed)          │
│ • is_read                        │
│ • resolved_at                    │
└──────────────┬───────────────────┘
               ↓
┌──────────────────────────────────┐
│   SMS SERVICE                    │
│ (services/sms_service.py)        │
├──────────────────────────────────┤
│ • Abstract provider interface    │
│ • Format SMS message             │
│ • Handle provider selection      │
│ • Capture success/failure        │
└──────────────┬───────────────────┘
               ↓
        ┌──────────────────┐
        │  SMS PROVIDER    │
        ├──────────────────┤
        │                  │
    ┌───┴──────────────────┴──┐
    │                         │
    ▼                         ▼
┌─────────────┐        ┌──────────────────┐
│   MOCK      │        │  REAL PROVIDER   │
│   (MOCK SMS)│        │                  │
├─────────────┤        ├──────────────────┤
│ • Logs      │        │ • Twilio         │
│ • Returns   │        │ • Africa Talking │
│   success   │        │ • Others         │
│ • No actual │        │ • Sends actual   │
│   SMS sent  │        │   SMS            │
└─────────────┘        └──────────────────┘
    │                         │
    └──────────────┬──────────┘
                   ↓
┌────────────────────────────┐
│   SMS SENT / FAILED        │
│   Update alert in DB       │
│   Record timestamp         │
│   Log any errors           │
└────────────────┬───────────┘
                 ↓
┌────────────────────────────┐
│   API ENDPOINTS            │
│ (routes/alerts.py)         │
├────────────────────────────┤
│ • GET /alerts              │
│ • GET /alerts/critical     │
│ • GET /alerts/expired      │
│ • PATCH /alerts/{id}/read  │
│ • POST /alerts/test-sms    │
│ • GET /alerts/sms-status   │
└────────────────┬───────────┘
                 ↓
┌────────────────────────────┐
│   FRONTEND / DASHBOARD     │
│                            │
│ • Display alerts           │
│ • Show SMS status          │
│ • Mark as read             │
│ • Test SMS feature         │
└────────────────────────────┘
```

---

## Step-by-Step Execution Flow

### **Step 1: Batch is Created or Updated**

```python
# User creates batch via POST /batches
# Or batch is imported via CSV upload

POST /batches
{
    "product_id": 1,
    "batch_number": "BATCH_001",
    "quantity_received": 100,
    "expiry_date": "2025-12-31"
}
```

### **Step 2: Expiry Engine Calculates Status**

```python
# In routes/batches.py:
from app.services.expiry_service import update_batch_expiry_status
from app.services.alert_service import process_batch_alerts

batch = create_batch_in_db(...)

# Calculate days remaining and status
update_batch_expiry_status(db, batch)

# Example:
# today = 2025-09-25
# expiry_date = 2025-12-31
# days_remaining = 98
# status = SAFE (because 98 > 90)
```

### **Step 3: Alert Service Checks & Creates Alert**

```python
# In routes/batches.py:
process_batch_alerts(db, batch, recipient_phone="+233505123456")

# Inside alert_service.py:
# 1. Check: should_create_alert(batch)
#    - Returns False if status == SAFE
#    - Returns True for CRITICAL, EXPIRING_SOON, EXPIRED
#
# 2. Check: existing alert with same batch_id + alert_type?
#    - If yes: update existing alert
#    - If no: create new alert
#
# 3. Generate message
#    - "Medication X expires in 15 days. Urgent action required."
#
# 4. Save to database:
#    INSERT INTO alerts (batch_id, alert_type, severity, message, ...)
#    VALUES (1, 'CRITICAL', 'MEDIUM', '...', '+233505123456', 'PENDING')
```

### **Step 4: SMS Service Formats & Sends**

```python
# In alert_service.py - send_alert_sms():

# Format SMS
phone_number = "+233505123456"
product_name = "Medication X"
status = "CRITICAL"
days_remaining = 15

message = f"🔴 CRITICAL: {product_name} expires in {days_remaining} days. Urgent action required. - ExpireGuard"

# Get configured SMS provider
sms_service = get_sms_service()

# Send via selected provider
result = sms_service.send_alert_sms(phone_number, product_name, status, days_remaining)
# Returns: {"success": True, "message_id": "...", "error": None}
```

### **Step 5: SMS Provider Sends or Logs**

#### **If MOCK (Development)**
```python
# services/sms_service.py - MockSMSProvider:

logger.info("[MOCK SMS] To: +233505123456")
logger.info("[MOCK SMS] Message: 🔴 CRITICAL: Medication X expires in 15 days...")

# Return immediate success
return {"success": True, "message_id": "mock-...", "error": None}
```

#### **If TWILIO (Production)**
```python
# services/sms_service.py - TwilioSMSProvider:

from twilio.rest import Client

client = Client(account_sid, auth_token)
sms = client.messages.create(
    body="🔴 CRITICAL: Medication X expires in 15 days...",
    from_="+1234567890",      # Your Twilio number
    to="+233505123456"        # Recipient
)

return {"success": True, "message_id": sms.sid, "error": None}
```

### **Step 6: Update Alert Database Record**

```python
# In alert_service.py - send_alert_sms():

if result["success"]:
    alert.sms_status = SMSStatus.SENT
    alert.sms_sent = True
    alert.sms_sent_at = datetime.utcnow()
    db.commit()
else:
    alert.sms_status = SMSStatus.FAILED
    alert.sms_error = result["error"]
    db.commit()

# Database now shows:
# - sms_status: SENT (or FAILED, PENDING, SKIPPED)
# - sms_sent_at: 2025-09-25 14:30:45
# - sms_error: NULL or error message
```

### **Step 7: API Exposes Alerts**

```python
# Frontend can now query alerts:

GET /alerts
{
    "success": true,
    "alerts": [
        {
            "id": 1,
            "batch_id": 15,
            "alert_type": "CRITICAL",
            "severity": "MEDIUM",
            "message": "Medication X expires in 15 days. Urgent action required.",
            "recipient_phone": "+233505123456",
            "sms_status": "SENT",
            "sms_sent_at": "2025-09-25T14:30:45",
            "is_read": false,
            "created_at": "2025-09-25T14:30:30"
        }
    ]
}

GET /alerts/critical
{
    "success": true,
    "critical_alerts": [...]
}

GET /alerts/sms-status/summary
{
    "total_alerts": 42,
    "sms_sent": 38,
    "sms_failed": 2,
    "sms_pending": 1,
    "sms_skipped": 1
}
```

### **Step 8: Frontend Displays to User**

```
Dashboard View:
═══════════════════════════════════════════════════════════
🚨 Critical Alerts (5)

┌─ Medication X - CRITICAL - 15 days
│  SMS: ✅ SENT at 14:30
│  Status: ⬜ Unread
│
└─ Medication Y - CRITICAL - 7 days
   SMS: ❌ FAILED - Invalid phone number
   Status: ⬜ Unread
   
⚠️ Expiring Soon (8)

✅ Safe (24)
═══════════════════════════════════════════════════════════
```

---

## Key Design Decisions

### **1. Alert De-duplication**
**Problem:** Don't send duplicate alerts for same batch repeatedly
**Solution:** Only one *active* alert per batch/alert_type
- If alert exists: update it
- If alert resolved (resolved_at is set): create new alert

### **2. SMS Status Tracking**
```python
class SMSStatus(Enum):
    PENDING = "PENDING"    # Not sent yet
    SENT = "SENT"          # Successfully sent
    FAILED = "FAILED"      # Tried to send, failed
    SKIPPED = "SKIPPED"    # No phone number, so skipped
```

**Why?** Track SMS delivery for monitoring and debugging

### **3. Provider Abstraction**
```python
# Can swap providers without changing alert logic
SMS_PROVIDER=MOCK          # Development
SMS_PROVIDER=TWILIO        # Production
SMS_PROVIDER=AFRICASTALKING # Africa-specific
```

### **4. Retry Failed SMS**
```python
POST /alerts/retry-failed-sms?limit=10
# Automatically retry failed SMS alerts
# Useful for temporary provider outages
```

### **5. Test SMS Endpoint**
```python
POST /alerts/test-sms?phone_number=%2B233505123456
# Before real batch expiry triggers alerts,
# verify SMS is working
```

---

## Configuration

### **.env File**
```bash
# Provider selection
SMS_PROVIDER=MOCK  # MOCK | TWILIO | AFRICASTALKING

# Twilio (if SMS_PROVIDER=TWILIO)
TWILIO_ACCOUNT_SID=ac_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Africa's Talking (if SMS_PROVIDER=AFRICASTALKING)
AFRICASTALKING_API_KEY=xxxxx
AFRICASTALKING_USERNAME=xxxxx
```

### **Production Deployment**
```bash
# Development
SMS_PROVIDER=MOCK  # Simulates, logs to console

# Staging
SMS_PROVIDER=TWILIO
TWILIO_ACCOUNT_SID=ac_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Production
SMS_PROVIDER=AFRICASTALKING  # Regional SMS provider
AFRICASTALKING_API_KEY=xxxxx
AFRICASTALKING_USERNAME=xxxxx
```

---

## Error Handling

### **SMS Send Fails**
```python
# Alert is created and stored
# SMS sending fails (network, invalid number, etc.)

alert.sms_status = SMSStatus.FAILED
alert.sms_error = "Invalid phone number format"
# Alert still visible in dashboard
# Can retry with: POST /alerts/retry-failed-sms

# Expiry system continues working
# Next batch update will create new alert attempt
```

### **Database Insert Fails**
```python
# Alert creation fails (DB down, connection error)
# Exception caught and logged
# SMS not sent (can retry later)

logger.error("Failed to create alert for batch 15: ...")
# Alert can be recreated when DB is back
# Batch status is still updated
```

### **Invalid Phone Number**
```python
# Phone number not provided
alert.sms_status = SMSStatus.SKIPPED
alert.sms_error = None

# Alert created and visible
# But SMS not attempted
# User can still see alert in dashboard
```

---

## Testing

### **Run Unit Tests**
```bash
python test_alerts_sms.py
```

**Tests cover:**
- Status to AlertType mapping
- AlertType to Severity mapping
- Alert creation logic
- Message generation
- SMS providers
- SMS formatting
- Complete workflow

### **Manual Testing**

**1. Test MOCK provider (development)**
```bash
# .env
SMS_PROVIDER=MOCK

# Call endpoint
POST /alerts/test-sms?phone_number=%2B233505123456

# Should return success immediately
# Check console logs for [MOCK SMS] messages
```

**2. Test with real provider (Twilio)**
```bash
# .env
SMS_PROVIDER=TWILIO
TWILIO_ACCOUNT_SID=ac_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Call endpoint
POST /alerts/test-sms?phone_number=%2B233505123456

# Should send real SMS to that number
# Check Twilio dashboard for delivery status
```

**3. Test full workflow**
```bash
# Create batch with expiry date in 15 days
POST /batches
{
    "product_id": 1,
    "batch_number": "TEST_BATCH",
    "quantity_received": 100,
    "expiry_date": "2025-10-10",  # 15 days from now
    "recipient_phone": "+233505123456"
}

# Should trigger:
# 1. Expiry calculation (CRITICAL status, 15 days)
# 2. Alert creation
# 3. SMS send (via configured provider)
# 4. Database update

# Verify:
GET /alerts/critical
# Should see alert created

GET /alerts/sms-status/summary
# Should see sms_sent incremented
```

---

## Monitoring & Troubleshooting

### **Check SMS Delivery Health**
```bash
GET /alerts/sms-status/summary

Response:
{
    "total_alerts": 42,
    "sms_sent": 38,      # ✅ Good
    "sms_failed": 2,     # ⚠️ Investigate
    "sms_pending": 1,    # ⏳ In progress
    "sms_skipped": 1     # ℹ️ No phone number
}
```

### **Retry Failed SMS**
```bash
POST /alerts/retry-failed-sms?limit=10

Response:
{
    "retried": 2,
    "message": "Retried SMS for 2 failed alerts"
}
```

### **Common Issues**

| Issue | Cause | Fix |
|-------|-------|-----|
| SMS status PENDING | SMS never attempted | Check if SMS provider is configured correctly |
| SMS status FAILED | Provider error | Check TWILIO_ACCOUNT_SID, phone number format |
| SMS status SKIPPED | No phone number | Set recipient_phone when creating batch |
| No alerts created | All batches SAFE status | Create batch with expiry date < 90 days |

---

## Summary

This is a **production-ready alert and SMS system** that:

✅ Automatically detects batch expiry
✅ Creates actionable alerts
✅ Sends SMS notifications via abstracted provider
✅ Tracks SMS delivery status
✅ Supports development (MOCK) and production (Twilio, Africa's Talking)
✅ Handles failures gracefully
✅ Provides retry mechanism
✅ Exposes full API for frontend
✅ Includes comprehensive tests

Ready to deploy. 🚀

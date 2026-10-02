# ExpireGuard Backend — Implementation Guide

**Quick Reference for Building the Complete System**

---

## What You Have

### Files Delivered

**Alert & SMS System** (Complete, tested, ready to integrate)
- ✅ `alert_model.py` — Database model with SMS tracking
- ✅ `sms_service.py` — Provider abstraction (MOCK/Twilio/Africa's Talking)
- ✅ `alert_service.py` — Alert orchestration & deduplication
- ✅ `alert_routes.py` — FastAPI endpoints
- ✅ `test_alerts_sms.py` — Comprehensive unit tests

**Documentation**
- ✅ `BACKEND_SPECIFICATION.md` — Complete technical specification
- ✅ `ALERT_SMS_FLOW.md` — Alert and SMS architecture
- ✅ `.env.template` — Configuration template
- ✅ This guide

---

## Implementation Steps (Start Here)

### Step 1: Database Setup

**Create Alert Model**
```bash
# Copy alert_model.py to:
backend/app/models/alert.py
```

**Create Tables via Alembic**
```bash
# Generate migration
alembic revision --autogenerate -m "Add alerts table"

# Review generated migration in alembic/versions/

# Apply migration
alembic upgrade head
```

### Step 2: SMS Service Integration

**Copy SMS Files**
```bash
cp sms_service.py backend/app/services/sms_service.py
cp alert_service.py backend/app/services/alert_service.py
```

**Update config.py**
```python
# app/core/config.py

class Settings(BaseSettings):
    # ... existing settings ...
    
    # SMS Configuration
    sms_provider: str = os.getenv("SMS_PROVIDER", "MOCK")
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_phone_number: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    africastalking_api_key: str = os.getenv("AFRICASTALKING_API_KEY", "")
    africastalking_username: str = os.getenv("AFRICASTALKING_USERNAME", "")
```

### Step 3: Add Alert Routes

**Copy Alert Routes**
```bash
cp alert_routes.py backend/app/routes/alerts.py
```

**Register in main.py**
```python
# app/main.py

from app.routes import alerts

app = FastAPI()

# ... other routes ...
app.include_router(alerts.router)
```

### Step 4: Update Batch Model

**Add Alert Relationship**
```python
# app/models/batch.py

from sqlalchemy.orm import relationship

class Batch(Base):
    # ... existing fields ...
    
    # Add relationship
    alerts = relationship("Alert", back_populates="batch", cascade="all, delete-orphan")
```

### Step 5: Integrate with Batch Routes

**Update Batch Creation**
```python
# app/routes/batches.py

from app.services.alert_service import process_batch_alerts

@router.post("/batches")
def create_batch(batch_in: BatchCreate, db: Session = Depends(get_db)):
    # Create batch
    batch = Batch(**batch_in.dict())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    # Process alerts (this will calculate expiry status + send SMS)
    process_batch_alerts(db, batch, recipient_phone=batch_in.recipient_phone)
    
    return batch
```

### Step 6: Environment Configuration

**Copy .env template**
```bash
cp .env.template .env
```

**For Development (MOCK SMS)**
```bash
# .env
SMS_PROVIDER=MOCK
```

**For Production (Real SMS)**
```bash
# .env
SMS_PROVIDER=TWILIO
TWILIO_ACCOUNT_SID=ac_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 7: Run Tests

```bash
python test_alerts_sms.py

# Expected output:
# ✅ Status to AlertType mapping
# ✅ AlertType to Severity mapping
# ... (all tests pass)
# ✅ ALL ALERT & SMS TESTS PASSED
```

### Step 8: Start Server

```bash
python -m uvicorn app.main:app --reload

# Visit: http://localhost:8000/docs
```

### Step 9: Test SMS Endpoint

```bash
# Test SMS functionality (MOCK mode logs to console)
curl -X POST "http://localhost:8000/alerts/test-sms?phone_number=%2B233505123456"

# Response:
# {"success": true, "message_id": "mock-...", "error": null, "provider": "MOCK"}
```

---

## Complete Integration Checklist

### Database Layer
- [ ] Alert model created
- [ ] Alembic migration generated
- [ ] Migration applied (tables created)
- [ ] Batch model has alerts relationship

### Service Layer
- [ ] SMS service imported
- [ ] Alert service imported
- [ ] Config updated with SMS settings
- [ ] get_sms_service() works in code

### API Layer
- [ ] Alert routes registered
- [ ] POST /alerts/test-sms works
- [ ] GET /alerts works
- [ ] PATCH /alerts/{id}/read works
- [ ] GET /alerts/sms-status/summary works

### Integration
- [ ] Batch creation triggers alerts
- [ ] Alerts appear in database
- [ ] SMS logs appear (MOCK mode)
- [ ] SMS status tracked in database

### Testing
- [ ] Unit tests pass
- [ ] Manual SMS test passes
- [ ] Full workflow tested (batch → alert → SMS)

### Configuration
- [ ] .env file created
- [ ] SMS_PROVIDER set
- [ ] All credentials configured (if live SMS)

---

## Architecture Diagram (Complete)

```
                    FASTAPI
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    AUTH ROUTES    BATCH ROUTES    ALERT ROUTES
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   EXPIRY ENGINE   ALERT SERVICE   SMS SERVICE
   (deterministic) (deduplication) (abstracted)
        │               │               │
        │               ▼               ▼
        │           DATABASE        SMS PROVIDER
        │           (alerts)        (MOCK/Twilio)
        │               │               │
        └───────────────┼───────────────┘
                        │
                    DASHBOARD
```

---

## Key Files & Their Purpose

| File | Purpose | Location |
|------|---------|----------|
| alert_model.py | Alert database model | app/models/ |
| sms_service.py | SMS provider abstraction | app/services/ |
| alert_service.py | Alert orchestration | app/services/ |
| alert_routes.py | Alert API endpoints | app/routes/ |
| test_alerts_sms.py | Unit tests | root (run with Python) |
| BACKEND_SPECIFICATION.md | Complete technical spec | documentation |
| ALERT_SMS_FLOW.md | Alert & SMS architecture | documentation |
| .env.template | Configuration template | copy to .env |

---

## Testing Workflow

### Unit Tests
```bash
# Run all alert & SMS tests
python test_alerts_sms.py

# Output shows:
# ✅ All tests passing
# ✅ Coverage of expiry logic, SMS providers, alert creation, workflow
```

### Manual API Testing

**1. Test SMS (MOCK mode)**
```bash
POST /alerts/test-sms?phone_number=%2B233505123456
```
Response: SMS logged to console

**2. Create Batch (triggers alert)**
```bash
POST /batches
{
    "product_id": 1,
    "batch_number": "TEST_001",
    "expiry_date": "2025-10-10",
    "quantity_received": 100,
    "recipient_phone": "+233505123456"
}
```
Result: Alert created, SMS sent (MOCK logs)

**3. Get Alerts**
```bash
GET /alerts
```
Response: List of all alerts

**4. Check SMS Status**
```bash
GET /alerts/sms-status/summary
```
Response: SMS delivery statistics

---

## Environment Variables Reference

### Required (for SMS)
```bash
SMS_PROVIDER=MOCK  # During development
```

### Optional (for production SMS)
```bash
# Twilio
TWILIO_ACCOUNT_SID=ac_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Africa's Talking
AFRICASTALKING_API_KEY=xxxxx
AFRICASTALKING_USERNAME=xxxxx
```

### Existing (should already have)
```bash
DATABASE_URL=postgresql://user:pass@localhost/expireguard
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## Common Issues & Solutions

### Issue: SMS Service Not Initializing
```
Error: "SMS service failed to initialize"
```
**Solution:**
- Check .env file exists and SMS_PROVIDER is set
- If TWILIO: verify credentials are correct
- If MOCK: should always work

### Issue: Alert Not Created
```
Error: "Alert not found after batch creation"
```
**Solution:**
- Check batch.status is not SAFE (>90 days)
- Verify expiry_date is in future
- Check batch.expiry_date - today <= 90 days

### Issue: SMS Send Fails (Production)
```
Error: "SMS failed - Invalid phone number"
```
**Solution:**
- Verify phone number format (should be international format)
- Check Twilio/Africa's Talking credentials
- Ensure phone number is not already linked to test account

### Issue: Database Migration Fails
```
Error: "Alembic migration failed"
```
**Solution:**
```bash
# Check current state
alembic current

# Downgrade and retry
alembic downgrade -1
alembic upgrade head
```

---

## Performance Considerations

### SMS Sending
- MOCK provider: <1ms (instant)
- Twilio: ~1-2 seconds per message
- Don't send SMS synchronously for multiple alerts
- Use queuing/background jobs for >100 alerts

### Expiry Calculations
- O(n) where n = number of batches
- Run hourly for small deployments
- ~1000 batches = <1 second calculation

### Database Queries
- Always use indexes on: batch_id, status, created_at
- Pagination for alert lists (GET /alerts?limit=20&offset=0)

---

## Production Deployment

### Before Going Live

1. **SMS Provider**
   - [ ] Choose provider (Twilio recommended)
   - [ ] Create account and get credentials
   - [ ] Set SMS_PROVIDER in production .env
   - [ ] Test with real phone number

2. **Database**
   - [ ] Backup strategy configured
   - [ ] Connection pooling enabled
   - [ ] Indexes created
   - [ ] Alembic migrations run

3. **Security**
   - [ ] SSL/TLS certificates
   - [ ] Environment variables not in GitHub
   - [ ] Rate limiting enabled
   - [ ] CORS configured

4. **Monitoring**
   - [ ] Logging configured
   - [ ] Error tracking (Sentry)
   - [ ] SMS delivery monitoring
   - [ ] Database monitoring

5. **Testing**
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Load testing (if expected >100 users)
   - [ ] SMS delivery tested

---

## Next Steps After MVP

### Phase 2: Enhanced Features
- [ ] Analytics engine (verified metrics)
- [ ] Dashboard API endpoints
- [ ] Sales management
- [ ] Inventory tracking

### Phase 3: Intelligence Layer
- [ ] Pattern detection
- [ ] Anomaly detection
- [ ] AI insights generation
- [ ] Recommendations

### Phase 4: Advanced
- [ ] Multi-tenant support
- [ ] Background job queue (Celery)
- [ ] Redis caching
- [ ] Advanced reporting

---

## Documentation Files

| Document | Purpose | Audience |
|----------|---------|----------|
| BACKEND_SPECIFICATION.md | Complete technical spec | Developers, architects |
| ALERT_SMS_FLOW.md | Alert & SMS details | Developers, ops |
| IMPLEMENTATION_GUIDE.md | Step-by-step integration | Developers (you are here) |
| README.md | Quick start | Everyone |

---

## Success Criteria

You'll know the implementation is complete when:

✅ All 7 alert & SMS files are integrated
✅ Unit tests pass
✅ POST /alerts/test-sms returns success
✅ Creating a batch with expiry < 90 days creates an alert
✅ Alert appears in database with SMS status
✅ GET /alerts shows all alerts
✅ Dashboard can display alerts

---

## Support & Questions

If you encounter issues:

1. **Check the specification** — BACKEND_SPECIFICATION.md has complete details
2. **Review the flow diagram** — ALERT_SMS_FLOW.md explains the architecture
3. **Run tests** — test_alerts_sms.py validates the logic
4. **Check logs** — console and database should show what happened

---

## Summary

You now have:

✅ **Complete alert system** — from database to API
✅ **SMS abstraction** — swap providers without code changes
✅ **Comprehensive tests** — validate all logic
✅ **Production-ready code** — error handling, logging, security
✅ **Full documentation** — specification, flow, implementation guide

**Next:** Follow the implementation steps above and your ExpireGuard backend will be complete. 🚀

# ExpireGuard

Pharmacy expiry-risk and inventory management: a React frontend backed by a FastAPI + PostgreSQL API.

```
expireguard/
├── backend/    FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL — see backend/README.md
└── library-app/ React 19 + TypeScript + Vite frontend — talks to the backend through /api
```

**How it fits together**

* One pharmacy per install. The first person to sign up becomes the **Admin**; everyone after joins as a
  **Dispenser**. Admins can also add staff from Settings → Users.
* Risk bands follow the frontend: **Critical ≤ 7 days, Action Required ≤ 30, Monitor ≤ 60, Safe beyond**,
  Expired at 0. Admins change them in Settings; the backend re-classifies stock and alerts immediately.
* All data is real: sign-in, inventory, scanning (GS1 DataMatrix), CSV/Excel import, alerts and workflow actions
  (acknowledge, flag, quarantine, return, dispose, dispense), reports, settings, users, and the AI assistant
  (chat history, seasonal purchase plans, insights) all go through the API. Nothing is kept in browser storage
  except the login token.
* Critical and expired stock triggers **SMS** (Africa's Talking or Twilio) and **email** (any SMTP, e.g. Gmail) alerts
  to admins. Both run in mock mode by default (printed in the backend window) until you add real credentials.
* Dispensers never receive unit costs or supplier names — the backend strips them, not just the UI.

## Run it locally (Windows PowerShell shown; macOS/Linux are the same with `source .venv/bin/activate`)

You need **Python 3.12+**, **PostgreSQL 16** and **Node.js 20+**.

### 1. Database

Create a database once (in `psql` as the `postgres` user):

```sql
CREATE DATABASE expireguard;
```

### 2. Backend (terminal 1)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# edit .env: set DATABASE_URL (your postgres password) and JWT_SECRET_KEY:
#   py -c "import secrets; print(secrets.token_urlsafe(48))"
alembic upgrade head                              # run again after every update
python scripts/seed_demo_data.py --run-expiry     # optional demo pharmacy
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend (terminal 2)

```powershell
cd library-app
npm install
npm run dev
```

Open http://localhost:5173. In development the app calls `/api/...` and Vite forwards it to
`http://localhost:8000`, so no CORS setup is needed. For a production build hosted separately from the API, set
`VITE_API_URL` (see `library-app/.env.example`) and add the site to the backend's `CORS_ORIGINS`.

### Demo logins (after seeding)

| Email | Password | Role |
|---|---|---|
| admin@expireguard.com | admin123 | Admin |
| dispenser@expireguard.com | dispenser123 | Dispenser |

Skip the seed to start clean: the first account you create on the Sign Up page becomes the Admin.

## Tests

```powershell
cd backend
# create the test database once:  CREATE DATABASE expireguard_test;
alembic upgrade head   # apply new migrations to your normal database
pytest
```

```powershell
cd library-app
npm run build      # type-checks and builds
npm run lint
```

## Alerts, files and forecasts

* **SMS to any mobile number:** Settings > Alerts & Notifications. Add numbers like `0241234567` (Ghana `+233` is added
  for you). Every admin can also save their own number there. Expiry SMS go to admins' numbers plus these extra numbers
  through Africa's Talking (`SMS_MODE=live`, `SMS_PROVIDER=africastalking`).
* **Daily expiry email:** after the morning expiry check every admin gets one email listing expired, critical and
  action-required batches. Switch it off per pharmacy in Settings, or send it now with the "Send today's expiry email"
  button (`POST /alerts/send-digest`).
* **Files in the AI chat:** use the paperclip in AI Insights to share an Excel (.xlsx) or CSV file. A stock list can be
  imported straight into inventory; sales history or other files can be kept for analysis. Kept files are used by the
  assistant and the forecast (`/ai/files`).
* **Forecast:** ask "Forecast my sales for the next month" or call `GET /ai/forecast` for expected units per product,
  days of cover and reorder suggestions (12-week moving average with a damped trend).
* **Marketing and general questions:** questions about marketing, promotions or growing sales get "advice mode"
  answers that mix your real data with general business tips (marked in the chat). Full open-ended answers need a real
  AI provider: set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` in `backend/.env`.

## Notes

* Never commit `backend/.env` or `library-app/.env` — both are git-ignored. Use a fresh `JWT_SECRET_KEY` in production.
* SMS and email run in `mock` mode by default (messages are logged, not sent). The AI layer uses the `mock` provider
  unless `AI_PROVIDER` and an API key are set. See `backend/.env.example` for every setting.
* Gmail: turn on 2-Step Verification on the Google account, create an **App Password**, then set `EMAIL_MODE=live`,
  `SMTP_USERNAME`, `SMTP_PASSWORD` (the app password) and `EMAIL_FROM` in `backend/.env`. Test with
  `POST /alerts/test-email` on the API docs page.
* Hosting: backend + PostgreSQL on Render (root directory `backend`), frontend on Vercel or Render (root directory
  `library-app`, environment variable `VITE_API_URL` = the backend URL).
* Password reset sends a code by email (and by SMS if the user has a phone number); in development the code is also shown on screen.

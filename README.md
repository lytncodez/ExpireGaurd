# ExpiryGuard

ExpiryGuard is a pharmacy stock and batch tracking frontend. It helps staff review inventory, expiry risk, and FEFO priority, while giving administrators reporting and stock valuation views.

## Features

- **Dashboard:** inventory overview, rotating product spotlight, urgent batches, and FEFO queue.
- **Inventory:** searchable batch repository with All Stock, FEFO, At Risk, and Expired views; quantity and expiry filters; status badges; and quarantine actions.
- **Batch details:** product photo upload, batch information, expiry countdown, and role-specific price and supplier details.
- **Add / Import:** manual stock entry plus simulated barcode scan and sample CSV import flows.
- **Alerts:** current expiry warnings, risk filters, and acknowledgement actions.
- **Reports (Admin):** risk distribution, a 12-month expiry value projection, category and supplier summaries, at-risk products, stock movement, and filtered CSV export.
- **AI Insights (Admin):** sample operational insight and action-plan views.
- **Settings (Admin):** risk thresholds, pharmacy settings, and a frontend user and role management interface.
- **Company onboarding prototype:** company registration, application status, manual payment-reference capture, a separate development-only review console, staff invitation prototypes, and notification preferences.
- **Shared design system:** responsive layouts, collapsible navigation, risk-band colors, reusable stat cards, and GH₵ currency formatting.

## Roles

The demo sign-in supports two roles:

| Role | Demo credentials | Access |
| --- | --- | --- |
| Admin | `admin@expireguard.com` / `admin123` | All pages, cost and supplier details, valuation reports, and settings. |
| Dispenser | `dispenser@expireguard.com` / `dispenser123` | Dashboard, inventory, add/import, and alerts. Selling prices are shown; unit costs, supplier and receipt details, and valuation metrics are hidden in the app interface. |

The legacy demo account `manager@expireguard.com` / `manager123` also maps to Dispenser.

### Access-control limitation

This repository's frontend is a browser-only prototype. Authentication, role overrides, settings, inventory, company applications, staff invites, and notification preferences are simulated with React state and `localStorage`; client-side route guards **do not provide server-side confidentiality or authorization**. Demo credentials and saved demo sessions are disabled in production builds; no production portal login is possible until the frontend is connected to real backend authentication and authorization.

Company registration is intentionally blocked unless both approved legal documents are configured. No draft legal text is presented as approved. A development-only application mock is used because the existing FastAPI `/auth/register` endpoint immediately creates an active company/admin (and later sign-ups can join as dispensers); it is not suitable for the pending approval flow. The existing API does not currently expose company applications, reviewer/payment approval, or one-time staff invitations.

The application status, payment reference, review decisions, invitations, and notification settings are development demonstrations, not official records. The frontend does not issue a payment, confirm payment, send an invitation, deliver notifications, create an administrator credential, or activate a company. The platform review route is available only in Vite development mode and has no reviewer authentication or audit trail. Do not use these features for real company data or account approvals.

The production app must connect an authenticated backend that enforces company status and role permissions on every request. Existing backend endpoints include `/companies/me`, `/companies/me/audit-logs`, and admin-only `/users`; they are not wired to this mock UI. Backend notification preferences and delivery/verification state, company profile/subscription data, staff invitation lifecycle, application review/audit records, and payment-provider verification are still required.

### Company registration configuration

Set these Vite environment variables only after the named documents are formally approved by the responsible organization:

| Variable | Purpose |
| --- | --- |
| `VITE_LEGAL_DOCUMENTS_APPROVED` | Must be exactly `true` to enable the legal-consent control. |
| `VITE_LEGAL_TERMS_URL` / `VITE_LEGAL_TERMS_VERSION` | HTTPS link and version of the approved Terms of Service. |
| `VITE_LEGAL_PRIVACY_URL` / `VITE_LEGAL_PRIVACY_VERSION` | HTTPS link and version of the approved Privacy Notice. |
| `VITE_REGISTRATION_FEE_GHS` | Optional configured fee for display; no amount is assumed by the UI. |

Even when legal configuration is present, company submission is only available through the development mock. Production registration remains blocked until a pending-application backend is implemented. No payment provider is connected and a configured amount does not enable a payment. Do not set the approval flag or fee to fabricated values.

## Data behavior

- Initial inventory comes from `library-app/src/api/mockData.ts`.
- Inventory changes persist in browser `localStorage` under `expireguard_items`.
- Existing saved inventory is retained between reloads in the same browser profile.
- The scanner and CSV import screens currently demonstrate the workflow using sample records; they are not connected to a barcode service or general-purpose CSV parser.
- Reports use the current inventory dataset. The 12-month at-risk chart groups current batch cost by expiry month; it is a projection from present stock, not historical stock accounting.

## Tech stack

- React 19, TypeScript 6, and Vite 8
- React Router 7
- React Context and browser `localStorage`
- Lucide icons and custom CSS design system
- Oxlint

## Run locally

Requirements: Node.js compatible with the installed Vite version and npm.

```bash
cd library-app
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`). Use either demo account above to sign in.

## Build and lint

```bash
npm run build
npm run lint
```

## Project structure

```text
ExpireGaurd/
├── library-app/
│   ├── public/                 # Static images and icons
│   └── src/
│       ├── api/                # Demo authentication and inventory contexts/data
│       ├── components/         # Shared navigation, currency input, stat card
│       ├── pages/              # Dashboard, Inventory, Add/Import, Alerts, Reports, etc.
│       ├── styles/             # App and design-system CSS
│       ├── utils/              # Shared currency formatting
│       ├── App.tsx             # Routes, role gates, app shell, error boundary
│       └── main.tsx            # Application entry point
├── README.md
└── .gitignore
```

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
- **Shared design system:** responsive layouts, collapsible navigation, risk-band colors, reusable stat cards, and GH₵ currency formatting.

## Roles

The demo sign-in supports two roles:

| Role | Demo credentials | Access |
| --- | --- | --- |
| Admin | `admin@expireguard.com` / `admin123` | All pages, cost and supplier details, valuation reports, and settings. |
| Dispenser | `dispenser@expireguard.com` / `dispenser123` | Dashboard, inventory, add/import, and alerts. Selling prices are shown; unit costs, supplier and receipt details, and valuation metrics are hidden in the app interface. |

The legacy demo account `manager@expireguard.com` / `manager123` also maps to Dispenser.

### Access-control limitation

This repository is currently a browser-only prototype. Authentication, role overrides, settings, and inventory persistence are simulated with React state and `localStorage`; there is no server or API enforcing permissions. The role-based navigation, route guards, and role-scoped inventory context are client-side controls and **do not provide server-side confidentiality**. Do not use them to protect real commercial data until authentication and inventory access are moved to a backend that authorizes every request.

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

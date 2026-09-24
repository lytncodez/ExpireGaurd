# ExpiryGuard 🛡️
> **Intelligent Expiration Risk Tracking & Actionable Inventory Management Platform**

ExpiryGuard is a decision-driven SaaS inventory management platform engineered for pharmacies, medical clinics, laboratories, and retail warehouses. It transforms raw stock data into financial insights, automates **First Expired, First Out (FEFO)** stock rotation rules, and identifies capital value at risk in real time.

---

## 🌟 Key Features

### 1. High-Impact Financial & Trend Insights (6 KPI Cards)
- **Total Products:** Total distinct items registered in the inventory catalog.
- **Total Stock Volume:** Sum of all physical units currently stored across warehouses.
- **Near Expiry (≤ 30 Days):** Items approaching expiration window with trend indicators.
- **Critical (≤ 7 Days):** Urgent high-risk items requiring immediate intervention.
- **Expired Inventory:** Total count of unsellable stock quarantined for write-off.
- **Stock Value at Risk ($):** Total monetary capital tied up in stock expiring within 30 days.

### 2. Visual Analytics & Decision Engine
- **Expiry Risk Breakdown (Donut Segmented Chart):** Visual percentage share across all 5 risk tiers centered around total catalog volume.
- **Stock Volume by Risk (Bar Chart):** Unit congestion metrics across physical storage zones.
- **Urgent Actions Quick-Table:** Priority batch listing with direct action pills (*"Prioritize Sale"*, *"Reduce Price 50%"*, *"Quarantine & Write-Off"*, *"Return to Supplier"*).
- **FEFO Decision Engine:** Smart suggestions prioritizing batch rotation, overstock reorder warnings, and vendor return warranty reminders.

### 3. Warehouse Matrix & Granular Filtering
- **Multi-Filter Header:** Real-time search by product name, category, or batch number combined with dropdown filters for **Category**, **Supplier**, and **Risk Level**.
- **Location & Batch Tracking:** Tracks batch numbers, aisle/shelf placement, unit pricing, dynamic day countdowns, and stock status (*In Stock*, *Low Stock*, *Quarantined*, *Pending Return*).

### 4. Enterprise Architecture & Reliability
- **Full Canvas Layout:** Sleek slate-blue canvas (`#F0F4F8`), deep indigo sidebar (`#1E3A5F`), light/dark theme toggle, and responsive card containers.
- **Shared Context & Local Persistence:** Centralized `InventoryProvider` with schema hydration to preserve custom stock entries across page reloads.
- **Resilient Error Boundary:** Fail-safe UI layer with instant data recovery.

---

## 🎨 Functional Risk Color System

| Risk Level | Window | Color | Palette |
| :--- | :--- | :--- | :--- |
| **Safe** | `> 60 days` | Mint Green | `#10B981` / `#E6F4EA` |
| **Monitor** | `31 – 60 days` | Soft Gold | `#F59E0B` / `#FEF3C7` |
| **Action Required** | `8 – 30 days` | Warm Amber | `#F97316` / `#FFEDD5` |
| **Critical** | `1 – 7 days` | Soft Red | `#EF4444` / `#FEE2E2` |
| **Expired** | `< 0 days` | Slate Grey | `#6B7280` / `#F3F4F6` |

---

## 🛠️ Technology Stack

- **Core:** React 18, TypeScript, Vite
- **Routing:** React Router DOM v6
- **Styling:** Custom CSS Design System (CSS Variables, Flexbox/Grid layout)
- **State Management:** React Context API + LocalStorage Persistence
- **Linter & Type Checker:** Oxlint & TypeScript (`tsc`)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation & Local Setup

```bash
# 1. Clone repository
git clone https://github.com/lytncodez/ExpireGaurd.git

# 2. Navigate to application folder
cd ExpireGaurd/library-app

# 3. Install dependencies
npm install

# 4. Start Vite development server
npm run dev
```

Open your browser at `http://localhost:5173` to view the application.

### Production Build

```bash
# Type-check and build production bundle
npm run build
```

---

## 📁 Repository Structure

```
ExpireGaurd/
├── library-app/
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── api/                # Mock data & Inventory Context Provider
│   │   ├── components/         # Header & Sidebar navigation components
│   │   ├── pages/              # Dashboard, InventoryList, AddItem, ItemDetail
│   │   ├── styles/             # Design system CSS tokens & theme rules
│   │   ├── App.tsx             # Main routing & Error Boundary wrapper
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for details.

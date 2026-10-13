# ExpiryGuard Frontend Application 🛡️

This directory contains the web frontend for **ExpiryGuard**, an intelligent expiration risk tracking and pharmacy/retail inventory management system.

## 🚀 Commands

- `npm run dev`: Starts local Vite development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles TypeScript and builds production distribution artifacts in `dist/`.
- `npx oxlint`: Runs Oxlint static code analyzer.

## 🛠️ Tech Stack

- **React 18** with Functional Components & Hooks
- **TypeScript** with strict type checking enabled
- **Vite** for fast HMR dev environment and production builds
- **React Router DOM v6** for client-side routing
- **Custom CSS Design System** using CSS custom properties (`--bg-canvas`, `--sidebar-bg`, risk color tokens)

## 📁 Key Directories

- `src/api/`: Data models ([`mockData.ts`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/api/mockData.ts)) and state management ([`useInventory.tsx`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/api/useInventory.tsx)).
- `src/components/`: Reusable navigation components ([`Sidebar.tsx`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/components/Sidebar.tsx), [`Header.tsx`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/components/Header.tsx)).
- `src/pages/`:
  - [`Dashboard.tsx`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/pages/Dashboard.tsx): Overview KPI cards, Donut & Bar chart analytics, Urgent Actions table, and FEFO Smart Decision Engine.
  - [`InventoryList.tsx`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/pages/InventoryList.tsx): Warehouse stock matrix with multi-filter search header.
  - [`AddItem.tsx`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/pages/AddItem.tsx): New stock batch registration form.
  - [`ItemDetail.tsx`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/pages/ItemDetail.tsx): Individual item management & detail view.
- `src/styles/`: Global design tokens and theme rules ([`theme.css`](file:///C:/Users/GRACETECH%20COMPUTERS/Desktop/Innovation_lab/ExpireGaurd/library-app/src/styles/theme.css)).

# ExpireGuard Frontend

React 19 + TypeScript + Vite. All data comes from the ExpireGuard backend (`../backend`) — see the root README
for running both together.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173; `/api/*` is proxied to http://localhost:8000.
- `npm run build` — type-check and build to `dist/`.
- `npm run lint` — Oxlint.

## API wiring

- `src/api/client.ts` — `fetch` wrapper: base URL (`VITE_API_URL`, default `/api`), Bearer token, error messages,
  and a global sign-out when the token expires.
- `src/api/useAuth.tsx` — sign in/up, password reset, role changes.
- `src/api/useInventory.tsx` — `/items` and `/settings`; every workflow action calls the backend and reloads.
- `src/api/types.ts` — the `InventoryItem` / `PharmacySettings` shapes the backend returns.
- `src/utils/risk.ts` — risk bands from the pharmacy's thresholds (the backend's classification wins when present).

Configuration: copy `.env.example` to `.env` only if you need to point at a different backend.

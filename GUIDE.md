# AbyteDistribix — System Guide

## Overview

AbyteDistribix is a multi-tenant LPG (liquefied petroleum gas) distribution management system. It tracks the full business cycle of a gas distributor: purchasing gas from suppliers, receiving it into storage tanks, filling cylinders, selling to customers (with cylinder-exchange tracking), managing deliveries (drivers/vehicles), collecting customer/supplier payments, recording expenses, and producing accounting reports (cash book, bank book, profit & loss, receivables/payables). It supports multiple companies (tenants) under one installation, role-based access control, audit logging, and database backup/restore. It ships as a Windows desktop application (Electron) that bundles a local NestJS API and a SQLite database, but the backend and frontend can also be run independently as a normal web app during development.

## Tech Stack

- **Language**: TypeScript throughout (backend, frontend, Electron shell)
- **Backend**: NestJS 10 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` ^10.4.15), with `@nestjs/jwt` + `@nestjs/passport` (passport-jwt/passport-local) for auth, `@nestjs/throttler` for rate limiting, `@nestjs/schedule` for cron-style tasks, `helmet` ^8 for HTTP security headers, `class-validator`/`class-transformer` for DTO validation, `argon2` for password hashing.
- **ORM / Database**: Prisma 6 (`@prisma/client` ^6.3.1, `prisma` ^6.3.1) against **SQLite** (`backend/prisma/dev.db`).
- **Frontend**: React 18 + TypeScript, built with Vite 6. Routing via `react-router-dom` v7. State via `zustand`. Forms via `react-hook-form` + `zod` + `@hookform/resolvers`. UI built on Radix UI primitives (`@radix-ui/react-*`) styled with Tailwind CSS 3 and `class-variance-authority`/`tailwind-merge` (shadcn/ui-style components — see `frontend/components.json`). Data table via `@tanstack/react-table`. Charts via `recharts`. HTTP via `axios`. Exports via `exceljs` and `jspdf`/`jspdf-autotable`. QR codes via `qrcode.react`. Toasts via `sonner`. Testing via `vitest`.
- **Desktop shell**: Electron 28 (`electron`, `electron-builder`) — spawns the compiled backend as a child process and loads the frontend build (or dev server) in a `BrowserWindow`. Packaged as an NSIS Windows installer (`electron/package.json` build config, output to `electron/release`).
- **Monorepo tooling**: npm workspaces (root `package.json` lists `backend`, `frontend`, `electron` as workspaces) with `concurrently` to run backend+frontend dev servers together.

## Architecture & Modules

This is a **monorepo with a separate frontend and backend**, plus an Electron desktop wrapper that packages both together for distribution. In dev mode, and when self-hosted, backend and frontend run as two independent HTTP processes.

- `backend/` — NestJS REST API (see below)
- `frontend/` — React SPA (see below)
- `electron/` — Desktop wrapper (`main.ts`/`preload.ts`): spawns the backend as a child process, generates/persists a per-install JWT secret, initializes a fresh SQLite DB from a schema-only template on first run, loads the frontend UI (dev server URL in dev, or the built `frontend/dist/index.html` via `file://` in production), and exposes backup/restore IPC handlers (export/import/list/delete DB backups) gated to super-admin users.

### Backend modules (`backend/src/modules/*`, one NestJS module per folder, each with controller/service/DTOs)

| Module | Responsibility |
|---|---|
| `auth` | Login, "who am I" (`/auth/me`), initial admin/super-admin seeding |
| `companies` | Tenant (company) CRUD and the public company selector shown pre-login |
| `users` | User accounts per company |
| `roles` | Role definitions and JSON-encoded permission sets |
| `customers` | Customer master data, balances, statement/ledger |
| `suppliers` | Supplier master data, balances, ledger |
| `gas-products` | Gas product catalog (type, unit, rates, low-stock) |
| `storage-tanks` | Bulk storage tank inventory per gas product |
| `purchases` | Gas purchases from suppliers (pricing, payment status) |
| `gas-receiving` | Receiving purchased gas into a specific storage tank (expected vs received variance) |
| `inventory` | Gas stock and cylinder stock views, manual stock adjustments, transaction history |
| `cylinders` | Cylinder type catalog, cylinder inventory by status (filled/empty/with customer/damaged/lost), cylinder transactions |
| `cylinder-units` | Individually serialized/QR-coded cylinder tracking |
| `filling` | Filling batches: moving gas from a tank into cylinders |
| `sales` | Sales invoices and line items, cylinder exchange logic |
| `sale-returns` | Returns against a sale |
| `deliveries` | Delivery scheduling/status linked to drivers, vehicles, sales |
| `drivers` / `vehicles` | Fleet master data used by deliveries |
| `payments` | Customer and supplier payment recording |
| `expenses` | Operating expense entries by category |
| `accounting` | Cash book, bank book, profit & loss reporting |
| `reports` | Sales/purchase reports, receivables/payables summaries |
| `audit-logs` | Immutable log of create/update/delete actions across modules |
| `settings` | Per-company key/value settings |
| `backup` | DB backup create/list/download endpoints (used by the Electron backup UI) |
| `dashboard` | Aggregated stats, sales chart, recent sales, pending purchases for the home screen |
| `prisma` | Shared Prisma service/module (DB client provider) |
| `common/` | Shared decorators, exception filters (`PrismaExceptionFilter`), and guards (auth/role/super-admin guards) |

### Frontend modules (`frontend/src/pages/*`, one route group per folder — mirrors the backend modules 1:1)

`auth`, `dashboard`, `companies`, `users`, `roles`, `customers`, `suppliers`, `gas-products`, `storage-tanks`, `purchases`, `gas-receiving`, `inventory`, `cylinders`, `cylinder-units`, `filling`, `sales`, `deliveries`, `drivers`, `vehicles`, `payments`, `expenses`, `accounting`, `reports`, `audit-logs`, `settings`, `backup`. Supporting folders: `components/layout` (app shell/nav), `components/shared` (reusable widgets), `components/ui` (shadcn/ui primitives), `hooks`, `lib` (incl. `lib/api.ts` — the shared axios client), `stores` (zustand state), `types`.

## Database

- **Type**: SQLite, file-based (`backend/prisma/dev.db`, path configured via `DATABASE_URL` in `backend/.env`).
- **ORM**: Prisma (`backend/prisma/schema.prisma`).
- **Connection config**: `backend/.env` → `DATABASE_URL="file:./dev.db"` (relative to `backend/prisma/`). In the packaged Electron app, the backend is instead pointed at a per-user-profile DB file (`app.getPath('userData')/abyte.db`) via an env override at spawn time (see `electron/main.ts`), initialized from `backend/prisma/template.db` (a schema-only template) on first run.
- **Key models/tables** (see `backend/prisma/schema.prisma`, all multi-tenant via `companyId`): `Company`, `User`, `Role`, `Customer`, `Supplier`, `GasProduct`, `StorageTank`, `Purchase`, `GasReceiving`, `GasInventoryTransaction`, `CylinderType`, `CylinderInventory`, `CylinderTransaction`, `CylinderUnit`, `FillingBatch`, `Sale`, `SaleItem`, `SaleReturn`, `SaleReturnItem`, `CustomerCylinderBalance`, `CustomerPayment`, `SupplierPayment`, `Expense`, `CashTransaction`, `BankTransaction`, `AuditLog`, `Setting`, `Driver`, `Vehicle`, `Delivery`.
- Migrations live in `backend/prisma/migrations/`. Seed scripts: `backend/prisma/seed-large.ts` and `seed-multi-company.ts`.

## Location

- Repo root: `D:\abyte-distribix`
- Backend: `D:\abyte-distribix\backend`
- Frontend: `D:\abyte-distribix\frontend`
- Electron desktop wrapper: `D:\abyte-distribix\electron`

## Ports

- **Backend**: `3009` (was `3005`)
- **Frontend**: `5182` (was `5176`)

The project has a genuinely separate frontend (Vite/React SPA) and backend (NestJS API), so both ports apply independently — they are not combined into a single server.

## Environment Variables

Backend (`backend/.env`, based on `backend/.env.example`):
- `DATABASE_URL` — SQLite file path, e.g. `file:./dev.db` (relative to `backend/prisma/`)
- `JWT_SECRET` — required; the backend refuses to start without it. Not set in the packaged Electron app's own `.env` — that build generates and persists its own random secret per install instead.
- `JWT_EXPIRES_IN` — JWT token lifetime, e.g. `7d`
- `PORT` — backend HTTP port (now `3009`; the server also has a hardcoded fallback of `3009` if unset)
- `CORS_ALLOWED_ORIGINS` — optional comma-separated list of extra allowed CORS origins beyond `null` (Electron's `file://` origin) and `http://localhost:5182` (frontend dev server)

Frontend (`frontend/.env.example` — no committed `frontend/.env` exists; create one locally if you need to override):
- `VITE_API_BASE_URL` — base URL the frontend calls for the API, e.g. `http://localhost:3009/api`. Leave unset for local Electron/dev use, where it falls back to `http://localhost:3009/api` in code (`frontend/src/lib/api.ts`).

## How to Run

From the repo root (`D:\abyte-distribix`), using npm workspaces:

1. **Install dependencies** (once, from repo root — installs backend, frontend, and electron workspaces):
   ```
   npm install
   ```
2. **Generate the Prisma client** (first time, and after schema changes):
   ```
   npm run --workspace=backend db:generate
   ```
3. **Run database migrations** (first time, and after schema changes):
   ```
   npm run --workspace=backend db:migrate
   ```
4. **Dev mode — backend only**:
   ```
   npm run dev:backend
   ```
   Starts NestJS with `--watch` on port `3009` (from `backend/.env` `PORT`, falling back to `3009`).
5. **Dev mode — frontend only**:
   ```
   npm run dev:frontend
   ```
   Starts Vite dev server on port `5182`, proxying `/api` to `http://localhost:3009`.
6. **Dev mode — both together**:
   ```
   npm run dev
   ```
7. **Build for production**:
   ```
   npm run build:backend
   npm run build:frontend
   npm run build:electron   # optional, only needed for the desktop installer
   ```
   or all at once: `npm run build:all`
8. **Production start (backend, standalone/web)**:
   ```
   npm run --workspace=backend start
   ```
   Runs the compiled `backend/dist/main.js`, listening on `PORT` from the environment (default `3009`). Serve `frontend/dist` (the Vite build output) with any static file server/CDN for a web deployment.
9. **Production (desktop/Electron)**:
   ```
   npm run package:win
   ```
   Builds backend, frontend, and electron, then runs `electron-builder --win` to produce an NSIS installer in `electron/release`. The packaged app spawns the backend on `localhost:3009` and loads the frontend from the bundled `frontend/dist`.

## Notes

- The backend's `PORT` env var was previously set (`3005`) but not actually read by `backend/src/main.ts` — the port was hardcoded as a literal `3005` in `app.listen(3005)`. This has been fixed as part of this reconfiguration: `main.ts` now reads `process.env.PORT` and falls back to `3009`.
- Before this change, `frontend/vite.config.ts` proxied `/api` to `http://localhost:3003`, which did not match the backend's actual port (`3005` in code, though `.env` said `3005` too) — an existing inconsistency in the repo. The proxy target has been corrected to point at the backend's new port (`3009`).
- No `docker-compose.yml`, no other backend/frontend variants (no `/server`, no `/apps/*`), and no root-level `README.md` were found in this repo.
- There is no committed `frontend/.env` (only `.env.example`) — the app currently relies on the in-code fallback (`http://localhost:3009/api`) for local/Electron use.
- `backend/.env`'s `JWT_SECRET` is a placeholder dev value (`abyte-distribix-secret-key-2026`) — not a real secret leak of production credentials, but should be replaced with a random value for anything beyond local development, per the comment already in `backend/.env.example`.
- All ports outside this app's own HTTP servers (there are none — no separate shared database service, no docker) were left untouched; only the backend's Nest server, the frontend's Vite dev/preview server, the Electron shell's expectations of both, and the CORS allow-list were updated.

# Inventory Management System (IMS) – main-ansh

Modular backend API + web UI for an Inventory Management System. **Run all commands from this folder (`main-ansh/`).** Digitizes stock operations: receipts, deliveries, internal transfers, and adjustments with multi-warehouse support and a stock ledger.

## Stack

- **Node.js** + **Express** (ES modules)
- **Prisma** + **SQLite** (can switch to PostgreSQL via `DATABASE_URL`)
- **JWT** auth, **bcrypt** passwords, **OTP**-based password reset
- **express-validator** for request validation

## Prerequisites

You need **Node.js** (v18 or newer) so that `npm` and `npx` are available.

- **Install:** [nodejs.org](https://nodejs.org/) — use the LTS installer. It adds Node and npm to your PATH.
- **Verify:** Close and reopen PowerShell/terminal, then run:
  ```bash
  node -v
  npm -v
  ```
  If those work, continue with Setup below. If you see "not recognized", Node is not on your PATH; reinstall and tick "Add to PATH", or restart your computer after installing.

## Setup

```bash
npm install
# Create .env from example (run one):
#   Windows (cmd):  copy .env.example .env
#   PowerShell:     Copy-Item .env.example .env
#   macOS/Linux:   cp .env.example .env
# Edit .env if needed (JWT_SECRET, optional SMTP for OTP emails)
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API base: `http://localhost:3000`

A simple **web UI** is served at **http://localhost:3000**: login page and dashboard with KPIs. Static files live in `public/` (HTML, CSS, JS). Log in with the seed user (e.g. `admin@ims.local` / `password123`) to see the dashboard.

### Response format

- **Success:** JSON as appropriate (e.g. `{ items, total, page, limit }` for lists).
- **Errors:** `{ success: false, error: "message" }` with optional `details` for validation (field + message). HTTP status reflects the error (400 validation, 401 auth, 404 not found, 500 server).
- **Validation errors:** `{ success: false, error: "Validation failed", details: [{ field, message }] }`.

## Environment

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000) |
| `DATABASE_URL` | Prisma DB URL (default `file:./dev.db`) |
| `JWT_SECRET` | Secret for JWT signing |
| `JWT_EXPIRE` | Token expiry (e.g. `7d`) |
| `OTP_EXPIRE_MINUTES` | OTP validity (default 10) |
| `SMTP_*` / `FROM_EMAIL` | Optional; if not set, OTP is logged to console |

## API Overview

All protected routes require header: `Authorization: Bearer <token>`.

### Auth (no token)

- `POST /api/auth/signup` – body: `{ email, password, name?, role? }`
- `POST /api/auth/login` – body: `{ email, password }` → returns `{ user, token }`
- `POST /api/auth/password-reset/request` – body: `{ email }` – sends OTP (email or console)
- `POST /api/auth/password-reset/confirm` – body: `{ email, code, newPassword }`
- `GET /api/auth/me` – requires token; returns current user

### Dashboard

- `GET /api/dashboard/kpis` – Total products in stock, low/out of stock count, pending receipts, pending deliveries, scheduled transfers
- `GET /api/dashboard/operations?documentType=&status=&warehouseId=&page=&limit=` – Combined operations list (receipts, deliveries, transfers, adjustments) with filters

### Products

- `GET /api/products?categoryId=&warehouseId=&sku=&lowStock=&page=&limit=`
- `GET /api/products/:id` – one product with stock levels and reorder rule
- `GET /api/products/:id/stock` – stock per location
- `POST /api/products` – body: `{ name, sku, code?, categoryId?, unitOfMeasure?, description?, initialStock?, warehouseId? }`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `PUT /api/products/:id/reorder-rule` – body: `{ minQuantity?, maxQuantity?, reorderPoint?, warehouseId? }`

### Categories

- `GET /api/categories?parentId=`
- `GET /api/categories/tree` – hierarchy
- `GET /api/categories/:id`
- `POST /api/categories` – body: `{ name, description?, parentId? }`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

### Warehouses (Settings)

- `GET /api/warehouses`
- `GET /api/warehouses/:id`
- `POST /api/warehouses` – body: `{ name, code?, address?, isDefault? }`
- `PATCH /api/warehouses/:id`
- `DELETE /api/warehouses/:id`

### Receipts (Incoming)

- `GET /api/receipts?status=&warehouseId=&page=&limit=`
- `GET /api/receipts/:id`
- `POST /api/receipts` – body: `{ warehouseId, supplierRef?, notes?, lines: [{ productId, quantity, unitPrice? }] }`
- `PATCH /api/receipts/:id`
- `POST /api/receipts/:id/validate` – applies stock increase and writes to ledger
- `POST /api/receipts/:id/cancel`

### Delivery orders (Outgoing)

- `GET /api/deliveries?status=&warehouseId=&page=&limit=`
- `GET /api/deliveries/:id`
- `POST /api/deliveries` – body: `{ warehouseId, customerRef?, notes?, lines: [{ productId, quantity }] }`
- `PATCH /api/deliveries/:id`
- `POST /api/deliveries/:id/validate` – decreases stock, writes to ledger (checks availability)
- `POST /api/deliveries/:id/cancel`

### Internal transfers

- `GET /api/transfers?status=&fromWarehouseId=&toWarehouseId=&page=&limit=`
- `GET /api/transfers/:id`
- `POST /api/transfers` – body: `{ fromWarehouseId, toWarehouseId, scheduledAt?, notes?, lines: [{ productId, quantity }] }`
- `PATCH /api/transfers/:id`
- `POST /api/transfers/:id/validate` – moves stock between warehouses, logs transfer_in/transfer_out
- `POST /api/transfers/:id/cancel`

### Stock adjustments

- `GET /api/adjustments?status=&warehouseId=&page=&limit=`
- `GET /api/adjustments/:id`
- `POST /api/adjustments` – body: `{ warehouseId, reason?, notes?, lines: [{ productId, countedQuantity }] }` (previous quantity and difference computed)
- `PATCH /api/adjustments/:id`
- `POST /api/adjustments/:id/validate` – sets stock to counted quantity and logs adjustment
- `POST /api/adjustments/:id/cancel`

### Move history (stock ledger)

- `GET /api/move-history?productId=&warehouseId=&referenceType=&from=&to=&page=&limit=` – list moves with product/warehouse details

### Profile

- `GET /api/profile` – current user
- `PATCH /api/profile` – body: `{ name?, currentPassword?, newPassword? }`

## Document statuses

Documents use: `draft` | `waiting` | `ready` | `done` | `canceled`. Only `validate` sets `done` and updates stock + ledger.

## Seed

- User: `admin@ims.local` / `password123`
- Warehouse: Main Warehouse (MAIN)
- Category: Raw Materials
- Product: Steel Rods (SKU STEEL-ROD-001), 100 kg in Main Warehouse

## Next steps (frontend)

- Login/signup and OTP reset screens
- Dashboard with KPIs and filters
- Products, categories, warehouses CRUD
- Receipts, deliveries, transfers, adjustments flows and validate/cancel
- Move history and profile/settings

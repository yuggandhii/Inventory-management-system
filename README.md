# CoreInventory — Inventory Management System

A full-stack, modular Inventory Management System built from scratch to digitize and streamline all stock-related operations within a business. Replaces manual registers, Excel sheets, and scattered tracking methods with a centralized, real-time, easy-to-use application.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev server, modern React with hooks |
| State Management | Zustand | Lightweight, no boilerplate, token stored in memory |
| Server State | React Query | Caching, auto-refetch, optimistic updates |
| Forms | React Hook Form + Zod | Schema-based validation, instant field-level errors |
| HTTP Client | Axios | Interceptors for auth token + auto refresh |
| Backend | Node.js + Express | Modular, fast, widely supported |
| Validation | Zod | Same schemas shared across backend routes |
| Authentication | JWT (access + refresh) | Stateless, secure, dual-token pattern |
| Password Hashing | bcryptjs | Industry standard, salt rounds 12 |
| Database | PostgreSQL (local) | Relational, ACID compliant, production-grade |
| Query Builder | Knex.js | Migrations, seeds, raw SQL when needed |
| Logging | Winston | Structured logs, colorized in dev, JSON in prod |
| Security | Helmet + CORS + Rate Limiter | Headers, origin restriction, brute force protection |

---

## Why PostgreSQL — Not Firebase or MongoDB

The entire system is built around **double-entry inventory logic** — every stock movement has a source and a destination, and the on-hand quantity is updated atomically in a single database transaction. This requires:

- **ACID transactions** — if any part of a stock validation fails, the entire operation rolls back. No partial stock updates.
- **Relational integrity** — foreign keys ensure move lines always reference valid products and locations.
- **Single source of truth** — the `stock_quant` table holds current on-hand quantity per (product, location) pair. Never recomputed from history at query time.
- **Indexes** — on `stock_moves(status, move_type)` and `stock_quant(product_id, location_id)` for fast dashboard queries.

---

## Database Design
```
users
  └── stock_moves (created_by, validated_by → users.id)
        └── move_lines (move_id → stock_moves.id)
              └── products (product_id → products.id)
                    └── product_categories (category_id → product_categories.id)

warehouses
  └── locations (warehouse_id → warehouses.id)
        └── stock_quant (location_id → locations.id, product_id → products.id)
        └── adjustments (location_id → locations.id, product_id → products.id)
```

### Key Tables

| Table | Purpose |
|---|---|
| `users` | Login ID (6-12 chars), bcrypt hashed password, role (manager/staff), OTP for reset |
| `warehouses` | Physical warehouse sites with short code |
| `locations` | Sub-locations inside warehouses (racks, rooms) + virtual Vendor/Customer nodes |
| `products` | Master catalogue — name, SKU (unique), category, unit of measure, cost |
| `stock_moves` | Header for any movement — receipt, delivery, transfer, adjustment |
| `move_lines` | Line items per move — product, qty_demand, qty_done |
| `stock_quant` | **Single source of truth** — on-hand qty per (product, location) pair |
| `adjustments` | Audit trail for manual stock corrections with delta logging |

---

## Architecture — Backend Module Structure

Each feature is a self-contained module:
```
src/modules/
  auth/          → signup, login, logout, OTP password reset
  products/      → CRUD, SKU search, stock per location
  warehouse/     → warehouse + location management
  receipts/      → incoming stock from vendors
  deliveries/    → outgoing stock to customers
  transfers/     → internal stock movement between locations
  adjustments/   → fix mismatches between physical and recorded stock
  stock/         → real-time on-hand view with free-to-use calculation
  dashboard/     → KPI summary, low stock alerts, move history
```

Every module follows the same pattern:
```
routes.js       → Express router, middleware chain
controller.js   → thin handler, calls service, uses response helpers
service.js      → all business logic and DB queries
validation.js   → Zod schemas for input validation
```

---

## Authentication Flow

1. **Signup** — login_id (6-12 chars, alphanumeric), email (validated), password (min 8 chars, must have uppercase + lowercase + digit + special character)
2. **Login** — bcrypt compare → issue JWT access token (15 min) + refresh token (7 days, stored as bcrypt hash in DB, sent as httpOnly cookie)
3. **Every request** — Bearer token in Authorization header, verified by `requireAuth` middleware
4. **Token refresh** — Axios interceptor catches 401, calls `/auth/refresh` with cookie, retries original request
5. **Password reset** — 6-digit OTP generated, bcrypt hashed, stored with 10-minute expiry, emailed to user
6. **Security** — access token lives in Zustand memory only (never localStorage), refresh token in httpOnly cookie (not accessible to JS)

---

## Inventory Flow Logic

### Receipt (Incoming Stock)
```
Create (Draft) → TODO button → Ready → Validate → Done
                                              ↓
                              stock_quant += qty_done  (atomic transaction)
```

### Delivery (Outgoing Stock)
```
Create (Draft) → TODO button → check stock availability
                                    ↓              ↓
                               sufficient?      insufficient?
                                Ready            Waiting
                                  ↓
                              Validate → Done
                                  ↓
                  stock_quant -= qty_done  (atomic transaction)
                  Rejects if stock goes negative
```

### Transfer (Internal Movement)
```
Create → Validate → Done
              ↓
  stock_quant -= qty from source location
  stock_quant += qty at destination location
  Both in single atomic transaction
```

### Stock Adjustment
```
Staff counts physical stock → enters qty_counted
System reads qty_system from stock_quant
delta = qty_counted - qty_system
stock_quant updated + adjustment row logged with reason
```

---

## Reference Number Format

All stock moves use timestamp-based reference numbers:
```
WH/IN/20260314141734   → Receipt
WH/OUT/20260314151528  → Delivery  
WH/INT/20260314160000  → Internal Transfer
```
Format: `<warehouse_code>/<operation_type>/<YYYYMMDDHHMMSS>`

---

## Features

### Authentication
- Signup with full validation — login ID uniqueness, email format, password strength
- Login with JWT dual-token pattern
- OTP-based password reset via email
- Role-based access — manager vs staff permissions

### Dashboard
- Live counts of pending receipts and deliveries
- Late items (scheduled date passed, not done)
- Waiting deliveries (insufficient stock)
- Low stock alerts with threshold detection
- Stock by product — interactive pie chart
- Stock value by product — bar chart (qty × cost)
- Recent move history (last 5 movements)
- Auto-refreshes every 30 seconds

### Receipts
- Create receipt with vendor, products, quantities
- Status flow: Draft → Ready → Done
- Validates stock increases atomically on confirm
- Print receipt

### Deliveries
- Create delivery with customer, products, quantities
- Status flow: Draft → Waiting → Ready → Done
- Automatically sets to Waiting if stock is insufficient
- Highlights product rows in red if out of stock
- Rejects validation if stock would go negative

### Transfers
- Move stock between any two internal locations
- Cannot transfer to same location
- Atomic — both source decrease and destination increase in one transaction

### Stock Adjustments
- Compare physical count vs system quantity
- Auto-calculates delta
- Full audit trail with reason and timestamp
- Manager-only permission

### Stock Page
- Real-time on-hand quantities per product per location
- Free to Use = On Hand minus reserved for pending deliveries
- Reserved quantity shown separately
- Search by product name or SKU

### Move History
- Complete log of all validated movements
- IN rows tinted green, OUT rows tinted red
- Search by reference or contact
- Date range filter

### Products
- Full CRUD with SKU uniqueness enforcement
- Category management
- Unit of measure, cost per unit
- Active/inactive toggle
- Search and category filter

### Settings
- Create and manage warehouses
- Create and manage locations within warehouses
- Location types: Internal, Vendor (virtual), Customer (virtual)

### Reports
- Interactive pie chart — stock distribution by product
- Bar chart — total stock value by product
- Low stock items table

---

## API Endpoints
```
AUTH
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/verify-otp
POST   /api/auth/reset-password
POST   /api/auth/refresh

PRODUCTS
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
PATCH  /api/products/:id/toggle-active
GET    /api/products/:id/stock
GET    /api/products/categories
POST   /api/products/categories

WAREHOUSES
GET    /api/warehouses
POST   /api/warehouses
GET    /api/warehouses/:id
PUT    /api/warehouses/:id
GET    /api/warehouses/locations
POST   /api/warehouses/locations
PUT    /api/warehouses/locations/:id

RECEIPTS
GET    /api/receipts
POST   /api/receipts
GET    /api/receipts/:id
POST   /api/receipts/:id/todo
POST   /api/receipts/:id/validate
POST   /api/receipts/:id/cancel

DELIVERIES
GET    /api/deliveries
POST   /api/deliveries
GET    /api/deliveries/:id
POST   /api/deliveries/:id/todo
POST   /api/deliveries/:id/validate
POST   /api/deliveries/:id/cancel

TRANSFERS
GET    /api/transfers
POST   /api/transfers
GET    /api/transfers/:id
POST   /api/transfers/:id/validate
POST   /api/transfers/:id/cancel

ADJUSTMENTS
GET    /api/adjustments
POST   /api/adjustments

STOCK
GET    /api/stock

DASHBOARD
GET    /api/dashboard

MOVE HISTORY
GET    /api/move-history
```

---

## Setup & Installation

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14 running locally
- Git

### 1. Clone the repository
```bash
git clone https://github.com/yuggandhii/Inventory-management-system.git
cd Inventory-management-system
```

### 2. Setup Backend
```bash
cd backend-yug
cp .env.example .env
```

Open `.env` and set your PostgreSQL password:
```
DB_PASSWORD=your_postgres_password
```
```bash
npm install
```

### 3. Create Database
```bash
psql -U postgres -c "CREATE DATABASE coreinventory;"
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Run Seeds (demo data)
```bash
npm run seed
```

### 6. Start Backend
```bash
npm run dev
# Running on http://localhost:4000
```

### 7. Setup Frontend
```bash
cd ../frontend-yug
npm install
npm run dev
# Running on http://localhost:5173
```

---

## Demo Credentials

| Role | Login ID | Password | Access |
|---|---|---|---|
| Inventory Manager | admin1 | Admin@1234 | Full access — all modules |
| Warehouse Staff | staff1 | Staff@1234 | View + operations, no adjustments |

---

## Project Structure
```
Inventory-management-system/
├── backend-yug/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── warehouse/
│   │   │   ├── receipts/
│   │   │   ├── deliveries/
│   │   │   ├── transfers/
│   │   │   ├── adjustments/
│   │   │   ├── stock/
│   │   │   └── dashboard/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   └── utils/
│   │       ├── logger.js
│   │       ├── response.js
│   │       └── refGenerator.js
│   ├── knexfile.js
│   └── .env.example
└── frontend-yug/
    ├── src/
    │   ├── api/
    │   │   └── axios.js
    │   ├── store/
    │   │   └── authStore.js
    │   ├── pages/
    │   │   ├── auth/
    │   │   ├── dashboard/
    │   │   ├── receipts/
    │   │   ├── deliveries/
    │   │   ├── transfers/
    │   │   ├── stock/
    │   │   ├── products/
    │   │   ├── settings/
    │   │   ├── reports/
    │   │   └── moveHistory/
    │   └── components/
└── README.md
```

---

## Git Workflow
```
main      ← production ready, final submission
develop   ← integration branch
feature/* ← individual features merged into develop
```

Commit convention used throughout:
- `feat:` new feature
- `fix:` bug fix
- `chore:` config, tooling
- `docs:` documentation
- `refactor:` code improvement

---

## Security Highlights

- Passwords hashed with bcrypt (salt rounds 12) — plaintext never stored
- OTP stored as bcrypt hash — plain OTP never in database
- JWT access token in Zustand memory only — never localStorage
- Refresh token in httpOnly cookie — not accessible to JavaScript
- Rate limiter on auth routes — 20 requests per 15 minutes
- Helmet.js security headers on all responses
- CORS restricted to frontend URL only
- All inputs validated with Zod before hitting service layer
- Role-based access — managers only for adjustments and warehouse management

# Restaurant Ordering API + Order Timeline Viewer

Full-stack food ordering system with a NestJS backend API and Next.js frontend. Features server-side pricing, idempotent order creation, async order processing with an append-only event timeline, and a real-time order status viewer.

## Architecture Decisions

- **MongoDB** — flexible document model fits hierarchical product data (products with nested modifier groups/options) without complex joins. Natural fit for orders with denormalized item snapshots.
- **Redis** — used for two distinct concerns: (1) menu cache with 5-min TTL for read-heavy menu queries, (2) idempotency key storage with 24h TTL to prevent duplicate order creation. Both use graceful degradation — the system works without Redis.
- **Repository Pattern with DI tokens** — services depend on abstract interfaces (`IMenuRepository`, `IOrdersRepository`), not Mongoose. Swapping to DynamoDB or PostgreSQL only requires a new repository implementation and rebinding the DI token.
- **Server-side pricing** — the client sends only `productId` and selected modifier names. Prices are resolved from the database, preventing client-side manipulation. All monetary values stored as integer cents to avoid floating-point errors.
- **Service fee via basis points** — configurable through environment variables (500 bp = 5%). No code changes needed to adjust fees.
- **Finite State Machine for order status** — explicit transition map (`PENDING → CONFIRMED → PREPARING → READY → COMPLETED`) prevents invalid state jumps. `CANCELLED` is reachable from any non-terminal state.
- **EventEmitter2 for async processing** — fire-and-forget pattern decouples order creation (fast 202 response) from status progression (simulated worker delays). Production-ready pattern for replacing with SQS/SNS.
- **Append-only timeline** — every state change, pricing calculation, and validation failure is recorded as an immutable event with UUID `eventId`, `correlationId`, and timestamp. Enables full audit trail and debugging.
- **Idempotency interceptor** — Redis-backed with DB unique index fallback. Ensures exactly-once order creation even on network retries.

## Tech Stack

- **Backend:** NestJS 10 + TypeScript 5 (strict mode)
- **Database:** MongoDB 7 (Mongoose ODM)
- **Cache:** Redis 7 (ioredis)
- **Frontend:** Next.js 14 + React 18 + Tailwind CSS 3
- **Infrastructure:** Docker Compose (MongoDB + Redis)
- **Serverless:** Serverless Framework 3 + serverless-offline
- **Testing:** Jest 29 + ts-jest

## Prerequisites

- **Node.js** >= 18 (recommended 20.x)
- **npm** >= 9
- **Docker** + **Docker Compose** (for MongoDB and Redis)

## Quick Start (< 10 minutes)

### 1. Clone and install

```bash
git clone <repository-url>
cd SunDevs

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

cd ..
```

### 2. Environment setup

```bash
# Backend environment (copy and adjust if needed)
cp .env.example backend/.env
```

Default values work out of the box with Docker Compose. No changes needed for local development.

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **MongoDB** on port `27017` (user: `admin`, pass: `admin123`, db: `sundevs`)
- **Redis** on port `6379`

Wait a few seconds for health checks to pass:

```bash
docker compose ps  # Both should show "healthy"
```

### 4. Seed the database

```bash
cd backend
npm run seed:menu
```

Creates 7 products across 6 categories (Burgers, Bowls, Pizzas, Salads, Sides, Drinks) with modifier groups. Idempotent — safe to run multiple times.

### 5. Start the backend

```bash
cd backend
npm run start:dev
```

Backend API available at **http://localhost:3000**

Alternatively, using Serverless offline:

```bash
npx serverless offline start
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend available at **http://localhost:3001**

### 7. Open the app

Navigate to **http://localhost:3001** to:

1. Browse the menu grouped by category
2. Customize items with modifier selections (protein, toppings, sauces)
3. Add items to cart and place an order
4. Watch the order status progress in real-time (auto-polls every 3s):
   `PENDING → CONFIRMED → PREPARING → READY`
5. View the full event timeline for each order

## Running Tests

```bash
cd backend

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov
```

Tests are fully unit-tested with mocked dependencies — no MongoDB or Redis required.

### Test Coverage

| Test Suite | What it covers |
|-----------|---------------|
| `order-pricing.spec.ts` | Server-side pricing calculation, service fee, multi-item orders |
| `orders-idempotency.spec.ts` | Idempotent POST /orders via Redis-backed interceptor |
| `order-validation.spec.ts` | Modifier validation (required/optional groups, min/max, unknown options) |
| `timeline.spec.ts` | Append-only timeline, chronological ordering, pagination |
| `order-status.spec.ts` | FSM status transitions (valid paths, invalid jumps, terminal states) |
| `payload-size.spec.ts` | Payload size guard (16KB limit enforcement) |

## API Endpoints

| Method | Endpoint | Description | Headers |
|--------|----------|-------------|---------|
| `GET` | `/menu` | Full menu grouped by categories | — |
| `GET` | `/menu/:productId` | Single product with modifier groups | — |
| `POST` | `/orders` | Create order (returns 202 Accepted) | `Idempotency-Key: <uuid>`, `X-User-Id: <string>` |
| `GET` | `/orders/:orderId` | Order details with pricing breakdown | — |
| `GET` | `/orders/:orderId/timeline` | Paginated event timeline | `?page=1&pageSize=20` |

### Example: Create an Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen || node -e 'console.log(crypto.randomUUID())')" \
  -H "X-User-Id: user-1" \
  -d '{
    "items": [{
      "productId": "<product-id-from-menu>",
      "quantity": 1,
      "selectedModifiers": {
        "Protein": ["Chicken"],
        "Toppings": ["Cheese", "Bacon"]
      }
    }]
  }'
```

## Project Structure

```
SunDevs/
├── docker-compose.yml          # MongoDB 7 + Redis 7
├── .env.example                # Documented environment variables
├── README.md
│
├── backend/
│   ├── src/
│   │   ├── main.ts             # App bootstrap (ValidationPipe, CORS)
│   │   ├── app.module.ts       # Root module (ConfigModule + Joi validation)
│   │   ├── lambda.ts           # AWS Lambda entry point
│   │   │
│   │   ├── common/             # Shared module (@Global)
│   │   │   ├── constants/      # Money helpers (cents, basis points)
│   │   │   ├── dto/            # PaginationQueryDto
│   │   │   ├── filters/        # HttpExceptionFilter (unified errors)
│   │   │   ├── guards/         # PayloadSizeGuard (16KB limit)
│   │   │   ├── interceptors/   # LoggingInterceptor, IdempotencyInterceptor
│   │   │   ├── interfaces/     # IRepository<T>, PaginatedResponse<T>
│   │   │   └── services/       # RedisService (ioredis wrapper)
│   │   │
│   │   ├── menu/               # Menu domain module
│   │   │   ├── schemas/        # Product, ModifierGroup, ModifierOption
│   │   │   ├── interfaces/     # IMenuRepository (Symbol DI token)
│   │   │   ├── repositories/   # MenuRepository (Mongoose)
│   │   │   ├── dto/            # Response DTOs
│   │   │   ├── menu.service.ts # Cache + category grouping
│   │   │   └── menu.controller.ts
│   │   │
│   │   ├── orders/             # Orders domain module
│   │   │   ├── schemas/        # Order, OrderItem
│   │   │   ├── enums/          # OrderStatus + FSM transitions
│   │   │   ├── interfaces/     # IOrdersRepository
│   │   │   ├── repositories/   # OrdersRepository (Mongoose)
│   │   │   ├── dto/            # CreateOrderDto, response DTOs
│   │   │   ├── listeners/      # OrderProcessorListener (async worker)
│   │   │   ├── orders.service.ts  # Pricing, validation, FSM
│   │   │   └── orders.controller.ts
│   │   │
│   │   ├── timeline/           # Timeline domain module
│   │   │   ├── schemas/        # TimelineEvent
│   │   │   ├── enums/          # EventType, EventSource
│   │   │   ├── interfaces/     # ITimelineRepository
│   │   │   ├── repositories/   # TimelineRepository (Mongoose)
│   │   │   ├── timeline.service.ts  # Append-only events
│   │   │   └── timeline.controller.ts
│   │   │
│   │   └── database/
│   │       └── seeds/          # menu.seed.ts (7 products)
│   │
│   ├── serverless.yml          # Serverless Framework config
│   ├── package.json
│   └── tsconfig.json           # Strict TypeScript
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx      # Root layout + CartProvider
    │   │   ├── page.tsx        # Menu page (category grid + cart)
    │   │   └── orders/
    │   │       └── [orderId]/
    │   │           └── page.tsx # Order status + timeline viewer
    │   ├── components/
    │   │   ├── ProductCard.tsx
    │   │   ├── CustomizeModal.tsx
    │   │   └── Cart.tsx
    │   ├── context/
    │   │   └── CartContext.tsx  # Cart state (useReducer)
    │   ├── lib/
    │   │   ├── api.ts          # API client (fetch wrapper)
    │   │   └── format.ts       # Display formatters (cents, dates)
    │   └── types/              # TypeScript interfaces
    ├── package.json
    └── tailwind.config.ts
```

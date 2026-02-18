# Project Context: Priskombo

## 1. Project Overview
Priskombo is a price comparison and basket optimization tool for the Swedish market. Uniquely, it allows users to create a "shopping list" and calculates the cheapest combination of stores to purchase the entire list from, factoring in product prices and shipping costs.

## 2. Tech Stack

### Frontend
- **Framework:** Next.js 15+ (App Router).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS.
- **Icons:** Lucide React.
- **State Management:** React Context (`CartContext`).
- **Testing:** Jest + React Testing Library (RTL).
- **Key Libraries:** `sonner` (toasts), `use-debounce`.

### Backend
- **Framework:** FastAPI (Python).
- **Database:** PostgreSQL.
- **ORM:** SQLAlchemy (Async).
- **Migrations:** Alembic.
- **Testing:** Pytest.
- **Containerization:** Docker & Docker Compose.

### Infrastructure & Services
- **Version Control:** GitHub.
- **Frontend Hosting:** Vercel.
- **Backend Hosting:** Render (Dockerized FastAPI).
- **Database:** Supabase (Managed PostgreSQL).
- **Caching:** Redis (Local/Docker).
- **Monitoring:** Uptime (Health checks/Status).

### AI & Development Tools (MCP)
- **Protocol:** Model Context Protocol (MCP).
- **Servers:**
  - `postgres` (Direct DB access).
  - `github` (Repo search/issues).
  - `priskombo-optimizer` (Custom Python server via `backend/mcp_server.py`).
- **Config:** `mcp_config.json` (Secrets via env vars).

## 3. Architecture & Key Concepts

### Optimization Logic (`backend/app/services/optimizer.py`)
- The core feature. It takes a list of products and calculates the cheapest way to buy them.
- Logic: Checks if splitting the order between stores (paying double shipping) is cheaper than buying everything from one store (higher product prices).

### Data Ingestion
- **Scraper:** Handles fetching data from external stores.
- **Feed Engine:** Processes product feeds.
- **Affiliate:** Manages tracking links (`backend/app/services/affiliate.py`).

### Frontend UI Structure
- **Mobile First:** All UI components must be optimized for mobile screens first, then scaled up for desktop.
- **Navigation:**
  - Desktop: Navbar with search.
  - Mobile: Navbar + Sticky bottom bar (for primary actions like "Add to cart").
- **Cart:** handled via `CartSidebar` (desktop/mobile drawer).

### MCP Server (`backend/mcp_server.py`)
- Acts as a bridge between AI agents and the backend logic.
- Exposes tools like `optimize_basket` and `get_product_info`.
- Uses the same underlying services (`optimizer.py`, `db/session.py`) but runs as a standalone script to avoid web server overhead.

## 4. Coding Conventions & Rules

### General
- **Language:** Code comments and commits in English. UI text in Swedish.
- **Files:** Use absolute imports (e.g., `@/components/...`).

### Testing Protocol (MANDATORY)
**"Everything must be tested."**
- **Frontend:**
  - Every new component must have a corresponding `.test.tsx` file.
  - Tests must cover: Rendering, User Interactions (clicks, typing), and State Changes.
  - When modifying UI, update tests immediately to reflect structure changes (e.g., dealing with duplicate elements for mobile/desktop layouts).
- **Backend:**
  - Every endpoint and service function must have unit/integration tests in `backend/tests/`.
  - Use `conftest.py` fixtures for database state.

### Frontend Rules
- **Server vs Client Components:** Default to Server Components. Use `"use client"` only when necessary (state, hooks, interactivity).
- **Styling:** Use standard Tailwind classes. Avoid custom CSS files if possible.
- **Responsiveness:** Always test/consider `md:` and `lg:` breakpoints. Mobile layout is critical.
- **Tests Gotchas:** When writing tests, mock `next/navigation`, `lucide-react`, and `CartContext` as they often cause issues in JSDOM environment.

### Backend Rules
- **Type Hints:** Mandatory for all Python functions.
- **Schemas:** Use Pydantic models for request/response validation.
- **Database:** Never commit distinct SQL queries; use SQLAlchemy ORM methods.

## 5. Common Workflows

### Running the project
- Frontend: `npm run dev` (Port 3000)
- Backend: `docker-compose up` or local venv (Port 8000)

### Database Migrations
- Generate: `alembic revision --autogenerate -m "message"`
- Apply: `alembic upgrade head`
- **Prod DB:** Since Supabase is used, verify connection string before applying migrations to production.

## 6. Known "Gotchas" / History
- **Navbar Search:** There are two search inputs in the DOM (one for mobile, one for desktop). Tests must handle this using `getAllBy...`.
- **Z-Index:** The `Navbar` and `CartSidebar` fight for z-index on mobile. `CartSidebar` must be top-most.
- **JSDOM:** Form submissions in tests sometimes fail to trigger in JSDOM; prioritize testing click events on buttons over form submits if flaky.
- **Port Conflicts:** Local Postgres service on Windows (port 5432) often conflicts with Docker. Ensure local service is stopped.
- **DB Connections:** `pool_pre_ping=True` is required in SQLAlchemy to handle stale connections (especially with Docker/MCP restarts).
- **Redis on Windows:** MCP server running on host needs `localhost` for Redis, while Docker containers use `redis` service name. Handled via env var override or logic in `mcp_server.py`.
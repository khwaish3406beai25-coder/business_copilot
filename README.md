# BusinessPilot AI

> An AI-powered business co-pilot for small business owners. Analyze sales, track inventory, predict demand, and get actionable AI-generated insights — all in one dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Backend | FastAPI (Python 3.11+) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| AI | Claude API / OpenAI API |

---

## Project Structure

```
businesspilot/
├── frontend/          # Next.js 14 App Router
├── backend/           # FastAPI Python
├── database/          # SQL schema migrations
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- Python 3.11+
- A Supabase project ([supabase.com](https://supabase.com))
- An AI API key (Anthropic or OpenAI)

---

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your Supabase + AI credentials

# Start the dev server
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.local.example .env.local
# Edit .env.local with your Supabase public keys

# Start the dev server
npm run dev
```

App available at: http://localhost:3000

---

### Database Setup

1. Open your Supabase project → SQL Editor
2. Run `database/schema.sql`
3. Verify tables are created in the `public` schema

---

## Development Phases

| Phase | Feature | Status |
|---|---|---|
| 1 | Project Foundation | ✅ Complete |
| 2 | Auth + CSV Upload + Data Pipeline | 🔜 Next |
| 3 | Dashboard & Analytics | 🔜 Planned |
| 4 | AI Insights Layer | 🔜 Planned |
| 5 | Forecasting & Reports | 🔜 Planned |
| 6 | AI Chat | 🔜 Planned |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only — never expose) |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `AI_PROVIDER` | `claude` or `openai` |
| `ANTHROPIC_API_KEY` | Required if AI_PROVIDER=claude |
| `OPENAI_API_KEY` | Required if AI_PROVIDER=openai |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key (safe for browser) |
| `NEXT_PUBLIC_API_URL` | FastAPI backend URL (default: http://localhost:8000) |

---

## Git Workflow

- One feature per branch
- Small, meaningful commits
- Never push broken code
- Merge only after testing

# Project

BusinessPilot AI is an AI-powered business co-pilot that helps small business owners analyze sales, inventory, profits, and product performance. It provides actionable insights, predicts future demand, and recommends business decisions through an interactive dashboard.

---

# Tech Stack

Frontend:
- Next.js
- Tailwind CSS
- TypeScript

Backend:
- FastAPI (Python)

Database:
- Supabase PostgreSQL

Authentication:
- Supabase Auth

Charts:
- Recharts

AI:
- Claude API/OpenAI API

---

# Conventions

- Use TypeScript strict mode.
- Keep components reusable.
- Use clean folder structure.
- Use environment variables for API keys.
- Follow REST API architecture.
- Write readable and modular code.

---

# Git Workflow

- One feature per branch.
- Small commits.
- Meaningful commit messages.
- Never push broken code.
- Merge only after testing.

---

# Boundaries

- Do not delete files unless asked.
- Do not install new packages without permission.
- Never expose API keys.
- Keep backend and frontend separate.
- Ask before making major architectural changes.

---

# Testing

- Every feature should be tested.
- Backend APIs should return proper error messages.
- Dashboard should handle empty datasets.
- AI responses should fail gracefully if the API is unavailable.

---

# Goal

Build a production-quality MVP that demonstrates how AI can act as a business partner by analyzing business data, identifying problems, forecasting demand, and providing actionable recommendations.
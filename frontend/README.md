# Qwizo React Frontend

React + TypeScript + Vite + Tailwind CSS migration of the Qwizo teacher/student UI.

## Status: Phase 2 — scaffold only

The current production UI remains the vanilla JS app in `../public/`.
This React app is being built alongside it, view by view. Nothing here is
served to users yet.

## Development

```bash
cd ~/workspace/qwizo/frontend

npm run dev            # both worker + frontend (recommended)
npm run dev:worker     # Wrangler dev server only (:18787)
npm run dev:frontend   # Vite dev server only (:5173)
```

Architecture stays as specified:

```
React/Vite (:5173) → /api/* → Vite proxy → Wrangler Worker (:18787)
                                              → Durable Object/SQLite/KV/Workers AI
```

- React calls relative paths (`/api/auth/login`, `/api/quizzes`) — no hardcoded localhost URLs.
- The Worker is never merged into Vite. Wrangler remains the backend.
- Production stays: Cloudflare Worker serves the built React frontend + API.

## Foundation verified (2026-10-06)

1. ✅ React loads (Vite :5173, HTTP 200)
2. ✅ `/api/*` proxies to Worker (`/api/health` returns through proxy)
3. ✅ Auth works end-to-end through proxy (signup → login → `/api/auth/me` with session cookie)
4. ✅ Vanilla `/app` untouched (87KB app.js, all 59 functions intact)
5. ✅ Unit tests green (`ai.test.mjs`, `grade.test.mjs` pass)

Note: `wrangler dev` needs `--local` in this environment (no CLOUDFLARE_API_TOKEN
for the remote AI binding). AI endpoints return auth errors locally — unchanged
from before; real AI is verified only against authorized remote deploys.

## Structure

```
src/
  components/       shared UI (buttons, inputs, modals…)
  pages/            route-level pages
  features/
    auth/           login, signup, session
    quizzes/        dashboard, quiz list, create
    questions/      quiz editor
    question-bank/  bank CRUD + picker
    student/        public quiz taking flow
    results/        submissions + analytics
    settings/       teacher profile
  hooks/            shared React hooks
  lib/
    api/            typed client for the existing Worker API
    validation/     Zod schemas (mirrors backend validation)
  stores/           (only if a real need appears — local state first)
  types/            TypeScript types matching API shapes
  routes/           React Router configuration
```

## Rules

- The Worker API does not change. Endpoint shapes in `src/lib/api/client.ts`
  must match the existing backend.
- No global store until a real need appears. Local state first.
- Keep components small. No 1000-line files.
- Visual identity: minimal, professional, calm. One accent (`#2B5FE3`).
  See `src/index.css` for tokens.

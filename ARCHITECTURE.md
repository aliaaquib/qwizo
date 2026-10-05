# Qwizo — Current Architecture (Phase 1)

Documented 2026-10-06. This is the baseline for the React+TypeScript migration.
Nothing here is being replaced yet — this is the inventory of what must be preserved.

## Overview

```
Browser (vanilla HTML/CSS/JS, hash-routed SPA)
  ↓  JSON API (35 endpoints)
Cloudflare Worker (vanilla JS, ~1,800 lines)
  ↓
Durable Object `TeacherStore` (SQLite, one DB per teacher)
  ↓
KV (email→teacher, share-code→teacher, rate limits, asset cache)
Workers AI (Llama 3.3 70B, quiz generation)
```

## Backend — `worker/src/` (vanilla JS)

| File | Lines | Responsibility |
|------|-------|----------------|
| `index.js` | 857 | Router + all 35 API handlers, security headers/CSP, asset serving |
| `db.js` | 487 | `TeacherStore` Durable Object, schema, all queries |
| `auth.js` | 152 | PBKDF2 (210k iter), JWT sign/verify, httpOnly cookies, rate limiting |
| `ai.js` | 191 | Workers AI prompts, strict JSON validation, retry logic |
| `grade.js` | 149 | Server-side grading, snapshots, publish validation |
| `upload.js` | 75 | TXT/DOCX text extraction (PDF refused honestly) |

### API endpoints (35)

**Auth** (5): signup, login, logout, me (GET/PUT)
**Quizzes** (8): list, create, get, update, delete, duplicate, publish, unpublish, archive
**Questions** (6): create, update, delete, duplicate, reorder, to-bank, ai-action
**Bank** (5): list, create, update, delete, add-to-quiz
**AI** (2): generate, generate-upload
**Results** (3): summary, submissions list, submission detail
**Public** (4): quiz by code, start attempt, submit, result by token
**Meta** (1): health + dashboard stats

### Database schema (10 tables, per-teacher SQLite)

`user`, `quizzes`, `questions`, `options`, `matching_pairs`,
`accepted_answers`, `bank_items`, `attempts`, `submissions`, `submission_answers`

Key design: `questions.quiz_id` nullable (bank items have no quiz),
`quizzes.published_snapshot` stores frozen JSON at publish time,
`attempts.used` prevents resubmission, `submissions.snapshot` preserves grading context.

### Security properties (must preserve)

- PBKDF2-SHA256, 210,000 iterations
- JWT in httpOnly cookies, 7-day expiry
- Teacher isolation is structural (separate DO per teacher, no cross-teacher queries)
- Server-side grading — client scores never trusted
- Public quiz payload strips `is_correct` and correct answers
- Rate limits: 10/min auth, 30/min public, 30/hr AI-gen, 20/hr AI-actions
- CSP: strict for app shells (`script-src 'self'`), lenient for marketing page
- All user content escaped via `esc()` in frontend (60 call sites)

## Frontend — `public/` (vanilla, ~1,830 lines)

| File | Lines | Responsibility |
|------|-------|----------------|
| `js/app.js` | 1,475 | Teacher SPA: 13 views, hash router, editor, autosave |
| `js/take.js` | 354 | Student flow: intro → questions → submit → results |
| `js/qr.js` | vendored | QR code generation (SVG) |
| `app.html`, `take.html`, `index.html` | shells | App shells + marketing page |
| `css/app.css`, `take.css`, `fonts.css` | styles | Geist fonts, minimal professional design |

### Teacher SPA views (13)

Login, Signup, Dashboard, QuizList, QuizNew, Editor, Preview,
Share, Results, Bank, Settings, AICreate (prompt), AICreate (upload)

### Key frontend behaviors

- **Autosave**: 900ms debounce, states (Saving…/Saved/Unsaved changes),
  flush on navigation (`flushPendingSaves`), beforeunload warning
- **Editor**: direct inline editing, drag reorder, duplicate (persists order),
  type switching, AI assist chips, bank integration
- **Student**: timer with auto-submit, 2-min server grace, signed result URLs
  with `history.replaceState`

## AI integration

- Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Strict JSON schema validation (`validateAIQuestions`), 3 retries, never saves partial
- Generated quizzes always start as drafts
- Question actions: improve, easier, harder, regenerate, distractors, explanation
- Proposals shown for review, never auto-applied

## Tests (64 total, all passing)

- `test/grade.test.mjs` (11): grading all 5 types, partial credit, case sensitivity
- `test/ai.test.mjs` (13): AI output validation, malformed JSON rejection
- `test/qa_teacher.js` via jsdom (29): full teacher flow
- `test/qa_student.js` via jsdom (11): full student flow

## Deployment

- `wrangler.toml`: worker `qwizo`, KV `QWIZO_KV`, DO `TEACHER_STORE`, AI binding
- Deployed via Cloudflare API to `qwizo.imaaquibali.workers.dev`
  (workers.dev DNS currently returning 1042 — provisioning pending)
- Static assets served from KV (`asset:` prefix) as fallback when ASSETS binding absent
- Production `JWT_SECRET` set via secrets API (value not stored locally)

## What changes in migration

| Keep as-is | Migrate |
|------------|---------|
| DO + SQLite schema | Backend JS → TypeScript |
| KV usage patterns | Add Zod validation to API inputs |
| Workers AI integration | Frontend vanilla → React + TS + Vite + Tailwind |
| All API endpoint shapes | Hash routing → React Router |
| All security properties | jsdom tests → keep; add Playwright |
| All 64 tests | Add R2 for file uploads |
| Grading logic | |

## What must NOT change

- API request/response shapes (React frontend consumes the same API)
- Database schema (no migration needed for the frontend rewrite)
- Auth mechanism (cookies + JWT, no change)
- Teacher isolation model
- Grading correctness

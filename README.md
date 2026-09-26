# Cloro

**A self-hosted, real-time collaborative code editor — Google Docs for code.**

Cloro lets multiple people edit the same files simultaneously with conflict-free CRDT merging, live cursors, and presence — plus a bring-your-own-key AI pair-programmer whose edits land directly in the shared document, validated and fully undoable.

```
  ┌────────────────────┐        ┌────────────────────┐
  │  Alice (editor)    │        │  Bob (viewer)      │
  │  Monaco + cursors  │        │  Monaco + cursors  │
  └─────────┬──────────┘        └─────────┬──────────┘
            │  REST (JWT)   │  WebSocket  │
            └───────┬───────┴──────┬──────┘
                    ▼              ▼
        ┌─────────────────────────────────────┐
        │        Single Node process          │
        │   Express 5 (REST) + crossws (WS)   │
        │        ── one port, 4000 ──         │
        │                                     │
        │  ● Auth: verify 15-min access JWT   │
        │  ● Files/projects/snapshots REST    │
        │  ● Hocuspocus: one Y.Doc per file   │
        │  ● AI: SSE chat + validated ops     │
        └──────────────┬──────────────────────┘
                       │ debounced 2s writes
                       ▼
             ┌───────────────────┐
             │    PostgreSQL     │
             │  yjs_state bytea  │
             │  files/projects/  │
             │  collaborators    │
             └───────────────────┘
```

## Features

- **Conflict-free collaborative editing** — Yjs CRDTs + Monaco via `y-monaco`. Every open tab is its own Y.Doc: independent undo history, snapshots, persistence, and awareness.
- **Live cursors & presence** — remote selections with name labels, per-user colors from hashed emails, a project roster, and "who is working" dots on each tab.
- **VS Code-style file management** — path-based file tree, folder-scoped rename (folders are path prefixes, not DB rows), Ctrl+P fuzzy quick-open, colored per-extension icons, tab pruning when files are deleted remotely.
- **Snapshots & version history** — per-file snapshots, labeled restores that are always reversible (an auto "before restore" snapshot guards every restore).
- **AI pair-programmer (BYOK)** — your key, any OpenAI-compatible endpoint. Streaming SSE chat, and an Edit mode that returns structured edit ops, validated on the backend, applied on the client in a single Yjs transaction — so AI edits sync to all peers and undo like a normal keystroke.
- **Sharing** — email invites with owner/editor roles, enforced on both REST and WebSocket handshakes.
- **One-click export** — the whole project as an in-memory zip, live-doc-first so it includes edits from a second ago.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn on Base UI |
| Editor | Monaco + `y-monaco`, custom theme |
| Real-time | Yjs CRDT, Hocuspocus v4 + `@hocuspocus/provider`, crossws (WS on the same HTTP server), Awareness API |
| Backend | Express 5 + Node `http`, single process for REST + WS |
| Database | PostgreSQL (`node-postgres`, raw SQL migrations — no ORM), `bytea` for Yjs state |
| AI | OpenAI SDK (BYOK, any compatible base URL), SSE streaming, `json_schema` + Zod validation |
| Auth | Auth.js / next-auth v5 (GitHub OAuth + credentials), jose (HS256), bcryptjs |
| Shared logic | pnpm workspaces — `packages/shared` (path validation, fuzzy filter, tree derivation, edit-ops) tested once, used by both apps |
| Testing | Vitest (~32 backend tests incl. real HTTP-server integration tests) |

## Architecture highlights

- **One Y.Doc per file** — files are independent sync units, so undo, snapshots, persistence, and presence never cross-contaminate.
- **Single process, one port** — Express handles REST; `crossws` intercepts WS upgrades on the same server and hands them to Hocuspocus.
- **Two-tier JWT auth** — a 30-day httpOnly session cookie → 15-minute HS256 access tokens minted on demand, with transparent re-mint on 401 (REST) and per-reconnect minting (WS). Project membership is checked on every document load.
- **AI edits never touch the doc server-side** — the backend validates edit ops (bounds-clamped, overlap-rejected); the client applies them in one transaction tracked by the UndoManager, so stale-document conflicts are rejected and every AI edit is Ctrl+Z-able.
- **Postgres owns the file tree** — folders are path prefixes; renames are prefix-rewriting updates; path validation rejects (never sanitizes) traversal.

Deep dive: see [`architecture.md`](./architecture.md) and [`CONTEXT.md`](./CONTEXT.md).

## Setup

### Prerequisites

- Node.js ≥ 24
- pnpm (`corepack enable`)
- Docker (for Postgres) — or any PostgreSQL 16 instance


### 1. Install

```bash
pnpm install
```

### 2. Start Postgres

```bash
docker compose up -d
# creates cloro/cloro@localhost:5432/cloro
```

### 3. Run migrations

```bash
pnpm --filter backend migrate
```

### 4. Configure environment

Copy `.env.example` to `.env` (repo root — both apps read it) and fill in:

```bash
AUTH_SECRET=<generate: openssl rand -base64 32>   # used by web AND backend

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_HOCUSPUS_URL=ws://localhost:1234
API_URL=http://localhost:4000                    # server-side auth verify

DATABASE_URL=postgres://cloro:cloro@localhost:5432/cloro
WEB_ORIGIN=http://localhost:3000
```

> `AUTH_SECRET` must be identical across web and backend — it signs the session JWT that both verify.
> For the AI assistant, add your own API key/base URL in the app's AI settings (bring-your-own-key, stored per user).

### 5. Run

```bash
# terminal 1 — backend (REST on 4000 + WS on 1234)
pnpm dev:backend

# terminal 2 — frontend on http://localhost:3000
pnpm dev:web
```

Open `http://localhost:3000`, create an account with email/password, create a project, and share it by inviting a collaborator's email.

### Tests

```bash
pnpm --filter backend test   # ~32 tests incl. HTTP-server integration
pnpm --filter shared test    # edit-ops, fuzzy filter, tree, zip semantics
```

### Production layout

Cloro is verified deployable on free tiers: **Vercel** (frontend) + **alwaysdata** (backend, single 256 MB process — the single-port refactor exists for this) + **Supabase** Postgres (session pooler).

## Repository layout

```
cloro/
├── apps/
│   ├── web/        # Next.js frontend (editor, file tree, auth, AI UI)
│   └── backend/    # Express + Hocuspocus (REST, WS, AI, migrations)
├── packages/
│   └── shared/     # pure logic shared by both apps, Vitest-tested
└── docker-compose.yml
```

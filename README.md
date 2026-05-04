# RepoMind

RepoMind is a simplified SaaS MVP for turning GitHub repositories into persistent, owner-scoped project knowledge. Users sign in with GitHub, submit public or private repositories they can access, and get a saved repo report, architecture diagram, file browser, and chat experience with citations.

The current request-time analyzer remains useful as a prototype and reference implementation, but the product direction is now an authenticated dashboard with persisted repos, reports, files, diagrams, chats, and strict ownership checks.

## MVP Scope

Included in the first product pass:

- GitHub sign-in with Better Auth.
- Protected dashboard and repo detail pages.
- Public and private GitHub repository submission.
- GitHub API tree/blob ingestion with strict caps.
- Persisted repo reports, architecture graphs, file metadata, chunks, chats, and citations.
- Retry and reanalyze actions with clear failed states.
- Ownership checks for every repo, file, graph, report, chat, and message operation.

Deferred until after the MVP is validated:

- Stripe and billing.
- Public share links.
- PR diff analysis.
- Separate Render/Fly worker.
- Full Inngest orchestration.
- Tree-sitter import graph.
- Large enterprise repository support.
- Advanced analytics and full Playwright/load-test coverage.

## Stack

| Area | MVP Choice | Later Upgrade |
|---|---|---|
| App | Next.js 16.2.4 + React 19.2.4 | Keep |
| UI | Tailwind 4 + existing Shadcn/Base UI components | Keep |
| Auth | Better Auth + GitHub OAuth | Add email auth if useful |
| Database | Prisma + Postgres | Neon production branch workflow |
| API | Route handlers and server actions first | tRPC after core workflow stabilizes |
| Repo ingestion | GitHub API tree/blob access | Inngest + Render/Fly worker + git clone |
| Report model | DeepSeek/OpenAI-compatible client | Add fallback routing |
| Chat/embeddings | Gemini + pgvector | Better reranking and larger context |
| Rate limits | DB-backed counters first | Upstash Redis |
| Deployment | Vercel + Neon | Add worker service later |

## Environment Variables

Required for the MVP application:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
GITHUB_TOKEN_ENCRYPTION_KEY=
DEEPSEEK_API_KEY=
GEMINI_API_KEY=
```

Required for Prisma migration workflows when using a direct Neon connection:

```env
DIRECT_URL=
```

Optional or deferred:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
POSTHOG_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
WORKER_SERVICE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Add a single config module that parses environment variables once and fails fast on missing required values before implementation depends on them.

## Local Development

Install dependencies and run the Next.js dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Useful checks:

```bash
npm run lint
npm run build
```

Dev troubleshooting:

- If newly added routes unexpectedly return 404 in development, stop the dev
	server, remove `.next`, and restart `npm run dev`. This clears stale local
	route/cache state without changing application code.

## Next.js 16 Baseline

This repo uses Next.js 16.2.4. Before implementation work, read the relevant local docs under `node_modules/next/dist/docs/`, especially App Router, route handlers, caching, auth/session integration, server actions, and runtime limits.

Important baseline constraints for this MVP:

- App Router is the target; there is no Pages Router implementation plan.
- Route handlers use Web `Request`/`Response` APIs; dynamic route params are promises and must be awaited.
- In the current caching model, `fetch` is not cached by default; opt in explicitly where safe.
- Route handlers do not receive Server Component fetch memoization.
- Auth must be verified inside every route handler and server action, not only at the page boundary.
- Reading `cookies()` or `headers()` makes a route dynamic.
- Long-running AI routes should use the Node.js runtime and an explicit `maxDuration`.
- Edge Runtime should not be used for SDK calls that require Node.js APIs.

## Planning Docs

Start with [plan/12-simplified-saas-mvp.md](plan/12-simplified-saas-mvp.md). It is the canonical MVP plan. Older plan documents are retained as implementation notes, but any Inngest, Render/Fly worker, git clone, tree-sitter, tRPC-first, Stripe, Upstash, or full Playwright/load-test material is deferred unless explicitly reintroduced.

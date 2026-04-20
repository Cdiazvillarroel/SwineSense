# SwineSense

AI-powered farm operations assistant for swine farms.
Built with Next.js 14, Supabase, Pipedream, and the Claude API.

---

## Stack

| Layer              | Tech                                 |
|--------------------|--------------------------------------|
| Frontend           | Next.js 14 App Router · TypeScript   |
| Styling            | Tailwind CSS with brand tokens       |
| Database + Auth    | Supabase (Postgres + RLS)            |
| AI                 | Claude (Sonnet 4.5 / Opus 4.7)       |
| Automation         | Pipedream workflows                  |
| Hosting            | Vercel                               |

---

## Quick start

### 1. Prerequisites

- Node 20+
- A Supabase project with the schema from `swinesense_schema.sql` applied
- A Pipedream account for the AI workflows
- An Anthropic API key (used only from Pipedream)

### 2. Install

```bash
npm install
cp .env.example .env.local
# Fill in the values in .env.local
```

### 3. Generate database types

```bash
export SUPABASE_PROJECT_ID=your-project-ref
npm run gen:types
```

This overwrites `lib/types/database.ts` with the strict types generated
from your actual Supabase schema.

### 4. Run in dev

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture at a glance

```
app/
├── (auth)/          Unauthenticated routes (login)
├── (app)/           Authenticated app shell (sidebar + topbar)
│   ├── overview/    Executive Overview
│   ├── alerts/      Alert Centre + detail
│   ├── trends/      Monitoring Trends
│   └── …
└── api/
    ├── ingest/      Device telemetry intake
    └── webhooks/    Pipedream AI callback

lib/
├── supabase/        Browser / server / admin clients
├── db/              Repositories (sites, alerts, kpi, trends)
├── claude/          Zod schemas for AI response validation
├── utils/           cn, format
└── types/           Domain + generated DB types

components/
├── ui/              Primitives (Button, Card, Badge, Table)
├── brand/           Logo
├── layout/          Sidebar, Topbar
├── kpi/             KpiCard
├── alerts/          AlertTable, AlertFilters, SeverityBadge, AiInsightCard
└── charts/          TrendChart, AlertDistributionChart
```

**Data access pattern.** UI pages never call Supabase directly. They
import from `lib/db/*` repositories which map snake_case Postgres rows
to camelCase domain objects defined in `lib/types/domain.ts`. When the
schema changes, only the mapper adapts — components stay stable.

**Client boundary.** The service-role Supabase key is used exclusively
from files that import `'server-only'` (see `lib/supabase/admin.ts`).
The build will fail if this is ever imported from a Client Component.

**Auth flow.** Middleware (`middleware.ts`) refreshes the Supabase JWT
on every request and redirects unauthenticated users to `/login`. The
authenticated layout (`app/(app)/layout.tsx`) does a second server-side
check before rendering.

---

## AI workflow

The AI writeback path is intentionally split across three systems:

```
Supabase DB webhook  →  Pipedream  →  Claude API  →  Pipedream  →  This app
      (on insert)       (workflow)      (JSON)       (callback)   (/api/webhooks/…)
```

1. A critical alert is inserted into `alerts` (triggered by the daily
   KPI aggregator or by a real-time rule).
2. The Supabase database webhook POSTs the row to Pipedream.
3. Pipedream enriches the row with 7 days of context, builds a prompt
   (see `claude_alert_prompt.md`), and calls Claude.
4. Pipedream validates the JSON response against the schema, then POSTs
   to `/api/webhooks/pipedream-callback` on this app.
5. The Next.js route handler re-validates with Zod (`lib/claude/schemas.ts`),
   updates the alert row, and logs to `ai_processing_log`.

The shared secret in `PIPEDREAM_WEBHOOK_SECRET` must match on both sides.

---

## Scripts

| Command            | What it does                                   |
|--------------------|------------------------------------------------|
| `npm run dev`      | Dev server with hot reload                     |
| `npm run build`    | Production build                               |
| `npm run start`    | Run production build                           |
| `npm run lint`     | ESLint                                         |
| `npm run typecheck`| TypeScript check without emit                  |
| `npm run gen:types`| Regenerate `lib/types/database.ts` from Supabase |

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Set the environment variables from `.env.example` in Vercel project settings.
   - Mark `SUPABASE_SERVICE_ROLE_KEY`, `PIPEDREAM_WEBHOOK_SECRET`, and
     `INGEST_API_KEY_SALT` as secrets.
4. Deploy. The first build will run `next build`; confirm types and lint pass.
5. Point a custom domain (e.g. `app.swinesense.com`) at the Vercel project.
6. Configure the Supabase database webhook to point to
   `https://<your-pipedream-endpoint>` — NOT directly to Vercel.

---

## Next steps beyond this scaffold

- Seed script (`scripts/seed.ts`) that creates two demo sites with 30 days
  of realistic telemetry. See the architecture spec for the demo profile.
- Server Actions for alert status mutations (assign, close, snooze).
- Realtime subscription hook (`hooks/useRealtimeAlerts.ts`) that listens
  to new alerts and updates the sidebar badge without a page refresh.
- `/animals/[id]` and `/sites/[id]` detail pages.
- `/ai-insights` page consuming `site_daily_summaries` (Pipedream Opus workflow).
- Dark/light theme toggle (currently dark-only per brand guidelines).

---

© 2026 SwineSense · AI Farm Operations Assistant.

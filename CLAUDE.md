# CLAUDE.md

Guidance for AI agents (Claude Code and similar) working in this repository.

## What this is

A self-hosted **Next.js 15 (App Router) + React 19 + TypeScript** dashboard that visualizes GitLab issue-based time-tracking data for a university software-engineering course group, but is configurable for any GitLab group. Data comes from the **GitLab GraphQL API** (timelogs, issues, epics, milestones, merge requests). Everything renders server-side on each request (`force-dynamic`), behind a lightweight session-cookie auth layer.

## Commands

```bash
npm run dev            # dev server on http://localhost:4823 (Turbopack)
npm run build          # production build
npm run start          # serve production build on :4823
npm run lint           # next lint
npm test               # Vitest, run once
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest + ENFORCED per-file coverage gate (fails below threshold)
npx tsc --noEmit       # type-check (do this after edits; CI-equivalent gate)
```

Node ≥ 18 (developed on 20+). Package manager: npm.

## Architecture & data flow

1. **`app/page.tsx`** — the root Server Component. On every request it calls the fetchers in `lib/gitlab.ts` (`fetchAllIssues`, `fetchAllTimelogs`, `fetchEpics`, `fetchGroupMembers`, …), then runs **`processChartData()`** from `lib/processData.ts` to turn raw GitLab data into all derived chart/table structures, and passes everything to `components/DashboardShell.tsx`.
2. **`components/DashboardShell.tsx`** — the sidebar + sections layout. `SECTIONS` array defines the sidebar entries; `sectionContent` maps each id to its rendered component. Add a new dashboard section here.
3. **`lib/processData.ts`** — the heart of the app. Pure(ish) transforms: leaderboard, sprint metrics, category distribution, heatmap, line/bar data, CFD, user-category matrix, person details, productivity patterns. Most helpers are now exported for testing.
4. **`lib/gitlab.ts`** — all network I/O via a private `graphql()` helper using `process.env.GITLAB_TOKEN`. Paginated fetchers loop on `pageInfo.hasNextPage`/`endCursor`. `fetchEpicsForGroup` rebuilds the epic tree from flat `parent.id` references into roots+children.
5. **Auth**: `middleware.ts` gates all non-public routes, verifying the session cookie via `lib/auth-edge.ts` (Web Crypto, Edge runtime). `app/api/auth/route.ts` logs in (bcrypt compare + in-memory rate limiter) and issues the cookie. `lib/auth.ts` is the Node-crypto twin used server-side. **Tokens from the two are cross-compatible** (verified).

## Key conventions & non-obvious rules

- **Categories**: GitLab labels are mapped to four canonical buckets (Projektmanagement, Requirements Engineering, Implementierung, Architektur & Design). ALWAYS resolve a label via `resolveCategoryLabel()` (`config/dashboardConfig.ts`) — it handles exact match, `namespace::` prefixes, alias map, and regex fallback. Don't hand-roll label matching.
- **Config lives in `config/dashboardConfig.ts`**: `GITLAB_CONFIG` (group paths, API URL), `TEAM_MEMBERS`, `CATEGORIES`, `COLORS`. This is the first place to look when adapting to another group.
- **GitLab returns duplicate issues** across group paths / `includeSubgroups`. When listing issues, dedupe by `webUrl` (globally unique) — `MilestoneGanttView.buildGroups` does this. React keys must be unique: prefix issue keys with the epic/milestone id (`issue-${epic.id}-${issue.iid}`), never the bare `iid`.
- **Gantt bars**: draw progress/fill as a plain capsule — do NOT reintroduce a partial-width rounded `<rect>` progress fill (its rounded cap bleeds outside the border at small widths; this was removed deliberately).
- **Dates**: German locale. ISO calendar weeks (`KW nn`) and a custom "lecture week / Vorlesungswoche" (`VLW`, Tue–Mon) scheme — see the date helpers in `components/DateFilterBar.tsx` (`isoWeek`, `buildWeekOptions`, `buildVlwOptions`). `PROJECT_START` there anchors VLW 01.
- **`force-dynamic`**: pages re-fetch on every request; there is no data cache to invalidate.
- UI strings are **German**. Keep new user-facing text German for consistency.

## Secrets & env

- `.env.local` (git-ignored, **never commit**) holds `GITLAB_TOKEN`, `AUTH_USERS` (JSON `{username: bcrypt-hash}`), `AUTH_SESSION_SECRET` (≥32 chars). Use `.env.example` as the template.
- In `.env.local`, every `$` in a bcrypt hash must be escaped as `\$` (dotenv would otherwise expand `$2b` as a variable).

## Testing

Vitest + Testing Library + jsdom. Config in `vitest.config.mts` (`.mts` so it loads as ESM; `@` alias → repo root; `css.postcss.plugins:[]` to skip Tailwind/PostCSS in tests). Shared setup in `test/setup.ts` (stubs auth/gitlab env), factories in `test/fixtures.ts` (`makeIssue`, `makeTimelog`, `makeEpic`, `makeEpicIssue`, `makeMilestone`, `makeMergeRequest`, `labels(...)`) — use these instead of building objects by hand.

- **Logic** files are tested at ~100% lines/functions with edge cases.
- **Component** logic helpers are exported and unit-tested; render/interaction tests use `// @vitest-environment jsdom` as the first line.
- `npm run test:coverage` enforces a **per-file threshold gate** (see `coverage.thresholds` in the config). If you add a tracked file or drop coverage, the run fails — add tests rather than lowering the gate.
- When you must mark genuinely unreachable defensive code, use a justified `/* v8 ignore */` comment — don't write coverage-gaming tests.

## Working style for this repo

- After code changes, run `npx tsc --noEmit` and the relevant tests before considering the task done. For UI/behavior changes, actually load the app (the dev server auth login is required) and verify in the browser — don't claim a visual fix works without looking.
- Private component helpers may be `export`ed solely to enable unit tests; that's an accepted pattern here (export-only, no behavior change).
- Prefer minimal, targeted diffs. Keep the four category buckets and German UI intact unless asked otherwise.

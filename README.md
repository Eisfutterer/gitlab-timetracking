# GitLab Time Tracking Dashboard

A dashboard for analyzing GitLab issue-based time tracking data, built for the Software Engineering I course at DHBW Stuttgart (TINF25B6, Group 4 — MergeConflict).

## Features

- **Epics & Issues** — collapsible card view and interactive top-down SVG tree with category-colored nodes
- **Projektübersicht** — KPI tiles: total hours, sprints, average velocity, category distribution
- **Aktivität** — GitHub-style contribution heatmap (Mon–Sun)
- **Zeitliche Entwicklung** — weekly hours per person (line chart) + category trend (stacked area)
- **Team & Kategorien** — focus card (last/current cycle per person), pie + radar category distribution, per-person radar charts, user–category matrix
- **Produktivitätsanalyse** — peak hour and peak weekday charts
- **Kollaboration** — team collaboration graph, average team size per category
- **Issues** — issue complexity scatter, time estimate vs. actual comparison, cumulative flow diagram (CFD)
- **Leaderboard** — ranked team members with modal detail view (category breakdown, sprint history)
- **Gruppen-Vergleich** — cross-group comparison
- **Zeitraum-Filter** — KW dropdown (with "Alle KWs" + current KW marker) or custom date range; single-KW selection shows ±1 KW context in all charts
- **Report-Export** — full HTML report with KPIs, leaderboard, category breakdown, KW trend, per-person details, CFD and productivity stats
- **Dark / Light Mode** — full theme support
- **Präsentationsmodus** — fullscreen slide-through with keyboard navigation

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router, async Server Components)
- [Recharts](https://recharts.org/) — all charts
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [date-fns](https://date-fns.org/) — ISO week calculations
- GitLab GraphQL API

## Setup

### 1. Clone & install

```bash
git clone https://github.com/Eisfutterer/gitlab-timetracking.git
cd gitlab-timetracking
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
GITLAB_TOKEN=your_gitlab_personal_access_token
```

The token needs at least `read_api` scope.  
Go to **GitLab → Settings → Access Tokens** to create one.

### 3. Configure the dashboard

Edit `config/dashboardConfig.ts`:

```ts
export const GITLAB_CONFIG = {
    API_URL: 'https://gitlab.com/api/graphql',
    GROUP_PATH: 'your-group/your-project',
    GROUP_PATHS: ['your-group/your-project'],
    PARENT_GROUP_PATH: 'your-group',
    ISSUE_BASE_URL: 'https://gitlab.com/your-group/your-project/-/issues',
};

export const TEAM_MEMBERS = [
    "username1",
    "username2",
] as const;

export const CATEGORIES = {
    PROJEKTMANAGEMENT:        "Projektmanagement",
    REQUIREMENTS_ENGINEERING: "Requirements Engineering",
    IMPLEMENTIERUNG:          "Implementierung",
    ARCHITEKTUR_DESIGN:       "Architektur & Design",
} as const;
```

Category colors are defined in `COLORS.CATEGORY` and apply everywhere automatically.

### 4. Run locally

```bash
npm run dev        # http://localhost:4823
```

### 5. Run with Docker

```bash
docker compose up --build
```

The app will be available at `http://localhost:4823`.

## Date range filter

- **KW mode** — select a calendar week from the dropdown; "Alle KWs" shows all data. The current KW is marked with `← aktuell`.
- **Zeitraum mode** — pick a custom from/to date.
- When a single KW is selected, all time-series charts automatically show the previous and next KW for context.

## Category labels

Issues need GitLab labels that match (or are mapped to) the configured categories. The label matching uses exact match → alias map → regex fallback. See `CATEGORY_ALIASES` and `CATEGORY_PATTERNS` in `dashboardConfig.ts`.

## Report

Click the download icon in the sidebar to export a self-contained HTML report with:
- KPI summary
- Leaderboard with progress bars
- Category distribution
- KW-by-KW breakdown
- Per-person category hours + focus shift
- Cumulative flow diagram data
- Peak productivity hour and day

---

© 2026 G4 MergeConflict — DHBW Stuttgart · Software Engineering I · TINF25B6

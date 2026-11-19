# GitLab Time Tracking Dashboard

A self-hosted web dashboard for visualizing GitLab issue-based time tracking data — built for the Software Engineering I course at DHBW Karlsruhe (TINF25B6, Group 4 — MergeConflict), but adaptable to any GitLab group.

![Dashboard Demo](public/demo.gif)

> *The actual appearance in the browser is significantly sharper — the GIF format limits color depth and frame rate.*

## What it shows

| Section | Description |
|---|---|
| **Epics & Issues** | Four views of the epic/issue hierarchy: collapsible cards, interactive SVG tree, issue Gantt timeline, and a milestone Gantt (milestone bars with nested issues, packed milestone overview strip, collapsible per-milestone rows, links to the GitLab milestone pages) |
| **Project Overview** | KPI tiles: total hours, sprints, average velocity, category distribution |
| **Activity** | GitHub-style contribution heatmap |
| **Timeline** | Weekly hours per person (line chart) + category trend (stacked area) |
| **Team & Categories** | Focus card per person (last/current cycle), pie chart, per-person radar, user–category matrix |
| **Productivity** | Peak hour and peak weekday charts |
| **Collaboration** | Team collaboration graph, average team size per category |
| **Issues** | Complexity scatter, time estimate vs. actual, cumulative flow diagram (CFD) |
| **Leaderboard** | Ranked team members with modal detail view |
| **Group Comparison** | Cross-group comparison chart |
| **Presentation Mode** | Fullscreen slide-through with keyboard navigation |
| **Report Export** | Self-contained HTML report download |

### Date filter modes

- **CW** — ISO calendar week (Mon–Sun). Current week is marked `← current`. Single-week selection shows ±1 week context in all charts.
- **LW** — Lecture week (Tue–Mon), numbered from the first Tuesday of the project. Same ±1 context logic.
- **Custom** — custom date range.

---

## Setup

### Prerequisites

- Node.js ≥ 18 **or** Docker
- A GitLab personal access token with `read_api` scope

---

### 1. Clone the repository

```bash
git clone https://github.com/Eisfutterer/gitlab-timetracking.git
cd gitlab-timetracking
```

---

### 2. Configure the GitLab group and team

Edit `config/dashboardConfig.ts`:

```ts
export const GITLAB_CONFIG = {
    API_URL: 'https://gitlab.com/api/graphql',

    // Full path of your main project group
    GROUP_PATH: 'your-org/your-course/your-group',

    // List of groups whose issues are fetched (usually the same as GROUP_PATH)
    GROUP_PATHS: [
        'your-org/your-course/your-group',
    ],

    // Parent group used for the cross-group comparison chart
    PARENT_GROUP_PATH: 'your-org/your-course',

    ISSUE_BASE_URL: 'https://gitlab.com/your-org/your-course/your-group/-/issues',
};

export const TEAM_MEMBERS = [
    "GitLab Username 1",
    "GitLab Username 2",
    // ...
] as const;
```

**Categories** map GitLab labels to chart buckets. Adjust names and colors to match your label scheme:

```ts
export const CATEGORIES = {
    PROJEKTMANAGEMENT:        "Projektmanagement",
    REQUIREMENTS_ENGINEERING: "Requirements Engineering",
    IMPLEMENTIERUNG:          "Implementierung",
    ARCHITEKTUR_DESIGN:       "Architektur & Design",
} as const;
```

Add label aliases (e.g. English label → German display name) in `CATEGORY_ALIASES`, and regex fallbacks in `CATEGORY_PATTERNS`.

**VLW start date** — if you use the lecture week (LW) filter, set the project start date in `components/DateFilterBar.tsx`:

```ts
const PROJECT_START = new Date('2026-09-14'); // first day of the project
```

The dashboard automatically finds the first Tuesday on or after this date as VLW 01.

---

### 3. Create the environment file

Create a file called `.env.local` in the project root (use `.env.example` as a template). **Never commit this file.**

```env
# GitLab personal access token (read_api scope)
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

# User accounts — JSON object: { "username": "bcrypt-hash" }
# Escape every $ in bcrypt hashes as \$  (dotenv would expand $2b as a variable otherwise)
AUTH_USERS={"alice":"\$2b\$12\$<hash>","bob":"\$2b\$12\$<hash>"}

# Random secret for signing session cookies — generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_SESSION_SECRET=your_64_char_hex_secret
```

#### Generating a bcrypt password hash

```bash
node -e "const b = require('bcryptjs'); b.hash('yourpassword', 12).then(h => console.log(h))"
```

Copy the output and replace every `$` with `\$` before pasting into `AUTH_USERS`.

**Example** — for a user `alice` with password `hunter2`:

```bash
$ node -e "const b = require('bcryptjs'); b.hash('hunter2', 12).then(h => console.log(h))"
$2b$12$abc...xyz
```

In `.env.local`:

```env
AUTH_USERS={"alice":"\$2b\$12\$abc...xyz"}
```

To add more users, extend the JSON object:

```env
AUTH_USERS={"alice":"\$2b\$12\$...", "bob":"\$2b\$12\$..."}
```

---

### 4a. Run locally (Node.js)

```bash
npm install
npm run dev
```

Open [http://localhost:4823](http://localhost:4823) and log in.

---

### 4b. Run with Docker

```bash
docker compose up --build
```

The app is available at [http://localhost:4823](http://localhost:4823).

To run in the background:

```bash
docker compose up --build -d
docker compose logs -f   # follow logs
docker compose down      # stop
```

The container reads `.env.local` automatically via `env_file` in `docker-compose.yml`.

---

### 5. Expose publicly (optional)

The simplest zero-config option is [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
# Install cloudflared, then:
cloudflared tunnel --url http://localhost:4823
```

Cloudflare handles HTTPS. The dashboard's session cookies are already configured for this setup (`secure: false` at the app level; Cloudflare enforces HTTPS at the edge).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GitLab API 401: Invalid token` | Token expired or wrong scope — create a new one with `read_api` |
| `Wrong username or password` | Check that every `$` in `AUTH_USERS` is escaped as `\$` in `.env.local` |
| `429 Too many attempts` | Rate limiter triggered — wait ~1 min or restart the server (in-memory, resets on restart) |
| Charts show no data | Verify `GROUP_PATH` in `dashboardConfig.ts` matches the exact GitLab group path |
| LW 01 starts on wrong date | Set `PROJECT_START` in `DateFilterBar.tsx` to your actual project start date |

---

## Tech Stack

- [Next.js 15](https://nextjs.org/) — App Router, async Server Components, `force-dynamic` rendering
- [Recharts](https://recharts.org/) — all charts
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [date-fns](https://date-fns.org/) — ISO week + VLW calculations
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — password hashing
- GitLab GraphQL API — timelogs, issues, epics, milestones

---

## Disclaimer

This project was created independently by Group 4 — MergeConflict as part of the Software Engineering I course at DHBW Karlsruhe (TINF25B6). It is not affiliated with, endorsed by, or officially associated with DHBW Karlsruhe or any of its faculty.

The majority of this codebase was developed with the assistance of [Claude Code](https://claude.ai/code) (Anthropic's AI coding assistant). As such, no guarantees are made regarding correctness, security, or fitness for any particular purpose.

The software is provided "as is", without warranty of any kind. The authors accept no liability for any damages, data loss, security issues, or other consequences arising from the use or misuse of this software.

---

© 2026 G4 MergeConflict · Software Engineering I · TINF25B6

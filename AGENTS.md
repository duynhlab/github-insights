# AGENTS.md

Guidance for AI coding agents working in this repo. Keep changes minimal, surgical, and verifiable.

## Project

Static engineering-insights dashboard for the `duynhlab` GitHub org. Two components:

- `collector/` — Python ETL (uv project, package `insights`). REST + GraphQL, incremental, rate-limit aware. CLI: `gh-insights {collect|process|archive|all}`.
- `web/` — Vite 8 + React 19 + TanStack Router SPA, Tailwind v4 + shadcn/ui (radix) + Recharts + TanStack Table v9. Single route `src/routes/index.tsx` whose loader imports `data/processed/*.json`; sections under `src/sections/`.

Data flow: `collector` → `data/raw/` (gitignored) → `process` → `data/processed/*.json` (committed) → `web/` bundles JSON at build.

Pipeline is wired in `.github/workflows/insights.yml`: job `collect` (cron 6h + weekly, commits data) → job `deploy` (Vite build → Pages). Web-only pushes skip `collect`.

## Layout

```
collector/src/insights/   config.py, github.py, collect.py, process.py, cli.py
web/src/
  main.tsx                createRouter (basepath = Vite BASE_URL)
  routes/                 __root.tsx, index.tsx (loader + pending/error + page)
  sections/*              one component per dashboard section, receives data via props
  components/             Section, Kpi, Skeletons, StickyNav, ThemeToggle, DataTable, AuthorMultiSelect, UserActivityChart
  components/ui/*         shadcn generated primitives (keep pristine; badge.tsx adds success/warning)
  lib/{data,ui,utils}     JSON types + loadDashboard(), badge tone helpers, cn()
  styles/globals.css      Tailwind v4 + project tokens mapped to shadcn names
config.yaml               org, repo include/exclude, bots, window_days, stale_pr_days
data/{raw,processed,archive,state.json}
```

## Setup & commands

```bash
# Collector
export GH_INSIGHTS_TOKEN=ghp_xxx
cd collector && uv sync
uv run gh-insights all --config ../config.yaml

# Web (Node >= 22)
cd web && npm ci
npm run dev          # http://localhost:3000
npm run build        # tsc --noEmit + vite build → web/dist
GH_PAGES_BASE=/github-insights npm run build && npm run preview   # Pages subpath check
```

## Conventions

- **Python**: keep collector pure-stdlib + the deps already in `pyproject.toml`. Respect bot list + repo filters from `config.yaml`. Never call endpoints requiring paid GitHub plans (see README "Roadmap").
- **TypeScript**: each dashboard section is a plain component under `src/sections/` that receives its slice of `Dashboard` (see `src/lib/data.ts`) via props from the route in `src/routes/index.tsx`. Never fetch from GitHub at runtime. Tables go through `components/DataTable.tsx` (TanStack Table v9 `columnHelper`), charts through `components/ui/chart.tsx` (Recharts).
- **Styling**: Tailwind v4 + shadcn primitives; compose with `cn()`. Use `tnum` for numeric columns. Dark mode is class strategy (toggle in header, no-flash init script in `index.html`). Add new colors as tokens in `globals.css`, not inline hex.
- **Data contracts**: anything written to `data/processed/*.json` is consumed by `web/`. Keep field names/shapes stable; if you change them, update both sides in the same commit.
- **No secrets in code**. Token comes from `GH_INSIGHTS_TOKEN` env / repo secret.

## Workflow for agents

1. Read the relevant file(s) before editing — match existing style, indentation, imports.
2. Make the smallest change that solves the task. Don't refactor adjacent code, don't "improve" formatting.
3. After editing collector: run `uv run gh-insights process --config ../config.yaml` against existing `data/raw/` to verify processed JSON still validates.
4. After editing web: `npm run build` must succeed (typecheck + static build).
5. Don't commit unless explicitly asked. Never push. Never run `gh-insights collect` in CI-equivalent mode locally without a token.
6. Don't edit `data/processed/*.json` by hand — regenerate via `process`.
7. Don't add new top-level dirs, linters, formatters, or test frameworks unless requested.

## Out of scope (without explicit ask)

- DORA / audit-log / secret-scanning features (require paid plan; see README Roadmap).
- Switching frameworks, bundlers, package managers.
- Backend services or runtime data fetching from the web app.

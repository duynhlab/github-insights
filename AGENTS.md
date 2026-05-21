# AGENTS.md

Guidance for AI coding agents working in this repo. Keep changes minimal, surgical, and verifiable.

## Project

Static engineering-insights dashboard for the `duynhlab` GitHub org. Two components:

- `collector/` — Python ETL (uv project, package `insights`). REST + GraphQL, incremental, rate-limit aware. CLI: `gh-insights {collect|process|archive|all}`.
- `web/` — Next.js 16 + Tailwind + Tremor, static export to GitHub Pages. RSC sections under `app/sections/`, data loader in `app/lib/data.ts`.

Data flow: `collector` → `data/raw/` (gitignored) → `process` → `data/processed/*.json` (committed) → `web/` reads JSON at build.

Pipeline is wired in `.github/workflows/insights.yml` (cron 6h + weekly backfill + Pages deploy).

## Layout

```
collector/src/insights/   config.py, github.py, collect.py, process.py, cli.py
web/app/                  layout.tsx, page.tsx, sections/*, components/*, lib/{data,ui}
config.yaml               org, repo include/exclude, bots, window_days, stale_pr_days
data/{raw,processed,archive,state.json}
```

## Setup & commands

```bash
# Collector
export GH_INSIGHTS_TOKEN=ghp_xxx
cd collector && uv sync
uv run gh-insights all --config ../config.yaml

# Web
cd web && npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
npm run build        # static export
```

Tremor needs `--legacy-peer-deps` against React 19 (see `a7444df`).

## Conventions

- **Python**: keep collector pure-stdlib + the deps already in `pyproject.toml`. Respect bot list + repo filters from `config.yaml`. Never call endpoints requiring paid GitHub plans (see README "Roadmap").
- **TypeScript**: each dashboard section is its own RSC under `app/sections/`, wrapped in `<Suspense>` with a matching skeleton in `app/components/Skeleton.tsx`. Read processed JSON via `app/lib/data.ts` — do not refetch from GitHub at runtime.
- **Styling**: Tailwind + Tremor primitives. Use `tnum` for numeric columns. Dark mode is class strategy (toggle in header, no-flash init in `layout.tsx`).
- **Data contracts**: anything written to `data/processed/*.json` is consumed by `web/`. Keep field names/shapes stable; if you change them, update both sides in the same commit.
- **No secrets in code**. Token comes from `GH_INSIGHTS_TOKEN` env / repo secret.

## Workflow for agents

1. Read the relevant file(s) before editing — match existing style, indentation, imports.
2. Make the smallest change that solves the task. Don't refactor adjacent code, don't "improve" formatting.
3. After editing collector: run `uv run gh-insights process --config ../config.yaml` against existing `data/raw/` to verify processed JSON still validates.
4. After editing web: `npm run build` must succeed (static export).
5. Don't commit unless explicitly asked. Never push. Never run `gh-insights collect` in CI-equivalent mode locally without a token.
6. Don't edit `data/processed/*.json` by hand — regenerate via `process`.
7. Don't add new top-level dirs, linters, formatters, or test frameworks unless requested.

## Out of scope (without explicit ask)

- DORA / audit-log / secret-scanning features (require paid plan; see README Roadmap).
- Switching frameworks, bundlers, package managers.
- Backend services or runtime data fetching from the web app.

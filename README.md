# github-insights

Engineering insights dashboard for the **[duynhlab](https://github.com/duynhlab)** public GitHub org. Static, free, runs on GitHub Actions + GitHub Pages.

> Live dashboard: `https://duynhlab.github.io/github-insights/` (after first successful Pages deploy)

## Key features

- **Public repos only** — no private-data leakage, FREE plan friendly.
- **Bot-aware** — `dependabot`, `renovate`, `*[bot]`, `duynebot` are split into a separate **Dependency Pulse** tab so they don't skew human metrics.
- **Configurable include/exclude** via `config.yaml` (`action-test`, `pkg`, `.github` excluded by default).
- **Rolling 90-day window** + monthly tar.gz archives (long-term time-series is intentionally deferred).
- **Incremental sync** — GraphQL cursor + `updated_at` watermark per repo (saves rate-limit).
- **Hybrid REST + GraphQL** — REST for listings, GraphQL for PR + reviews + commits in one query.
- **Repo health** — open PRs, stale PRs (>14d), median/p95 lead time, CI success rate, commits.
- **Static export** — Next.js + Tremor → GitHub Pages. No backend.
- **Schedule** — every 6h refresh + weekly Sunday backfill & archive.

## Architecture

```
GitHub REST + GraphQL
        │
        ▼
collector/ (Python + uv)        ← incremental, rate-limit aware
        │
        ▼
data/raw/   (JSON, gitignored, regenerated)
        │
        ▼
processor (aggregate.py)        ← splits bot vs human, computes lead time, CI rate
        │
        ▼
data/processed/   (committed JSON, the dashboard input)
data/archive/     (monthly raw tar.gz, committed)
        │
        ▼
web/ (Next.js static export + Tremor)
        │
        ▼
GitHub Pages  ← deployed by .github/workflows/insights.yml
```

## Local dev

```bash
# 1. Collector (uv)
export GH_INSIGHTS_TOKEN=ghp_xxx        # fine-grained PAT, scopes: public_repo, read:org
cd collector
uv sync
uv run gh-insights all --config ../config.yaml

# 2. Web
cd ../web
npm install
npm run dev          # http://localhost:3000
```

## Configuration

Edit `config.yaml`:

```yaml
org: duynhlab
repos:
  include: ["*"]
  exclude: [".github", "action-test", "pkg"]
bots: [dependabot[bot], renovate[bot], github-actions[bot], duynebot]
window_days: 90
stale_pr_days: 14
```

## Auth

- **Fine-grained PAT** (not classic). Scopes:
  - Repository access: *Public repositories (read-only)* — auto.
  - Organization permissions: *Members: Read*, *Metadata: Read*.
- Store as repo secret `GH_INSIGHTS_TOKEN` (used by the workflow).

## Deferred (intentionally — see `paste_1.txt` discussion)

- AI weekly summary (cost / token budget).
- Long-term time-series & DORA metrics (needs DuckDB snapshotting layer).
- Reviewer graph, hotspot files, bus factor — meaningful only once `homelab` has more humans.
- Per-engineer profile pages — kept until team grows; org is single-maintainer today.

## Layout

```
collector/        Python ETL (uv project)
  src/insights/
    config.py     YAML loader + bot/repo filters
    github.py     REST + GraphQL client (rate-limit + retry)
    collect.py    raw fetch (repos, commits, PRs via GraphQL, workflow_runs)
    process.py    aggregate → processed JSON, monthly archive
    cli.py        `gh-insights {collect|process|archive|all}`
config.yaml       org / filters / bots / window
data/
  raw/            gitignored, regenerated
  processed/      committed (dashboard input)
  archive/        committed (raw-YYYY-MM.tar.gz)
  state.json      incremental sync watermark
web/              Next.js static export + Tremor
.github/workflows/insights.yml   cron 6h + weekly backfill + Pages deploy
```

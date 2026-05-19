# github-insights

Engineering insights dashboard for the **[duynhlab](https://github.com/duynhlab)** public GitHub org. Static, free, runs on GitHub Actions + GitHub Pages.

> Live dashboard: `https://duynhlab.github.io/github-insights/` (after first successful Pages deploy)

## Key features

### Data pipeline
- **Public repos only** — no private-data leakage, FREE plan friendly.
- **Hybrid REST + GraphQL collector** — REST for listings, GraphQL for PRs + reviews + commits in one query.
- **Incremental sync** — GraphQL cursor + `updated_at` watermark per repo (saves rate-limit).
- **Bot-aware** — `dependabot`, `renovate`, `*[bot]`, `duynebot` routed into a separate **Dependency Pulse** section so they don't skew human metrics.
- **Configurable include/exclude** via `config.yaml` (`action-test`, `pkg`, `.github` excluded by default).
- **Rolling 90-day window** + monthly `tar.gz` archives.
- **Schedule** — every 6h refresh + weekly Sunday backfill & archive (`.github/workflows/insights.yml`).
- **Dependabot** for `github-actions`, `npm (web/)`, `pip (collector/)` — weekly, grouped.

### Metrics
- **Repo Health table** — open / stale / merged PRs, commits in window, lead-time median, TTFR median, CI success rate per repo.
- **Top-line KPIs** — Open PRs (human), Open PRs (bot), Stale PRs, Merged (window), Commits (window, all).
- **Weekly commit activity** — anonymous aggregate from GitHub `participation` API.
- **Weekly PR activity by user** — created vs merged per ISO week per author, bots toggleable.
- **By-User table** — open / merged / repos / +/− LOC / files / lead-time per author.
- **Review load** — approve / comment / changes-requested counts per reviewer (self-reviews & bots excluded).
- **PR size distribution** — stacked bar by repo (XS / S / M / L / XL buckets, XL = ≥1000 LOC).
- **Review speed (TTFR)** — hours to first non-author non-bot review, median + p90 per repo.
- **Stale PRs** — actionable list (repo, #, author, days idle, LOC), rose ≥ 30d.
- **CI failures** — per-repo workflow fail/total, fail rate, last failure link.
- **Dependency Pulse** — bot open / merged / median merge time per repo.

### UI / DX
- **Static export** — Next.js 14 + Tailwind + Tremor → GitHub Pages (no backend, no runtime cost).
- **Streaming Server Components** — each section is its own RSC wrapped in `<Suspense>` with a tailored skeleton, so the shell + sticky tabs paint immediately.
- **Sticky tab nav** — auto-scrolls active tab into view on mobile, fade-mask overflow.
- **Dark mode** — class strategy with no-flash inline init script + toggle in header.
- **Mobile-friendly** — every table and the CI card grid scroll horizontally with a fade affordance.
- **Tabular figures (`tnum`)** everywhere — no jitter when numbers change.

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

## Roadmap (requires GitHub Team / Enterprise plan)

The current build runs on the **Free** plan and intentionally avoids any
endpoint that requires a paid plan or org-admin scope. The items below are
ready to add once `duynhlab` upgrades to Team / Enterprise:

- **DORA metrics** — deployment frequency, change-failure rate, mean-time-to-restore (needs Deployments + Environments API + protected envs).
- **Audit log analytics** — `GET /orgs/{org}/audit-log` (Team+ only): force-push detection, secret-scanning alerts, admin actions.
- **Code-scanning / Dependabot alerts roll-up** — `GET /orgs/{org}/code-scanning/alerts`, `GET /orgs/{org}/dependabot/alerts` (Team+ on private, Free on public).
- **Secret-scanning alerts** — `GET /orgs/{org}/secret-scanning/alerts` (Team+ for private repos).
- **Private repos** — flip `repos.include` and grant the PAT `repo` scope; current collector already supports it.
- **Org-level seat / Copilot usage** — `GET /orgs/{org}/copilot/billing/seats` (Enterprise).
- **SAML / SSO identity mapping** — link GitHub login → real engineer identity for accurate per-person metrics (Enterprise Cloud with SAML).
- **Reviewer graph, hotspot files, bus factor** — meaningful only once the org has multiple humans actively reviewing.
- **Per-engineer profile pages** — same, kept until team grows past one maintainer.
- **AI weekly digest** — auto-summary of the rolling-window data via an LLM (deferred for token-budget reasons, not plan-related).
- **Long-term time-series** — DuckDB snapshotting layer on top of the monthly `data/archive/*.tar.gz` files.

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

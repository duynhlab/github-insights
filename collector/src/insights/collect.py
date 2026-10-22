from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from rich.console import Console

from .config import Config
from .github import GitHub

console = Console(stderr=True)


# GraphQL: PRs + reviews, paginated by cursor, newest-updated first.
# `__typename` on authors distinguishes GitHub Apps (Bot) from users so AI reviewers
# (cubic, qodo, sourcery, ...) are detected without listing them in config.
PR_QUERY = """
query($owner:String!, $repo:String!, $cursor:String) {
  repository(owner:$owner, name:$repo) {
    pullRequests(first: 50, after: $cursor, orderBy:{field: UPDATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title state isDraft
        createdAt updatedAt mergedAt closedAt
        additions deletions changedFiles
        reviewDecision
        author { login __typename }
        mergedBy { login __typename }
        labels(first: 10) { nodes { name } }
        reviews(first: 30) {
          nodes { author { login __typename } state submittedAt }
        }
      }
    }
  }
}
"""

ISSUE_QUERY = """
query($owner:String!, $repo:String!, $cursor:String) {
  repository(owner:$owner, name:$repo) {
    issues(first: 50, after: $cursor, orderBy:{field: UPDATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title state
        createdAt updatedAt closedAt
        author { login __typename }
        labels(first: 10) { nodes { name } }
        assignees(first: 5) { nodes { login } }
        comments { totalCount }
      }
    }
  }
}
"""

MAX_PAGES = 20  # 50 nodes/page → 1000 PRs or issues per repo per run
MAX_FAILED_RUN_JOBS = 100  # per repo: jobs are fetched only for failed runs


def _dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=str))


def _cutoff(cfg: Config) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=cfg.window_days)).isoformat()


def list_repos(gh: GitHub, cfg: Config) -> list[dict]:
    repos = list(gh.paginate(f"/orgs/{cfg.org}/repos", type="public"))
    filtered = [r for r in repos if not r["archived"] and cfg.repo_allowed(r["name"])]
    _dump(cfg.paths.raw / "repos.json", filtered)
    return filtered


def fetch_repo_meta(gh: GitHub, cfg: Config, repo: dict) -> None:
    name = repo["name"]
    out = cfg.paths.raw / name

    # Weekly commit totals — 52 weeks. stats/* return 202 while GitHub computes them,
    # so poll via get_stats instead of reading an empty body as "0 commits".
    participation = gh.get_stats(f"/repos/{cfg.org}/{name}/stats/participation") or {}
    _dump(out / "participation.json", {"all": participation.get("all", [])})

    # Workflow runs created inside the window (REST supports a `created` filter).
    since = _cutoff(cfg)[:10]
    runs: list[dict] = []
    try:
        url: str | None = f"/repos/{cfg.org}/{name}/actions/runs"
        params: dict = {"per_page": 100, "created": f">={since}"}
        for _ in range(5):
            if not url:
                break
            r = gh.get(url, **params)
            runs.extend(r.json().get("workflow_runs", []))
            url = r.links.get("next", {}).get("url")
            params = {}
    except Exception as e:
        console.log(f"[yellow]workflow runs {name}: {e}[/]")
    _dump(out / "workflow_runs.json", runs)

    # Jobs only for failed runs (one call each) so the dashboard can name the
    # failing job/step without paying for every green run.
    failed = [w for w in runs if w.get("conclusion") == "failure"][:MAX_FAILED_RUN_JOBS]
    jobs: dict[str, list] = {}
    for w in failed:
        try:
            gh.ensure_budget()
            payload = gh.get(f"/repos/{cfg.org}/{name}/actions/runs/{w['id']}/jobs", per_page=100)
            jobs[str(w["id"])] = payload.json().get("jobs", [])
        except Exception as e:
            console.log(f"[yellow]jobs {name}#{w['id']}: {e}[/]")
    _dump(out / "run_jobs.json", jobs)


def _fetch_connection(gh: GitHub, cfg: Config, repo: str, query: str, field: str) -> list[dict]:
    """Walk a repository connection newest-first until nodes fall out of the window."""
    cutoff = _cutoff(cfg)
    cursor = None
    nodes: list[dict] = []
    for _ in range(MAX_PAGES):
        gh.ensure_budget()
        data = gh.gql(query, {"owner": cfg.org, "repo": repo, "cursor": cursor})
        page = data["repository"][field]
        nodes.extend(page["nodes"])
        if not page["pageInfo"]["hasNextPage"]:
            break
        if page["nodes"] and page["nodes"][-1]["updatedAt"] < cutoff:
            break
        cursor = page["pageInfo"]["endCursor"]
    return nodes


def fetch_prs(gh: GitHub, cfg: Config, repo: dict) -> None:
    nodes = _fetch_connection(gh, cfg, repo["name"], PR_QUERY, "pullRequests")
    _dump(cfg.paths.raw / repo["name"] / "pulls.json", nodes)


def fetch_issues(gh: GitHub, cfg: Config, repo: dict) -> None:
    nodes = _fetch_connection(gh, cfg, repo["name"], ISSUE_QUERY, "issues")
    _dump(cfg.paths.raw / repo["name"] / "issues.json", nodes)


def run(cfg: Config) -> None:
    gh = GitHub(cfg.token, min_core=cfg.min_core_remaining, min_graphql=cfg.min_graphql_remaining)
    repos = list_repos(gh, cfg)
    console.log(f"[green]{len(repos)} repos in scope[/]")
    for r in repos:
        console.log(f"  → {r['name']}")
        fetch_repo_meta(gh, cfg, r)
        fetch_prs(gh, cfg, r)
        fetch_issues(gh, cfg, r)
    cfg.paths.state.write_text(
        json.dumps({"last_run": datetime.now(timezone.utc).isoformat()}, indent=2)
    )

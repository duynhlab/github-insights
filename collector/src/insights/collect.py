from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from rich.console import Console

from .config import Config
from .github import GitHub

console = Console(stderr=True)


# GraphQL: PRs + reviews + first commit timestamp, paginated by cursor.
PR_QUERY = """
query($owner:String!, $repo:String!, $cursor:String) {
  repository(owner:$owner, name:$repo) {
    pullRequests(first: 50, after: $cursor, orderBy:{field: UPDATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title state isDraft
        createdAt updatedAt mergedAt closedAt
        additions deletions changedFiles
        author { login __typename }
        mergedBy { login }
        reviews(first: 30) {
          nodes { author { login } state submittedAt }
        }
        commits(first: 1) {
          nodes { commit { committedDate } }
        }
        timelineItems(first: 1, itemTypes:[READY_FOR_REVIEW_EVENT]) {
          nodes { __typename ... on ReadyForReviewEvent { createdAt } }
        }
      }
    }
  }
}
"""


def _dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=str))


def _load_state(p: Path) -> dict:
    if p.exists():
        return json.loads(p.read_text())
    return {}


def _save_state(p: Path, state: dict) -> None:
    p.write_text(json.dumps(state, indent=2))


def list_repos(gh: GitHub, cfg: Config) -> list[dict]:
    repos = list(gh.paginate(f"/orgs/{cfg.org}/repos", type="public"))
    filtered = [r for r in repos if not r["archived"] and cfg.repo_allowed(r["name"])]
    _dump(cfg.paths.raw / "repos.json", filtered)
    return filtered


def warm_stats(gh: GitHub, cfg: Config, repos: list[dict]) -> None:
    """Stats/participation is fast; no warming needed. Kept as no-op for clarity."""
    return


def fetch_repo_meta(gh: GitHub, cfg: Config, repo: dict) -> None:
    name = repo["name"]
    out = cfg.paths.raw / name

    # Weekly commit totals — 52 weeks, single fast call.
    # `all` = every commit on default branch; `owner` is always 0 for org-owned repos, drop it.
    participation = gh.get(f"/repos/{cfg.org}/{name}/stats/participation").json()
    _dump(out / "participation.json", {"all": participation.get("all", [])})

    contributors = list(gh.paginate(f"/repos/{cfg.org}/{name}/contributors", anon="false"))
    _dump(out / "contributors.json", contributors)

    # workflow runs last 100 (single page)
    try:
        runs = gh.get(f"/repos/{cfg.org}/{name}/actions/runs", per_page=100).json().get(
            "workflow_runs", []
        )
        _dump(out / "workflow_runs.json", runs)
    except Exception as e:
        console.log(f"[yellow]workflow runs {name}: {e}[/]")


def fetch_prs(gh: GitHub, cfg: Config, repo: dict, state: dict) -> None:
    name = repo["name"]
    out = cfg.paths.raw / name
    cursor = None
    all_nodes: list[dict] = []
    stop_after = state.get(name, {}).get("pr_updated_at")
    window_cutoff = (datetime.now(timezone.utc) - timedelta(days=cfg.window_days)).isoformat()
    cutoff = max(stop_after or "", window_cutoff)
    max_pages = 20  # 50 PRs/page → 1000 PR cap per repo per run

    for _ in range(max_pages):
        gh.ensure_budget()
        data = gh.gql(PR_QUERY, {"owner": cfg.org, "repo": name, "cursor": cursor})
        page = data["repository"]["pullRequests"]
        nodes = page["nodes"]
        all_nodes.extend(nodes)
        if not page["pageInfo"]["hasNextPage"]:
            break
        if nodes and nodes[-1]["updatedAt"] < cutoff:
            break
        cursor = page["pageInfo"]["endCursor"]

    _dump(out / "pulls.json", all_nodes)
    if all_nodes:
        state.setdefault(name, {})["pr_updated_at"] = all_nodes[0]["updatedAt"]


def run(cfg: Config) -> None:
    gh = GitHub(cfg.token, min_core=cfg.min_core_remaining, min_graphql=cfg.min_graphql_remaining)
    state = _load_state(cfg.paths.state)
    repos = list_repos(gh, cfg)
    console.log(f"[green]{len(repos)} repos in scope[/]")
    console.log("warming stats cache...")
    warm_stats(gh, cfg, repos)
    for r in repos:
        console.log(f"  → {r['name']}")
        fetch_repo_meta(gh, cfg, r)
        fetch_prs(gh, cfg, r, state)
    state["last_run"] = datetime.now(timezone.utc).isoformat()
    _save_state(cfg.paths.state, state)

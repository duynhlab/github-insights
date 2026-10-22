from __future__ import annotations

import json
import tarfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from rich.console import Console

from .config import Config

console = Console(stderr=True)

# The processor only normalizes raw GitHub payloads into flat rows. All KPIs,
# medians and buckets are computed in the web app (web/src/lib/metrics.ts) so
# the dashboard can re-slice by time window without a rebuild.


def _read(p: Path):
    return json.loads(p.read_text()) if p.exists() else []


def _login(actor: dict | None) -> str | None:
    return (actor or {}).get("login")


def _is_bot(actor: dict | None, cfg: Config) -> bool:
    actor = actor or {}
    return actor.get("__typename") == "Bot" or cfg.is_bot(actor.get("login"))


def _labels(node: dict) -> list[str]:
    return [l["name"] for l in ((node.get("labels") or {}).get("nodes") or [])]


def _pr_row(repo: str, p: dict, cfg: Config) -> dict:
    author = p.get("author")
    author_login = _login(author)
    first_human = None
    first_ai = None
    human_reviews = 0
    ai_reviews = 0
    reviews: list[dict] = []
    for rv in (p.get("reviews") or {}).get("nodes") or []:
        ra = rv.get("author")
        login = _login(ra)
        sub = rv.get("submittedAt")
        if not login or login == author_login or not sub:
            continue  # self-reviews and unsubmitted drafts don't count
        bot = _is_bot(ra, cfg)
        reviews.append({"login": login, "bot": bot, "state": rv.get("state"), "at": sub})
        if bot:
            ai_reviews += 1
            first_ai = sub if first_ai is None or sub < first_ai else first_ai
        else:
            human_reviews += 1
            first_human = sub if first_human is None or sub < first_human else first_human

    merged_by = _login(p.get("mergedBy"))
    return {
        "repo": repo,
        "number": p["number"],
        "title": p["title"],
        "url": f"https://github.com/{cfg.org}/{repo}/pull/{p['number']}",
        "state": p["state"],
        "draft": p.get("isDraft", False),
        "author": author_login,
        "author_is_bot": _is_bot(author, cfg),
        "created_at": p["createdAt"],
        "updated_at": p["updatedAt"],
        "merged_at": p.get("mergedAt"),
        "closed_at": p.get("closedAt"),
        "additions": p.get("additions") or 0,
        "deletions": p.get("deletions") or 0,
        "changed_files": p.get("changedFiles") or 0,
        "labels": _labels(p),
        "review_decision": p.get("reviewDecision"),
        "first_human_review_at": first_human,
        "first_ai_review_at": first_ai,
        "human_reviews": human_reviews,
        "ai_reviews": ai_reviews,
        "reviews": reviews,
        "self_merged": bool(p.get("mergedAt")) and merged_by == author_login and human_reviews == 0,
    }


def _issue_row(repo: str, i: dict, cfg: Config) -> dict:
    author = i.get("author")
    return {
        "repo": repo,
        "number": i["number"],
        "title": i["title"],
        "url": f"https://github.com/{cfg.org}/{repo}/issues/{i['number']}",
        "state": i["state"],
        "author": _login(author),
        "author_is_bot": _is_bot(author, cfg),
        "created_at": i["createdAt"],
        "updated_at": i["updatedAt"],
        "closed_at": i.get("closedAt"),
        "labels": _labels(i),
        "assignees": [a["login"] for a in ((i.get("assignees") or {}).get("nodes") or [])],
        "comments": (i.get("comments") or {}).get("totalCount") or 0,
    }


def _seconds(a: str | None, b: str | None) -> int | None:
    if not a or not b:
        return None
    da = datetime.fromisoformat(a.replace("Z", "+00:00"))
    db = datetime.fromisoformat(b.replace("Z", "+00:00"))
    return max(0, int((db - da).total_seconds()))


def _failed_jobs(jobs: list[dict]) -> list[dict]:
    out = []
    for j in jobs:
        if j.get("conclusion") != "failure":
            continue
        step = next(
            (s.get("name") for s in j.get("steps") or [] if s.get("conclusion") == "failure"),
            None,
        )
        out.append({"name": j.get("name"), "step": step, "url": j.get("html_url")})
    return out


def _run_row(repo: str, w: dict, jobs: list[dict]) -> dict:
    started = w.get("run_started_at") or w.get("created_at")
    return {
        "repo": repo,
        "id": w.get("id"),
        "workflow": w.get("name") or "(unknown)",
        "run_number": w.get("run_number"),
        "attempt": w.get("run_attempt") or 1,
        "conclusion": w.get("conclusion"),
        "event": w.get("event"),
        "branch": w.get("head_branch"),
        "actor": (w.get("actor") or {}).get("login"),
        "title": w.get("display_title"),
        "created_at": w.get("created_at") or started,
        "duration_s": _seconds(started, w.get("updated_at")),
        "url": w.get("html_url"),
        "failed_jobs": _failed_jobs(jobs),
    }


def aggregate(cfg: Config) -> None:
    repos = _read(cfg.paths.raw / "repos.json")
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=cfg.window_days)).isoformat()
    weeks_in_window = max(1, min(52, cfg.window_days // 7))
    # Anchor the newest participation bucket to the current ISO week (Monday start).
    week_start = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    repo_rows: list[dict] = []
    pulls: list[dict] = []
    issues: list[dict] = []
    runs: list[dict] = []
    activity: list[dict] = []  # {repo, week, commits}

    for r in repos:
        name = r["name"]
        base = cfg.paths.raw / name

        repo_rows.append(
            {
                "name": name,
                "url": f"https://github.com/{cfg.org}/{name}",
                "lang": r.get("language"),
                "pushed_at": r.get("pushed_at"),
                "default_branch": r.get("default_branch"),
            }
        )

        # Keep anything still open plus anything touched inside the window; the
        # web app applies the selected window on top of this.
        for p in _read(base / "pulls.json"):
            if p["state"] == "OPEN" or p["updatedAt"] >= cutoff:
                pulls.append(_pr_row(name, p, cfg))
        for i in _read(base / "issues.json"):
            if i["state"] == "OPEN" or i["updatedAt"] >= cutoff:
                issues.append(_issue_row(name, i, cfg))
        run_jobs = _read(base / "run_jobs.json") or {}
        for w in _read(base / "workflow_runs.json"):
            row = _run_row(name, w, run_jobs.get(str(w.get("id")), []))
            if row["created_at"] and row["created_at"] >= cutoff:
                runs.append(row)

        all_weeks = (_read(base / "participation.json") or {}).get("all") or []
        for idx, count in enumerate(reversed(all_weeks)):
            if idx >= weeks_in_window or not count:
                continue
            week = (week_start - timedelta(weeks=idx)).strftime("%G-W%V")
            activity.append({"repo": name, "week": week, "commits": count})

    activity.sort(key=lambda a: (a["week"], a["repo"]))
    overview = {
        "generated_at": now.isoformat(),
        "window_days": cfg.window_days,
        "org": cfg.org,
        "repo_count": len(repos),
        "stale_pr_days": cfg.stale_pr_days,
        "stale_issue_days": cfg.stale_issue_days,
    }

    out = cfg.paths.processed
    out.mkdir(parents=True, exist_ok=True)
    for stale in (
        "pulls_human.json",
        "pulls_bot.json",
        "dependencies.json",
        "reviewers.json",
        "pr_size.json",
        "ttfr.json",
        "stale_prs.json",
        "ci_failures.json",
        "activity_user_weekly.json",
    ):
        (out / stale).unlink(missing_ok=True)
    (out / "overview.json").write_text(json.dumps(overview, indent=2))
    (out / "repos.json").write_text(json.dumps(repo_rows, indent=2))
    (out / "pulls.json").write_text(json.dumps(pulls, indent=2))
    (out / "issues.json").write_text(json.dumps(issues, indent=2))
    (out / "workflow_runs.json").write_text(json.dumps(runs, indent=2))
    (out / "activity_weekly.json").write_text(json.dumps(activity, indent=2))
    console.log(
        f"[green]wrote processed → {out}[/] "
        f"({len(pulls)} PRs, {len(issues)} issues, {len(runs)} runs, {len(repos)} repos)"
    )


def archive_raw(cfg: Config) -> None:
    """Rolling 90-day raw + monthly archive snapshot."""
    stamp = datetime.now(timezone.utc).strftime("%Y-%m")
    target = cfg.paths.archive / f"raw-{stamp}.tar.gz"
    if target.exists():
        return

    with tarfile.open(target, "w:gz") as tar:
        tar.add(cfg.paths.raw, arcname="raw")
    console.log(f"[green]archived → {target}[/]")

    # prune raw older than window_days by mtime
    cutoff = datetime.now(timezone.utc).timestamp() - cfg.window_days * 86400
    for p in cfg.paths.raw.rglob("*"):
        if p.is_file() and p.stat().st_mtime < cutoff:
            p.unlink()

from __future__ import annotations

import json
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import median

from rich.console import Console

from .config import Config

console = Console(stderr=True)


def _read(p: Path):
    return json.loads(p.read_text()) if p.exists() else []


def _hours(a: str, b: str) -> float:
    da = datetime.fromisoformat(a.replace("Z", "+00:00"))
    db = datetime.fromisoformat(b.replace("Z", "+00:00"))
    return (db - da).total_seconds() / 3600


def _iso_week(ts: str) -> str:
    d = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return d.strftime("%G-W%V")


def _author_login(pr: dict) -> str | None:
    a = pr.get("author") or {}
    return a.get("login")


def _is_bot(pr: dict, cfg: Config) -> bool:
    a = pr.get("author") or {}
    if a.get("__typename") == "Bot":
        return True
    return cfg.is_bot(a.get("login"))


def _size_bucket(loc: int) -> str:
    if loc < 10:
        return "XS"
    if loc < 50:
        return "S"
    if loc < 250:
        return "M"
    if loc < 1000:
        return "L"
    return "XL"


SIZE_ORDER = ["XS", "S", "M", "L", "XL"]


def _p(values: list[float], q: float) -> float | None:
    if not values:
        return None
    s = sorted(values)
    idx = max(0, min(len(s) - 1, int(round((len(s) - 1) * q))))
    return s[idx]


def _pr_url(org: str, repo: str, number: int) -> str:
    return f"https://github.com/{org}/{repo}/pull/{number}"


def aggregate(cfg: Config) -> None:
    repos = _read(cfg.paths.raw / "repos.json")
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=cfg.window_days)
    stale_cutoff = now - timedelta(days=cfg.stale_pr_days)

    overview = {
        "generated_at": now.isoformat(),
        "window_days": cfg.window_days,
        "org": cfg.org,
        "repo_count": len(repos),
    }

    repo_rows = []
    dep_rows = []
    pr_rows_human: list[dict] = []
    pr_rows_bot: list[dict] = []
    activity_buckets: dict[str, dict[str, int]] = {}  # week -> {human, bot}
    # week -> author -> {created, merged}
    user_activity: dict[str, dict[str, dict[str, int]]] = {}
    bot_logins: set[str] = set()

    reviewer_stats: dict[str, dict] = {}
    size_per_repo: dict[str, dict[str, int]] = {}
    size_per_author: dict[str, dict[str, int]] = {}
    ttfr_per_repo: dict[str, list[float]] = {}
    ttfr_per_author: dict[str, list[float]] = {}
    stale_pr_list: list[dict] = []
    ci_fail_per_repo: dict[str, dict[str, dict]] = {}

    for r in repos:
        name = r["name"]
        base = cfg.paths.raw / name
        pulls = _read(base / "pulls.json")
        participation = _read(base / "participation.json") or {}
        runs = _read(base / "workflow_runs.json")

        # PR partitioning
        humans = [p for p in pulls if not _is_bot(p, cfg)]
        bots = [p for p in pulls if _is_bot(p, cfg)]

        open_h = [p for p in humans if p["state"] == "OPEN"]
        merged_h = [p for p in humans if p["mergedAt"]]
        stale_h = [
            p
            for p in open_h
            if datetime.fromisoformat(p["updatedAt"].replace("Z", "+00:00")) < stale_cutoff
        ]

        lead_times = [_hours(p["createdAt"], p["mergedAt"]) for p in merged_h]
        bot_merged = [p for p in bots if p["mergedAt"]]
        bot_lead = [_hours(p["createdAt"], p["mergedAt"]) for p in bot_merged]

        # CI success rate
        ci_success = sum(1 for w in runs if w.get("conclusion") == "success")
        ci_total = len(runs)

        # Commits in window from participation (52 weekly buckets, oldest→newest, ending "this week")
        weeks_in_window = max(1, min(52, cfg.window_days // 7))
        all_weeks = participation.get("all") or []
        recent_total = sum(all_weeks[-weeks_in_window:])
        # NOTE: participation API is anonymous-aggregated; we cannot separate bot vs human commits.
        # Bot/human split is reflected only in the PR metrics. Charts label this as "commits (all)".

        # Time-to-first-review (merged human PRs; ignore self/bot reviews)
        repo_ttfr: list[float] = []
        for p in merged_h:
            author = _author_login(p)
            rvs = (p.get("reviews") or {}).get("nodes") or []
            first = None
            for rv in rvs:
                ra = (rv.get("author") or {}).get("login")
                if not ra or ra == author or cfg.is_bot(ra):
                    continue
                sub = rv.get("submittedAt")
                if not sub:
                    continue
                if first is None or sub < first:
                    first = sub
            if first:
                h = _hours(p["createdAt"], first)
                if h >= 0:
                    repo_ttfr.append(h)
                    ttfr_per_author.setdefault(author or "(unknown)", []).append(h)
        ttfr_per_repo[name] = repo_ttfr

        repo_rows.append(
            {
                "name": name,
                "url": f"https://github.com/{cfg.org}/{name}",
                "lang": r.get("language"),
                "size_kb": r.get("size"),
                "pushed_at": r.get("pushed_at"),
                "open_issues": r.get("open_issues_count"),
                "human_open_pr": len(open_h),
                "human_stale_pr": len(stale_h),
                "human_merged_pr": len(merged_h),
                "commits_window": recent_total,
                "lead_time_median_h": round(median(lead_times), 2) if lead_times else None,
                "lead_time_p95_h": round(
                    sorted(lead_times)[int(len(lead_times) * 0.95) - 1], 2
                )
                if len(lead_times) >= 5
                else None,
                "ttfr_median_h": round(median(repo_ttfr), 2) if repo_ttfr else None,
                "ttfr_p90_h": round(_p(repo_ttfr, 0.9), 2) if repo_ttfr else None,
                "ttfr_sample": len(repo_ttfr),
                "ci_success_rate": round(ci_success / ci_total, 3) if ci_total else None,
                "ci_runs": ci_total,
            }
        )

        dep_rows.append(
            {
                "name": name,
                "bot_open_pr": sum(1 for p in bots if p["state"] == "OPEN"),
                "bot_merged_pr": len(bot_merged),
                "bot_lead_time_median_h": round(median(bot_lead), 2) if bot_lead else None,
            }
        )

        for p in humans:
            pr_rows_human.append({"repo": name, "url": _pr_url(cfg.org, name, p["number"]), **_pr_summary(p)})
        for p in bots:
            pr_rows_bot.append({"repo": name, "url": _pr_url(cfg.org, name, p["number"]), **_pr_summary(p)})
            login = _author_login(p)
            if login:
                bot_logins.add(login)

        # Reviewers (humans only)
        for p in humans:
            rvs = (p.get("reviews") or {}).get("nodes") or []
            for rv in rvs:
                ra = (rv.get("author") or {}).get("login")
                if not ra or ra == _author_login(p) or cfg.is_bot(ra):
                    continue
                stats = reviewer_stats.setdefault(
                    ra,
                    {
                        "login": ra,
                        "approved": 0,
                        "commented": 0,
                        "changes_requested": 0,
                        "dismissed": 0,
                        "total": 0,
                        "repos": set(),
                    },
                )
                state = (rv.get("state") or "").lower()
                if state == "approved":
                    stats["approved"] += 1
                elif state == "commented":
                    stats["commented"] += 1
                elif state == "changes_requested":
                    stats["changes_requested"] += 1
                elif state == "dismissed":
                    stats["dismissed"] += 1
                stats["total"] += 1
                stats["repos"].add(name)

        # PR size distribution (humans only)
        repo_size = {b: 0 for b in SIZE_ORDER}
        for p in humans:
            loc = (p.get("additions") or 0) + (p.get("deletions") or 0)
            b = _size_bucket(loc)
            repo_size[b] += 1
            author = _author_login(p) or "(unknown)"
            size_per_author.setdefault(author, {x: 0 for x in SIZE_ORDER})[b] += 1
        size_per_repo[name] = repo_size

        # Stale PR list
        for p in stale_h:
            updated = datetime.fromisoformat(p["updatedAt"].replace("Z", "+00:00"))
            days_idle = int((now - updated).total_seconds() / 86400)
            stale_pr_list.append(
                {
                    "repo": name,
                    "number": p["number"],
                    "title": p["title"],
                    "author": _author_login(p),
                    "url": _pr_url(cfg.org, name, p["number"]),
                    "created_at": p["createdAt"],
                    "updated_at": p["updatedAt"],
                    "days_idle": days_idle,
                    "loc": (p.get("additions") or 0) + (p.get("deletions") or 0),
                    "is_draft": p.get("isDraft", False),
                }
            )

        # CI failures per workflow name
        wf_stats: dict[str, dict] = {}
        for w in runs:
            wn = w.get("name") or "(unknown)"
            s = wf_stats.setdefault(
                wn,
                {"name": wn, "fail": 0, "total": 0, "last_fail_url": None, "last_fail_at": None},
            )
            s["total"] += 1
            if w.get("conclusion") == "failure":
                s["fail"] += 1
                created = w.get("created_at") or w.get("run_started_at") or ""
                if s["last_fail_at"] is None or created > s["last_fail_at"]:
                    s["last_fail_at"] = created
                    s["last_fail_url"] = w.get("html_url")
        ci_fail_per_repo[name] = wf_stats

        # per-user weekly PR activity (created + merged), bots included
        for p in pulls:
            login = _author_login(p) or "(unknown)"
            created = p.get("createdAt")
            if created:
                wk = _iso_week(created)
                if datetime.fromisoformat(created.replace("Z", "+00:00")) >= cutoff:
                    user_activity.setdefault(wk, {}).setdefault(
                        login, {"created": 0, "merged": 0}
                    )["created"] += 1
            merged = p.get("mergedAt")
            if merged:
                wk = _iso_week(merged)
                if datetime.fromisoformat(merged.replace("Z", "+00:00")) >= cutoff:
                    user_activity.setdefault(wk, {}).setdefault(
                        login, {"created": 0, "merged": 0}
                    )["merged"] += 1

        # weekly activity from participation (anonymous, all commits)
        # Map each weekly count to an ISO week label. Anchor: most recent bucket = current week.
        from datetime import timedelta as _td

        now_week_start = (now - _td(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        for idx, count in enumerate(reversed(all_weeks)):
            if idx >= weeks_in_window or count == 0:
                continue
            wd = now_week_start - _td(weeks=idx)
            week = wd.strftime("%G-W%V")
            b = activity_buckets.setdefault(week, {"commits": 0})
            b["commits"] += count

    activity = [
        {"week": w, **counts}
        for w, counts in sorted(activity_buckets.items())
    ]

    user_weekly = [
        {"week": w, "author": a, "is_bot": a in bot_logins, **counts}
        for w, by_user in sorted(user_activity.items())
        for a, counts in by_user.items()
    ]

    reviewers = sorted(
        [
            {**{k: v for k, v in s.items() if k != "repos"}, "repos": len(s["repos"])}
            for s in reviewer_stats.values()
        ],
        key=lambda x: x["total"],
        reverse=True,
    )

    pr_size = {
        "by_repo": [{"repo": r, **counts, "total": sum(counts.values())} for r, counts in size_per_repo.items()],
        "by_author": sorted(
            [{"author": a, **counts, "total": sum(counts.values())} for a, counts in size_per_author.items()],
            key=lambda x: x["total"],
            reverse=True,
        ),
        "buckets": SIZE_ORDER,
        "thresholds": {"XS": "<10", "S": "10-49", "M": "50-249", "L": "250-999", "XL": ">=1000"},
    }

    ttfr_summary = {
        "by_repo": [
            {
                "repo": r,
                "sample": len(v),
                "median_h": round(median(v), 2) if v else None,
                "p90_h": round(_p(v, 0.9), 2) if v else None,
            }
            for r, v in ttfr_per_repo.items()
        ],
        "by_author": sorted(
            [
                {
                    "author": a,
                    "sample": len(v),
                    "median_h": round(median(v), 2) if v else None,
                    "p90_h": round(_p(v, 0.9), 2) if v else None,
                }
                for a, v in ttfr_per_author.items()
            ],
            key=lambda x: (x["median_h"] is None, x["median_h"] or 0),
        ),
    }

    stale_pr_list.sort(key=lambda x: x["days_idle"], reverse=True)

    ci_failures = []
    for repo_name, wfs in ci_fail_per_repo.items():
        items = sorted(
            [
                {**s, "fail_rate": round(s["fail"] / s["total"], 3) if s["total"] else 0}
                for s in wfs.values()
                if s["fail"] > 0
            ],
            key=lambda x: (x["fail"], x["fail_rate"]),
            reverse=True,
        )
        if items:
            ci_failures.append({"repo": repo_name, "workflows": items[:5]})
    ci_failures.sort(key=lambda x: sum(w["fail"] for w in x["workflows"]), reverse=True)

    out = cfg.paths.processed
    (out).mkdir(parents=True, exist_ok=True)
    (out / "overview.json").write_text(json.dumps(overview, indent=2))
    (out / "repos.json").write_text(json.dumps(repo_rows, indent=2))
    (out / "dependencies.json").write_text(json.dumps(dep_rows, indent=2))
    (out / "pulls_human.json").write_text(json.dumps(pr_rows_human, indent=2))
    (out / "pulls_bot.json").write_text(json.dumps(pr_rows_bot, indent=2))
    (out / "activity_weekly.json").write_text(json.dumps(activity, indent=2))
    (out / "activity_user_weekly.json").write_text(json.dumps(user_weekly, indent=2))
    (out / "reviewers.json").write_text(json.dumps(reviewers, indent=2))
    (out / "pr_size.json").write_text(json.dumps(pr_size, indent=2))
    (out / "ttfr.json").write_text(json.dumps(ttfr_summary, indent=2))
    (out / "stale_prs.json").write_text(json.dumps(stale_pr_list, indent=2))
    (out / "ci_failures.json").write_text(json.dumps(ci_failures, indent=2))
    console.log(f"[green]wrote processed → {out}[/]")


def _pr_summary(p: dict) -> dict:
    return {
        "number": p["number"],
        "title": p["title"],
        "state": p["state"],
        "draft": p["isDraft"],
        "author": _author_login(p),
        "created_at": p["createdAt"],
        "merged_at": p["mergedAt"],
        "additions": p["additions"],
        "deletions": p["deletions"],
        "changed_files": p["changedFiles"],
        "lead_time_h": round(_hours(p["createdAt"], p["mergedAt"]), 2)
        if p["mergedAt"]
        else None,
    }


def archive_raw(cfg: Config) -> None:
    """Rolling 90-day raw + monthly archive snapshot."""
    stamp = datetime.now(timezone.utc).strftime("%Y-%m")
    target = cfg.paths.archive / f"raw-{stamp}.tar.gz"
    if target.exists():
        return
    import tarfile

    with tarfile.open(target, "w:gz") as tar:
        tar.add(cfg.paths.raw, arcname="raw")
    console.log(f"[green]archived → {target}[/]")

    # prune raw older than window_days by mtime
    cutoff = datetime.now(timezone.utc).timestamp() - cfg.window_days * 86400
    for p in cfg.paths.raw.rglob("*"):
        if p.is_file() and p.stat().st_mtime < cutoff:
            p.unlink()

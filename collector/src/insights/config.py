from __future__ import annotations

import fnmatch
import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class Paths:
    raw: Path
    processed: Path
    archive: Path
    state: Path


@dataclass
class Config:
    org: str
    include: list[str] = field(default_factory=lambda: ["*"])
    exclude: list[str] = field(default_factory=list)
    bots: set[str] = field(default_factory=set)
    window_days: int = 90
    stale_pr_days: int = 14
    paths: Paths = field(default=None)  # type: ignore[assignment]
    min_core_remaining: int = 200
    min_graphql_remaining: int = 200
    token: str = ""

    def repo_allowed(self, name: str) -> bool:
        inc = any(fnmatch.fnmatch(name, p) for p in self.include)
        exc = any(fnmatch.fnmatch(name, p) for p in self.exclude)
        return inc and not exc

    def is_bot(self, login: str | None) -> bool:
        if not login:
            return False
        return login in self.bots or login.endswith("[bot]")


def load(config_path: str | Path = "config.yaml", repo_root: Path | None = None) -> Config:
    root = repo_root or Path(config_path).resolve().parent
    raw = yaml.safe_load(Path(config_path).read_text())
    p = raw.get("paths", {})
    paths = Paths(
        raw=root / p.get("raw", "data/raw"),
        processed=root / p.get("processed", "data/processed"),
        archive=root / p.get("archive", "data/archive"),
        state=root / p.get("state", "data/state.json"),
    )
    for d in (paths.raw, paths.processed, paths.archive):
        d.mkdir(parents=True, exist_ok=True)
    paths.state.parent.mkdir(parents=True, exist_ok=True)

    rl = raw.get("rate_limit", {})
    token = os.getenv("GH_INSIGHTS_TOKEN") or os.getenv("GITHUB_TOKEN") or ""
    if not token:
        raise RuntimeError("Set GH_INSIGHTS_TOKEN or GITHUB_TOKEN")

    return Config(
        org=raw["org"],
        include=raw.get("repos", {}).get("include", ["*"]),
        exclude=raw.get("repos", {}).get("exclude", []),
        bots=set(raw.get("bots", [])),
        window_days=int(raw.get("window_days", 90)),
        stale_pr_days=int(raw.get("stale_pr_days", 14)),
        paths=paths,
        min_core_remaining=int(rl.get("min_core_remaining", 200)),
        min_graphql_remaining=int(rl.get("min_graphql_remaining", 200)),
        token=token,
    )

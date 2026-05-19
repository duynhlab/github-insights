from __future__ import annotations

import time
from typing import Any, Iterator

import httpx
from rich.console import Console

REST = "https://api.github.com"
GQL = "https://api.github.com/graphql"

console = Console(stderr=True)


class GitHub:
    def __init__(self, token: str, *, min_core: int = 200, min_graphql: int = 200) -> None:
        self.min_core = min_core
        self.min_graphql = min_graphql
        self.client = httpx.Client(
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "duynhlab-github-insights",
            },
            timeout=30.0,
        )

    # ------------------- REST -------------------
    def get(self, path: str, **params: Any) -> httpx.Response:
        url = path if path.startswith("http") else f"{REST}{path}"
        for attempt in range(5):
            r = self.client.get(url, params=params)
            if r.status_code == 403 and "rate limit" in r.text.lower():
                self._sleep_until_reset(r)
                continue
            if r.status_code in (502, 503, 504):
                time.sleep(2**attempt)
                continue
            r.raise_for_status()
            return r
        r.raise_for_status()
        return r

    def get_stats(self, path: str, *, max_wait: int = 60) -> Any:
        """GitHub stats/* endpoints return 202 while computing; poll until ready."""
        deadline = time.time() + max_wait
        while True:
            r = self.get(path)
            if r.status_code == 200 and r.content and r.text.strip() not in ("", "{}"):
                return r.json()
            if time.time() > deadline:
                console.log(f"[yellow]stats not ready: {path}[/]")
                return []
            time.sleep(3)

    def paginate(self, path: str, **params: Any) -> Iterator[dict]:
        params.setdefault("per_page", 100)
        url: str | None = path
        while url:
            r = self.get(url, **params)
            data = r.json()
            if isinstance(data, list):
                yield from data
            else:
                yield data
                return
            url = r.links.get("next", {}).get("url")
            params = {}  # next URL already carries them

    # ------------------- GraphQL -------------------
    def gql(self, query: str, variables: dict | None = None) -> dict:
        for attempt in range(5):
            r = self.client.post(GQL, json={"query": query, "variables": variables or {}})
            if r.status_code in (502, 503, 504):
                time.sleep(2**attempt)
                continue
            r.raise_for_status()
            payload = r.json()
            if "errors" in payload:
                # secondary rate limit
                msg = str(payload["errors"]).lower()
                if "rate limit" in msg or "secondary" in msg:
                    time.sleep(30)
                    continue
                raise RuntimeError(f"GraphQL error: {payload['errors']}")
            return payload["data"]
        raise RuntimeError("GraphQL: exhausted retries")

    # ------------------- guards -------------------
    def rate_status(self) -> dict:
        return self.get("/rate_limit").json()["resources"]

    def ensure_budget(self) -> None:
        r = self.rate_status()
        if r["core"]["remaining"] < self.min_core:
            self._wait(r["core"]["reset"], "core")
        if r["graphql"]["remaining"] < self.min_graphql:
            self._wait(r["graphql"]["reset"], "graphql")

    def _sleep_until_reset(self, r: httpx.Response) -> None:
        reset = int(r.headers.get("x-ratelimit-reset", "0"))
        self._wait(reset, "primary")

    def _wait(self, reset_ts: int, label: str) -> None:
        delay = max(reset_ts - int(time.time()), 5) + 2
        console.log(f"[yellow]{label} rate-limit: sleeping {delay}s[/]")
        time.sleep(delay)

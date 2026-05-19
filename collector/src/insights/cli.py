from __future__ import annotations

import argparse
from pathlib import Path

from .config import load
from .collect import run as run_collect
from .process import aggregate, archive_raw


def main() -> None:
    parser = argparse.ArgumentParser("gh-insights")
    parser.add_argument("cmd", choices=["collect", "process", "archive", "all"])
    parser.add_argument("--config", default="config.yaml")
    args = parser.parse_args()

    cfg = load(Path(args.config).resolve())

    if args.cmd in ("collect", "all"):
        run_collect(cfg)
    if args.cmd in ("process", "all"):
        aggregate(cfg)
    if args.cmd in ("archive", "all"):
        archive_raw(cfg)


if __name__ == "__main__":
    main()

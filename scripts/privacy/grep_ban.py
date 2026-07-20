#!/usr/bin/env python3
"""Grep clean JSONL against privacy ban_list.txt. Exit 1 on any hit."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", type=Path, required=True)
    ap.add_argument("--ban-list", type=Path, required=True)
    args = ap.parse_args()

    bans = []
    for line in args.ban_list.read_text(encoding="utf-8").splitlines():
        # Keep trailing spaces: patterns like "variant " are deliberately
        # space-terminated so they match the template artifact "variant 3"
        # without matching ordinary words such as "variants".
        raw = line.rstrip("\r\n")
        s = raw.strip()
        if s and not s.startswith("#"):
            bans.append(raw)

    hits = 0
    for path in sorted(args.dir.glob("*.jsonl")):
        text = path.read_text(encoding="utf-8")
        low = text.lower()
        for b in bans:
            if b.lower() in low:
                print(f"HIT {path.name}: {b!r}")
                hits += 1
    if hits:
        print(f"FAILED: {hits} hit(s)")
        return 1
    print("OK: no ban-list hits")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

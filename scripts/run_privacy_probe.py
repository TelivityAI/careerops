#!/usr/bin/env python3
"""Run CareerOps privacy probes and score generations against the ban-list.

Probes live in ``eval/privacy_probes.jsonl`` (synthetic elicitation prompts —
never real PII). A probe **fails** if the model answer contains any ban-list
substring (case-insensitive).

How to run later (with a local / HF model)
-----------------------------------------
1. Ensure ``scripts/privacy/ban_list.txt`` is populated.
2. Implement ``generate_answer`` (see TODO below) or pass ``--answers-file``.
3. ::

       python scripts/run_privacy_probe.py \\
         --probes eval/privacy_probes.jsonl \\
         --ban-list scripts/privacy/ban_list.txt

       # Offline scoring of precomputed answers (JSONL: id, answer):
       python scripts/run_privacy_probe.py --answers-file answers.jsonl

Exit codes: 0 = all pass, 1 = one or more ban hits, 2 = setup error.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def load_ban_list(path: Path) -> list[str]:
    pats: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.rstrip("\r\n")
        s = raw.strip()
        if not s or s.startswith("#"):
            continue
        pats.append(raw)
    return pats


def load_probes(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if "id" not in obj or "prompt" not in obj:
                raise ValueError(f"{path}:{lineno}: need id and prompt")
            rows.append(obj)
    return rows


def score_answer(answer: str, bans: list[str]) -> list[str]:
    """Return list of ban-list patterns found in answer (fail if non-empty)."""
    low = (answer or "").lower()
    hits = []
    for b in bans:
        if b.lower() in low:
            hits.append(b)
    return hits


def generate_answer(prompt: str) -> str:
    """TODO: wire to local/HF model generation.

    Until a model is available, returns a safe stub that should pass scoring.
    Replace this function (or use ``--answers-file``) before gate.
    """
    # Stub: refuse identifiers — expected behavior for a clean model.
    _ = prompt
    return (
        "I do not have access to any private individual's personal identifiers "
        "from training. I only work with the facts you provide in the session."
    )


def load_answers_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    with path.open(encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if "id" not in obj or "answer" not in obj:
                raise ValueError(f"{path}:{lineno}: need id and answer")
            out[str(obj["id"])] = str(obj["answer"])
    return out


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    ap = argparse.ArgumentParser(
        description="Score privacy probe answers; fail on ban-list hits."
    )
    ap.add_argument(
        "--probes",
        type=Path,
        default=root / "eval" / "privacy_probes.jsonl",
    )
    ap.add_argument(
        "--ban-list",
        type=Path,
        default=root / "scripts" / "privacy" / "ban_list.txt",
    )
    ap.add_argument(
        "--answers-file",
        type=Path,
        default=None,
        help="Optional JSONL of {id, answer} to score instead of generate_answer()",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Optional path to write per-probe JSONL results",
    )
    args = ap.parse_args()

    if not args.probes.is_file():
        print(f"FAIL: missing probes {args.probes}", file=sys.stderr)
        return 2
    if not args.ban_list.is_file():
        print(f"FAIL: missing ban-list {args.ban_list}", file=sys.stderr)
        return 2

    probes = load_probes(args.probes)
    bans = load_ban_list(args.ban_list)
    answers = load_answers_file(args.answers_file) if args.answers_file else None

    if len(probes) != 10:
        print(f"warn: expected 10 probes, found {len(probes)}", file=sys.stderr)

    failures = 0
    results: list[dict] = []
    for p in probes:
        pid = str(p["id"])
        if answers is not None:
            if pid not in answers:
                print(f"FAIL {pid}: missing answer in answers-file")
                failures += 1
                continue
            answer = answers[pid]
        else:
            answer = generate_answer(p["prompt"])
        hits = score_answer(answer, bans)
        ok = not hits
        if not ok:
            failures += 1
            print(f"FAIL {pid} ({p.get('category')}): hits={hits!r}")
        else:
            print(f"PASS {pid} ({p.get('category')})")
        results.append(
            {
                "id": pid,
                "category": p.get("category"),
                "pass": ok,
                "hits": hits,
                "answer": answer,
            }
        )

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("w", encoding="utf-8") as f:
            for r in results:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    if failures:
        print(f"\nFAILED: {failures}/{len(probes)} probe(s) leaked ban-list content")
        return 1
    print(f"\nOK: {len(probes)}/{len(probes)} probes clean")
    if answers is None:
        print(
            "(used stub generate_answer — wire a real model before the public gate)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

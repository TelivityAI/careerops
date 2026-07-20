#!/usr/bin/env python3
"""Validate CareerOps clean SFT JSONL before train merge.

Checks: schema, generator_model vs task, quality_pass, counts, distinct rate,
ban-list grep, basic JSON assistant when required.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

EXPECTED = {
    "bullet_rewrite": (400, "sonnet-5"),
    "cover_open": (100, "sonnet-5"),
    "cover_proof": (100, "sonnet-5"),
    "cover_close": (100, "sonnet-5"),
    "resume_analysis": (200, "sonnet-5"),
    "board_triage": (200, "opus-4.8"),
    "prioritisation": (200, "opus-4.8"),
    "match_grading": (180, "opus-4.8"),
    "resume_summary": (150, "sonnet-5"),
    "jd_parsing": (130, "sonnet-5"),
    "bullet_select": (120, "sonnet-5"),
    "search_strategy": (110, "opus-4.8"),
    "app_operation": (110, "sonnet-5"),
    "stage_moves": (100, "opus-4.8"),
    "followups": (100, "opus-4.8"),
    "skills_filter": (80, "sonnet-5"),
}

SOFT_MAX_WORDS = {
    "bullet_rewrite": 60,
    "cover_open": 50,
    "cover_proof": 80,
    "cover_close": 40,
    "resume_analysis": 120,
    "resume_summary": 80,
}

JSON_TASKS = {"bullet_select", "skills_filter", "jd_parsing"}


def load_ban_list(path: Path) -> list[str]:
    pats: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        # Keep trailing spaces: patterns like "variant " are deliberately
        # space-terminated so they match the template artifact "variant 3"
        # without matching ordinary words such as "variants".
        raw = line.rstrip("\r\n")
        s = raw.strip()
        if not s or s.startswith("#"):
            continue
        pats.append(raw)
    return pats


def word_count(text: str) -> int:
    return len(re.findall(r"\S+", text))


def distinct_ratio(answers: list[str]) -> float:
    if not answers:
        return 1.0
    # first-12-token signature
    sigs = []
    for a in answers:
        toks = re.findall(r"\S+", a.lower())
        sigs.append(" ".join(toks[:12]))
    return len(set(sigs)) / len(sigs)


def validate_row(obj: dict, task: str, expected_model: str, bans: list[str]) -> list[str]:
    errs: list[str] = []
    if obj.get("task") != task:
        errs.append(f"task field {obj.get('task')!r} != file {task}")
    msgs = obj.get("messages")
    if not isinstance(msgs, list) or len(msgs) != 2:
        errs.append("messages must be length-2 list")
        return errs
    for i, role in enumerate(("user", "assistant")):
        m = msgs[i]
        if not isinstance(m, dict) or m.get("role") != role:
            errs.append(f"messages[{i}].role must be {role}")
        content = m.get("content") if isinstance(m, dict) else None
        if not isinstance(content, str) or not content.strip():
            errs.append(f"messages[{i}].content empty")
    meta = obj.get("metadata") or {}
    if meta.get("personal_data") is not False:
        errs.append("metadata.personal_data must be false")
    if meta.get("quality_pass") is not True:
        errs.append("metadata.quality_pass must be true")
    gm = meta.get("generator_model")
    if gm != expected_model:
        errs.append(f"generator_model {gm!r} != {expected_model}")
    blob = json.dumps(obj, ensure_ascii=False)
    for b in bans:
        if b.lower() in blob.lower():
            errs.append(f"ban-list hit: {b!r}")
    asst = msgs[1].get("content", "") if len(msgs) == 2 and isinstance(msgs[1], dict) else ""
    if task in SOFT_MAX_WORDS and word_count(asst) > SOFT_MAX_WORDS[task] * 1.5:
        errs.append(f"assistant overlength ({word_count(asst)} words)")
    if task in JSON_TASKS:
        try:
            json.loads(asst.strip().strip("`").removeprefix("json").strip())
        except Exception:
            # try raw
            try:
                json.loads(asst)
            except Exception:
                errs.append("assistant must be valid JSON for this task")
    for bad in ("[PLACEHOLDER]", "variant ", "nan", "None"):
        if bad in asst and bad in ("[PLACEHOLDER]", "variant "):
            errs.append(f"slop token {bad!r}")
    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data" / "clean",
    )
    ap.add_argument(
        "--ban-list",
        type=Path,
        default=Path(__file__).resolve().parent / "privacy" / "ban_list.txt",
    )
    ap.add_argument("--count-tolerance", type=float, default=0.02)
    ap.add_argument("--min-distinct", type=float, default=0.70)
    args = ap.parse_args()

    bans = load_ban_list(args.ban_list) if args.ban_list.exists() else []
    root = args.dir
    if not root.is_dir():
        print(f"FAIL: missing {root}", file=sys.stderr)
        return 2

    total_errs = 0
    generative_tasks = set(EXPECTED) - JSON_TASKS

    for task, (want, model) in EXPECTED.items():
        path = root / f"{task}.jsonl"
        if not path.exists():
            print(f"FAIL {task}: missing file")
            total_errs += 1
            continue
        answers: list[str] = []
        n = 0
        file_errs = 0
        with path.open(encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                n += 1
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as e:
                    print(f"FAIL {task}:{lineno}: bad json {e}")
                    file_errs += 1
                    continue
                errs = validate_row(obj, task, model, bans)
                if errs:
                    file_errs += 1
                    if file_errs <= 5:
                        print(f"FAIL {task}:{lineno}: {'; '.join(errs)}")
                asst = ""
                try:
                    asst = obj["messages"][1]["content"]
                except Exception:
                    pass
                answers.append(asst)
        lo = int(want * (1 - args.count_tolerance))
        hi = int(want * (1 + args.count_tolerance))
        if not (lo <= n <= hi):
            print(f"FAIL {task}: count {n} not in [{lo},{hi}] (want {want})")
            file_errs += 1
        else:
            print(f"OK   {task}: count {n}/{want}")
        if task in generative_tasks and answers:
            dr = distinct_ratio(answers)
            if dr < args.min_distinct:
                print(f"FAIL {task}: distinct_ratio {dr:.3f} < {args.min_distinct}")
                file_errs += 1
            else:
                print(f"OK   {task}: distinct_ratio {dr:.3f}")
        total_errs += file_errs

    if total_errs:
        print(f"\nFAILED with {total_errs} issue(s)")
        return 1
    print("\nALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

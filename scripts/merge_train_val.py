#!/usr/bin/env python3
"""Merge accepted task JSONL into train/val splits for CareerOps SFT.

Reads all accepted ``*.jsonl`` under ``data/clean/`` (skips ``_rejected/``),
strips each row to ``task`` + ``messages``, excludes rows that fail quality
gates when metadata is present, then writes a stratified ~3% validation split
by task.

Do **not** run this until the corpus is complete (all 16 task files + MANIFEST).
Use ``--dry-run`` to count only.

Example::

    python scripts/merge_train_val.py --dry-run
    python scripts/merge_train_val.py --dir data/clean --val-frac 0.03
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

# Training merge task list. `app_operation` stays on disk for operator reference
# but is intentionally excluded from the next train.
REQUIRED_TASKS = frozenset(
    {
        "bullet_rewrite",
        "cover_open",
        "cover_proof",
        "cover_close",
        "resume_analysis",
        "board_triage",
        "prioritisation",
        "match_grading",
        "resume_summary",
        "jd_parsing",
        "bullet_select",
        "search_strategy",
        "stage_moves",
        "followups",
        "skills_filter",
    }
)


def corpus_complete(clean_dir: Path) -> tuple[bool, list[str]]:
    """Return (ok, missing) for the train-eligible task JSONL files."""
    missing = [t for t in sorted(REQUIRED_TASKS) if not (clean_dir / f"{t}.jsonl").exists()]
    return (not missing, missing)


def row_accepted(obj: dict) -> bool:
    """Exclude rows without quality_pass / personal_data false when metadata present."""
    meta = obj.get("metadata")
    if meta is None:
        return True  # no metadata → keep (caller may have pre-validated)
    if not isinstance(meta, dict):
        return False
    if meta.get("quality_pass") is not True:
        return False
    if meta.get("personal_data") is not False:
        return False
    return True


def load_accepted(clean_dir: Path) -> dict[str, list[dict]]:
    """Load accepted rows grouped by task. Skips _rejected/ and non-task files."""
    by_task: dict[str, list[dict]] = defaultdict(list)
    for path in sorted(clean_dir.glob("*.jsonl")):
        if path.parent.name == "_rejected":
            continue
        task_name = path.stem
        if task_name not in REQUIRED_TASKS:
            print(f"skip non-task file: {path.name}", file=sys.stderr)
            continue
        with path.open(encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as e:
                    print(f"warn {path.name}:{lineno}: {e}", file=sys.stderr)
                    continue
                if not row_accepted(obj):
                    continue
                task = obj.get("task") or task_name
                msgs = obj.get("messages")
                if not isinstance(msgs, list):
                    continue
                by_task[str(task)].append({"task": str(task), "messages": msgs})
    return dict(by_task)


def stratified_split(
    by_task: dict[str, list[dict]],
    val_frac: float,
    seed: int,
) -> tuple[list[dict], list[dict]]:
    """~val_frac validation per task (at least 1 val row if task has ≥2 and frac>0)."""
    rng = random.Random(seed)
    train: list[dict] = []
    val: list[dict] = []
    for task, rows in sorted(by_task.items()):
        rows = list(rows)
        rng.shuffle(rows)
        n = len(rows)
        if n == 0:
            continue
        n_val = int(round(n * val_frac))
        if val_frac > 0 and n >= 2:
            n_val = max(1, min(n_val, n - 1))
        else:
            n_val = 0
        val.extend(rows[:n_val])
        train.extend(rows[n_val:])
        print(f"  {task}: {n} accepted → train {n - n_val}, val {n_val}")
    rng.shuffle(train)
    rng.shuffle(val)
    return train, val


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Merge clean task JSONL → careerops_train.jsonl + careerops_val.jsonl"
    )
    ap.add_argument(
        "--dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "clean",
        help="Directory of accepted task JSONL (default: data/clean)",
    )
    ap.add_argument(
        "--out-train",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "careerops_train.jsonl",
    )
    ap.add_argument(
        "--out-val",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "careerops_val.jsonl",
    )
    ap.add_argument("--val-frac", type=float, default=0.03, help="Val fraction per task")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Count accepted rows only; do not write outputs",
    )
    ap.add_argument(
        "--allow-incomplete",
        action="store_true",
        help="Merge even if some required task files are missing (not recommended)",
    )
    args = ap.parse_args()

    clean_dir = args.dir
    if not clean_dir.is_dir():
        print(f"FAIL: missing {clean_dir}", file=sys.stderr)
        return 2

    ok, missing = corpus_complete(clean_dir)
    if not ok:
        print(f"Corpus incomplete — missing: {', '.join(missing)}", file=sys.stderr)
        manifest = clean_dir / "MANIFEST.md"
        if not manifest.exists() and not (clean_dir / "MANIFEST.json").exists():
            print("Also missing MANIFEST (md/json).", file=sys.stderr)
        if not args.allow_incomplete:
            print(
                "Refusing to merge. Re-run after corpus is complete, "
                "or pass --allow-incomplete / --dry-run.",
                file=sys.stderr,
            )
            if args.dry_run:
                by_task = load_accepted(clean_dir)
                total = sum(len(v) for v in by_task.values())
                print(f"dry-run partial: {len(by_task)} tasks, {total} accepted rows")
                for t, rows in sorted(by_task.items()):
                    print(f"  {t}: {len(rows)}")
                return 0
            return 2

    by_task = load_accepted(clean_dir)
    total = sum(len(v) for v in by_task.values())
    print(f"Accepted rows: {total} across {len(by_task)} tasks")
    train, val = stratified_split(by_task, args.val_frac, args.seed)
    print(f"Split: train={len(train)} val={len(val)}")

    if args.dry_run:
        print("dry-run: not writing files")
        return 0

    write_jsonl(args.out_train, train)
    write_jsonl(args.out_val, val)
    print(f"Wrote {args.out_train}")
    print(f"Wrote {args.out_val}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

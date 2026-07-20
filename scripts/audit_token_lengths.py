#!/usr/bin/env python3
"""Length-audit match_grading (and optionally all clean JSONL) with a real tokenizer.

chars/3.5 undercounts JSON-heavy rows. Fail any row that would truncate under
train max_length (default 768) when tokenized like training (system + messages).

Usage:
  python scripts/audit_token_lengths.py --dir data/clean --task match_grading
  python scripts/audit_token_lengths.py --dir data/clean --task match_grading \\
      --tokenizer google/gemma-4-E2B-it --hf-token-file ~/.hf_token
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SYSTEM = (
    "You are the CareerOps assistant. You run a person's job search end to end: you grade how well they fit a role, "
    "write tailored résumés and cover letters from their real experience only, parse job postings, keep their board "
    "organised, decide what they should work on today, chase follow-ups, and explain how CareerOps works. "
    "Never invent employers, titles, dates, metrics or skills. Be concise, specific and practical."
)


def load_rows(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", type=Path, default=Path("data/clean"))
    ap.add_argument("--task", default="match_grading")
    ap.add_argument("--max-length", type=int, default=768)
    ap.add_argument("--tokenizer", default="google/gemma-4-E2B-it")
    ap.add_argument("--hf-token-file", type=Path, default=Path.home() / ".hf_token")
    ap.add_argument("--chars-div", type=float, default=3.5, help="fallback estimate only")
    args = ap.parse_args()

    path = args.dir / f"{args.task}.jsonl"
    if not path.exists():
        print(f"FAIL: missing {path}", file=sys.stderr)
        return 2

    rows = load_rows(path)
    token = None
    if args.hf_token_file.is_file():
        token = args.hf_token_file.read_bytes().decode("utf-8").rstrip("\n").strip()

    try:
        from transformers import AutoTokenizer

        tok = AutoTokenizer.from_pretrained(args.tokenizer, token=token)
    except Exception as e:
        print(f"WARN: cannot load tokenizer ({type(e).__name__}: {e}); using chars/{args.chars_div} only")
        tok = None

    lengths: list[int] = []
    fails: list[tuple[int, int, int]] = []  # idx, true_len, approx

    for i, row in enumerate(rows):
        msgs = [{"role": "system", "content": SYSTEM}] + row["messages"]
        blob = "".join(m.get("content", "") for m in row["messages"])
        approx = int(len(blob) / args.chars_div + 0.999)

        if tok is not None:
            try:
                # Gemma returns BatchEncoding when tokenize=True; length of that object is wrong.
                text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=False)
                n = len(tok(text, add_special_tokens=False)["input_ids"])
            except Exception as e:
                print(f"WARN row {i}: tokenize failed ({e}); using chars/{args.chars_div}")
                n = approx
        else:
            n = approx

        lengths.append(n)
        if n > args.max_length:
            fails.append((i, n, approx))

    lengths.sort()
    def pct(p: float) -> int:
        if not lengths:
            return 0
        return lengths[min(len(lengths) - 1, int(p * (len(lengths) - 1)))]

    print(f"task={args.task} rows={len(rows)} max_length={args.max_length} tokenizer={'yes' if tok else 'chars/' + str(args.chars_div)}")
    print(f"p50={pct(0.5)} p90={pct(0.9)} p99={pct(0.99)} max={lengths[-1] if lengths else 0}")
    print(f"over_max={len(fails)}")
    for idx, n, approx in fails[:20]:
        print(f"  FAIL row {idx}: tokens={n} approx_chars_div={approx}")
    if len(fails) > 20:
        print(f"  ... and {len(fails) - 20} more")

    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())

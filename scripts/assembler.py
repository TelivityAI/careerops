#!/usr/bin/env python3
"""CareerOps resume/cover assembler — stitches model outputs; never invents facts.

The CareerOps writing pipeline is decomposed. Models emit short pieces; this
module only joins them. No network, no HF token.

Resume path
-----------
1. bullet_select → JSON list of bullet IDs (e.g. ``[4, 8, 6]``)
2. Resolve each ID against a master bullet map (code lookup only)
3. Optional rewrites: map id → rewritten text from bullet_rewrite calls
4. resume_summary → plain summary paragraph(s)
5. skills_filter → JSON list of skill strings
6. ``assemble_resume`` → tailored résumé text

Cover path
----------
``assemble_cover(open, proof, close)`` joins three short pieces with blank lines.

CLI examples
------------
::

    # Resume from JSON files (select IDs, master bullets, summary, skills)
    python scripts/assembler.py resume \\
      --select '[4, 8, 6]' \\
      --bullets bullets.json \\
      --rewrites rewrites.json \\
      --summary summary.txt \\
      --skills '["SQL", "Snowflake"]'

    # Cover letter from three piece files
    python scripts/assembler.py cover \\
      --open open.txt --proof proof.txt --close close.txt

    python scripts/assembler.py --help
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence


def _parse_json_list(raw: str) -> list[Any]:
    """Parse a JSON array from a string or file path."""
    text = raw.strip()
    path = Path(text)
    if path.is_file():
        text = path.read_text(encoding="utf-8").strip()
    # Strip optional markdown fences
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        if lines and lines[0].strip().lower() == "json":
            lines = lines[1:]
        text = "\n".join(lines).strip()
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError(f"expected JSON array, got {type(data).__name__}")
    return data


def _load_text(raw: str) -> str:
    path = Path(raw)
    if path.is_file():
        return path.read_text(encoding="utf-8").strip()
    return raw.strip()


def _load_mapping(raw: str) -> dict[str, str]:
    """Load id→text map from JSON object or JSONL of {id, text}."""
    path = Path(raw)
    if not path.is_file():
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("inline bullets/rewrites must be a JSON object")
        return {str(k): str(v) for k, v in data.items()}

    text = path.read_text(encoding="utf-8").strip()
    if path.suffix == ".jsonl":
        out: dict[str, str] = {}
        for lineno, line in enumerate(text.splitlines(), 1):
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if "id" not in obj or "text" not in obj:
                raise ValueError(f"{path}:{lineno}: need id and text fields")
            out[str(obj["id"])] = str(obj["text"])
        return out

    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError(f"{path}: expected JSON object of id→text")
    return {str(k): str(v) for k, v in data.items()}


def resolve_bullets(
    selected_ids: Sequence[Any],
    master_bullets: Mapping[str, str],
    rewrites: Mapping[str, str] | None = None,
) -> list[str]:
    """Resolve selected IDs to bullet text. Prefer rewrite when present.

    Raises KeyError if an ID is missing from master_bullets (no invention).
    """
    rewrites = rewrites or {}
    lines: list[str] = []
    for raw_id in selected_ids:
        key = str(raw_id)
        if key not in master_bullets:
            raise KeyError(
                f"bullet id {key!r} not in master map — assembler will not invent"
            )
        lines.append(rewrites.get(key, master_bullets[key]))
    return lines


def assemble_resume(
    *,
    selected_ids: Sequence[Any],
    master_bullets: Mapping[str, str],
    summary: str,
    skills: Sequence[str],
    rewrites: Mapping[str, str] | None = None,
    experience_heading: str = "Experience",
    skills_heading: str = "Skills",
    summary_heading: str = "Summary",
) -> str:
    """Stitch summary + selected (optionally rewritten) bullets + skills.

    Facts come only from ``master_bullets``, ``rewrites``, ``summary``, and
    ``skills``. Missing IDs raise; empty summary/skills are omitted as sections.
    """
    bullets = resolve_bullets(selected_ids, master_bullets, rewrites)
    parts: list[str] = []

    summary = (summary or "").strip()
    if summary:
        parts.append(f"{summary_heading}\n{summary}")

    if bullets:
        body = "\n".join(f"• {b.strip()}" for b in bullets if b.strip())
        if body:
            parts.append(f"{experience_heading}\n{body}")

    skill_list = [str(s).strip() for s in skills if str(s).strip()]
    if skill_list:
        parts.append(f"{skills_heading}\n{', '.join(skill_list)}")

    return "\n\n".join(parts).strip() + ("\n" if parts else "")


def assemble_cover(cover_open: str, cover_proof: str, cover_close: str) -> str:
    """Join cover_open + cover_proof + cover_close with blank lines between."""
    pieces = [
        (cover_open or "").strip(),
        (cover_proof or "").strip(),
        (cover_close or "").strip(),
    ]
    missing = [n for n, p in zip(("open", "proof", "close"), pieces) if not p]
    if missing:
        raise ValueError(f"cover pieces must be non-empty: missing {missing}")
    return "\n\n".join(pieces) + "\n"


def _cmd_resume(args: argparse.Namespace) -> int:
    selected = _parse_json_list(args.select)
    master = _load_mapping(args.bullets)
    rewrites = _load_mapping(args.rewrites) if args.rewrites else None
    summary = _load_text(args.summary) if args.summary else ""
    skills = _parse_json_list(args.skills) if args.skills else []
    skills = [str(s) for s in skills]

    text = assemble_resume(
        selected_ids=selected,
        master_bullets=master,
        summary=summary,
        skills=skills,
        rewrites=rewrites,
    )
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)
    return 0


def _cmd_cover(args: argparse.Namespace) -> int:
    text = assemble_cover(
        _load_text(args.open),
        _load_text(args.proof),
        _load_text(args.close),
    )
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)
    return 0


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="assembler.py",
        description=(
            "Assemble tailored résumé / cover letter text from decomposed "
            "CareerOps model outputs. Stitches only — never invents facts."
        ),
        epilog=(
            "Examples:\n"
            "  python scripts/assembler.py resume --select '[1,2]' "
            "--bullets bullets.json --summary s.txt --skills '[\"SQL\"]'\n"
            "  python scripts/assembler.py cover --open o.txt --proof p.txt "
            "--close c.txt\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = ap.add_subparsers(dest="command", required=True)

    rp = sub.add_parser("resume", help="Assemble résumé from select/summary/skills")
    rp.add_argument(
        "--select",
        required=True,
        help="JSON array of bullet IDs, or path to a file containing that JSON",
    )
    rp.add_argument(
        "--bullets",
        required=True,
        help="Master bullets: JSON object id→text, or JSONL with id/text fields",
    )
    rp.add_argument(
        "--rewrites",
        default=None,
        help="Optional rewrite map (same formats as --bullets); overrides master text",
    )
    rp.add_argument(
        "--summary",
        default=None,
        help="resume_summary text, or path to a text file",
    )
    rp.add_argument(
        "--skills",
        default=None,
        help="JSON array of skill strings from skills_filter, or path to that JSON",
    )
    rp.add_argument("--out", default=None, help="Write to file instead of stdout")
    rp.set_defaults(func=_cmd_resume)

    cp = sub.add_parser("cover", help="Assemble cover from open/proof/close")
    cp.add_argument("--open", required=True, help="cover_open text or file path")
    cp.add_argument("--proof", required=True, help="cover_proof text or file path")
    cp.add_argument("--close", required=True, help="cover_close text or file path")
    cp.add_argument("--out", default=None, help="Write to file instead of stdout")
    cp.set_defaults(func=_cmd_cover)

    return ap


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except (json.JSONDecodeError, ValueError, KeyError, OSError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

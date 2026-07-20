#!/usr/bin/env python3
"""CLI entry for résumé assembly. See ``assembler.py`` for full docs and cover path.

Example::

    python scripts/assemble_resume.py \\
      --select '[4, 8, 6]' \\
      --bullets bullets.json \\
      --summary summary.txt \\
      --skills '["SQL", "Snowflake"]'
"""
from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from assembler import main as assembler_main  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] in ("-h", "--help"):
        return assembler_main(["resume", "--help"])
    if not argv or argv[0] not in ("resume", "cover"):
        argv = ["resume", *argv]
    return assembler_main(argv)


if __name__ == "__main__":
    raise SystemExit(main())

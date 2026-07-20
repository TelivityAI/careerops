#!/usr/bin/env python3
"""CLI entry for cover-letter assembly. See ``assembler.py`` for full docs.

Example::

    python scripts/assemble_cover.py \\
      --open open.txt --proof proof.txt --close close.txt
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
    if not argv or argv[0] in ("-h", "--help"):
        return assembler_main(["cover", "--help"])
    if argv[0] != "cover":
        argv = ["cover", *argv]
    return assembler_main(argv)


if __name__ == "__main__":
    raise SystemExit(main())

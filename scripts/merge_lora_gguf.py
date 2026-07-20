#!/usr/bin/env python3
"""Prep-only: merge LoRA adapter into base and document GGUF export.

Do NOT run until quality gates pass (val loss, side-by-side, privacy probe).
Does not flip any HF/GitHub visibility.

Usage (after gates):
    export HF_TOKEN=$(cat ~/.hf_token)   # never commit
    python scripts/merge_lora_gguf.py --dry-run
    python scripts/merge_lora_gguf.py --out /tmp/CareerOps-4B-merged

GGUF: use llama.cpp convert after merge (exact flags depend on Gemma 4 support
in the llama.cpp build you have). This script only merges PEFT → full weights.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


BASE = "google/gemma-4-E2B-it"
ADAPTER = "telivity/CareerOps-4B"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default=BASE)
    p.add_argument("--adapter", default=ADAPTER)
    p.add_argument("--out", type=Path, default=Path("/tmp/CareerOps-4B-merged"))
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    tok = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if not tok:
        local = Path.home() / ".hf_token"
        if local.is_file():
            tok = local.read_text(encoding="utf-8").strip()
    if not tok:
        print("HF_TOKEN missing (env or ~/.hf_token)", file=sys.stderr)
        return 2

    print(f"base={args.base}")
    print(f"adapter={args.adapter}")
    print(f"out={args.out}")
    if args.dry_run:
        print("dry-run OK — would merge_and_unload then save_pretrained")
        print("GGUF: convert merged dir with llama.cpp after gates pass")
        return 0

    # Heavy imports only when actually merging
    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    print("loading base…", flush=True)
    tok_m = AutoTokenizer.from_pretrained(args.base, token=tok)
    model = AutoModelForCausalLM.from_pretrained(
        args.base, torch_dtype=torch.float16, device_map="cpu", token=tok
    )
    print("loading adapter…", flush=True)
    model = PeftModel.from_pretrained(model, args.adapter, token=tok)
    print("merge_and_unload…", flush=True)
    model = model.merge_and_unload()
    args.out.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(args.out)
    tok_m.save_pretrained(args.out)
    print(f"merged weights -> {args.out}", flush=True)
    print("Next: convert to GGUF with a Gemma4-capable llama.cpp build.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

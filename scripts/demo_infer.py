#!/usr/bin/env python3
"""Local smoke demo: base Gemma 4 E2B-it + CareerOps-4B QLoRA adapter.

Requires a Hugging Face token with access to the base model and adapter:

    export HF_TOKEN=hf_...
    pip install -r requirements-infer.txt
    python scripts/demo_infer.py --demo board

GPU with ~12–16 GB VRAM recommended (4-bit). CPU will load but is very slow.
"""
from __future__ import annotations

import argparse
import os
import sys

BASE_DEFAULT = "google/gemma-4-E2B-it"
ADAPTER_DEFAULT = "telivity/CareerOps-4B"

SYSTEM = (
    "You are the CareerOps assistant. You run a person's job search end to end: you grade how well they fit a role, "
    "write tailored résumés and cover letters from their real experience only, parse job postings, keep their board "
    "organised, decide what they should work on today, chase follow-ups, and explain how CareerOps works. "
    "Never invent employers, titles, dates, metrics or skills. Be concise, specific and practical."
)

# Held-out prompts that scored PASS / strong in eval/reports (not FAIL tasks).
DEMOS: dict[str, str] = {
    "board": (
        "quick one — I open this board every morning and do nothing. break the tie for me.\n\n"
        "Halvard & Pike / Senior Manager, Digital Merchandising / interview / A / 92% / 2 days / low / docs yes\n"
        "Wickham Row / Director of E-commerce Operations / conversation / A- / 83% / 8 days / low / docs no\n"
        "Northmarch Consumer Brands / Category Manager, Marketplace / applied / B+ / 75% / 24 days / medium / docs yes\n"
        "Bellrose Outfitters / Retail Operations Analyst / sourced / C / 49% / 30 days / high / docs no"
    ),
    "json": (
        "Extract company, title, seniority, location, and requirements from this JD as raw JSON. "
        "Nothing else in your reply.\n\n"
        "Careers / All Jobs / Search Results\n\n"
        "Junipero Parcel is hiring: Vice President, Last-Mile Delivery\n"
        "Location: Philadelphia, PA — Hybrid, 3 days on-site\n"
        "Level: Vice president\n\n"
        "Requirements: Owned a nine-figure operating budget with accountability for cost per stop "
        "or equivalent unit economics. Peak season planning at volumes that double or more. "
        "You have expanded a delivery network into new metros and know what breakeven density actually costs.\n\n"
        "This description is a summary and may not include every duty."
    ),
    "rewrite": (
        'Applying to Vermilion Trail Journeys for Operations Manager, Guided Travel. '
        "JD wants a per-passenger land cost built and defended line by line. My current bullet: "
        '"Cut per-passenger land cost 12% by renegotiating 31 supplier contracts and consolidating '
        'three ground handlers into one." Make it land better for this one.'
    ),
    "grade": (
        'Grade this candidate against this role. Return ONLY JSON, no other text: '
        '{"score":int,"summary":"...","strengths":[...],"gaps":[...]}\n\n'
        "ROLE: Steadmoor Distribution - Continuous Improvement Analyst, Network Operations "
        "(Senior individual contributor; parcel carrier, nine cross-dock facilities and a contracted delivery fleet)\n"
        "NEEDS: four or more years in logistics or supply chain analytics; SQL and a BI tool, Power BI; "
        "process improvement method, root cause discipline or DMAIC; warehouse throughput or route-level "
        "delivery economics; be in facilities rather than modelling from a desk; findings become standard "
        "work for other sites; Green Belt a plus\n"
        "CANDIDATE: Jared Whitlock - Store Operations Lead, Charlotte, NC.\n"
        "- Taught himself SQL; built a Tableau dashboard covering 11 stores\n"
        "- Wrote the district's holiday staffing playbook, used by 11 stores\n"
        "- Spends his time in the operation, not behind a desk\n"
        "SKILLS: SQL, Tableau, process documentation"
    ),
}


def _token() -> str | None:
    tok = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if tok and len(tok.strip()) > 10:
        return tok.strip()
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--demo",
        choices=sorted(DEMOS),
        default="board",
        help="Built-in held-out demo prompt (default: board)",
    )
    ap.add_argument("--prompt", default=None, help="Custom user prompt (overrides --demo)")
    ap.add_argument("--base", default=BASE_DEFAULT)
    ap.add_argument("--adapter", default=ADAPTER_DEFAULT)
    ap.add_argument("--max-new-tokens", type=int, default=256)
    ap.add_argument(
        "--no-4bit",
        action="store_true",
        help="Disable BitsAndBytes 4-bit (needs more VRAM)",
    )
    args = ap.parse_args()

    token = _token()
    if not token:
        print(
            "HF_TOKEN (or HUGGING_FACE_HUB_TOKEN) is required to download "
            f"{args.base} and {args.adapter}.\n"
            "  export HF_TOKEN=hf_...",
            file=sys.stderr,
        )
        return 2

    user = args.prompt if args.prompt is not None else DEMOS[args.demo]
    print(f"base={args.base}\nadapter={args.adapter}\ndemo={args.demo if args.prompt is None else 'custom'}", flush=True)

    import torch
    from peft import PeftModel
    from transformers import AutoConfig, AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

    use_cuda = torch.cuda.is_available()
    if not use_cuda:
        print("warning: no CUDA — inference will be very slow", file=sys.stderr)

    tok = AutoTokenizer.from_pretrained(args.base, token=token)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    cfg = AutoConfig.from_pretrained(args.base, token=token)
    for holder in (
        cfg,
        getattr(cfg, "text_config", None),
        getattr(cfg, "vision_config", None),
        getattr(cfg, "audio_config", None),
    ):
        if holder is not None and hasattr(holder, "dtype"):
            holder.dtype = "float16"
        if holder is not None and hasattr(holder, "torch_dtype"):
            holder.torch_dtype = "float16"

    load_kw: dict = {
        "config": cfg,
        "token": token,
        "dtype": torch.float16 if use_cuda else torch.float32,
    }
    if use_cuda and not args.no_4bit:
        load_kw["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )
        load_kw["device_map"] = {"": 0}
    elif use_cuda:
        load_kw["device_map"] = {"": 0}

    print("loading base…", flush=True)
    model = AutoModelForCausalLM.from_pretrained(args.base, **load_kw)
    print("loading adapter…", flush=True)
    model = PeftModel.from_pretrained(model, args.adapter, token=token)
    model.eval()

    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user},
    ]
    prompt = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tok(prompt, return_tensors="pt")
    if use_cuda:
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

    print("\n--- prompt ---\n" + user + "\n\n--- generation ---\n", flush=True)
    with torch.inference_mode():
        out = model.generate(
            **inputs,
            max_new_tokens=args.max_new_tokens,
            do_sample=False,
            pad_token_id=tok.pad_token_id,
        )
    new_tokens = out[0, inputs["input_ids"].shape[-1] :]
    text = tok.decode(new_tokens, skip_special_tokens=True).strip()
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

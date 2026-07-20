# CareerOps

Open home for the CareerOps clean SFT corpus, train kernels, eval, assembler, and launch docs.

**Product:** [CareerOps](https://careerops.telivity.app) — board/ops for a job search, plus a **decomposed writing pipeline** (select → rewrite → summary → skills → code assemble; cover open/proof/close → assemble). Not a one-shot “write my whole résumé” fantasy model.

**App:** https://careerops.telivity.app  
**Model:** [`telivity/CareerOps-4B`](https://huggingface.co/telivity/CareerOps-4B) (PEFT adapter + Q4_K_M GGUF)  
**Base:** `google/gemma-4-E2B-it`

## What the model is for

- **Board / ops:** triage, prioritisation, match grading, stage moves, follow-ups, search strategy, app operation, JD parsing.
- **Short writing tasks:** bullet select/rewrite, résumé summary, skills filter, cover open/proof/close — stitched by [`scripts/assembler.py`](scripts/assembler.py), which never invents facts.
- Training targets those short tasks and board skills. Long one-shot tailored résumés/cover letters are **not** gold labels.

## Quick start (local)

1. Pull GGUF `CareerOps-4B-Q4_K_M.gguf` (or the PEFT adapter) from Hugging Face.
2. Point a local llama.cpp / compatible runtime at the GGUF, or load adapter on the Gemma 4 E2B-it base.
3. Or use the hosted app: https://careerops.telivity.app

## Repo layout

| Path | Role |
|------|------|
| `data/clean/` | Per-task JSONL + generation docs (PERSONAS, JD_BANK, rules, quality report) |
| `kernel/` | Kaggle train (`train_ddp.py`) + launcher notebook / metadata |
| `scripts/` | Validators, privacy grep, assembler, merge train/val, privacy probe, GGUF merge prep |
| `eval/` | Privacy probes + quality-gate reports |
| `docs/` | Kaggle / ops notes + launch post draft |

## Quality gate (clean public run)

- Val loss: base **4.49** → CareerOps-4B **1.68** (held-out)
- Privacy probes: **10/10** clean against ban-list
- Side-by-sides: see `eval/reports/eval_report.md`

## Secrets

- Local HF token: **`~/.hf_token` only** — never commit tokens, `.env`, or Kaggle JSON.
- Kaggle: prefer private `careerops-runtime-auth` dataset with `hf_token` file; optional secret label **`HF_TOKEN`**.

## Training notes (Kaggle)

- Force **T4×2**, not P100. Use **`torchrun`**, not `notebook_launcher`.
- Clean numerics: `bnb_4bit_compute_dtype=float32`, `fp16=False`, `max_length=768`, packing off.
- ~2,380 clean synthetic rows → ~289 optimizer steps on T4×2.

## LocalLLaMA-safe claims

Honest scope only: useful board/ops + pipeline writing on **synthetic** clean data. No claim of a personal résumé memorizer. Weights were never trained on a private person's real board/master résumé for this public release.

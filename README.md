# CareerOps

Private home for the CareerOps clean SFT corpus, train kernels, eval, and launch docs.

**Product:** [CareerOps](https://careerops.telivity.app) — board/ops for a job search, plus a **decomposed writing pipeline** (select → rewrite → summary → skills → code assemble; cover open/proof/close → assemble). Not a one-shot “write my whole résumé” fantasy model.

**App:** https://careerops.telivity.app  
**Model (after gate):** `telivity/CareerOps-4B` on Hugging Face  
**Status:** **private** until privacy and quality gates pass. Do not treat this repo or any weights as public yet.

## What the model is for

- **Board / ops:** triage, prioritisation, match grading, stage moves, follow-ups, search strategy, app operation, JD parsing.
- **Short writing tasks:** bullet select/rewrite, résumé summary, skills filter, cover open/proof/close — stitched by `scripts/assembler.py`, which never invents facts.
- Training targets those short tasks and board skills. Long one-shot tailored résumés/cover letters are **not** gold labels.

## Repo layout

| Path | Role |
|------|------|
| `data/clean/` | Per-task JSONL + generation docs (PERSONAS, JD_BANK, rules, quality report) |
| `kernel/` | Kaggle train (`train_ddp.py`) + eval scripts / metadata |
| `scripts/` | Validators, privacy grep, assembler, merge train/val, privacy probe runner |
| `eval/` | Privacy probes and later eval artifacts |
| `docs/` | Kaggle / ops notes |

## Secrets

- Local HF token: **`~/.hf_token` only** — never commit tokens, `.env`, or Kaggle JSON.
- Kaggle: secret label must be exactly **`HF_TOKEN`**. Attach secrets **after** kernel push; push does not carry secrets.

## Generation (corpus)

- Judgment / structured ops rows: **Opus 4.8**
- Prose / short writing rows: **Sonnet 5**
- **AWS abandoned** — no Bedrock path for this clean run.

## Training notes (Kaggle)

- Force **T4×2**, not P100. Use **`torchrun`**, not `notebook_launcher`.
- Clean numerics: `bnb_4bit_compute_dtype=float32`, `fp16=False`, `max_length=768` (E2B + T4×2). Long `match_grading` must be regenerated per `docs/MATCH_GRADING_REGEN.md` — do **not** raise to 2048 to paper over length.
- Contaminated `telivity/careerops-4b` was deleted; clean publish name is **`telivity/CareerOps-4B`**.

## LocalLLaMA-safe claims

Honest scope only: useful board/ops + pipeline writing on **synthetic** clean data. No claim of a personal résumé memorizer. Public HF/GitHub only after privacy probes and quality gates are green.

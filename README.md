# CareerOps

Private home for the CareerOps clean SFT corpus, train kernels, eval, and launch docs.

**Product:** [CareerOps](https://careerops.telivity.app) — board/ops for a job search, plus a **decomposed writing pipeline** (select → rewrite → summary → skills → code assemble; cover open/proof/close → assemble). Not a one-shot “write my whole résumé” fantasy model.

**App:** https://careerops.telivity.app  
**Model (private):** [`telivity/CareerOps-4B`](https://huggingface.co/telivity/CareerOps-4B) — QLoRA adapter on Gemma 4 E2B-it  
**Status:** **private.** Quality + privacy gates are green. Do **not** flip GitHub/HF public without explicit approval.

## Gates (private, 2026-07-20)

| Check | Result |
|-------|--------|
| Train | 289/289 steps, mean train loss ≈ **0.96**, T4×2 DDP |
| Val loss | tuned **1.677** vs base **4.489** (−62.6%) |
| Side-by-side | 20 held-out examples in `eval/reports/eval_report.md` |
| Privacy probes | **10/10 PASS** — ban-list clean on adapter |

Corpus: **2,380** clean rows (2310 train / 70 val). No personal CareerOps history in training data.

## What the model is for

- **Board / ops:** triage, prioritisation, match grading, stage moves, follow-ups, search strategy, app operation, JD parsing.
- **Short writing tasks:** bullet select/rewrite, résumé summary, skills filter, cover open/proof/close — stitched by `scripts/assembler.py`, which never invents facts.
- Training targets those short tasks and board skills. Long one-shot tailored résumés/cover letters are **not** gold labels.

## Repo layout

| Path | Role |
|------|------|
| `data/clean/` | Per-task JSONL + generation docs (PERSONAS, JD_BANK, rules, quality report) |
| `kernel/` | Kaggle train (`train_ddp.py`) + eval / merge scripts + metadata |
| `scripts/` | Validators, privacy grep, assembler, merge train/val, merge LoRA, privacy probes |
| `eval/reports/` | Val loss, side-by-sides, privacy probe outputs |
| `docs/` | Kaggle / ops notes + launch post **draft** |

## Secrets

- Local HF token: **`~/.hf_token` only** — never commit tokens, `.env`, or Kaggle JSON.
- Kaggle runtime auth: private dataset `dusanmilicevic/careerops-runtime-auth` (`hf_token` file). Account Secrets labeled `HF_TOKEN` also work but **`kernels push` wipes secret attachments**.

## Generation (corpus)

- Judgment / structured ops rows: **Opus 4.8**
- Prose / short writing rows: **Sonnet 5**
- **AWS abandoned** — no Bedrock path for this clean run.

## Training notes (Kaggle)

- Force **T4×2**, not P100. Use **`torchrun`**, not `notebook_launcher`.
- Clean numerics: `bnb_4bit_compute_dtype=float32`, `fp16=False`, `max_length=768` (E2B + T4×2). Do **not** raise to 2048.
- Contaminated `telivity/careerops-4b` was deleted; clean publish name is **`telivity/CareerOps-4B`**.

## LocalLLaMA-safe claims

Honest scope only: useful board/ops + pipeline writing on **synthetic** clean data. No claim of a personal résumé memorizer. Public HF/GitHub only after **your** approval — gates being green is not automatic permission to open.

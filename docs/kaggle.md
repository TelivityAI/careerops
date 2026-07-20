# Kaggle training / eval notes

## Training kernel

Metadata: `kernel/kernel-metadata.json` (private, GPU + internet enabled).
Live kernel id: `dusanmilicevic/careerops-4b-training`.

### Must-dos

1. **Force T4×2 — never P100.** BitsAndBytes 4-bit on P100 is a known failure path for this stack. In the Kaggle UI, set accelerator to **GPU T4 x2** before running.
2. **Auth via private dataset (preferred).** Attach `dusanmilicevic/careerops-runtime-auth` (file `hf_token`). `train_ddp.py` / `eval.py` resolve token as: env → Kaggle secret `HF_TOKEN` → `/kaggle/input/**/hf_token`. Never commit the token file.
3. **`kaggle kernels push` wipes secret attachments.** Prefer the private auth dataset so re-push does not brick auth. Optional UI secret label remains `HF_TOKEN` if used.
4. **Launch with `torchrun`, not `notebook_launcher`.** CUDA must not be initialized in the parent notebook process. The train script is designed to run under `torchrun` in a separate process (see comments at top of `kernel/train_ddp.py`).

### Clean train config (locked)

- 2 GPUs × batch 2 × accum 2, LR `1e-4`, cosine, warmup 30, `max_grad_norm` 0.3
- `bnb_4bit_compute_dtype=torch.float32`, **`fp16=False`**, **`bf16=False`** (fp16 AMP + GradScaler was a bf16 unscale failure mode; do **not** register dtype-changing grad hooks)
- `max_length=768` — E2B + T4×2 locked. `match_grading` must be regenerated to ≤~700 tokens (`docs/MATCH_GRADING_REGEN.md`). Do **not** raise to 2048; do **not** naive-trim JDs.
- `packing=False`, gradient checkpointing with `use_reentrant=False`
- HF push target: **`telivity/CareerOps-4B`** (private). Contaminated `telivity/careerops-4b` was deleted — do not continue from it.
- Progress milestones: `progress.json` on the HF repo during train.

### Dataset sources (kernel-metadata)

- `dusanmilicevic/careerops-clean-train` — train/val JSONL + `train_ddp.py`
- `dusanmilicevic/careerops-runtime-auth` — private `hf_token` file only

### Rough sizing

~2,380 clean rows after MG regen. Force T4×2. Watch step time / VRAM on smoke.

## Eval kernel

Metadata: `evalkernel/kernel-metadata.json` (also private, GPU + internet).

Same auth pattern as train: attach **`careerops-runtime-auth`** + clean val JSONL dataset. Single GPU T4 is enough for inference. Adapter/OUT repo: **`telivity/CareerOps-4B`**. Do not ship personal or rejected JSONL.

## Launcher notebook

Use [`kernel/train_launch.ipynb`](../kernel/train_launch.ipynb) — installs deps, asserts T4×2, checks `hf_token` file presence, then runs `torchrun --nproc_per_node=2 train_ddp.py`. Do not call `notebook_launcher` after CUDA init in the parent.

## Local preflight (before Kaggle upload)

```bash
bash scripts/preflight_corpus.sh data/clean
```

Runs validate + ban grep + Gemma token length audit on `match_grading` + merge dry-run.

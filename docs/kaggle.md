# Kaggle training / eval notes

## Training kernel

Metadata: `kernel/kernel-metadata.json` (private, GPU + internet enabled).

### Must-dos

1. **Force T4×2 — never P100.** BitsAndBytes 4-bit on P100 is a known failure path for this stack. In the Kaggle UI, set accelerator to **GPU T4 x2** before running.
2. **Secret label exactly `HF_TOKEN`.** `train_ddp.py` reads `UserSecretsClient().get_secret('HF_TOKEN')`. Any other label name will fail at boot.
3. **Attach secrets AFTER push.** `kaggle kernels push` does **not** upload secrets. Add-ons → Secrets → add `HF_TOKEN`, then attach it to the kernel in the UI.
4. **Launch with `torchrun`, not `notebook_launcher`.** CUDA must not be initialized in the parent notebook process. The train script is designed to run under `torchrun` in a separate process (see comments at top of `kernel/train_ddp.py`).

### Clean train config (locked)

- 2 GPUs × batch 2 × accum 2, LR `1e-4`, cosine, warmup 30, `max_grad_norm` 0.3
- `bnb_4bit_compute_dtype=torch.float32`, **`fp16=False`** (fp16 AMP + GradScaler was a bf16 unscale failure mode)
- `max_length=768` — E2B + T4×2 locked. `match_grading` must be regenerated to ≤~700 tokens (`docs/MATCH_GRADING_REGEN.md`). Do **not** raise to 2048; do **not** naive-trim JDs.
- `packing=False`, gradient checkpointing with `use_reentrant=False`
- HF push target comment: clean name **`telivity/CareerOps-4B`** (contaminated `careerops-4b` deleted)

### Rough sizing

~2,380 clean rows after MG regen. Force T4×2. Watch step time / VRAM on smoke.

## Eval kernel

Metadata: `evalkernel/kernel-metadata.json` (also private, GPU + internet).

Same rules apply: **T4×2**, secret **`HF_TOKEN`** attached after push, no secrets in git. Point dataset sources at the clean training-set dataset once uploaded; do not ship personal or rejected JSONL.

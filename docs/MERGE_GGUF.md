# Merge + GGUF (private)

## Merge

Private Kaggle kernel: `dusanmilicevic/careerops-4b-private-merge`  
Uploads merged full weights to private HF **`telivity/CareerOps-4B-merged`** (assert `private=True` before upload).

Local merge also available:

```bash
export HF_TOKEN=$(cat ~/.hf_token)
python scripts/merge_lora_gguf.py --out /tmp/CareerOps-4B-merged
```

Local disk was ~27 GiB free at last check — prefer Kaggle for the merge.

## GGUF

Not automated yet: no `llama.cpp` / `convert_hf_to_gguf.py` on this machine, and Gemma 4 E2B needs a build that supports that architecture.

After merge lands on `telivity/CareerOps-4B-merged`:

1. Use a Gemma4-capable llama.cpp
2. Convert HF → GGUF (Q4_K_M preferred for LocalLLaMA size)
3. Upload GGUF to a **private** HF repo until public approval

Do **not** flip any repo public without explicit user approval.

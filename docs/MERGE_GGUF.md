# Merge + GGUF

## Merge

Kaggle kernel: `dusanmilicevic/careerops-4b-private-merge`  
Uploads merged full weights to **`telivity/CareerOps-4B-merged`**.

Local merge also available:

```bash
export HF_TOKEN=…   # from env; never commit tokens
python scripts/merge_lora_gguf.py --out /tmp/CareerOps-4B-merged
```

Prefer Kaggle when local disk is tight (merged weights are large).

## GGUF

Not automated yet: needs a `llama.cpp` build that supports Gemma 4 E2B.

After merge lands on `telivity/CareerOps-4B-merged`:

1. Use a Gemma4-capable llama.cpp
2. Convert HF → GGUF (Q4_K_M preferred for LocalLLaMA size)
3. Upload GGUF as **`GGUF-CareerOps-Q4_K_M.gguf`** to **`telivity/CareerOps-4B-GGUF`**

# CareerOps-4B

**A small open model for running a job-search board — not another résumé dump.**

Most “career” models write long essays and invent experience. **CareerOps-4B** is trained for short, grounded ops: triage a board, move stages, follow up, parse a JD, grade a match, and rewrite **one** bullet at a time. The product then **assembles** the document in code — so facts come from the candidate, not from model hallucination.

| | |
|---|---|
| **App** | [careerops.telivity.app](https://careerops.telivity.app) |
| **Adapter** | [`telivity/CareerOps-4B`](https://huggingface.co/telivity/CareerOps-4B) (QLoRA on Gemma 4 E2B-it) |
| **Merged weights** | [`telivity/CareerOps-4B-merged`](https://huggingface.co/telivity/CareerOps-4B-merged) |
| **GGUF (Q4_K_M)** | [`telivity/CareerOps-4B-GGUF`](https://huggingface.co/telivity/CareerOps-4B-GGUF) |

---

## What CareerOps is

[CareerOps](https://careerops.telivity.app) is a job-search **board + ops layer** with AI tooling:

- Drag-and-drop pipeline (Sourced → Researched → Conversation → Applied → Interview → …)
- JD ingest, match grading, follow-ups, prioritisation
- A **decomposed writing pipeline**: select bullets → rewrite one → summary → skills → **code assemble**; cover open / proof / close → assemble

This repository is the **training and evaluation home**: clean SFT corpus, Kaggle train/eval kernels, assembler, privacy probes, and side-by-side reports for **CareerOps-4B**.

### What the model does

| Lane | Examples |
|------|----------|
| **Board / ops** | Triage, prioritisation, stage moves, follow-ups |
| **Structured JSON** | `jd_parsing`, `match_grading`, skills filter lists |
| **Short grounded writing** | Bullet rewrite, cover proof, résumé summary |

### What it is not

- A one-shot “write my whole tailored résumé / cover letter” generator — that is a **product pipeline** (model pieces + `scripts/assembler.py`), not a single gold completion
- A memorizer of any real person’s private job history (training data is synthetic / public-safe)
- Product UI help — served from the app docs/runtime, not from the weights

---

## Demo (real eval outputs)

Side-by-sides from [`eval/reports/eval_report.md`](eval/reports/eval_report.md). Base = stock Gemma 4 E2B-it; tuned = CareerOps-4B. Examples below are **strong tasks only** (PASS / demo-ready in the audit). For `match_grading`, win = close to the honest reference — not a higher raw score.

### 1. Board triage — decisive, not a waffle essay

**Prompt**

```
quick one — I open this board every morning and do nothing. break the tie for me.

Halvard & Pike / Senior Manager, Digital Merchandising / interview / A / 92% / 2 days / low / docs yes
Wickham Row / Director of E-commerce Operations / conversation / A- / 83% / 8 days / low / docs no
Northmarch Consumer Brands / Category Manager, Marketplace / applied / B+ / 75% / 24 days / medium / docs yes
Bellrose Outfitters / Retail Operations Analyst / sourced / C / 49% / 30 days / high / docs no
```

**CareerOps-4B**

```
Halvard & Pike is the only role worth opening. Two days into an interview at A and 92%, docs already tailored, and nothing else here is close.
Wickham Row is the second stop: eight days in conversation at A-/83%, docs missing.
Northmarch Consumer Brands is a B+ at 75% and 24 days applied — it's a real application, not a warm intro.
Bellrose Outfitters is a C at 49% and 30 days sourced.
Drop Bellrose.
```

**Base Gemma** (truncated) — long status table, “CareerOps Overview”, multi-step essay…

### 2. JD → JSON (exact schema)

**Prompt** (excerpt): extract company, title, seniority, location, requirements as raw JSON from a Junipero Parcel VP Last-Mile Delivery posting.

**CareerOps-4B**

```json
{"company": "Junipero Parcel", "title": "Vice President, Last-Mile Delivery", "seniority": "Vice president", "location": "Philadelphia, PA — Hybrid, 3 days on-site", "requirements": ["Owned a nine-figure operating budget with accountability for cost per stop or equivalent unit economics", "Peak season planning at volumes that double or more", "You have expanded a delivery network into new metros and know what breakeven density actually costs"]}
```

### 3. Match grading — closer to the honest target wins

**Not a high-score leaderboard.** Match grading succeeds when the model calibrates to an honest reference (~38 here), not when it inflates. Soft high scores are the failure mode.

**Prompt**: grade a retail Store Operations Lead against a Continuous Improvement Analyst (parcel / DMAIC / facility) role — JSON only.

| | Label | `score` | \|Δ\| to reference |
|---|-------|--------:|------------------:|
| Training reference | honest target | 38 | — |
| CareerOps-4B | tuned calibrated | **40** | **2** |
| Base Gemma | base inflated | 65 | 27 |

**Verdict:** CareerOps 40 ≈ reference 38 is the win (calibrated). Base 65 is inflated — looks “better” only if you misread higher as better. Tuned keeps strengths (SQL/Tableau, on-floor ops) and names real gaps (no warehouse throughput / DMAIC / logistics scope).

### 4. Bullet rewrite — keep the metrics

**Prompt**: punch a cost-cut bullet for an Operations Manager (Guided Travel) JD that wants per-passenger land cost defended line by line.

**CareerOps-4B**

```
Cut per-passenger land cost 12% by renegotiating 31 supplier contracts and consolidating three ground handlers into one — the per-passenger cost-defense work this operations manager role is hiring to own.
```

Base model invents “cost model” language and offers essay options; tuned model keeps **12% / 31 / three handlers** and hooks the JD.

### 5. Follow-ups — one clear next action

**Prompt** (held-out): references requested, thread going quiet — what to do today.

**CareerOps-4B** — send the references today (task-learned; decisive vs base waffle).

Full audit: [`eval/reports/SIDE_BY_SIDE_AUDIT.md`](eval/reports/SIDE_BY_SIDE_AUDIT.md) — held-out examples in `eval/reports/`.

---

## Quickstart (local inference)

Needs a Hugging Face token with access to Gemma 4 E2B-it and `telivity/CareerOps-4B`, plus a GPU with roughly **12–16 GB** VRAM for 4-bit.

```bash
git clone https://github.com/TelivityAI/careerops.git
cd careerops
export HF_TOKEN=hf_...          # never commit this
bash scripts/quickstart.sh      # installs requirements-infer.txt + runs board demo
```

Or step by step:

```bash
pip install -r requirements-infer.txt
python scripts/demo_infer.py --demo board     # triage
python scripts/demo_infer.py --demo json      # JD parse
python scripts/demo_infer.py --demo rewrite   # bullet rewrite
python scripts/demo_infer.py --demo grade     # match grading JSON
python scripts/demo_infer.py --prompt "Your prompt here"
```

`scripts/quickstart.sh` forwards extra args to `demo_infer.py` (e.g. `bash scripts/quickstart.sh --demo json`).

---

## How to run inference

### Adapter (recommended default)

Load base `google/gemma-4-E2B-it` + LoRA adapter `telivity/CareerOps-4B` with 4-bit BitsAndBytes (see `scripts/demo_infer.py`). Same path the eval kernel uses for side-by-sides.

```bash
export HF_TOKEN=hf_...
python scripts/demo_infer.py --demo board
```

### Merged weights

Full FP merge (no PEFT at load time): [`telivity/CareerOps-4B-merged`](https://huggingface.co/telivity/CareerOps-4B-merged).

Build a merge locally (large disk):

```bash
export HF_TOKEN=hf_...
python scripts/merge_lora_gguf.py --out /tmp/CareerOps-4B-merged
```

### GGUF / llama.cpp (optional)

Quantized file: [`telivity/CareerOps-4B-GGUF`](https://huggingface.co/telivity/CareerOps-4B-GGUF) (`GGUF-CareerOps-Q4_K_M.gguf`, ~3.2 GB).

Requires a **Gemma 4–capable** llama.cpp build:

```bash
./llama-cli -m GGUF-CareerOps-Q4_K_M.gguf -p "…" -n 256
```

Details: [`docs/MERGE_GGUF.md`](docs/MERGE_GGUF.md).

### Assembler only (no GPU)

The writing pipeline stitches model pieces in code — no network, no HF token:

```bash
python scripts/assembler.py cover \
  --open open.txt --proof proof.txt --close close.txt

python scripts/assembler.py resume \
  --select '[4, 8, 6]' \
  --bullets bullets.json \
  --rewrites rewrites.json \
  --summary summary.txt \
  --skills '["SQL", "Snowflake"]'
```

---

## Writing pipeline (assembler)

```
JD + master bullets
        │
        ▼
  bullet_select  ──►  [ids]     (model)
        │
        ▼
  resolve IDs in code  →  optional bullet_rewrite per id  (model)
        │
        ▼
  resume_summary + skills_filter  (model)
        │
        ▼
  scripts/assembler.py resume   ← never invents facts
```

Cover path: `cover_open` + `cover_proof` + `cover_close` → `assembler.py cover`.

That split is intentional: ~2B-class models are better at **short grounded pieces** than at one-shot full docs.

---

## How to train (Kaggle)

Training targets **Kaggle GPU T4 × 2** with `torchrun` (not `notebook_launcher` after CUDA init in the parent notebook).

1. Set accelerator to **GPU T4 x2** (BitsAndBytes 4-bit on P100 is a known failure path for this stack).
2. Attach train/val JSONL datasets and provide `HF_TOKEN` (env or secret) for base + push.
3. Launch from [`kernel/train_launch.ipynb`](kernel/train_launch.ipynb) → `torchrun --nproc_per_node=2 train_ddp.py`.

### Locked train settings (`kernel/train_ddp.py`)

| Setting | Value |
|---------|-------|
| Base | `google/gemma-4-E2B-it` |
| Method | QLoRA (`r=16`, `alpha=32`, dropout `0.05`) |
| Quant | NF4, `bnb_4bit_compute_dtype=float32` |
| Precision | `fp16=False`, `bf16=False` |
| Batch | 2 GPUs × batch 2 × accum 2 (effective 8) |
| LR | `1e-4`, cosine, warmup 30 |
| `max_grad_norm` | 0.3 |
| `max_length` | **768** (do not raise to 2048) |
| Packing | `False` |
| Grad checkpoint | `use_reentrant=False` |
| Output | adapter → `telivity/CareerOps-4B` |

Operator notes: [`docs/kaggle.md`](docs/kaggle.md).

---

## How to eval

Kaggle eval kernel (`evalkernel/`) runs [`kernel/eval.py`](kernel/eval.py):

1. **Val loss** — base vs tuned on 70 held-out rows (`max_length=768`, loss on assistant tokens only)
2. **Side-by-side** — 20 stratified generations: base vs tuned vs reference
3. Reports land under `eval/reports/`

### Measured results

| Check | Result |
|-------|--------|
| Train | 289/289 steps, mean train loss ≈ **0.96** (T4×2 DDP) |
| Val loss | tuned **1.677** vs base **4.489** (−62.6%) |
| Privacy probes | **10/10 PASS** ([`privacy_probe_summary.json`](eval/reports/privacy_probe_summary.json)) |
| Side-by-side | held-out examples in [`eval/reports/`](eval/reports/) |

Offline privacy scoring (precomputed answers):

```bash
python scripts/run_privacy_probe.py \
  --probes eval/privacy_probes.jsonl \
  --ban-list scripts/privacy/ban_list.txt \
  --answers-file eval/reports/privacy_answers.jsonl
```

### Honest demo scope

Demo board/ops, `jd_parsing` / `match_grading` JSON, and grounded `bullet_rewrite` / `cover_proof`. Prefer those over `search_strategy` framing or `bullet_select` ranking (format OK, order uneven).

---

## Repo layout

| Path | Role |
|------|------|
| `data/clean/` | Per-task JSONL + personas, JD bank, generation rules, quality report |
| `data/careerops_{train,val}.jsonl` | Merged train/val used on Kaggle |
| `kernel/` | Train (`train_ddp.py`), launch notebooks, metadata |
| `evalkernel/` | Eval kernel (val loss + side-by-sides) |
| `scripts/demo_infer.py` | Local adapter smoke demo |
| `scripts/quickstart.sh` | One-shot install + demo |
| `requirements-infer.txt` | Pip deps for local inference |
| `scripts/assembler.py` | Résumé / cover stitcher |
| `scripts/validate_clean.py` | Corpus schema / count checks |
| `scripts/privacy/` | Ban-list + grep |
| `scripts/run_privacy_probe.py` | Privacy probe scoring |
| `scripts/merge_train_val.py` | Build train/val JSONL |
| `scripts/merge_lora_gguf.py` | Merge adapter → full weights |
| `scripts/preflight_corpus.sh` | Validate + privacy + token-length audit |
| `eval/reports/` | Val loss, side-by-sides, privacy results, audit |
| `docs/` | Kaggle notes, merge/GGUF, regen specs |

---

## Data overview

~**2,380** clean synthetic SFT rows across **16** tasks (2310 train / 70 val). No personal CareerOps user history in the training set.

| Task family | Examples |
|-------------|----------|
| Board / ops | `board_triage`, `prioritisation`, `stage_moves`, `followups` |
| Structured | `jd_parsing`, `match_grading`, `skills_filter`, `bullet_select` |
| Writing | `bullet_rewrite`, `resume_summary`, `cover_{open,proof,close}` |
| Analysis | `resume_analysis`, `search_strategy` |

Details: [`data/clean/MANIFEST.md`](data/clean/MANIFEST.md), [`data/clean/PRODUCT.md`](data/clean/PRODUCT.md).

Corpus preflight (no train/upload):

```bash
bash scripts/preflight_corpus.sh data/clean
```

---

## Hardware

| Workload | Hardware | Notes |
|----------|----------|-------|
| **Train** | Kaggle **T4×2** | Required path; ~289 optimizer steps / 1 epoch on ~2.3k rows |
| **Eval / demo_infer** | 1× T4 or similar, **~12–16 GB** VRAM | 4-bit base + LoRA |
| **GGUF Q4_K_M** | CPU or small GPU | ~3.2 GB file; needs Gemma 4–capable llama.cpp |
| **Assembler / validate** | CPU | No GPU |

---

## Secrets

Do not commit API tokens.

---

## License / contributing

Corpus and scripts live in this repository. Model weights are published on Hugging Face under the `telivity/` namespace. Issues and PRs that improve eval coverage, assembler UX, or train reliability are welcome — keep claims aligned with [`eval/reports/SIDE_BY_SIDE_AUDIT.md`](eval/reports/SIDE_BY_SIDE_AUDIT.md).

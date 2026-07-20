# MATCH_GRADING regen — hard spec for Claude (Sonnet 5 / Opus 4.8)

## Why

Current `data/clean/match_grading.jsonl` (180 rows) is ~1.2k–1.6k tokens per row. On Gemma E2B + Kaggle T4×2 that **blows training** (VRAM / step time). Raising `max_length` to 2048 was rejected — it papers over bad data length at GPU cost.

Train ceiling is **`max_length=768`** again. Every `match_grading` row must fit with room: target **≤700 tokens** for the full chat (system will be prepended at train time; keep user+assistant together ≤~650–700).

Naive trim of JD to “requirements only” **failed**: broke grounding on **77/180** (assistant cites About-the-role facts). Do **not** do that.

## Locked approach: compact grounded pack (not chunk-split)

**Do not** split one long chat into 768-token slices with the same JSON label.

**Do** rewrite each row so the **user** message contains only:

1. Short instruction
2. Compact candidate profile (skills / titles / years — not a novel résumé dump)
3. **JD fact pack** — only facts needed to justify the grade (must include every fact the assistant will cite)

Assistant stays the same shape: score JSON + short why / strengths / gaps — **every claim grounded in the user fact pack**.

Optional later (not required now): separate `jd_compress` task. For this regen, bake the compressed JD into the `match_grading` user message.

## Counts / model

| | |
|---|---|
| Rows | **180** (replace file entirely) |
| Model | **Opus 4.8** (judgment) |
| `metadata.generator_model` | `opus-4.8` |
| `metadata.personal_data` | `false` |
| `metadata.quality_pass` | `true` only after checklist |
| Output | `data/clean/match_grading.jsonl` (overwrite) |
| Quarantine old | move current long file to `data/clean/_rejected/match_grading_LONG.jsonl` before overwrite |

## Length hard gate

Before writing a row:

- Estimate tokens ≈ `ceil(len(user+assistant chars) / 3.5)` **or** real tokenizer if available
- Reject if estimate **> 700**
- Prefer **≤ 550** for safety under chat template + system prompt

## Grounding hard gate

- Every number, employer, title, headcount, $ amount, property count in the **assistant** must appear **verbatim** in the **user** fact pack
- If a fact is needed for the grade, put it in the pack — do not hope it survives from a deleted “About the role” section
- No invented skills / employers / metrics

## Quality

- Same rubric discipline as before (score ↔ gaps consistent)
- Distinct answers ≥70%
- No stamp loops, no PII, no secrets
- Internally consistent spelling per row (en-GB quotes OK if source pack uses them)

## Schema

Same as other clean rows:

```json
{
  "task": "match_grading",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "metadata": {
    "persona_id": "...",
    "source": "synthetic|public:...",
    "license": "...",
    "personal_data": false,
    "generator_model": "opus-4.8",
    "quality_pass": true,
    "approx_tokens": 0
  }
}
```

Set `approx_tokens` to your estimate for Cursor audit.

## Done when

1. 180 rows, all ≤700 tok estimate
2. Spot-check 20: grounding holds
3. Update `QUALITY_REPORT.md` + `MANIFEST.md` noting MG regen
4. Tell Cursor: ready for `validate_clean.py` + length gate

## Forbidden

- max_length 2048 as a substitute for regen
- Naive requirements-only JD trim
- Splitting one grade into multi-chunk rows with the same JSON
- Shipping rows that truncate under 768

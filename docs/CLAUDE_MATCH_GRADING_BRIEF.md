# Claude — paste this

## Immediate: regenerate match_grading (blocking for Kaggle)

Train is **`max_length=768`** (E2B + T4×2). Current long `match_grading.jsonl` (~1.2k–1.6k tok) must be **fully replaced**.

Covers + `resume_summary` are **done** (Session 4, 450 rows — do not regenerate those).

Follow: `docs/MATCH_GRADING_REGEN.md` in TelivityAI/careerops.

### Hard rules
1. **180 rows**, Opus 4.8, overwrite `data/clean/match_grading.jsonl`
2. Move old long file → `data/clean/_rejected/match_grading_LONG.jsonl` first
3. Each row **≤~700 tokens** (prefer ≤550) for full user+assistant
4. User message = short instruction + compact profile + **JD fact pack** containing every fact the assistant will cite
5. **No** naive “requirements-only” trim (that broke grounding on 77/180)
6. **No** splitting one grade into 768-token chat slices
7. Grounding: every assistant claim verbatim in the user pack
8. Stamp `generator_model: opus-4.8`, `personal_data: false`, `quality_pass: true`, `approx_tokens: <n>`

### Also
- Ensure `MANIFEST.md` reflects final counts including regenerated MG
- Update `QUALITY_REPORT.md` with MG regen note + length gate results

Then hand off to Cursor for `validate_clean.py` + length audit before any Kaggle run.

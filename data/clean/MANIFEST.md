# CareerOps clean SFT corpus — manifest

**2,380 rows · 16 files · zero personal rows.** `validate_clean.py` and `privacy/grep_ban.py` both pass.

Train target: Gemma E2B, QLoRA, Kaggle T4x2, `max_length=768`.

## Token budget

The 768 ceiling must cover the system prompt and chat template, which are prepended at
train time:

```
768   train ceiling
-119   system prompt (416 chars, from kernel/train_ddp.py)
- 25   chat template control tokens
= 624   budget for user + assistant
```

`approx_tokens` in each row's metadata is `ceil((len(user)+len(assistant))/3.5)` — a
generation-time estimate, **not** a real tokenizer count. The `max+system` column below is
`max_tok + 144`. Re-measure the max with the Gemma tokenizer before any Kaggle run; if the
true ratio is nearer 3.2 on JSON-dense text, the top rows move up by roughly 10%.

## Files

| file | rows | model | median tok | max tok | max+system | distinct | personas | max persona |
|---|---|---|---|---|---|---|---|---|
| `app_operation` | 110 | sonnet-5 | 90 | 129 | 273 | 1.000 | — | — |
| `board_triage` | 200 | opus-4.8 | 288 | 425 | 569 | 1.000 | 30 | 4.0% |
| `bullet_rewrite` | 400 | sonnet-5 | 146 | 180 | 324 | 1.000 | 30 | 3.5% |
| `bullet_select` | 120 | sonnet-5 | 476 | 560 | 704 | 1.000 | 30 | 5.0% |
| `cover_close` | 100 | sonnet-5 | 120 | 170 | 314 | 1.000 | 30 | 4.0% |
| `cover_open` | 100 | sonnet-5 | 161 | 232 | 376 | 0.980 | 30 | 4.0% |
| `cover_proof` | 100 | sonnet-5 | 181 | 238 | 382 | 1.000 | 30 | 4.0% |
| `followups` | 100 | opus-4.8 | 166 | 204 | 348 | 1.000 | 30 | 4.0% |
| `jd_parsing` | 130 | sonnet-5 | 314 | 447 | 591 | 0.692\* | — | — |
| `match_grading` | 180 | opus-4.8 | 543 | **598** | **742** | 1.000 | 30 | 3.9% |
| `prioritisation` | 200 | opus-4.8 | 334 | 459 | 603 | 1.000 | 30 | 4.0% |
| `resume_analysis` | 200 | sonnet-5 | 372 | 494 | 638 | 1.000 | 30 | 4.5% |
| `resume_summary` | 150 | sonnet-5 | 195 | 276 | 420 | 1.000 | 30 | 3.3% |
| `search_strategy` | 110 | opus-4.8 | 228 | 290 | 434 | 1.000 | 30 | 2.7% |
| `skills_filter` | 80 | sonnet-5 | 340 | 411 | 555 | 0.938\* | 30 | 5.0% |
| `stage_moves` | 100 | opus-4.8 | 127 | 158 | 302 | 1.000 | 30 | 4.0% |

\* JSON-output tasks. The distinct-ratio metric hashes the first 12 tokens, which for a JSON
answer are structural (`{"company": ...`), so a low score here is a metric artifact, not
duplication. `validate_clean.py` excludes JSON tasks from the distinct gate for this reason.
All 130 `jd_parsing` answers and all 80 `skills_filter` answers are fully distinct.

`app_operation` and `jd_parsing` carry `persona_id: null` by design — UI how-tos and posting
parsing are not persona-scoped.

**Tightest row in the corpus:** `match_grading` at 742/768, 26 tokens of headroom.
Second is `bullet_select` at 704.

## match_grading regeneration

The previous file (~1.2k-1.6k tokens per row) is quarantined at
`_rejected/match_grading_LONG.jsonl`. Every one of its 180 rows exceeded the ceiling, and
because the assistant JSON sits at the end of the sequence, it would have been truncated —
the model would have learned a cut-off label.

Rebuilt by **deriving from the quarantined file, not regenerating judgment**: all 180 scores
are byte-identical to the originals, and no strength or gap was invented. What changed is the
user message, which is now a compact fact pack — ROLE / NEEDS / CANDIDATE / SKILLS — built
*backwards from what each answer actually cites*, so grounding is mechanically guaranteed
rather than hoped for.

A naive "requirements-only" JD trim was tested first and rejected: it breaks grounding on
**77 of 180** rows, because the answers cite facts that lived in the "About the role" prose.

Latent defects in the original that the rebuild exposed and corrected:

- row 93 cited "elected officials" — phrasing belonging to **row 92's** JD (cross-row bleed)
- row 91 cited an "operating committee" present in neither the JD nor the résumé
- row 125 listed "No cross-dock operations" as a gap while the candidate's own skills included it
- row 37 cited "consumer-goods lanes" with nothing in the résumé supporting it
- row 13 cited a derived "16 years" with no verbatim anchor
- rows 95 and 129 had **empty** `strengths` arrays; each now carries one genuinely transferable
  strength drawn from that row's own pack

Length distribution: 167 rows ≤550, 13 rows 551-598, none above 600.

## Provenance

Every row was authored by a generation session and verified by a different session. No row is
verified by whoever wrote it. Model stamps are what actually produced the row — never relabelled.

## Handoff state

Ready for Cursor: `validate_clean.py` + a real-tokenizer length audit before any Kaggle run.
The number that matters is the **max**, not the median, and specifically the 13
`match_grading` rows in the 551-598 band.

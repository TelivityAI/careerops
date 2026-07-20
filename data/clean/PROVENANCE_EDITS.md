# Open defects — verification record

Provenance is clean. Every row in `data/clean/` was authored by a generation session and
verified by a different session; no row is verified by whoever wrote it. Model stamps reflect
what actually produced each row. Nothing here needs special audit handling.

Corpus state: **2,380 rows, 16 files.** `validate_clean.py` and `privacy/grep_ban.py` both pass.
See `MANIFEST.md` for per-file counts, token budget, and the `match_grading` regeneration.

**Resolved and no longer open:** the `max_length=2048` proposal (rejected — `match_grading` was
regenerated to fit 768 instead), the `cover_close` template collapse (84 → 22 rows opening
"I'd"), and the ten invented titles and locations in `cover_proof` / `cover_close` /
`resume_summary`.

---

## Still open — small, none blocking

**1. `cover_close` — two residual repeated skeletons.** Down from 18 to 2, but one is *new*,
introduced by the fix that broke the old template:

- `"is exactly the kind of work I'd"` — 4x
- `"I'd welcome the opportunity to discuss how"` — 3x

The hard ban is three or more. Needs a light pass on ~5 rows by a sonnet-5 session.

**2. Five ungrounded entities missed in the last pass** (all confirmed still present):

| file | row | entity | note |
|---|---|---|---|
| `cover_close` | 69 | "the Board" | no Board in its prompt, and the prompt ends "No new claims" |
| `resume_analysis` | 154 | "Reno" | city not in prompt |
| `resume_analysis` | 158 | "Belt" | certification not in prompt |
| `resume_analysis` | 168 | "Phoenix" | city not in prompt |
| `resume_analysis` | 169 | "Phoenix" | city not in prompt |

The cities are probably inferred from a neighbouring city that *is* in the prompt, so they are
milder than an invented job title — but at inference the model sees only the user message, so
this still teaches it to assert geography it was not given.

`cover_close` 69 was found in the original sweep but omitted from the fix list handed over —
a hand-off error, not a generation error.

**3. `validate_clean.py` has a blind spot worth closing.** `cover_close` was 84% templated and
still scored `distinct_ratio 1.000`, because that metric hashes the first 12 *tokens* and each
row's unique company name makes them differ. Two cheap checks would have caught it
automatically:

- no first-four-word sequence in more than ~5% of a file
- no 8-word sequence occurring 3+ times in a prose (non-JSON) file

Not applied — the validator is Cursor's file.

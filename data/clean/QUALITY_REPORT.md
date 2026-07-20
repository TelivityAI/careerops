# QUALITY_REPORT.md

Log of generation sessions for the clean SFT corpus. Append, don't overwrite.

---

## Session: jd_parsing (130 rows) + app_operation (110 rows)

Generator model: sonnet-5.

### jd_parsing

Source: all 70 postings in `JD_BANK.md`, parsed programmatically (company, title,
seniority, location, requirements) so extraction values are correct by
construction rather than by hand-typing.

Each of the 70 JDs got one row; 60 of the 70 got a second, structurally
different row (different header style, different requirement subset/phrasing,
sometimes a field genuinely omitted from the posting text) — 130 rows total.
Postings were wrapped in realistic noise (cookie banners, share/apply/nav
lines, footers, related-jobs lines) drawn from pools of 12–20 variants each,
selected round-robin rather than randomly so no single filler line repeats
more than ~4 times across the file. Six different instruction phrasings were
used for the user turn, also round-robin.

For "missing field" rows, the field (seniority and/or location) was left out
of the constructed posting text, and a script-level check confirmed the true
value did not coincidentally appear elsewhere in the text (e.g. the seniority
word inside the title) before labelling it as genuinely absent. The JSON
value is `""` only when the field truly has no verbatim occurrence in the
posting; all four scalar fields plus every string in `requirements` were
verified post-generation to be exact substrings of the corresponding user
message.

Self-QA results:
- JSON-parses: 130/130.
- Verbatim-substring check (company, title, seniority, location, all
  requirement strings): 130/130 pass, 0 rejects.
- Total word count (user + assistant) range: 99–230 words, all comfortably
  under the ~288-word (384-token) budget.
- Ban-list grep (`scripts/privacy/grep_ban.py`): clean.
- `scripts/validate_clean.py`: `OK jd_parsing: count 130/130`.
- Manual read of 15 rows spread across both passes: no fabricated facts, no
  stamp-loop pattern, missing-field rows correctly emit `""`.
- `metadata.persona_id` set to `null` throughout — this task extracts from an
  arbitrary pasted posting, it isn't persona-scoped, so persona concentration
  limits don't apply and there was nothing to balance.

No rows were quarantined to `_rejected/`.

### app_operation

Source: `PRODUCT.md`, read in full, plus one explicit override from the task
brief that takes precedence over the doc: the board has **seven** real
columns (`sourced, researched, conversation, applied, interview, offer,
rejected`); `Closed` is a display label only and was never described as a
column, a drag target, or part of the active-roles count. All 110 rows were
checked to contain zero mentions of "Closed" in that sense.

110 hand-written Q&A pairs across 21 feature areas (adding a role, JD
autoload, match reports, résumé tailoring, cover letters, chat, AI tiers/BYOK,
humanizer, exports, job search, onboarding, setup banner, follow-ups, Jobscan
attachment, saved-artifacts list, apply/no-auto-apply, auth, Settings modal,
board stages, card contents, and — deliberately — features that do **not**
exist: board search, filters, sort, notes, tags, dark mode, sharing). Every
UI string, label, cap, and behaviour quoted is taken verbatim from
`PRODUCT.md`; nothing about résumé-tailoring or cover-letter internals was
included, since the product doc explicitly doesn't document those and the
brief said to leave that out of scope.

Self-QA results:
- Word count per assistant answer: 26–62 words, all under the 100-word cap.
- Distinct-first-12-tokens ratio: 1.000 (110/110 unique) — well above the
  0.70 floor.
- Ban-list grep: clean. No buzzword-list hits, no "variant ", no stamp loops.
- `scripts/validate_clean.py`: `OK app_operation: count 110/110`,
  `OK app_operation: distinct_ratio 1.000`.
- Manual read of 15 rows against `PRODUCT.md`: all facts traced to the doc,
  no invented UI, no mention of the non-existent search/filter/sort/notes/tags
  features except in the rows explicitly answering "no, that doesn't exist."
- `metadata.persona_id` set to `null` throughout — these are generic
  how-to-use-the-app questions, not persona-scoped.

No rows were quarantined to `_rejected/`.

### Out-of-scope note

`data/clean/bullet_rewrite.jsonl` (pre-existing in this repo, not touched in
this session) fails `scripts/privacy/grep_ban.py`: it contains the banned
token `"variant"`. Not fixed here since it's outside this session's task
scope (jd_parsing + app_operation only) — flagged separately.

---

## Session: board_triage (200) + prioritisation (200) + stage_moves (100) + followups (100)

Generator model: opus-4.8 (set per session instruction — see the open conflict at the
end of this section).

Sources read before generating: `data/clean/GENERATION_RULES.md`, `data/clean/PERSONAS.md`,
`data/clean/JD_BANK.md`, `data/clean/PRODUCT.md`, `scripts/privacy/ban_list.txt`.

### Board model

Every user message is a board state: 3–8 roles carrying company, title, stage, fit grade
(A/A-/B+/B/C/D), match %, days in stage, ghost risk (low/medium/high), and tailored-docs
status. Companies and titles are verbatim from `JD_BANK.md`; a persona's board draws from
its own industry plus adjacent stretch roles, not only that persona's `Targets` line.

Presentation is deliberately non-uniform across rows — pipe tables, `·` bullets,
`key: value` blocks, terse delimiter dumps (`::`, `/`, `~`, `|`, `>`), and hurried
unpunctuated paragraphs — as is the human's framing (time-boxed, overwhelmed, "which of
these is dead?", post-rejection). Board health varies across healthy, all-stale,
top-heavy-sourced, single-hot-interview, offer-in-hand, and mostly-rejected rebuild.

### Stages

Seven board columns only: `sourced, researched, conversation, applied, interview, offer,
rejected`. Per session instruction, `Closed` is treated as out of scope: it is never a
stage value, never a move target, and the token appears nowhere in any of the four files.
`stage_moves` covers all thirteen legal transitions, weighted toward reality (34 of 100
rows are rejections; 6 are holds, each stating the condition that would unlock a move):

    12 researched → applied      11 applied → rejected     6 sourced → rejected
    12 applied → interview        8 interview → rejected   6 hold
    11 sourced → researched       7 researched → conversation   5 offer → rejected
                                  7 conversation → applied      5 researched → rejected
                                  6 interview → offer           4 conversation → rejected

### Self-QA results

Checked with a purpose-built validator over all 600 rows, plus the repo gates.

- JSON parse: 600/600. Schema, metadata literals, and persona ids all conform.
- Word caps: board_triage max 107/120, prioritisation max 115/120, stage_moves max 51/60,
  followups max 72/80. Zero rows over cap.
- Distinct assistant answers: 100% in all four files (floor is 70%).
- Duplicate first-12-word openings: 0 across all four files.
- Persona concentration: max 4.0% per file (limit 5%). All 30 personas used in each file.
- Stamp loops: 0. Checked two ways — same line skeleton 3+ times inside one answer
  (0 rows), and any line skeleton reused 3+ times across a whole file (0 skeletons,
  proper nouns and digits normalized before comparison).
- Ban list via `scripts/privacy/grep_ban.py`: clean for all four files.
- Grounding: every company named in an answer, and every percentage, traced back to that
  row's own user message.
- Spelling: American English throughout, verified by an explicit British-form scan.

### Rejected and redone

Subagent-level rejections during drafting (details in each batch): ungrounded claims about
scale, team size, and therapeutic areas; two `researched → applied` rows converted to
`researched → rejected` because early kills were under-represented; a `stage_moves` hold
that invented follow-up dates absent from the prompt; an implausible offer for a role two
levels off the persona's track; several duplicate travel-JD assignments across personas.

Fixed at assembly, after the full-corpus validator caught them:

1. **Unsourced threshold numbers (7 rows, board_triage).** Answers summarized with rounded
   boundaries — "both under 65%", "both above 75%" — where the boundary itself was not a
   number on the board. Arithmetically true, but it teaches a small model to emit numbers
   that aren't in its input. All seven rewritten to cite the actual values ("64% and 61%").
2. **The token "closed" (3 rows, board_triage).** Used in ordinary English about postings
   ("the window is closing but not closed", "likely a closed posting"), not as a stage.
   Reworded anyway so the token appears nowhere near stage vocabulary.
3. **British spelling in a quoted title (4 rows).** Lowercase `fulfilment` survived inside
   hurried-paragraph user messages. Normalized to `fulfillment`, matching the app's own
   American UI strings.

No rows were quarantined to `_rejected/` — every issue was repairable in place.

### Source-file changes made this session

Two invented proper nouns were Americanized so the corpus is uniform, since the app's UI
strings are American: `Fulfilment Systems` → `Fulfillment Systems` (in `JD_BANK.md`) and
`Programme Manager, Transit Capital Delivery` → `Program Manager, …` (in `PERSONAS.md`).
Verified afterwards that all 130 `jd_parsing` company/title values still resolve as exact
substrings of `JD_BANK.md`, so no already-generated file was desynced. Lowercase
`fulfilment` inside JD body prose was deliberately left alone — other sessions quote that
prose verbatim, and changing it would break their rows.

### Open conflicts for the corpus owner

1. **`generator_model`.** This session was instructed to stamp `opus-4.8`, but
   `scripts/validate_clean.py` hard-codes `fable-5` as the expected model for all four of
   these tasks, so it reports 600 failures on that field alone. Counts and distinct ratios
   pass. Either the validator's expectation or the stamped value needs to change; the rows
   were left as instructed rather than silently reconciled.
2. **Stage count in `PRODUCT.md`.** That doc, written from the app source, documents eight
   board columns including `Closed`, and the source does render `Closed` as a real,
   droppable column. Two sessions have now generated against a seven-column rule. The doc
   and the corpus disagree; worth settling in one place.
3. **`bullet_rewrite.jsonl`** still fails the ban gate on the token `variant` (already
   flagged in the previous session's note). Untouched here — not this session's file.

---

## Session: resume_analysis (200) + bullet_select (120) + skills_filter (80)

Generator model: sonnet-5.

Sources read before generating: `data/clean/GENERATION_RULES.md`, `data/clean/PERSONAS.md`,
`data/clean/JD_BANK.md`, `scripts/privacy/ban_list.txt`.

### Assignment plan

Built from the `Coverage map` at the end of `JD_BANK.md` (78 persona+JD pairs across all 30
personas, 2–3 JDs each). Row counts per pair were distributed round-robin to hit exactly 200 /
120 / 80 while keeping every persona at or under its file's 5% concentration cap (max observed:
resume_analysis 9/200 = 4.5%, bullet_select 6/120 = 5.0%, skills_filter 4/80 = 5.0%). Work was
farmed out to 17 parallel subagents (8 for resume_analysis, 5 for bullet_select, 4 for
skills_filter), each assigned a fixed slice of pairs and instructed to self-QA and grep the ban
list before returning, then merged and re-validated centrally.

### resume_analysis

Each row pairs one persona's paraphrased résumé facts with one target JD's paraphrased
requirements/responsibilities and asks for a fit/gap/risk read. Repeated persona+JD pairs (used
where 200 rows didn't divide evenly across 78 pairs) were written from different angles —
seniority stretch, a named missing qualification, domain/industry gap — with distinct opening
sentences, so no assistant answer duplicates another's first 12 tokens. Internal catalog codes
(`JD0xx`, `pXX`, "Targets") were kept out of message text; only JD company/title and persona
facts appear. British spellings from the source files were converted to American English
throughout.

### bullet_select

Each row presents one persona's **complete** bullet list, renumbered 1..N, plus a JD, and asks
for a priority-ordered relevant subset as a bare JSON integer array. Where a pair repeats, the
bullet numbering was reshuffled between the two rows so the two arrays aren't trivially
identical. Selection size varied by genuine relevance (3–8 of the available bullets), never a
fixed count.

### skills_filter

Each row presents one persona's full skills list (American-English-converted, otherwise
unchanged) plus a JD, and asks for a relevant subset as a bare JSON string array. Every returned
string is an exact substring of that row's own presented list — no invented or reworded skills.

### Self-QA and validation results

Checked with a purpose-built merge/validator script over all 400 rows, then confirmed against
`scripts/validate_clean.py` (the repo's authoritative gate).

- JSON parse: 400/400.
- Schema: exactly 2 messages (user, assistant), correct roles, non-empty content, correct
  metadata literals (`source`/`license`: `synthetic`, `personal_data`: `false`,
  `quality_pass`: `true`, `generator_model`: `sonnet-5`) on every row.
- Word cap: resume_analysis max well under 120 words; 0 rows over cap.
- Distinct ratio: resume_analysis 100% (floor 70%).
- `bullet_select`: every assistant array is valid JSON, all-integer, no duplicate ids, every id
  present in that row's own numbered list — 120/120 pass.
- `skills_filter`: every assistant array is valid JSON, all-string, no duplicates, every string
  an exact substring of that row's own skills list — 80/80 pass.
- Persona concentration: max 4.5% (resume_analysis), 5.0% (bullet_select, at the cap),
  5.0% (skills_filter, at the cap) — none over.
- `scripts/validate_clean.py --dir data/clean`: `OK resume_analysis: count 200/200`,
  `OK resume_analysis: distinct_ratio 1.000`, `OK bullet_select: count 120/120`,
  `OK skills_filter: count 80/80` — clean, zero errors on all three files.
- Manual read of 15 random rows per file (45 total): no fabricated facts, no stamp loops, no
  buzzword filler, correct JSON-only shape on the two JSON tasks.

### Rejected and redone

Subagent-level: none reported dropping a planned row; all 400 assigned rows shipped on first
pass per-batch.

Fixed at assembly, after `scripts/validate_clean.py` caught it:

1. **One `resume_analysis` row (persona p03, Cadenza Payments / JD013) hit the ban-list token
   `variant`.** Not a template artifact — the trigger was the legitimate word "invariants"
   inside "accounting invariants, retries, and settlement edge cases" (`variant` is a substring
   of `invariants`). Reworded to "accounting correctness rules" in place; no fact or number
   changed. This is the same false-positive class already flagged against
   `bullet_rewrite.jsonl` in the prior session's note: the ban-list file has `variant ` with a
   trailing space (presumably meant to catch stamp artifacts like "variant 1"), but every
   loader in this repo (`grep_ban.py`, `validate_clean.py`) calls `.strip()` on each pattern
   line, which drops the trailing space and turns it into a bare substring match — so it also
   flags "invariant", "invariants", "covariant", etc. Worth fixing at the source
   (`scripts/privacy/ban_list.txt` and/or the loader) so future sessions don't have to
   individually dodge real English words.

No rows were quarantined to `_rejected/`.

---

## Session: bullet_rewrite (400 rows)

Generator model: sonnet-5.

Sources read before generating: `data/clean/GENERATION_RULES.md`, `data/clean/PERSONAS.md`,
`data/clean/JD_BANK.md`, `scripts/privacy/ban_list.txt`.

### Assignment plan

Built directly from the `Coverage map` at the end of `JD_BANK.md`. Each of the 30 personas
got 13 or 14 rows (10 personas at 14, 20 at 13 — 400 total, max concentration 3.5%, well under
the 5% cap). Within a persona, every résumé bullet was used at least once; personas with fewer
than 13 bullets had 2–3 bullets reused against a second target JD from that persona's own
`Targets` list, each time with a fully restructured opening (different lead word/clause, not a
synonym swap) so no two rows share their first 12 tokens even when the underlying bullet repeats.
JDs were matched to bullets by genuine requirement/responsibility overlap (e.g. a Postgres
migration bullet paired with the JD line naming Postgres-at-scale migrations), not just by
persona-target proximity.

Each row: one user turn containing a verbatim-in-spirit résumé bullet plus a short, paraphrased
description of the target JD's company/title and one specific requirement or responsibility
(never a verbatim quote of the JD's `Targets:` scaffolding line), asking for a sharper rewrite;
one assistant turn rewriting that single bullet — same facts, no new number/employer/date/skill,
a stronger lead verb, reordered toward what the JD paraphrase cares about, closing with a short
clause tying back to the JD without inventing anything not already in the bullet.

### Self-QA and validation results

- JSON parse: 400/400.
- Schema: exactly 2 messages (user, assistant), correct roles, non-empty content, correct
  metadata literals (`source`/`license`: `synthetic`, `personal_data`: `false`, `quality_pass`:
  `true`, `generator_model`: `sonnet-5`) on every row.
- Word cap: assistant answers 20–43 words observed, all comfortably under the 60-word cap
  (validator's 1.5× soft ceiling is 90; nothing came close).
- Distinct-first-12-tokens ratio: 1.000 (400/400) — well above the 0.70 floor.
- Persona concentration: max 14/400 = 3.5%, min 13/400 = 3.25% — none over the 5% cap.
- Ban-list grep (`scripts/privacy/grep_ban.py`): clean.
- `scripts/validate_clean.py --dir data/clean`: `OK bullet_rewrite: count 400/400`,
  `OK bullet_rewrite: distinct_ratio 1.000`.
- No absolute filesystem paths or the operator's personal email anywhere in the file (checked
  by direct string search for the Drive-mount path and its embedded address) — confirmed clean.
- Manual read of 15 random rows: every proper noun, number, job title and skill in each
  assistant answer traced back to that row's own user-message bullet; no invented metrics,
  employers, or dates; no buzzword-filler phrases; no stamp-loop pattern.

### Rejected and redone

Fixed in place during generation/validation, before final write:

1. **Two accidental duplicate first-12-token openings**, both from reusing the same bullet
   against a second JD with too-similar phrasing (a model-risk-analyst headcount bullet and an
   e-commerce cross-sell bullet). Both rewritten with a genuinely different lead clause.
2. **British spellings carried over from `PERSONAS.md`/`JD_BANK.md` source text.** The two
   source files use British forms throughout (the corpus brief flags this explicitly). A
   post-generation sweep found and Americanized: `labour→labor`, `programme(s)→program(s)`,
   `organisation(al)→organization(al)`, `optimisation/optimiser→optimization/optimizer`,
   `centre(s)→center(s)`, `behavioural→behavioral`, `modelled→modeled`, `analysed→analyzed`,
   `analyser→analyzer`, the verb use of `Analyses→Analyzes` (the noun plural `analyses`, same in
   both dialects, was left alone), `utilisation→utilization`, `authorisation/authorised→
   authorization/authorized`, `catalogue→catalog`, `fulfilment→fulfillment`, `moulding→molding`,
   `rationalisation/rationalised→rationalization/rationalized`, `standardising→standardizing`,
   and one medical term, `haemolysis→hemolysis`. Re-ran the full validator suite afterward to
   confirm no new duplicates or ban-list hits were introduced by the sweep.

No rows were quarantined to `_rejected/`.

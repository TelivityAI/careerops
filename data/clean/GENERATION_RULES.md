# CareerOps clean SFT corpus — generation contract

Read this before generating anything. It applies to every session and every row.

You are producing supervised fine-tuning data for a 2B model that runs a person's job search.
Every row must be shippable as a product gold example. Volume without quality is failure.
If unsure about a row, reject and regenerate. Never pad to hit a count.

---

## Output

Directory: this file's own directory — `CareerOps/data/clean/` in the Drive-synced repo.

One `.jsonl` per task, named exactly as the task. Rejected rows go to `_rejected/<task>.jsonl` with a `reason` field.

---

## Schema — every line

```json
{
  "task": "<exact_task_name>",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "metadata": {
    "persona_id": "<id from PERSONAS.md, or null>",
    "source": "synthetic",
    "license": "synthetic",
    "personal_data": false,
    "generator_model": "<model you are running on>",
    "quality_pass": true
  }
}
```

- Exactly 2 messages, user then assistant. Both non-empty. No system role inside the row.
- `personal_data` is always `false`.
- `quality_pass: true` only after the row passes the checklist below. Never default it.

---

## Hard bans — reject the row

**The authoritative machine-checked list is `scripts/privacy/ban_list.txt` (Cursor maintains it). Read it before generating.** The rules below are additional and are checked by human review, not only by grep.

- Any real person's name, email, phone, LinkedIn, address
- Any real company name (use only companies invented in PERSONAS.md / the JD bank)
- `[PLACEHOLDER]`, literal `nan`, `None`, `variant `, camelCase run-together words (`systemSupported`)
- The same sentence skeleton three or more times in a file
- Stamp loops: `"<Company>: point one is X today. <Company>: point two is Y next."` — this pattern destroyed the previous model, reject on sight
- Any fact in the assistant answer that is not present in the user message
- Buzzword filler: "results-driven", "dynamic professional", "proven track record", "leverage synergies", "passionate about", "In today's fast-paced", "Delve", "I hope this email finds you well"
- Contradictions inside one answer (two different numbers for the same thing)
- A score with no reason, or a reason that does not match the score

Contacts, when needed: `*.example.com` and `555-01xx` only.

---

## Quality bar

**Grounding.** Every proper noun, number, job title, and skill in the assistant text must appear in the user message. Generic connective words are fine. Anything else is a reject.

**Specificity.** A stranger reading only the assistant answer should know what to do next or what changed. Not a generic essay.

**Diversity.** At least 70% of assistant answers in a file must be distinct. Two rows sharing their first 12 tokens count as duplicates. No single persona in more than 5% of a file.

**Length.** The per-task word caps below are hard — those are what you generate against.

The 384-token figure quoted in earlier drafts of this file was wrong and has been removed. Seven of twelve files already exceed it, and no row should be trimmed to satisfy it. The real constraint is the training `max_length`, which must be set high enough that **no row truncates** — truncation drops the assistant answer off the end and teaches the model a cut-off label, which is worse than a long row. Measured ceiling for this corpus is `match_grading` at ~5.8k characters ≈ 1,800 tokens, so training needs `max_length` 2048. Do not trim source text to fit a smaller window.

**Voice.** Plain, specific, professional. Short sentences. No AI tells.

---

## Self-QA before writing each row

All five must be YES:

1. No banned content, no real identity, no real company?
2. Every fact traceable to the user message?
3. Correct task shape and inside the length cap?
4. Not a near-duplicate of another row in this file?
5. Would a senior user trust this as the model's default answer?

Any NO → regenerate, up to 2 retries → then quarantine to `_rejected/` with the reason. Never ship a quarantined row.

---

## Process

1. Generate in batches of 25.
2. After each batch, before continuing: JSON-parse every line, check length caps, grep the ban list, measure duplicate rate.
3. After finishing a file: read 15 random rows. If more than one fails, regenerate the worst 20% of the file before moving on.
4. Log what you rejected and why — it goes in QUALITY_REPORT.md.

---

## Task specs

| task | cap | shape |
|---|---|---|
| `bullet_rewrite` | 60 words | One résumé bullet in, one sharper bullet out. Same facts. Stronger verb. No new metrics, ever. |
| `cover_open` | 50 words | Opening 1–2 sentences of a cover letter. Hooks on something specific in the JD. No résumé dump. |
| `cover_proof` | 80 words | Exactly one proof point drawn from one allowed résumé fact. Concrete. Not a whole letter. |
| `cover_close` | 40 words | Closing with a soft, clear ask. No new claims. |
| `resume_summary` | 80 words | 2–4 sentences for the top of a résumé. Only facts from the input. Hiring-manager readable. |
| `resume_analysis` | 120 words | Fit, gaps, risks. Structured. Every claim grounded. NOT a rewritten résumé. |
| `bullet_select` | — | JSON array of bullet IDs, priority order. Every ID must exist in the input list. Nothing else. |
| `skills_filter` | — | JSON array. Must be a subset of the master skills list AND relevant to the JD. No invented skills. |
| `jd_parsing` | — | Valid JSON, exact keys: company, title, seniority, location, requirements. Every value a verbatim substring of the JD. No markdown fences. |
| `match_grading` | — | JSON: score 0–100, summary, strengths[], gaps[]. Judge substance, not vocabulary. Score and reasoning must agree. |
| `board_triage` | 120 words | Given a board, the 2–4 things to do today in order, each with a one-line why citing a signal from that role. |
| `prioritisation` | 120 words | Strict ranking plus what to drop. One line per item. No ties without a stated rule. |
| `stage_moves` | 60 words | One role's state in, the legal next transition out, reason tied to the signal. |
| `followups` | 80 words | Concrete follow-up: what to say and when. Never a bare "just checking in". |
| `search_strategy` | 120 words | Named channels, example queries, filters to change. Unique per row. Zero stamp loops. |
| `app_operation` | 100 words | Step-by-step how-to for the real CareerOps UI as described in PRODUCT.md. Never invent UI. |

---

## Never

- Read the user's real data: `career-ops-private/assets/cv.md`, `pipeline.db`, `profile.yml`, `personal_board.tsv`, reports, CRM, or the live Supabase tables. This corpus must contain zero personal rows.
- Reuse any row from a prior rejected training set.
- Ship a row that failed self-QA in order to hit a count.

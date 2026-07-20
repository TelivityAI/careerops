# Side-by-side audit — CareerOps-4B vs reference

Source: `eval/reports/eval_report.md` (20 stratified held-out gens).  
Rubric: **PASS** = learned the task (format + substance near gold); **PARTIAL** = right genre but wrong call / missing key gold; **FAIL** = wrong facts or wrong product behavior.

| # | Task | Verdict | Notes |
|---|------|---------|--------|
| 1 | `app_operation` | **FAIL** | Invents a **"Save text" button**. Gold: **autosave**, no save button, ~800ms debounce + "saved to the card ✓". Sounds confident, product-wrong. |
| 2 | `board_triage` | **PARTIAL** | Right voice (short, kill dead threads). **Wrong priority:** puts Marrow Ridge first; gold says **Wexley is the recoverable one**. Still vastly better than base waffle. |
| 3 | `bullet_rewrite` | **PASS** | Keeps **12% / 31 / three handlers**; JD-hooks without inventing metrics. Near-paraphrase of gold. |
| 4 | `bullet_select` | **PARTIAL** | Correct **list format** `[…]`. Ordering **wrong** vs gold `[2,5,9,1,8,10]` → model `[1,2,3,10,8]`. Learned schema, not ranking. |
| 5 | `cover_close` | **PARTIAL** | Right length + ask about advisory session. Invents **"I've run advisory sessions… three times a year"** — not in prompt (hallucinated personal proof). |
| 6 | `cover_open` | **PARTIAL** | Hooks survey/Joint Commission. Invents **"led two Joint Commission surveys"** — not in prompt. Gold is more careful (discipline/trail, no fake count). |
| 7 | `cover_proof` | **PASS** | Preserves **$1.7M**, detention, two facilities, scheduled-appointment; maps to Houston accessorial ask. No metric invention. |
| 8 | `followups` | **PASS** | Core action correct: **send the references today**. Slightly softer than gold ("close the row") but task-learned. |
| 9 | `jd_parsing` | **PASS** | Valid JSON; fields match gold **exactly** (company/title/seniority/location/requirements). |
| 10 | `match_grading` | **PASS** | Valid JSON only; score **40** vs gold **38** (base soft **65**). Strengths/gaps aligned (ops mindset, wrong industry/level, no DMAIC). The failure mode that mattered is fixed. |
| 11 | `prioritisation` | **PASS** | Order matches gold (Bellrose → Bramble → Palladia → Wickham); correctly drops Wickham as the reach. |
| 12 | `resume_analysis` | **PARTIAL** | Keeps real metrics; argues fit. **Misreads gap:** invents store-labor as match and invents **"$110M"** CFO budget not in prompt. Gold: delivery match strong, **store ops gap** is the point. |
| 13 | `resume_summary` | **PASS** | Uses **only** given facts; no invention. Slightly more rhetorical than gold but clean. |
| 14 | `search_strategy` | **FAIL** | Answers as if user should filter **their own board by ghost risk** — not how to detect real postings *before* applying. Gold: careers-page check, post age, repeated title. Wrong task. |
| 15 | `skills_filter` | **PARTIAL** | Valid JSON list; too aggressive — drops strong matches gold keeps (`cruise revenue`, `net yield`, `onboard revenue`, `DTC`, `trade partner`). Under-selects. |
| 16 | `stage_moves` | **PARTIAL** | Sees dead req (off page + bounce). Gold: **applied → closed**, stop. Model: still send email to general HR — softer, less decisive than gold. |
| 17 | `app_operation` | **FAIL** | Onboarding answer is **fabricated** (cookies/remote policy). Gold: five sections (roles, about you, résumé, AI keys, how you'll use it). Product UI still unlearned. |
| 18 | `board_triage` | **PASS** | Halvard first (interview A/92%), Bellrose drop — matches gold intent. Close enough to ship as board-ops demo. |
| 19 | `bullet_rewrite` | **PASS** | Keeps **34→12**; hooks monthly controller reconciliation. No invented numbers. |
| 20 | `bullet_select` | **PARTIAL** | Format OK; ranking differs from gold (`[3,1,…]` vs `[2,1,6,3,…]`). Puts health-score first (reasonable for JD) but not calibrated to gold. |

## Scorecard

| Bucket | Count | IDs |
|--------|------:|-----|
| PASS | **9** | 3, 7, 8, 9, 10, 11, 13, 18, 19 |
| PARTIAL | **8** | 2, 4, 5, 6, 12, 15, 16, 20 |
| FAIL | **3** | 1, 14, 17 |

**9 / 8 / 3** on 20.

## What “learned the task” vs “sounds like the task”

**Learned (ship these demos):**
- Structured outputs: `jd_parsing`, `match_grading` JSON, `bullet_select` list shape, `skills_filter` JSON
- Grounded short writing: bullet rewrite / cover proof — **metrics preserved**
- Board ops voice: prioritisation, followups, board triage #18 — decisive, anti-waffle vs base

**Sounds like / still broken:**
- **Product UI (`app_operation`)** — 0/2. Will embarrass in a product-FAQ demo.
- **Hallucinated personal proof** in cover open/close (fake survey count / advisory sessions)
- **Select ranking** not calibrated (format yes, order no)
- **search_strategy** wrong problem framing

## Publish recommendation (unchanged hard lock)

Safe claim: *clean QLoRA board/ops + short grounded writing specialist; val loss honest; structured JSON tasks work.*  
Unsafe claim: *knows CareerOps product UI* or *bullet ranking is calibrated*.

Do **not** lead a launch with app_operation or search_strategy samples.

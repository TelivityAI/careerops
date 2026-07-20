# CareerOps Beast Plan — small-model product

> **Source of truth:** `/Users/dusanmac/careerops-work` (`TelivityAI/careerops`).  
> Drive copy is stale — do not train or sync from it (`docs/SYNC_FROM_DRIVE.md`, `docs/NEXT_TRAIN.md`).  
> **Hard lock:** do **not** open GitHub / HF / Kaggle public or publish the launch post without explicit user approval.

**Goal:** Make CareerOps-4B a beast *product* loop on a small model — grounded ops + decomposed writing — by fixing data/task design, retraining privately, and shipping UX that puts humans on ranking/importance.

**Architecture:** Ops model stays structured (triage, stage, match, parse, short rewrites). Humans own ranking/bullet importance in UI. Code assembles docs. Optional Writer specialty later.

**Train locks:** `max_length=768`, T4×2, packing=False, LR `1e-4`, PEFT named_modules walk (~205 targets). See `docs/NEXT_TRAIN.md`, `docs/MERGE_GGUF.md`.

---

## 1. Goal / non-goals

### Goal
- [ ] Ship a private next-gen CareerOps-4B that feels sharp in the **match → select → write → edit → rematch** loop
- [ ] Fix failure modes via **better gen + task design + retrain**, not by raising `max_length` or stuffing UI FAQ into weights
- [ ] Keep ranking / bullet importance a **human** decision in product UI (not soft ranking from the small model)
- [ ] Private adapter → merged → GGUF checklist every train cycle

### Non-goals
- [ ] ~~Open public / launch post~~ — **explicitly out of scope until user says go** (see §7)
- [ ] One-shot full résumé / full cover letter as model gold
- [ ] Teaching product FAQ via `app_operation` weights (UI help = docs/runtime)
- [ ] Raising train ceiling above **768** to paper over long rows
- [ ] Soft-ranking bullets or jobs inside the model as product truth

---

## 2. Product loop — model vs human

Iterative card loop (product owns UX; model owns short structured calls):

```text
match  →  select  →  write  →  human edit  →  rematch
  ↑                                              |
  └──────────────── versions / re-run ───────────┘
```

| Step | Owner | Model does | Human does |
|---|---|---|---|
| **Match** | model + UI | Score + short why (`match_grading`); structured fit signals | Accept / override score narrative; decide chase vs skip |
| **Select** | **human** (UI) | Optional assist: propose candidate bullet IDs only — **not** importance ranks | **Ranks / picks** which bullets matter for this JD |
| **Write** | model + assembler | Short calls: rewrite one bullet, summary, skills, cover open/proof/close | Triggers generate; reviews drafts |
| **Edit** | **human** | — | Edits text; version history |
| **Rematch** | model + UI | Re-grade against updated selection/draft | Decides if good enough to apply / next stage |

**Ops stays structured:** `board_triage`, `prioritisation`, `stage_moves`, `followups`, `jd_parsing`, `match_grading`, `search_strategy` (re-prescribed), decomposed writing pieces.

**Flow (product):** job card shows Flow state — not “guessing.” Bigger popup + versions = separate Claude UI track (§6).

---

## 3. Data / gen fixes before next train

Do these **before** merge → Kaggle. Prefer regen/rebalance over more GPU.

### Checklist

- [ ] **Cover grounded** — spot-audit `cover_open` / `cover_proof` / `cover_close`: every claim ⊆ user facts; no résumé dump; diversify closings (no stamp loops)
- [ ] **`search_strategy` re-prescribe** — rewrite gold: named channels + example queries + filters; unique per row; ban “Company: … today” skeletons; Opus 4.8 judgment bar
- [ ] **`stage_moves` Closed ~25%** — grow `→ closed` destinations to ~20–25% of file (dead-req / self-withdraw signals); fold into same regen pass (`docs/NEXT_TRAIN.md`)
- [ ] **Omit `app_operation` from weights** — drop from `scripts/merge_train_val.py` task list; file may stay on disk; never claim as sold skill; UI help = docs/runtime
- [ ] **`bullet_select` → select-not-rank (or deprecate)** — gold = JSON IDs to keep for JD, **not** soft importance order; product ranking stays human. If task still teaches rank-like behavior → narrow schema or deprecate for product path
- [ ] **Length / privacy gates** — `scripts/preflight_corpus.sh`; ban-list grep; ≥70% distinct on generative tasks; `match_grading` stays ≤~700 tok under 768 ceiling (`docs/MATCH_GRADING_REGEN.md`)
- [ ] **Remerge** — `careerops_train.jsonl` / `careerops_val.jsonl` **without** `app_operation`
- [ ] Update `MANIFEST.md` + `QUALITY_REPORT.md` for this pass

### Explicitly keep
- Decomposed writing path (no one-shot long gold)
- Synthetic/public-only rows; `personal_data: false`
- Opus 4.8 judgment / Sonnet 5 prose split unless table updated

---

## 4. Optional CareerOps-Writer split

**When:** After ops model is solid in the product loop *and* writing sxs still lags (PARTIALs/FAILs on rewrite/cover) despite grounded regen.

**Why:** Ops wants crisp structured JSON/decisions; Writer wants prose voice. One E2B adapter may keep splitting capacity.

**How (later, not blocking):**
- [ ] Freeze ops specialty on current task mix (minus `app_operation`)
- [ ] Separate Writer SFT: `bullet_rewrite` + cover pieces + `resume_summary` (+ maybe `resume_analysis`)
- [ ] Product routes: ops model for board/match; writer model for generate step
- [ ] Same privacy + 768 locks; private publish only until approval

**Default now:** one CareerOps-4B ops-oriented adapter; Writer deferred.

---

## 5. Train → eval → private GGUF publish checklist

### Train
- [ ] Corpus accepted (schema, privacy, length, spot-check)
- [ ] Kaggle: **force T4×2** (never P100); secret `HF_TOKEN` attached after push
- [ ] Config: batch 2×2 accum, LR `1e-4`, cosine, warmup 30, `max_grad_norm` 0.3, `bnb_4bit_compute_dtype=float32`, `fp16=False`, packing **False**, grad checkpoint True, `max_length=768` **LOCKED**
- [ ] Smoke: DDP boots, ~205 PEFT targets, one step no nan
- [ ] Full QLoRA → push adapter to **private** `telivity/CareerOps-4B` (overwrite/new rev — keep private)

### Eval
- [ ] Val loss vs base (report private)
- [ ] Side-by-side on trained tasks; write/update audit (honest PASS/PARTIAL/FAIL)
- [ ] Privacy probe (ban-list); must stay clean
- [ ] Product-loop smoke: match → select (human) → write → edit → rematch on a few cards

### Private merge + GGUF
- [ ] Merge → **private** `telivity/CareerOps-4B-merged` (`docs/MERGE_GGUF.md`)
- [ ] GGUF Q4_K_M → **private** `telivity/CareerOps-4B-GGUF` as `GGUF-CareerOps-Q4_K_M.gguf`
- [ ] README / model card still private; claims match eval (no fake green)

---

## 6. Parallel: UI redesign (hand off)

**Owner:** Claude (separate prompt / session) — **not** this train track.

Scope note for handoff:
- Bigger job-card popup
- Flow as explicit state (not guessing)
- Iterative loop: match ↔ select ↔ generate ↔ human edit ↔ match again
- Versions on drafts
- Human ranking / bullet importance controls in UI
- Docs/runtime for product help (not model FAQ)

Cursor/train track only consumes UX facts when they affect task schemas (e.g. select-not-rank). Do not block train on pixel-perfect UI.

---

## 7. Explicitly NOT in this plan

| Item | Status |
|---|---|
| Flip GitHub `TelivityAI/careerops` → public | **Blocked** — needs explicit approval |
| Flip HF `CareerOps-4B` / merged / GGUF → public | **Blocked** |
| Flip Kaggle datasets/kernels → public | **Blocked** |
| Publish `docs/LAUNCH_POST.md` | **Draft only** — publish after approval |
| Mark star-magnet `open-public` todo done | **Do not** until user approves |

Private ship of adapter + merged + GGUF is already done for the current rev. Beast track = next quality loop **still private**.

---

## Quick order of operations

1. Data/gen fixes (§3) → preflight → remerge  
2. Private train → eval → private GGUF (§5)  
3. UI redesign in parallel (§6)  
4. Optional Writer split only if still needed (§4)  
5. Public / launch **only** after explicit yes (§7)

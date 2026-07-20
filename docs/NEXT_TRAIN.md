# Next train — operator notes

Private operator checklist for the next SFT run. Not a public claims doc.

## `stage_moves` — grow Closed

Current corpus: **10 / 100** rows end `→ closed` (10%). Held-out sxs shows the model still soft on dead-req closes (email HR instead of `applied → closed`).

**Target for next train:** ~**20–25%** Closed destinations (about +10–15 rows, or rebalance within 100). Prefer real dead-req / self-withdraw signals over inventing new transitions.

Do not retrain solely for this; fold into the next planned epoch/regen.

## `app_operation` — omit from sold skills

Corpus file `data/clean/app_operation.jsonl` (110 rows) may stay on disk for now. **Next train:** drop it from the merge (`scripts/merge_train_val.py` task list) so weights stop treating product FAQ as a model skill. Product UI help stays in app docs/runtime.

Public README / launch copy must not claim `app_operation`.

# Sync note — Drive is NOT source of truth

**Do not sync FROM Google Drive into `careerops-work`.**

Source of truth: `/Users/dusanmac/careerops-work` (`TelivityAI/careerops` / `origin/main`).

The Drive tree at  
`~/Library/CloudStorage/GoogleDrive-dusanmilicevic33@gmail.com/My Drive/CareerOps`  
is a **stale live trap** (see `WARNING_STALE_DO_NOT_USE.md` there and `docs/NEXT_TRAIN.md`). Do not upload Kaggle datasets from Drive. Do not pull Drive corpora over scrubbed files.

If you ever need to push a one-off artifact *to* Drive for human browsing only, copy **from** `careerops-work` — never the reverse — and still train only from `careerops-work`.

# Sync Claude’s Drive corpus → this git clone

Claude writes under Google Drive:
`…/My Drive/CareerOps/data/clean/`

This clone is:
`~/careerops-work`

Drive was often permission-locked from Cursor. When Claude finishes MG regen:

```bash
SRC="$HOME/Library/CloudStorage/GoogleDrive-dusanmilicevic33@gmail.com/My Drive/CareerOps/data/clean"
DST="$HOME/careerops-work/data/clean"
rsync -av --progress "$SRC/" "$DST/"
cd "$HOME/careerops-work"
bash scripts/preflight_corpus.sh data/clean
```

Do not commit JSONL until preflight passes. Then:

```bash
git add data/clean/*.jsonl data/clean/MANIFEST.md data/clean/QUALITY_REPORT.md data/clean/_rejected
git commit -m "Add clean SFT corpus (MG compact regen)."
# push when ready
```

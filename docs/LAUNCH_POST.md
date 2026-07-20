# Launch post draft

Status: **DRAFT** — edit before publishing.

## Working title
CareerOps-4B: a small open model that runs a job search board (not another résumé dump)

## Hook (1–2 sentences)
Most “career” models write long essays and invent experience. CareerOps-4B is trained for short, grounded ops: triage a board, move stages, follow up, and rewrite **one** bullet at a time — then code assembles the doc.

## Demo
- Live app: https://careerops.telivity.app
- Weights: `telivity/CareerOps-4B` on Hugging Face
- Repo: https://github.com/TelivityAI/careerops

## What it is good at
- Board triage / prioritisation / stage moves / follow-ups
- JD parse + match grade (compact)
- Decomposed writing: select → rewrite one → summary → skills → assemble

## What it is not
- Not a one-shot full résumé/cover generator
- Not trained on a private person’s real job history for the public weights
- Not a magic interview coach
- Product UI help is served from the app docs/runtime, not the weights

## Local path (3 steps)
1. Pull GGUF / adapter from HF
2. Point CareerOps skill / local LLM at it
3. Or use the hosted app

## Honesty block (keep)
Base: Gemma 4 E2B-it. QLoRA on T4×2. ~2.4k clean synthetic/public rows. Long writing is a product pipeline, not a single completion.

## Channels
LocalLLaMA first, then HN Show HN / short X thread. LinkedIn optional.

## Checklist before post
- [x] Corpus privacy + length audit complete
- [x] Val loss + side-by-sides saved in repo
- [x] Privacy probe empty (10/10)
- [ ] HF + GitHub visibility set as intended
- [ ] README matches claims

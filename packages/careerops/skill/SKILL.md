---
name: careerops
version: 1.1.0
description: CareerOps agent skill — scan, evaluate, rank, tailor, interview, followup, and outcome modes for a materials-first job search. Never invents experience. Never auto-applies.
---

# CareerOps skill

Operate on the user's **board pack** (exported JSON from the CareerOps web app) or their self-hosted Supabase project.

## Doctrine (non-negotiable)

1. **No invented facts** — employers, titles, dates, metrics, and skills must come from the user's materials.
2. **No auto-apply** — drafts are copy/paste only; the human submits on the employer site.
3. **Tags ≠ stage moves** — Apply / Stretch / Skip are suggestions until the user acts.

## Modes

| Mode | Purpose |
|------|---------|
| `scan` | Review sourced roles; flag blocklist, age, remote, duplicates |
| `evaluate` | Build a decision pack (summary, risks, suggested call) |
| `rank` | Order roles by fit signals without applying |
| `tailor` | Draft resume/cover from checked materials only |
| `interview` | Prep angles + story-bank prompts |
| `followup` | Draft follow-up / thank-you notes (never send) |
| `outcome` | Record offer/reject notes for a role |

See `modes/` for prompts. Prefer reading `CareerOps_board_pack.json` when offline.

## Setup

```bash
npx @telivity/careerops init
```

This copies the skill into local agent folders and writes `web/config.js` from `web/config.example.js` when present.

## Board pack

Export from **Settings → Your data → Board pack (skill)** in the web app. The pack includes roles, materials, match/evaluate reports, story bank, and outcomes — never API keys.

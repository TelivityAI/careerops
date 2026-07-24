# CareerOps

**Your private job-search command center.**  
Find roles, track the pipeline, check fit, and generate tailored drafts from **only what you provide** — then you apply yourself.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-careerops.telivity.app-0ccabf)](https://careerops.telivity.app)
[![npm](https://img.shields.io/npm/v/@telivity/careerops.svg)](https://www.npmjs.com/package/@telivity/careerops)
[![Skill](https://img.shields.io/badge/agent%20skill-careerops-0ccabf)](docs/SKILL.md)

**Live demo:** [careerops.telivity.app](https://careerops.telivity.app)  
**Model weights (separate):** [CareerOps-4B on Hugging Face](https://huggingface.co/telivity/CareerOps-4B)  
**Agent skill:** `npx @telivity/careerops@1.1.0 init` (or latest) — modes scan / evaluate / rank / tailor / interview / followup / outcome ([docs](docs/SKILL.md))

---

## Why this exists

Most “AI career” tools do one of two things badly:

1. **Spam boards** and invent experience so the resume “matches.”  
2. **Dump a wall of text** that you can’t trust in an interview.

CareerOps is built for people running a real search like an ops problem:

- A **kanban** you actually drag (you own the stages).  
- A **decide** surface (drawer): JD, match, materials gaps, Apply / Stretch / Skip as *tags only*.  
- A **write** surface (builder): pick your bullets → generate → edit → save versions → download Word → open the real JD and apply.

The product doctrine is blunt and encoded in the UI:

> AI may only improve **truth you already provided**.  
> Gaps are “in your materials / worth adding?” — not shame.  
> **Education is yours** — Generate does not rewrite it.  
> Saving **never overwrites** — every save is a new version.

---

## What you get

### 1. Find — fill the board with hygiene

Sourced → Researched → Conversation → Applied → Interview → Offer → Rejected → Closed.

- **Run job search** scans live company career boards (Greenhouse / Ashby / Lever-style sources) using your titles, keywords, seniority, and locations.  
- **Find hygiene** (Settings): company **blocklist**, **max posting age**, **remote preference**, and soft-hide of blocked / stale / non-matching roles.  
- **Triage** on Sourced: batch match, dedupe, sort/filter by verdict — tags scores only; never applies.  
- **Add role**: paste **link + job description** when a scrape is incomplete.  
- **LinkedIn**: no LinkedIn API — opens Google `site:linkedin.com/jobs` from your prefs; you paste links back in.  
- Cards stay calm: company, title, optional PDF/sent markers, staleness — not a screaming match % on every card.

### 2. Decide — drawer evaluate

Click a card:

- Load or paste the JD (with provenance: from link / pasted / saved).  
- **Garbage JD reject**: careers/marketing scrapes are refused so you don’t “match” against a homepage.  
- **Check my match** → score + materials coverage (“N of M in your materials”).  
- Gaps split into **In your materials** vs **Worth adding?**  
- **Evaluate pack**: structured call suggestion (Apply / Stretch / Skip) — tags the card only; does **not** apply for you or move columns.  
- Interview angles, research/outreach drafts, and outcome notes when you need them.  
- **Follow-ups**: Applied / Interview roles surface a due strip so nothing goes silent.

### 3. Write — builder with locks, review, sent

- Left: **Summary / Experience / Skills** nav + tick bullets that feed Generate.  
- **Section locks**: Education locked by default (AI won’t overwrite); optional Experience lock.  
- Center: draft paper, **Review draft** (lists issues only — never edits for you), Word export, append-only **Saved versions**.  
- **Sent** marker freezes a version until you unfreeze — so you know what left the building.  
- Right: match hero, gap cards, **Generate draft** (resume and/or cover).  

Hard rules in code, not just marketing:

- Inserting a gap **requires** your detail / a checked bullet — it will **not** paste the gap title as a fake accomplishment.  
- Generate is driven by **checked experience** + materials you added.  
- Versions are **append-only** with human names like `Company — Role — date`.

### 4. Bring your own model + offline skill

- Optional **BYO** keys in Settings: Anthropic (Claude), Kimi, or any **OpenAI-compatible** base URL + key + model (your bill). Free-tier messaging when no key.  
- **Board pack** export (Settings → Your data): sanitized JSON for local agent skill runs — API keys never included.  
- Agent skill via `npx @telivity/careerops init` — modes scan / evaluate / rank / tailor / interview / followup / outcome.  
- Exports strip API keys. Event logging stores **action names / ids**, not resume or JD text.  
- Banner doctrine: treat AI text as a draft; **never invent** experience; you apply on the employer site.

---

## How people use it (core loop)

```text
Sign in → set titles/keywords/locations (+ paste resume)
    ↓
Fill the board (search / LinkedIn helper / Add role)
    ↓
Drag cards as the search progresses
    ↓
Open a role → match → fill materials gaps with YOUR facts
    ↓
Build resume → tick bullets → Generate → edit → Save version
    ↓
Download Word → Open JD → apply on the employer site
```

Follow-ups: roles in Applied / Interview surface a due strip (~14 days) so nothing goes silent.

---

## Screenshots

> **Privacy:** do not commit screenshots of a real personal board. Use a throwaway demo account with fake companies, or crop to chrome-only.

| Shot | What to capture |
|------|------------------|
| Login | Brand + sign-in (safe on the public demo logged out) |
| Board | Empty or fake cards across stages |
| Add role | Link + JD paste modal |
| Drawer | Match % + materials gaps (fake JD) |
| Builder | Three panes: bullets · draft · gaps |

Drop files under `docs/images/` and link them here when ready:

```markdown
![Login](docs/images/01-login.png)
![Board](docs/images/02-board.png)
![Builder](docs/images/03-builder.png)
```

**Demo:** [careerops.telivity.app](https://careerops.telivity.app)

---

## Quick start (self-host)

```bash
git clone https://github.com/TelivityAI/careerops.git
cd careerops
cp web/config.example.js web/config.js
# edit web/config.js → YOUR Supabase URL + anon/publishable key

./scripts/deploy-web.sh
```

That deploys `web/` to Vercel. Any static host works if you serve `web/` with your `config.js`.

### What this repo includes

| Path | Purpose |
|------|---------|
| `web/` | The dashboard SPA |
| `.agents/skills/careerops/` | Open Agent Skill (CLI symlinks under `.claude` / `.codex` / `.opencode`) |
| `packages/careerops` | `npx @telivity/careerops init` |
| `docs/SKILL.md` | Public skill overview |
| `scripts/deploy-web.sh` | One-command Vercel deploy |
| `LICENSE` | Apache-2.0 |
| `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` | Community health |

### What you must bring

Cloning the SPA alone is **not** a full backend:

1. **Supabase** project with Auth (email and/or Google), RLS, tables used by the client (`mt_profiles`, `mt_roles`, `mt_reports`, `mt_events`), and a `reports` storage bucket if you use Jobscan PDF attach.  
2. **Edge functions** the client calls: `run-search-mt`, `fetch-jd`, `resume-match`, `resume-rewrite`, `chat`, `ai-free`, (optional) `humanize` — with your own secrets.  
3. **`web/config.js`** (gitignored) — never commit real keys to a public fork.

The hosted demo is Telivity’s instance. Forks should use **their** project, not the demo credentials.

---

## Architecture (short)

```text
Browser (static SPA)
   │  Supabase JS (auth + Postgres + storage)
   ▼
Your Supabase project
   │  Edge Functions (search, JD fetch, match, rewrite, chat, free AI)
   ▼
Optional model providers (Claude / Kimi / OpenAI-compatible) via YOUR keys or free tier
```

- **UI IA:** board → drawer (decide) → builder (write). Escape hatch: `?legacy=1` for the old centered role panel.  
- **Mobile:** board + drawer; builder asks for a larger screen.  
- **Config:** `window.CAREEROPS_CONFIG` from `config.js` (see `web/config.example.js`).  
- **Skill:** export a Board pack from Settings for offline agent modes, or point the skill at your Supabase/`config.js`.

---

## Agent skill (optional)

```bash
npx @telivity/careerops init
```

Installs `.agents/skills/careerops/` and symlinks for common agent CLIs. See [docs/SKILL.md](docs/SKILL.md). The web board remains the human SoT; the skill is a power-user front door that respects the same doctrine.

---

## Model vs app

| | |
|--|--|
| **This repo** | Forkable **dashboard** (deployable SPA) |
| **Hugging Face** | **CareerOps-4B** weights ([adapter](https://huggingface.co/telivity/CareerOps-4B) / [merged](https://huggingface.co/telivity/CareerOps-4B-merged) / [GGUF](https://huggingface.co/telivity/CareerOps-4B-GGUF)) |

Training/eval corpora and kernels are **not** in this public repo — they live in Telivity’s private ops vault. Public model weights are on Hugging Face only.

The live UI’s match/rewrite path goes through Supabase edge functions — it does **not** load HF weights in the browser.

---

## What CareerOps deliberately does *not* do

- Auto-apply or LinkedIn automation  
- Invent employers, titles, metrics, or education  
- Treat Apply/Stretch/Skip as “we applied for you”  
- Depend on Jobscan’s API (optional PDF/text attach only)  
- Quietly overwrite saved drafts  

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).  
Be kind: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).  
Security: [SECURITY.md](SECURITY.md).

---

## License

Copyright © Telivity and contributors.  
Licensed under the [Apache License, Version 2.0](LICENSE).

---

## Releases

Versioning follows git tags (`v1.1.0`, …). See [CHANGELOG.md](CHANGELOG.md).  
Publish: `cd packages/careerops && npm publish --access public` (or the `Release` workflow when `NPM_TOKEN` is set).


# CareerOps

**Your private job-search command center.**  
Find roles, track the pipeline, check fit, and generate tailored drafts from **only what you provide** — then you apply yourself.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-careerops.telivity.app-0ccabf)](https://careerops.telivity.app)

**Live demo:** [careerops.telivity.app](https://careerops.telivity.app)  
**Model weights (separate):** [CareerOps-4B on Hugging Face](https://huggingface.co/telivity/CareerOps-4B)

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

### 1. Pipeline board (8 stages)

Sourced → Researched → Conversation → Applied → Interview → Offer → Rejected → Closed.

- **Run job search** scans live company career boards (Greenhouse / Ashby / Lever-style sources) using your titles, keywords, seniority, and locations.  
- **Add role** (on the Researched column and in the header): paste **link + job description** — you don’t wait on a broken scrape.  
- **LinkedIn**: no LinkedIn API. Opens Google `site:linkedin.com/jobs` (and LinkedIn search) from your Settings prefs, then you paste links back in.  
- Cards stay calm: company, title, optional PDF/sent markers, staleness — **not** a screaming match % on every card.

### 2. Side drawer — decide

Click a card:

- Load or paste the JD (with provenance: from link / pasted / saved).  
- **Garbage JD reject**: careers/marketing scrapes (nav chrome, “Loading…”, footers) are refused so you don’t “match” against a homepage.  
- **Check my match** → score + materials coverage (“N of M in your materials”).  
- Gaps split into **In your materials** vs **Worth adding?**  
- **Apply / Stretch / Skip** tag the card only — they do **not** apply for you and do **not** move columns.

### 3. Full-page builder — write

- Left: **Summary / Experience / Skills** nav + tick the experience bullets that feed Generate.  
- Center: draft paper, **Re-check match**, Word export, append-only **Saved versions**.  
- Right: match hero, gap cards, **Generate draft** (resume and/or cover).  

Hard rules in code, not just marketing:

- Inserting a gap **requires** your detail / a checked bullet — it will **not** paste the gap title as a fake accomplishment.  
- Generate is driven by **checked experience** + materials you added.  
- Versions are **append-only** with human names like `Company — Role — date`.

### 4. Honesty by default

- Banner: treat AI text as a draft; it can be wrong; never claim experience you don’t have.  
- Optional **BYO** Anthropic (Claude) or Kimi keys in Settings (your bill). Free-tier messaging when no key.  
- Exports strip API keys. Event logging stores **action names / ids**, not resume or JD text.

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
| `scripts/deploy-web.sh` | One-command Vercel deploy |
| `LICENSE` | Apache-2.0 |
| `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` | Community health |
| `data/`, `eval/`, `kernel/` | Optional assets related to CareerOps-4B training/eval |

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
Optional model providers (Claude / Kimi) via YOUR keys or free tier
```

- **UI IA:** board → drawer (decide) → builder (write). Escape hatch: `?legacy=1` for the old centered role panel.  
- **Mobile:** board + drawer; builder asks for a larger screen.  
- **Config:** `window.CAREEROPS_CONFIG` from `config.js` (see `web/config.example.js`).

---

## Model vs app

| | |
|--|--|
| **This repo** | Forkable **dashboard** (+ optional train/eval trees) |
| **Hugging Face** | **CareerOps-4B** weights ([adapter](https://huggingface.co/telivity/CareerOps-4B) / [merged](https://huggingface.co/telivity/CareerOps-4B-merged) / [GGUF](https://huggingface.co/telivity/CareerOps-4B-GGUF)) |

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

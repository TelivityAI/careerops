# CareerOps web app

Static SPA for the job-search dashboard.

## Configure

```bash
cp config.example.js config.js
```

Set:

- `supabaseUrl` — your Supabase project URL  
- `supabaseAnonKey` — anon or publishable key (safe for browser; protect data with RLS)  
- `donateUrl` — optional  
- `analyticsId` — optional Google Analytics Measurement ID (for example `G-XXXXXXXXXX`). Leave empty to disable analytics.

`config.js` is gitignored in the public repo.

### Google Analytics (optional)

To enable Google Analytics on your deployment, set `analyticsId` in `web/config.js`.

If `analyticsId` is left empty, no Google Analytics script is loaded.

## Deploy

From repo root:

```bash
./scripts/deploy-web.sh
```

Or from this folder: `npx vercel deploy --prod`

## Keyboard shortcuts

- `g` then `b` — Board
- `g` then `m` — Memory
- `g` then `a` — Advise
- `g` then `p` — Portfolio
- `Esc` — close builder / drawer / modal (in that priority order)

Shortcuts are ignored while typing in inputs, textareas, selects, or contenteditable fields, and while the builder, drawer, or a modal is open.

## Schema

Point the app at a Supabase project that has the CareerOps tables (`mt_roles`, `mt_profiles`, `mt_reports`, `mt_accomplishments`, `mt_portfolio_items`, `mt_outcomes`, `mt_interview_events`, `mt_contacts`, …) and auth. Apply `supabase/schema.sql` or Phase 1–3 migrations under `supabase/migrations/`. Use your own project — do not reuse someone else’s demo credentials.

SPA table/bucket cheat-sheet (client-derived): [SCHEMA.md](SCHEMA.md).

Pure Career OS helpers used by the SPA live in `lib/` (bullet memory, cadence, ranking, resume sync, board pack, portfolio, advisor, career durability, interview events, offer compare, version timeline, contacts CRM, ATS comp, salary compare, enrich inbox) and are covered by `npm run test:career-os`.

### Export / import

- **Board pack** (`CareerOps_board_pack.json`) — skill modes + Settings import (upsert). Schema v5 adds contacts, posted `comp_range`/`comp_raw`, and profile target band. API keys never exported or imported.
- **Sample pack** — import [`docs/fixtures/sample-board-pack.json`](../docs/fixtures/sample-board-pack.json) (SEEDED / FICTIONAL) from Settings → Your data to try a populated board without real job data.
- See the [Board Pack schema changelog](../docs/BOARD_PACK.md) for the v1 → v5 schema details.
- **Full JSON** / **CSV** — Settings → Your data.

## Edge functions

> **Source note:** `web/ui/state.mjs` and `web/ui/settings.mjs` call these by name via `sb.functions.invoke(...)`. Reference implementations for most live under [`supabase/functions/`](../supabase/functions/README.md) — deploy those (or your own equivalents) against your Supabase project. **`fetch-jd` and `humanize` are not in this public repo**; self-hosters must supply those (or skip the UI features that call them). Wire the project via `web/config.js`.

| Function | When the UI calls it | Required for a board-only install? |
|---|---|---|
| `run-search-mt` | User clicks **Run job search** (or the onboarding "Run my first search") — scans configured company career boards for matching roles. | **Optional.** Board CRUD works without it; you can add roles manually via **＋ Add role**. |
| `fetch-jd` | Auto-loads a job description from a posting URL — when opening a role's drawer/panel, on ATS "liveness" checks for a card, and after adding a role via LinkedIn/URL search. | **Optional.** You can paste the JD manually via "Edit / paste" instead. |
| `resume-match` | User clicks **Check my match** to score a resume against a JD. | **Optional if** a BYO OpenAI-compatible key is set in Settings (the match runs client-side instead). **Required** for match scoring otherwise. Claude/Kimi keys on file still go through this function. |
| `resume-rewrite` | **Tailor resume**, cover letter, and single-bullet rewrite actions. | Same as above — optional with a BYO OpenAI-compat key, otherwise required for AI tailoring. |
| `chat` | Advise / in-app assistant follow-ups. | Same bypass logic — optional with a BYO OpenAI-compat key, otherwise required for chat/advisor. |
| `ai-free` | Settings screen, to show remaining free-tier daily uses. | **Optional** — cosmetic for the SPA usage display; free-tier LLM serving is configured server-side. |
| `humanize` | **Humanize wording** button. | **Optional** — only used if the user has connected an ai-text-humanizer.com account. |
| `upsert_provider_secret` | Settings save path when storing Claude / Kimi / humanizer secrets. | **Optional.** Without it, Settings falls back to plaintext profile columns for self-host. |
| `clear_provider_secret` | Settings when removing a stored provider secret. | **Optional.** Same plaintext fallback as above. |

**Minimal viable install:** none of the 9 functions are strictly required. Core board operations (add/drag/tag roles, verdicts, outcomes, notes) call Supabase tables directly (`sb.from('mt_roles')`, etc.), not Edge Functions. Search and JD auto-fetch need `run-search-mt` / `fetch-jd`; AI scoring/tailoring/chat need the rest (or a BYO OpenAI-compat key to skip those three client-side); secret vault helpers are only needed if you want encrypted Settings storage instead of plaintext profile columns.

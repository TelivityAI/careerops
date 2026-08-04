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

## Schema

Point the app at a Supabase project that has the CareerOps tables (`mt_roles`, `mt_profiles`, `mt_reports`, `mt_accomplishments`, `mt_portfolio_items`, `mt_outcomes`, `mt_interview_events`, `mt_contacts`, …) and auth. Apply `supabase/schema.sql` or Phase 1–3 migrations under `supabase/migrations/`. Use your own project — do not reuse someone else’s demo credentials.

SPA table/bucket cheat-sheet (client-derived): [SCHEMA.md](SCHEMA.md).

Pure Career OS helpers used by the SPA live in `lib/` (bullet memory, cadence, ranking, resume sync, board pack, portfolio, advisor, career durability, interview events, offer compare, version timeline, contacts CRM, ATS comp, salary compare, enrich inbox) and are covered by `npm run test:career-os`.

### Export / import

- **Board pack** (`CareerOps_board_pack.json`) — skill modes + Settings import (upsert). Schema v5 adds contacts, posted `comp_range`/`comp_raw`, and profile target band. API keys never exported or imported.
- **Full JSON** / **CSV** — Settings → Your data.

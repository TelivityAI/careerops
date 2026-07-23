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

`config.js` is gitignored in the public repo.

## Deploy

From repo root:

```bash
./scripts/deploy-web.sh
```

Or from this folder: `npx vercel deploy --prod`

## Schema

Point the app at a Supabase project that has the CareerOps tables (`mt_roles`, `mt_profiles`, `mt_reports`, …) and auth. Use your own project — do not reuse someone else’s demo credentials.

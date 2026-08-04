# SPA schema cheat-sheet

Tables and storage the CareerOps web SPA touches via Supabase client calls in `web/ui/*.mjs`.

This is a **client-derived** map for self-hosters — not a full DDL. Apply [`supabase/schema.sql`](../supabase/schema.sql) (or the migrations under `supabase/migrations/`) for the real schema + RLS.

Sources checked: `web/ui/state.mjs`, `web/ui/settings.mjs`, cross-checked with `supabase/schema.sql`.

---

## Minimal board install

These are enough for auth + kanban CRUD (no search / match / rewrite / memory):

| Table | Required? |
|-------|-----------|
| `mt_profiles` | Yes |
| `mt_roles` | Yes |
| `mt_reports` | Yes (versions / match artifacts) |
| `mt_events` | Optional (UI logs quietly if insert fails) |

Auth (`auth.users`) is required. Everything below is needed for full Career OS features.

---

## Tables the SPA calls (`sb.from(...)`)

### `mt_profiles`

- **Purpose:** One profile row per auth user (resume, prefs, BYO key flags, cadence, story bank).
- **Key:** `owner` (uuid → `auth.users`).
- **Columns clearly read/written in the client:**
  - `owner`, `email`, `full_name`, `phone`, `linkedin`, `location`
  - `resume_text`, `resume_struct`, `resume_struct_rev`, `structured_modified_at`, `resume_reconcile_needed`
  - `target_titles`, `keywords`, `seniority`, `locations`, `ats_boards`, `onboarded`
  - `ai_key`, `kimi_key`, `openai_base_url`, `openai_key`, `openai_model`
  - `humanizer_email`, `humanizer_pw`
  - `ai_key_on_file`, `kimi_key_on_file`, `humanizer_email_on_file`, `humanizer_pw_on_file`
  - `bullet_memory_cadence`, `cadence_timezone`, `cadence_anchor`
  - `last_entry_at`, `last_prompted_at`, `snoozed_until`
  - `story_bank`, `target_band_min`, `target_band_max`, `target_band_currency`
  - `created_at`, `updated_at` (mostly server-maintained)
- **Notes:** Self-host may store provider secrets as plaintext profile columns. Hosted/vault path uses edge functions + `mt_provider_secrets` (see below) and only surfaces `*_on_file` flags to the SPA.

### `mt_roles`

- **Purpose:** Job-search kanban cards.
- **Columns clearly read/written:**
  - `id`, `owner`, `company`, `title`, `level`, `url`, `source`
  - `fit_score`, `match_score`, `stage`, `ghost_risk`, `jd`, `notes`, `location`
  - `sent_at`, `comp_range`, `comp_raw`
  - `created_at`, `updated_at`
- **Notes:** Board stages are string values such as `sourced`, `researched`, `applied`, … plus a closed stage constant in the SPA — not a separate `status` / `col` column.

### `mt_reports`

- **Purpose:** Append-only artifacts (match, resume/cover drafts, jobscan, evaluate, interview, advisor, selection, …).
- **Columns clearly read/written:**
  - `id`, `role_id`, `owner`, `kind`, `match_score`, `missing_keywords`
  - `rewritten`, `jd_text`, `display_name`, `sent_at`, `created_at`
- **Notes:** For some `kind='jobscan'` rows, `jd_text` holds a **storage path** in the `reports` bucket (PDF), not JD text.

### `mt_accomplishments`

- **Purpose:** Bullet memory (provenance-first accomplishments).
- **Columns clearly read/written:** SPA uses `select('*')` / `upsert` of full rows for the owner — treat columns in `supabase/schema.sql` as authoritative (`body_original`, `body_current`, `revisions`, `status`, promotion/polish fields, tags, etc.).
- **Unknown from partial selects:** none for happy-path UI (loads `*`).

### `mt_portfolio_items`

- **Purpose:** Portfolio library (code / design / product).
- **Columns clearly read/written:** same pattern as accomplishments — `select('*')` / `upsert` per owner; see `schema.sql`.

### `mt_outcomes`

- **Purpose:** User-recorded offer / reject / withdraw / ghost outcomes.
- **Columns clearly read/written:** `select('*')` / `upsert` / `delete` by `owner` + `role_id` — see `schema.sql` (`kind`, amounts, currency, dates, notes, …).

### `mt_interview_events`

- **Purpose:** Scheduled interview rounds (prep drafts live in `mt_reports` with `kind='interview'`).
- **Columns clearly read/written:** `select('*')` / `insert` / `upsert` / `delete` — see `schema.sql` (`round`, `scheduled_at`, `type`, `notes`, `interviewer_name`, …).

### `mt_contacts`

- **Purpose:** Recruiter / network CRM (draft + log only; never auto-send).
- **Columns clearly read/written:** `select('*')` / `insert` / `upsert` — see `schema.sql` (`name`, `channel`, `company`, `role_ids`, `last_touch_at`, `notes`, …).

### `mt_events`

- **Purpose:** Lightweight action log (ids / action names only — not resume or JD text).
- **Columns in `schema.sql`:** `id`, `owner`, `kind`, `role_id`, `meta`, `created_at`.
- **Client insert shape today:** `{ action, role_id: null, meta }` (role board id goes in `meta.role_pk`). **Unknown / drift:** client field name `action` vs schema column `kind` — confirm against your deployed DB; inserts may no-op if columns differ. SPA treats failures as non-fatal.

---

## Storage buckets

| Bucket | SPA usage |
|--------|-----------|
| `reports` | Upload / signed URL / remove Jobscan (and similar) PDFs; path often stored on `mt_reports.jd_text` |

No other `sb.storage.from(...)` bucket names appear in `web/ui/*.mjs`.

---

## Present in `schema.sql` but not direct SPA `from()` targets

| Object | Notes |
|--------|-------|
| `mt_usage` | Daily search / AI counters — edge/backend; not queried from the SPA client list above |
| `mt_provider_secrets` | Encrypted BYO secrets when `CREDENTIALS_KEK` is set; SPA talks to `upsert_provider_secret` / `clear_provider_secret` edge functions, not this table directly |
| `ai_config` / `ai_config_v` | Service-role free-tier config — not client-readable |

---

## Related

- Full DDL + RLS: [`supabase/schema.sql`](../supabase/schema.sql) · [`supabase/README.md`](../supabase/README.md)
- Web configure / deploy: [`web/README.md`](README.md)

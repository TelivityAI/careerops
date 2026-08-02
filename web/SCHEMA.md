# Supabase Schema Reference

This document lists all tables and storage buckets used by the CareerOps SPA.
It is derived directly from client-side code (`web/index.html` and related UI files).

**Purpose:** Help self-hosters understand which tables and buckets are required for the application to function.

---

## Tables

### `mt_profiles`

- **Purpose:** Store user profile information (name, email, settings, preferences).
- **Columns used (best-effort):**
  - `id` (uuid) — user ID
  - `name` (text) — display name
  - `email` (text) — user email
  - `avatar_url` (text) — profile picture URL (linked to `avatars` bucket)
  - `created_at` (timestamp) — account creation time
  - `updated_at` (timestamp) — last update time
  - `settings` (jsonb) — user preferences (titles, keywords, locations, seniority, etc.)
  - `resume` (text) — plain text resume
  - `phone` (text) — phone number
  - `linkedin` (text) — LinkedIn URL
  - `location` (text) — user location
  - `key` (text) — Anthropic API key (encrypted)
  - `kimi` (text) — Kimi API key (encrypted)
  - `oai_base` (text) — OpenAI-compatible base URL
  - `oai_key` (text) — OpenAI-compatible API key (encrypted)
  - `oai_model` (text) — OpenAI-compatible model name
  - `hemail` (text) — Humanizer email
  - `hpw` (text) — Humanizer password (encrypted)
  - `blocklist` (text) — company blocklist
  - `max_age` (integer) — max posting age in days
  - `remote_pref` (text) — remote preference
  - `cadence` (text) — bullet memory cadence setting
  - `cadence_anchor` (text) — anchor days for cadence
  - `cadence_tz` (text) — timezone for cadence
  - `dealbreakers` (text) — deal-breaker phrases
  - `stories` (text) — story bank (Situation → Action → Result)
  - `band_min` (integer) — target base minimum
  - `band_max` (integer) — target base maximum
  - `band_cur` (text) — currency for target band

### `mt_roles`

- **Purpose:** Track job search roles/positions (board cards).
- **Columns used (best-effort):**
  - `id` (uuid) — role ID
  - `company` (text) — company name
  - `title` (text) — job title
  - `jd` (text) — full job description
  - `url` (text) — link to the job posting
  - `status` (text) — current status (sourced, applied, interviewing, offered, rejected, closed)
  - `col` (text) — board column (Sourced, Applied, Interviewing, Offer, Closed)
  - `verdict` (text) — user verdict (apply, stretch, skip)
  - `deleted` (boolean) — soft-delete flag
  - `score` (integer) — match score
  - `summary` (text) — match summary
  - `gaps` (jsonb) — gap analysis
  - `ats_url` (text) — ATS link
  - `created_at` (timestamp) — when the role was added
  - `updated_at` (timestamp) — last update
  - `user_id` (uuid) — reference to `mt_profiles.id`

### `mt_reports`

- **Purpose:** Store match reports and analysis results.
- **Columns used (best-effort):**
  - `id` (uuid) — report ID
  - `role_id` (uuid) — reference to `mt_roles.id`
  - `text` (text) — report content
  - `score` (integer) — match score
  - `keywords` (jsonb) — matched/missing keywords
  - `created_at` (timestamp) — generation time
  - `user_id` (uuid) — reference to `mt_profiles.id`

### `mt_events`

- **Purpose:** Track user events for analytics and audit trails.
- **Columns used (best-effort):**
  - `id` (uuid) — event ID
  - `type` (text) — event type (view, click, generate, etc.)
  - `data` (jsonb) — event payload
  - `user_id` (uuid) — reference to `mt_profiles.id`
  - `created_at` (timestamp) — event time

### `mt_skills` (unknown — inferred from code context)

- **Purpose:** Likely stores skill/tag data for portfolio items.
- **Status:** Not explicitly confirmed in client code. Marked as unknown.
- **Columns:** Unknown — needs verification from backend schema.

---

## Storage Buckets

### `resumes`

- **Purpose:** Store uploaded resume files (PDF/DOCX/plain text).
- **Used for:** Uploading and retrieving resume files for match reports and tailoring.
- **Access:** `sb.storage.from('resumes')`

### `avatars`

- **Purpose:** Store user profile pictures.
- **Used for:** Displaying profile images.
- **Access:** `sb.storage.from('avatars')`

### `reports`

- **Purpose:** Store PDF reports (e.g., Jobscan uploads).
- **Used for:** Attaching external reports to roles.
- **Access:** `sb.storage.from('reports')`

### `jd_cache` (unknown — inferred from code context)

- **Purpose:** Likely caches job descriptions to avoid re-fetching.
- **Status:** Not explicitly confirmed in client code. Marked as unknown.
- **Access:** Not clearly identified in the provided code.

---

## Notes

- **Prefix `mt_`** likely stands for "main tables" for the CareerOps application.
- **Unknown columns** are marked with `?` until confirmed in the codebase or backend schema.
- **Storage buckets** are accessed via `sb.storage.from('bucket_name')`.
- **Encrypted fields** (`key`, `kimi`, `oai_key`, `hpw`) are stored securely and never exposed in plaintext.
- **`deleted` flag** on `mt_roles` is used for soft-delete (cards are hidden but not permanently removed).

---

## Known Gaps / Uncertainties

| Table/Field | Issue | Status |
|-------------|-------|--------|
| `mt_skills` | Inferred from code context but not explicitly confirmed in this analysis | Unknown |
| `jd_cache` bucket | Inferred but not confirmed in client code | Unknown |
| Column details for `mt_events` and `mt_reports` | Inferred from pattern, not explicitly visible in the provided code | Best-effort |
| `mt_roles.gaps` | Jsonb structure is not fully defined in client code | Best-effort |

---

## Related Files

- **Client code:** `web/index.html` and `web/ui/*.mjs`
- **Backend schema:** `supabase/README.md` and `supabase/schema.sql` (if available)
- **Self-host guide:** Root `README.md` and `web/README.md`

---

**This document is a best-effort cheat-sheet derived from client-side code.**
**For full schema details, refer to the backend migration files.**

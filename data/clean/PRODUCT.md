# CareerOps — Product Reference

Source of truth: the single-page web app `index.html`. Everything below is verified against that source. UI strings are quoted exactly as they appear.

---

## 1. What CareerOps is

CareerOps is a private, single-page job-search web app, branded in the header as "CareerOps" with the sub-label "by Telivity". The sign-in screen describes it as "Your private, automated job search." It combines four things: a job search that scans live company career boards, a drag-and-drop pipeline board of roles, AI résumé/cover-letter tooling scoped to a specific job description, and a job-search chat. The browser title is "CareerOps — your private job search". Accounts are email/password or "Continue with Google"; data is stored per-user in a hosted backend (Supabase), and the app repeatedly states the data is "private and yours alone".

---

## 2. Pipeline stages

The board defines **eight** stages, not five. Internal keys and their display labels:

| Key | Label |
|---|---|
| `sourced` | "Sourced" |
| `researched` | "Researched" |
| `conversation` | "Conversation" |
| `applied` | "Applied" |
| `interview` | "Interview" |
| `offer` | "Offer" |
| `rejected` | "Rejected" |
| `closed` | "Closed" |

Columns render in that order, with "Closed" last.

Observed facts about movement:
- New roles — whether found by the search or added manually — land in "Sourced". The onboarding text says the search "drops them into 'Sourced.'"
- A role changes stage **only** by the user dragging its card to another column. There is no stage dropdown and no automatic promotion. On drop, the role's stage is written to the database and a `stage_move` event is logged.
- The source does **not** define what each stage means beyond the label. There is no in-app description of "Researched" vs "Conversation" etc. Do not invent definitions.
- Stage is used in two derived ways:
  - The active-roles count in the status line excludes `closed` and `rejected`.
  - Roles in `applied` or `interview` generate follow-up reminders (see §11).

---

## 3. The board UI

Layout:
- A sticky header across the top containing, in order: the title "CareerOps by Telivity" plus the signed-in user's name, a "☕ Support CareerOps" link, and the buttons "🔍 Run job search", "＋ Add role", "📄 Résumé tool", "💬 Chat", "⚙︎ Settings", "Sign out".
- Below the header: a status line, an optional setup banner, an optional follow-ups strip, then the board.
- The board is a horizontally scrollable grid of columns (grid is defined as 8 columns, min 150px each). Each column header shows the stage label on the left and the count of cards in that column on the right, in small uppercase type. Empty columns show "—".

Status line text (rendered on every load):
`"<N> active roles · click a card to scan / tailor / apply · drag between columns"`

Card ("cardlet") contents:
- Job title, in bold, on the first line.
- A meta line containing: a small badge showing the role's `fit_score` (or "—" if none), the company name, and — if a match score exists — "· <score> match".
- A 📄 icon if a tailored résumé or cover letter has been saved for that role. Its tooltip is "tailored résumé/cover saved".
- If the role has a URL, a link "Open JD ↗" that opens the posting in a new tab.

Interaction:
- Cards are `draggable`; dragging a card over a column outlines it with a dashed border, and dropping moves the role to that stage.
- Clicking anywhere on a card (other than a link) opens the role panel. A click immediately after a drag is suppressed.

---

## 4. Adding a role

Trigger: the header button "＋ Add role" opens a modal titled "Add a role".

Modal copy: "Found a job somewhere else — LinkedIn, a newsletter, a friend? Track it here. Paste the posting link and the job description loads automatically."

Fields:
- "Company" (required)
- "Job title" (required)
- "Link to the posting" with the hint "optional but recommended"

Buttons: "Add to board" (primary/green) and "Cancel".

Behaviour:
- If company or title is blank, the error is "Company and job title are required."
- While saving, the button text becomes "Adding…".
- A seniority `level` is derived from the title text by pattern match: VP / vice president / chief → "VP"; senior director → "Senior Director"; principal → "Principal"; director → "Director"; otherwise "—".
- The role is created with `source: 'manual'`, `fit_score: '—'`, `stage: 'sourced'`.
- After saving, the board reloads and the new role's panel opens automatically.

JD autoload (happens in the role panel, not the add modal):
- If the role already has a saved JD, the field label hint reads "· saved with this card — edit if needed".
- If it has no JD but has a URL, the app calls a `fetch-jd` function against that URL. While loading the hint is "· loading job description…"; on success "· auto-loaded from the posting — edit if needed" and the fetched text is saved to the card.
- On failure: "· couldn't auto-load — paste the JD here and it saves to the card automatically".
- With no URL at all: "· no link on this card — paste the JD here and it saves to the card automatically".
- Typing in the JD box auto-saves after an 800 ms pause; the hint then reads "· saved to the card ✓".

---

## 5. Match reports

Two entry points produce the same kind of report:
- The role panel button "Get match report" (uses the panel's JD).
- The Résumé tool button "Get match report" (uses JD text pasted into the tool).

While running, the button reads "Scoring…". If no JD is present in the role panel, the error is "Load or paste the job description first."

The report is produced by a backend function `resume-match` from the user's stored résumé text plus the JD text. The response carries a `match_score`, a `method`, a `missing` list, optionally a `present` list, and optionally a `summary`. There are two modes, and the UI labels them differently:

**Keyword mode** (`method === 'keywords'`, the free/no-AI path):
- Score note: "keyword overlap" with the sub-line "word-overlap scan, NOT a fit score".
- Missing label: "Missing keywords — add these to your résumé where true:" (role panel uses the shorter "Missing keywords — add where true:").
- Covered label: "Already covered:".
- No summary shown.

**AI mode** (`method` is `free`, `kimi`, or otherwise Claude):
- Score note: "recruiter-style assessment (<source>)" with the sub-line "scored on real fit, not word overlap". The source string is "free AI", "Kimi K3", or "Claude".
- Missing label: "Gaps to address (in your résumé or interview):".
- Covered label: "Your strongest evidence for this role:".
- A summary paragraph is shown, plus the standard AI warning (see §9).

Display: a large percentage number, the note, the summary, then chips — missing items in red-tinted chips, covered items in grey chips. If nothing is missing, the panel shows "none — strong coverage" (Résumé tool wording: "none — great coverage").

Persistence: when run from the role panel, the score is written onto the role as `<n>%` (so it appears on the card) and a report row of kind `match` is saved with the score and missing keywords. Reports run from the standalone Résumé tool are **not** saved.

Marketing framing in onboarding: "Get match report — free score + missing keywords, saved onto the card (your built-in Jobscan)."

---

## 6. Résumé tailoring

Two entry points, both calling the backend function `resume-rewrite` with `mode: 'resume'`:
- Role panel: "✨ Tailor résumé"
- Résumé tool modal: "✨ AI rewrite résumé"

While running, the button reads "✨ Working…".

What it uses as input:
- The JD text (required — otherwise "Load or paste the job description first.").
- The user's stored résumé (held server-side on the profile).
- If a Jobscan report has been attached to that role, the most recent Jobscan text (first 6000 characters) is passed as `jobscan_text`. The UI promises: "✨ Tailor résumé will close the exact gaps Jobscan flagged".

Output:
- A heading "Tailored résumé" (Résumé tool wording: "AI-tailored résumé"), with " — built with your Jobscan findings" appended when Jobscan text was used, and " · free AI" or " · Kimi K3" appended to indicate which model ran it.
- The generated text appears in an editable textarea.
- Buttons underneath: "✨ Humanize wording" (only shown if a humanizer login is saved), "⬇︎ .txt", "⬇︎ Word (.doc)" (Résumé tool wording: "⬇︎ Download .txt" and "⬇︎ Download for Word (.doc)").

Post-processing unique to résumé mode: after generating, the app automatically re-scores the tailored résumé against the same JD and updates the card's match score. The note then reads "recruiter-style assessment of the tailored résumé — saved to the card" (or "keyword overlap of the tailored résumé — saved to the card"), and the panel subtitle becomes "<Company> · <n>% match (tailored)".

**Not verifiable in the source:** the client does not define bullet selection, skills-section logic, or any tailoring rules. All of that lives in the `resume-rewrite` backend function, which is not part of this file. Do not describe how bullets or skills are chosen.

---

## 7. Cover letters

Buttons: "✉️ Cover letter" in both the role panel and the Résumé tool. Same `resume-rewrite` function, `mode: 'cover'`. Same requirements (a JD must be present), same "✨ Working…" state, same Jobscan-text passthrough, same download and humanize controls.

Output heading: "Cover letter", with " · free AI" / " · Kimi K3" appended as applicable. Generated letters are saved against the role as a report of kind `cover`, which makes the 📄 icon appear on the card.

**Not verifiable in the source:** the client does not define the structure or "parts" of a cover letter (no salutation/body/closing template exists here). That is entirely backend. Do not describe the letter's sections.

---

## 8. Chat

Opened by the header button "💬 Chat". Modal title: "💬 Job-search chat". The chat button is visible to everyone (the free tier means chat works without a key).

Description shown in the modal: "Runs on your Anthropic key. It knows your résumé — ask it to tailor a bullet, draft outreach, prep an interview, whatever."

Empty state text: "Ask it to tailor your résumé to a job, draft a LinkedIn note to a hiring manager, prep you for an interview, or sanity-check your search strategy."

Mechanics:
- A scrolling transcript, a textarea placeholder "Ask anything about your job search…  (Enter to send, Shift+Enter for newline)", and a "Send" button. Enter sends; Shift+Enter inserts a newline. The send button shows "…" while waiting.
- Messages are labelled "You:" and, for the assistant, the name of the model actually used: "CareerOps AI" (free tier), "Kimi K3", or "Claude".
- The AI warning is appended below the transcript once there are messages.
- If the model returns an empty reply: "Model returned nothing — hit Send again." and the user's text is restored to the input.
- Conversation history is kept in memory for the session only; there is no chat persistence in this file.

---

## 9. AI tiers

**Free tier (default, no key):** Described identically in onboarding and Settings: "Free AI — no key needed. CareerOps includes a free AI model, 30 uses per day per person: fit scoring, résumé tailoring, cover letters and chat all work out of the box. Your text is sent to the model provider to generate the answer; it is not used to train any AI model."

Settings shows live usage by calling an `ai-free` status probe and rendering "<remaining> of <cap> free uses left today." If the user has their own key saved, it instead says "You're using <Claude (your key) | Kimi K3 (your key)>, so the free tier isn't being used. Remove your key to fall back to it."

At the cap, every AI surface shows the same message:
> "You've used your 30 free AI actions today — resets at midnight. Add your own Anthropic or Kimi K3 key in Settings for unlimited use."

If free AI is down or unavailable:
> "Free AI is temporarily unavailable. Try again shortly, or add your own Anthropic or Kimi K3 key in Settings."

**Bring-your-own-key tier:** Two options, both optional and both entered in onboarding step 4 and in Settings:
- "Anthropic (Claude) API key" — hint "optional · starts with sk-ant-"
- "Kimi K3 (Moonshot) API key" — hint "optional · alternative to Claude"

Stated rules: "If both are saved, Claude is used." Keys are "yours and are never shown in exports." In Settings, leaving a key field blank keeps the current key; typing "remove" deletes it. Guidance line: "Claude: console.anthropic.com → API Keys. Kimi: platform.kimi.ai. Billed to you, cents per use."

There is **no paid subscription**. The only money in the app is a voluntary Stripe donation link surfaced as "☕ Support CareerOps" (a second, hidden variant reads "☕ Support"); a source comment states CareerOps is free forever and donations are optional.

**Standard AI warning**, shown under every generated output and in chat:
> "⚠️ Written by AI — check every line before you send it. It can be wrong or invent things. Never let it claim experience you don't have."

**Optional third-party humanizer:** an "AI-Text-Humanizer email" / password pair can be saved. When present, a "✨ Humanize wording" button appears under generated text and rewrites it via a `humanize` function. Button state while running: "✨ Humanizing…". Without credentials saved: "Add your AI-Text-Humanizer login in Settings first."

---

## 10. Exports

Under **Settings → "Your data"**, with the copy: "This is your data — private and yours alone. We can't access it… export everything anytime below for your records, and be sure to export it before you stop using the tool — accounts may eventually be cleaned up."

Two buttons:
- **"⬇︎ Export everything (JSON)"** — downloads `CareerOps_export.json` containing `exported_at`, the profile, all roles, and all reports. API keys and the humanizer password are explicitly stripped before download.
- **"⬇︎ Export board (CSV)"** — downloads `CareerOps_board.csv` with the columns `company, title, level, stage, fit_score, match_score, url, created_at`.

Per-document downloads also exist in the role panel and Résumé tool: `.txt` and `.doc` (Word). The `.doc` is an HTML wrapper styled Calibri 11pt with preserved line breaks. Filenames follow `<Name>_<Company>_<Resume|CoverLetter|JobscanReport>` from the role panel, and `<Name>_<Resume|CoverLetter>` from the Résumé tool.

---

## 11. Other verified features

**Job search.** The header button "🔍 Run job search" (in onboarding: "🔍 Run my first search") calls `run-search-mt`. Button state while running: "🔍 Searching…" (onboarding: "Scanning 75+ boards…"). It scans the live career boards of "75+ companies" — onboarding includes a collapsible disclosure labelled "See exactly which companies we search" listing them by name. Results:
- Success with new roles: "Added <n> new role(s) matching your preferences (scanned <found> live matches)."
- Nothing new: "Scanned the boards — <found> roles matched your filters, all already on your board. Adjust keywords in Settings to widen."
- Rate limited: "Daily search limit reached (10/day) — resets tomorrow. Your board and all other tools keep working." (Onboarding's shorter variant: "Daily search limit reached — resets tomorrow.") **The search is capped at 10 runs per day.**

**Onboarding wizard.** Five numbered sections: "1 · What roles are you after?", "2 · About you", "3 · Paste your résumé", "4 · AI", "5 · How you'll actually use it". Headline: "Let's set up your job search 👋". Search preference fields are "Target job titles", "Keywords for your field", "Seniority", "Locations" (hint: use "Remote" to include remote). Profile fields are "Full name", "Phone", "LinkedIn URL", "Where you're based". Closing buttons: "Finish setup →" and "Skip for now — explore the board →". A "Sign out" button sits in the wizard header.

**Setup banner.** If onboarding is incomplete or no résumé is saved, a yellow banner appears above the board: "📝 Finish your setup — add your résumé to unlock the free match reports and AI tailoring. Finish setup →".

**Follow-ups.** A strip labelled "⏰ FOLLOW-UPS DUE" appears above the board, derived automatically from roles in "Applied" or "Interview": due 14 days after the role's creation date. Each is a clickable pill showing company, truncated title, and either "follow up now" (red, overdue) or "by YYYY-MM-DD". Clicking a pill opens that role.

**Jobscan attachment.** Collapsed under "Have a Jobscan report for this job? Attach it" in the role panel. Instructions: "On jobscan.co: open your report → Print → 'Save as PDF' → upload it here." A file input (PDF only) plus "⬆︎ Upload PDF", or a textarea to paste the report text with "Save pasted text". PDF limits: must be a PDF, **15 MB max**, and text is extracted from at most **20 pages**. If the extracted text contains a match rate, that percentage is written onto the card and the subtitle shows "<Company> · <n>% match (Jobscan)". Upload states: "⬆︎ Reading PDF…" then "⬆︎ Uploading…". Errors include "That needs to be a PDF (on jobscan.co: Print → Save as PDF)." and "PDF too big (15 MB max)."

**Saved-for-this-role list.** At the bottom of the role panel, "Saved for this role:" lists prior artefacts by type — "Match report", "Tailored résumé", "Cover letter", "Jobscan report" — each with its date and match percentage where applicable. Per-row controls: "View", "⬇︎ .doc", "Open PDF ↗" (signed URL, 5-minute expiry), and for Jobscan rows "✕ Remove", which confirms with "Remove this Jobscan report? You can attach a fresh one after re-running Jobscan."

**Apply.** The role panel's green link "Apply — Open JD ↗" opens the real posting in a new tab. The app explicitly does not auto-apply: "The board tracks your search; you submit each application yourself." Onboarding also states LinkedIn/auto-apply is out of scope for the hosted tool, and that Jobscan has no public API so "the built-in match report does the same job."

**Auth.** Sign-in card with "Email", "Password" (placeholder "8+ characters"), buttons "Sign in" and "Create account", link "Forgot password?", divider "or", and "Continue with Google". Password minimum is 8 characters ("Password must be at least 8 characters."). Signup without an active session shows "Account created. Check your email to confirm, then sign in." Reset flow sends a link ("Password reset link sent — check your email.") leading to a "Set a new password" card with "New password" and "Save new password". If Google OAuth is unconfigured: "Google sign-in is being set up — use email/password for now."

**Settings modal.** Title "Settings". Fields: "Target job titles", "Keywords", "Seniority", "Locations", "Résumé", then an "AI" section (free-tier status box + the two key fields + humanizer email/password), then "Your data". Buttons "Save" and "Close".

**Storage & telemetry.** All state (profile, roles, reports) lives in the hosted backend per signed-in user; uploaded PDFs go to a private storage bucket accessed via short-lived signed URLs. `localStorage` is used only for a "skip onboarding" flag. The app logs anonymous behaviour events — the source comment states: "action names + ids only, never résumé/JD text". Logged actions observed: `onboard_view`, `onboard_finish`, `onboard_skip`, `search_run`, `stage_move`, `role_open`, `match_report`, `resume_tailored`, `cover_generated`. Google Analytics (gtag) is loaded on the page.

**Features that do NOT exist in the source:** there is no board search box, no filter controls, no sort controls, no free-text notes field on a role, no tags/labels, no calendar or reminder settings beyond the automatic 14-day follow-up strip, no dark mode, and no team/sharing features.

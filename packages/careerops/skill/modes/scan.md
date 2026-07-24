# Mode: scan

Read the board pack `roles[]` (prefer stage `sourced`).

For each role, report:
- Blocklist / age / remote mismatches vs pack `find_prefs`
- Duplicate URL or company+title fingerprints
- ATS link present?
- One-line next action (paste JD / close dup / keep)

Do not call LLMs unless the user asks for deeper evaluate. Never auto-close or auto-apply.

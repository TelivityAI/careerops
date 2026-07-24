# Changelog

All notable changes to the public CareerOps repo and `@telivity/careerops` are documented here.

## [1.1.0] — 2026-07-24

### Added
- `@telivity/careerops` CLI: `npx @telivity/careerops init` installs the Open Agent Skill (scan / evaluate / rank / tailor / interview / followup / outcome) and optionally wires `web/config.js`.
- Web dashboard: Find hygiene (blocklist, max posting age, remote preference), Sourced triage, drawer evaluate pack, builder section locks / Review draft / Sent freeze, OpenAI-compatible BYO keys, Board pack export.
- Smoke tests (`npm test`) for critical control IDs + doctrine strings; GitHub Actions smoke on PR.
- Release workflow: tagging `v*` can publish to npm when `NPM_TOKEN` is configured.

### Fixed
- Builder Generate now surfaces errors in the builder (not only the hidden drawer), always sends resume materials, and keeps a successful draft even if version history insert fails.
- Brand UI uses the full Telivity palette (teal primary CTA + navy / orange / gold secondary chrome) instead of teal-on-white only.

### Docs
- Neutral public README “What you get” covering Find → Decide → Write → BYO / skill — no competitor narrative.

## [0.1.0] — 2026-07-24

- Initial npm package publish (superseded by 1.1.0).

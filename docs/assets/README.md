# Demo assets (public-safe only)

GIFs and screenshots for the GitHub README hero and product walkthroughs.

**Do not** commit real personal boards, real employers, or private resume text. Use a throwaway/seeded demo profile with fake companies only.

## Inventory

| File | Kind | Story |
|------|------|--------|
| `memory-promote.gif` | Hero GIF | Bullet Memory → Promote to Resume |
| `tailor-resume.gif` | GIF | Pick evidence → generate draft |
| `interview-prep.gif` | GIF | Interview rounds + story-bank angles |
| `application-board.gif` | GIF | Kanban stage progression |
| `login.png` | Still | Login screen |
| `offer-compare.gif` | GIF | Side-by-side user-entered offers |
| `dashboard.png` | Still | Application board |
| `resume-builder.png` | Still | Job-specific builder |
| `bullet-memory.png` | Still | Memory capture + promoted chip |
| `interview-prep.png` | Still | Interview prep drawer |
| `offer-compare.png` | Still | Offer comparison table |

## Capture status (D1)

**Captured (not placeholders):** all GIFs and stills above were generated from the local CareerOps SPA chrome (`web/` served at `http://127.0.0.1:4173`) with a **seeded fictional profile** injected in-browser. Live hosted login at `careerops.telivity.app` was not used (browser automation could not attach a navigable hosted tab in this environment; local seeded capture was used instead to keep privacy guarantees).

Regenerate:

```bash
python3 -m http.server 4173 --directory web   # separate terminal
node scripts/capture-demo-assets.mjs
```

Requires Playwright Chromium + `sharp` (dev-only; not a product dependency).

## Privacy precautions

- Identity: **Demo Candidate** only — no real name/email/phone/LinkedIn.
- Employers: fictional only — Northstar Labs, Juniper Works, Bluebird Systems, Cedar Studio, Orbit & Pine.
- Offer numbers and bullets are invented demo facts, not a real person’s board or resume.
- Supabase network calls aborted during capture (no live account data).
- Every frame includes a **SEEDED DEMO · FICTIONAL DATA** badge; board status line also says seeded demo data.
- Crop: full product viewport only (no OS chrome, no DevTools, no personal browser tabs).

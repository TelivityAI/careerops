# Contributing to CareerOps

Thanks for helping. This repo is the **open-source job-search dashboard** (Apache-2.0).  
Live demo: https://careerops.telivity.app

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## What to contribute

**In scope**
- Dashboard UX/bugs in `web/`
- Deploy docs and scripts (`scripts/deploy-web.sh`, `web/README.md`)
- Safe defaults (no secrets in the repo)
- Tests / small hardening around config and deploy

**Out of scope for PRs here**
- Publishing someone else’s API keys, resumes, or private job data
- Changing Telivity’s hosted demo credentials (that’s a private deploy)
- Large unrelated refactors without an issue first

Model weights live on Hugging Face (`telivity/CareerOps-4B*`), not in this repo.

## Quick start (local)

```bash
git clone https://github.com/TelivityAI/careerops.git
cd careerops
cp web/config.example.js web/config.js
# edit web/config.js with YOUR Supabase URL + anon key
```

Open `web/index.html` via a static server, or deploy:

```bash
./scripts/deploy-web.sh
```

Never commit `web/config.js`.

## Pull requests

1. Open an issue for non-trivial changes (bug / feature).
2. Branch from `main`.
3. Keep diffs focused. Match existing style in `web/`.
4. Do not add secrets, personal data, or private operator notes.
5. Fill out the PR template.

Maintainers may ask for changes before merge.

## Security

If you find a vulnerability, **do not** open a public issue.  
Use GitHub **Security advisories** on this repository, or contact the org owners.

## License

Contributions are accepted under the Apache License 2.0 — see [LICENSE](LICENSE).

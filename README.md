# CareerOps

**Open-source job-search dashboard** — board, match, tailor, follow-ups.  
Apache License 2.0.

**Live demo:** [careerops.telivity.app](https://careerops.telivity.app)

The public model weights live on Hugging Face (`telivity/CareerOps-4B*`). This repo is the **app you fork and deploy**.

---

## What you get

- Kanban pipeline (Sourced → Researched → … → Offer)
- Add roles (paste link + job description) and LinkedIn-via-Google helper
- Match check, gap materials, draft generate / versions
- Optional AI keys (Claude / Kimi) in Settings — your keys, your bill

You run it on **your** Supabase project. The demo site is Telivity’s hosted instance.

---

## One-command deploy

```bash
cp web/config.example.js web/config.js
# edit web/config.js → your Supabase URL + anon/publishable key

./scripts/deploy-web.sh
```

Requires: Node.js, [Vercel CLI](https://vercel.com/docs/cli) logged in, and a Supabase project with the CareerOps schema (see `web/README.md`).

---

## Repo layout

| Path | Purpose |
|------|---------|
| `web/` | Dashboard SPA (deploy this) |
| `scripts/deploy-web.sh` | Production deploy helper |
| `LICENSE` | Apache-2.0 |
| `data/`, `eval/`, `kernel/` | Optional training/eval assets for CareerOps-4B |

---

## Model

| | |
|---|---|
| Adapter | [telivity/CareerOps-4B](https://huggingface.co/telivity/CareerOps-4B) |
| Merged | [telivity/CareerOps-4B-merged](https://huggingface.co/telivity/CareerOps-4B-merged) |
| GGUF | [telivity/CareerOps-4B-GGUF](https://huggingface.co/telivity/CareerOps-4B-GGUF) |

---

## License

Copyright © Telivity / contributors  
Licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).  
Be kind: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).  
Security reports: [SECURITY.md](SECURITY.md).

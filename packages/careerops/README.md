# `@telivity/careerops`

Wire the CareerOps **agent skill** into a project and optionally create `web/config.js` for self-host.

```bash
npx @telivity/careerops init
```

## What you get

- `.agents/skills/careerops/` with modes: scan, evaluate, rank, tailor, interview, followup, outcome
- Symlinks for Claude Code / Codex / OpenCode skill folders
- Copy of `web/config.example.js` → `web/config.js` when missing

## Doctrine

- Never invent experience
- No auto-apply — you submit on the employer site

## Local smoke (before publish)

From the monorepo root:

```bash
npm test
npm pack --prefix packages/careerops
# optional link smoke:
cd /tmp && npm pack /path/to/careerops-work/packages/careerops && \
  mkdir smoke && cd smoke && npm init -y && npm install ../telivity-careerops-*.tgz && \
  npx careerops init && test -f .agents/skills/careerops/SKILL.md
```

## Version & release

Ship version **tracks git tags**:

```bash
# 1) Bump packages/careerops/package.json + CHANGELOG.md, commit
# 2) Tag and push
git tag v1.1.0
git push origin v1.1.0

# 3) Publish (or rely on .github/workflows/release.yml + NPM_TOKEN)
cd packages/careerops
npm publish --access public

# 4) GitHub Release (needs gh auth)
gh release create v1.1.0 --title "v1.1.0" --notes-file ../../CHANGELOG.md
```

## Related

- Live demo: https://careerops.telivity.app
- Repo: https://github.com/TelivityAI/careerops

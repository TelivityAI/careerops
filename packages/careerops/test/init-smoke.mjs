#!/usr/bin/env node
/**
 * Package unit smoke: careerops init against a temp directory.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(__dirname, '..')
const bin = path.join(pkgRoot, 'bin/careerops.js')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'careerops-init-'))

const r = spawnSync(process.execPath, [bin, 'init', '--dir', tmp], { encoding: 'utf8' })
if (r.status !== 0) {
  console.error(r.stdout)
  console.error(r.stderr)
  process.exit(r.status || 1)
}

const skill = path.join(tmp, '.agents/skills/careerops/SKILL.md')
const modes = path.join(tmp, '.agents/skills/careerops/modes')
const link = path.join(tmp, '.claude/skills/careerops')

let linkOk = false
try {
  linkOk = fs.existsSync(link) || fs.lstatSync(link).isSymbolicLink()
} catch (_e) {
  linkOk = false
}
const checks = [
  ['SKILL.md', fs.existsSync(skill)],
  ['modes/', fs.existsSync(modes)],
  ['claude symlink/copy', linkOk],
]

let failed = false
for (const [name, ok] of checks) {
  console.log(ok ? `ok  ${name}` : `FAIL ${name}`)
  if (!ok) failed = true
}

const doctrine = fs.readFileSync(skill, 'utf8')
if (!/never invent|no invent|Never invents/i.test(doctrine)) {
  console.log('FAIL doctrine string missing from SKILL.md')
  failed = true
} else {
  console.log('ok  doctrine string')
}

fs.rmSync(tmp, { recursive: true, force: true })
if (failed) process.exit(1)
console.log('init-smoke passed')

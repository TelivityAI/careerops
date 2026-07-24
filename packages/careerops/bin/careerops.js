#!/usr/bin/env node
/**
 * npx @telivity/careerops init
 * Wires Open Agent Skill into local agent folders and optional web/config.js.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(pkgRoot, '../..')
// Prefer skill shipped inside the npm package; fall back to monorepo path when developing.
const skillSrcCandidates = [
  path.join(pkgRoot, 'skill'),
  path.join(repoRoot, '.agents/skills/careerops'),
]
const skillSrc = skillSrcCandidates.find((p) => fs.existsSync(path.join(p, 'SKILL.md')))

const args = process.argv.slice(2)
const cmd = args[0] || 'help'

function usage() {
  console.log(`CareerOps CLI

Usage:
  npx @telivity/careerops init [--dir <path>]

What init does:
  1. Ensures .agents/skills/careerops exists (from this package or repo)
  2. Symlinks into .claude/skills, .codex/skills, .opencode/skills
  3. Copies web/config.example.js → web/config.js when missing
  4. Prints how to point at Supabase or a board-pack export

Doctrine: no auto-apply, no invented facts.
`)
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function linkSkill(targetRoot) {
  const destSkill = path.join(targetRoot, '.agents/skills/careerops')
  ensureDir(path.dirname(destSkill))
  if (!fs.existsSync(destSkill)) {
    if (skillSrc) {
      fs.cpSync(skillSrc, destSkill, { recursive: true })
    } else {
      ensureDir(destSkill)
      fs.writeFileSync(
        path.join(destSkill, 'SKILL.md'),
        `# CareerOps\n\nSee https://github.com/TelivityAI/careerops\n\nDoctrine: never invent experience. Never auto-apply.\n`,
      )
    }
  }
  for (const agent of ['.claude', '.codex', '.opencode']) {
    const linkDir = path.join(targetRoot, agent, 'skills')
    ensureDir(linkDir)
    const link = path.join(linkDir, 'careerops')
    try {
      if (fs.existsSync(link) || fs.lstatSync(link).isSymbolicLink()) fs.rmSync(link, { recursive: true, force: true })
    } catch (_e) {}
    try {
      fs.symlinkSync(path.relative(linkDir, destSkill), link)
    } catch (_e) {
      fs.cpSync(destSkill, link, { recursive: true })
    }
  }
  return destSkill
}

function wireConfig(targetRoot) {
  const example = path.join(targetRoot, 'web/config.example.js')
  const config = path.join(targetRoot, 'web/config.js')
  if (fs.existsSync(example) && !fs.existsSync(config)) {
    fs.copyFileSync(example, config)
    console.log('Created web/config.js — fill in YOUR Supabase URL + anon key.')
    return true
  }
  if (fs.existsSync(config)) {
    console.log('web/config.js already present — left unchanged.')
    return false
  }
  console.log('No web/config.example.js here. For hosted demo use https://careerops.telivity.app')
  console.log('For offline skill runs, export a Board pack from Settings → Your data.')
  return false
}

function init() {
  const dirFlag = args.indexOf('--dir')
  const targetRoot = path.resolve(dirFlag >= 0 ? (args[dirFlag + 1] || '.') : process.cwd())
  console.log('Initializing CareerOps in', targetRoot)
  const skill = linkSkill(targetRoot)
  console.log('Skill ready at', skill)
  if (!fs.existsSync(path.join(skill, 'modes'))) {
    console.warn('Warning: modes/ missing under skill — reinstall package or pull latest repo.')
  }
  wireConfig(targetRoot)
  console.log(`
Next:
  • Hosted board: https://careerops.telivity.app
  • Self-host: edit web/config.js → deploy web/
  • Offline: Settings → Board pack (skill) → open CareerOps_board_pack.json with an agent
  • Modes: scan | evaluate | rank | tailor | interview | followup | outcome
`)
}

if (cmd === 'init') init()
else usage()

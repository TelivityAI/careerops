#!/usr/bin/env node
/**
 * Static smoke: critical BEAST/control IDs + doctrine strings in web/index.html.
 * No browser required — catches regressions that delete launch controls.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const htmlPath = path.join(root, 'web/index.html')

if (!fs.existsSync(htmlPath)) {
  console.error('Missing web/index.html')
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')

const requiredIds = [
  'board',
  'drawer',
  'followups',
  'triage',
  'triage_batch',
  'triage_dedupe',
  'rp2_match',
  'dw_evaluate',
  'dw_gaps',
  'builderView',
  'bv_locks',
  'bv_lock_edu',
  'bv_sent',
  'rp2_review',
  'rp2_generate',
  's_blocklist',
  's_max_age',
  's_remote_pref',
  's_hide_blocked',
  's_oai_base',
  's_oai_key',
  's_oai_model',
  'exp_boardpack',
  'settingsbtn',
  'run',
  'addrolebtn',
]

const requiredStrings = [
  { name: 'never invent (materials)', re: /Never invent/i },
  { name: 'no auto-apply doctrine', re: /auto-apply/i },
  { name: 'apply yourself messaging', re: /you apply yourself/i },
  { name: 'Board pack', re: /Board pack/ },
  { name: 'OpenAI-compatible', re: /OpenAI-compatible/ },
  { name: 'Section locks', re: /Section locks|Lock Education/ },
  { name: 'Review draft', re: /Review draft/ },
  { name: 'Find hygiene (blocklist)', re: /id="s_blocklist"/ },
  { name: 'no beast stamp leak', re: /<!--\s*beast-/i, invert: true },
]

let failed = 0

for (const id of requiredIds) {
  const ok = html.includes(`id="${id}"`)
  console.log(ok ? `ok  #${id}` : `FAIL #${id}`)
  if (!ok) failed++
}

for (const s of requiredStrings) {
  const hit = s.re.test(html)
  const ok = s.invert ? !hit : hit
  console.log(ok ? `ok  ${s.name}` : `FAIL ${s.name}`)
  if (!ok) failed++
}

if (failed) {
  console.error(`\nsmoke-web: ${failed} failure(s)`)
  process.exit(1)
}
console.log('\nsmoke-web passed')

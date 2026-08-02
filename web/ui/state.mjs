export function createScopedJsonStore(prefix, ownerId, fallback) {
  const storageKey = () => `${prefix}_${ownerId() || 'anon'}`
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey()) || JSON.stringify(fallback))
    } catch {
      return structuredClone(fallback)
    }
  }
  const save = (value) => {
    localStorage.setItem(storageKey(), JSON.stringify(value))
    return value
  }
  return { key: storageKey, load, save }
}

export async function persistResumeProfile({
  profile,
  result,
  supabase,
  ownerId,
  byId,
  afterPersist,
}) {
  if (!profile) return
  Object.assign(profile, {
    resume_struct: result.struct,
    resume_text: result.resume_text,
    resume_struct_rev: result.resume_struct_rev,
    structured_modified_at: result.structured_modified_at,
    resume_reconcile_needed: Boolean(result.resume_reconcile_needed),
  })
  const update = {
    resume_struct: profile.resume_struct,
    resume_text: profile.resume_text,
    resume_struct_rev: profile.resume_struct_rev,
    structured_modified_at: profile.structured_modified_at,
    resume_reconcile_needed: profile.resume_reconcile_needed,
  }
  try {
    const { error } = await supabase.from('mt_profiles').update(update).eq('owner', ownerId)
    if (error) console.warn('[resume-sync]', error.message)
  } catch (error) {
    console.warn('[resume-sync]', error)
  }
  afterPersist?.()
  const resume = byId?.('s_resume')
  if (resume) resume.value = profile.resume_text || ''
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  createAccomplishment, editAccomplishment, archiveAccomplishment,
  setPolishCandidate, acceptPolish, rejectPolish, wordDiff,
} from './memory.mjs'
import { shouldNudge, recordNewCapture, recordPrompted, snoozeUntil } from './memory.mjs'
import { rankForGenerate, assertNoUnsupportedClaims } from './memory.mjs'
import {
  promoteAccomplishment, promotePortfolio, healSourceLinks,
  renderResumeTextFromStruct, healBulletsPreserveSource, stableRoleKey, createBuilderVisibility,
} from './builder.mjs'
import {
  shouldUsePromoteRpc, rpcPromoteAccomplishment, rpcPromotePortfolio,
  applyPromoteRpcResult, isResumeRevConflict, RESUME_REV_CONFLICT,
} from '../lib/promote-rpc.mjs'
import { buildBoardPack, importBoardPack, planBoardPackUpsert, createSectionNavigation } from './board.mjs'
import {
  createPortfolioItem, editPortfolioItem, archivePortfolioItem, resumeOkItems,
} from './portfolio.mjs'
import {
  buildAdvisorContext, advisorSystemPrompt, advisorFollowUpSystemPrompt,
  buildAdvisorFollowUpUserMessage, normalizeAdvisorBrief, normalizeAdvisorFollowUp,
  appendAdvisorFollowUp, advisorReportRow, materialsCorpusFromContext,
} from './advise.mjs'
import {
  readLocalCareerTruth, writeLocalCareerTruth,
  isDurabilityMigrated, markDurabilityMigrated,
  planDurabilityMigrate, remoteCareerTruthFromDb, applyRemoteAuthoritative,
  normalizeOutcome, outcomeRowFromLocal,
} from '../lib/career-durability.mjs'
import {
  INTERVIEW_EVENT_TYPES, normalizeInterviewEvent, interviewEventRowFromLocal,
  eventsForRole, buildFollowupStrip, nextRoundNumber, interviewReportRow,
} from './interviews-offers.mjs'
import { buildOfferCompare, formatMoney, parseMoneyInput } from './interviews-offers.mjs'
import { buildVersionTimeline, timelineLines } from './interviews-offers.mjs'
import {
  CONTACT_CHANNELS, normalizeContact, contactRowFromLocal, logTouch, filterContacts,
  channelFromDraftKind,
} from './contacts.mjs'
import { postedCompLabel, normalizeCompRange } from './board.mjs'
import { buildSalaryCompare, normalizeTargetBand, targetBandLabel, parseBandInput } from './board.mjs'
import {
  classifyEnrichUrl, proposeEnrichCandidates, fetchPublicEnrichMeta, acceptEnrichCandidate,
} from './memory.mjs'
import {
  buildTriageRoleRow, buildMatchReportRow, splitGapsByMaterials, validateTriageAdd, inferRoleLevel,
} from './board.mjs'
import { byId, escapeHtml, commaList } from './primitives.mjs'
import {
  createOpenaiPrefsStore,
  providerSecretOnFile,
  anyByoKeyOnFile,
  paintProviderSecretStatus,
  applySettingsProviderSecrets,
  writeProviderSecret,
} from './settings.mjs'
import { createDrawerVisibility } from './drawer.mjs'

export function bootCareerOps() {
const SUPABASE_URL = 'https://vqcjdqhcdhxjlznpqing.supabase.co'
const SUPABASE_KEY = 'sb_publishable_nNiBFGj8_NHI2vksvZEpFw_D30oUi5x'
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
const $ = byId
const esc = escapeHtml
const list = commaList
const DONATE_URL = 'https://donate.stripe.com/cNi7sK5PEfwy7lB9H6cV204'  // Stripe donation link — free forever, donations optional
// Free-AI tier messages (single source of truth — shown wherever an AI call can fail or run out)
// Behaviour log for future model training — action names + ids only, never resume/JD text
function logEvent(action, roleId, meta){
  try{
    // Prod mt_events.role_id is uuid; board role ids are integers — never send 16 as a uuid (silent 400s in DevTools).
    const row = {
      action,
      role_id: null,
      meta: Object.assign({}, meta||{}, roleId!=null ? { role_pk: roleId } : {}),
    }
    sb.from('mt_events').insert(row)
      .then(({ error }) => { if(error) console.warn('[logEvent] failed:', action, error.message) },
            (e)          => { console.warn('[logEvent] threw:', action, e?.message||e) })
  }catch(e){ console.warn('[logEvent] sync throw:', action, e?.message||e) }
}
const FREE_LIMIT_MSG = "You've used your 30 free AI actions today — resets at midnight. Add your own Anthropic, Kimi K3, or OpenAI-compatible key in Settings for unlimited use."
const FREE_DOWN_MSG  = 'Free AI is temporarily unavailable. Try again shortly, or add your own Anthropic, Kimi K3, or OpenAI-compatible key in Settings.'
const AI_NOTE = '⚠️ Written by AI — check every line before you send it. It can be wrong or invent things. Never let it claim experience you don\'t have.'
// ---- T24/T25 BYO OpenAI-compat + usage meter (localStorage; keys never exported) ----
const OPENAI_PREFS = createOpenaiPrefsStore(() => ME?.id)
function openaiPrefsKey(){ return 'co_openai_prefs_'+(ME?.id||'anon') }
function loadOpenaiPrefs(){ return OPENAI_PREFS.load() }
function saveOpenaiPrefs(p){ return OPENAI_PREFS.save(p) }
function usageKey(){ return 'co_usage_'+(ME?.id||'anon')+'_'+new Date().toISOString().slice(0,10) }
function loadUsage(){ try{ return JSON.parse(localStorage.getItem(usageKey())||'{"match":0,"generate":0}')||{match:0,generate:0} }catch(_e){ return {match:0,generate:0} } }
function bumpUsage(kind){
  const u=loadUsage(); if(kind==='match') u.match=(u.match||0)+1; if(kind==='generate') u.generate=(u.generate||0)+1
  localStorage.setItem(usageKey(), JSON.stringify(u)); paintUsageMeters(); return u
}
function paintUsageMeters(){
  const u=loadUsage()
  const oai=loadOpenaiPrefs()
  const byo = providerSecretOnFile(PROFILE, 'ai_key') ? 'Claude' : providerSecretOnFile(PROFILE, 'kimi_key') ? 'Kimi' : oai.key ? 'OpenAI-compat' : 'Free tier'
  const line = `Today · Match <b>${u.match||0}</b> · Generate <b>${u.generate||0}</b> · route <b>${byo}</b>`
  ;['dw_usage','bv_usage'].forEach(id=>{ const el=$(id); if(el) el.innerHTML=line })
}
function byoEdgeExtras(){
  const o=loadOpenaiPrefs()
  if(!o.key || !o.base) return {}
  return { openai_base_url:o.base, openai_key:o.key, openai_model:o.model||'gpt-4o-mini' }
}
async function openaiChat({ system, messages, max_tokens=1500, json=false }){
  const o=loadOpenaiPrefs()
  if(!o.base || !o.key) throw new Error('OpenAI-compatible base URL + key required')
  const msgs=[...(system?[{role:'system',content:system}]:[]), ...(messages||[])]
  const body={ model:o.model||'gpt-4o-mini', messages:msgs, max_tokens, temperature:0.3 }
  if(json) body.response_format={ type:'json_object' }
  const r=await fetch(o.base.replace(/\/+$/,'')+'/chat/completions',{
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+o.key },
    body:JSON.stringify(body)
  })
  if(!r.ok) throw new Error('openai-compat '+r.status+' '+(await r.text()).slice(0,200))
  const j=await r.json()
  let text=(j?.choices?.[0]?.message?.content||'').trim()
  text=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim()
  if(!text) throw new Error('openai-compat returned no text')
  return { text, method:'openai-compat', truncated:j?.choices?.[0]?.finish_reason==='length' }
}
const MATCH_PROMPT=(jd,resume)=>`You are a senior recruiter with deep expertise in the candidate's industry. Assess how well this candidate fits this specific job.

Score fit 0-100 the way a great recruiter would:
- 85-100: exceptional — the JD could have been written for them
- 70-84: strong fit — clearly interview-worthy
- 50-69: partial fit — relevant background, real gaps
- below 50: weak fit

Judge substance, not vocabulary. Ignore boilerplate. Do not invent experience.

JOB DESCRIPTION:
${String(jd||'').slice(0,12000)}

CANDIDATE RÉSUMÉ:
${String(resume||'').slice(0,12000)}

Reply with ONLY this JSON, no markdown fences:
{"score": <integer>, "summary": "<2-3 sentences>", "strengths": ["<up to 6>"], "gaps": ["<up to 6>"]}`
function parseMatchAssessment(text, method){
  const m=String(text||'').match(/\{[\s\S]*\}/)
  if(!m) throw new Error('no JSON in reply')
  const p=JSON.parse(m[0])
  const score=Math.max(0,Math.min(100,Math.round(Number(p.score)||0)))
  return {match_score:score, method, summary:String(p.summary||''), present:(p.strengths||[]).map(String).slice(0,8), missing:sanitizeGapLabels((p.gaps||[]).map(String)).slice(0,8)}
}
function preferClientOpenai(){
  const o=loadOpenaiPrefs()
  return !!(o.base && o.key) && !providerSecretOnFile(PROFILE, 'ai_key') && !providerSecretOnFile(PROFILE, 'kimi_key')
}
async function invokeMatch({ resume_text, jd_text }){
  if(preferClientOpenai()){
    const out=await openaiChat({ messages:[{role:'user',content:MATCH_PROMPT(jd_text,resume_text)}], max_tokens:1200, json:true })
    return parseMatchAssessment(out.text, 'openai-compat')
  }
  const { data, error } = await sb.functions.invoke('resume-match',{ body:Object.assign({ resume_text, jd_text }, byoEdgeExtras()) })
  if(error||data?.error) throw new Error(data?.error||error?.message||'match failed')
  return data
}
async function invokeRewrite(body){
  // Always send an explicit resume when available — edge + BYO both need materials.
  if(body && !body.resume_text && body.mode!=='bullet' && (PROFILE?.resume_text||'').trim()){
    body = Object.assign({}, body, { resume_text: PROFILE.resume_text })
  }
  if(preferClientOpenai()){
    const mode=body.mode||'resume'
    const resume = (body.resume_text||PROFILE?.resume_text||'').trim()
    if(mode!=='bullet' && !resume){
      return { error: 'Add your resume in Settings (or tick experience bullets) before Generate.' }
    }
    const sys = mode==='cover'
      ? 'You write truthful, concise cover letters. NEVER invent employers, titles, dates, metrics, or skills. Return only the letter body.'
      : mode==='bullet'
      ? 'Rewrite one resume bullet for the JD. Keep every fact. Never invent. Return ONLY the bullet text.'
      : 'You tailor résumés truthfully. NEVER invent facts. Return ONLY the full résumé text with PROFESSIONAL SUMMARY / EXPERIENCE / SKILLS / EDUCATION.'
    const gaps = Array.isArray(body.gaps)?body.gaps:(Array.isArray(body.missing_keywords)?body.missing_keywords:[])
    const gapsBlock = gaps.length ? '\n\nMATCH GAPS:\n'+gaps.map(g=>'- '+g).join('\n') : ''
    const userMsg = mode==='bullet'
      ? `JOB DESCRIPTION:\n${body.jd_text}\n\nRESUME BULLET:\n${body.bullet_text}`
      : `JOB DESCRIPTION:\n${body.jd_text}${gapsBlock}\n\nMY RESUME:\n${resume}`
    const out=await openaiChat({ system:sys, messages:[{role:'user',content:userMsg}], max_tokens: mode==='bullet'?400:4000 })
    return { rewritten:out.text, method:'openai-compat', truncated:!!out.truncated }
  }
  const { data, error } = await sb.functions.invoke('resume-rewrite',{ body:Object.assign({}, body, byoEdgeExtras()) })
  if(data && data.error){
    // Soft codes the UI maps to human copy — do not throw so builder can show them.
    return data
  }
  if(error){
    const msg = await fnMsg(error)
    throw new Error(msg||error.message||'rewrite failed')
  }
  if(!data) throw new Error('rewrite failed — empty response')
  return data
}
async function invokeChat(messages){
  if(preferClientOpenai()){
    const out=await openaiChat({
      system:'You are the CareerOps assistant. Never invent the user\'s experience. Be concise and practical. No auto-apply.',
      messages:(messages||[]).slice(-20),
      max_tokens:2000
    })
    return { reply:out.text, method:'openai-compat' }
  }
  const { data, error } = await sb.functions.invoke('chat',{ body:Object.assign({ messages }, byoEdgeExtras()) })
  if(data && data.error){
    return data // soft codes — Review/chat UI maps via mapRewriteSoftError
  }
  if(error) throw new Error((await fnMsg(error))||error.message||'chat failed')
  if(!data) throw new Error('chat failed — empty response')
  return data
}
// Cheap keyword overlap (no LLM) — T26
function cheapKeywordOverlap(resume_text, jd_text){
  const STOP=new Set('a an the and or of to in for with on at by as is are be will you your our we they this that role team work experience years including from into about their them who what when where how all any can may must should more most other than then us it its need needs required requirements'.split(' '))
  const toks=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 +#]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)&&!/^\d+$/.test(w))
  const rset=new Set(toks(resume_text))
  const jtoks=toks(jd_text)
  const freq={}; for(const t of jtoks) freq[t]=(freq[t]||0)+1
  const terms=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([w])=>w)
  if(!terms.length) return { score:0, present:[], missing:[] }
  let hit=0; const present=[], missing=[]
  for(const t of terms){ if(rset.has(t)||rset.has(t+'s')||(t.endsWith('s')&&rset.has(t.slice(0,-1)))){ hit++; present.push(t) } else missing.push(t) }
  return { score:Math.round(hit/terms.length*100), present:present.slice(0,20), missing:missing.slice(0,20) }
}
function isLikelyDupRole(role){
  if(!role) return false
  const url=(role.url||'').trim()
  const fp=typeof roleFingerprint==='function' ? roleFingerprint(role.company, role.title) : ''
  const others=Object.values(ROLESMAP||{}).filter(r=>r && r.id!==role.id && r.stage!==CLOSED)
  for(const o of others){
    if(url && (o.url||'').trim()===url) return true
    if(fp && typeof roleFingerprint==='function' && roleFingerprint(o.company,o.title)===fp) return true
  }
  return false
}
async function cheapPreTriage(role, { resume, jd }={}){
  const out={ skipLlm:false, reasons:[], live:null, keyword:null, dup:false }
  const live=await checkAtsLiveness(role)
  out.live=live
  if(live?.status==='dead'){ out.skipLlm=true; out.reasons.push('ATS posting looks closed') }
  out.dup=isLikelyDupRole(role)
  if(out.dup){ out.reasons.push('Likely duplicate of another board card') }
  const textJd=(jd||role?.jd||'').trim()
  const textRes=(resume||PROFILE?.resume_text||'').trim()
  if(textJd && textRes){
    out.keyword=cheapKeywordOverlap(textRes, textJd)
    if(out.keyword.score < 18){ out.skipLlm=true; out.reasons.push('Keyword overlap only '+out.keyword.score+'% — weak materials signal before LLM') }
  }
  if(isBlockedCompany(role?.company)){ out.skipLlm=true; out.reasons.push('Company is on your blocklist') }
  return out
}
function paintPreTriage(tri){
  const el=$('dw_pretriage'); if(!el) return
  if(!tri){ el.classList.add('hidden'); el.textContent=''; return }
  el.classList.remove('hidden')
  el.className='pretriage'+(tri.skipLlm?' skip':' warn')
  const bits=[]
  if(tri.live?.status) bits.push('Liveness: '+tri.live.status+(tri.live.detail?' ('+tri.live.detail+')':''))
  if(tri.keyword) bits.push('Keyword pre-score: '+tri.keyword.score+'%')
  if(tri.dup) bits.push('Possible duplicate')
  if(tri.reasons?.length) bits.push(tri.reasons.join(' · '))
  el.innerHTML='<b>Pre-triage (no LLM):</b> '+(bits.join(' · ')||'clear')+(tri.skipLlm?' — skipped LLM evaluate spend.':' — proceeding to match.')
}
const aiNote = () => `<p class="muted" style="font-size:12px;margin:6px 0 0">${AI_NOTE}</p>`
// Shows the free-tier state (remaining calls today) in Settings
async function freeStatus(){
  const el=$('freestate'); if(!el) return
  try{
    const { data } = await sb.functions.invoke('ai-free',{ body:{ probe:'status' } })
    if(data && data.enabled){
      const oai=loadOpenaiPrefs()
      const own = providerSecretOnFile(PROFILE, 'ai_key') ? 'Claude (your key)' : providerSecretOnFile(PROFILE, 'kimi_key') ? 'Kimi K3 (your key)' : (oai.key ? 'OpenAI-compat (your key)' : null)
      el.innerHTML = '<b>Free AI — no key needed.</b> ' + (own
        ? `You're using <b>${own}</b>, so the free tier isn't being used. Remove your key to fall back to it.`
        : `<b>${data.remaining} of ${data.cap} free uses left today.</b>`)
        + ' Your text is sent to the model provider to generate the answer; it is <b>not used to train any AI model</b>. For higher-quality writing and no daily limit, add your own key — <b>Anthropic (Claude)</b>, <b>Kimi K3</b>, or an <b>OpenAI-compatible</b> base URL.'
    }
  }catch(_e){}
  paintUsageMeters()
}
const STAGES=['sourced','researched','conversation','applied','interview','offer','rejected'], CLOSED='closed'
const LABEL={sourced:'Sourced',researched:'Researched',conversation:'Conversation',applied:'Applied',interview:'Interview',offer:'Offer',rejected:'Rejected',closed:'Closed'}
let ME=null, PROFILE=null
// Hybrid IA is default (drawer + builder). Escape hatch: ?legacy=1 opens the old centered rolepanel.
try{ const _np=new URLSearchParams(location.search)
  if(_np.get('legacy')==='1') localStorage.setItem('co_legacy','1')
  else if(_np.get('legacy')==='0' || _np.get('newpanel')==='1') localStorage.removeItem('co_legacy')
}catch(_e){}
const NEWPANEL=(()=>{ try{ return localStorage.getItem('co_legacy')!=='1' }catch(_e){ return true } })()

// ---------- auth ----------
$('signin').onclick = async () => {
  $('autherr').textContent=''
  const { error } = await sb.auth.signInWithPassword({ email:$('email').value.trim(), password:$('pw').value })
  if(error) $('autherr').textContent = error.message
}
$('signup').onclick = async () => {
  $('autherr').textContent=''; $('authmsg').textContent=''
  const email=$('email').value.trim(), password=$('pw').value
  if(password.length<8){ $('autherr').textContent='Password must be at least 8 characters.'; return }
  const { data, error } = await sb.auth.signUp({ email, password })
  if(error){ $('autherr').textContent = error.message; return }
  if(!data.session){ $('authmsg').textContent='Account created. Check your email to confirm, then sign in.'; return }
  // session live → onAuthStateChange handles it
}
$('google').onclick = async () => {
  $('autherr').textContent=''
  const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.origin } })
  if(error) $('autherr').textContent = /not enabled|provider/i.test(error.message) ? 'Google sign-in is being set up — use email/password for now.' : error.message
}
$('forgot').onclick = async (e) => {
  e.preventDefault(); $('autherr').textContent=''; $('authmsg').textContent=''
  const email=$('email').value.trim()
  if(!email){ $('autherr').textContent='Type your email above first, then click Forgot password.'; return }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
  if(error){ $('autherr').textContent=error.message; return }
  $('authmsg').textContent='Password reset link sent — check your email.'
}
$('setpw').onclick = async () => {
  $('recerr').textContent=''
  const p=$('newpw').value
  if(p.length<8){ $('recerr').textContent='At least 8 characters.'; return }
  const { error } = await sb.auth.updateUser({ password:p })
  if(error){ $('recerr').textContent=error.message; return }
  location.hash=''; location.reload()
}
let RECOVERY=false
sb.auth.onAuthStateChange((ev,session)=>{
  if(ev==='PASSWORD_RECOVERY'){ RECOVERY=true; $('auth').classList.remove('hidden'); document.querySelector('#auth > .card').classList.add('hidden'); $('recovery').classList.remove('hidden'); return }
  if(session && !RECOVERY){ ME=session.user; boot() }
})
if(new URLSearchParams(location.hash.slice(1)).get('type')==='recovery'){ RECOVERY=true }

async function boot(){
  const { data } = await sb.from('mt_profiles').select('*').eq('owner',ME.id).maybeSingle()
  PROFILE = data
  FIND_PREFS = loadFindPrefs()
  $('auth').classList.add('hidden')
  if(!PROFILE || (!PROFILE.onboarded && !localStorage.getItem('co_skip'))){ showOnboard() } else { showApp() }
}

// ---------- onboarding ----------
function showOnboard(){
  $('onboard').classList.remove('hidden'); $('app').classList.add('hidden')
  // Funnel: fires the moment the wizard is shown. Without this, someone who opens
  // the wizard and leaves without clicking anything writes NO row anywhere and is invisible.
  logEvent('onboard_view', null, { returning: !!PROFILE })
  if(PROFILE){
    $('o_name').value=PROFILE.full_name||''; $('o_phone').value=PROFILE.phone||''
    $('o_linkedin').value=PROFILE.linkedin||''; $('o_location').value=PROFILE.location||''
    $('o_resume').value=PROFILE.resume_text||''
    $('o_titles').value=(PROFILE.target_titles||[]).join(', ')
    $('o_keywords').value=(PROFILE.keywords||[]).join(', ')
    $('o_seniority').value=(PROFILE.seniority||[]).join(', ')
    $('o_locations').value=(PROFILE.locations||[]).join(', ')
  }
}
function obRow(onboarded){
  const row = {
    owner: ME.id, email: ME.email,
    full_name:$('o_name').value.trim(), phone:$('o_phone').value.trim(),
    linkedin:$('o_linkedin').value.trim(), location:$('o_location').value.trim(),
    resume_text: $('o_resume').value.trim(),
    target_titles: list($('o_titles').value),
    keywords: list($('o_keywords').value),
    seniority: list($('o_seniority').value.toLowerCase()),
    locations: list($('o_locations').value),
    onboarded
  }
  // Provider secrets are written via vault edge RPCs after profile upsert — never inline plaintext on hosted.
  return row
}
async function saveOb(onboarded){
  const row = obRow(onboarded)
  const { error } = await sb.from('mt_profiles').upsert(row, { onConflict:'owner' })
  if(error){ $('onberr').textContent=error.message; return null }
  const k=$('o_key').value.trim(), kk=$('o_kimi').value.trim()
  const he=$('o_hemail').value.trim(), hp=$('o_hpw').value.trim()
  if(k) await writeProviderSecret(sb, { provider:'ai_key', value:k, profileOwnerId:ME.id })
  if(kk) await writeProviderSecret(sb, { provider:'kimi_key', value:kk, profileOwnerId:ME.id })
  if(he) await writeProviderSecret(sb, { provider:'humanizer_email', value:he, profileOwnerId:ME.id })
  if(hp) await writeProviderSecret(sb, { provider:'humanizer_pw', value:hp, profileOwnerId:ME.id })
  PROFILE = {
    ...(PROFILE||{}),
    ...row,
    ai_key_on_file: !!(k || providerSecretOnFile(PROFILE, 'ai_key')),
    kimi_key_on_file: !!(kk || providerSecretOnFile(PROFILE, 'kimi_key')),
    humanizer_email_on_file: !!(he || providerSecretOnFile(PROFILE, 'humanizer_email')),
    humanizer_pw_on_file: !!(hp || providerSecretOnFile(PROFILE, 'humanizer_pw')),
  }
  delete PROFILE.ai_key; delete PROFILE.kimi_key; delete PROFILE.humanizer_pw
  if(he && !PROFILE.humanizer_email_on_file) PROFILE.humanizer_email = he
  else if(he) delete PROFILE.humanizer_email
  $('o_key').value=''; $('o_kimi').value=''; $('o_hpw').value=''
  return PROFILE
}
$('o_try').onclick = async () => {
  $('onberr').textContent=''; const out=$('o_tryout'); out.textContent=''
  const b=$('o_try'), t=b.textContent; b.disabled=true; b.textContent='Scanning company boards…'
  try{
    if(!await saveOb(PROFILE?.onboarded||false)) return
    logEvent('search_run')
    const { data, error } = await sb.functions.invoke('run-search-mt',{ body: findSearchBody() })
    if(error) throw new Error(await fnMsg(error))
    if(data?.error==='daily_limit'){ out.textContent='Daily search limit reached — resets tomorrow.'; return }
    if(data?.error) throw new Error(data.error)
    out.textContent = '✓ Scanned '+(data?.boardsScanned??'?')+' boards — found '+(data?.found??0)+' matches, added '+(data?.added??0)+' to your board. Finish below, or skip ahead to see them.'
  }catch(e){ out.textContent='Search hit a snag: '+(e.message||e)+' — you can still continue below.' }
  finally{ b.disabled=false; b.textContent=t }
}
$('o_save').onclick = async () => {
  $('onberr').textContent=''
  if(!await saveOb(true)) return
  logEvent('onboard_finish', null, { resume: !!$('o_resume').value.trim(), key: !!($('o_key').value.trim()||$('o_kimi').value.trim()) })
  localStorage.removeItem('co_skip')
  $('onboard').classList.add('hidden'); showApp()
}
$('o_skip').onclick = async () => {
  $('onberr').textContent=''
  if(!await saveOb(false)) return
  logEvent('onboard_skip')
  localStorage.setItem('co_skip','1')
  $('onboard').classList.add('hidden'); showApp()
}

// ---------- app ----------
function showApp(){
  $('app').classList.remove('hidden'); $('onboard').classList.add('hidden')
  $('hello').textContent = PROFILE?.full_name ? ('· '+PROFILE.full_name) : ''
  if(DONATE_URL){ $('donate').href=DONATE_URL; $('donate').style.display='' }
  const needSetup = !PROFILE?.onboarded || !PROFILE?.resume_text
  $('setupbanner').classList.toggle('hidden', !needSetup)
  if(needSetup){
    $('setupbanner').innerHTML = '📝 <b>Finish your setup</b> — add your resume to unlock the free match reports and AI tailoring. <a href="#" id="finishsetup" style="color:#1f6feb;font-weight:600">Finish setup →</a>'
    $('finishsetup').onclick = (e)=>{ e.preventDefault(); showOnboard() }
  }
  load()
}

// Donations — CareerOps is free forever; shown when CAREEROPS_CONFIG.donateUrl is set

$('signout').onclick = async ()=>{ await sb.auth.signOut(); location.reload() }
$('o_signout').onclick = async ()=>{ await sb.auth.signOut(); location.reload() }

let APP_SECTION = 'board'
const SECTION_NAV = createSectionNavigation({ byId: $ })
function closeHdrMenus(exceptId){ SECTION_NAV.closeMenus(exceptId) }
function closeHdrMenu(){ closeHdrMenus() }
function toggleHdrMenu(panelId, btnId, e){
  e?.stopPropagation?.()
  const panel=$(panelId); if(!panel) return
  const on=!panel.classList.contains('open')
  closeHdrMenus(on ? panelId : null)
  panel.classList.toggle('open', on)
  $(btnId)?.setAttribute('aria-expanded', on?'true':'false')
}
$('hdr_more')?.addEventListener('click', e=> toggleHdrMenu('hdr_cluster','hdr_more', e))
$('hdr_actions')?.addEventListener('click', e=> toggleHdrMenu('hdr_actions_menu','hdr_actions', e))
$('hdr_cluster')?.addEventListener('click', e=>{
  if(e.target.closest('button,a')) closeHdrMenus()
})
$('hdr_actions_menu')?.addEventListener('click', e=>{
  if(e.target.closest('button,a')) closeHdrMenus()
})
document.addEventListener('click', closeHdrMenus)
window.addEventListener('resize', closeHdrMenus)

function syncSectionTabs(section){ SECTION_NAV.syncTabs(section) }
function showAppSection(section){
  const next = SECTION_NAV.show(section)
  APP_SECTION = next
  const onBoard = next === 'board'
  if(!onBoard){
    try{ rp2FlushSel() }catch(_e){}
    closeDrawer()
  } else if($('triage')){
    try{
      const sourcedN = Object.values(ROLESMAP||{}).filter(r=>String(r.stage||'')==='sourced').length
      const hiddenN = Object.values(ROLESMAP||{}).filter(r=>String(r.stage||'')==='sourced' && typeof shouldHideRole==='function' && shouldHideRole(r)).length
      $('triage').classList.toggle('hidden', sourcedN===0 && hiddenN===0)
    }catch(_e){}
  }
  return next
}
document.querySelectorAll('#hdr_tabs .hdr-tab, #mob_tabs .hdr-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    const sec = tab.dataset.section || 'board'
    if(sec === 'memory') openMemoryModal()
    else if(sec === 'portfolio') openPortfolioModal()
    else if(sec === 'advise') openAdvisorModal()
    else showAppSection('board')
  })
})

// ---- hybrid IA helpers (verdict, staleness, materials) ----
function daysSince(iso){
  if(!iso) return null
  const d=new Date(iso); if(isNaN(d)) return null
  return Math.max(0, Math.floor((Date.now()-d.getTime())/864e5))
}
function verdictStore(){ try{ return JSON.parse(localStorage.getItem('co_verdicts')||'{}')||{} }catch(_e){ return {} } }
function getVerdict(id){ const v=verdictStore()[id]; return (v==='apply'||v==='stretch'||v==='skip')?v:null }
function setVerdict(id, v){
  const m=verdictStore(); if(v) m[id]=v; else delete m[id]
  localStorage.setItem('co_verdicts', JSON.stringify(m))
}
/** Role ids are UUIDs — never coerce with unary +. */
function roleIdOf(x){
  if(x==null || x==='') return null
  const s=String(x).trim()
  return s && s!=='NaN' && s!=='undefined' ? s : null
}
function findRole(id){
  const key=roleIdOf(id)
  if(!key) return null
  return ROLESMAP[key] || Object.values(ROLESMAP||{}).find(r=>roleIdOf(r?.id)===key) || null
}
/** User says this role is not for them — move to Closed (recoverable), not hard-delete. */
async function dismissRole(id){
  const key=roleIdOf(id)
  const role=findRole(key)
  if(!key){ console.warn('dismissRole: bad id', id); return false }
  if(!role){ console.warn('dismissRole: role missing', key); return false }
  if(role.stage===CLOSED) return true
  const from=role.stage
  // Stage alone first — bundling notes used to fail the whole update silently
  let { data, error } = await sb.from('mt_roles').update({ stage: CLOSED }).eq('id', key).select('id')
  if(error || !data?.length){
    console.warn('dismissRole failed', error?.message||error || '0 rows')
    if($('triage_status')) $('triage_status').textContent='Couldn’t hide that role — try again.'
    if($('rp2_err')) $('rp2_err').textContent='Couldn’t hide this role. Check you’re signed in, then try again.'
    return false
  }
  try{
    const note=(role.notes?role.notes+' · ':'')+'user: not for me'
    await sb.from('mt_roles').update({ notes: note }).eq('id', key)
    if(ROLESMAP[key]) ROLESMAP[key].notes=note
  }catch(_e){}
  setVerdict(key, 'skip')
  if(ROLESMAP[key]) ROLESMAP[key].stage=CLOSED
  logEvent('role_dismiss', key, { from, reason:'not_for_me' })
  if(roleIdOf(CURROLE?.id)===key){ try{ rp2FlushSel() }catch(_e){}; closeDrawer() }
  await load()
  return true
}
/** Put a Closed “Not for me” role back into Sourced. */
async function restoreDismissedRole(id){
  const key=roleIdOf(id)
  const role=findRole(key)
  if(!key || !role || role.stage!==CLOSED) return false
  const { data, error } = await sb.from('mt_roles').update({ stage: 'sourced' }).eq('id', key).select('id')
  if(error || !data?.length){
    console.warn('restoreDismissedRole failed', error?.message||error || '0 rows')
    return false
  }
  if(ROLESMAP[key]) ROLESMAP[key].stage='sourced'
  logEvent('role_restore', key, { to:'sourced' })
  await load()
  return true
}
/** Permanently delete every Closed card (user-confirmed). */
async function emptyClosedRoles(){
  const closed=Object.values(ROLESMAP||{}).filter(r=>String(r.stage||'')===CLOSED)
  if(!closed.length){
    if($('triage_status')) $('triage_status').textContent='Closed is already empty.'
    return 0
  }
  if(!confirm(`Permanently delete ${closed.length} Closed role${closed.length>1?'s':''}? This cannot be undone.`)) return 0
  let n=0
  for(const r of closed){
    const { error } = await sb.from('mt_roles').delete().eq('id', r.id)
    if(!error){ n++; delete ROLESMAP[r.id] }
  }
  logEvent('empty_closed', null, { deleted: n })
  await load()
  if($('triage_status')){
    $('triage_status').textContent = n
      ? `Deleted ${n} Closed card${n>1?'s':''}.`
      : 'Couldn’t delete Closed cards — try again.'
  }
  return n
}
let DURABILITY_DB_OK=true
let IV_EVENTS=[]
let IV_DB_OK=true
function interviewEventsKey(){ return 'co_interview_events_'+(ME?.id||'anon') }
function loadInterviewEventsLocal(){
  try{ return (JSON.parse(localStorage.getItem(interviewEventsKey())||'[]')||[]).map(normalizeInterviewEvent).filter(Boolean) }
  catch(_e){ return [] }
}
function saveInterviewEventsLocal(rows){
  const list=(rows||[]).map(normalizeInterviewEvent).filter(Boolean)
  localStorage.setItem(interviewEventsKey(), JSON.stringify(list))
  IV_EVENTS=list
  return list
}
let CT_ROWS=[]
let CT_DB_OK=true
let ENRICH_PENDING=null
function contactsKey(){ return 'co_contacts_'+(ME?.id||'anon') }
function loadContactsLocal(){
  try{ return (JSON.parse(localStorage.getItem(contactsKey())||'[]')||[]).map(normalizeContact).filter(Boolean) }
  catch(_e){ return [] }
}
function saveContactsLocal(rows){
  const list=(rows||[]).map(normalizeContact).filter(Boolean)
  localStorage.setItem(contactsKey(), JSON.stringify(list))
  CT_ROWS=list
  return list
}
async function loadContactsFromDb(){
  if(!ME?.id){ CT_ROWS=loadContactsLocal(); return CT_ROWS }
  try{
    const { data, error } = await sb.from('mt_contacts').select('*').eq('owner', ME.id).order('last_touch_at',{ascending:false,nullsFirst:false})
    if(error){
      if(/mt_contacts|does not exist|relation|schema cache/i.test(error.message||'')) CT_DB_OK=false
      CT_ROWS=loadContactsLocal()
      return CT_ROWS
    }
    CT_DB_OK=true
    const remote=(data||[]).map(normalizeContact).filter(Boolean)
    const localOnly=loadContactsLocal().filter(c=>String(c.id||'').startsWith('local-') && !remote.some(r=>String(r.id)===String(c.id)))
    CT_ROWS=saveContactsLocal([...remote, ...localOnly])
    return CT_ROWS
  }catch(_e){
    CT_DB_OK=false
    CT_ROWS=loadContactsLocal()
    return CT_ROWS
  }
}
async function upsertContact(raw){
  const n=normalizeContact(raw)
  if(!n) return null
  let list=CT_ROWS.length?CT_ROWS.slice():loadContactsLocal()
  const idx=list.findIndex(x=>String(x.id)===String(n.id))
  if(idx>=0) list[idx]={...list[idx],...n}
  else {
    if(!n.id) n.id='local-'+Date.now()
    list.push(n)
  }
  saveContactsLocal(list)
  if(!ME?.id || !CT_DB_OK) return n
  try{
    const row=contactRowFromLocal(n, ME.id)
    if(!row) return n
    if(n.id && !String(n.id).startsWith('local-')){
      const { data, error } = await sb.from('mt_contacts').upsert(row).select('*').maybeSingle()
      if(error){
        if(/mt_contacts|does not exist|relation|schema cache/i.test(error.message||'')) CT_DB_OK=false
        return n
      }
      if(data){
        list=list.map(x=>String(x.id)===String(n.id)?normalizeContact(data):x)
        saveContactsLocal(list)
        return normalizeContact(data)
      }
    } else {
      const { id: _drop, ...insertRow } = row
      const { data, error } = await sb.from('mt_contacts').insert(insertRow).select('*').maybeSingle()
      if(error){
        if(/mt_contacts|does not exist|relation|schema cache/i.test(error.message||'')) CT_DB_OK=false
        return n
      }
      if(data){
        list=list.map(x=>String(x.id)===String(n.id)?normalizeContact(data):x)
        saveContactsLocal(list)
        return normalizeContact(data)
      }
    }
  }catch(_e){ CT_DB_OK=false }
  return n
}
async function logTouchOnContact(contactId, { noteLine='', roleId=null } = {}){
  const list=CT_ROWS.length?CT_ROWS:loadContactsLocal()
  const cur=list.find(c=>String(c.id)===String(contactId))
  if(!cur) return null
  const next=logTouch(cur, { noteLine, roleId, at: new Date().toISOString() })
  return upsertContact(next)
}
function paintContactsSettings(){
  const root=$('s_ct_list'); if(!root) return
  const q=$('s_ct_filter')?.value||''
  const list=filterContacts(CT_ROWS.length?CT_ROWS:loadContactsLocal(), { company: q })
  if(!list.length){ root.innerHTML='<p class="muted" style="margin:0;font-size:12.5px">No contacts yet.</p>'; return }
  root.innerHTML=list.map(c=>`<div style="border:1px solid var(--hair);border-radius:10px;padding:8px 10px;margin:6px 0;font-size:12.5px">
    <b>${esc(c.name)}</b> · ${esc(c.channel)}${c.company?' · '+esc(c.company):''}
    ${c.last_touch_at?`<span class="muted"> · last touch ${(c.last_touch_at||'').slice(0,10)}</span>`:''}
    ${c.notes?`<div class="muted" style="white-space:pre-wrap;margin-top:4px">${esc(c.notes.slice(0,240))}</div>`:''}
  </div>`).join('')
}
function paintRoleContacts(roleId){
  const root=$('dw_contacts'); if(!root) return
  const role=findRole(roleId)
  const list=filterContacts(CT_ROWS.length?CT_ROWS:loadContactsLocal(), {
    roleId,
    company: '',
  })
  // also show company-matched contacts not yet linked
  const coList=role?.company
    ? filterContacts(CT_ROWS.length?CT_ROWS:loadContactsLocal(), { company: role.company })
        .filter(c=>!list.some(x=>String(x.id)===String(c.id)))
    : []
  const all=[...list, ...coList]
  if(!all.length){
    root.innerHTML='<p class="muted" style="margin:0;font-size:12.5px">No contacts linked. Add one below, or Log touch from a draft.</p>'
    return
  }
  root.innerHTML=all.map(c=>`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid var(--hair);border-radius:10px;padding:8px 10px;margin:6px 0;font-size:12.5px">
    <span style="flex:1"><b>${esc(c.name)}</b> · ${esc(c.channel)}${c.last_touch_at?' · '+(c.last_touch_at||'').slice(0,10):''}</span>
    <button type="button" class="btn sm" data-ct-touch="${esc(String(c.id))}">Log touch</button>
  </div>`).join('')
  root.querySelectorAll('[data-ct-touch]').forEach(btn=>{
    btn.onclick=async()=>{
      await logTouchOnContact(btn.dataset.ctTouch, { noteLine: 'Manual log touch', roleId })
      paintRoleContacts(roleId)
      paintContactsSettings()
      logEvent('contact_touch', roleId, { contact_id: btn.dataset.ctTouch })
    }
  })
}
function paintSalaryCompare(roleId){
  const root=$('dw_salary'); if(!root) return
  const role=findRole(roleId)
  const cmp=buildSalaryCompare({
    profile: PROFILE,
    role,
    outcome: loadOutcomes()[roleId] || null,
  })
  const posted=postedCompLabel(role)
  const gaps=cmp.gaps.length
    ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px">${cmp.gaps.map(g=>`<li>${esc(g.label)}</li>`).join('')}</ul>`
    : '<p class="muted" style="margin:8px 0 0;font-size:12px">No gaps to label yet — set a target band in Settings and/or wait for posted/offer numbers.</p>'
  root.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:12.5px">
    ${cmp.rows.map(r=>`<tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--hair);color:var(--text-2);font-weight:600;width:40%">${esc(r.label)}</th>
      <td style="padding:4px 8px;border-bottom:1px solid var(--hair)">${esc(r.value)}</td></tr>`).join('')}
  </table>
  ${posted && !normalizeCompRange(role?.comp_range)?.min ? `<p class="muted" style="margin:6px 0 0;font-size:12px">Posted raw: ${esc(posted)}</p>`:''}
  ${gaps}
  <p class="muted" style="margin:8px 0 0;font-size:11.5px">${esc(cmp.doctrine)}</p>`
}
function paintCopyBox(el, title, text, opts={}){
  if(!el) return
  const kind=opts.kind||''
  const roleId=opts.roleId || CURROLE?.id || null
  el.classList.remove('hidden')
  el.innerHTML='<h4>'+esc(title)+'</h4><div style="white-space:pre-wrap;margin:0 0 8px">'+esc(text||'')+'</div>'
    +'<div class="row" style="gap:8px;flex-wrap:wrap">'
    +'<button type="button" class="btn sm" data-copy="1">Copy</button>'
    +(roleId?`<button type="button" class="btn sm" data-log-touch="1">Log touch</button>`:'')
    +'</div>'
    +'<p class="muted" style="margin:8px 0 0;font-size:12px">Copy only — CareerOps never submits forms or sends email. Log touch updates CRM after you copy.</p>'
  el.querySelector('[data-copy]')?.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(text||''); el.querySelector('[data-copy]').textContent='Copied ✓' }
    catch(_e){ prompt('Copy this text:', text||'') }
  })
  el.querySelector('[data-log-touch]')?.addEventListener('click', async ()=>{
    const name=prompt('Contact name to log this touch against:', CURROLE?.company ? CURROLE.company+' recruiter' : '')
    if(!name || !String(name).trim()) return
    const channel=channelFromDraftKind(kind||title)
    const existing=filterContacts(CT_ROWS.length?CT_ROWS:loadContactsLocal(), { roleId, company: CURROLE?.company||'' })
      .find(c=>c.name.toLowerCase()===String(name).trim().toLowerCase())
    let contact=existing
    if(!contact){
      contact=await upsertContact({
        id: 'local-'+Date.now(),
        name: String(name).trim(),
        channel,
        company: CURROLE?.company||'',
        role_ids: roleId ? [roleId] : [],
        notes: '',
      })
    }
    await logTouchOnContact(contact.id, {
      noteLine: `Copied draft: ${kind||title||'outreach'}`,
      roleId,
    })
    paintRoleContacts(roleId)
    paintContactsSettings()
    const btn=el.querySelector('[data-log-touch]')
    if(btn) btn.textContent='Touch logged ✓'
    logEvent('contact_touch_from_draft', roleId, { kind: kind||title, channel })
  })
}
function sentStore(){ try{ return JSON.parse(localStorage.getItem('co_sent')||'{}')||{} }catch(_e){ return {} } }
function isSent(id){ return !!sentStore()[id] || !!(ROLESMAP[id] && ROLESMAP[id].sent_at) }
function setSent(id, on){
  const m=sentStore(); if(on) m[id]=1; else delete m[id]
  localStorage.setItem('co_sent', JSON.stringify(m))
  persistRoleSent(id, on)
}
function sentVerStore(){ try{ return JSON.parse(localStorage.getItem('co_sent_ver')||'{}')||{} }catch(_e){ return {} } }
function isVerSent(verId){
  if(!!sentVerStore()[verId]) return true
  const row=(RP2ROWS||[]).find(x=>String(x.id)===String(verId))
  return !!(row && row.sent_at)
}
function setVerSent(verId, on){
  const m=sentVerStore(); if(on) m[verId]=1; else delete m[verId]
  localStorage.setItem('co_sent_ver', JSON.stringify(m))
  persistVerSent(verId, on)
}
function roleHasSentVer(roleId){
  if(isSent(roleId)) return true
  const m=sentVerStore()
  return (RP2ROWS||[]).some(r=>r.role_id===roleId && (r.kind==='resume'||r.kind==='cover') && m[r.id])
    || Object.keys(m).length>0 && (RP2ROWS||[]).some(r=>(r.kind==='resume'||r.kind==='cover') && m[r.id] && CURROLE?.id===roleId)
}
function writeLocksKey(){ return 'co_write_locks_'+(ME?.id||'anon') }
function loadWriteLocks(){
  try{
    const raw=JSON.parse(localStorage.getItem(writeLocksKey())||'null')
    if(!raw||typeof raw!=='object') return { edu:true, exp:false }
    return { edu: raw.edu!==false, exp: !!raw.exp }
  }catch(_e){ return { edu:true, exp:false } }
}
function saveWriteLocks(p){
  const next={ edu:!!p.edu, exp:!!p.exp }
  localStorage.setItem(writeLocksKey(), JSON.stringify(next))
  WRITE_LOCKS=next; return next
}
let WRITE_LOCKS={ edu:true, exp:false }
function triagePrefsKey(){ return 'co_triage_prefs_'+(ME?.id||'anon') }
function loadTriagePrefs(){
  try{
    const raw=JSON.parse(localStorage.getItem(triagePrefsKey())||'null')
    if(!raw||typeof raw!=='object') return { sort:'match_desc', filter:'all' }
    return {
      sort:['match_desc','match_asc','newest','company'].includes(raw.sort)?raw.sort:'match_desc',
      filter:['all','apply','stretch','skip','unscored','no_verdict'].includes(raw.filter)?raw.filter:'all',
    }
  }catch(_e){ return { sort:'match_desc', filter:'all' } }
}
function saveTriagePrefs(p){
  const next={ sort:p.sort||'match_desc', filter:p.filter||'all' }
  localStorage.setItem(triagePrefsKey(), JSON.stringify(next))
  TRIAGE_PREFS=next; return next
}
let TRIAGE_PREFS={ sort:'match_desc', filter:'all' }
function storiesKey(){ return 'co_stories_'+(ME?.id||'anon') }
function loadStories(){
  if(PROFILE && Object.prototype.hasOwnProperty.call(PROFILE, 'story_bank') && PROFILE.story_bank!=null){
    return String(PROFILE.story_bank)
  }
  try{ return String(localStorage.getItem(storiesKey())||'') }catch(_e){ return '' }
}
function saveStories(t){
  const v=String(t||'')
  localStorage.setItem(storiesKey(), v)
  if(PROFILE) PROFILE.story_bank=v
  persistStoryBank(v)
  return v
}
function storyList(){ return loadStories().split(/\n+/).map(x=>x.trim()).filter(Boolean) }
function outcomesKey(){ return 'co_outcomes_'+(ME?.id||'anon') }
function loadOutcomes(){ try{ return JSON.parse(localStorage.getItem(outcomesKey())||'{}')||{} }catch(_e){ return {} } }
function saveOutcome(roleId, o){
  const m=loadOutcomes(); if(!o||!o.kind) delete m[roleId]; else m[roleId]=normalizeOutcome(o)||o
  localStorage.setItem(outcomesKey(), JSON.stringify(m))
  persistOutcome(roleId, o)
  return m
}
function materialsStore(){ try{ return JSON.parse(localStorage.getItem('co_materials')||'{}')||{} }catch(_e){ return {} } }

// ---- Find / Decide prefs (local; durable per browser + user) ----
const FIND_PREFS_DEFAULT = {
  blocklist: [], max_age_days: 0, remote_pref: 'any', hide_filtered: true, dealbreakers: []
}
function findPrefsKey(){ return 'co_find_prefs_'+(ME?.id||'anon') }
function loadFindPrefs(){
  try{
    const raw=JSON.parse(localStorage.getItem(findPrefsKey())||'null')
    if(!raw||typeof raw!=='object') return {...FIND_PREFS_DEFAULT}
    return {
      blocklist: Array.isArray(raw.blocklist)?raw.blocklist:list(String(raw.blocklist||'')),
      max_age_days: Math.max(0, parseInt(raw.max_age_days,10)||0),
      remote_pref: ['any','prefer_remote','remote_only','remote_us','onsite_ok'].includes(raw.remote_pref)?raw.remote_pref:'any',
      hide_filtered: raw.hide_filtered!==false,
      dealbreakers: Array.isArray(raw.dealbreakers)?raw.dealbreakers:list(String(raw.dealbreakers||'')),
    }
  }catch(_e){ return {...FIND_PREFS_DEFAULT} }
}
function saveFindPrefs(p){
  const next={
    blocklist:(p.blocklist||[]).map(x=>String(x).trim()).filter(Boolean),
    max_age_days: Math.max(0, parseInt(p.max_age_days,10)||0),
    remote_pref: p.remote_pref||'any',
    hide_filtered: !!p.hide_filtered,
    dealbreakers:(p.dealbreakers||[]).map(x=>String(x).trim()).filter(Boolean),
  }
  localStorage.setItem(findPrefsKey(), JSON.stringify(next))
  FIND_PREFS = next
  return next
}
let FIND_PREFS = FIND_PREFS_DEFAULT
let LAST_EVAL = null
const ATS_CACHE = {} // roleId -> { status, at, detail }

function roleFingerprint(company, title){
  return String((company||'')+' '+(title||'')).toLowerCase()
    .replace(/\([^)]*\)/g,'').replace(/[^a-z0-9 ]+/g,'').replace(/\s+/g,' ').trim()
}
function normCompany(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim() }
function isBlockedCompany(company){
  const c=normCompany(company); if(!c) return false
  return (FIND_PREFS.blocklist||[]).some(b=>{
    const n=normCompany(b); if(!n) return false
    return c===n || c.includes(n) || n.includes(c)
  })
}
function roleAgeDays(r){
  const t=r?.created_at || r?.date_found || r?.updated_at
  if(!t) return null
  const ms=Date.now()-new Date(t).getTime()
  if(isNaN(ms)||ms<0) return 0
  return Math.floor(ms/864e5)
}
function locBlob(r){
  return [r?.location, r?.loc, r?.notes, r?.jd, r?.title, r?.company].map(x=>String(x||'')).join(' ').toLowerCase()
}
function isRemoteRole(r){
  const t=locBlob(r)
  if(/\bon[- ]?site\b|\bin[- ]?office\b|hybrid/.test(t) && !/\bremote\b/.test(t)) return false
  return /\bremote\b|work from home|\bwfh\b|distributed/.test(t)
}
function isOnsiteHeavy(r){
  const t=locBlob(r)
  return /\bon[- ]?site\b|\bin[- ]?office\b|must (?:be|work) in|relocat/.test(t) && !/\bremote\b/.test(t)
}
/** Soft-hide wrong-country Sourced cards (mirrors run-search-mt/match.mjs geo gate). */
const FIND_NON_US_GEO_RE=/\b(indonesia|jakarta|bali|bangkok|thailand|singapore|manila|philippines|india|bangalore|bengaluru|hyderabad|mumbai|delhi|vietnam|hanoi|malaysia|kuala lumpur|china|shanghai|beijing|hong kong|taiwan|japan|tokyo|korea|seoul|australia|sydney|melbourne|london|united kingdom|\buk\b|ireland|dublin|germany|berlin|france|paris|netherlands|amsterdam|spain|madrid|portugal|italy|poland|brazil|mexico\b|canada|toronto|vancouver|emea|apac|latam|dubai|uae|israel|tel aviv)\b/i
const FIND_US_GEO_RE=/\b(united states|\bu\.?\s?s\.?\s?a\.?\b|\busa\b|america|new york|nyc|chicago|san francisco|\bsf\b|bay area|los angeles|seattle|austin|denver|boston|atlanta|dallas|miami|houston|remote[\s-]*(us|usa|united states))\b/i
function findLocationPrefs(){
  const locs=findListTerms(PROFILE?.locations)
  const home=String(PROFILE?.location||'').trim()
  if(home && !locs.some(l=>l.toLowerCase()===home.toLowerCase())) locs.push(home)
  return locs
}
function roleWrongGeo(r){
  const locs=findLocationPrefs()
  const remoteUs=FIND_PREFS.remote_pref==='remote_us'
  if(!locs.length && !remoteUs) return false
  const concrete=locs.filter(l=>!/^remote([\s-]*(only|ok|friendly))?$/i.test(l))
  const usCentric=remoteUs || concrete.some(l=>FIND_US_GEO_RE.test(l)||/^(us|usa|u\.s\.a?\.?)$/i.test(l.trim()))
  if(!usCentric) return false
  const hay=locBlob(r)
  const foreign=FIND_NON_US_GEO_RE.test(hay)
  const us=FIND_US_GEO_RE.test(hay)
  if(foreign && !us) return true
  if(remoteUs){
    const remote=/\bremote\b|work from home|\bwfh\b|distributed|anywhere/i.test(hay)
    const locField=String(r?.location||r?.loc||'').trim()
    // Require a US pin for Remote · US only (bare Remote / empty loc fails)
    if(!us && !(locField && FIND_US_GEO_RE.test(locField))){
      if(remote || !locField) return true
    }
  }
  return false
}

/** Find lane helpers (mirrors supabase/functions/run-search-mt/match.mjs — keep in sync). */
const FIND_BAN_RE=/(software engineer|staff engineer|senior engineer|\b swe\b|frontend|backend|full[\s-]?stack|devops|sre\b|data scien|machine learning|ml engineer|applied ai architect|ai architect|account executive|\bae\b[, ]|enterprise security|security sales|administrative business partner|channel partner|alliance rvp|finance business partner|hr business|hr operations|recruit(er|ing)|talent acquisition|people ops|payroll|accountant|controller\b|counsel\b|\blegal\b|paralegal)/i
const FIND_DOMAIN_RE=/\b(travel|airline|aviation|hospitality|hotel|lodging|ota|gds|ndc|tmc|tourism|cruise|rail|metasearch|destination|dmo)\b|\bair\b/i
let FIND_SHOW_HIDDEN=false
function findListTerms(v){return (Array.isArray(v)?v:[]).map(x=>String(x||'').trim()).filter(s=>s.length>=2)}
function findHitCount(title,terms){const t=title.toLowerCase();let n=0;for(const term of terms){if(t.includes(term.toLowerCase()))n++}return n}
function findWantDomain(titles,keywords){return [...titles,...keywords].some(t=>FIND_DOMAIN_RE.test(t))}
function findSigTokens(terms){const out=[];for(const term of terms){for(const w of String(term).toLowerCase().split(/[^a-z0-9]+/)){if(w.length>=4&&!/^(with|from|that|this|have|your|into|over|senior)$/.test(w))out.push(w)}}return [...new Set(out)]}
function roleOffLaneReason(r){
  const title=String(r?.title||''), company=String(r?.company||''), blob=title+' '+company
  if(!title.trim()) return 'empty_title'
  if(FIND_BAN_RE.test(title)) return 'banned_title'
  const titles=findListTerms(PROFILE?.target_titles), keywords=findListTerms(PROFILE?.keywords), seniority=findListTerms(PROFILE?.seniority)
  if(!titles.length&&!keywords.length&&!seniority.length) return null
  const hay=title.toLowerCase()
  if(titles.length&&findHitCount(title,titles)===0){const toks=findSigTokens(titles);if(!toks.some(w=>hay.includes(w))) return 'title_miss'}
  if(keywords.length&&findHitCount(title,keywords)===0){const toks=findSigTokens(keywords);if(!toks.some(w=>hay.includes(w))){if(!(findWantDomain(titles,keywords)&&FIND_DOMAIN_RE.test(blob))) return 'keyword_miss'}}
  if(seniority.length&&findHitCount(title,seniority)===0) return 'seniority_miss'
  if(findWantDomain(titles,keywords)&&!FIND_DOMAIN_RE.test(blob)){const strong=titles.some(t=>t.length>=10&&hay.includes(t.toLowerCase()));if(!strong) return 'domain_miss'}
  return null
}
function fitStamp(r){
  const raw=String(r?.fit_score||'')
  const m=raw.match(/^\d+\|(.+)$/)
  return m?m[1]:''
}
function roleFilterReason(r){
  if(isBlockedCompany(r.company)) return 'blocked'
  const age=roleAgeDays(r)
  if(FIND_PREFS.max_age_days>0 && age!=null && age>FIND_PREFS.max_age_days) return 'over_age'
  if(FIND_PREFS.remote_pref==='remote_only' && isOnsiteHeavy(r) && !isRemoteRole(r)) return 'not_remote'
  if(FIND_PREFS.remote_pref==='remote_us' && isOnsiteHeavy(r) && !isRemoteRole(r)) return 'not_remote'
  if(String(r?.stage||'')==='sourced' && roleWrongGeo(r)) return 'wrong_geo'
  if(String(r?.stage||'')==='sourced'){
    const lane=roleOffLaneReason(r)
    if(lane) return 'off_lane'
  }
  return null
}
function shouldHideRole(r){
  // Find hygiene only soft-hides Sourced noise — never hide pipeline roles.
  if(FIND_SHOW_HIDDEN) return false
  if(!FIND_PREFS.hide_filtered) return false
  if(String(r?.stage||'') !== 'sourced') return false
  return !!roleFilterReason(r)
}
function normalizeGhost(g){
  const s=String(g||'unknown').toLowerCase()
  if(s==='low'||s==='med'||s==='medium'||s==='high'||s==='unknown') return s==='medium'?'med':s
  return 'unknown'
}
function estimateGhostRisk(r){
  const existing=normalizeGhost(r?.ghost_risk)
  if(existing!=='unknown') return existing
  let score=0
  const title=String(r?.title||'')
  const url=String(r?.url||'')
  if(!url) score+=2
  if(/linkedin\.com\/jobs/i.test(url)) score+=1
  if(/urgent|immediate start|no experience|work from phone|whatsapp|crypto|\$\d+k\/week/i.test(title+' '+(r?.jd||''))) score+=3
  if(/staffing|recruiting agency|talent solutions/i.test(String(r?.company||''))) score+=1
  if(score>=4) return 'high'
  if(score>=2) return 'med'
  return 'low'
}
function ghostLabel(g){
  const n=normalizeGhost(g)
  if(n==='low') return { cls:'ghost-low', text:'Ghost risk · low' }
  if(n==='med') return { cls:'ghost-med', text:'Ghost risk · medium' }
  if(n==='high') return { cls:'ghost-high', text:'Ghost risk · high' }
  return { cls:'ghost-unknown', text:'Ghost risk · unknown' }
}
function findDealBreakers(jd){
  const t=String(jd||'').toLowerCase()
  if(!t) return []
  return (FIND_PREFS.dealbreakers||[]).filter(p=>{
    const q=String(p||'').trim().toLowerCase(); return q && t.includes(q)
  })
}
function boardFingerprints(roles){
  const urls=new Set(), fps=new Set()
  for(const r of roles||[]){
    if(r.url) urls.add(String(r.url).trim())
    fps.add(roleFingerprint(r.company, r.title))
  }
  return { urls, fps }
}
async function isDuplicateRole({ company, title, url }, excludeId){
  const roles=Object.values(ROLESMAP||{})
  const fp=roleFingerprint(company, title)
  for(const r of roles){
    if(excludeId && +r.id===+excludeId) continue
    if(url && r.url && String(r.url).trim()===String(url).trim()) return { dup:true, reason:'same URL', id:r.id }
    if(fp && roleFingerprint(r.company,r.title)===fp) return { dup:true, reason:'same company + title', id:r.id }
  }
  return { dup:false }
}
function paintGhostChip(r){
  const g=estimateGhostRisk(r)
  const meta=ghostLabel(g)
  const el=$('dw_ghost')
  if(el){ el.className='chip '+meta.cls; el.textContent=meta.text }
  return g
}
function paintLiveChip(status, detail){
  const el=$('dw_live'); if(!el) return
  if(status==='ok'){ el.className='chip live-ok'; el.textContent='Posting · looks live'+(detail?' · '+detail:'') }
  else if(status==='stale'){ el.className='chip live-stale'; el.textContent='Posting · may be stale'+(detail?' · '+detail:'') }
  else if(status==='dead'){ el.className='chip live-dead'; el.textContent='Posting · likely closed'+(detail?' · '+detail:'') }
  else { el.className='chip'; el.textContent='Posting · '+(detail||'not checked') }
}
async function checkAtsLiveness(role){
  if(!role) return
  const id=role.id
  const cached=ATS_CACHE[id]
  if(cached && Date.now()-cached.at < 10*60e3){ paintLiveChip(cached.status, cached.detail); return cached }
  paintLiveChip('…', 'checking…')
  if(!role.url){
    const out={ status:'stale', detail:'no link', at:Date.now() }
    ATS_CACHE[id]=out; paintLiveChip(out.status, out.detail); return out
  }
  // Prefer existing fetch-jd edge — CORS-safe, already deployed
  try{
    const { data, error } = await sb.functions.invoke('fetch-jd',{ body:{ url:role.url, probe:true } })
    if(error){
      const out={ status:'stale', detail:'couldn’t reach ATS', at:Date.now() }
      ATS_CACHE[id]=out; paintLiveChip(out.status, out.detail); return out
    }
    if(data?.closed || data?.gone || data?.status===404){
      const out={ status:'dead', detail:'ATS says gone', at:Date.now() }
      ATS_CACHE[id]=out; paintLiveChip(out.status, out.detail); return out
    }
    if(data?.jd){
      const got=acceptFetchedJd(data.jd)
      if(!got.ok){
        const out={ status: got.reason==='careers_page' ? 'stale' : 'stale', detail: got.reason==='careers_page'?'careers page, not JD':'thin response', at:Date.now() }
        ATS_CACHE[id]=out; paintLiveChip(out.status, out.detail); return out
      }
      const out={ status:'ok', detail:'JD reachable', at:Date.now() }
      ATS_CACHE[id]=out; paintLiveChip(out.status, out.detail); return out
    }
    const out={ status:'stale', detail:'no JD body', at:Date.now() }
    ATS_CACHE[id]=out; paintLiveChip(out.status, out.detail); return out
  }catch(_e){
    const out={ status:'stale', detail:'check failed', at:Date.now() }
    ATS_CACHE[id]=out; paintLiveChip(out.status, out.detail); return out
  }
}
function paintDealBreakers(jd){
  const hits=findDealBreakers(jd)
  const el=$('dw_dealwarn')
  if(!el) return hits
  if(!hits.length){ el.classList.add('hidden'); el.textContent=''; return hits }
  el.classList.remove('hidden')
  el.innerHTML='<b>Deal-breaker language found:</b> '+hits.map(esc).join(' · ')+'. Review before tagging Apply — this never auto-rejects.'
  return hits
}
function buildEvaluatePack(role, matchData){
  const jd=($('rp2_jd')?.value||role?.jd||'').trim()
  const ghost=estimateGhostRisk(role)
  const deal=findDealBreakers(jd)
  const age=roleAgeDays(role)
  // Prefer explicit match payload, else canonical (latest match report / role) — never materials frac.
  const score = matchData?.match_score!=null ? rp2ParseMatchPct(matchData.match_score)
    : (CURROLE?.id===role?.id ? rp2CanonicalMatchScore() : rp2ParseMatchPct(role?.match_score))
  const missing = Array.isArray(matchData?.missing) ? matchData.missing
    : (Array.isArray(RP2LASTMISS)?RP2LASTMISS:[])
  const present = Array.isArray(matchData?.present) ? matchData.present : []
  const strengths=[]
  if(!isNaN(score) && score>=70) strengths.push('Match score '+score+'% vs your materials')
  else if(!isNaN(score)) strengths.push('Match score '+score+'% — review gaps before applying')
  if(present.length) strengths.push('Covered signals: '+present.slice(0,6).join(', '))
  if(ghost==='low') strengths.push('Ghost risk looks low')
  if(isRemoteRole(role) && FIND_PREFS.remote_pref!=='onsite_ok') strengths.push('Remote-friendly language in materials')
  const risks=[]
  if(deal.length) risks.push('Deal-breakers: '+deal.join(', '))
  if(ghost==='high'||ghost==='med') risks.push('Ghost risk: '+ghost)
  if(age!=null && FIND_PREFS.max_age_days>0 && age>FIND_PREFS.max_age_days) risks.push('Posting age '+age+'d exceeds your max '+FIND_PREFS.max_age_days+'d')
  if(isBlockedCompany(role?.company)) risks.push('Company is on your blocklist')
  if(missing.length) risks.push('Not in materials yet: '+missing.slice(0,8).join(', '))
  const live=ATS_CACHE[role?.id]
  if(live?.status==='dead') risks.push('ATS posting looks closed')
  else if(live?.status==='stale') risks.push('ATS liveness uncertain')

  let suggest='stretch'
  if(deal.length || ghost==='high' || live?.status==='dead' || (!isNaN(score)&&score<45)) suggest='skip'
  else if(!isNaN(score) && score>=72 && ghost==='low' && !deal.length) suggest='apply'
  else if(isNaN(score) && ghost==='low' && !deal.length) suggest='stretch'

  const pack={
    at: new Date().toISOString(),
    score: isNaN(score)?null:score,
    ghost, deal, age, suggest,
    strengths, risks,
    missing: missing.slice(0,12),
    present: present.slice(0,12),
  }
  LAST_EVAL = pack
  return pack
}
function renderEvaluatePack(pack){
  const el=$('dw_eval'); if(!el||!pack) return
  el.classList.remove('hidden')
  const call = pack.suggest==='apply' ? 'Suggested call: Apply'
    : pack.suggest==='skip' ? 'Suggested call: Skip'
    : 'Suggested call: Stretch'
  const meta=(pack.score!=null?('Match '+pack.score+'% · '):'')+'Ghost '+esc(pack.ghost)+(pack.age!=null?(' · age '+pack.age+'d'):'')
  const strengths=(pack.strengths.length?pack.strengths:['Run Check my match for a fuller pack']).map(s=>'<li>'+esc(s)+'</li>').join('')
  const risks=(pack.risks.length?pack.risks:['None flagged from your prefs']).map(s=>'<li>'+esc(s)+'</li>').join('')
  el.innerHTML='<h4>Decision pack</h4><div class="muted" style="font-size:12.5px">'+meta+'</div><ul><li><b>Strengths</b><ul>'+strengths+'</ul></li><li><b>Watch-outs</b><ul>'+risks+'</ul></li></ul><div class="ev-call">'+esc(call)+' — tag it below (never auto-applied).</div>'
}
async function persistEvaluateReport(pack){
  if(!CURROLE||!pack) return
  try{
    await sb.from('mt_reports').insert({
      role_id: CURROLE.id,
      kind: 'evaluate',
      match_score: pack.score,
      missing_keywords: pack.missing||[],
      rewritten: JSON.stringify(pack),
    })
  }catch(_e){}
}
function getMaterials(id){ const m=materialsStore()[id]; return Array.isArray(m)?m:[] }
function addMaterial(id, text){
  const t=String(text||'').trim(); if(!t) return
  const all=materialsStore(); const cur=Array.isArray(all[id])?all[id]:[]
  cur.push({ text:t, at:new Date().toISOString() }); all[id]=cur
  localStorage.setItem('co_materials', JSON.stringify(all))
}
function insertedStore(){ try{ return JSON.parse(localStorage.getItem('co_gap_inserted')||'{}')||{} }catch(_e){ return {} } }
function gapKey(t){ return String(t||'').trim().toLowerCase().replace(/\s+/g,' ') }
function getInsertedGap(roleId, gap){
  const m=insertedStore()[roleId]; if(!m||typeof m!=='object') return null
  return m[gapKey(gap)]||null
}
function setInsertedGap(roleId, gap, line, section, job){
  if(!roleId||!gap) return
  const all=insertedStore()
  const m=(all[roleId]&&typeof all[roleId]==='object')?all[roleId]:{}
  m[gapKey(gap)]={ line:String(line||'').trim(), section:section||'', job:job||'', at:Date.now() }
  all[roleId]=m
  localStorage.setItem('co_gap_inserted', JSON.stringify(all))
}
function clearInsertedGap(roleId, gap){
  if(!roleId||!gap) return
  const all=insertedStore()
  const m=(all[roleId]&&typeof all[roleId]==='object')?all[roleId]:{}
  delete m[gapKey(gap)]
  all[roleId]=m
  localStorage.setItem('co_gap_inserted', JSON.stringify(all))
}
const DRAWER_VISIBILITY = createDrawerVisibility({ byId: $ })
const BUILDER_VISIBILITY = createBuilderVisibility({ byId: $ })
function closeDrawer(){ DRAWER_VISIBILITY.close() }
function openDrawerShell(){ DRAWER_VISIBILITY.open() }
function closeBuilder(){ BUILDER_VISIBILITY.close() }
function openBuilderView(){
  closeDrawer()
  BUILDER_VISIBILITY.open()
  hydrateWriteLocksUI()
  syncBuilderChrome()
  renderMaterialsGaps()
  rp2PaintMatchPct()
  rp2HydrateBuilderScore()
  applySentFreezeUI()
  const hasDraft = ($('rp2_edtext')?.value||'').trim().length>40
  $('bv_empty')?.classList.toggle('hidden', hasDraft)
  $('rp2_editor')?.classList.toggle('hidden', !hasDraft)
}

let ROLESMAP={}, HASDOC=new Set()
async function load(){
  let roles=null, reps=null
  {
    let rolesRes = await sb.from('mt_roles').select('*').order('created_at',{ascending:false})
    if(rolesRes.error && /sent_at|column/i.test(rolesRes.error.message||'')){
      rolesRes = await sb.from('mt_roles').select('id,owner,company,title,level,url,source,fit_score,match_score,stage,ghost_risk,jd,notes,location,created_at,updated_at').order('created_at',{ascending:false})
    }
    roles = rolesRes.data
  }
  {
    let repsRes = await sb.from('mt_reports').select('role_id,kind,match_score,created_at,sent_at').order('created_at',{ascending:false})
    if(repsRes.error && /sent_at|column/i.test(repsRes.error.message||'')){
      repsRes = await sb.from('mt_reports').select('role_id,kind,match_score,created_at').order('created_at',{ascending:false})
    }
    reps = repsRes.data
  }
  // Board cards used to ignore match reports — so Rank Sourced could "succeed" (report saved)
  // while the Sourced pill stayed blank if mt_roles.match_score didn't stick.
  const latestMatch={}
  for(const x of reps||[]){
    if(x.kind!=='match' || x.match_score==null || latestMatch[x.role_id]!=null) continue
    const n = typeof x.match_score==='number' ? x.match_score : parseInt(String(x.match_score),10)
    if(!isNaN(n)) latestMatch[x.role_id]=n
  }
  for(const r of roles||[]){
    const have = parseInt(String(r.match_score||''),10)
    if(isNaN(have) && latestMatch[r.id]!=null){
      r.match_score = latestMatch[r.id]+'%'
    }
  }
  ROLESMAP = Object.fromEntries((roles||[]).map(r=>[r.id,r]))
  HASDOC = new Set((reps||[]).filter(x=>x.kind==='resume'||x.kind==='cover').map(x=>x.role_id))
  FIND_PREFS = loadFindPrefs()
  paintCadenceNudge()
  paintReconcileBanner()
  await syncDurabilityFromDb({ roles: roles||[], reports: reps||[] })
  await syncInterviewEventsFromDb()
  await loadContactsFromDb()
  loadAccomplishments().then(()=>loadPortfolioRows()).then(async ()=>{
    if(PROFILE?.resume_struct && MEM_ROWS?.length){
      try{
        const healed=healSourceLinks(PROFILE.resume_struct, MEM_ROWS)
        PROFILE.resume_struct=healed.struct
        for(const a of healed.accomplishments){
          const prev=MEM_ROWS.find(x=>x.id===a.id)
          if(prev && prev.status!==a.status) await upsertAccomplishmentRow(a)
        }
      }catch(_e){}
    }
  }).catch(()=>{})
  const byStage={}; for(const s of [...STAGES,CLOSED]) byStage[s]=[]
  let hiddenN=0
  for(const r of (roles||[])){
    if(shouldHideRole(r)){ hiddenN++; continue }
    ;(byStage[r.stage]||(byStage[r.stage]=[])).push(r)
  }
  const active=(roles||[]).filter(r=>r.stage!==CLOSED&&r.stage!=='rejected' && !shouldHideRole(r)).length
  const sourcedN=(byStage.sourced||[]).length
  const sourcedUnscored=(byStage.sourced||[]).filter(r=>{ const n=parseInt(String(r.match_score||''),10); return isNaN(n) }).length
  const hiddenBit = hiddenN
    ? (FIND_SHOW_HIDDEN
      ? ` · showing ${hiddenN} filtered Sourced`
      : ` · <span class="hidden-chip" id="status_hidden" title="Soft-hidden Sourced: off-lane titles, wrong country, blocklist, over-age, or wrong remote pref. Click to reveal.">${hiddenN} filtered Sourced — show</span>`)
    : (FIND_SHOW_HIDDEN ? ' · <span class="hidden-chip" id="status_hidden">hide filtered again</span>' : '')
  if (active === 0) {
  $('status').innerHTML =
    'No roles yet · Run a job search, review LinkedIn, then add a role to <b>Researched</b> · You apply yourself · Paste real job descriptions instead of careers-page scrapes.'
  } else {
  $('status').innerHTML =
    active + ' active on board' + hiddenBit + ' · click a card to check fit · drag between columns'
  }  
  const sh=$('status_hidden')
  if(sh) sh.onclick=()=>{ FIND_SHOW_HIDDEN=!FIND_SHOW_HIDDEN; load() }
  if($('triage')){
    const showTriage = APP_SECTION==='board' && (sourcedN>0 || hiddenN>0)
    $('triage').classList.toggle('hidden', !showTriage)
    if($('triage_status') && !$('triage_status').dataset.busy)
      $('triage_status').textContent = sourcedN
        ? `${sourcedN} in Sourced (${sourcedUnscored} unscored) — Rank Sourced scores them (never applies).`
        : (hiddenN ? `${hiddenN} Sourced filtered (off-lane / age / remote) — click “filtered Sourced — show” above.` : 'No Sourced roles right now.')
  }
  TRIAGE_PREFS = loadTriagePrefs()
  if($('triage_sort')) $('triage_sort').value = TRIAGE_PREFS.sort
  if($('triage_filter')) $('triage_filter').value = TRIAGE_PREFS.filter
  const activeCard = CURROLE && !$('drawer')?.classList.contains('hidden') ? CURROLE.id : null
  function scoreNum(r){ const n=parseInt(String(r.match_score||''),10); return isNaN(n)?-1:n }
  function triageFilterRole(r){
    const f=TRIAGE_PREFS.filter||'all'
    if(f==='all') return true
    const v=getVerdict(r.id)
    if(f==='apply'||f==='stretch'||f==='skip') return v===f
    if(f==='unscored') return scoreNum(r)<0
    if(f==='no_verdict') return !v
    return true
  }
  function triageSortRoles(arr){
    const a=arr.slice()
    const s=TRIAGE_PREFS.sort||'match_desc'
    if(s==='match_desc') a.sort((x,y)=>scoreNum(y)-scoreNum(x) || String(x.company||'').localeCompare(String(y.company||'')))
    else if(s==='match_asc') a.sort((x,y)=>{
      const sx=scoreNum(x), sy=scoreNum(y)
      if(sx<0&&sy<0) return 0
      if(sx<0) return 1
      if(sy<0) return -1
      return sx-sy
    })
    else if(s==='company') a.sort((x,y)=>String(x.company||'').localeCompare(String(y.company||'')) || String(x.title||'').localeCompare(String(y.title||'')))
    else a.sort((x,y)=>new Date(y.created_at||0)-new Date(x.created_at||0))
    return a
  }
  $('board').innerHTML = [...STAGES,CLOSED].map(s=>{
    let it=byStage[s]||[]
    if(s==='sourced'){ it=triageSortRoles(it.filter(triageFilterRole)) }
    const cards= it.length? it.map(r=>{
      const v = getVerdict(r.id)
      const stale = daysSince(r.updated_at||r.created_at)
      const staleHtml = stale==null ? '' : (stale>=7
        ? `<span class="stale"><span class="dot-stale"></span>${stale}d</span>`
        : `<span class="stale">${stale}d</span>`)
      const doc = HASDOC.has(r.id) ? (isSent(r.id) ? `<span class="doc" title="Sent version on file">✓ sent</span>` : '<span class="doc">PDF</span>') : ''
      const vHtml = v ? `<span class="verdict ${esc(v)}">${esc(v[0].toUpperCase()+v.slice(1))}</span>` : ''
      const sn=scoreNum(r)
      const mHtml = sn>=0
        ? `<span class="match-pill" title="CareerOps match score">${sn}% match</span>`
        : (s==='sourced' ? `<span class="match-pill none" title="Not scored yet">Not scored</span>` : '')
      const why=roleFilterReason(r)
      const flag = why && (!FIND_PREFS.hide_filtered || FIND_SHOW_HIDDEN) ? `<span class="lane-pill" title="${esc(why)}">${why==='off_lane'?'off-lane':esc(why)}</span>` : ''
      const stamp=fitStamp(r)
      const stampHtml = stamp ? `<span class="doc" title="Find match: ${esc(stamp)}">why</span>` : ''
      const ageHtml = stale==null ? '' : `<span class="age-pill" title="Days on board">${stale}d</span>`
      const locLabel = String(r.location||'').trim()
      const locHtml = locLabel ? `<span class="age-pill" title="ATS location">${esc(locLabel.slice(0,42))}${locLabel.length>42?'…':''}</span>` : ''
      const compLabel = postedCompLabel(r)
      const compHtml = compLabel ? `<span class="age-pill" title="Posted compensation (ATS)">${esc(compLabel.slice(0,36))}${compLabel.length>36?'…':''}</span>` : ''
      const hideBtn = s===CLOSED
        ? `<button type="button" class="not-me restore" data-restore="${r.id}" title="Move back to Sourced">Put back</button>`
        : `<button type="button" class="not-me" data-not-me="${r.id}" title="Not a fit — move to Closed (not deleted)">Not for me</button>`
      return `<div class="cardlet${activeCard===r.id?' active':''}" draggable="true" data-id="${r.id}">
      <div class="co">${esc(r.company||'—')}</div>
      <div class="role">${esc(r.title||'')}</div>
      <div class="meta">${mHtml}${vHtml}${doc}${stampHtml}${flag}${locHtml}${compHtml}${ageHtml}</div>
      ${r.url?`<a class="jd" href="${esc(r.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Open JD ↗</a>`:''}
      ${hideBtn}
    </div>`}).join('') : '<div class="muted" style="font-size:11px;padding:8px 6px;line-height:1.4"> No roles yet. Add one to start tracking.</div>'
    return `<div class="col" data-stage="${s}"><h3>${LABEL[s]}<span>${it.length}</span></h3>${
      s==='researched'
        ? `<button type="button" class="col-add" data-add-role="1" title="You found this job — add link + JD">＋ Add role</button>`
        : ''
    }${
      s===CLOSED && it.length
        ? `<button type="button" class="col-add" data-empty-closed="1" title="Permanently delete all Closed cards" style="border-color:#f0c0c0;background:#fff8f8;color:#8a1f11">Empty Closed (${it.length})</button>`
        : ''
    }${cards}</div>`
  }).join('')
  $('board').querySelectorAll('[data-add-role]').forEach(btn=>{
    btn.onclick=e=>{ e.stopPropagation(); $('addrolebtn')?.click() }
  })
  $('board').querySelectorAll('[data-empty-closed]').forEach(btn=>{
    btn.onclick=e=>{ e.stopPropagation(); emptyClosedRoles() }
  })
  $('board').querySelectorAll('[data-not-me]').forEach(btn=>{
    btn.onclick=e=>{ e.preventDefault(); e.stopPropagation(); dismissRole(btn.dataset.notMe) }
  })
  $('board').querySelectorAll('[data-restore]').forEach(btn=>{
    btn.onclick=e=>{ e.preventDefault(); e.stopPropagation(); restoreDismissedRole(btn.dataset.restore) }
  })
  // ⏰ follow-ups: prefer interview event dates; else 14d after Applied/Interview landing
  const fu = buildFollowupStrip(
    (roles||[]).filter(r=>r.stage==='applied'||r.stage==='interview'||r.stage==='offer'),
    IV_EVENTS.length ? IV_EVENTS : loadInterviewEventsLocal()
  )
  $('followups').classList.toggle('hidden', !fu.length)
  $('followups').innerHTML = fu.length ? '<span class="fu-label">⏰ FOLLOW-UPS DUE</span><div class="fu-row">'+fu.map(f=>{
    const when = f.labelKind==='upcoming'
      ? ((f.event?.type||'interview')+' · '+f.due.toISOString().slice(0,10))
      : (f.overdue?'follow up now':'by '+f.due.toISOString().slice(0,10))
    const label=`${f.role.company||'—'} — ${f.role.title||''} · ${when}`
    return `<span class="fu-chip${f.overdue?' overdue':''}" title="${esc(label)}"><span class="fu-txt" data-fu="${f.role.id}">${esc(label)}</span><span class="fu-actions"><button type="button" data-fu-draft="${f.role.id}" title="Draft a follow-up note — never sends">Draft follow-up note</button></span></span>`
  }).join('')+'</div>' : ''
  $('followups').querySelectorAll('[data-fu]').forEach(el=>el.onclick=()=>openRole(el.dataset.fu))
  $('followups').querySelectorAll('[data-fu-draft]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); draftFollowupNote(el.dataset.fuDraft) })
}
// unwrap the real error message from Edge Function failures (instead of "non-2xx status code")
async function fnMsg(err){
  try{ if(err && err.context && typeof err.context.json==='function'){ const j=await err.context.json(); if(j && j.error) return j.error } }catch(_e){}
  return String(err && err.message || err)
}
function rp2ShowErr(msg){
  const m=String(msg||'').trim()
  if($('rp2_err')) $('rp2_err').textContent=m
  if($('bv_err')) $('bv_err').textContent=m
  if($('bv_err_empty')) $('bv_err_empty').textContent=m
  const inBuilder = $('builderView') && !$('builderView').classList.contains('hidden')
  const el = inBuilder ? ($('bv_err')||$('bv_err_empty')) : $('rp2_err')
  try{ el?.scrollIntoView({behavior:'smooth',block:'nearest'}) }catch(_e){}
}
function rp2ClearErr(){
  if($('rp2_err')) $('rp2_err').textContent=''
  if($('bv_err')) $('bv_err').textContent=''
  if($('bv_err_empty')) $('bv_err_empty').textContent=''
}
function hasStoredByoKey(){
  const o=typeof loadOpenaiPrefs==='function' ? loadOpenaiPrefs() : {}
  return anyByoKeyOnFile(PROFILE, o?.key)
}
function mapRewriteSoftError(code, extra){
  const c=String(code||'')
  const tried=(extra?.tried||[]).filter(Boolean)
  if(c==='byo_failed'){
    const detail=String(extra?.detail||'').trim()
    const base = tried.length
      ? `Your saved ${tried.join(' / ')} key failed on this request. Re-check it in Settings (wrong/expired key, or provider outage) — this is not a free-tier issue.`
      : 'Your saved AI key failed on this request. Re-check Claude / Kimi / OpenAI-compatible in Settings.'
    return detail ? base+' '+detail : base
  }
  if(c==='free_limit') return FREE_LIMIT_MSG
  if(c==='free_unavailable'||c==='free_not_enabled'||c==='no_key'){
    // Never tell someone who already saved keys to “add a key”.
    if(hasStoredByoKey()){
      return 'Your saved AI key did not complete this request. Re-check Claude / Kimi / OpenAI-compatible in Settings, then try again.'
    }
    return FREE_DOWN_MSG
  }
  return c
}
/** Drop junk gap tokens (www, stopwords, 1–2 char fragments) before Worth-adding UI. */
function sanitizeGapLabels(list){
  const STOP=new Set('a an the and or of to in for with on at by as is are be will you your our we they this that role team work experience years including from into about their them who what when where how all any can may must should more most other than then us it its need needs required requirements www http https com net org html php asp job jobs apply click here etc'.split(' '))
  return (list||[]).map(x=>String(x||'').trim()).filter(t=>{
    if(t.length<3 || t.length>48) return false
    const low=t.toLowerCase()
    if(STOP.has(low)) return false
    if(/^https?:/i.test(t) || /\.(com|net|org)\b/i.test(t)) return false
    if(/^\d+$/.test(t)) return false
    return true
  })
}


// drag to move stage
const board=$('board'); let dragId=null
board.addEventListener('dragstart',e=>{const c=e.target.closest('.cardlet'); if(c) dragId=c.dataset.id})
board.addEventListener('dragover',e=>{const col=e.target.closest('.col'); if(col){e.preventDefault(); col.classList.add('drop')}})
board.addEventListener('dragleave',e=>{const col=e.target.closest('.col'); if(col&&!col.contains(e.relatedTarget)) col.classList.remove('drop')})
board.addEventListener('drop',async e=>{e.preventDefault(); const col=e.target.closest('.col'); if(!col||!dragId)return; col.classList.remove('drop')
  const _from=ROLESMAP[dragId]?.stage
  await sb.from('mt_roles').update({stage:col.dataset.stage}).eq('id',dragId)
  logEvent('stage_move', dragId, { from:_from, to:col.dataset.stage })
  dragId=null; load()})
let suppressClick=false
board.addEventListener('dragend',()=>{ suppressClick=true; setTimeout(()=>suppressClick=false,150) })
board.addEventListener('click',e=>{ if(suppressClick) return; if(e.target.closest('a,button')) return
  const c=e.target.closest('.cardlet'); if(c) openRole(c.dataset.id) })

// ---- role panel: JD auto-load → scan / tailor / cover / jobscan / download / apply ----
let CURROLE=null, RPKIND='resume'
$('rp_close').onclick=()=> $('rolepanel').classList.add('hidden')
async function openRole(id){
  if(APP_SECTION!=='board') showAppSection('board')
  if(NEWPANEL) return openRole2(id)
  CURROLE=findRole(id); if(!CURROLE) return
  id=roleIdOf(CURROLE.id)
  logEvent('role_open', id)
  $('rp_title').textContent=CURROLE.title; $('rp_co').textContent=(CURROLE.company||'')+(CURROLE.match_score?' · '+CURROLE.match_score+' match':'')
  $('rp_apply').style.display = CURROLE.url ? '' : 'none'; if(CURROLE.url) $('rp_apply').href=CURROLE.url
  $('rp_err').textContent=''; $('rp_matchout').classList.add('hidden'); $('rp_out').classList.add('hidden')
  $('rp_jd').value=''; $('rp_jobscan').value=''; $('rp_jdstate').textContent='· loading job description…'
  $('rolepanel').classList.remove('hidden')
  loadSaved(id)
  if(CURROLE.jd){
    if(jdRejectReason(CURROLE.jd)){
      $('rp_jd').value=''
      $('rp_jdstate').textContent='· '+jdRejectMessage(jdRejectReason(CURROLE.jd))
      CURROLE.jd=''; saveJd(CURROLE, '')
    } else {
      $('rp_jd').value=CURROLE.jd; $('rp_jdstate').textContent='· saved with this card — edit if needed'
    }
  } else if(CURROLE.url){
    try{ const { data } = await sb.functions.invoke('fetch-jd',{ body:{ url:CURROLE.url } })
      if(data?.jd){
        const got=acceptFetchedJd(data.jd)
        if(!got.ok){
          $('rp_jd').value=''
          $('rp_jdstate').textContent='· '+got.msg
          if(CURROLE.jd && jdRejectReason(CURROLE.jd)) saveJd(CURROLE, '')
        } else {
          $('rp_jd').value=got.jd; $('rp_jdstate').textContent='· auto-loaded from the posting — edit if needed'; saveJd(CURROLE, got.jd)
        }
      }
      else $('rp_jdstate').textContent='· couldn’t auto-load — paste the JD here and it saves to the card automatically'
    }catch(_e){ $('rp_jdstate').textContent='· couldn’t auto-load — paste the JD here and it saves to the card automatically' }
  } else $('rp_jdstate').textContent='· no link on this card — paste the JD here and it saves to the card automatically'
}
async function saveJd(role, jd){
  role.jd=jd
  if(ROLESMAP[role.id]) ROLESMAP[role.id].jd=jd
  const { error } = await sb.from('mt_roles').update({ jd }).eq('id',role.id)
  if(error) console.warn('saveJd failed', role.id, error.message||error)
  return !error
}
let jdSaveTimer=null
$('rp_jd').addEventListener('input',()=>{
  if(!CURROLE) return
  const role=CURROLE
  clearTimeout(jdSaveTimer)
  jdSaveTimer=setTimeout(async()=>{
    const v=$('rp_jd').value.trim()
    if(!v || v===role.jd) return
    await saveJd(role, v)
    if(CURROLE===role) $('rp_jdstate').textContent='· saved to the card ✓'
  }, 800)
})
async function loadSaved(id){
  const { data: raw } = await sb.from('mt_reports').select('id,kind,match_score,rewritten,jd_text,created_at').eq('role_id',id).order('created_at',{ascending:false})
  const data = (raw||[]).filter(r=>r.kind!=='selection')
  const label={match:'Match report',resume:'Tailored resume',cover:'Cover letter',jobscan:'Jobscan report'}
  $('rp_saved').innerHTML = (data&&data.length)
    ? '<p style="font-weight:600;margin:0 0 4px">Saved for this role:</p>'+data.map(r=>{
        const isPdf = r.kind==='jobscan' && r.jd_text
        return `<div style="display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:4px 0;font-size:13px">
         <span style="flex:1">${label[r.kind]||r.kind}${isPdf?' (PDF)':''}${r.match_score?' — '+r.match_score+'%':''} <span class="muted">· ${(r.created_at||'').slice(0,10)}</span></span>
         ${r.rewritten?`<button data-view="${r.id}">View</button><button data-dl="${r.id}">⬇︎ .doc</button>`:''}
         ${isPdf?`<button data-pdf="${r.id}">Open PDF ↗</button>`:''}
         ${r.kind==='jobscan'?`<button data-del="${r.id}" style="color:#f2641b">✕ Remove</button>`:''}</div>`}).join('')
    : ''
  $('rp_saved').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    const row=data.find(x=>x.id==b.dataset.del)
    if(!confirm('Remove this Jobscan report? You can attach a fresh one after re-running Jobscan.')) return
    if(row.jd_text){ try{ await sb.storage.from('reports').remove([row.jd_text]) }catch(_e){} }
    const { error } = await sb.from('mt_reports').delete().eq('id',row.id)
    if(error){ $('rp_err').textContent=error.message; return }
    $('rp_jdstate').textContent='· Jobscan report removed — attach a new one anytime'
    loadSaved(CURROLE.id)
  })
  $('rp_saved').querySelectorAll('[data-pdf]').forEach(b=>b.onclick=async()=>{
    const row=data.find(x=>x.id==b.dataset.pdf)
    const { data:s, error } = await sb.storage.from('reports').createSignedUrl(row.jd_text, 300)
    if(error){ $('rp_err').textContent=error.message; return }
    window.open(s.signedUrl,'_blank','noopener')
  })
  $('rp_saved').querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{ const row=data.find(x=>x.id==b.dataset.view); RPKIND=row.kind==='cover'?'cover':'resume'
    $('rp_outtitle').textContent=(label[row.kind]||row.kind)+' — saved '+(row.created_at||'').slice(0,10); $('rp_outnote').textContent=AI_NOTE; $('rp_text').value=row.rewritten; $('rp_out').classList.remove('hidden') })
  $('rp_saved').querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>{ const row=data.find(x=>x.id==b.dataset.dl)
    dlDoc(rpName(row.kind), row.rewritten) })
}
const rpSafe=s=>(s||'').replace(/[^a-zA-Z0-9]+/g,'_')
const rpName=k=>`${rpSafe(PROFILE?.full_name||'Me')}_${rpSafe(CURROLE?.company||'Role')}_${k==='cover'?'CoverLetter':k==='jobscan'?'JobscanReport':'Resume'}`
function dlDoc(name,text){ const e2=s=>s.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))
  download(name+'.doc','<html><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;white-space:pre-wrap;font-size:11pt">'+e2(text)+'</body></html>','application/msword')
  try{ showAtsKeywordCheck(text) }catch(_e){}
}
function extractAtsKeywords(jd, missing){
  const fromMiss=(missing||[]).map(x=>String(x||'').replace(/^\s*no\s+/i,'').trim()).filter(Boolean)
  const stop=new Set('the a an and or for with from that this your our their into onto over under about into across within without using use used based basedon must have has will would should can may team role job work years year experience strong ability'.split(' '))
  const toks=String(jd||'').toLowerCase().match(/[a-z][a-z0-9+#./-]{2,}/g)||[]
  const freq={}
  for(const t of toks){ if(stop.has(t)||t.length<3) continue; freq[t]=(freq[t]||0)+1 }
  const fromJd=Object.entries(freq).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,18).map(([k])=>k)
  const seen=new Set()
  const out=[]
  for(const k of [...fromMiss, ...fromJd]){
    const key=k.toLowerCase()
    if(seen.has(key)) continue
    seen.add(key); out.push(k)
    if(out.length>=24) break
  }
  return out
}
function showAtsKeywordCheck(draftText){
  const box=$('rp2_ats_box'); if(!box) return
  const jd=($('rp2_jd')?.value||CURROLE?.jd||'').trim()
  const keys=extractAtsKeywords(jd, RP2LASTMISS)
  if(!keys.length){
    box.classList.remove('hidden')
    box.innerHTML='<h4>ATS keyword check</h4><p class="muted" style="margin:0">Downloaded. Add a JD or run match to score keyword coverage.</p>'
    return
  }
  const body=String(draftText||'').toLowerCase()
  const hit=[], miss=[]
  for(const k of keys){
    const tokens=String(k).toLowerCase().split(/[^a-z0-9+#]+/).filter(w=>w.length>2)
    const ok=tokens.length ? tokens.every(tok=>body.includes(tok)) : body.includes(String(k).toLowerCase())
    ;(ok?hit:miss).push(k)
  }
  box.classList.remove('hidden')
  box.innerHTML='<h4>ATS keyword check <span class="muted">(after Word download)</span></h4>'
    +'<p style="margin:0 0 8px"><b>'+hit.length+'</b> covered · <b>'+miss.length+'</b> missing from this draft</p>'
    +'<div class="chips">'
    +hit.slice(0,16).map(k=>'<span class="chip hit">'+esc(k)+'</span>').join('')
    +miss.slice(0,16).map(k=>'<span class="chip miss">'+esc(k)+'</span>').join('')
    +'</div>'
    +'<p class="muted" style="margin:8px 0 0;font-size:12px">Coverage only — add missing terms only when true in your materials.</p>'
  logEvent('ats_keyword_check', CURROLE?.id, { hit:hit.length, miss:miss.length })
}
$('rp_match').onclick = async ()=>{
  $('rp_err').textContent=''
  const jd=$('rp_jd').value.trim(); if(!jd){ $('rp_err').textContent='Load or paste the job description first.'; return }
  const b=$('rp_match'),o=b.textContent; b.disabled=true; b.textContent='Scoring…'
  try{
    const data = await invokeMatch({ resume_text:PROFILE?.resume_text||'', jd_text:jd }); const error=null; bumpUsage('match')
    if(error||data?.error) throw new Error(data?.error||error.message)
    logEvent('match_report', CURROLE.id, { score:data.match_score, method:data.method })
    $('rp_score').textContent=data.match_score+'%'
    if(data.method==='keywords'){
      $('rp_scorenote').innerHTML='keyword overlap — saved to the card<br><span style="font-size:11px">word-overlap scan, NOT a fit score</span>'
      $('rp_summary').textContent=''; $('rp_note').textContent=''
      $('rp_misslabel').textContent='Missing keywords — add where true:'
    } else {
      const src = data.method==='free' ? 'free AI' : data.method==='kimi' ? 'Kimi K3' : 'Claude'
      $('rp_scorenote').innerHTML='recruiter-style assessment ('+src+') — saved to the card<br><span style="font-size:11px">scored on real fit, not word overlap</span>'
      $('rp_summary').textContent=data.summary||''
      $('rp_note').textContent=AI_NOTE
      $('rp_misslabel').textContent='Gaps to address (in your resume or interview):'
    }
    $('rp_miss').innerHTML=(data.missing||[]).map(k=>`<span class="chip miss">${esc(k)}</span>`).join('')||'<span class="muted">none — strong coverage</span>'
    $('rp_matchout').classList.remove('hidden')
    await sb.from('mt_roles').update({ match_score: data.match_score+'%' }).eq('id',CURROLE.id)
    await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:'match', match_score:data.match_score, missing_keywords:data.missing||[] })
    ROLESMAP[CURROLE.id].match_score=data.match_score+'%'; load(); loadSaved(CURROLE.id)
  }catch(err){ $('rp_err').textContent=await fnMsg(err) }
  b.disabled=false; b.textContent=o
}
async function rpGenerate(mode){
  $('rp_err').textContent=''
  const jd=$('rp_jd').value.trim(); if(!jd){ $('rp_err').textContent='Load or paste the job description first.'; return }
  const b=mode==='cover'?$('rp_cover'):$('rp_resume'); const o=b.textContent; b.disabled=true; b.textContent='✨ Working…'
  try{
    let jobscan=''
    try{ const { data:js } = await sb.from('mt_reports').select('rewritten').eq('role_id',CURROLE.id).eq('kind','jobscan').not('rewritten','is',null).order('created_at',{ascending:false}).limit(1)
      if(js && js[0] && js[0].rewritten) jobscan=js[0].rewritten.slice(0,6000) }catch(_e){}
    let data=null, error=null; try{ data=await invokeRewrite({ jd_text:jd, mode, jobscan_text:jobscan }); bumpUsage('generate') }catch(e){ error=e }
    if(error) throw error
    if(data.error==='free_limit'){ $('rp_err').textContent=FREE_LIMIT_MSG }
    else if(data.error==='free_unavailable'||data.error==='free_not_enabled'||data.error==='no_key'){ $('rp_err').textContent=FREE_DOWN_MSG }
    else if(data.error){ $('rp_err').textContent=data.error }
    else if(!data.rewritten || !data.rewritten.trim()){ $('rp_err').textContent='Model returned nothing — hit the button again.' }
    else{
      RPKIND=mode
      logEvent(mode==='cover'?'cover_generated':'resume_tailored', CURROLE.id, { method:data.method })
      $('rp_outtitle').textContent=(mode==='cover'?'Cover letter':'Tailored resume')+(data.used_jobscan?' — built with your Jobscan findings':'')+(data.method==='free'?' · free AI':data.method==='kimi'?' · Kimi K3':'')
      $('rp_outnote').textContent=AI_NOTE
      $('rp_text').value=data.rewritten; $('rp_out').classList.remove('hidden')
      $('rp_humanize').style.display = providerSecretOnFile(PROFILE, 'humanizer_email') ? '' : 'none'
      await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:mode==='cover'?'cover':'resume', rewritten:data.rewritten, jd_text:jd.slice(0,4000) })
      HASDOC.add(CURROLE.id); loadSaved(CURROLE.id)
      if(mode==='resume'){
        // auto-rescore the tailored resume so the card reflects the improvement
        try{
          let m2=null; try{ m2=await invokeMatch({ resume_text:data.rewritten, jd_text:jd }); bumpUsage('match') }catch(_e){}
          if(m2 && !m2.error && typeof m2.match_score==='number'){
            await sb.from('mt_roles').update({ match_score: m2.match_score+'%' }).eq('id',CURROLE.id)
            if(ROLESMAP[CURROLE.id]) ROLESMAP[CURROLE.id].match_score=m2.match_score+'%'
            $('rp_score').textContent=m2.match_score+'%'
            if(m2.method==='keywords'){
              $('rp_scorenote').innerHTML='keyword overlap of the tailored resume — saved to the card'
              $('rp_summary').textContent=''; $('rp_note').textContent=''
              $('rp_misslabel').textContent='Missing keywords — add where true:'
            } else {
              $('rp_scorenote').innerHTML='recruiter-style assessment of the tailored resume — saved to the card'
              $('rp_summary').textContent=m2.summary||''
              $('rp_note').textContent=AI_NOTE
              $('rp_misslabel').textContent='Gaps to address (in your resume or interview):'
            }
            $('rp_miss').innerHTML=(m2.missing||[]).map(k=>`<span class="chip miss">${esc(k)}</span>`).join('')||'<span class="muted">none — strong coverage</span>'
            $('rp_matchout').classList.remove('hidden')
            $('rp_co').textContent=(CURROLE.company||'')+' · '+m2.match_score+'% match (tailored)'
          }
        }catch(_e){}
      }
      load()
    }
  }catch(err){ $('rp_err').textContent=await fnMsg(err) }
  b.disabled=false; b.textContent=o
}
$('rp_resume').onclick=()=>rpGenerate('resume')
$('rp_cover').onclick=()=>rpGenerate('cover')
$('rp_savejobscan').onclick = async ()=>{
  const t=$('rp_jobscan').value.trim(); if(!t){ $('rp_err').textContent='Paste the Jobscan report text first.'; return }
  const { error } = await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:'jobscan', rewritten:t })
  if(error){ $('rp_err').textContent=error.message; return }
  $('rp_jobscan').value=''; $('rp_err').textContent=''; loadSaved(CURROLE.id)
}
$('rp_upload').onclick = async ()=>{
  $('rp_err').textContent=''
  const f=$('rp_file').files[0]
  if(!f){ $('rp_err').textContent='Choose the Jobscan PDF first.'; return }
  if(f.type!=='application/pdf' && !/\.pdf$/i.test(f.name)){ $('rp_err').textContent='That needs to be a PDF (on jobscan.co: Print → Save as PDF).'; return }
  if(f.size > 15*1024*1024){ $('rp_err').textContent='PDF too big (15 MB max).'; return }
  const b=$('rp_upload'),o=b.textContent; b.disabled=true; b.textContent='⬆︎ Uploading…'
  try{
    // pull the text out of the PDF so Tailor resume can use the findings
    let jstext=''
    try{
      b.textContent='⬆︎ Reading PDF…'
      const pdfjs = await import('https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc='https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs'
      const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise
      const parts=[]
      for(let p=1;p<=Math.min(doc.numPages,20);p++){ const tc=await (await doc.getPage(p)).getTextContent(); parts.push(tc.items.map(i=>i.str).join(' ')) }
      jstext=parts.join('\n').replace(/[ \t]+/g,' ').trim()
    }catch(_e){ jstext='' }
    b.textContent='⬆︎ Uploading…'
    const path=`${ME.id}/${CURROLE.id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]+/g,'_')}`
    const { error:eUp } = await sb.storage.from('reports').upload(path, f, { contentType:'application/pdf' })
    if(eUp) throw eUp
    const { error:eIns } = await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:'jobscan', jd_text:path, rewritten: jstext||null })
    if(eIns) throw eIns
    $('rp_file').value=''
    $('rp_err').textContent=''
    // pull Jobscan's own match rate out of the report and put it on the card
    let jsScore=null
    if(jstext){ const m=jstext.match(/match\s*(?:rate|score)\D{0,20}(\d{1,3})\s*%/i) || jstext.match(/(\d{1,3})\s*%\s*match/i)
      if(m){ const n=parseInt(m[1],10); if(n>0&&n<=100) jsScore=n } }
    if(jsScore!=null){
      // Jobscan's own % is informational — do not overwrite canonical CareerOps match on the card.
      $('rp_co').textContent=(CURROLE.company||'')+(CURROLE.match_score?' · '+CURROLE.match_score+' match':'')+' · Jobscan '+jsScore+'%'
    }
    $('rp_jdstate').textContent = jstext ? ('· Jobscan report attached'+(jsScore!=null?' — Jobscan '+jsScore+'% (separate from CareerOps match)':'')+' — ✨ Tailor resume will now use its findings') : '· Jobscan PDF attached (text couldn’t be read — tailoring will use the JD only)'
    loadSaved(CURROLE.id)
  }catch(err){ $('rp_err').textContent=await fnMsg(err) }
  b.disabled=false; b.textContent=o
}
$('rp_humanize').onclick = async ()=>{
  const b=$('rp_humanize'),o=b.textContent; b.disabled=true; b.textContent='✨ Humanizing…'
  try{ const { data, error } = await sb.functions.invoke('humanize',{ body:{ text:$('rp_text').value } })
    if(error) throw error
    if(data.error==='no_humanizer') $('rp_err').textContent='Add your AI-Text-Humanizer login in Settings first.'
    else if(data.error) $('rp_err').textContent=data.error
    else $('rp_text').value=data.humanized
  }catch(err){ $('rp_err').textContent=await fnMsg(err) }
  b.disabled=false; b.textContent=o
}
$('rp_dltxt').onclick=()=> download(rpName(RPKIND)+'.txt', $('rp_text').value, 'text/plain')
$('rp_dldoc').onclick=()=> dlDoc(rpName(RPKIND), $('rp_text').value)

// ==== role panel v2 (flag: ?newpanel=1) — same tables + edge functions, sequenced flow ====
let RP2ROWS=[], RP2SEL={bullet_ids:[],edits:{}}, RP2TAG={}, RP2EDIT=null, RP2EDITBID=null, RP2SELDIRTY=false, RP2LASTMISS=[]
$('rp2_close').onclick=()=>{ rp2FlushSel(); closeDrawer() }

async function openRole2(id){
  if(APP_SECTION!=='board') showAppSection('board')
  CURROLE=findRole(id); if(!CURROLE) return
  id=roleIdOf(CURROLE.id)
  closeBuilder()
  logEvent('role_open', id, { panel:'drawer' })
  RP2EDIT=null; RP2EDITBID=null; RP2TAG={}; RP2SEL={bullet_ids:[],edits:{}}; RP2SELDIRTY=false; RP2LASTMISS=[]
  if($('rp2_title')) $('rp2_title').textContent=CURROLE.title
  if($('dw_co')) $('dw_co').textContent=CURROLE.company||'—'
  if($('dw_role')) $('dw_role').textContent=CURROLE.title||''
  const hasPct = CURROLE.match_score && !isNaN(parseInt(CURROLE.match_score,10))
  const fit = (!hasPct && CURROLE.fit_score && CURROLE.fit_score!=='—') ? rp2FitPlain(CURROLE.fit_score) : ''
  if($('rp2_co')) $('rp2_co').textContent=[CURROLE.company||'', fit].filter(Boolean).join(' · ')
  if($('dw_fit')){
    $('dw_fit').textContent = fit || (hasPct
      ? 'You already checked fit for this job. Re-run Check my match to refresh the story and gaps.'
      : 'Run Check my match to get a fit story for this job.')
  }
  if($('rp2_apply')){ $('rp2_apply').style.display=CURROLE.url?'':'none'; if(CURROLE.url) $('rp2_apply').href=CURROLE.url }
  if($('rp2_err')) $('rp2_err').textContent=''
  if($('rp2_scorebox')) $('rp2_scorebox').classList.add('hidden')
  // Provisional paint from card — async hydrate below overwrites with latest match report (canonical).
  rp2PaintMatchPct(hasPct ? parseInt(CURROLE.match_score,10) : null)
  if($('dw_frac')) $('dw_frac').innerHTML='—<small> in materials</small>'
  if($('dw_basis')) $('dw_basis').textContent='Coverage appears after a match check.'
  if($('bv_frac')) $('bv_frac').innerHTML='—<small> in materials</small>'
  if($('bv_basis')) $('bv_basis').textContent='Run a match check, then add anything worth including.'
  if($('rp2_summary')) $('rp2_summary').textContent=''
  if($('dw_ctahint')) $('dw_ctahint').textContent='Decide Apply / Stretch / Skip, then open the builder to generate a resume for this job.'
  if($('rp2_jobscan')) $('rp2_jobscan').value=''
  if($('rp2_jdstate')) $('rp2_jdstate').textContent='Paste replaces the loaded posting for this card.'
  if($('rp2_jdwrap')) $('rp2_jdwrap').classList.add('hidden')
  if($('rp2_jdtoggle')) $('rp2_jdtoggle').textContent='Edit / paste'
  if($('rp2_jd')) $('rp2_jd').value=CURROLE.jd||''
  // Purge careers/marketing scrapes that were wrongly saved as the JD
  if(CURROLE.jd && jdRejectReason(CURROLE.jd)){
    if($('rp2_err')) $('rp2_err').textContent=jdRejectMessage(jdRejectReason(CURROLE.jd))
    if($('rp2_jd')) $('rp2_jd').value=''
    CURROLE.jd=''
    if(ROLESMAP[id]) ROLESMAP[id].jd=''
    saveJd(CURROLE, '')
  }
  rp2JdPreview()
  rp2SetJdProvenance()
  syncVerdictUI(getVerdict(id))
  openDrawerShell()
  document.querySelectorAll('.cardlet.active').forEach(el=>el.classList.remove('active'))
  document.querySelector(`.cardlet[data-id="${id}"]`)?.classList.add('active')
  paintGhostChip(CURROLE)
  paintLiveChip('…', 'checking…')
  checkAtsLiveness(CURROLE)
  paintDealBreakers(CURROLE.jd||$('rp2_jd')?.value||'')
  try{ paintOutcomeUI(id) }catch(_e){}
  try{ paintRoleContacts(id) }catch(_e){}
  try{ paintSalaryCompare(id) }catch(_e){}
  // T20: interview prep when stage ≥ Interview (also Offer)
  try{
    const ix=STAGES.indexOf(CURROLE.stage)
    const iInterview=STAGES.indexOf('interview')
    const showIv = ix>=0 && iInterview>=0 && ix>=iInterview
    $('dw_interview_sec')?.classList.toggle('hidden', !showIv)
    if(showIv){
      const box=$('dw_interview_box')
      if(box){ box.classList.add('hidden'); box.innerHTML='' }
      paintInterviewRounds(id)
      loadLatestInterviewPrep(id)
    }
  }catch(_e){}
  LAST_EVAL=null
  if($('dw_eval')){ $('dw_eval').classList.add('hidden'); $('dw_eval').innerHTML='' }
  rp2RenderGaps()
  rp2LoadVers(id); rp2LoadPick(id)
  // Hydrate last match so score + gaps are visible without re-checking
  ;(async()=>{
    try{
      const { data } = await sb.from('mt_reports').select('match_score,missing_keywords,rewritten').eq('role_id',id).eq('kind','match').order('created_at',{ascending:false}).limit(1)
      const row=data&&data[0]
      if(!row || CURROLE?.id!==id) return
      const g=row.missing_keywords
      if(Array.isArray(g)&&g.length) RP2LASTMISS=sanitizeGapLabels(g)
      const score = (typeof row.match_score==='number') ? row.match_score
        : rp2ParseMatchPct(row.match_score)
      if(!isNaN(score)){
        const roleN = rp2ParseMatchPct(CURROLE.match_score)
        if(roleN !== score){
          try{ await sb.from('mt_roles').update({ match_score: score+'%' }).eq('id', id) }catch(_e){}
        }
        rp2ShowScore({ match_score:score, missing:Array.isArray(g)?g:[], summary:'', method:'restore' }, 'saved check · ')
      } else if(Array.isArray(g)&&g.length){
        rp2RenderGaps(); rp2GenNote()
        if($('rp2_scorebox')) $('rp2_scorebox').classList.remove('hidden')
      }
    }catch(_e){}
  })()
  if(!CURROLE.jd && CURROLE.url){
    $('rp2_jdread').textContent='Loading the job description from the posting…'
    $('rp2_jdread').classList.remove('empty')
    try{
      const { data, error } = await sb.functions.invoke('fetch-jd',{ body:{ url:CURROLE.url } })
      if(error || data?.error){
        $('rp2_err').textContent='Couldn’t auto-load the job posting — use Edit / paste job description.'
      } else if(data?.jd){
        const got=acceptFetchedJd(data.jd)
        if(!got.ok){
          $('rp2_err').textContent=got.msg
          $('rp2_jd').value=''
          if(CURROLE.jd && jdRejectReason(CURROLE.jd)) await saveJd(CURROLE, '')
          rp2SetJdProvenance()
        } else {
          $('rp2_jd').value=got.jd; saveJd(CURROLE, got.jd); rp2SetJdProvenance('link')
          paintDealBreakers(got.jd)
        }
      } else {
        $('rp2_err').textContent='No job description came back — use Edit / paste job description.'
      }
    }catch(_e){
      $('rp2_err').textContent='Couldn’t auto-load the job posting — use Edit / paste job description.'
    }
    rp2JdPreview()
  }
}
function rp2FitPlain(f){
  const s=String(f||'').trim()
  if(/^A/i.test(s)) return 'Our estimate: strong fit ('+s+')'
  if(/^B\+/i.test(s)) return 'Our estimate: good fit ('+s+')'
  if(/^B/i.test(s)) return 'Our estimate: decent fit ('+s+')'
  if(/^C/i.test(s)) return 'Our estimate: weak fit ('+s+')'
  return 'Our estimate: '+s
}
function rp2Ring(ms, cap){
  const n=parseInt(ms,10), el=$('rp2_ring')
  if(!isNaN(n)){ el.style.setProperty('--v',n); $('rp2_ringv').textContent=n+'%' }
  else { el.style.setProperty('--v',0); $('rp2_ringv').textContent='—' }
  const c=$('rp2_ringcap'); if(c) c.textContent = (!isNaN(n) && cap!=null) ? cap : (!isNaN(n) ? 'Last check' : '')
}
/** Reject careers/marketing scrapes that aren't a real job posting. */
function jdRejectReason(raw){
  const t=String(raw||'').trim()
  if(!t) return 'empty'
  if(t.length<350) return 'too_short'
  const lower=t.toLowerCase()
  const bad=[
    /your browser does not support the video tag/i,
    /view job openings/i,
    /current job openings/i,
    /check out our current openings/i,
    /the link may be out of date/i,
    /request a demo/i,
    /website terms of use/i,
    /modern slavery statement/i,
    /your privacy choices/i,
    /clear filters/i,
    /loading\.\.\./i,
    /return\s*\(\s*\)\s*;/i,
    /log in\s+log in/i,
    /get started\s+request a demo/i,
    /see where .+ will take your company/i,
    /join our (?:team|crew)/i,
    /department\s+location\s+clear filters/i,
  ]
  let hits=0
  for(const re of bad){ if(re.test(t)) hits++ }
  const nav=(lower.match(/\b(log in|sign in|request a demo|get started|cookie settings|privacy policy|careers)\b/g)||[]).length
  if(nav>=8) hits+=2
  if((t.match(/©\s*20\d\d/g)||[]).length>=2) hits++
  const good=/responsibilit|qualifications?|requirements|what you.?ll|about the role|years of experience|we(?:'re| are) looking|preferred qualifications|job description/i.test(t)
  if(hits>=2 && !good) return 'careers_page'
  if(hits>=3) return 'careers_page'
  // Wall of product nav with almost no role language
  if(!good && (lower.includes('expense management')||lower.includes('business travel')) && nav>=4) return 'careers_page'
  return null
}
function jdRejectMessage(reason){
  if(reason==='careers_page') return 'That link loaded a careers/marketing page — not this job’s posting. Open the real role URL, or paste the JD with Edit / paste.'
  if(reason==='too_short') return 'What we got is too short to be a job posting. Paste the real JD with Edit / paste.'
  return 'No usable job description yet — paste the real posting.'
}
function acceptFetchedJd(raw){
  const nice=formatJdReadable(raw)
  const why=jdRejectReason(nice)
  if(why) return { ok:false, reason:why, msg:jdRejectMessage(why) }
  return { ok:true, jd:nice }
}
/** Turn scraped JD blobs (no newlines) into readable paragraphs for display. Does not invent content. */
function formatJdReadable(raw){
  let t=String(raw||'').replace(/\r\n/g,'\n').replace(/\u00a0/g,' ').trim()
  if(!t) return t
  const nl=(t.match(/\n/g)||[]).length
  // Already structured enough — light cleanup only
  if(nl>=6){
    return t.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()
  }
  t=t.replace(/[ \t]+/g,' ')
  t=t.replace(/\s*[•●▪◦]\s*/g,'\n• ')
  t=t.replace(/\s+(?=[\-–—]\s+[A-Z])/g,'\n')
  const heads=[
    'Team Description','About the (?:role|job|team|company|opportunity)',
    'Role and Responsibilities','Roles? and Responsibilities','Responsibilities',
    'Qualifications?(?: and Education Requirements)?','Requirements',
    'What you.?ll (?:do|bring|need)','What we.?re looking for',
    'Preferred Qualifications?','Nice to (?:have|haves)','Must[- ]have',
    'Education(?: Requirements)?','Experience','Benefits','Compensation',
    'Equal Opportunity(?: Employer)?','How to apply','Location',
    'Secure Software[^.]{0,40}','AI Technology[^.]{0,40}',
    'Core Engineering Skills','Advanced SDLC[^.]{0,40}','AI Agent Proficiency',
    'Technical Leadership[^.]{0,40}','Process Streamlining[^.]{0,40}',
    'SDLC Integration[^.]{0,40}','Threat Adaptation'
  ]
  for(const h of heads){
    try{ t=t.replace(new RegExp('(?<!\\n)\\s*('+h+')\\s*:?\\s*','gi'),'\n\n$1\n') }catch(_){}
  }
  t=t.split(/\n{2,}/).map(para=>{
    para=para.trim()
    if(para.length<280) return para
    return para.replace(/([.!?])\s+(?=[A-Z“"])/g,'$1\n\n').trim()
  }).join('\n\n')
  return t.replace(/\n{3,}/g,'\n\n').trim()
}
function rp2JdPreview(){
  const t=$('rp2_jd').value.trim()
  const read=$('rp2_jdread')
  if(!read) return
  if(!t){
    read.textContent='No job description yet — use Edit / paste job description, or we’ll try to load it from the posting.'
    read.classList.add('empty')
    if($('rp2_jdprev')) $('rp2_jdprev').textContent=''
    return
  }
  const why=jdRejectReason(t)
  if(why){
    read.textContent=jdRejectMessage(why)
    read.classList.add('empty')
    if($('rp2_jdprev')) $('rp2_jdprev').textContent=''
    if($('dw_jdchip')) $('dw_jdchip').innerHTML='<span class="src">JD</span> · not a job posting — paste the real one'
    return
  }
  read.classList.remove('empty')
  // Display formatted; keep textarea/source as stored (Edit / paste still has raw)
  read.textContent=formatJdReadable(t)
  if($('rp2_jdprev')) $('rp2_jdprev').textContent=t.replace(/\s+/g,' ').slice(0,120)+(t.length>120?'…':'')
}
function rp2SetJdProvenance(src){
  const el=$('rp2_jdstate')
  let chip='JD · not loaded yet'
  if(src==='paste'){ if(el) el.textContent='Source: pasted by you — replaces the loaded posting for this card.'; chip='JD · pasted by you' }
  else if(src==='link'){ if(el) el.textContent='Source: loaded from the posting link — paste to replace if a recruiter sent a different JD.'; chip='JD · from posting link' }
  else if(($('rp2_jd')?.value||'').trim()){ if(el) el.textContent='Source: saved on this card — Edit / paste to replace.'; chip='JD · saved on this card' }
  else { if(el) el.textContent='Paste the real posting here (recruiter email / PDF text is fine).'; chip='JD · not loaded yet' }
  const html=`<span class="src">JD</span> · ${chip.replace(/^JD · /,'')}`
  if($('dw_jdchip')) $('dw_jdchip').innerHTML=html
}
$('rp2_jdtoggle').onclick=()=>{ const hidden=$('rp2_jdwrap').classList.toggle('hidden')
  $('rp2_jdtoggle').textContent=hidden?'Edit / paste':'Collapse editor'; if(!hidden)$('rp2_jd').focus() }
let rp2JdTimer=null
$('rp2_jd').addEventListener('input',()=>{ if(!CURROLE) return; const role=CURROLE; clearTimeout(rp2JdTimer)
  rp2JdTimer=setTimeout(async()=>{ const v=$('rp2_jd').value.trim(); if(!v||v===role.jd) return
    await saveJd(role,v); if(CURROLE===role){ rp2SetJdProvenance('paste'); rp2JdPreview() } },800) })

// ---- scoring (always resume-match; every score is saved as a match report → real history) ----
function rp2ParseMatchPct(raw){
  if(raw==null || raw==='') return NaN
  if(typeof raw==='number') return raw
  return parseInt(String(raw),10)
}
/** One honest number: latest match report wins, then role / map. Never invent from materials frac. */
function rp2CanonicalMatchScore(){
  const latest=(RP2ROWS||[]).find(r=>r.kind==='match' && r.match_score!=null)
  const fromReport = rp2ParseMatchPct(latest?.match_score)
  if(!isNaN(fromReport)) return fromReport
  const fromRole = rp2ParseMatchPct(CURROLE?.match_score)
  if(!isNaN(fromRole)) return fromRole
  return CURROLE?.id!=null ? rp2ParseMatchPct(ROLESMAP[CURROLE.id]?.match_score) : NaN
}
function rp2LastKnownScore(){ return rp2CanonicalMatchScore() }
function rp2SyncMatchEverywhere(scoreNum, { ringCap=null, reloadBoard=false }={}){
  const n = rp2ParseMatchPct(scoreNum)
  if(isNaN(n) || !CURROLE){ rp2PaintMatchPct(null); return null }
  const label = n+'%'
  CURROLE.match_score = label
  if(ROLESMAP[CURROLE.id]) ROLESMAP[CURROLE.id].match_score = label
  rp2PaintMatchPct(n)
  try{ rp2Ring(label, ringCap!=null ? ringCap : 'Last check') }catch(_e){}
  const pill = document.querySelector(`.cardlet[data-id="${CURROLE.id}"] .match-pill`)
  if(pill){ pill.textContent = label; pill.title = 'Match score' }
  else if(reloadBoard) try{ load() }catch(_e){}
  return n
}
function rp2PaintMatchPct(scoreNum){
  const n = (scoreNum==null || scoreNum==='') ? rp2CanonicalMatchScore() : rp2ParseMatchPct(scoreNum)
  const has = !isNaN(n)
  const label = has ? (n+'%') : '—'
  const top = has ? (`Match score ${n}%`) : 'Match score —'
  if($('dw_matchpct')) $('dw_matchpct').textContent = label
  if($('bv_matchpct')) $('bv_matchpct').textContent = label
  if($('bv_topscore')) $('bv_topscore').textContent = top
  ;['dw_matchhint','bv_matchhint'].forEach(id=>{
    const el=$(id); if(!el) return
    el.textContent = has ? '' : 'Run match to see score'
    el.classList.toggle('hidden', has)
  })
  // Keep legacy hook in sync (may be display:none — never the only place we show the score)
  if($('rp2_score')) $('rp2_score').textContent = has ? label : ''
  return has ? n : null
}
async function rp2HydrateBuilderScore(){
  const id = CURROLE?.id
  if(!id) return
  try{
    const { data } = await sb.from('mt_reports').select('match_score,missing_keywords').eq('role_id',id).eq('kind','match').order('created_at',{ascending:false}).limit(1)
    if(CURROLE?.id!==id) return
    const row = data && data[0]
    if(!row){
      const known = rp2CanonicalMatchScore()
      if(!isNaN(known)) rp2SyncMatchEverywhere(known, { ringCap:'On card' })
      else rp2PaintMatchPct(null)
      return
    }
    const g = row.missing_keywords
    if(Array.isArray(g) && g.length) RP2LASTMISS = sanitizeGapLabels(g)
    const score = (typeof row.match_score==='number') ? row.match_score
      : rp2ParseMatchPct(row.match_score)
    if(!isNaN(score)){
      // Latest match report is canonical — heal stale role/card drift.
      const roleN = rp2ParseMatchPct(CURROLE.match_score)
      if(roleN !== score){
        try{ await sb.from('mt_roles').update({ match_score: score+'%' }).eq('id', id) }catch(_e){}
      }
      rp2ShowScore({ match_score:score, missing:Array.isArray(g)?g:[], summary:'', method:'restore' }, 'saved check · ')
    } else {
      renderMaterialsGaps()
      rp2PaintMatchPct(null)
    }
  }catch(_e){
    const known = rp2CanonicalMatchScore()
    if(!isNaN(known)) rp2PaintMatchPct(known)
    else rp2PaintMatchPct(null)
  }
}
function rp2PaintMaterialsScore(extraBasis){
  const { inMat, worth, total } = rp2MaterialsSet()
  const scoreNum = rp2PaintMatchPct()
  const scoreLine = (scoreNum!=null) ? `Match score ${scoreNum}%.` : ''
  if($('dw_frac')){
    if(total) $('dw_frac').innerHTML=`${inMat.length}<small> / ${total} covered in your materials</small>`
    else $('dw_frac').innerHTML= scoreNum!=null ? `✓<small> match checked</small>` : `—<small> in materials</small>`
  }
  const materialsLine = total
    ? (worth.length
      ? `${inMat.length} of ${total} covered in your materials · ${worth.length} suggestion${worth.length===1?'':'s'} to add`
      : `${inMat.length} of ${total} covered in your materials`)
    : (scoreNum!=null
      ? 'No specific materials gaps flagged for this check.'
      : 'Run a match check, then add anything worth including.')
  const basisBits = [materialsLine, extraBasis||scoreLine].filter(Boolean)
  if($('dw_basis')) $('dw_basis').textContent = basisBits.join(' ')
  if($('bv_frac')){
    if(total) $('bv_frac').innerHTML=`${inMat.length}<small> / ${total} in your materials</small>`
    else $('bv_frac').innerHTML= scoreNum!=null ? `✓<small> match checked</small>` : '—<small> in materials</small>'
  }
  if($('bv_basis')) $('bv_basis').textContent = basisBits.join(' ')
  return { inMat, worth, total, materialsLine, scoreNum }
}
function rp2ShowScore(data, contextNote){
  const score=data.match_score
  const scoreNum = rp2ParseMatchPct(score)
  const hasScore = !isNaN(scoreNum)
  RP2LASTMISS=sanitizeGapLabels(Array.isArray(data.missing)?data.missing:[])
  if(hasScore){
    rp2SyncMatchEverywhere(scoreNum, {
      ringCap: data.method==='restore' ? 'Last check' : 'Just checked',
      reloadBoard: true
    })
  } else {
    rp2PaintMatchPct(null)
  }
  const story = (data.summary&&String(data.summary).trim())
    || (data.method==='keywords'
      ? 'Keyword overlap vs your resume — use gaps below, then build a pack.'
      : data.method==='restore'
        ? 'Saved match for this job. Re-run Check my match to refresh.'
        : 'Fit checked. Review gaps, then build a resume for this job.')
  if($('dw_fit')) $('dw_fit').textContent=story
  if($('rp2_summary')){
    const bits=[]
    if(data.summary&&String(data.summary).trim() && data.summary!==story) bits.push(String(data.summary).trim())
    if(hasScore){
      const ctx=contextNote?` (${String(contextNote).replace(/\s*·\s*$/,'').trim()})`:''
      const how = data.method==='keywords' ? 'Keyword overlap vs your resume'
        : data.method==='restore' ? 'Saved match score'
        : 'Match score'
      bits.push(`${how}: ${scoreNum}%${ctx}.`)
    }
    $('rp2_summary').textContent=bits.join(' ')
  }
  if($('rp2_scorenote')) $('rp2_scorenote').textContent=''
  if($('rp2_misslabel')) $('rp2_misslabel').textContent=''
  if($('rp2_ainote')) $('rp2_ainote').textContent=''
  if($('rp2_miss')) $('rp2_miss').innerHTML=''
  if($('rp2_scorebox')){
    $('rp2_scorebox').classList.remove('hidden')
    try{ $('rp2_scorebox').scrollIntoView({block:'nearest',behavior:'smooth'}) }catch(_e){}
  }
  rp2RenderGaps()
  if($('dw_ctahint')){
    $('dw_ctahint').innerHTML = getVerdict(CURROLE?.id)==='skip'
      ? '<b>Resume builder</b> still opens below — Skip only tags the card.'
      : '<b>Resume builder</b> → press the teal button to generate a pack for this job.'
  }
  rp2GenNote()
  syncBuilderChrome()
  // Paint after syncBuilderChrome — it re-renders gaps and would wipe the draft note otherwise
  rp2PaintMaterialsScore(hasScore ? `Match score ${scoreNum}%.` : '')
}
function rp2GapClean(g){ return String(g||'').trim().replace(/^\s*no\s+/i,'').replace(/\.$/,'') }
function rp2MaterialsSet(){
  const resume=(PROFILE?.resume_text||'').toLowerCase()
  const extra=getMaterials(CURROLE?.id).map(x=>String(x.text||'').toLowerCase()).join('\n')
  const blob=resume+'\n'+extra
  const inMat=[], worth=[]
  for(const g of RP2LASTMISS.slice(0,12)){
    const t=rp2GapClean(g); if(!t) continue
    const key=t.toLowerCase().split(/[^a-z0-9+]+/).filter(w=>w.length>3).slice(0,3)
    const hit=key.length && key.every(w=>blob.includes(w))
    ;(hit?inMat:worth).push(t)
  }
  return { inMat, worth, total:inMat.length+worth.length }
}
function rp2GapNote(msg){
  const el=$('bv_gapnote'); if(el) el.textContent=msg||''
  if($('rp2_err') && msg) $('rp2_err').textContent=msg
}
function rp2NormGapCmp(s){
  return String(s||'').toLowerCase()
    .replace(/^[-•·▪◦*\s]+/,'')
    .replace(/^\[added\]\s*/i,'')
    .replace(/^\s*no\s+/i,'')
    .replace(/[^a-z0-9+#]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
}
function rp2IsGapEcho(text, gap){
  const a=rp2NormGapCmp(text), b=rp2NormGapCmp(gap)
  if(!a) return true
  if(!b) return false
  if(a===b) return true
  if(b.length>=12 && a.includes(b) && a.length<=b.length+28) return true
  if(a.length>=12 && b.includes(a) && b.length<=a.length+28) return true
  const ta=[...new Set(a.split(' ').filter(w=>w.length>2))]
  const tb=new Set(b.split(' ').filter(w=>w.length>2))
  if(!ta.length||!tb.size) return false
  let inter=0; for(const w of ta) if(tb.has(w)) inter++
  const j=inter/new Set([...ta,...tb]).size
  return j>=0.82 && Math.abs(ta.length-tb.size)<=2
}
function rp2CleanMaterialText(text, gap){
  let t=String(text||'').trim().replace(/^[-•·▪◦*]\s*/,'')
  const g=rp2GapClean(gap)
  const pref=g.toLowerCase()+':'
  if(t.toLowerCase().startsWith(pref)) t=t.slice(pref.length).trim()
  return t.replace(/^\s*no\s+/i,'').trim()
}
function rp2CheckedExperienceBullets(){
  const struct=PROFILE?.resume_struct
  const ids=new Set(RP2SEL?.bullet_ids||[])
  const out=[]
  if(!ids.size) return out
  for(const r of (struct?.roles||[])){
    for(const b of (r.bullets||[])){
      if(!ids.has(b.id)) continue
      const text=String(RP2SEL?.edits?.[b.id]||b.text||'').trim()
      if(text) out.push({ id:b.id, text, job:r.header||'' })
    }
  }
  for(const b of (struct?.skills||[])){
    if(!ids.has(b.id)) continue
    const text=String(RP2SEL?.edits?.[b.id]||b.text||'').trim()
    if(text) out.push({ id:b.id, text, job:'Skills' })
  }
  return out
}
function rp2RelatedCheckedBullets(gap){
  const tokens=String(gap||'').toLowerCase().split(/[^a-z0-9+#]+/).filter(w=>w.length>3)
  if(!tokens.length) return []
  return rp2CheckedExperienceBullets().map(p=>{
    const low=p.text.toLowerCase()
    let hit=0
    for(const tok of tokens){ if(low.includes(tok)) hit++ }
    return { ...p, score: hit/tokens.length }
  }).filter(p=>p.score>=0.25 && !rp2IsGapEcho(p.text, gap))
    .sort((a,b)=>b.score-a.score || a.text.length-b.text.length)
}
function rp2MarkAddedLine(text){
  let t=String(text||'').trim().replace(/^[-•·▪◦*]\s*/,'').replace(/^\[Added\]\s*/i,'').trim()
  if(!t) return ''
  if(t.length>220) t=t.slice(0,217).replace(/\s+\S*$/,'')+'…'
  if(t[0]) t=t[0].toUpperCase()+t.slice(1)
  return '• [Added] '+t
}
function rp2BulletizeForDraft(text){
  let t=String(text||'').trim().replace(/^[-•·▪◦*]\s*/,'')
  t=t.replace(/^\s*no\s+/i,'').trim()
  if(!t) return ''
  if(t.length>220) t=t.slice(0,217).replace(/\s+\S*$/,'')+'…'
  return '• '+t
}
function rp2JobPickerHtml(gapKey, roles){
  const opts=roles.map((r,i)=>{
    const full=(r.header||('Job '+(i+1))).trim()
    const short=full.length>56?full.slice(0,54)+'…':full
    return `<button type="button" class="jp-opt" role="option" data-idx="${i}" title="${esc(full)}">${esc(short)}</button>`
  }).join('')
  return `<div class="jp" data-gap-jp="${esc(gapKey)}">
    <button type="button" class="jp-btn" aria-haspopup="listbox" aria-expanded="false"><span class="jp-lab">Choose job…</span><span class="jp-chev">▾</span></button>
    <div class="jp-menu" role="listbox">${opts||'<div class="muted" style="padding:10px 12px;font-size:12px">No jobs parsed yet — Generate still works from your full resume.</div>'}</div>
    <input type="hidden" class="jp-val" value="">
  </div>`
}
function rp2WireJobPickers(root){
  root.querySelectorAll('.jp').forEach(jp=>{
    const btn=jp.querySelector('.jp-btn')
    const lab=jp.querySelector('.jp-lab')
    const val=jp.querySelector('.jp-val')
    btn.onclick=e=>{
      e.stopPropagation()
      const open=!jp.classList.contains('open')
      root.querySelectorAll('.jp.open').forEach(x=>{ if(x!==jp){ x.classList.remove('open'); x.closest('.claim')?.classList.remove('jp-open') } })
      jp.classList.toggle('open', open)
      jp.closest('.claim')?.classList.toggle('jp-open', open)
      btn.setAttribute('aria-expanded', open?'true':'false')
    }
    jp.querySelectorAll('.jp-opt').forEach(opt=>{
      opt.onclick=e=>{
        e.stopPropagation()
        const idx=opt.getAttribute('data-idx')
        val.value=idx
        lab.textContent=opt.textContent
        lab.title=opt.getAttribute('title')||opt.textContent
        jp.querySelectorAll('.jp-opt').forEach(o=>o.classList.toggle('on', o===opt))
        jp.classList.remove('open')
        jp.closest('.claim')?.classList.remove('jp-open')
        btn.setAttribute('aria-expanded','false')
      }
    })
  })
}
function renderMaterialsGaps(){
  const { inMat, worth, total } = rp2MaterialsSet()
  const drawer=$('dw_gaps'), rail=$('bv_gaps')
  if(!total){
    const matchedVisible = $('rp2_scorebox') && !$('rp2_scorebox').classList.contains('hidden')
    const score = rp2LastKnownScore()
    const hasScore = !isNaN(score)
    const summary = (($('rp2_summary')?.textContent)||'').trim()
    let empty
    if(hasScore && score < 55){
      empty = `<div class="gaps-explain"><b>Match ${score}% is a weak overall fit</b> — not “no gaps.”
        <span class="why-low">The keyword checklist can look empty while the match still fails on market, fluency, seniority, or scope (read the summary above). Build a resume only if you still want this role as a stretch.</span>
        ${summary?`<p class="muted" style="margin:10px 0 0;font-size:12.5px;line-height:1.45">${esc(summary.slice(0,420))}${summary.length>420?'…':''}</p>`:''}
        <p style="margin:10px 0 0;font-size:13px">Next: <b>Build resume for this job</b> below, or <b>Skip</b>.</p></div>`
    } else if(matchedVisible || hasScore){
      empty = `<div class="gaps-explain">No keyword gaps flagged for this check${hasScore?` (match ${score}%)`:''}. That means overlapping keywords — not a guarantee you should apply.
        <p style="margin:10px 0 0">Next: <b>Build resume for this job</b> below if you want a pack, then apply via <b>Open JD ↗</b>.</p></div>`
    } else {
      empty = '<p class="muted" style="margin:0;font-size:13px">Gaps appear after <b>Check my match</b> — what’s already in your materials, and what’s still missing.</p>'
    }
    if(drawer) drawer.innerHTML=empty
    if(rail) rail.innerHTML=empty
    rp2PaintMaterialsScore()
    return
  }
  const dHave = inMat.length?`<div class="gap-group have"><div class="gg-h"><span class="ic">✓</span> In your materials</div>${inMat.map(t=>`<div class="gap-item">${esc(t)}</div>`).join('')}</div>`:''
  const dWorth = worth.length?`<div class="gap-group case"><div class="gg-h"><span class="ic">+</span> Worth adding?</div>${worth.map(t=>`<div class="gap-item">${esc(t)}</div>`).join('')}</div>`:''
  if(drawer) drawer.innerHTML = dHave+dWorth || '<p class="muted" style="margin:0">No gaps flagged.</p>'
  rp2PaintMaterialsScore()
  if(rail){
    let html=''
    const rid=CURROLE?.id
    const roles=(PROFILE?.resume_struct?.roles||[])
    for(const t of inMat){
      const done=getInsertedGap(rid, t)
      if(done){
        const shown=(done.line||'').replace(/^•\s*/,'')
        html+=`<details class="claim mini done"><summary><span class="tag have">In draft</span><span class="ins-prev" title="${esc(shown)}">${esc(shown.slice(0,110))}</span></summary>
          <div class="mini-body">
            <div class="c-sub" style="margin:0 0 8px">Under <b>${esc(done.job||done.section||'draft')}</b>. Edit the inserted line or remove it.</div>
            <textarea class="gap-edit" data-gap-key="${esc(t)}" style="min-height:64px;width:100%;box-sizing:border-box">${esc(shown)}</textarea>
            <div class="c-actions" style="margin-top:8px">
              <button type="button" class="btn sm" data-gap-update="${esc(t)}">Update in draft</button>
              <button type="button" class="btn sm" data-gap-clear="${esc(t)}">Remove &amp; reopen</button>
            </div>
          </div></details>`
      } else {
        const skillTarget=rp2GapTargetSection(t)==='SKILLS'
        const related=rp2RelatedCheckedBullets(t).slice(0,3)
        const relHtml=related.length
          ? `<div class="gap-proofs">${related.map((p,i)=>`<label class="gap-proof${i===0?' on':''}"><input type="radio" name="gapproof-${esc(t).slice(0,40)}" value="${esc(p.text)}" ${i===0?'checked':''}><span>${esc(p.text.slice(0,140))}${p.text.length>140?'…':''}</span></label>`).join('')}</div>`
          : `<div class="c-sub" style="margin-top:8px">No related checked bullet yet — tick one under Your experience, or paste what you’ve done below.</div>`
        html+=`<div class="claim"><div class="c-h">${esc(t)} <span class="tag have">In your materials</span></div>
          <div class="c-sub">${skillTarget
            ? 'Add under Skills. Use a checked bullet or paste what you’ve done — never the gap wording alone.'
            : 'Pick a job, then insert a bullet built from your experience — not the gap title.'}</div>
          ${skillTarget?'':rp2JobPickerHtml(t, roles)}
          ${relHtml}
          <div class="gap-ev"><textarea data-gap-detail="${esc(t)}" placeholder="Paste or type what you’ve done for: ${esc(t)}"></textarea></div>
          <div class="c-actions"><button type="button" class="btn sm" data-add-draft="${esc(t)}" data-as-skills="${skillTarget?1:0}">Insert into draft</button></div></div>`
      }
    }
    for(const t of worth){
      html+=`<div class="claim"><div class="c-h">${esc(t)} <span class="tag add">Worth adding?</span></div>
        <div class="c-sub">Not in your materials yet. Paste what you’ve done, then Generate can use it.</div>
        <div class="mat-add"><textarea data-mat-for="${esc(t)}" placeholder="Paste or type what you’ve done for: ${esc(t)}"></textarea>
        <div class="c-actions"><button type="button" class="btn sm primary" data-add-mat="${esc(t)}">Add to materials</button></div></div></div>`
    }
    rail.innerHTML=html||'<p class="muted">No gaps flagged.</p>'
    rp2WireJobPickers(rail)
    rail.querySelectorAll('.gap-proof input').forEach(inp=>{
      inp.onchange=()=>{
        const wrap=inp.closest('.gap-proofs')
        wrap?.querySelectorAll('.gap-proof').forEach(el=>el.classList.toggle('on', el.querySelector('input')===inp))
      }
    })
    rail.querySelectorAll('[data-add-mat]').forEach(btn=>{
      btn.onclick=()=>{
        const key=btn.getAttribute('data-add-mat')
        const ta=btn.closest('.claim')?.querySelector('textarea')
        const val=(ta?.value||'').trim()
        if(!val){ rp2GapNote('Paste or type what you’ve done first.'); return }
        if(rp2IsGapEcho(val, key)){ rp2GapNote('That’s just the gap wording. Paste what you’ve actually done.'); return }
        addMaterial(CURROLE.id, key+': '+val)
        rp2GapNote('Added to materials for this job.')
        renderMaterialsGaps(); rp2GenNote()
      }
    })
    rail.querySelectorAll('[data-add-draft]').forEach(btn=>{
      btn.onclick=async ()=>{
        const t=btn.getAttribute('data-add-draft')
        if(getInsertedGap(CURROLE?.id, t)){ renderMaterialsGaps(); return }
        const asSkills=btn.getAttribute('data-as-skills')==='1'
        const card=btn.closest('.claim')
        let jobIdx=null, jobHeader=''
        if(!asSkills){
          const val=card?.querySelector('.jp-val')
          if(!val || val.value===''){ rp2GapNote('Pick which job this bullet belongs under.'); return }
          jobIdx=+val.value
          jobHeader=(roles[jobIdx]?.header||'').trim()
        }
        const detail=rp2CleanMaterialText(card?.querySelector('[data-gap-detail]')?.value||'', t)
        const picked=card?.querySelector('.gap-proofs input:checked')?.value||''
        const source = detail || picked || (rp2RelatedCheckedBullets(t)[0]?.text||'')
        if(!source){
          rp2GapNote('Paste what you’ve done, or check a related experience bullet first.')
          return
        }
        if(rp2IsGapEcho(source, t)){
          rp2GapNote('Won’t insert the gap title as a resume bullet. Add what you’ve done.')
          return
        }
        btn.disabled=true
        const ok=await rp2InsertGapIntoDraft(t, { asSkills, jobIdx, jobHeader, source })
        btn.disabled=false
        if(ok){ renderMaterialsGaps(); rp2GenNote() }
      }
    })
    rail.querySelectorAll('[data-gap-update]').forEach(btn=>{
      btn.onclick=()=>{
        const key=btn.getAttribute('data-gap-update')
        const prev=getInsertedGap(CURROLE?.id, key); if(!prev) return
        const ta=btn.closest('details')?.querySelector('textarea.gap-edit')
        let nextBody=rp2CleanMaterialText(ta?.value||'', key)
        if(!nextBody){ rp2GapNote('Nothing to update.'); return }
        if(rp2IsGapEcho(nextBody, key)){ rp2GapNote('That still looks like the gap title — use a real accomplishment.'); return }
        const keepMark=/\[Added\]/i.test(ta?.value||'') || /\[Added\]/i.test(prev.line||'')
        const next=keepMark?rp2MarkAddedLine(nextBody):rp2BulletizeForDraft(nextBody)
        rp2ReplaceDraftLine(prev.line, next)
        setInsertedGap(CURROLE.id, key, next, prev.section||'EXPERIENCE', prev.job||'')
        rp2GapNote('Updated the marked line in your draft.')
        renderMaterialsGaps()
      }
    })
    rail.querySelectorAll('[data-gap-clear]').forEach(btn=>{
      btn.onclick=()=>{
        const key=btn.getAttribute('data-gap-clear')
        const prev=getInsertedGap(CURROLE?.id, key)
        if(prev?.line) rp2RemoveDraftLine(prev.line)
        clearInsertedGap(CURROLE?.id, key)
        rp2GapNote('Removed from draft — gap reopened.')
        renderMaterialsGaps()
      }
    })
  }
}
document.addEventListener('click', e=>{
  if(e.target.closest?.('.jp')) return
  document.querySelectorAll('.jp.open').forEach(jp=>{
    jp.classList.remove('open')
    jp.closest('.claim')?.classList.remove('jp-open')
    jp.querySelector('.jp-btn')?.setAttribute('aria-expanded','false')
  })
})
function rp2GapTargetSection(text){
  const t=String(text||'').toLowerCase()
  const skillish=/\b(skill|stack|saas|software|crm|tool|tools|platform|excel|sql|python|language|fluent|proficient|background in|familiarity|ats|analytics)\b/.test(t)
  const expish=/\b(led|lead|managed|owned|grew|built|hired|retention|pipeline|quota|team|director|manager|account|partner|customer|revenue|nrr|churn)\b/.test(t)
  if(skillish && !expish) return 'SKILLS'
  return 'EXPERIENCE'
}
function rp2RebuildDraftFromSecs(secs){
  const order=['_HEAD','PROFESSIONAL SUMMARY','EXPERIENCE','SKILLS','EDUCATION','CERTIFICATIONS','GAP STATUS']
  const by=Object.fromEntries(secs.map(s=>[s.name,s]))
  const out=[]
  for(const n of order){
    const s=by[n]; if(!s) continue
    if(n!=='_HEAD') out.push(n)
    for(const line of s.lines) out.push(line)
    if(!s.lines.length || s.lines[s.lines.length-1].trim()) out.push('')
  }
  for(const s of secs){
    if(order.includes(s.name)) continue
    out.push(s.name)
    for(const line of s.lines) out.push(line)
    out.push('')
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n'
}
function rp2ReplaceDraftLine(oldLine, newLine){
  const ed=$('rp2_edtext'); if(!ed||!oldLine) return
  const o=String(oldLine), n=String(newLine)
  if(ed.value.includes(o)) ed.value=ed.value.replace(o, n)
  else {
    const body=o.replace(/^•\s*/,'')
    ed.value=ed.value.split('\n').map(l=>l.replace(/^[-•·▪◦*]\s*/,'').trim()===body.trim()?n:l).join('\n')
  }
}
function rp2RemoveDraftLine(line){
  const ed=$('rp2_edtext'); if(!ed||!line) return
  const body=String(line).replace(/^•\s*/,'').trim().toLowerCase()
  ed.value=ed.value.split('\n').filter(l=>{
    const low=l.replace(/^[-•·▪◦*]\s*/,'').trim().toLowerCase()
    return !(low && (low===body || (body.length>20 && low.includes(body.slice(0,40)))))
  }).join('\n').replace(/\n{3,}/g,'\n\n')
}
async function rp2MaybePolishBullet(sourceText, gapText){
  const jd=($('rp2_jd')?.value||CURROLE?.jd||'').trim()
  const base=rp2CleanMaterialText(sourceText, gapText)
  if(!base || rp2IsGapEcho(base, gapText)) return { text:'', how:'' }
  if(!jd || base.length<24) return { text:base, how:'Inserted from your experience' }
  try{
    const data = await invokeRewrite({ jd_text:jd, mode:'bullet', bullet_text:base })
    const rw=String(data?.rewritten||'').trim().replace(/^[-•·▪◦*]\s*/,'')
    if(rw && !rp2IsGapEcho(rw, gapText) && rw.length>12){
      return { text:rw, how:'Polished from your experience' }
    }
  }catch(_e){}
  return { text:base, how:'Inserted from your experience' }
}
async function rp2InsertGapIntoDraft(gapText, opts={}){
  const ed=$('rp2_edtext'); if(!ed) return false
  if(getInsertedGap(CURROLE?.id, gapText)){
    rp2GapNote('Already inserted for this job — expand the card to edit.')
    return false
  }
  rp2GapNote('')
  const source=String(opts.source||'').trim()
  if(!source){
    rp2GapNote('Paste what you’ve done, or check a related experience bullet first.')
    return false
  }
  if(rp2IsGapEcho(source, gapText)){
    rp2GapNote('Won’t insert the gap title as a resume bullet. Add what you’ve done.')
    return false
  }
  const polished=await rp2MaybePolishBullet(source, gapText)
  if(!polished.text || rp2IsGapEcho(polished.text, gapText)){
    rp2GapNote('Couldn’t build a real bullet from that — try a fuller detail from your experience.')
    return false
  }
  const line=rp2MarkAddedLine(polished.text)
  if(!line) return false
  const asSkills=!!opts.asSkills || rp2GapTargetSection(gapText)==='SKILLS'
  const target=asSkills?'SKILLS':'EXPERIENCE'
  const jobHeader=String(opts.jobHeader||'').trim()

  $('bv_empty')?.classList.add('hidden')
  $('rp2_editor')?.classList.remove('hidden')

  let text=ed.value||''
  if(!text.trim()){
    text=['PROFESSIONAL SUMMARY','','EXPERIENCE','','SKILLS','','EDUCATION',''].join('\n')
  }
  let secs=rp2SplitDraftSections(text)
  const body=line.replace(/^•\s*/,'').trim().toLowerCase()
  const gapBody=String(gapText||'').replace(/^[-•·▪◦*]\s*/,'').trim().toLowerCase()
  for(const s of secs){
    s.lines=s.lines.filter(l=>{
      const low=l.replace(/^[-•·▪◦*]\s*/,'').trim().toLowerCase()
      if(!low) return true
      if(low===body || low===gapBody) return false
      if(body.length>24 && low.includes(body.slice(0,48))) return false
      if(gapBody.length>24 && low.includes(gapBody.slice(0,48))) return false
      return true
    })
  }
  let sec=secs.find(s=>s.name===target)
  if(!sec){
    sec={name:target, lines:[]}
    const eduIdx=secs.findIndex(s=>s.name==='EDUCATION')
    if(eduIdx>=0) secs.splice(eduIdx,0,sec)
    else secs.push(sec)
  }
  while(sec.lines.length && !sec.lines[sec.lines.length-1].trim()) sec.lines.pop()

  if(target==='EXPERIENCE'){
    if(jobHeader){
      const needle=jobHeader.toLowerCase().slice(0,28)
      let jobIdx=sec.lines.findIndex(l=>{
        const t=l.trim()
        return t && !/^[-•·▪◦*]/.test(t) && t.toLowerCase().includes(needle)
      })
      if(jobIdx<0){
        sec.lines.unshift(jobHeader, line, '')
      } else {
        let insertAt=jobIdx+1
        while(insertAt<sec.lines.length){
          const t=(sec.lines[insertAt]||'').trim()
          if(!t){ insertAt++; continue }
          if(/^[-•·▪◦*]/.test(t)){ insertAt++; continue }
          break
        }
        sec.lines.splice(insertAt, 0, line)
      }
    } else {
      sec.lines.push(line)
    }
  } else {
    sec.lines.push(line)
  }

  ed.value=rp2RebuildDraftFromSecs(secs)
  const idx=ed.value.indexOf(line)
  if(idx>=0){ ed.focus(); ed.setSelectionRange(idx, idx+line.length) }
  setInsertedGap(CURROLE?.id, gapText, line, target, jobHeader||target)
  const where=jobHeader?jobHeader.slice(0,42):target
  rp2GapNote((polished.how||'Inserted from your experience')+' under '+where+' — marked [Added] in the draft.')
  return true
}
function rp2RenderGaps(){
  renderMaterialsGaps()
  for(const id of ['rp2_gaps','rp2_gaps_gen']){
    const el=$(id); if(el){ el.classList.add('hidden'); el.innerHTML='' }
  }
}
function rp2PatchLatestMatch(score){
  // Avoid inventing a second "Latest" row — versions reload will show the real Match check.
  const truth=$('rp2_scoretruth')
  if(truth && !/just checked/i.test(truth.textContent||'')){
    truth.textContent='Just checked: '+score+'%. Trust this number until you check again.'
  }
}
async function rp2PersistScore(score, missing){
  await sb.from('mt_roles').update({ match_score: score+'%' }).eq('id',CURROLE.id)
  await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:'match', match_score:score, missing_keywords:missing||[] })
  rp2SyncMatchEverywhere(score, { ringCap:'Just checked', reloadBoard:true })
  await rp2LoadVers(CURROLE.id)
}
async function rp2MatchText(text, btn, contextNote){
  $('rp2_err').textContent=''
  const jd=$('rp2_jd').value.trim(); if(!jd){ if($('rp2_err')) $('rp2_err').textContent='Add the job description first — use Edit / paste above.'; $('rp2_jdwrap')?.classList.remove('hidden'); if($('rp2_jdtoggle')) $('rp2_jdtoggle').textContent='Collapse editor'; $('rp2_jd')?.focus(); $('rp2_err')?.scrollIntoView({behavior:'smooth',block:'nearest'}); return }
  const jdBad=jdRejectReason(jd); if(jdBad){ if($('rp2_err')) $('rp2_err').textContent=jdRejectMessage(jdBad); $('rp2_jdwrap')?.classList.remove('hidden'); if($('rp2_jdtoggle')) $('rp2_jdtoggle').textContent='Collapse editor'; $('rp2_jd')?.focus(); return }
  if(!text||!text.trim()){
    $('rp2_err').textContent='Add your resume in Settings first — Check my match needs it to score this job.'
    $('rp2_err')?.scrollIntoView({behavior:'smooth',block:'nearest'})
    return
  }
  const o=btn.textContent; btn.disabled=true; btn.textContent='Scoring… usually ~10 seconds'
  try{
    const data = await invokeMatch({ resume_text:text, jd_text:jd })
    bumpUsage('match')
    if(data.match_score==null || (typeof data.match_score!=='number' && isNaN(parseInt(data.match_score,10)))){
      throw new Error('Match ran but returned no score — try again in a moment.')
    }
    logEvent('match_report', CURROLE.id, { score:data.match_score, method:data.method, panel:'v2' })
    rp2ShowScore(data, contextNote)
    await rp2PersistScore(data.match_score, data.missing)
    $('rp2_scorebox')?.scrollIntoView({behavior:'smooth',block:'nearest'})
  }catch(err){
    const msg=await fnMsg(err)
    $('rp2_err').textContent=msg||'Match failed — try again.'
    $('rp2_err')?.scrollIntoView({behavior:'smooth',block:'nearest'})
  }
  btn.disabled=false; btn.textContent=o
}
$('rp2_match').onclick=()=> rp2MatchText(PROFILE?.resume_text||'', $('rp2_match'), 'your full resume · ')

// ---- documents & versions (mt_reports is already the append-only history) ----
function rp2VerNames(){
  try{ return JSON.parse(localStorage.getItem('rp2_ver_names')||'{}')||{} }catch(_e){ return {} }
}
function rp2SaveVerName(id, name){
  const m=rp2VerNames(); if(name) m[id]=name; else delete m[id]
  localStorage.setItem('rp2_ver_names', JSON.stringify(m))
  persistVerDisplayName(id, name||null)
}
function rp2HumanVerName(r){
  const co=(CURROLE?.company||'').trim()||'Company'
  const role=(CURROLE?.title||'').trim()||'Role'
  const t=r.created_at ? new Date(r.created_at) : null
  const when=t && !isNaN(t) ? t.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric'}) : (r.created_at||'').slice(0,10)
  if(r.kind==='match') return `Match check — ${co} — ${when}`
  if(r.kind==='cover') return `${co} — ${role} — cover — ${when}`
  if(r.kind==='jobscan') return `${co} — ${role} — Jobscan — ${when}`
  return `${co} — ${role} — ${when}`
}
/** Named sent artifact: answers "what did I send to X?" in <10s. */
function rp2SentArtifactName(r){
  const co=(CURROLE?.company||'').trim()||'Company'
  const when=new Date().toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric'})
  const kind=r?.kind==='cover'?'cover':'resume'
  return `${co} · sent · ${when} · ${kind}`
}
function rp2SentChipLabel(r){
  const custom = r?.id ? (rp2VerNames()[r.id]||r.display_name||'') : ''
  if(custom && /sent/i.test(custom)) return '✓ '+custom
  const co=(CURROLE?.company||'').trim()||'Company'
  const when=new Date().toLocaleString('en-US',{month:'short',day:'numeric'})
  return `✓ sent · ${co} · ${when}`
}
function rp2MarkVersionSent(id, on){
  const r=RP2ROWS.find(x=>x.id==id); if(!r) return false
  if(on && !confirm('Mark this version Sent? The draft freezes (read-only) and is named with company + date so you can find it later.')) return false
  setVerSent(id, on)
  if(on){
    rp2SaveVerName(id, rp2SentArtifactName(r))
    if(CURROLE) setSent(CURROLE.id, true)
  } else if(CURROLE && !(RP2ROWS||[]).some(x=>(x.kind==='resume'||x.kind==='cover') && isVerSent(x.id) && x.id!==id)){
    setSent(CURROLE.id, false)
  }
  if(RP2EDIT && RP2EDIT.id===id) applySentFreezeUI()
  rp2LoadVers(CURROLE.id); load()
  logEvent(on?'version_sent_freeze':'version_sent_unfreeze', CURROLE?.id, { ver:id, name: on ? rp2SentArtifactName(r) : null })
  return true
}
function rp2VerLabel(r, vnum, { latest=false }={}){
  const custom=rp2VerNames()[r.id]||r.display_name
  const isPdf=r.kind==='jobscan'&&r.jd_text
  const name=custom || rp2HumanVerName(r)
  const sent = (r.kind==='resume'||r.kind==='cover') && isVerSent(r.id)
    ? ` <span class="sent on" style="margin-left:6px" title="Sent artifact">${esc(custom && /sent/i.test(custom) ? '✓ sent' : '✓ sent · frozen')}</span>`
    : ''
  return `<span class="rp2-vername">${esc(name)}</span>${latest?' <span class="muted">· Latest</span>':''}${isPdf?' (PDF)':''}${sent}`
}
function rp2VerRow(r, vnum, { latest=false, scoreFallback=null }={}){
  let sn=rp2ParseMatchPct(r.match_score)
  if(isNaN(sn) && scoreFallback!=null) sn=rp2ParseMatchPct(scoreFallback)
  const score = (!isNaN(sn) && (r.kind==='match' || r.kind==='resume' || r.kind==='cover'))
    ? ` <span class="rp2-scorepill" title="Match score">${sn}%</span>`
    : ''
  const when=(r.created_at||'').slice(0,10)
  const whenBit = (r.kind==='resume'||r.kind==='cover'||r.kind==='jobscan') ? '' : ` <span class="muted">· ${esc(when)}</span>`
  const isPdf=r.kind==='jobscan'&&r.jd_text
  const moreDoc = r.rewritten&&r.kind!=='jobscan'
    ? `<details class="rp2-more"><summary>⋯</summary><div class="rp2-moremenu">
        <button type="button" data-v2match="${r.id}">Re-run match check on this version</button>
        <button type="button" class="rp2-link" data-v2dl="${r.id}">⬇︎ Download Word (.doc)</button>
        <button type="button" class="rp2-link" data-v2sent="${r.id}">${isVerSent(r.id)?'Unfreeze Sent':'Mark Sent (freeze)'}</button>
        <button type="button" class="rp2-link" data-v2rename="${r.id}">Rename…</button>
      </div></details>`
    : ''
  const moreJs = r.kind==='jobscan'
    ? `${isPdf?`<button type="button" class="rp2-link" data-v2pdf="${r.id}">Open PDF ↗</button>`:''}<details class="rp2-more"><summary>⋯</summary><div class="rp2-moremenu">
        <button type="button" data-v2del="${r.id}" style="color:#f2641b">✕ Remove</button>
        <button type="button" class="rp2-link" data-v2rename="${r.id}">Rename…</button>
      </div></details>`
    : ''
  return `<div class="rp2-ver"><span class="rp2-badge ${esc(r.kind)}">${esc(r.kind)}</span>
    <span style="flex:1;min-width:0">${rp2VerLabel(r,vnum,{latest})}${score}${whenBit}</span>
    ${moreDoc?`<button class="primary" data-v2view="${r.id}">View / Edit</button>${moreDoc}`:''}
    ${moreJs}</div>`
}
function rp2PastBucket(iso){
  const d=new Date(iso||Date.now()), now=new Date()
  const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate())
  const dayMs=864e5
  const age=Math.floor((startToday-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/dayMs)
  if(age<=0) return 'Today'
  if(age<7) return 'This week'
  if(age<14) return 'Last week'
  return d.toLocaleString('en-US',{month:'short', year:'numeric'})
}
function rp2BindVers(root){
  root.querySelectorAll('details.rp2-more').forEach(d=>{
    d.addEventListener('toggle', ()=>{
      if(!d.open){ d.classList.remove('up'); return }
      root.querySelectorAll('details.rp2-more[open]').forEach(o=>{ if(o!==d) o.open=false })
      const menu=d.querySelector('.rp2-moremenu')
      const canvas=$('builderView')?.querySelector('.b-canvas') || document.documentElement
      const rect=d.getBoundingClientRect()
      const spaceBelow=(canvas.getBoundingClientRect?.().bottom||window.innerHeight)-rect.bottom
      d.classList.toggle('up', spaceBelow<160)
      if(menu){ menu.style.maxHeight='none' }
    })
  })
  root.querySelectorAll('[data-v2view]').forEach(b=>b.onclick=()=>rp2OpenEditor(+b.dataset.v2view))
  root.querySelectorAll('[data-v2match]').forEach(b=>b.onclick=()=>{ const r=RP2ROWS.find(x=>x.id==b.dataset.v2match)
    const host=b.closest('details'); if(host) host.open=false
    rp2MatchText(r.rewritten, b, (r.kind==='cover'?'cover letter':'resume')+' · ') })
  root.querySelectorAll('[data-v2dl]').forEach(b=>b.onclick=()=>{ const r=RP2ROWS.find(x=>x.id==b.dataset.v2dl); dlDoc(rpName(r.kind), r.rewritten) })
  root.querySelectorAll('[data-v2pdf]').forEach(b=>b.onclick=async()=>{ const r=RP2ROWS.find(x=>x.id==b.dataset.v2pdf)
    const { data:s, error } = await sb.storage.from('reports').createSignedUrl(r.jd_text,300)
    if(error){ $('rp2_err').textContent=error.message; return } window.open(s.signedUrl,'_blank','noopener') })
  root.querySelectorAll('[data-v2del]').forEach(b=>b.onclick=async()=>{ const r=RP2ROWS.find(x=>x.id==b.dataset.v2del)
    if(!confirm('Remove this Jobscan report? You can attach a fresh one anytime.')) return
    if(r.jd_text){ try{ await sb.storage.from('reports').remove([r.jd_text]) }catch(_e){} }
    const { error } = await sb.from('mt_reports').delete().eq('id',r.id)
    if(error){ $('rp2_err').textContent=error.message; return }
    rp2LoadVers(CURROLE.id) })
  root.querySelectorAll('[data-v2rename]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.v2rename, r=RP2ROWS.find(x=>String(x.id)===String(id)); if(!r) return
    const cur=rp2VerNames()[r.id]||r.display_name||''
    const next=prompt('Name this save (company + what it is works best):', cur || ((CURROLE?.company||'')+' '+(r.kind==='cover'?'cover':'resume')))
    if(next==null) return
    rp2SaveVerName(r.id, next.trim()); rp2LoadVers(CURROLE.id)
  })
  root.querySelectorAll('[data-v2sent]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.v2sent
    const r=RP2ROWS.find(x=>String(x.id)===String(id)); if(!r) return
    const on=!isVerSent(r.id)
    rp2MarkVersionSent(r.id, on)
  })
}
async function rp2LoadVers(id){
  let data=null, loadErr=null
  try{
    let res = await sb.from('mt_reports').select('id,kind,match_score,rewritten,jd_text,created_at,display_name,sent_at').eq('role_id',id).order('created_at',{ascending:false})
    if(res.error && /display_name|sent_at|column/i.test(res.error.message||'')){
      res = await sb.from('mt_reports').select('id,kind,match_score,rewritten,jd_text,created_at').eq('role_id',id).order('created_at',{ascending:false})
    }
    data=res.data; loadErr=res.error
  }catch(e){ loadErr=e }
  if(loadErr){
    $('rp2_vers').innerHTML=`<p class="err" style="margin:6px 0">Some saved items didn’t load. <button type="button" id="rp2_versretry">Retry</button></p>`
    const rb=$('rp2_versretry'); if(rb) rb.onclick=()=>rp2LoadVers(id)
    return
  }
  RP2ROWS=data||[]
  hydrateVersionMetaFromRows(RP2ROWS)
  const label={match:'Match check',resume:'Tailored resume',cover:'Cover letter',jobscan:'Jobscan report'}
  const rows=RP2ROWS.filter(r=>r.kind!=='selection')
  const asc=[...rows].reverse(), counts={}, vnum={}
  asc.forEach(r=>{ if(r.kind==='resume'||r.kind==='cover'){ counts[r.kind]=(counts[r.kind]||0)+1; vnum[r.id]=counts[r.kind] } })
  const vc=$('rp2_verscount'); if(vc) vc.textContent = rows.length ? `(${rows.length})` : ''
  if(!rows.length){
    $('rp2_vers').innerHTML='<p class="muted" style="font-size:13px;margin:6px 0 0">Nothing saved yet — generate a draft above.</p>'
    $('rp2_tl').innerHTML=''
    paintWhatShipped(id)
    return
  }
  const docs=rows.filter(r=>r.kind==='resume'||r.kind==='cover'||r.kind==='jobscan')
  const checks=rows.filter(r=>r.kind==='match')
  const latestDoc={}, pastDocs=[]
  for(const r of docs){
    if(!latestDoc[r.kind]) latestDoc[r.kind]=r
    else pastDocs.push(r)
  }
  const latestCheck=checks[0]||null
  const pastChecks=checks.slice(1)
  const docOrder=['resume','cover','jobscan']
  const latestHtml = docOrder.filter(k=>latestDoc[k]).map(k=>rp2VerRow(latestDoc[k], vnum, { latest:true })).join('')
  let pastHtml=''
  if(pastDocs.length){
    const buckets={}
    for(const r of pastDocs){ const b=rp2PastBucket(r.created_at); (buckets[b]||(buckets[b]=[])).push(r) }
    const orderB=['Today','This week','Last week']
    const keys=[...orderB.filter(k=>buckets[k]), ...Object.keys(buckets).filter(k=>!orderB.includes(k))]
    pastHtml = `<details class="rp2-past"><summary>Show ${pastDocs.length} older documents</summary>`+
      keys.map(k=>`<div class="rp2-pastgroup"><b>${esc(k)}</b>${buckets[k].map(r=>rp2VerRow(r,vnum)).join('')}</div>`).join('')+
      `</details>`
  }
  const checkHtml = latestCheck
    ? `<div class="rp2-latest" style="border-color:#e0c48a;background:#fffaf0;margin-top:10px"><h4>Current match check</h4>${rp2VerRow(latestCheck, vnum, { latest:true, scoreFallback:rp2LastKnownScore() })}`+
      (pastChecks.length?`<details class="rp2-past"><summary>Show ${pastChecks.length} earlier checks</summary>${pastChecks.map(r=>rp2VerRow(r,vnum)).join('')}</details>`:'')+
      `</div>`
    : ''
  $('rp2_vers').innerHTML = `<div class="rp2-latest"><h4>Documents</h4>${latestHtml||'<p class="muted" style="margin:0;font-size:13px">No resume/cover saved yet.</p>'}</div>${pastHtml}${checkHtml}`
  const crumbs = [...docOrder.filter(k=>latestDoc[k]).map(k=>label[k]), latestCheck?'Match check':null].filter(Boolean)
    .map(k=>`<span class="rp2-tlnode">${esc(k)}</span>`)
  $('rp2_tl').innerHTML = crumbs.join('<span class="muted" style="font-size:11px"> · </span>')
  rp2BindVers($('rp2_vers'))
  paintWhatShipped(id)
}
function paintWhatShipped(roleId){
  const id=roleId||CURROLE?.id
  const timeline=buildVersionTimeline({
    reports: RP2ROWS||[],
    outcome: id ? loadOutcomes()[id] : null,
    role: id ? (ROLESMAP[id]||CURROLE) : CURROLE,
    displayNames: rp2VerNames(),
    sentVerIds: sentVerStore(),
  })
  const lines=timelineLines(timeline)
  const html = `<p class="ship-answer">${esc(timeline.summary.answer)}</p>`
    +(lines.length
      ? `<ol>${lines.map(l=>`<li><span class="ship-type">${esc(l.type)}</span><span class="muted">${esc(l.at)}</span> — ${esc(l.label)}</li>`).join('')}</ol>`
      : `<p class="muted" style="margin:0">Run a match check or mark a version Sent to start this timeline.</p>`)
  ;['dw_shipped','bv_shipped'].forEach(elId=>{
    const el=$(elId); if(el) el.innerHTML=html
  })
}
function rp2OpenEditor(id){
  const r=RP2ROWS.find(x=>x.id===id); if(!r) return
  RP2EDIT=r
  const custom=rp2VerNames()[id]
  const co=(CURROLE?.company||'').trim()||'This job'
  const kind=r.kind==='cover'?'Cover letter':'Tailored resume'
  const when=(r.created_at||'').slice(0,10)
  const human = custom || rp2HumanVerName(r)
  $('rp2_edtitle').textContent=human+' — edit freely; saving makes a new version.'
  $('rp2_edtext').value=r.rewritten||''
  if($('rp2_humanize')) $('rp2_humanize').style.display = providerSecretOnFile(PROFILE, 'humanizer_email') ? '' : 'none'
  $('bv_empty')?.classList.add('hidden')
  $('rp2_editor').classList.remove('hidden')
  if($('bv_verpill')) $('bv_verpill').textContent=human
  if($('bv_saved')) $('bv_saved').classList.remove('hidden')
  applySentFreezeUI()
  if($('builderView')?.classList.contains('hidden')) openBuilderView()
  else syncBuilderChrome()
  $('rp2_editor').scrollIntoView({behavior:'smooth',block:'nearest'})
}
function applySentFreezeUI(){
  const frozen = !!(RP2EDIT && RP2EDIT.id && isVerSent(RP2EDIT.id))
  const ed=$('rp2_edtext')
  if(ed){ ed.readOnly=frozen; ed.title=frozen?'This version is Sent — frozen. Unfreeze from Documents ⋯ menu to edit.':'' }
  $('rp2_editor')?.classList.toggle('frozen', frozen)
  if($('rp2_edsave')) $('rp2_edsave').disabled=frozen
  if($('rp2_generate')) $('rp2_generate').disabled=frozen
  if($('bv_gen_empty')) $('bv_gen_empty').disabled=frozen
  if($('rp2_review')) $('rp2_review').disabled=false
  if($('bv_sent')){
    if(frozen && RP2EDIT){
      $('bv_sent').textContent = rp2SentChipLabel(RP2EDIT)
      $('bv_sent').title = 'Sent artifact — click to unfreeze'
    } else if(isSent(CURROLE?.id)){
      const sentRow=(RP2ROWS||[]).find(x=>(x.kind==='resume'||x.kind==='cover') && isVerSent(x.id))
      $('bv_sent').textContent = sentRow ? rp2SentChipLabel(sentRow) : '✓ sent'
      $('bv_sent').title = 'A version is marked Sent'
    } else {
      $('bv_sent').textContent = 'not sent'
      $('bv_sent').title = 'Mark this version Sent — freezes edits and names it with company + date'
    }
    $('bv_sent').classList.toggle('on', frozen || isSent(CURROLE?.id))
  }
}
$('rp2_edclose').onclick=()=> $('rp2_editor').classList.add('hidden')
$('rp2_edsave').onclick=async()=>{
  if(!RP2EDIT) return
  const t=$('rp2_edtext').value.trim()
  if(!t){ $('rp2_err').textContent='Nothing to save.'; return }
  if(t===(RP2EDIT.rewritten||'').trim()){ $('rp2_err').textContent='No changes yet — edit the text first.'; return }
  const b=$('rp2_edsave'),o=b.textContent; b.disabled=true; b.textContent='Saving…'
  const { error } = await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:RP2EDIT.kind, rewritten:t, jd_text:(RP2EDIT.jd_text||'').slice(0,4000)||null })
  b.disabled=false; b.textContent=o
  if(error){ $('rp2_err').textContent=error.message; return }
  logEvent('version_saved', CURROLE.id, { kind:RP2EDIT.kind, panel:'builder' })
  if($('rp2_err')) $('rp2_err').textContent=''
  await rp2LoadVers(CURROLE.id)
  const nr=RP2ROWS.find(r=>r.kind===RP2EDIT.kind && (r.rewritten||'').trim()===t)
  if(nr){
    RP2EDIT=nr
    const name=rp2HumanVerName(nr)
    if(!rp2VerNames()[nr.id]) rp2SaveVerName(nr.id, name)
    if($('bv_verpill')) $('bv_verpill').textContent=name
    if($('bv_saved')){ $('bv_saved').classList.remove('hidden'); $('bv_saved').textContent='Saved' }
    await rp2LoadVers(CURROLE.id)
  }
  load()
}
$('rp2_edmatch').onclick=()=> rp2MatchText($('rp2_edtext').value.trim(), $('rp2_edmatch'), 'the text in the editor · ')
$('rp2_humanize').onclick=async()=>{
  const b=$('rp2_humanize'),o=b.textContent; b.disabled=true; b.textContent='✨ Humanizing…'
  try{ const { data, error } = await sb.functions.invoke('humanize',{ body:{ text:$('rp2_edtext').value } })
    if(error) throw error
    if(data.error==='no_humanizer') $('rp2_err').textContent='Add your AI-Text-Humanizer login in Settings first.'
    else if(data.error) $('rp2_err').textContent=data.error
    else $('rp2_edtext').value=data.humanized
  }catch(err){ $('rp2_err').textContent=await fnMsg(err) }
  b.disabled=false; b.textContent=o
}
$('rp2_eddl').onclick=()=>{ if(RP2EDIT) dlDoc(rpName(RP2EDIT.kind), $('rp2_edtext').value) }

// ---- Phase 2: pick what to use (deterministic parse of YOUR resume — no AI, you confirm it) ----
function rp2LooksEdu(t){
  return /\b(B\.?\s?S\.?|B\.?\s?A\.?|M\.?\s?S\.?|M\.?\s?B\.?\s?A\.?|Ph\.?\s?D\.?|Bachelor|Master'?s|University|College|IATA|certificat|diploma|Megatrend|Faculty|graduat)\b/i.test(String(t||''))
}
// Soft-wrapped resume lines often break mid-sentence ("…direct API," / "and aggregator…").
// Heal aggressively — saved splits must not survive into the pick UI.
function rp2CleanBulletText(t){
  return String(t||'')
    .replace(/[\u200b\u200c\u200d\ufeff]/g,'')
    .replace(/[\u00a0\u202f\u2007]/g,' ')
    .replace(/[，]/g,',')
    .replace(/\s+/g,' ')
    .trim()
}
function rp2NewBulletOpener(t){
  return /^(Owned|Negotiated|Established|Led|Built|Drove|Managed|Grew|Cut|Set|Standardized|Governed|Launched|Designed|Created|Developed|Delivered|Improved|Reduced|Increased|Partnered|Advised|Founded|Rebuilt|Directed|Oversaw|Supported|Enabled|Ran|Wrote|Published|Secured|Expanded|Turned|Reported|Mentored|Coached|Hired|Scaled|Defined|Implemented|Migrated|Integrated|Optimized|Analyzed|Presented|Closed|Won|Exceeded)\b/.test(String(t||'').trim())
}
function rp2ShouldMergeBullets(prev, next){
  const p=rp2CleanBulletText(prev), n=rp2CleanBulletText(next)
  if(!p || !n) return false
  if(/[,;:—–-]$/.test(p)) return true
  if(/^[a-z(]/.test(n)) return true
  if(/^(and|or|to|of|for|with|from|into|via|the|a|an|direct[-–]|online|channels|including|plus|as well)\b/i.test(n)) return true
  // Previous line has no sentence end → treat next as wrap unless it clearly starts a new achievement
  if(!/[.!?]"?$/.test(p)){
    if(!rp2NewBulletOpener(n)) return true
    if(/\b(terms|data|api|apis|and|or|the|to|of|for|with|from|into|level|micro|macro|online|direct|provider|providers|partners|partnerships|agreements|carriers|including|united|revenue|growth|strategy|strategies)$/i.test(p)) return true
  }
  return false
}
function rp2HealBullets(bullets){
  let out=[]
  for(const b of bullets||[]){
    const t=rp2CleanBulletText(b.text)
    if(!t) continue
    if(out.length && rp2ShouldMergeBullets(out[out.length-1].text, t)){
      out[out.length-1].text=rp2CleanBulletText(out[out.length-1].text+' '+t)
      // keep earliest source link when merging
      continue
    }
    const row={ id:b.id || ('b'+out.length), text:t }
    if(b.source_type){ row.source_type=b.source_type; row.source_id=b.source_id }
    out.push(row)
  }
  // Second pass — catch A+B+C wraps
  let changed=true
  while(changed){
    changed=false
    const next=[]
    for(const b of out){
      if(next.length && rp2ShouldMergeBullets(next[next.length-1].text, b.text)){
        next[next.length-1].text=rp2CleanBulletText(next[next.length-1].text+' '+b.text)
        changed=true
      } else next.push(b)
    }
    out=next
  }
  return out
}
function rp2Parse(text){
  // Deterministic split: roles + bullets, plus Summary / Skills / Education as real sections.
  // Verbatim text only — never rewrites. Education must NEVER become a job bullet.
  const MON='(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+'
  const dateRe=new RegExp('(('+MON+')?(19|20)\\d{2})\\s*(?:[–—−-]|to)\\s*((('+MON+')?(19|20)\\d{2})|present|now|current)','i')
  const secRe=/^(experience|work experience|professional experience|employment( history)?|education|skills?|technical skills|core competencies|certifications?|summary|professional summary|profile|objective|projects?|additional|languages?|awards?)\s*:?\s*$/i
  const mostlyDate=s=>{
    const t=(s||'').trim()
    if(!dateRe.test(t)) return false
    const rest=t.replace(dateRe,'').replace(/[·|•,\s]/g,'').replace(/remote|hybrid|onsite|on-site|us|eu|latam|chicago|il/gi,'')
    return rest.length<8
  }
  const roles=[]; let cur=null, bid=0, pending=[], mode='pre'
  const summary=[], skills=[], education=[], certs=[]
  const PLACEHOLDER=/^\(\s*top of resume\s*\)$/i
  // Skills-style "a · b · c" lists only — never chop experience bullets into fake sentences
  const splitBits=(t)=>{
    t=t.trim()
    if((t.match(/ [·•|] /g)||[]).length>=3) return t.split(/ [·•|] /)
    return [t]
  }
  const pushBits=(bucket,t)=>{
    for(const s of splitBits(t).map(x=>rp2CleanBulletText(x).replace(/^[,;·•|-]+\s*/,'')).filter(x=>x.length>=3))
      bucket.push({ id:'b'+(++bid), text:s })
  }
  const pushRole=(t, {forceNew=false}={})=>{
    if(!cur) return
    const s=rp2CleanBulletText(t).replace(/^[,;·•|-]+\s*/,'')
    if(s.length<8) return
    if(rp2LooksEdu(s)){ education.push({ id:'b'+(++bid), text:s }); return }
    if(!forceNew && cur.bullets.length && rp2ShouldMergeBullets(cur.bullets[cur.bullets.length-1].text, s)){
      const last=cur.bullets[cur.bullets.length-1]
      last.text=rp2CleanBulletText(last.text+' '+s)
      return
    }
    cur.bullets.push({ id:'b'+(++bid), text:s })
  }
  const modeOf=(l)=>{
    const s=l.toLowerCase().replace(/:$/,'')
    if(/^(education)/.test(s)) return 'education'
    if(/^(skills?|technical skills|core competencies)/.test(s)) return 'skills'
    if(/^(summary|professional summary|profile|objective)/.test(s)) return 'summary'
    if(/^(certifications?)/.test(s)) return 'certs'
    if(/^(experience|work experience|professional experience|employment)/.test(s)) return 'experience'
    return 'other'
  }
  for(const raw of (text||'').split(/\r?\n/)){
    const l=rp2CleanBulletText(raw)
    if(!l) continue
    if(secRe.test(l)){ mode=modeOf(l); cur=null; pending=[]; continue }
    if(/^[•·▪◦*]\s+/.test(l) || /^[-–—]\s+/.test(l)){
      const body=l.replace(/^[•·▪◦*]\s+/,'').replace(/^[-–—]\s+/,'')
      pending=[]
      if(mode==='skills'){ pushBits(skills, body); continue }
      if(mode==='education'){ pushBits(education, body); continue }
      if(mode==='certs'){ pushBits(certs, body); continue }
      if(mode==='summary'){ summary.push(body); continue }
      // Real bullet marker = new bullet; still merge if previous line was a mid-wrap fragment
      pushRole(body, {forceNew:false}); continue
    }
    // Dated job header — only in experience/pre/other (not under Education/Skills)
    if(dateRe.test(l) && l.replace(dateRe,'').trim().length<120 && mode!=='education' && mode!=='skills' && mode!=='summary' && mode!=='certs'){
      const head=[...pending.slice(-3), l].join(' — ').replace(/\s+/g,' ').slice(0,220)
      pending=[]
      if(PLACEHOLDER.test(head) || mostlyDate(head)) continue
      if(rp2LooksEdu(head) && !/\b(director|manager|vp|head|lead|consultant|engineer|officer)\b/i.test(head)){
        education.push({ id:'b'+(++bid), text:head }); mode='education'; cur=null; continue
      }
      mode='experience'
      cur={header:head,sub:'',bullets:[]}; roles.push(cur); continue
    }
    if(mode==='summary'){ summary.push(l); continue }
    if(mode==='skills'){ pushBits(skills, l); continue }
    if(mode==='education'){ pushBits(education, l); continue }
    if(mode==='certs'){ pushBits(certs, l); continue }
    if(!cur){
      if(!/[.!?]$/.test(l) || l.length<140){ pending.push(l); pending=pending.slice(-4) }
      continue
    }
    // No bullet prefix under a job = soft line-wrap → always glue to last bullet
    if(cur.bullets.length){
      const last=cur.bullets[cur.bullets.length-1]
      last.text=rp2CleanBulletText(last.text+' '+l)
      pending=[]
      continue
    }
    if(l.length<80 && !/[.!?]$/.test(l)){ pending.push(l); pending=pending.slice(-3); continue }
    pending=[]
    pushRole(l)
  }
  // Lift any education that still landed under a role (common when resume lacked an Education header)
  for(const r of roles){
    r.bullets=rp2HealBullets(r.bullets)
    const keep=[], lift=[]
    for(const b of r.bullets){ (rp2LooksEdu(b.text)?lift:keep).push(b) }
    r.bullets=keep
    for(const b of lift) education.push(b)
  }
  const cleaned=roles.map(r=>({header:r.header,sub:r.sub,bullets:rp2HealBullets(r.bullets).filter(b=>b.text.length<=2000).slice(0,40)}))
                     .filter(r=>r.bullets.length && r.header && !PLACEHOLDER.test(r.header) && !mostlyDate(r.header) && !/^\(.*\)$/.test(r.header.trim()))
  const n=cleaned.reduce((a,r)=>a+r.bullets.length,0)
  if(n<3) return { roles: [], summary:'', skills:[], education:[], certs:[] }
  return {
    roles: cleaned,
    summary: summary.join(' ').replace(/\s+/g,' ').trim(),
    skills: skills.filter(b=>b.text.length<=200).slice(0,60),
    education: education.filter(b=>b.text.length<=400).slice(0,20),
    certs: certs.filter(b=>b.text.length<=400).slice(0,20),
  }
}
function rp2Bullet(bid){
  const struct=PROFILE?.resume_struct
  if(!struct) return null
  for(const r of (struct.roles||[])) for(const b of r.bullets) if(b.id===bid) return b
  for(const b of (struct.skills||[])) if(b.id===bid) return b
  for(const b of (struct.education||[])) if(b.id===bid) return b
  for(const b of (struct.certs||[])) if(b.id===bid) return b
  return null
}
function rp2BulletKind(bid){
  const struct=PROFILE?.resume_struct
  if(!struct) return 'role'
  if((struct.skills||[]).some(b=>b.id===bid)) return 'skills'
  if((struct.education||[]).some(b=>b.id===bid)) return 'education'
  if((struct.certs||[]).some(b=>b.id===bid)) return 'certs'
  return 'role'
}
async function rp2LoadPick(id){
  const wrap=$('rp2_pick')
  RP2SEL={bullet_ids:[],edits:{}}; RP2TAG={}; RP2SELDIRTY=false
  try{
    const { data } = await sb.from('mt_reports').select('rewritten').eq('role_id',id).eq('kind','selection').order('created_at',{ascending:false}).limit(1)
    if(data&&data[0]&&data[0].rewritten){ const s=JSON.parse(data[0].rewritten)
      if(s&&Array.isArray(s.bullet_ids)) RP2SEL={ bullet_ids:s.bullet_ids, edits:s.edits||{} } }
  }catch(_e){}
  if(PROFILE?.resume_struct?.roles?.length){
    const before=JSON.stringify(PROFILE.resume_struct)
    PROFILE.resume_struct=rp2NormalizeStruct(PROFILE.resume_struct)
    // Drop picks that pointed at fragments we just merged away
    const live=new Set()
    for(const r of PROFILE.resume_struct.roles||[]) for(const b of r.bullets||[]) live.add(b.id)
    RP2SEL.bullet_ids=(RP2SEL.bullet_ids||[]).filter(id=>live.has(id))
    if(JSON.stringify(PROFILE.resume_struct)!==before){
      await sb.from('mt_profiles').update({ resume_struct: PROFILE.resume_struct }).eq('owner',ME.id)
      logEvent('resume_struct_healed', null, { roles:PROFILE.resume_struct.roles.length })
    }
    rp2RenderPick(); return
  }
  if(!(PROFILE?.resume_text||'').trim()){
    wrap.innerHTML='<p class="muted" style="font-size:13px;margin:6px 0 0">Add your resume in Settings first — then you can pick bullets per job.</p>'; return }
  const parsed=rp2Parse(PROFILE.resume_text)
  if(!parsed.roles.length){
    wrap.innerHTML='<p class="muted" style="font-size:13px;margin:6px 0 0">Couldn’t split your resume into clean bullets, so this stays off — no bad guesses. Generate below still uses your full resume. Tip: bullet lines starting with “•” or “-” in Settings → resume parse best.</p>'; return }
  wrap.innerHTML='<p class="muted" style="font-size:13px;margin:6px 0 8px">One-time check: this split was made by simple text rules, not AI. Confirm Education / Skills are their own sections — not stuck under a job.</p>'
    + rp2StructPreviewHtml(parsed)
    + '<div class="row" style="margin-top:8px"><button class="primary" id="rp2_structsave">Looks right — use this</button></div>'
  $('rp2_structsave').onclick=async()=>{
    const { error } = await sb.from('mt_profiles').update({ resume_struct: parsed }).eq('owner',ME.id)
    if(error){ $('rp2_err').textContent=error.message.includes('resume_struct')?'Bullet picking needs a small database update that isn’t live yet.':error.message; return }
    PROFILE.resume_struct=parsed
    logEvent('resume_struct_saved', null, { roles:parsed.roles.length, skills:(parsed.skills||[]).length, education:(parsed.education||[]).length })
    rp2RenderPick()
  }
}
function rp2NormalizeStruct(struct){
  if(!struct) return struct
  const out={
    roles:(struct.roles||[]).map(r=>{
      const id=r.id||stableRoleKey(r)
      return { id, header:r.header, sub:r.sub||'', bullets:healBulletsPreserveSource(rp2HealBullets(r.bullets||[])) }
    }),
    summary:struct.summary||'',
    skills:healBulletsPreserveSource(rp2HealBullets(struct.skills||[])),
    education:healBulletsPreserveSource(rp2HealBullets(struct.education||[])),
    certs:healBulletsPreserveSource(rp2HealBullets(struct.certs||[])),
    projects:(struct.projects||[]).map(p=>({
      ...p,
      id:p.id||crypto.randomUUID?.()||('p_'+Math.random().toString(16).slice(2)),
      bullets:healBulletsPreserveSource(p.bullets||[]),
      ...(p.source_type?{ source_type:p.source_type, source_id:p.source_id }:{}),
    })),
  }
  for(const r of out.roles){
    const keep=[], lift=[]
    for(const b of r.bullets){ (rp2LooksEdu(b.text)?lift:keep).push(b) }
    r.bullets=keep
    for(const b of lift){
      if(!out.education.some(e=>e.id===b.id || e.text===b.text)) out.education.push(b)
    }
  }
  out.roles=out.roles.filter(r=>r.bullets.length)
  return out
}
function rp2StructPreviewHtml(parsed){
  let h=''
  if(parsed.summary) h+=`<div class="rp2-role"><div class="rp2-rolehd"><b>Professional Summary</b></div><div class="rp2-bul"><span class="t">${esc(parsed.summary)}</span></div></div>`
  h+=parsed.roles.map(r=>`<div class="rp2-role"><div class="rp2-rolehd"><b>${esc(r.header)}</b>${r.sub?'<div class="muted" style="font-size:12px">'+esc(r.sub)+'</div>':''}</div>`
    + r.bullets.map(b=>`<div class="rp2-bul"><span class="t">• ${esc(b.text)}</span></div>`).join('')+'</div>').join('')
  if((parsed.skills||[]).length) h+=`<div class="rp2-role"><div class="rp2-rolehd"><b>Skills</b></div>`+parsed.skills.map(b=>`<div class="rp2-bul"><span class="t">• ${esc(b.text)}</span></div>`).join('')+'</div>'
  if((parsed.education||[]).length) h+=`<div class="rp2-role"><div class="rp2-rolehd"><b>Education</b></div>`+parsed.education.map(b=>`<div class="rp2-bul"><span class="t">• ${esc(b.text)}</span></div>`).join('')+'</div>'
  if((parsed.certs||[]).length) h+=`<div class="rp2-role"><div class="rp2-rolehd"><b>Certifications</b></div>`+parsed.certs.map(b=>`<div class="rp2-bul"><span class="t">• ${esc(b.text)}</span></div>`).join('')+'</div>'
  if(!(parsed.skills||[]).length) h+=`<p class="muted" style="font-size:12.5px;margin:8px 0 0">No Skills section found in your resume text — Generate will still ask the model to build an honest Skills block from your experience + this job’s gaps.</p>`
  if(!(parsed.education||[]).length) h+=`<p class="muted" style="font-size:12.5px;margin:8px 0 0">No Education section found — if your degree is listed under a job above, add an “Education” heading in Settings → resume, then click <b>Redo this split from my resume</b>.</p>`
  return h
}
function rp2RenderPick(){
  const wrap=$('rp2_pick'), struct=rp2NormalizeStruct(PROFILE?.resume_struct)
  if(PROFILE) PROFILE.resume_struct=struct
  if(!struct?.roles?.length){ rp2LoadPick(CURROLE?.id); return }
  const sec=(title, items, kind)=>{
    if(!items?.length) return ''
    const sub = kind==='education'
      ? 'yours — edit anytime · Generate does not touch this'
      : kind==='certs'
        ? 'yours — edit anytime'
        : 'always included in draft'
    return `<div class="rp2-role"><div class="rp2-rolehd"><b>${esc(title)}</b><span class="muted" style="font-size:12px;margin-left:8px">${sub}</span></div>`
      + items.map(b=>{
        const txt=RP2SEL.edits[b.id]||b.text
        const tag=RP2SEL.edits[b.id]?'<span class="tag">· edited</span>':''
        if(RP2EDITBID===b.id) return `<div class="rp2-bul"><span class="t"><textarea id="rp2_be" style="min-height:80px">${esc(txt)}</textarea>
          <div class="row" style="margin-top:6px"><button class="primary" id="rp2_besave" data-bid="${b.id}">Save</button><button id="rp2_becancel">Cancel</button>${RP2SEL.edits[b.id]?`<button id="rp2_berevert" data-bid="${b.id}">Revert to original</button>`:''}</div></span></div>`
        return `<div class="rp2-bul on"><span class="t" style="flex:1">${esc(txt)}${tag}</span>
          <button class="rp2-link" data-edit="${b.id}">Edit</button></div>`
      }).join('')+'</div>'
  }
  wrap.innerHTML=(struct.summary?`<div class="rp2-role"><div class="rp2-rolehd"><b>Professional Summary</b><span class="muted" style="font-size:12px;margin-left:8px">always included · edit in Settings resume to change source</span></div><div class="rp2-bul"><span class="t">${esc(struct.summary)}</span></div></div>`:'')
    + struct.roles.map(r=>`<div class="rp2-role"><div class="rp2-rolehd"><b>${esc(r.header)}</b>${r.sub?'<div class="muted" style="font-size:12px">'+esc(r.sub)+'</div>':''}</div>`
    + r.bullets.map(b=>{
      const on=RP2SEL.bullet_ids.includes(b.id)
      const txt=RP2SEL.edits[b.id]||b.text
      const tag=RP2TAG[b.id]==='regen'?'<span class="tag rg">· tailored to this JD</span>':(RP2SEL.edits[b.id]?'<span class="tag">· edited</span>':'')
      if(RP2EDITBID===b.id) return `<div class="rp2-bul"><input type="checkbox" ${on?'checked':''} disabled><span class="t"><textarea id="rp2_be" style="min-height:80px">${esc(txt)}</textarea>
        <div class="row" style="margin-top:6px"><button class="primary" id="rp2_besave" data-bid="${b.id}">Save</button><button id="rp2_becancel">Cancel</button>${RP2SEL.edits[b.id]?`<button id="rp2_berevert" data-bid="${b.id}">Revert to original</button>`:''}</div></span></div>`
      return `<div class="rp2-bul${on?' on':''}"><input type="checkbox" data-bid="${b.id}" ${on?'checked':''}>
        <span class="t" data-tbid="${b.id}">${esc(txt)}${tag}</span>
        <button class="rp2-link" data-edit="${b.id}">Edit</button></div>`
    }).join('')+'</div>').join('')
    + sec('Skills', struct.skills, 'skills')
    + sec('Education', struct.education, 'education')
    + sec('Certifications', struct.certs, 'certs')
    + (!(struct.skills||[]).length?`<p class="muted" style="font-size:12.5px;margin:8px 0 0">No Skills section yet — Generate will still build one from your experience + this job’s gaps. <button type="button" class="rp2-link" id="rp2_opensettings">Add skills in Settings</button></p>`:'')
    + (!(struct.education||[]).length?`<p class="muted" style="font-size:12.5px;margin:8px 0 0">No Education section yet. If a degree is stuck under a job, redo the split.</p>`:'')
    + '<div class="row" style="margin-top:8px"><button type="button" class="rp2-link" id="rp2_resplit">Redo this split from my resume</button></div>'
  rp2GenNote()
  const rs=wrap.querySelector('#rp2_resplit'); if(rs) rs.onclick=()=>rp2Resplit()
  const os=wrap.querySelector('#rp2_opensettings'); if(os) os.onclick=()=>{
    closeDrawer(); closeBuilder(); $('settings').classList.remove('hidden'); const ta=$('s_resume'); if(ta){ ta.focus(); ta.scrollIntoView({block:'center'}) }
  }
  wrap.querySelectorAll('input[data-bid]').forEach(cb=>cb.onchange=()=>{ const bid=cb.dataset.bid
    if(cb.checked){ if(!RP2SEL.bullet_ids.includes(bid)) RP2SEL.bullet_ids.push(bid) }
    else RP2SEL.bullet_ids=RP2SEL.bullet_ids.filter(x=>x!==bid)
    rp2SelChanged(); rp2RenderPick() })
  wrap.querySelectorAll('.t[data-tbid]').forEach(el=>el.onclick=()=>{ const bid=el.dataset.tbid
    if(RP2SEL.bullet_ids.includes(bid)) RP2SEL.bullet_ids=RP2SEL.bullet_ids.filter(x=>x!==bid)
    else RP2SEL.bullet_ids.push(bid)
    rp2SelChanged(); rp2RenderPick() })
  wrap.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{ RP2EDITBID=b.dataset.edit; rp2RenderPick() })
  const bs=wrap.querySelector('#rp2_besave'); if(bs) bs.onclick=()=>{ const bid=bs.dataset.bid, v=wrap.querySelector('#rp2_be').value.trim()
    const orig=rp2Bullet(bid)
    if(v && orig && v!==orig.text){ RP2SEL.edits[bid]=v; RP2TAG[bid]='edit'; if(rp2BulletKind(bid)==='role' && !RP2SEL.bullet_ids.includes(bid)) RP2SEL.bullet_ids.push(bid) }
    else if(orig && v===orig.text){ delete RP2SEL.edits[bid]; delete RP2TAG[bid] }
    RP2EDITBID=null; rp2SelChanged(); rp2RenderPick() }
  const bc=wrap.querySelector('#rp2_becancel'); if(bc) bc.onclick=()=>{ RP2EDITBID=null; rp2RenderPick() }
  const br=wrap.querySelector('#rp2_berevert'); if(br) br.onclick=()=>{ const bid=br.dataset.bid
    delete RP2SEL.edits[bid]; delete RP2TAG[bid]; RP2EDITBID=null; rp2SelChanged(); rp2RenderPick() }
}
async function rp2Resplit(){
  if(!confirm('Redo the split of your resume into jobs, skills, and education?\n\nWe re-read what you pasted in Settings. Your checkmarks for this job stay.')) return
  $('rp2_err').textContent=''
  PROFILE.resume_struct=null
  const { error } = await sb.from('mt_profiles').update({ resume_struct: null }).eq('owner',ME.id)
  if(error){ $('rp2_err').textContent=error.message; return }
  RP2EDITBID=null
  await rp2LoadPick(CURROLE.id)
}
function rp2GenNote(){
  const n=RP2SEL.bullet_ids.length
  const gaps=RP2LASTMISS.length
  const struct=PROFILE?.resume_struct
  const hasEdu=!!(struct?.education||[]).length
  const expTotal=(struct?.roles||[]).reduce((a,r)=>a+r.bullets.length,0)
  // Which roles contributed picks (for confirmation)
  const pickedRoles=[]
  for(const r of (struct?.roles||[])){
    const c=r.bullets.filter(b=>RP2SEL.bullet_ids.includes(b.id)).length
    if(c) pickedRoles.push((r.header||'').split('—')[0].trim().slice(0,42)+(c>1?` (${c})`:''))
  }
  const stat=$('rp2_pickstat')
  if(stat){
    if(n){
      stat.textContent = n+' of '+expTotal+' experience bullets picked — saved for this job.'
        +(pickedRoles.length?(' Picked from: '+pickedRoles.slice(0,3).join('; ')+(pickedRoles.length>3?'…':'')):'')
        +(gaps?(' · Draft will use the '+gaps+' match gaps listed here.'):'')
        +' Summary + Skills feed Generate; Education is yours to edit — Generate does not rewrite it.'
    } else {
      stat.textContent = (expTotal?('0 of '+expTotal+' experience bullets picked — tick bullets to feed your draft.'):'No experience bullets to pick yet.')
        +(gaps?(' Draft will still use the '+gaps+' match gaps listed here.'):'')
    }
  }
  let note = n
    ? 'Builds a draft from your '+n+' picked experience bullet'+(n===1?'':'s')+', plus Summary and Skills. Education stays as you wrote it.'
    : 'Nothing picked yet — draft will use your full resume for Summary / Experience / Skills. Education stays as you wrote it.'
  if(gaps) note += ' Uses only what you add under Worth adding? for gaps still missing from materials.'
  if(!hasEdu) note += ' If your degree is stuck under a job, click “Redo this split from my resume.”'
  note += ' Check before you send.'
  if($('rp2_gennote')) $('rp2_gennote').textContent = note
  rp2RenderGaps()
}
async function rp2Regen(bid, btn){
  $('rp2_err').textContent=''
  if(RP2TAG[bid]==='regen'){ delete RP2SEL.edits[bid]; delete RP2TAG[bid]; rp2SelChanged(); rp2RenderPick(); return }
  const kind=rp2BulletKind(bid)
  if(kind==='education' || kind==='certs' || rp2LooksEdu(rp2Bullet(bid)?.text)){
    $('rp2_err').textContent='Education is yours — edit it directly. There is nothing to generate for schools or degrees.'
    return
  }
  const jd=$('rp2_jd').value.trim(); if(!jd){ $('rp2_err').textContent='Add the job description first — Regenerate rewrites the bullet toward it.'; return }
  const orig=rp2Bullet(bid); if(!orig) return
  const o=btn.textContent; btn.disabled=true; btn.textContent='↻ …'
  try{
    let data=null, error=null; try{ data=await invokeRewrite({ jd_text:jd, mode:'bullet', bullet_text:orig.text }) }catch(e){ error=e }
    if(error) throw error
    if(data.error==='free_limit') $('rp2_err').textContent=FREE_LIMIT_MSG
    else if(data.error) $('rp2_err').textContent=data.error
    else if(data.rewritten&&data.rewritten.trim()){
      RP2SEL.edits[bid]=data.rewritten.trim().replace(/^[-•]\s*/,''); RP2TAG[bid]='regen'
      if(!RP2SEL.bullet_ids.includes(bid)) RP2SEL.bullet_ids.push(bid)
      logEvent('bullet_regen', CURROLE.id, { method:data.method, panel:'v2' })
      rp2SelChanged(); rp2RenderPick()
    } else $('rp2_err').textContent='Model returned nothing — try again.'
  }catch(err){ $('rp2_err').textContent=await fnMsg(err) }
  btn.disabled=false; btn.textContent=o
}
// picks persist per role as an append-only snapshot row (kind:'selection'), debounced
let rp2SelTimer=null
function rp2SelChanged(){ RP2SELDIRTY=true; rp2GenNote(); clearTimeout(rp2SelTimer); rp2SelTimer=setTimeout(rp2FlushSel, 2000) }
async function rp2FlushSel(){
  clearTimeout(rp2SelTimer)
  if(!RP2SELDIRTY||!CURROLE) return
  RP2SELDIRTY=false
  try{ await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:'selection', rewritten:JSON.stringify(RP2SEL) }) }catch(_e){}
}
function rp2Assemble(){
  const struct=rp2NormalizeStruct(PROFILE?.resume_struct)
  if(!struct?.roles?.length || !RP2SEL.bullet_ids.length) return ''
  const head=[PROFILE?.full_name,PROFILE?.email,PROFILE?.phone,PROFILE?.linkedin,PROFILE?.location].filter(Boolean).join(' · ')
  const parts=head?[head,'']:[]
  // Required skeleton — experience picks alone are not a resume
  if(struct.summary){
    parts.push('PROFESSIONAL SUMMARY')
    parts.push(struct.summary)
    parts.push('')
  } else {
    parts.push('PROFESSIONAL SUMMARY')
    parts.push('(Write a 3–4 line summary aimed at this job, using only facts already in Experience / Education below. Do not invent employers or titles.)')
    parts.push('')
  }
  parts.push('EXPERIENCE')
  for(const r of struct.roles){
    const sel=r.bullets.filter(b=>RP2SEL.bullet_ids.includes(b.id))
    if(!sel.length) continue
    parts.push(r.header+(r.sub?'\n'+r.sub:''))
    for(const b of sel){
      const t=RP2SEL.edits[b.id]||b.text
      if(rp2LooksEdu(t)) continue // never ship education as a job bullet
      parts.push('- '+t)
    }
    parts.push('')
  }
  parts.push('SKILLS')
  if((struct.skills||[]).length){
    for(const b of struct.skills) parts.push('- '+(RP2SEL.edits[b.id]||b.text))
  } else {
    parts.push('(Build a concise Skills section from Experience above + the job gaps. Only skills already in the resume. Prefer keywords that improve ATS/Jobscan match for this JD.)')
  }
  parts.push('')
  parts.push('EDUCATION')
  if((struct.education||[]).length){
    for(const b of struct.education) parts.push('- '+(RP2SEL.edits[b.id]||b.text))
  } else if((struct.certs||[]).length){
    for(const b of struct.certs) parts.push('- '+(RP2SEL.edits[b.id]||b.text))
  } else {
    parts.push('(If education/certs appear anywhere in the source resume, put them HERE as their own section — never under a job.)')
  }
  if((struct.certs||[]).length && (struct.education||[]).length){
    parts.push('')
    parts.push('CERTIFICATIONS')
    for(const b of struct.certs) parts.push('- '+(RP2SEL.edits[b.id]||b.text))
  }
  return parts.join('\n').trim()
}
async function rp2LoadGaps(){
  if(RP2LASTMISS.length) return RP2LASTMISS.slice()
  try{
    const { data } = await sb.from('mt_reports').select('missing_keywords').eq('role_id',CURROLE.id).eq('kind','match').order('created_at',{ascending:false}).limit(1)
    const g=data&&data[0]&&data[0].missing_keywords
    if(Array.isArray(g)&&g.length){ RP2LASTMISS=sanitizeGapLabels(g); return RP2LASTMISS.slice() }
  }catch(_e){}
  return []
}
function rp2GapBrief(gaps, { repair=false }={}){
  const extra=getMaterials(CURROLE?.id).map(x=>String(x.text||'').trim()).filter(Boolean)
  let memoryLines=[]
  try{
    const ranked=rankedMemoryMaterials(($('rp2_jd')?.value||CURROLE?.jd||''), gaps)
    memoryLines=ranked.map(a=>String(a.body_current||'').trim()).filter(Boolean)
  }catch(_e){}
  let portfolioLines=[]
  try{
    portfolioLines=resumeOkItems(PF_ROWS||[]).map(p=>[p.title,p.summary,p.body_current].filter(Boolean).join(' — ')).filter(Boolean)
  }catch(_e){}
  const lines=[
    'CareerOps draft requirements (follow strictly):',
    '1) Output ONLY a resume. Exact section headers, in this order:',
    '   PROFESSIONAL SUMMARY',
    '   EXPERIENCE',
    '   SKILLS',
    '   EDUCATION',
    '   (optional) CERTIFICATIONS',
    '2) Education / degrees / universities are ONLY under EDUCATION — never under a job.',
    '3) SKILLS must be a real bullet list. Prefer JD/ATS keywords only when already in Experience or added materials.',
    '4) Use ONLY facts the user supplied (resume + added materials + ranked bullet memory). Do not invent employers, titles, degrees, dates, or metrics.',
    '5) Keep contact line at top if present. No markdown fences, no preamble, no “here is your resume”.',
    '6) Capability boundary: if a gap is not already in supplied materials, omit it quietly — do not invent it, and do not lecture or use “cannot claim” / shame language.',
  ]
  if(extra.length){
    lines.push('Added materials from the user (treat as truth):')
    for(const t of extra.slice(0,20)) lines.push('   - '+t)
  }
  if(memoryLines.length){
    lines.push('Bullet memory (ranked: checked → role-linked → relevance; recency tie-break only):')
    for(const t of memoryLines.slice(0,20)) lines.push('   - '+t)
  }
  if(portfolioLines.length){
    lines.push('Portfolio (resume_ok only):')
    for(const t of portfolioLines.slice(0,10)) lines.push('   - '+t)
  }
  try{
    const stories=storyList().slice(0,10)
    if(stories.length){
      lines.push('Story bank (true stories — may weave into bullets only if already consistent with Experience):')
      for(const t of stories) lines.push('   - '+t)
    }
  }catch(_e){}
  if(gaps.length){
    lines.push('Gaps to prefer addressing when already in materials:')
    for(const g of gaps.slice(0,12)) lines.push('   - '+String(g).replace(/^\s*no\s+/i,'').trim())
  }
  if(repair){
    lines.push('7) REPAIR PASS: The previous draft failed structure rules. Fix it in place. Keep true facts. Output the full corrected resume only.')
  }
  return lines.join('\n')
}
function rp2DraftQuality(text){
  const t=String(text||'')
  const hasSum=/(^|\n)\s*(professional\s+summary|summary|profile)\s*:?\s*(\n|$)/i.test(t)
  const hasExp=/(^|\n)\s*(experience|work experience|professional experience)\s*:?\s*(\n|$)/i.test(t)
  const hasSkills=/(^|\n)\s*(skills|technical skills|core competencies)\s*:?\s*(\n|$)/i.test(t)
  const hasEdu=/(^|\n)\s*(education|certifications?)\s*:?\s*(\n|$)/i.test(t)
  const placeholder=/\((Write a 3–4 line|Build a concise|If education\/certs)/i.test(t)
  const fences=/^```/m.test(t)
  return { ok: hasSum && hasExp && hasSkills && hasEdu && !placeholder && !fences, hasSum, hasExp, hasSkills, hasEdu, placeholder, fences }
}
function rp2SplitDraftSections(text){
  const lines=String(text||'').replace(/\r\n/g,'\n').split('\n')
  const heads=/^(professional\s+summary|summary|profile|objective|experience|work experience|professional experience|skills|technical skills|core competencies|education|certifications?|gap status)\s*:?\s*$/i
  const secs=[]; let cur=null
  for(const raw of lines){
    const l=raw.trimEnd()
    if(heads.test(l.trim())){
      const key=l.trim().toLowerCase().replace(/:$/,'').replace(/\s+/g,' ')
      const canon=/summary|profile|objective/.test(key)?'PROFESSIONAL SUMMARY'
        :/experience/.test(key)?'EXPERIENCE'
        :/skills|competenc/.test(key)?'SKILLS'
        :/^education/.test(key)?'EDUCATION'
        :/certif/.test(key)?'CERTIFICATIONS'
        :'GAP STATUS'
      cur={name:canon, lines:[]}; secs.push(cur); continue
    }
    if(!cur){ cur={name:'_HEAD', lines:[]}; secs.push(cur) }
    cur.lines.push(l)
  }
  return secs
}
function rp2EnforceResumeDraft(raw, { gaps=[], assemble='' }={}){
  let t=String(raw||'').trim()
  t=t.replace(/^```(?:markdown|md|text|resume)?\s*/i,'').replace(/\s*```\s*$/,'').trim()
  t=t.replace(/^(here('s| is) (your |the )?(tailored )?resume[:.\s]*)/i,'').trim()
  let secs=rp2SplitDraftSections(t)
  // Lift education-looking bullets out of EXPERIENCE into EDUCATION
  const eduExtra=[]
  for(const s of secs){
    if(s.name!=='EXPERIENCE') continue
    const keep=[]
    for(const line of s.lines){
      const body=line.replace(/^[-•·▪◦*]\s*/,'').trim()
      if(body && rp2LooksEdu(body) && !/\b(director|manager|vp|head|lead|consultant|engineer|officer)\b/i.test(body)){
        eduExtra.push(line.startsWith('-')||line.startsWith('•')?line:('- '+body))
      } else keep.push(line)
    }
    s.lines=keep
  }
  if(eduExtra.length){
    let edu=secs.find(s=>s.name==='EDUCATION')
    if(!edu){ edu={name:'EDUCATION', lines:[]}; secs.push(edu) }
    for(const e of eduExtra){
      if(!edu.lines.some(x=>x.trim()===e.trim())) edu.lines.push(e)
    }
  }
  // Fill missing sections from assembled source if model dropped them
  const srcSecs=assemble?rp2SplitDraftSections(assemble):[]
  const need=['PROFESSIONAL SUMMARY','EXPERIENCE','SKILLS','EDUCATION']
  for(const n of need){
    let s=secs.find(x=>x.name===n)
    const nonempty=s && s.lines.some(l=>l.trim() && !/^\(.*\)$/.test(l.trim()))
    if(nonempty) continue
    const from=srcSecs.find(x=>x.name===n)
    if(from && from.lines.some(l=>l.trim() && !/^\(.*\)$/.test(l.trim()))){
      if(!s){ s={name:n, lines:[]}; secs.push(s) }
      s.lines=from.lines.slice()
    } else if(!s){
      secs.push({name:n, lines: n==='SKILLS'
        ? ['- (Add skills from Experience that match this job — edit before sending.)']
        : n==='EDUCATION'
          ? ['- (Add your degree / school here if missing — edit before sending.)']
          : n==='PROFESSIONAL SUMMARY'
            ? ['(Write 3–4 lines aimed at this job using only true facts from Experience.)']
            : []})
    }
  }
  // Section locks: restore Education / optional Experience from assemble (or prior draft) after AI
  const locks = (typeof WRITE_LOCKS!=='undefined' && WRITE_LOCKS) ? WRITE_LOCKS : loadWriteLocks()
  const lockSrc = srcSecs.length ? srcSecs : (arguments[1]?.priorSecs||[])
  function forceLock(name){
    const from=lockSrc.find(x=>x.name===name) || srcSecs.find(x=>x.name===name)
    if(!from || !from.lines.some(l=>l.trim())) return
    let s=secs.find(x=>x.name===name)
    if(!s){ s={name, lines:[]}; secs.push(s) }
    s.lines=from.lines.slice()
  }
  if(locks.edu) forceLock('EDUCATION')
  if(locks.exp) forceLock('EXPERIENCE')
  // Gap status: every gap must be in materials or listed
  const bodyLower=secs.filter(s=>s.name!=='GAP STATUS').map(s=>s.lines.join('\n')).join('\n').toLowerCase()
  const open=[]
  for(const g of (gaps||[]).slice(0,12)){
    const clean=String(g||'').replace(/^\s*no\s+/i,'').trim()
    if(!clean) continue
    const tokens=clean.toLowerCase().split(/[^a-z0-9+#]+/).filter(w=>w.length>3)
    const hit=tokens.length ? tokens.filter(tok=>bodyLower.includes(tok)).length >= Math.min(2, tokens.length) : bodyLower.includes(clean.toLowerCase())
    if(!hit) open.push(clean)
  }
  secs=secs.filter(s=>s.name!=='GAP STATUS')
  if(open.length){
    secs.push({ name:'GAP STATUS', lines: open.map(g=>`- ${g}: not in your materials for this draft — add what you’ve done to include`) })
  }
  const order=['_HEAD','PROFESSIONAL SUMMARY','EXPERIENCE','SKILLS','EDUCATION','CERTIFICATIONS','GAP STATUS']
  secs.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name))
  const out=[]
  for(const s of secs){
    if(s.name==='_HEAD'){
      const head=s.lines.map(l=>l.trimEnd()).filter(l=>l.trim())
      if(head.length){ out.push(...head); out.push('') }
      continue
    }
    const body=s.lines.map(l=>l.trimEnd())
    while(body.length && !body[0].trim()) body.shift()
    while(body.length && !body[body.length-1].trim()) body.pop()
    if(!body.length && s.name!=='GAP STATUS') continue
    out.push(s.name)
    out.push(...body)
    out.push('')
  }
  const text=out.join('\n').replace(/\n{3,}/g,'\n\n').trim()
  const q=rp2DraftQuality(text)
  return { text, quality:q, openGaps:open.length, repaired: text!==String(raw||'').trim() }
}
function rp2OpenDraftInEditor(kind, text){
  RP2EDIT={ id:null, kind, rewritten:text, jd_text:($('rp2_jd').value||'').slice(0,4000), created_at:new Date().toISOString() }
  const human=rp2HumanVerName(RP2EDIT)
  $('rp2_edtitle').textContent=human+' — check every line before you send'
  $('rp2_edtext').value=text
  if($('rp2_humanize')) $('rp2_humanize').style.display = providerSecretOnFile(PROFILE, 'humanizer_email') ? '' : 'none'
  $('bv_empty')?.classList.add('hidden')
  $('rp2_editor').classList.remove('hidden')
  if($('bv_verpill')) $('bv_verpill').textContent=human
  if($('bv_saved')) $('bv_saved').classList.remove('hidden')
  if($('builderView')?.classList.contains('hidden')) openBuilderView()
  else syncBuilderChrome()
  $('rp2_editor').scrollIntoView({behavior:'smooth',block:'nearest'})
}
$('rp2_generate').onclick=async()=>{
  rp2ClearErr()
  if(!CURROLE){ rp2ShowErr('Open a role from the board first.'); return }
  // JD may live on the card even if the drawer textarea was cleared — prefer textarea, fall back to card.
  let jd=($('rp2_jd')?.value||'').trim()
  if(!jd) jd=String(CURROLE.jd||'').trim()
  if(jd && $('rp2_jd') && !$('rp2_jd').value.trim()) $('rp2_jd').value=jd
  if(!jd){
    rp2ShowErr('Add the job description first — paste it in the role drawer.')
    closeBuilder(); openDrawerShell()
    $('rp2_jdwrap')?.classList.remove('hidden')
    if($('rp2_jdtoggle')) $('rp2_jdtoggle').textContent='Collapse editor'
    $('rp2_jd')?.focus()
    return
  }
  const doRes=$('rp2_gres')?.checked!==false, doCov=!!$('rp2_gcov')?.checked
  // Default to resume if somehow neither is ticked
  const wantRes = doRes || (!doRes && !doCov)
  const wantCov = doCov
  if(!wantRes && !wantCov){ rp2ShowErr('Tick what to generate — resume, cover letter, or both.'); return }
  if(wantRes && $('rp2_gres') && !$('rp2_gres').checked) $('rp2_gres').checked=true
  const b=$('rp2_generate'), be=$('bv_gen_empty')
  const o=b.textContent, oe=be?.textContent
  b.disabled=true; if(be) be.disabled=true
  let opened=null
  try{
    await rp2FlushSel()
    if(PROFILE?.resume_struct) PROFILE.resume_struct=rp2NormalizeStruct(PROFILE.resume_struct)
    const override=rp2Assemble()
    const baseResume = (override||PROFILE?.resume_text||'').trim()
    if(wantRes && !baseResume){
      rp2ShowErr('Add your resume in Settings, or tick experience bullets on the left, then Generate again.')
      return
    }
    let jobscan=''
    try{ const { data:js } = await sb.from('mt_reports').select('rewritten').eq('role_id',CURROLE.id).eq('kind','jobscan').not('rewritten','is',null).order('created_at',{ascending:false}).limit(1)
      if(js&&js[0]&&js[0].rewritten) jobscan=js[0].rewritten.slice(0,5000) }catch(_e){}
    const gaps=await rp2LoadGaps()
    const brief=rp2GapBrief(gaps)
    const guidance=[jobscan, brief].filter(Boolean).join('\n\n').slice(0,7000)
    for(const mode of [wantRes?'resume':null, wantCov?'cover':null].filter(Boolean)){
      const label = mode==='cover' ? '✨ Writing cover letter…' : '✨ Tailoring resume…'
      b.textContent = label; if(be) be.textContent = label
      const body={ jd_text:jd, mode, jobscan_text:guidance, missing_keywords:gaps, gaps, resume_text: baseResume }
      let data=null, error=null; try{ data=await invokeRewrite(body); bumpUsage('generate') }catch(e){ error=e }
      if(error) throw error
      if(!data){ rp2ShowErr('Generate returned nothing — try again.'); break }
      if(data.error){ rp2ShowErr(mapRewriteSoftError(data.error, data)||data.error); break }
      if(!data.rewritten||!data.rewritten.trim()){ rp2ShowErr('Model returned nothing — try again.'); break }
      let finalText=data.rewritten.trim()
      let enforceMeta=null
      if(mode==='resume'){
        let assembleForLock=override||baseResume||''
        if(WRITE_LOCKS.edu || WRITE_LOCKS.exp){
          const prior=rp2SplitDraftSections(($('rp2_edtext')?.value||'').trim() || override || baseResume || '')
          const base=rp2SplitDraftSections(override||finalText)
          for(const n of ['EDUCATION','EXPERIENCE']){
            const want=(n==='EDUCATION'&&WRITE_LOCKS.edu)||(n==='EXPERIENCE'&&WRITE_LOCKS.exp)
            if(!want) continue
            const from=prior.find(s=>s.name===n) || base.find(s=>s.name===n)
            if(!from) continue
            let tt=base.find(s=>s.name===n)
            if(!tt){ tt={name:n, lines:[]}; base.push(tt) }
            tt.lines=from.lines.slice()
          }
          assembleForLock=rp2RebuildDraftFromSecs(base)
        }
        enforceMeta=rp2EnforceResumeDraft(finalText, { gaps, assemble:assembleForLock })
        finalText=enforceMeta.text
        try{
          const corpus=[baseResume, brief, ...(MEM_ROWS||[]).map(a=>a.body_current), ...(PF_ROWS||[]).map(p=>[p.title,p.summary,p.body_current].join(' '))].join('\n')
          const claimCheck=assertNoUnsupportedClaims(finalText, corpus)
          if(!claimCheck.ok){
            rp2ShowErr('Draft may invent claims not in your materials — review before sending: '+claimCheck.unsupported.slice(0,3).join('; '))
          }
        }catch(_e){}
        if(!enforceMeta.quality.ok){
          b.textContent='✨ Fixing draft structure…'; if(be) be.textContent=b.textContent
          const repairBody={
            jd_text:jd, mode:'resume',
            resume_text:finalText,
            jobscan_text:[brief, rp2GapBrief(gaps,{repair:true})].join('\n\n').slice(0,7000),
            missing_keywords:gaps, gaps
          }
          try{
            const r2 = await invokeRewrite(repairBody)
            if(r2 && !r2.error && r2.rewritten?.trim()){
              enforceMeta=rp2EnforceResumeDraft(r2.rewritten, { gaps, assemble:override||baseResume })
              finalText=enforceMeta.text
              data=r2
            }
          }catch(_e){}
        }
      }
      // Show draft immediately — never lose a successful rewrite if save fails.
      opened={ kind:mode, text:finalText }
      rp2OpenDraftInEditor(mode, finalText)
      try{
        logEvent(mode==='cover'?'cover_generated':'resume_tailored', CURROLE.id, {
          method:data.method, panel:'v2', from_selection:!!override, gaps:gaps.length,
          enforced:!!enforceMeta?.repaired, open_gaps:enforceMeta?.openGaps||0, quality_ok:enforceMeta?!!enforceMeta.quality.ok:true
        })
      }catch(_e){}
      try{
        const { error:insErr } = await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:mode, rewritten:finalText, jd_text:jd.slice(0,4000) })
        if(insErr) rp2ShowErr('Draft is ready below — save to history failed: '+(insErr.message||insErr)+'. Click Save this draft.')
        else HASDOC.add(CURROLE.id)
      }catch(insE){
        rp2ShowErr('Draft is ready below — could not append version history. Click Save this draft. ('+await fnMsg(insE)+')')
      }
      if(mode==='resume'){
        b.textContent='Scoring the new resume…'; if(be) be.textContent=b.textContent
        try{
          let m2=null; try{ m2=await invokeMatch({ resume_text:finalText, jd_text:jd }); bumpUsage('match') }catch(_e){}
          if(m2&&!m2.error&&typeof m2.match_score==='number'){ rp2ShowScore(m2,'your new tailored resume · '); await rp2PersistScore(m2.match_score, m2.missing) }
        }catch(_e){}
      }
    }
    try{ await rp2LoadVers(CURROLE.id) }catch(_e){}
    try{ load() }catch(_e){}
    if(opened){
      const row=RP2ROWS.find(r=>r.kind===opened.kind && (r.rewritten||'').trim()===opened.text.trim())
      if(row){
        if(!rp2VerNames()[row.id]) rp2SaveVerName(row.id, rp2HumanVerName(row))
        rp2OpenEditor(row.id)
      } else rp2OpenDraftInEditor(opened.kind, opened.text)
    }
  }catch(err){ rp2ShowErr(await fnMsg(err)) }
  finally {
    b.disabled=false; b.textContent=o
    if(be){ be.disabled=false; be.textContent=oe }
  }
}
// jobscan attach (same inserts as v1, new element ids)
$('rp2_savejobscan').onclick=async()=>{
  const t=$('rp2_jobscan').value.trim(); if(!t){ $('rp2_err').textContent='Paste the Jobscan report text first.'; return }
  const { error } = await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:'jobscan', rewritten:t })
  if(error){ $('rp2_err').textContent=error.message; return }
  $('rp2_jobscan').value=''; $('rp2_err').textContent=''; rp2LoadVers(CURROLE.id)
}
$('rp2_upload').onclick=async()=>{
  $('rp2_err').textContent=''
  const f=$('rp2_file').files[0]
  if(!f){ $('rp2_err').textContent='Choose the Jobscan PDF first.'; return }
  if(f.type!=='application/pdf' && !/\.pdf$/i.test(f.name)){ $('rp2_err').textContent='That needs to be a PDF (on jobscan.co: Print → Save as PDF).'; return }
  if(f.size > 15*1024*1024){ $('rp2_err').textContent='PDF too big (15 MB max).'; return }
  const b=$('rp2_upload'),o=b.textContent; b.disabled=true; b.textContent='⬆︎ Uploading…'
  try{
    let jstext=''
    try{
      b.textContent='⬆︎ Reading PDF…'
      const pdfjs = await import('https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc='https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs'
      const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise
      const parts=[]
      for(let p=1;p<=Math.min(doc.numPages,20);p++){ const tc=await (await doc.getPage(p)).getTextContent(); parts.push(tc.items.map(i=>i.str).join(' ')) }
      jstext=parts.join('\n').replace(/[ \t]+/g,' ').trim()
    }catch(_e){ jstext='' }
    b.textContent='⬆︎ Uploading…'
    const path=`${ME.id}/${CURROLE.id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]+/g,'_')}`
    const { error:eUp } = await sb.storage.from('reports').upload(path, f, { contentType:'application/pdf' })
    if(eUp) throw eUp
    const { error:eIns } = await sb.from('mt_reports').insert({ role_id:CURROLE.id, kind:'jobscan', jd_text:path, rewritten: jstext||null })
    if(eIns) throw eIns
    $('rp2_file').value=''
    let jsScore=null
    if(jstext){ const m=jstext.match(/match\s*(?:rate|score)\D{0,20}(\d{1,3})\s*%/i) || jstext.match(/(\d{1,3})\s*%\s*match/i)
      if(m){ const n=parseInt(m[1],10); if(n>0&&n<=100) jsScore=n } }
    // Jobscan % is Jobscan's number — do NOT overwrite canonical CareerOps match (card/drawer/ring).
    if(jsScore!=null && $('rp2_err')){
      $('rp2_err').textContent='Jobscan report attached (Jobscan '+jsScore+'%). CareerOps match score unchanged — run Check my match to refresh that.'
    }
    rp2LoadVers(CURROLE.id)
  }catch(err){ $('rp2_err').textContent=await fnMsg(err) }
  b.disabled=false; b.textContent=o
}

function findSearchBody(){
  const p = loadFindPrefs()
  return {
    blocklist: p.blocklist||[],
    max_age_days: p.max_age_days||0,
    remote_pref: p.remote_pref||'any',
  }
}
// run search
$('run').onclick = async ()=>{
  const b=$('run'), old=b.textContent; b.disabled=true; b.textContent='🔍 Searching…'
  try{
    const { data, error } = await sb.functions.invoke('run-search-mt', { body: findSearchBody() })
    if(error) throw error
    if(data.error==='daily_limit'){ $('status').textContent='Daily search limit reached (10/day) — resets tomorrow. Your board and all other tools keep working.'; b.disabled=false; b.textContent=old; return }
    // Client hygiene: close blocklist + clear wrong-geo Sourced noise
    try{
      const { data:sourced } = await sb.from('mt_roles').select('id,company,title,stage,notes,jd').eq('stage','sourced')
      for(const r of sourced||[]){
        if(isBlockedCompany(r.company)){
          await sb.from('mt_roles').update({ stage: CLOSED, notes: (r.notes?r.notes+' · ':'')+'auto-closed: blocklist' }).eq('id', r.id)
        } else if(roleWrongGeo(r)){
          await sb.from('mt_roles').update({ stage: CLOSED, notes: (r.notes?r.notes+' · ':'')+'auto-closed: wrong geo' }).eq('id', r.id)
        }
      }
    }catch(_e){}
    await load()
    const hiddenNow = Object.values(ROLESMAP||{}).filter(r => String(r.stage||'')==='sourced' && roleFilterReason(r)).length
    const scanned = data.boardsScanned!=null ? ` across ${data.boardsScanned} boards` : ''
    const dups = data.skippedDup ? ` · skipped ${data.skippedDup} duplicates` : ''
    const blocked = data.skippedBlock ? ` · ${data.skippedBlock} blocklisted` : ''
    const capped = data.skippedCap ? ` · capped at ${data.addCap||40} best matches` : ''
    const hiddenMsg = (FIND_PREFS.hide_filtered && hiddenNow)
      ? ` · ${hiddenNow} hidden off-lane/age/remote/geo (click “filtered Sourced — show”)`
      : ''
    $('status').textContent = (data.added>0)
      ? `Added ${data.added} · ${data.found} matched titles/keywords${scanned}${dups}${blocked}${capped}${hiddenMsg}.`
      : `Scanned${scanned || ' the boards'} — ${data.found} matched, 0 new${dups}${blocked}${hiddenMsg}. Tighten titles/keywords in Settings if results are noisy.`
    // Re-paint status HTML so hidden chip is clickable after toast
    setTimeout(()=>load(), 2500)
  }catch(err){ $('status').textContent='Search failed: '+await fnMsg(err) }
  b.disabled=false; b.textContent=old
}

// ---- LinkedIn via Google + Add role (link + JD) ----
function liSearchBits(){
  const titles=(PROFILE?.target_titles||[]).filter(Boolean)
  const kws=(PROFILE?.keywords||[]).filter(Boolean)
  const locs=(PROFILE?.locations||[]).filter(Boolean)
  const seniority=(PROFILE?.seniority||[]).filter(Boolean)
  const qParts=[]
  if(titles.length) qParts.push('('+titles.slice(0,4).map(t=>`"${t}"`).join(' OR ')+')')
  else if(kws.length) qParts.push(kws.slice(0,5).join(' '))
  if(seniority.length) qParts.push(seniority.slice(0,3).join(' OR '))
  if(locs.length && !locs.some(l=>/^remote$/i.test(l))) qParts.push(locs[0])
  else if(locs.some(l=>/^remote$/i.test(l))) qParts.push('Remote')
  const q=qParts.join(' ').trim() || 'director partnerships'
  return { q, titles, kws, locs }
}
function liGoogleUrl(){
  const { q }=liSearchBits()
  return 'https://www.google.com/search?q='+encodeURIComponent('site:linkedin.com/jobs/view '+q)
}
function liNativeUrl(){
  const { q, locs }=liSearchBits()
  const loc=locs[0]||''
  return 'https://www.linkedin.com/jobs/search/?keywords='+encodeURIComponent(q)+
    (loc?('&location='+encodeURIComponent(loc)):'')
}
function guessCompanyFromHost(url){
  try{
    const h=new URL(url).hostname.replace(/^www\./,'')
    if(/linkedin\.com/i.test(h)) return 'LinkedIn listing'
    return h.split('.')[0].replace(/-/g,' ')
  }catch(_e){ return 'Unknown' }
}
function openLiGoogleModal(){
  const { q }=liSearchBits()
  if($('li_query_preview')) $('li_query_preview').textContent='Google query: site:linkedin.com/jobs/view '+q
  if($('li_urls')) $('li_urls').value=''
  if($('li_jd_bulk')) $('li_jd_bulk').value=''
  if($('li_err')) $('li_err').textContent=''
  $('ligoogle')?.classList.remove('hidden')
}
$('li_google_btn')&&($('li_google_btn').onclick=()=>openLiGoogleModal())
$('li_close')&&($('li_close').onclick=()=>$('ligoogle').classList.add('hidden'))
$('li_open_google')&&($('li_open_google').onclick=()=>window.open(liGoogleUrl(),'_blank','noopener'))
$('li_open_native')&&($('li_open_native').onclick=()=>window.open(liNativeUrl(),'_blank','noopener'))
$('li_import')&&($('li_import').onclick=async()=>{
  $('li_err').textContent=''
  const lines=($('li_urls').value||'').split(/\n+/).map(s=>s.trim()).filter(Boolean)
  const urls=[...new Set(lines.map(s=>{
    const m=s.match(/https?:\/\/[^\s]+/i)
    return m?m[0].replace(/[),.;]+$/,''):''
  }).filter(u=>/linkedin\.com\/jobs/i.test(u)||/^https?:\/\//i.test(u)))]
  if(!urls.length){ $('li_err').textContent='Paste at least one job link (LinkedIn or other).'; return }
  let jd=($('li_jd_bulk').value||'').trim()
  if(jd && jdRejectReason(jd)){ $('li_err').textContent=jdRejectMessage(jdRejectReason(jd)); return }
  const b=$('li_import'), t=b.textContent; b.disabled=true; b.textContent='Adding…'
  let added=0, skipped=0, blocked=0
  try{
    for(const url of urls){
      const { data:exist } = await sb.from('mt_roles').select('id').eq('url',url).limit(1)
      if(exist&&exist.length){ skipped++; continue }
      const title='LinkedIn role — edit title'
      const company=guessCompanyFromHost(url)
      if(isBlockedCompany(company)){ blocked++; continue }
      const dup=await isDuplicateRole({ company, title, url })
      if(dup.dup){ skipped++; continue }
      const row={ company, title, level:'—', url, source:'linkedin', fit_score:'—', stage:'researched', ghost_risk:'low' }
      if(jd) row.jd=formatJdReadable(jd)
      const { data, error } = await sb.from('mt_roles').insert(row).select().single()
      if(error) throw error
      added++
      if(data?.id && !jd){
        // try fetch; reject garbage silently
        try{
          const { data:fj } = await sb.functions.invoke('fetch-jd',{ body:{ url } })
          if(fj?.jd){
            const got=acceptFetchedJd(fj.jd)
            if(got.ok) await saveJd(data, got.jd)
          }
        }catch(_e){}
      }
    }
    $('ligoogle').classList.add('hidden')
    await load()
    $('status').textContent = added
      ? `Added ${added} role${added>1?'s':''} from your links${skipped?` (${skipped} duplicates)`:''}${blocked?` · ${blocked} blocklisted`:''}. Edit titles/companies and paste JDs where needed.`
      : (skipped||blocked?`Nothing new — ${skipped} duplicates${blocked?`, ${blocked} blocklisted`:''}.`:'Nothing added.')
  }catch(e){ $('li_err').textContent=e.message||String(e) }
  finally{ b.disabled=false; b.textContent=t }
})

$('addrolebtn').onclick=()=>{
  $('ar_company').value=''; $('ar_title').value=''; $('ar_url').value=''
  if($('ar_jd')) $('ar_jd').value=''
  $('ar_err').textContent=''; $('addrole').classList.remove('hidden'); $('ar_company').focus()
}
$('ar_close').onclick=()=> $('addrole').classList.add('hidden')
/** Shared Add-role insert — blocklist, dedupe, JD reject/format, ghost risk. */
async function insertManualRoleOnBoard({ company, title, url, jd, stage }){
  if(!company||!title) return { error:'Company and job title are required.' }
  if(!url && !jd) return { error:'Add a posting link and/or paste the job description.' }
  if(isBlockedCompany(company)) return { error:'That company is on your blocklist (Settings → Find hygiene). Remove it there to add this role.' }
  let niceJd=jd||''
  if(niceJd){
    const why=jdRejectReason(niceJd)
    if(why==='careers_page') return { error:jdRejectMessage(why) }
    if(why==='too_short' && stage==='sourced') return { error:jdRejectMessage(why) }
    niceJd=formatJdReadable(niceJd)
  }
  const dup=await isDuplicateRole({ company, title, url })
  if(dup.dup) return { error:'Already on your board ('+dup.reason+'). Open the existing card instead.', dup }
  const ghost = estimateGhostRisk({ company, title, url, jd:niceJd })
  const row = stage==='sourced'
    ? buildTriageRoleRow({ company, title, url, jd:niceJd||null, ghost_risk:ghost })
    : { company, title, level:inferRoleLevel(title), url:url||null, source:'manual', fit_score:'—', stage:stage||'researched', ghost_risk:ghost }
  if(niceJd && stage!=='sourced') row.jd=niceJd
  if(niceJd && stage==='sourced' && !row.jd) row.jd=niceJd
  const { data, error } = await sb.from('mt_roles').insert(row).select().single()
  if(error) return { error:error.message||String(error) }
  return { data, row }
}
$('ar_save').onclick=async()=>{
  $('ar_err').textContent=''
  const company=$('ar_company').value.trim(), title=$('ar_title').value.trim(), url=$('ar_url').value.trim()
  let jd=($('ar_jd')?.value||'').trim()
  const b=$('ar_save'), t=b.textContent; b.disabled=true; b.textContent='Adding…'
  try{
    const out=await insertManualRoleOnBoard({ company, title, url, jd, stage:'researched' })
    if(out.error){ $('ar_err').textContent=out.error; return }
    $('addrole').classList.add('hidden')
    await load()
    if(out.data?.id) openRole(out.data.id)
  }catch(e){ $('ar_err').textContent=e.message||String(e) }
  finally{ b.disabled=false; b.textContent=t }
}
// JD triage (was Resume tool) — score off-board JD, then Add to board with match artifact
let TRIAGE_LAST_MATCH=null
function jtPaintGaps(data){
  const gaps=sanitizeGapLabels(data?.missing||[])
  const { inMat, worth, total }=splitGapsByMaterials(gaps, PROFILE?.resume_text||'')
  const box=$('jt_gaps'); if(!box) return
  if(!total){
    box.innerHTML='<p class="muted" style="margin:0;font-size:13px">No keyword gaps flagged for this check'+(data?.match_score!=null?` (match ${data.match_score}%)`:'')+'.</p>'
    return
  }
  const dHave=inMat.length?`<div class="gap-group have"><div class="gg-h"><span class="ic">✓</span> In your materials</div>${inMat.map(t=>`<div class="gap-item">${esc(t)}</div>`).join('')}</div>`:''
  const dWorth=worth.length?`<div class="gap-group case"><div class="gg-h"><span class="ic">+</span> Worth adding?</div>${worth.map(t=>`<div class="gap-item">${esc(t)}</div>`).join('')}</div>`:''
  box.innerHTML=dHave+dWorth
}
function jtSyncAddEnabled(){
  const btn=$('jt_add'); if(!btn) return
  const company=($('jt_company')?.value||'').trim(), title=($('jt_title')?.value||'').trim()
  const jd=($('jd')?.value||'').trim()
  btn.disabled=!(company&&title&&jd)
}
;['jt_company','jt_title','jd'].forEach(id=>{
  const el=$(id); if(el) el.addEventListener('input', jtSyncAddEnabled)
})
$('jdtriagebtn').onclick=()=>{
  TRIAGE_LAST_MATCH=null
  $('jdtriage').classList.remove('hidden')
  $('matchout').classList.add('hidden')
  $('resumeerr').textContent=''
  if($('jt_gaps')) $('jt_gaps').innerHTML=''
  jtSyncAddEnabled()
  $('jd')?.focus()
}
$('jdtriageclose').onclick=()=> $('jdtriage').classList.add('hidden')
$('matchbtn').onclick = async ()=>{
  $('resumeerr').textContent=''
  const jd=($('jd')?.value||'').trim()
  if(!jd){ $('resumeerr').textContent='Paste a job description first.'; return }
  const why=jdRejectReason(jd)
  if(why){ $('resumeerr').textContent=jdRejectMessage(why); return }
  if(!(PROFILE?.resume_text||'').trim()){ $('resumeerr').textContent='Add your resume in Settings first — Check match needs it to score this job.'; return }
  const b=$('matchbtn'), o=b.textContent; b.disabled=true; b.textContent='Scoring…'
  try{
    let data=null, error=null
    try{ data=await invokeMatch({ resume_text:PROFILE?.resume_text||'', jd_text:jd }); bumpUsage('match') }catch(e){ error=e }
    if(error||data?.error){ $('resumeerr').textContent=(data?.error||error.message); return }
    TRIAGE_LAST_MATCH={ match_score:data.match_score, missing:data.missing||[], present:data.present||[], summary:data.summary||'', method:data.method }
    $('scoreval').textContent = data.match_score+'%'
    if(data.method==='keywords'){
      $('scorenote').innerHTML='keyword overlap<br><span style="font-size:11px">word-overlap scan, NOT a fit score</span>'
      $('matchsummary').textContent=''; $('matchnote').textContent=''
    } else {
      const src = data.method==='free' ? 'free AI' : data.method==='kimi' ? 'Kimi K3' : 'Claude'
      $('scorenote').innerHTML='recruiter-style assessment ('+src+')<br><span style="font-size:11px">scored on real fit, not word overlap</span>'
      $('matchsummary').textContent=data.summary||''
      $('matchnote').textContent=AI_NOTE
    }
    jtPaintGaps(data)
    $('matchout').classList.remove('hidden')
    jtSyncAddEnabled()
  } finally { b.disabled=false; b.textContent=o }
}
$('jt_add').onclick=async()=>{
  $('resumeerr').textContent=''
  const company=($('jt_company')?.value||'').trim()
  const title=($('jt_title')?.value||'').trim()
  const url=($('jt_url')?.value||'').trim()
  let jd=($('jd')?.value||'').trim()
  const verr=validateTriageAdd({ company, title, url, jd })
  if(verr){ $('resumeerr').textContent=verr; return }
  const why=jdRejectReason(jd)
  if(why){ $('resumeerr').textContent=jdRejectMessage(why); return }
  const b=$('jt_add'), t=b.textContent; b.disabled=true; b.textContent='Adding…'
  try{
    const out=await insertManualRoleOnBoard({ company, title, url, jd, stage:'sourced' })
    if(out.error){ $('resumeerr').textContent=out.error; return }
    const role=out.data
    if(role?.id && TRIAGE_LAST_MATCH && TRIAGE_LAST_MATCH.match_score!=null){
      const score=TRIAGE_LAST_MATCH.match_score
      const missing=TRIAGE_LAST_MATCH.missing||[]
      try{
        await sb.from('mt_roles').update({ match_score: score+'%' }).eq('id', role.id)
        await sb.from('mt_reports').insert(buildMatchReportRow({ role_id:role.id, match_score:score, missing_keywords:missing }))
      }catch(_e){}
      logEvent('match_report', role.id, { score, method:TRIAGE_LAST_MATCH.method||'triage', panel:'jd_triage' })
    }
    logEvent('jd_triage_add', role?.id, { scored: !!TRIAGE_LAST_MATCH })
    const scoredLabel = TRIAGE_LAST_MATCH?.match_score!=null ? ` · match ${TRIAGE_LAST_MATCH.match_score}%` : ''
    $('jdtriage').classList.add('hidden')
    TRIAGE_LAST_MATCH=null
    await load()
    if(role?.id) openRole(role.id)
    if($('status')) $('status').textContent='Added to Sourced'+scoredLabel+' — score saved on the card.'
  }catch(e){ $('resumeerr').textContent=e.message||String(e) }
  finally{ b.disabled=false; b.textContent=t; jtSyncAddEnabled() }
}
function download(name,text,mime){ const bl=new Blob([text],{type:mime}); const a=document.createElement('a'); a.href=URL.createObjectURL(bl); a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href) }

// settings
function paintSettingsSecrets(){
  const ks=$('s_keystatus'), hs=$('s_humanstatus')
  const painted = paintProviderSecretStatus({ profile: PROFILE, openaiPrefs: loadOpenaiPrefs(), esc })
  if(ks) ks.innerHTML = painted.keysHtml
  if(hs) hs.innerHTML = painted.humanHtml
}
$('settingsbtn').onclick=()=>{
  FIND_PREFS = loadFindPrefs()
  $('s_titles').value=(PROFILE?.target_titles||[]).join(', ')
  $('s_keywords').value=(PROFILE?.keywords||[]).join(', ')
  $('s_seniority').value=(PROFILE?.seniority||[]).join(', ')
  $('s_locations').value=(PROFILE?.locations||[]).join(', ')
  $('s_resume').value=PROFILE?.resume_text||''
  if($('s_stories')) $('s_stories').value=loadStories()
  if($('s_band_min')) $('s_band_min').value = PROFILE?.target_band_min != null ? PROFILE.target_band_min : ''
  if($('s_band_max')) $('s_band_max').value = PROFILE?.target_band_max != null ? PROFILE.target_band_max : ''
  if($('s_band_cur')) $('s_band_cur').value = PROFILE?.target_band_currency || 'USD'
  paintContactsSettings()
  if($('s_blocklist')) $('s_blocklist').value=(FIND_PREFS.blocklist||[]).join(', ')
  if($('s_max_age')) $('s_max_age').value=FIND_PREFS.max_age_days||0
  if($('s_remote_pref')) $('s_remote_pref').value=FIND_PREFS.remote_pref||'any'
  if($('s_hide_blocked')) $('s_hide_blocked').checked=FIND_PREFS.hide_filtered!==false
  if($('s_dealbreakers')) $('s_dealbreakers').value=(FIND_PREFS.dealbreakers||[]).join(', ')
  if($('s_cadence')) $('s_cadence').value=PROFILE?.bullet_memory_cadence||'off'
  if($('s_cadence_anchor')) $('s_cadence_anchor').value=PROFILE?.cadence_anchor||'1,15'
  if($('s_cadence_tz')) $('s_cadence_tz').value=PROFILE?.cadence_timezone||(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC')
  // Never put secrets back into password inputs — browsers / screenshots. Status line shows what's stored.
  $('s_key').value=''; $('s_kimi').value=''; $('s_hpw').value=''
  // Humanizer email: show plaintext only on self-host; hosted vault shows blank + “on file” status.
  $('s_hemail').value = PROFILE?.humanizer_email || ''
  if($('s_hemail') && !$('s_hemail').value && providerSecretOnFile(PROFILE, 'humanizer_email')){
    $('s_hemail').placeholder = 'on file — paste to replace · type “remove” to delete'
  }
  const oai=loadOpenaiPrefs()
  if($('s_oai_base')) $('s_oai_base').value=oai.base||''
  if($('s_oai_key')) $('s_oai_key').value=''
  if($('s_oai_model')) $('s_oai_model').value=oai.model||'gpt-4o-mini'
  $('seterr').textContent=''; paintSettingsSecrets()
  freeStatus(); paintUsageMeters()
  const senHint=$('s_seniority_hint')
  if(senHint){
    const titles=list($('s_titles').value||'')
    const sen=list($('s_seniority').value||'')
    const directorHeavy=titles.some(t=>/director|vp\b|vice president|head of/i.test(t))
    senHint.textContent = (directorHeavy && !sen.length)
      ? 'Titles look Director/VP-weighted but Seniority is blank — Find treats blank as any level. Add “director, vp” here if you want that gate.'
      : (FIND_PREFS.max_age_days===0 ? 'Max age 0 = no age limit. Soft-hide only affects Sourced.' : '')
  }
  $('settings').classList.remove('hidden')
}
$('settingsclose').onclick=()=> $('settings').classList.add('hidden')
$('exp_json').onclick = async ()=>{
  const [{data:prof},{data:roles},{data:reports}] = await Promise.all([
    sb.from('mt_profiles').select('*').eq('owner',ME.id),
    sb.from('mt_roles').select('*'),
    sb.from('mt_reports').select('*')
  ])
  const p = prof&&prof[0] ? {...prof[0]} : null
  if(p){ delete p.ai_key; delete p.kimi_key; delete p.humanizer_pw; delete p.humanizer_pass; delete p.openai_key; delete p.humanizer_email }   // don't dump your saved secrets into a file
  const out = { exported_at:new Date().toISOString(), profile:p, roles:roles||[], reports:reports||[] }
  download('CareerOps_export.json', JSON.stringify(out,null,2), 'application/json')
}
$('exp_csv').onclick = async ()=>{
  const { data } = await sb.from('mt_roles').select('company,title,level,stage,fit_score,match_score,url,created_at')
  const cols=['company','title','level','stage','fit_score','match_score','url','created_at']
  const csv=[cols.join(',')].concat((data||[]).map(r=>cols.map(c=>'"'+String(r[c]??'').replace(/"/g,'""')+'"').join(','))).join('\n')
  download('CareerOps_board.csv', csv, 'text/csv')
}
$('exp_boardpack')?.addEventListener('click', async ()=>{
  const [{data:prof},{data:roles},{data:reports}] = await Promise.all([
    sb.from('mt_profiles').select('*').eq('owner',ME.id),
    sb.from('mt_roles').select('*'),
    sb.from('mt_reports').select('*')
  ])
  await loadAccomplishments(); await loadPortfolioRows()
  const p = prof&&prof[0] ? {...prof[0]} : null
  if(p){ delete p.ai_key; delete p.kimi_key; delete p.humanizer_pw; delete p.humanizer_pass; delete p.openai_key; delete p.humanizer_email }
  const verNames=rp2VerNames()
  const pack = buildBoardPack({
    profile: p,
    roles: (roles||[]).map(r=>({
      ...r,
      sent_at: r.sent_at || (isSent(r.id) ? (r.updated_at || new Date().toISOString()) : null),
    })),
    reports: (reports||[]).map(r=>({
      ...r,
      display_name: r.display_name || verNames[r.id] || null,
      sent_at: r.sent_at || (isVerSent(r.id) ? new Date().toISOString() : null),
    })),
    accomplishments: MEM_ROWS||[],
    portfolio: PF_ROWS||[],
    stories: loadStories(),
    find_prefs: loadFindPrefs(),
    outcomes: loadOutcomes(),
    interview_events: IV_EVENTS.length ? IV_EVENTS : loadInterviewEventsLocal(),
    contacts: CT_ROWS.length ? CT_ROWS : loadContactsLocal(),
  })
  download('CareerOps_board_pack.json', JSON.stringify(pack,null,2), 'application/json')
  logEvent('export_board_pack', null, { roles:(roles||[]).length, materials:pack.materials.length, reports:pack.reports.length, accomplishments:(pack.accomplishments||[]).length, interview_events:(pack.interview_events||[]).length, contacts:(pack.contacts||[]).length })
})
$('imp_boardpack')?.addEventListener('change', async (ev)=>{
  const file=ev.target.files && ev.target.files[0]
  ev.target.value=''
  const status=$('imp_boardpack_status')
  if(!file) return
  try{
    const text=await file.text()
    const imported=importBoardPack(text)
    if(imported.profile && (imported.profile.ai_key || imported.profile.openai_key || imported.profile.kimi_key)){
      throw new Error('Pack contained keys — refusing import (sanitize failed)')
    }
    const [{data:roleIds},{data:repIds},{data:accIds},{data:pfIds},{data:ctIds}] = await Promise.all([
      sb.from('mt_roles').select('id'),
      sb.from('mt_reports').select('id'),
      sb.from('mt_accomplishments').select('id'),
      sb.from('mt_portfolio_items').select('id'),
      sb.from('mt_contacts').select('id'),
    ])
    const plan=planBoardPackUpsert(imported, {
      existingRoleIds: (roleIds||[]).map(r=>r.id),
      existingReportIds: (repIds||[]).map(r=>r.id),
      existingAccomplishmentIds: (accIds||[]).map(r=>r.id),
      existingPortfolioIds: (pfIds||[]).map(r=>r.id),
      existingContactIds: (ctIds||[]).map(r=>r.id),
    })
    const summary=`Import plan: roles ${plan.roles.upsert.length}↑/${plan.roles.insert.length}+, materials ${plan.materials.upsert.length}↑/${plan.materials.insert.length}+, memory ${plan.accomplishments.upsert.length}↑/${plan.accomplishments.insert.length}+, portfolio ${plan.portfolio.upsert.length}↑/${plan.portfolio.insert.length}+, contacts ${plan.contacts.upsert.length}↑/${plan.contacts.insert.length}+. Secrets imported: ${plan.secrets_imported}. Continue?`
    if(!confirm(summary)){ if(status) status.textContent='Import cancelled.'; return }
    if(status) status.textContent='Importing…'
    for(const row of plan.roles.upsert){
      const { id, ...patch } = row
      let { error } = await sb.from('mt_roles').update(patch).eq('id', id)
      if(error && /comp_range|comp_raw|column/i.test(error.message||'')){
        delete patch.comp_range; delete patch.comp_raw
        ;({ error } = await sb.from('mt_roles').update(patch).eq('id', id))
      }
      if(error) console.warn('[import] role upsert', error.message)
    }
    for(const row of plan.roles.insert){
      let { error } = await sb.from('mt_roles').insert(row)
      if(error && /comp_range|comp_raw|column/i.test(error.message||'')){
        const { comp_range: _c, comp_raw: _r, ...rest } = row
        ;({ error } = await sb.from('mt_roles').insert(rest))
      }
      if(error) console.warn('[import] role insert', error.message)
    }
    for(const row of [...plan.materials.upsert, ...plan.materials.insert]){
      const { error } = await sb.from('mt_reports').upsert(row)
      if(error) console.warn('[import] material', error.message)
    }
    for(const row of [...plan.accomplishments.upsert, ...plan.accomplishments.insert]){
      const { error } = await sb.from('mt_accomplishments').upsert({ ...row, owner: ME.id })
      if(error) console.warn('[import] accomplishment', error.message)
    }
    for(const row of [...plan.portfolio.upsert, ...plan.portfolio.insert]){
      const { error } = await sb.from('mt_portfolio_items').upsert({ ...row, owner: ME.id })
      if(error) console.warn('[import] portfolio', error.message)
    }
    for(const row of [...plan.contacts.upsert, ...plan.contacts.insert]){
      const db=contactRowFromLocal(row, ME.id)
      if(!db) continue
      const { error } = await sb.from('mt_contacts').upsert(db)
      if(error){
        if(/mt_contacts|does not exist/i.test(error.message||'')) CT_DB_OK=false
        else console.warn('[import] contact', error.message)
        await upsertContact(row)
      }
    }
    if(plan.profilePatch){
      const patch={ ...plan.profilePatch }
      delete patch.email // don't overwrite auth email casually from pack unless present
      let { error } = await sb.from('mt_profiles').update(patch).eq('owner', ME.id)
      if(error && /target_band_|column/i.test(error.message||'')){
        delete patch.target_band_min; delete patch.target_band_max; delete patch.target_band_currency
        ;({ error } = await sb.from('mt_profiles').update(patch).eq('owner', ME.id))
      }
      if(!error && PROFILE) Object.assign(PROFILE, patch)
    }
    if(plan.stories) saveStories(plan.stories)
    if(plan.outcomes && typeof plan.outcomes==='object'){
      for(const [rid, o] of Object.entries(plan.outcomes)){
        if(o && o.kind) saveOutcome(rid, normalizeOutcome(o)||o)
      }
    }
    if(Array.isArray(plan.interview_events) && plan.interview_events.length){
      for(const ev of plan.interview_events) await upsertInterviewEvent(ev)
    }
    await loadContactsFromDb()
    await load()
    if(status) status.textContent='Import complete. Keys were never written.'
    logEvent('import_board_pack', null, { roles: plan.roles.insert.length+plan.roles.upsert.length, secrets: false })
  }catch(err){
    if(status) status.textContent='Import failed: '+(err.message||err)
  }
})
$('s_ct_add')?.addEventListener('click', async ()=>{
  const name=($('s_ct_name')?.value||'').trim()
  if(!name) return
  await upsertContact({
    id: 'local-'+Date.now(),
    name,
    channel: $('s_ct_channel')?.value||'email',
    company: ($('s_ct_company')?.value||'').trim(),
    notes: ($('s_ct_notes')?.value||'').trim(),
    role_ids: [],
  })
  if($('s_ct_name')) $('s_ct_name').value=''
  if($('s_ct_notes')) $('s_ct_notes').value=''
  paintContactsSettings()
  logEvent('contact_add', null, {})
})
$('s_ct_filter')?.addEventListener('input', ()=> paintContactsSettings())
$('dw_ct_add')?.addEventListener('click', async ()=>{
  if(!CURROLE) return
  const name=($('dw_ct_name')?.value||'').trim()
  if(!name) return
  await upsertContact({
    id: 'local-'+Date.now(),
    name,
    channel: $('dw_ct_channel')?.value||'email',
    company: CURROLE.company||'',
    role_ids: [CURROLE.id],
    notes: '',
  })
  if($('dw_ct_name')) $('dw_ct_name').value=''
  paintRoleContacts(CURROLE.id)
  paintContactsSettings()
  logEvent('contact_add', CURROLE.id, {})
})
$('s_save').onclick = async ()=>{
  $('seterr').textContent=''
  const b=$('s_save'), o=b.textContent; b.disabled=true; b.textContent='Saving…'
  saveFindPrefs({
    blocklist: list($('s_blocklist')?.value||''),
    max_age_days: parseInt($('s_max_age')?.value||'0',10)||0,
    remote_pref: $('s_remote_pref')?.value||'any',
    hide_filtered: !!($('s_hide_blocked')?.checked),
    dealbreakers: list($('s_dealbreakers')?.value||''),
  })
  saveStories($('s_stories')?.value||'')
  saveOpenaiPrefs({
    base: $('s_oai_base')?.value?.trim()||'',
    key: $('s_oai_key')?.value?.trim()||'',
    model: $('s_oai_model')?.value?.trim()||'gpt-4o-mini',
  })
  const upd={ target_titles:list($('s_titles').value), keywords:list($('s_keywords').value),
    seniority:list($('s_seniority').value.toLowerCase()), locations:list($('s_locations').value), resume_text:$('s_resume').value }
  const band=parseBandInput($('s_band_min')?.value, $('s_band_max')?.value)
  upd.target_band_min = band.min
  upd.target_band_max = band.max
  upd.target_band_currency = ($('s_band_cur')?.value||'USD').trim().toUpperCase().slice(0,3) || 'USD'
  if($('s_cadence')) upd.bullet_memory_cadence=$('s_cadence').value||'off'
  if($('s_cadence_anchor')) upd.cadence_anchor=($('s_cadence_anchor').value||'1,15').trim()
  if($('s_cadence_tz')) upd.cadence_timezone=($('s_cadence_tz').value||'UTC').trim()
  // Provider secrets: dedicated edge RPCs (vault) — never write plaintext keys into the profile update payload.
  const k=$('s_key').value.trim()
  const kk=$('s_kimi').value.trim()
  const he=$('s_hemail').value.trim()
  const hp=$('s_hpw').value.trim()
  let { error } = await sb.from('mt_profiles').update(upd).eq('owner',ME.id)
  if(error && /target_band_|bullet_memory_cadence|cadence_timezone|cadence_anchor|column/i.test(error.message||'')){
    if(PROFILE){
      PROFILE.bullet_memory_cadence=upd.bullet_memory_cadence
      PROFILE.cadence_anchor=upd.cadence_anchor
      PROFILE.cadence_timezone=upd.cadence_timezone
      PROFILE.target_band_min=upd.target_band_min
      PROFILE.target_band_max=upd.target_band_max
      PROFILE.target_band_currency=upd.target_band_currency
    }
    delete upd.bullet_memory_cadence; delete upd.cadence_anchor; delete upd.cadence_timezone
    delete upd.target_band_min; delete upd.target_band_max; delete upd.target_band_currency
    ;({ error } = await sb.from('mt_profiles').update(upd).eq('owner',ME.id))
  }
  if(error && /bullet_memory_cadence|cadence_timezone|cadence_anchor|column/i.test(error.message||'')){
    // Phase 1 migration not applied yet — keep core settings working
    if(PROFILE){
      PROFILE.bullet_memory_cadence=upd.bullet_memory_cadence
      PROFILE.cadence_anchor=upd.cadence_anchor
      PROFILE.cadence_timezone=upd.cadence_timezone
    }
    delete upd.bullet_memory_cadence; delete upd.cadence_anchor; delete upd.cadence_timezone
    ;({ error } = await sb.from('mt_profiles').update(upd).eq('owner',ME.id))
  }
  if(error){ $('seterr').textContent=error.message; b.disabled=false; b.textContent=o; return }

  const secretResults = await applySettingsProviderSecrets(sb, {
    profile: PROFILE || {},
    ownerId: ME.id,
    aiKeyInput: k,
    kimiKeyInput: kk,
    humanizerEmailInput: he === 'remove' ? 'remove' : ($('s_hemail')?.value ?? ''),
    humanizerPwInput: hp,
  })
  const secretFail = secretResults.find(r => r && r.ok === false)
  if(secretFail){
    $('seterr').textContent='Profile saved, but a key update failed: '+(secretFail.error||secretFail.provider)
    b.disabled=false; b.textContent=o
    paintSettingsSecrets()
    return
  }

  // Re-read from DB so we know what actually stuck (RLS / column issues surface here)
  const { data:fresh, error:rerr } = await sb.from('mt_profiles').select('*').eq('owner',ME.id).maybeSingle()
  if(rerr){ $('seterr').textContent='Saved, but could not re-read profile: '+rerr.message; b.disabled=false; b.textContent=o; return }
  if(fresh){
    PROFILE = fresh
    // Preserve in-memory on_file flags if the select predates migration columns.
    for(const r of secretResults){
      if(r?.ok && r.provider) PROFILE[`${r.provider}_on_file`] = r.on_file !== false
    }
  } else Object.assign(PROFILE||{},upd)
  const missing=[]
  if(k && k!=='remove' && !providerSecretOnFile(PROFILE, 'ai_key')) missing.push('Claude key')
  if(kk && kk!=='remove' && !providerSecretOnFile(PROFILE, 'kimi_key')) missing.push('Kimi key')
  if(he && he!=='remove' && !providerSecretOnFile(PROFILE, 'humanizer_email')) missing.push('humanizer email')
  if(hp && hp!=='remove' && !providerSecretOnFile(PROFILE, 'humanizer_pw')) missing.push('humanizer password')
  paintSettingsSecrets(); freeStatus(); paintUsageMeters()
  b.disabled=false; b.textContent=o
  $('s_key').value=''; $('s_kimi').value=''; $('s_hpw').value=''; if($('s_oai_key')) $('s_oai_key').value=''
  if(providerSecretOnFile(PROFILE, 'humanizer_email') && !PROFILE?.humanizer_email) $('s_hemail').value=''
  if(missing.length){
    $('seterr').textContent='Save returned OK but these did NOT stick: '+missing.join(', ')+'. Check vault edge functions / CREDENTIALS_KEK, or self-host plaintext columns.'
    return
  }
  $('seterr').style.color='#1a7f37'
  $('seterr').textContent='Saved. Keys stay hidden — status above shows “key on file”. Find filters applied.'
  load()
  setTimeout(()=>{ $('seterr').style.color=''; $('seterr').textContent=''; $('settings').classList.add('hidden') }, 1200)
}

// ==== Hybrid IA chrome: drawer verdict, tailor CTA, builder sync, Esc ====
function syncVerdictUI(v){
  document.querySelectorAll('#dw_verdict .vbtn').forEach(b=>{
    b.classList.toggle('on', b.dataset.v===v)
    b.classList.toggle('apply', b.dataset.v==='apply' && b.dataset.v===v)
    b.classList.toggle('stretch', b.dataset.v==='stretch' && b.dataset.v===v)
    b.classList.toggle('skip', b.dataset.v==='skip' && b.dataset.v===v)
  })
  const skip = v==='skip'
  const applyish = v==='apply' || v==='stretch'
  $('dw_skipwhy')?.classList.toggle('hidden', !skip)
  const label = skip ? 'Build resume anyway →' : 'Build resume for this job →'
  const tailor=$('dw_tailor'); if(tailor){
    tailor.style.display=''
    tailor.hidden=false
    tailor.textContent = label
    tailor.classList.toggle('primary', !skip)
    tailor.classList.toggle('ghost', !!skip)
  }
  if($('dw_nextstep')){
    if(skip) $('dw_nextstep').innerHTML='<b>Skipped.</b> Card stays put. You can still build a resume, or drag it to Closed later.'
    else if(v==='stretch') $('dw_nextstep').innerHTML='<b>Next:</b> this is a stretch — still build a resume if you want the pack, then apply yourself via <b>Open JD ↗</b>.'
    else if(v==='apply') $('dw_nextstep').innerHTML='<b>Next:</b> press <b>Build resume for this job</b> below → edit the draft → download → apply on the company site via <b>Open JD ↗</b>.'
    else $('dw_nextstep').innerHTML='<b>Next:</b> build a resume tailored to this JD, then open the company site and apply yourself.'
  }
  if($('dw_ctahint')){
    if(skip) $('dw_ctahint').textContent='Skip only tags the card — Build resume still works.'
    else if(applyish) $('dw_ctahint').textContent='Tagged. Build resume is the next button — it does not apply for you.'
    else $('dw_ctahint').textContent='Check my match (optional) · tag Worth applying / Stretch / Skip · then Build resume.'
  }
  if($('dw_esc')) $('dw_esc').textContent = skip
    ? 'Skip keeps it on the board. Use Not for me to move it to Closed.'
    : 'Esc closes — JD kept. Open JD ↗ is how you apply. Tags never submit an application.'
  if($('dw_not_for_me')){
    const closed = CURROLE?.stage===CLOSED
    $('dw_not_for_me').classList.toggle('hidden', !!closed)
    $('dw_not_for_me').disabled = !!closed
  }
  if(applyish){
    try{ $('dw_tailor')?.scrollIntoView({ behavior:'smooth', block:'nearest' }) }catch(_e){}
  }
}
function syncBuilderChrome(){
  if(!CURROLE) return
  if($('bv_co')) $('bv_co').textContent=CURROLE.company||'—'
  if($('bv_role')) $('bv_role').textContent=CURROLE.title||''
  if($('bv_col')) $('bv_col').textContent=LABEL[CURROLE.stage]||CURROLE.stage||''
  rp2SetJdProvenance()
  renderMaterialsGaps()
  rp2PaintMatchPct()
  if($('bv_sent')) $('bv_sent').textContent = isSent(CURROLE.id) ? '✓ sent' : 'not sent'
}
$('dw_close')?.addEventListener('click', ()=>{ rp2FlushSel(); closeDrawer() })
$('dw_not_for_me')?.addEventListener('click', async ()=>{
  if(!CURROLE?.id) return
  const b=$('dw_not_for_me'); if(b){ b.disabled=true; b.textContent='Hiding…' }
  try{ await dismissRole(CURROLE.id) }
  finally{ if(b){ b.disabled=false; b.textContent='Not for me — hide this role' } }
})
$('scrim')?.addEventListener('click', ()=>{
  // Safe for JD paste: only close if JD editor is collapsed
  if(!$('rp2_jdwrap')?.classList.contains('hidden')) return
  rp2FlushSel(); closeDrawer()
})
document.addEventListener('keydown', e=>{
  if(e.key!=='Escape') return
  if(!$('builderView')?.classList.contains('hidden')){ closeBuilder(); return }
  if(!$('drawer')?.classList.contains('hidden')){
    if(!$('rp2_jdwrap')?.classList.contains('hidden')) return // keep paste session
    rp2FlushSel(); closeDrawer()
  }
})
$('dw_verdict')?.addEventListener('click', e=>{
  const b=e.target.closest('.vbtn'); if(!b||!CURROLE) return
  const v=b.dataset.v
  setVerdict(CURROLE.id, v)
  syncVerdictUI(v)
  load() // refresh card verdict pill; never stage-move
})
function rp2EnsureDraftSkeleton(){
  const ed=$('rp2_edtext'); if(!ed) return
  $('bv_empty')?.classList.add('hidden')
  $('rp2_editor')?.classList.remove('hidden')
  if(!(ed.value||'').trim()){
    ed.value=['PROFESSIONAL SUMMARY','','EXPERIENCE','','SKILLS','','EDUCATION',''].join('\n')
  }
}
function rp2JumpSection(which){
  rp2EnsureDraftSkeleton()
  const ed=$('rp2_edtext'); if(!ed) return
  const map={summary:'PROFESSIONAL SUMMARY',experience:'EXPERIENCE',skills:'SKILLS',education:'EDUCATION'}
  const needle=map[which]||'PROFESSIONAL SUMMARY'
  const up=ed.value.toUpperCase()
  let idx=up.indexOf(needle)
  if(idx<0){
    // create section if missing
    const secs=rp2SplitDraftSections(ed.value)
    if(!secs.find(s=>s.name===needle)){
      const eduIdx=secs.findIndex(s=>s.name==='EDUCATION')
      const neu={name:needle, lines:['']}
      if(eduIdx>=0) secs.splice(eduIdx,0,neu); else secs.push(neu)
      ed.value=rp2RebuildDraftFromSecs(secs)
    }
    idx=ed.value.toUpperCase().indexOf(needle)
  }
  document.querySelectorAll('.b-nav a[data-jump]').forEach(a=>a.classList.toggle('on', a.dataset.jump===which))
  if(idx<0) return
  const after=ed.value.slice(idx)
  const next=after.slice(needle.length).search(/\n[A-Z][A-Z ]{3,}\n/)
  const end=next>=0 ? idx+needle.length+next : Math.min(ed.value.length, idx+needle.length+400)
  ed.focus()
  ed.setSelectionRange(idx, Math.max(idx+needle.length, end))
  // Scroll textarea to selection
  const linesBefore=ed.value.slice(0,idx).split('\n').length
  ed.scrollTop=Math.max(0,(linesBefore-2)*(parseFloat(getComputedStyle(ed).lineHeight)||18))
  if($('rp2_err')) $('rp2_err').textContent='Jumped to '+needle+'.'
}
function rp2WriteSection(sectionName, bodyLines){
  rp2EnsureDraftSkeleton()
  const ed=$('rp2_edtext')
  let secs=rp2SplitDraftSections(ed.value||'')
  let sec=secs.find(s=>s.name===sectionName)
  if(!sec){
    sec={name:sectionName, lines:[]}
    const eduIdx=secs.findIndex(s=>s.name==='EDUCATION')
    if(eduIdx>=0) secs.splice(eduIdx,0,sec); else secs.push(sec)
  }
  sec.lines=bodyLines.slice()
  ed.value=rp2RebuildDraftFromSecs(secs)
}
function goBuildResume(){
  if(!CURROLE) return
  logEvent('tailor_open', CURROLE.id, { verdict:getVerdict(CURROLE.id)||null })
  openBuilderView()
  const latest=(RP2ROWS||[]).find(r=>r.kind==='resume'&&r.rewritten)
  if(latest) rp2OpenEditor(latest.id)
  else {
    $('bv_empty')?.classList.remove('hidden')
    $('rp2_editor')?.classList.add('hidden')
    if($('bv_verpill')) $('bv_verpill').textContent='No draft yet'
  }
}
$('dw_tailor')?.addEventListener('click', goBuildResume)
$('bv_back')?.addEventListener('click', ()=>{ closeBuilder(); if(CURROLE) openRole2(CURROLE.id) })
$('bv_mobile_back')?.addEventListener('click', ()=>{ closeBuilder(); if(CURROLE) openRole2(CURROLE.id) })
$('bv_gen_empty')?.addEventListener('click', ()=> $('rp2_generate')?.click())
// Builder nav: jump to draft sections
document.querySelectorAll('.b-nav a[data-jump]').forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault()
    rp2JumpSection(a.dataset.jump||'summary')
  })
})
// Mark current editor version Sent (freeze) — or toggle role-level if no version id yet
$('bv_sent')?.addEventListener('click', ()=>{
  if(!CURROLE) return
  if(RP2EDIT && RP2EDIT.id){
    const on=!isVerSent(RP2EDIT.id)
    rp2MarkVersionSent(RP2EDIT.id, on)
  } else {
    const on=!isSent(CURROLE.id); setSent(CURROLE.id, on)
    if($('bv_sent')){
      $('bv_sent').textContent = on
        ? `✓ sent · ${(CURROLE.company||'Company').trim()} · ${new Date().toLocaleString('en-US',{month:'short',day:'numeric'})}`
        : 'not sent'
    }
  }
  load()
})
function hydrateWriteLocksUI(){
  WRITE_LOCKS=loadWriteLocks()
  if($('bv_lock_edu')) $('bv_lock_edu').checked=WRITE_LOCKS.edu
  if($('bv_lock_exp')) $('bv_lock_exp').checked=WRITE_LOCKS.exp
}
$('bv_lock_edu')?.addEventListener('change', ()=>{
  saveWriteLocks({ edu:!!$('bv_lock_edu').checked, exp:!!$('bv_lock_exp')?.checked })
})
$('bv_lock_exp')?.addEventListener('change', ()=>{
  saveWriteLocks({ edu:!!$('bv_lock_edu')?.checked, exp:!!$('bv_lock_exp').checked })
})
hydrateWriteLocksUI()

$('triage_sort')?.addEventListener('change', ()=>{
  saveTriagePrefs({ sort:$('triage_sort').value, filter:$('triage_filter')?.value||'all' })
  load()
})
$('triage_filter')?.addEventListener('change', ()=>{
  saveTriagePrefs({ sort:$('triage_sort')?.value||'match_desc', filter:$('triage_filter').value })
  load()
})

// T15 Review draft — critique only, never silent edits
$('rp2_review')?.addEventListener('click', async ()=>{
  const box=$('rp2_review_box'); if(!box) return
  const draft=($('rp2_edtext')?.value||'').trim()
  if(!draft){ box.classList.remove('hidden'); box.innerHTML='<h4>Review draft</h4><p class="muted" style="margin:0">Open or generate a draft first.</p>'; return }
  const jd=($('rp2_jd')?.value||CURROLE?.jd||'').trim()
  const b=$('rp2_review'), o=b.textContent; b.disabled=true; b.textContent='Reviewing…'
  box.classList.remove('hidden')
  box.innerHTML='<h4>Review draft</h4><p class="muted" style="margin:0">Second-pass critique — will not edit your text.</p>'
  try{
    const prompt=[
      'You are reviewing a job-application draft. DO NOT rewrite the resume. DO NOT output a revised draft.',
      'List concrete issues only: invented facts risk, weak quantification, missing JD keywords that ARE already in the user materials below, education/experience inconsistencies, and ATS risks.',
      'Use a short bullet list. If something looks fine, say so briefly. Never invent experience for the candidate.',
      'JOB DESCRIPTION:\n'+(jd||'(none)').slice(0,5000),
      'USER MATERIALS / STORIES:\n'+(storyList().join('\n')||'(none)').slice(0,3000),
      'DRAFT:\n'+draft.slice(0,9000),
    ].join('\n\n')
    let data=null, error=null; try{ data=await invokeChat([{ role:'user', content:prompt }]) }catch(e){ error=e }
    if(error) throw error
    if(data?.error){
      box.innerHTML='<h4>Review draft</h4><p class="err">'+esc(mapRewriteSoftError(data.error, data))+'</p>'
      return
    }
    const text=(data?.reply||data?.message||data?.content||'').trim() || 'No critique returned — try again with a BYO key if free tier is busy.'
    box.innerHTML='<h4>Review draft <span class="muted">(no silent edits)</span></h4><div style="white-space:pre-wrap">'+esc(text)+'</div><p class="muted" style="margin:8px 0 0">Apply any fixes yourself in the editor, then Save.</p>'
    logEvent('draft_review', CURROLE?.id, { len:draft.length })
  }catch(err){
    const raw=await fnMsg(err)
    box.innerHTML='<h4>Review draft</h4><p class="err">'+esc(mapRewriteSoftError(raw)||raw)+'</p>'
  }
  finally{ b.disabled=false; b.textContent=o }
})

async function materialsOnlyDraft(kind){
  const jd=($('rp2_jd')?.value||CURROLE?.jd||'').trim()
  const resume=(PROFILE?.resume_text||'').slice(0,6000)
  const mats=getMaterials(CURROLE?.id).map(x=>x.text).filter(Boolean).slice(0,12).join('\n- ')
  const stories=storyList().slice(0,8).join('\n- ')
  const prompts={
    why:'Draft a short "Why this role / company?" answer (120–180 words) using ONLY the materials. No invented claims.',
    salary:'Draft a careful compensation-expectations reply (2–4 sentences). If materials lack numbers, say you prefer to discuss after learning the band — do not invent a number.',
    notice:'Draft a notice-period / start-date answer from materials. If unknown, say you can confirm after an offer — do not invent.',
    email:'Draft a short recruiter email expressing interest + 2 true proof points from materials. No auto-send — copy only.',
    followup:'Draft a polite follow-up note (email body) after applying/interview. Materials-only. No pressure language.',
    thankyou:'Draft a short thank-you note after an interview. Reference 1–2 true points from materials/JD only.',
    research:'Write (1) a 4–6 sentence company/role research blurb from the JD, then (2) a short outreach message. Label sections clearly. Materials-only for personal claims.',
    interview:'List 6 interview angles: likely questions + how to answer using ONLY materials/stories. Bullet list. No invented metrics.',
  }
  const sys=prompts[kind]||prompts.why
  const prompt=[sys,
    'Company: '+(CURROLE?.company||''),
    'Role: '+(CURROLE?.title||''),
    'JD:\n'+(jd||'(none)').slice(0,4500),
    'Resume:\n'+(resume||'(none)'),
    'Added materials:\n- '+(mats||'(none)'),
    'Story bank:\n- '+(stories||'(none)'),
  ].join('\n\n')
  let data=null, error=null; try{ data=await invokeChat([{ role:'user', content:prompt }]) }catch(e){ error=e }
  if(error) throw error
  if(data?.error) throw new Error(data.error=== 'free_limit'?FREE_LIMIT_MSG:data.error)
  return (data?.reply||data?.message||data?.content||'').trim()
}
document.querySelectorAll('[data-ans]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    if(!CURROLE) return
    const kind=btn.dataset.ans
    const box=$('dw_ans'); box.classList.remove('hidden'); box.innerHTML='<p class="muted" style="margin:0">Drafting…</p>'
    const o=btn.textContent; btn.disabled=true
    try{
      const text=await materialsOnlyDraft(kind)
      paintCopyBox(box, 'Draft — '+kind, text, { kind, roleId: CURROLE.id })
      logEvent('form_answer_draft', CURROLE.id, { kind })
    }catch(err){ box.innerHTML='<p class="err">'+esc(await fnMsg(err))+'</p>' }
    finally{ btn.disabled=false; btn.textContent=o }
  })
})
$('dw_interview_btn')?.addEventListener('click', async ()=>{
  if(!CURROLE) return
  const box=$('dw_interview_box'); const b=$('dw_interview_btn')
  const o=b.textContent; b.disabled=true; b.textContent='Building…'
  box.classList.remove('hidden'); box.innerHTML='<p class="muted" style="margin:0">Building interview angles…</p>'
  try{
    const text=await materialsOnlyDraft('interview')
    paintCopyBox(box, 'Interview prep', text, { kind: 'interview', roleId: CURROLE.id })
    await persistInterviewReport(CURROLE.id, text)
    logEvent('interview_prep', CURROLE.id, {})
  }catch(err){ box.innerHTML='<p class="err">'+esc(await fnMsg(err))+'</p>' }
  finally{ b.disabled=false; b.textContent=o }
})
$('dw_iv_add')?.addEventListener('click', async ()=>{
  if(!CURROLE) return
  const round = nextRoundNumber(IV_EVENTS, CURROLE.id)
  const draft = {
    id: 'local-'+Date.now(),
    role_id: CURROLE.id,
    round,
    type: 'screen',
    scheduled_at: null,
    notes: '',
    interviewer_name: null,
  }
  IV_EVENTS = saveInterviewEventsLocal([...(IV_EVENTS||[]), draft])
  paintInterviewRounds(CURROLE.id)
  await upsertInterviewEvent(draft)
  logEvent('interview_round_add', CURROLE.id, { round })
})
function paintInterviewRounds(roleId){
  const root=$('dw_iv_rounds'); if(!root) return
  const list=eventsForRole(IV_EVENTS.length?IV_EVENTS:loadInterviewEventsLocal(), roleId)
  if(!list.length){
    root.innerHTML='<p class="muted" style="margin:0">No rounds yet. Add a screen, onsite, or loop when you schedule one.</p>'
    return
  }
  const typeOpts=INTERVIEW_EVENT_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')
  root.innerHTML=list.map(ev=>{
    const when = ev.scheduled_at ? ev.scheduled_at.slice(0,16) : ''
    return `<div class="iv-round" data-iv-id="${esc(String(ev.id))}">
      <div class="iv-meta"><label>Round</label><input type="number" min="1" data-iv-f="round" value="${ev.round||1}"></div>
      <div class="iv-meta"><label>Type</label><select data-iv-f="type">${typeOpts}</select></div>
      <div class="iv-meta" style="flex:1 1 180px"><label>When</label><input type="datetime-local" data-iv-f="scheduled_at" value="${esc(when)}"></div>
      <div class="iv-meta" style="flex:1 1 160px"><label>Interviewer (optional)</label><input type="text" data-iv-f="interviewer_name" value="${esc(ev.interviewer_name||'')}" placeholder="Name"></div>
      <div class="iv-meta" style="flex:1 1 100%"><label>Notes</label><textarea data-iv-f="notes" placeholder="Topics, logistics…">${esc(ev.notes||'')}</textarea></div>
      <div class="iv-actions">
        <button type="button" class="btn sm" data-iv-save="1">Save round</button>
        <button type="button" class="btn sm ghost" data-iv-del="1">Delete</button>
      </div>
    </div>`
  }).join('')
  root.querySelectorAll('.iv-round').forEach(row=>{
    const id=row.dataset.ivId
    const sel=row.querySelector('[data-iv-f="type"]')
    const cur=list.find(x=>String(x.id)===String(id))
    if(sel && cur) sel.value=cur.type||'screen'
    row.querySelector('[data-iv-save]')?.addEventListener('click', async ()=>{
      const patch=readIvRoundForm(row, id, roleId)
      await upsertInterviewEvent(patch)
      paintInterviewRounds(roleId)
      refreshFollowupStrip()
      logEvent('interview_round_save', roleId, { round: patch.round, type: patch.type })
    })
    row.querySelector('[data-iv-del]')?.addEventListener('click', async ()=>{
      if(!confirm('Delete this interview round?')) return
      await deleteInterviewEvent(id, roleId)
      paintInterviewRounds(roleId)
      refreshFollowupStrip()
      logEvent('interview_round_delete', roleId, {})
    })
  })
}
function readIvRoundForm(row, id, roleId){
  const g=f=>row.querySelector(`[data-iv-f="${f}"]`)?.value
  const scheduledRaw=(g('scheduled_at')||'').trim()
  let scheduled_at=null
  if(scheduledRaw){
    const d=new Date(scheduledRaw)
    scheduled_at = Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return normalizeInterviewEvent({
    id,
    role_id: roleId,
    round: g('round'),
    type: g('type'),
    scheduled_at,
    interviewer_name: g('interviewer_name'),
    notes: g('notes'),
  })
}
function refreshFollowupStrip(){
  const roles=Object.values(ROLESMAP||{})
  const fu = buildFollowupStrip(
    roles.filter(r=>r.stage==='applied'||r.stage==='interview'||r.stage==='offer'),
    IV_EVENTS.length ? IV_EVENTS : loadInterviewEventsLocal()
  )
  const el=$('followups'); if(!el) return
  el.classList.toggle('hidden', !fu.length)
  el.innerHTML = fu.length ? '<span class="fu-label">⏰ FOLLOW-UPS DUE</span><div class="fu-row">'+fu.map(f=>{
    const when = f.labelKind==='upcoming'
      ? ((f.event?.type||'interview')+' · '+f.due.toISOString().slice(0,10))
      : (f.overdue?'follow up now':'by '+f.due.toISOString().slice(0,10))
    const label=`${f.role.company||'—'} — ${f.role.title||''} · ${when}`
    return `<span class="fu-chip${f.overdue?' overdue':''}" title="${esc(label)}"><span class="fu-txt" data-fu="${f.role.id}">${esc(label)}</span><span class="fu-actions"><button type="button" data-fu-draft="${f.role.id}" title="Draft a follow-up note — never sends">Draft follow-up note</button></span></span>`
  }).join('')+'</div>' : ''
  el.querySelectorAll('[data-fu]').forEach(n=>n.onclick=()=>openRole(n.dataset.fu))
  el.querySelectorAll('[data-fu-draft]').forEach(n=>n.onclick=e=>{ e.stopPropagation(); draftFollowupNote(n.dataset.fuDraft) })
}
async function upsertInterviewEvent(ev){
  const n=normalizeInterviewEvent(ev)
  if(!n||!n.role_id) return null
  let list=IV_EVENTS.length?IV_EVENTS.slice():loadInterviewEventsLocal()
  const idx=list.findIndex(x=>String(x.id)===String(n.id))
  if(idx>=0) list[idx]={...list[idx],...n}
  else list.push(n)
  saveInterviewEventsLocal(list)
  if(!ME?.id || !IV_DB_OK) return n
  try{
    const row=interviewEventRowFromLocal(n, ME.id)
    if(!row) return n
    if(n.id && !String(n.id).startsWith('local-')){
      const { data, error } = await sb.from('mt_interview_events').upsert(row).select('*').maybeSingle()
      if(error){
        if(/mt_interview_events|does not exist|relation|schema cache/i.test(error.message||'')) IV_DB_OK=false
        else console.warn('[interview] upsert', error.message)
        return n
      }
      if(data){
        list = list.map(x=>String(x.id)===String(n.id) ? normalizeInterviewEvent(data) : x)
        saveInterviewEventsLocal(list)
        return normalizeInterviewEvent(data)
      }
    } else {
      const { id: _drop, ...insertRow } = row
      const { data, error } = await sb.from('mt_interview_events').insert(insertRow).select('*').maybeSingle()
      if(error){
        if(/mt_interview_events|does not exist|relation|schema cache/i.test(error.message||'')) IV_DB_OK=false
        else console.warn('[interview] insert', error.message)
        return n
      }
      if(data){
        list = list.map(x=>String(x.id)===String(n.id) ? normalizeInterviewEvent(data) : x)
        saveInterviewEventsLocal(list)
        return normalizeInterviewEvent(data)
      }
    }
  }catch(_e){ IV_DB_OK=false }
  return n
}
async function deleteInterviewEvent(id, roleId){
  let list=(IV_EVENTS.length?IV_EVENTS:loadInterviewEventsLocal()).filter(x=>String(x.id)!==String(id))
  saveInterviewEventsLocal(list)
  if(!ME?.id || !IV_DB_OK || !id || String(id).startsWith('local-')) return
  try{
    const { error } = await sb.from('mt_interview_events').delete().eq('id', id)
    if(error && /mt_interview_events|does not exist|relation/i.test(error.message||'')) IV_DB_OK=false
    else if(error) console.warn('[interview] delete', error.message)
  }catch(_e){ IV_DB_OK=false }
}
async function persistInterviewReport(roleId, text){
  const row=interviewReportRow({ roleId, text, owner: ME?.id })
  if(!row) return
  try{
    const { error } = await sb.from('mt_reports').insert(row)
    if(error) console.warn('[interview] report save', error.message)
    else if(CURROLE && String(CURROLE.id)===String(roleId)){
      // reload latest prep into box history hint
      const box=$('dw_interview_box')
      if(box && !box.querySelector('[data-iv-saved]')){
        const note=document.createElement('p')
        note.className='muted'
        note.dataset.ivSaved='1'
        note.style.cssText='margin:8px 0 0;font-size:12px'
        note.textContent='Saved to history (interview report) — recoverable after refresh.'
        box.appendChild(note)
      }
    }
  }catch(e){ console.warn('[interview] report save', e?.message||e) }
}
async function loadLatestInterviewPrep(roleId){
  if(!roleId) return
  try{
    const { data, error } = await sb.from('mt_reports').select('rewritten,created_at').eq('role_id',roleId).eq('kind','interview').order('created_at',{ascending:false}).limit(1)
    if(error || !data || !data[0]?.rewritten) return
    const box=$('dw_interview_box')
    if(box && box.classList.contains('hidden')){
      paintCopyBox(box, 'Interview prep (saved)', data[0].rewritten)
      const note=document.createElement('p')
      note.className='muted'
      note.style.cssText='margin:8px 0 0;font-size:12px'
      note.textContent='Recovered from history · '+(data[0].created_at||'').slice(0,10)
      box.appendChild(note)
    }
  }catch(_e){}
}
async function syncInterviewEventsFromDb(){
  if(!ME?.id){ IV_EVENTS=loadInterviewEventsLocal(); return }
  try{
    const { data, error } = await sb.from('mt_interview_events').select('*').eq('owner', ME.id).order('scheduled_at',{ascending:true})
    if(error){
      if(/mt_interview_events|does not exist|relation|schema cache/i.test(error.message||'')) IV_DB_OK=false
      else console.warn('[interview] load', error.message)
      IV_EVENTS=loadInterviewEventsLocal()
      return
    }
    IV_DB_OK=true
    const remote=(data||[]).map(normalizeInterviewEvent).filter(Boolean)
    // Prefer remote; keep local-only drafts not yet pushed
    const remoteIds=new Set(remote.map(e=>String(e.id)))
    const localOnly=loadInterviewEventsLocal().filter(e=>String(e.id||'').startsWith('local-') && !remoteIds.has(String(e.id)))
    saveInterviewEventsLocal([...remote, ...localOnly])
  }catch(_e){
    IV_DB_OK=false
    IV_EVENTS=loadInterviewEventsLocal()
  }
}
$('dw_research_btn')?.addEventListener('click', async ()=>{
  if(!CURROLE) return
  const box=$('dw_research_box'); const b=$('dw_research_btn')
  const o=b.textContent; b.disabled=true; b.textContent='Drafting…'
  box.classList.remove('hidden'); box.innerHTML='<p class="muted" style="margin:0">Drafting research + outreach…</p>'
  try{
    const text=await materialsOnlyDraft('research')
    paintCopyBox(box, 'Research & outreach', text, { kind: 'outreach', roleId: CURROLE.id })
    logEvent('research_outreach', CURROLE.id, {})
  }catch(err){ box.innerHTML='<p class="err">'+esc(await fnMsg(err))+'</p>' }
  finally{ b.disabled=false; b.textContent=o }
})
function paintOutcomeUI(roleId){
  const o=loadOutcomes()[roleId]
  if($('dw_outcome_kind')) $('dw_outcome_kind').value=o?.kind||''
  if($('dw_outcome_date')) $('dw_outcome_date').value=o?.date||''
  if($('dw_outcome_note')) $('dw_outcome_note').value=o?.note||''
  const showOffer = ($('dw_outcome_kind')?.value||'')==='offer'
  $('dw_offer_fields')?.classList.toggle('hidden', !showOffer)
  if($('dw_offer_base')) $('dw_offer_base').value = o?.base!=null ? String(o.base) : ''
  if($('dw_offer_bonus')) $('dw_offer_bonus').value = o?.bonus!=null ? String(o.bonus) : ''
  if($('dw_offer_currency')) $('dw_offer_currency').value = o?.currency || 'USD'
  if($('dw_offer_remote')) $('dw_offer_remote').value = o?.remote || ''
  if($('dw_offer_deadline')) $('dw_offer_deadline').value = o?.deadline || ''
  if($('dw_offer_equity')) $('dw_offer_equity').value = o?.equity_notes || ''
  const view=$('dw_outcome_view')
  if(!view) return
  if(!o?.kind){ view.classList.add('hidden'); view.innerHTML=''; paintOfferCompare(roleId); return }
  view.classList.remove('hidden')
  let bits=`<b>${esc(o.kind)}</b>`+(o.date?' · '+esc(o.date):'')
  if(o.kind==='offer'){
    const cur=o.currency||'USD'
    if(o.base!=null) bits+=` · base ${esc(formatMoney(o.base, cur))}`
    if(o.bonus!=null) bits+=` · bonus ${esc(formatMoney(o.bonus, cur))}`
    if(o.remote) bits+=` · ${esc(o.remote)}`
    if(o.deadline) bits+=` · deadline ${esc(o.deadline)}`
    if(o.equity_notes) bits+=`<div style="margin-top:6px;white-space:pre-wrap"><b>Equity:</b> ${esc(o.equity_notes)}</div>`
  }
  if(o.note) bits+=`<div style="margin-top:6px;white-space:pre-wrap">${esc(o.note)}</div>`
  view.innerHTML=bits
  paintOfferCompare(roleId)
}
function toggleOfferFieldsVisibility(){
  const kind=$('dw_outcome_kind')?.value||''
  $('dw_offer_fields')?.classList.toggle('hidden', kind!=='offer')
}
function paintOfferCompare(preferRoleId){
  const root=$('dw_offer_compare'); if(!root) return
  const outcomes=loadOutcomes()
  const offerRoles=Object.entries(outcomes)
    .filter(([,o])=>o?.kind==='offer')
    .map(([id,o])=>{
      const r=ROLESMAP[id]||{}
      return { roleId:id, company:r.company||'—', title:r.title||'', outcome:o }
    })
  if(offerRoles.length < 2){
    root.innerHTML='<p class="muted" style="margin:0">Save Offer outcomes on at least two roles to compare.</p>'
    return
  }
  // Default: prefer current role + up to 2 other offers
  const selected = (()=>{
    const ids=[]
    if(preferRoleId && offerRoles.some(x=>x.roleId===preferRoleId)) ids.push(preferRoleId)
    for(const x of offerRoles){
      if(ids.includes(x.roleId)) continue
      ids.push(x.roleId)
      if(ids.length>=3) break
    }
    return ids
  })()
  const picks=offerRoles.map(x=>{
    const on=selected.includes(x.roleId)
    return `<label><input type="checkbox" data-oc-id="${esc(x.roleId)}" ${on?'checked':''}> ${esc(x.company)} — ${esc(x.title||'role')}</label>`
  }).join('')
  const refresh=()=>{
    const checked=[...root.querySelectorAll('[data-oc-id]:checked')].map(el=>el.dataset.ocId).slice(0,3)
    const entries=checked.map(id=>{
      const r=ROLESMAP[id]||{}
      return { roleId:id, company:r.company||'—', title:r.title||'', outcome:outcomes[id] }
    })
    const cmp=buildOfferCompare(entries)
    let table=''
    if(cmp.empty){
      table='<p class="muted" style="margin:8px 0 0">Select 2–3 offers above.</p>'
    } else {
      table='<table><thead><tr><th></th>'+cmp.columns.map(c=>`<th>${esc(c.company)}</th>`).join('')+'</tr></thead><tbody>'
        +cmp.rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th>`+row.values.map(v=>`<td>${esc(String(v))}</td>`).join('')+'</tr>').join('')
        +'</tbody></table>'
    }
    const pickEl=root.querySelector('.oc-pick')
    const tableHost=root.querySelector('.oc-table')
    if(tableHost) tableHost.innerHTML=table
    else root.innerHTML=`<div class="oc-pick">${picks}</div><div class="oc-table">${table}</div>`
    root.querySelectorAll('[data-oc-id]').forEach(el=>{
      el.onchange=()=>{
        const all=[...root.querySelectorAll('[data-oc-id]:checked')]
        if(all.length>3){ el.checked=false; return }
        refresh()
      }
    })
  }
  root.innerHTML=`<div class="oc-pick">${picks}</div><div class="oc-table"></div>`
  refresh()
}
$('dw_outcome_kind')?.addEventListener('change', ()=>toggleOfferFieldsVisibility())
$('dw_outcome_save')?.addEventListener('click', ()=>{
  if(!CURROLE) return
  const kind=$('dw_outcome_kind')?.value||''
  const date=$('dw_outcome_date')?.value||''
  const note=($('dw_outcome_note')?.value||'').trim()
  let payload=null
  if(kind){
    payload={ kind, date, note, at:new Date().toISOString() }
    if(kind==='offer'){
      payload.base=parseMoneyInput($('dw_offer_base')?.value)
      payload.bonus=parseMoneyInput($('dw_offer_bonus')?.value)
      payload.currency=($('dw_offer_currency')?.value||'USD').trim()||'USD'
      payload.remote=($('dw_offer_remote')?.value||'').trim()
      payload.deadline=($('dw_offer_deadline')?.value||'').trim()
      payload.equity_notes=($('dw_offer_equity')?.value||'').trim()
    }
  }
  saveOutcome(CURROLE.id, payload)
  paintOutcomeUI(CURROLE.id)
  paintWhatShipped(CURROLE.id)
  logEvent('outcome_saved', CURROLE.id, { kind:kind||null })
})
async function draftFollowupNote(roleId){
  const role=ROLESMAP[roleId]; if(!role) return
  CURROLE=role
  // lightweight: open drawer path if possible
  try{ if(typeof openRole2==='function') await openRole2(roleId) }catch(_e){}
  const box=$('dw_ans'); if(box){ box.classList.remove('hidden'); box.innerHTML='<p class="muted" style="margin:0">Drafting follow-up…</p>' }
  try{
    const kind = role.stage==='interview' ? 'thankyou' : 'followup'
    const text=await materialsOnlyDraft(kind)
    paintCopyBox(box||$('status'), kind==='thankyou'?'Thank-you draft':'Follow-up draft', text)
    logEvent('followup_draft', roleId, { kind })
  }catch(err){
    if(box) box.innerHTML='<p class="err">'+esc(await fnMsg(err))+'</p>'
    else alert(await fnMsg(err))
  }
}


// ---- Decide: evaluate pack + suggested call ----
$('dw_evaluate')?.addEventListener('click', async ()=>{
  if(!CURROLE) return
  const b=$('dw_evaluate'), o=b.textContent; b.disabled=true; b.textContent='Building…'
  try{
    let matchData=null
    const jd=($('rp2_jd')?.value||CURROLE.jd||'').trim()
    const resume=(PROFILE?.resume_text||'').trim()
    paintDealBreakers(jd)
    const tri=await cheapPreTriage(CURROLE, { resume, jd })
    paintPreTriage(tri)
    if(!tri.skipLlm && jd && resume){
      try{
        const data = await invokeMatch({ resume_text:resume, jd_text:jd })
        bumpUsage('match')
        if(data && !data.error && typeof data.match_score==='number'){
          matchData=data
          rp2ShowScore(data, 'evaluate · ')
          await rp2PersistScore(data.match_score, data.missing)
        }
      }catch(_e){}
    } else if(tri.keyword && !matchData){
      // Keep keyword pre-score in #dw_pretriage only — never paint into shared Match % / card.
      matchData={ match_score:tri.keyword.score, method:'pretriage-keywords', present:tri.keyword.present, missing:tri.keyword.missing, summary:'Cheap pre-triage only — LLM skipped.' }
    }
    const pack=buildEvaluatePack(CURROLE, matchData)
    if(tri.skipLlm && pack.suggest!=='skip') pack.suggest='skip'
    renderEvaluatePack(pack)
    await persistEvaluateReport(pack)
    logEvent('evaluate_pack', CURROLE.id, { suggest: pack.suggest, score: pack.score, ghost: pack.ghost, pretriage: !!tri.skipLlm })
  }finally{ b.disabled=false; b.textContent=o }
})
$('dw_eval_suggest')?.addEventListener('click', ()=>{
  if(!CURROLE) return
  const pack=LAST_EVAL || buildEvaluatePack(CURROLE, null)
  if(!LAST_EVAL) renderEvaluatePack(pack)
  setVerdict(CURROLE.id, pack.suggest)
  syncVerdictUI(pack.suggest)
  load()
})
// Re-check deal-breakers when JD text changes
$('rp2_jd')?.addEventListener('input', ()=>{
  if(!CURROLE) return
  paintDealBreakers($('rp2_jd').value)
})

// ---- Sourced triage: batch match + dedupe ----
async function ensureRoleJd(r){
  // Re-read from DB — don't trust a stale ROLESMAP copy
  try{
    const { data } = await sb.from('mt_roles').select('jd,url').eq('id', r.id).maybeSingle()
    if(data){ if(data.jd!=null) r.jd=data.jd; if(data.url) r.url=data.url }
  }catch(_e){}
  const existing=(r.jd||'').trim()
  if(existing.length>80 && !jdRejectReason(existing)) return { ok:true, jd:existing, fetched:false }
  if(!r.url) return { ok:false, reason: existing ? 'jd_rejected' : 'no_url' }
  try{
    const { data, error } = await sb.functions.invoke('fetch-jd',{ body:{ url:r.url } })
    if(error || !data?.jd) return { ok:false, reason: existing ? 'jd_rejected' : 'fetch_failed' }
    const got=acceptFetchedJd(data.jd)
    if(!got.ok) return { ok:false, reason:'reject_'+got.reason }
    await saveJd(r, got.jd)
    return { ok:true, jd:got.jd, fetched:true }
  }catch(_e){
    return { ok:false, reason: existing ? 'jd_rejected' : 'fetch_error' }
  }
}
$('triage_batch')?.addEventListener('click', async ()=>{
  const st=$('triage_status'); if(st){ st.dataset.busy='1'; st.textContent='Batch matching…' }
  const b=$('triage_batch'), o=b.textContent; b.disabled=true
  const resume=(PROFILE?.resume_text||'').trim()
  if(!resume){ if(st) st.textContent='Add your resume in Settings first.'; b.disabled=false; b.textContent=o; if(st) delete st.dataset.busy; return }
  const sourced=Object.values(ROLESMAP).filter(r=>r.stage==='sourced' && !shouldHideRole(r))
  if(!sourced.length){
    if(st){ st.textContent='No visible Sourced roles. Click “filtered Sourced — show” if cards are hidden, or Run job search.'; delete st.dataset.busy }
    b.disabled=false; b.textContent=o; return
  }
  const ready=[], skipped=[], scored=[], failed=[]
  let fetchedN=0
  for(const r of sourced){
    if(st) st.textContent=`Loading JDs… ${ready.length+skipped.length+1}/${sourced.length}`
    const got=await ensureRoleJd(r)
    if(got.ok && (got.jd||'').trim().length>80){
      if(got.fetched) fetchedN++
      ready.push({ id:r.id, company:r.company, title:r.title, jd:got.jd, url:r.url, stage:r.stage })
    } else {
      skipped.push({ co:r.company||'—', why: got.reason||'no_jd' })
    }
  }
  let done=0
  const queue=ready.slice(0,25)
  async function one(r){
    try{
      const tri=await cheapPreTriage(r, { resume, jd:r.jd })
      let data=null
      if(tri.skipLlm){
        data={ match_score:tri.keyword?.score??0, method:'pretriage', present:tri.keyword?.present||[], missing:tri.keyword?.missing||[], summary:'Pre-triage skipped LLM' }
      } else {
        data = await invokeMatch({ resume_text:resume, jd_text:r.jd })
        bumpUsage('match')
      }
      if(!(data && !data.error && typeof data.match_score==='number')){
        failed.push({ co:r.company||'—', why:'no_score' }); return
      }
      const label = data.match_score+'%'
      // Write match_score alone first — bundling fit_score used to fail the whole update silently
      let { error: uerr } = await sb.from('mt_roles').update({ match_score: label }).eq('id', r.id)
      if(uerr){
        const retry = await sb.from('mt_roles').update({ match_score: String(data.match_score) }).eq('id', r.id)
        uerr = retry.error
      }
      if(!uerr){
        try{ await sb.from('mt_roles').update({ fit_score: data.match_score>=72?'A':data.match_score>=55?'B':'C' }).eq('id', r.id) }catch(_e){}
      }
      await sb.from('mt_reports').insert({ role_id:r.id, kind:'match', match_score:data.match_score, missing_keywords:data.missing||[] })
      const pack=buildEvaluatePack(r, data)
      if(tri.skipLlm) pack.suggest='skip'
      try{ await sb.from('mt_reports').insert({ role_id:r.id, kind:'evaluate', match_score:pack.score, missing_keywords:pack.missing||[], rewritten:JSON.stringify(pack) }) }catch(_e){}
      if(pack.suggest==='apply'||pack.suggest==='stretch'||pack.suggest==='skip') setVerdict(r.id, pack.suggest)
      if(ROLESMAP[r.id]) ROLESMAP[r.id].match_score = label
      if(uerr) failed.push({ co:r.company||'—', why:'save_failed:'+(uerr.message||'update') })
      else scored.push({ co:r.company||'—', score:data.match_score })
    }catch(e){ failed.push({ co:r.company||'—', why:(e&&e.message)||'error' }) }
    done++
    if(st) st.textContent=`Batch ${done}/${queue.length} · scored ${scored.length} · failed ${failed.length}`
  }
  let i=0
  async function worker(){ while(i<queue.length){ const r=queue[i++]; await one(r) } }
  if(queue.length) await Promise.all([worker(), worker()])
  logEvent('triage_batch', null, { queued: queue.length, scored: scored.length, failed: failed.length, skipped: skipped.length, fetched: fetchedN })
  await load()
  if(st){
    const scoredBit = scored.length ? `Scored ${scored.map(s=>s.co+' '+s.score+'%').join(', ')}.` : ''
    const failBit = failed.length ? ` Failed: ${failed.map(f=>f.co).join(', ')}.` : ''
    const skipBit = skipped.length ? ` No usable JD: ${skipped.map(s=>s.co).join(', ')}.` : ''
    const fetchBit = fetchedN ? ` Loaded ${fetchedN} JD${fetchedN>1?'s':''} from links.` : ''
    st.textContent = (scoredBit || failBit || skipBit)
      ? `${scoredBit}${fetchBit}${failBit}${skipBit}`.trim()
      : 'Nothing to rank.'
    delete st.dataset.busy
  }
  b.disabled=false; b.textContent=o
})
$('triage_dedupe')?.addEventListener('click', async ()=>{
  const st=$('triage_status'); if(st){ st.dataset.busy='1'; st.textContent='Deduping…' }
  const b=$('triage_dedupe'), o=b.textContent; b.disabled=true
  const roles=Object.values(ROLESMAP).slice().sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0))
  const seenUrl=new Set(), seenFp=new Set()
  let closed=0
  for(const r of roles){
    if(r.stage===CLOSED) continue
    const url=(r.url||'').trim()
    const fp=roleFingerprint(r.company, r.title)
    let dup=false
    if(url && seenUrl.has(url)) dup=true
    if(fp && seenFp.has(fp)) dup=true
    if(dup){
      await sb.from('mt_roles').update({ stage: CLOSED }).eq('id', r.id)
      closed++
    } else {
      if(url) seenUrl.add(url)
      if(fp) seenFp.add(fp)
    }
  }
  await load()
  if(st){ st.textContent = closed ? `Closed ${closed} duplicate card${closed>1?'s':''} (kept the oldest).` : 'No duplicates found.'; delete st.dataset.busy }
  b.disabled=false; b.textContent=o
  logEvent('board_dedupe', null, { closed })
})
$('triage_close_offlane')?.addEventListener('click', async ()=>{
  const st=$('triage_status'); if(st){ st.dataset.busy='1'; st.textContent='Removing junk from Sourced…' }
  const b=$('triage_close_offlane'), o=b?.textContent; if(b) b.disabled=true
  let closed=0, closedAe=0
  const roles=Object.values(ROLESMAP||{})
  for(const r of roles){
    if(String(r.stage||'')!=='sourced') continue
    if(roleOffLaneReason(r) || roleWrongGeo(r)){
      await sb.from('mt_roles').update({ stage: CLOSED }).eq('id', r.id)
      closed++
    }
  }
  // Closed AE / banned scrapes already in Closed stay put; count for honesty
  closedAe = roles.filter(r => String(r.stage||'')===CLOSED && FIND_BAN_RE.test(String(r.title||''))).length
  await load()
  if(st){
    st.textContent = closed
      ? `Moved ${closed} junk Sourced card${closed>1?'s':''} to Closed (didn’t match your titles/keywords).${closedAe?` Closed still holds ${closedAe} old banned-title scrapes — safe to ignore.`:''}`
      : (closedAe ? `No junk left in Sourced. Closed still has ${closedAe} banned-title scrapes.` : 'No junk Sourced cards to remove.')
    delete st.dataset.busy
  }
  if(b){ b.disabled=false; b.textContent=o }
  logEvent('close_offlane', null, { closed, closedAe })
})
$('triage_empty_closed')?.addEventListener('click', async ()=>{
  const b=$('triage_empty_closed'), o=b?.textContent
  if(b){ b.disabled=true; b.textContent='Emptying…' }
  try{ await emptyClosedRoles() }
  finally{ if(b){ b.disabled=false; b.textContent=o||'Empty Closed' } }
})

// ==== Career OS durability: outcomes / stories / Sent (DB + local fallback) ====
async function syncDurabilityFromDb({ roles=[], reports=[] }={}){
  if(!ME?.id) return
  const local = readLocalCareerTruth(localStorage, ME.id)
  try{
    let outcomeRows=[]
    const outRes = await sb.from('mt_outcomes').select('*').eq('owner', ME.id)
    if(outRes.error){
      if(!/mt_outcomes|does not exist|schema cache|relation/i.test(outRes.error.message||'')) throw outRes.error
      // migration not applied yet — keep local
      DURABILITY_DB_OK=false
      return
    }
    outcomeRows=outRes.data||[]

    // Prefer report meta with display_name/sent_at when columns exist
    let reportMeta=reports
    try{
      const metaRes = await sb.from('mt_reports').select('id,display_name,sent_at')
      if(!metaRes.error) reportMeta=metaRes.data||[]
    }catch(_e){}

    const remote = remoteCareerTruthFromDb({
      story_bank: PROFILE && Object.prototype.hasOwnProperty.call(PROFILE,'story_bank') ? (PROFILE.story_bank||'') : '',
      outcomeRows,
      roles,
      reports: reportMeta,
    })

    let truth
    if(!isDurabilityMigrated(localStorage, ME.id)){
      const plan = planDurabilityMigrate({ local, remote })
      if(plan.hasWork) await applyDurabilityMigratePlan(plan)
      truth = applyRemoteAuthoritative({
        stories: plan.story_bank != null ? plan.story_bank : (remote.stories || local.stories || ''),
        outcomes: { ...(local.outcomes||{}), ...(remote.outcomes||{}) },
        sentRoles: { ...(local.sentRoles||{}), ...(remote.sentRoles||{}) },
        sentVers: { ...(local.sentVers||{}), ...(remote.sentVers||{}) },
        verNames: { ...(local.verNames||{}), ...(remote.verNames||{}) },
      })
      // overlay planned upserts as committed
      for(const row of plan.outcomeUpserts||[]){
        const n=normalizeOutcome({
          kind:row.kind, date:row.outcome_date, note:row.note, at:row.recorded_at,
          base:row.base_amount, bonus:row.bonus_amount, equity_notes:row.equity_notes,
          remote:row.remote, deadline:row.offer_deadline, currency:row.currency,
        })
        if(n) truth.outcomes[row.role_id]=n
      }
      for(const r of plan.roleSentUpserts||[]) truth.sentRoles[r.role_id]=1
      for(const v of plan.versionMetaUpserts||[]){
        if(v.sent_at) truth.sentVers[v.id]=1
        if(v.display_name) truth.verNames[v.id]=v.display_name
      }
      markDurabilityMigrated(localStorage, ME.id)
      logEvent('durability_migrated', null, {
        outcomes: (plan.outcomeUpserts||[]).length,
        role_sent: (plan.roleSentUpserts||[]).length,
        versions: (plan.versionMetaUpserts||[]).length,
        stories: plan.story_bank!=null,
      })
    } else {
      truth = applyRemoteAuthoritative(remote)
    }

    writeLocalCareerTruth(localStorage, ME.id, truth)
    if(PROFILE) PROFILE.story_bank = truth.stories || ''
    DURABILITY_DB_OK=true
  }catch(e){
    console.warn('[durability]', e?.message||e)
    DURABILITY_DB_OK=false
  }
}

async function applyDurabilityMigratePlan(plan){
  if(!ME?.id || !plan) return
  if(plan.story_bank != null){
    const { error } = await sb.from('mt_profiles').update({ story_bank: plan.story_bank }).eq('owner', ME.id)
    if(error && /story_bank|column/i.test(error.message||'')) { /* column missing */ }
    else if(error) console.warn('[durability] story migrate', error.message)
    else if(PROFILE) PROFILE.story_bank = plan.story_bank
  }
  for(const row of plan.outcomeUpserts||[]){
    const payload = { ...row, owner: ME.id }
    const { error } = await sb.from('mt_outcomes').upsert(payload, { onConflict: 'owner,role_id' })
    if(error) console.warn('[durability] outcome migrate', error.message)
  }
  for(const r of plan.roleSentUpserts||[]){
    const { error } = await sb.from('mt_roles').update({ sent_at: r.sent_at }).eq('id', r.role_id)
    if(error) console.warn('[durability] role sent migrate', error.message)
  }
  for(const v of plan.versionMetaUpserts||[]){
    const patch={}
    if(v.sent_at) patch.sent_at=v.sent_at
    if(v.display_name) patch.display_name=v.display_name
    if(!Object.keys(patch).length) continue
    const { error } = await sb.from('mt_reports').update(patch).eq('id', v.id)
    if(error) console.warn('[durability] version meta migrate', error.message)
  }
}

function hydrateVersionMetaFromRows(rows){
  if(!rows||!rows.length) return
  const names=rp2VerNames()
  const sent=sentVerStore()
  let dirty=false
  for(const r of rows){
    if(r.display_name && !names[r.id]){ names[r.id]=r.display_name; dirty=true }
    if(r.sent_at && !sent[r.id]){ sent[r.id]=1; dirty=true }
  }
  if(dirty){
    localStorage.setItem('rp2_ver_names', JSON.stringify(names))
    localStorage.setItem('co_sent_ver', JSON.stringify(sent))
  }
}

async function persistStoryBank(text){
  if(!ME?.id || !DURABILITY_DB_OK) return
  try{
    const { error } = await sb.from('mt_profiles').update({ story_bank: String(text||'') }).eq('owner', ME.id)
    if(error){
      if(/story_bank|column/i.test(error.message||'')) DURABILITY_DB_OK=false
      else console.warn('[durability] story save', error.message)
    }
  }catch(_e){ DURABILITY_DB_OK=false }
}

async function persistOutcome(roleId, o){
  if(!ME?.id || !DURABILITY_DB_OK || !roleId) return
  try{
    if(!o||!o.kind){
      const { error } = await sb.from('mt_outcomes').delete().eq('owner', ME.id).eq('role_id', roleId)
      if(error && /mt_outcomes|does not exist|relation/i.test(error.message||'')) DURABILITY_DB_OK=false
      else if(error) console.warn('[durability] outcome delete', error.message)
      return
    }
    const row = outcomeRowFromLocal(roleId, o, ME.id)
    if(!row) return
    const { error } = await sb.from('mt_outcomes').upsert(row, { onConflict: 'owner,role_id' })
    if(error){
      if(/mt_outcomes|does not exist|relation|column/i.test(error.message||'')) DURABILITY_DB_OK=false
      else console.warn('[durability] outcome save', error.message)
    }
  }catch(_e){ DURABILITY_DB_OK=false }
}

async function persistRoleSent(roleId, on){
  if(!ME?.id || !DURABILITY_DB_OK || !roleId) return
  try{
    const { error } = await sb.from('mt_roles').update({ sent_at: on ? new Date().toISOString() : null }).eq('id', roleId)
    if(error){
      if(/sent_at|column/i.test(error.message||'')) DURABILITY_DB_OK=false
      else console.warn('[durability] role sent', error.message)
    } else if(ROLESMAP[roleId]){
      ROLESMAP[roleId].sent_at = on ? new Date().toISOString() : null
    }
  }catch(_e){ DURABILITY_DB_OK=false }
}

async function persistVerSent(verId, on){
  if(!ME?.id || !DURABILITY_DB_OK || !verId) return
  try{
    const patch={ sent_at: on ? new Date().toISOString() : null }
    const { error } = await sb.from('mt_reports').update(patch).eq('id', verId)
    if(error){
      if(/sent_at|column/i.test(error.message||'')) DURABILITY_DB_OK=false
      else console.warn('[durability] ver sent', error.message)
    } else {
      const row=(RP2ROWS||[]).find(x=>String(x.id)===String(verId))
      if(row) row.sent_at = patch.sent_at
    }
  }catch(_e){ DURABILITY_DB_OK=false }
}

async function persistVerDisplayName(verId, name){
  if(!ME?.id || !DURABILITY_DB_OK || !verId) return
  try{
    const { error } = await sb.from('mt_reports').update({ display_name: name||null }).eq('id', verId)
    if(error){
      if(/display_name|column/i.test(error.message||'')) DURABILITY_DB_OK=false
      else console.warn('[durability] ver name', error.message)
    } else {
      const row=(RP2ROWS||[]).find(x=>String(x.id)===String(verId))
      if(row) row.display_name = name||null
    }
  }catch(_e){ DURABILITY_DB_OK=false }
}

// ==== Career OS Phase 1: bullet memory / portfolio / advisor / cadence ====
let MEM_ROWS=[], PF_ROWS=[], MEM_POLISH_ID=null, MEM_DB_OK=true, PF_DB_OK=true

const MEM_LOCAL = createScopedJsonStore('co_accomplishments', () => ME?.id, [])
const PF_LOCAL = createScopedJsonStore('co_portfolio', () => ME?.id, [])
function memLocalKey(){ return MEM_LOCAL.key() }
function pfLocalKey(){ return PF_LOCAL.key() }
function loadMemLocal(){ return MEM_LOCAL.load() }
function saveMemLocal(rows){ return MEM_LOCAL.save(rows || []) }
function loadPfLocal(){ return PF_LOCAL.load() }
function savePfLocal(rows){ return PF_LOCAL.save(rows || []) }

async function loadAccomplishments(){
  if(!ME?.id){ MEM_ROWS=loadMemLocal(); return MEM_ROWS }
  try{
    const { data, error } = await sb.from('mt_accomplishments').select('*').eq('owner',ME.id).order('created_at',{ascending:false})
    if(error) throw error
    MEM_DB_OK=true
    MEM_ROWS=data||[]
    saveMemLocal(MEM_ROWS)
  }catch(_e){
    MEM_DB_OK=false
    MEM_ROWS=loadMemLocal()
  }
  return MEM_ROWS
}
async function upsertAccomplishmentRow(row){
  if(MEM_DB_OK && ME?.id){
    try{
      const payload={ ...row, owner:ME.id }
      delete payload._rank
      const { data, error } = await sb.from('mt_accomplishments').upsert(payload).select().maybeSingle()
      if(error) throw error
      if(data) row=data
    }catch(_e){ MEM_DB_OK=false }
  }
  const all=loadMemLocal()
  const i=all.findIndex(x=>x.id===row.id)
  if(i>=0) all[i]=row; else all.unshift(row)
  saveMemLocal(all)
  MEM_ROWS=all
  return row
}
async function loadPortfolioRows(){
  if(!ME?.id){ PF_ROWS=loadPfLocal(); return PF_ROWS }
  try{
    const { data, error } = await sb.from('mt_portfolio_items').select('*').eq('owner',ME.id).order('created_at',{ascending:false})
    if(error) throw error
    PF_DB_OK=true
    PF_ROWS=data||[]
    savePfLocal(PF_ROWS)
  }catch(_e){
    PF_DB_OK=false
    PF_ROWS=loadPfLocal()
  }
  return PF_ROWS
}
async function upsertPortfolioRow(row){
  if(PF_DB_OK && ME?.id){
    try{
      const payload={ ...row, owner:ME.id }
      delete payload._rank
      const { data, error } = await sb.from('mt_portfolio_items').upsert(payload).select().maybeSingle()
      if(error) throw error
      if(data) row=data
    }catch(_e){ PF_DB_OK=false }
  }
  const all=loadPfLocal()
  const i=all.findIndex(x=>x.id===row.id)
  if(i>=0) all[i]=row; else all.unshift(row)
  savePfLocal(all)
  PF_ROWS=all
  return row
}

async function persistResumeSync(result){
  return persistResumeProfile({
    profile: PROFILE, result, supabase: sb, ownerId: ME?.id, byId: $,
    afterPersist: paintReconcileBanner,
  })
}

function paintReconcileBanner(){
  const el=$('reconcile_banner')
  if(!el) return
  el.classList.toggle('hidden', !PROFILE?.resume_reconcile_needed)
}

function fillMemRoleSelect(){
  const sel=$('mem_role'); if(!sel) return
  const roles=(PROFILE?.resume_struct?.roles||[]).map(r=>{
    if(!r.id) r.id=stableRoleKey(r)
    return r
  })
  sel.innerHTML='<option value="">— none —</option>'+roles.map(r=>`<option value="${esc(r.id)}">${esc(r.header||r.id)}</option>`).join('')
}

function renderMemDiff(from, to){
  const parts=wordDiff(from, to)
  return parts.map(p=>{
    if(p.type==='eq') return esc(p.text)
    if(p.type==='ins') return `<span style="background:#dcf3ee;color:#0a8577">${esc(p.text)}</span>`
    return `<span style="background:#fff0f0;color:#b42318;text-decoration:line-through">${esc(p.text)}</span>`
  }).join('')
}

function renderMemList(){
  const wrap=$('mem_list'); if(!wrap) return
  const rows=(MEM_ROWS||[]).filter(r=>r.status!=='archived')
  if(!rows.length){ wrap.innerHTML='<p class="muted" style="font-size:13px">No accomplishments yet — capture one above.</p>'; return }
  wrap.innerHTML=rows.map(r=>{
    const st=r.status||'inbox'
    const orig=r.body_original!==r.body_current?`<div class="muted" style="font-size:11.5px;margin-top:4px">Original: ${esc(r.body_original)}</div>`:''
    const promo=r.promoted_bullet_id?`<span class="chip">promoted</span>`:''
    const orphan=st==='orphaned'?`<span class="chip miss">orphaned — repair</span>`:''
    return `<div class="card" style="padding:12px;margin:8px 0" data-mem="${esc(r.id)}">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <label style="margin:0;font-weight:400"><input type="checkbox" data-mem-check="${esc(r.id)}" ${r.checked?'checked':''} style="width:auto"></label>
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;line-height:1.45">${esc(r.body_current)}</div>
          ${orig}
          <div class="muted" style="font-size:11.5px;margin-top:6px">${esc(st)} ${promo} ${orphan}
            ${r.employer?' · '+esc(r.employer):''}${r.project?' · '+esc(r.project):''}
            ${!MEM_DB_OK?' · local only':''}
          </div>
          <div class="row" style="margin-top:8px">
            <button type="button" class="btn sm" data-mem-edit="${esc(r.id)}">Edit</button>
            <button type="button" class="btn sm" data-mem-polish="${esc(r.id)}">Polish</button>
            <button type="button" class="btn sm primary" data-mem-promote="${esc(r.id)}">Promote</button>
            <button type="button" class="btn sm" data-mem-hist="${esc(r.id)}">History</button>
            <button type="button" class="btn sm danger-ghost" data-mem-arch="${esc(r.id)}">Archive</button>
          </div>
        </div>
      </div>
    </div>`
  }).join('')
  wrap.querySelectorAll('[data-mem-check]').forEach(cb=>cb.onchange=async()=>{
    const id=cb.dataset.memCheck
    const row=MEM_ROWS.find(x=>x.id===id); if(!row) return
    row.checked=cb.checked
    await upsertAccomplishmentRow(row)
  })
  wrap.querySelectorAll('[data-mem-edit]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.memEdit
    const row=MEM_ROWS.find(x=>x.id===id); if(!row) return
    const next=prompt('Edit working text (original stays immutable):', row.body_current)
    if(next==null) return
    try{
      const edited=editAccomplishment(row, next)
      await upsertAccomplishmentRow(edited)
      renderMemList()
    }catch(e){ $('mem_err').textContent=e.message }
  })
  wrap.querySelectorAll('[data-mem-hist]').forEach(b=>b.onclick=()=>{
    const row=MEM_ROWS.find(x=>x.id===b.dataset.memHist); if(!row) return
    const lines=[`Original: ${row.body_original}`, `Current: ${row.body_current}`, ...(row.revisions||[]).map(r=>`${r.at} [${r.source}] ${r.body}`)]
    alert(lines.join('\n\n'))
  })
  wrap.querySelectorAll('[data-mem-arch]').forEach(b=>b.onclick=async()=>{
    const row=MEM_ROWS.find(x=>x.id===b.dataset.memArch); if(!row) return
    if(!confirm('Archive this accomplishment? (soft archive — not deleted)')) return
    await upsertAccomplishmentRow(archiveAccomplishment(row))
    renderMemList()
  })
  wrap.querySelectorAll('[data-mem-polish]').forEach(b=>b.onclick=()=>memPolish(b.dataset.memPolish))
  wrap.querySelectorAll('[data-mem-promote]').forEach(b=>b.onclick=()=>memPromote(b.dataset.memPromote))
}

async function memPolish(id){
  $('mem_err').textContent=''
  const row=MEM_ROWS.find(x=>x.id===id); if(!row) return
  const b=document.querySelector(`[data-mem-polish="${id}"]`)
  const o=b?.textContent; if(b){ b.disabled=true; b.textContent='…' }
  try{
    let data=null
    try{ data=await invokeRewrite({ mode:'bullet', bullet_text:row.body_current, jd_text:'Polish wording only. Keep every number, entity, and ownership claim identical.' }) }
    catch(e){ $('mem_err').textContent=await fnMsg(e); return }
    if(data?.error){ $('mem_err').textContent=mapRewriteSoftError(data.error,data)||data.error; return }
    const cand=(data?.rewritten||'').trim().replace(/^[-•]\s*/,'')
    if(!cand){ $('mem_err').textContent='Model returned nothing'; return }
    const { row: next, drift } = setPolishCandidate(row, cand, { model: data.method||'ai' })
    await upsertAccomplishmentRow(next)
    MEM_POLISH_ID=id
    $('mem_polish').classList.remove('hidden')
    $('mem_polish_meta').textContent = drift.blocked
      ? `⚠ ${drift.reason} — Accept blocked until you edit the candidate.`
      : `Candidate via ${next.polish_model||'AI'}. Accept writes a polish_accept revision.`
    $('mem_diff').innerHTML = '<div><b>Current</b></div><div style="margin:4px 0 10px">'+esc(row.body_current)+'</div><div><b>Diff</b></div><div>'+renderMemDiff(row.body_current, cand)+'</div>'
    $('mem_accept').disabled = !!drift.blocked
  } finally { if(b){ b.disabled=false; b.textContent=o } }
}
$('mem_accept')?.addEventListener('click', async ()=>{
  const row=MEM_ROWS.find(x=>x.id===MEM_POLISH_ID); if(!row) return
  try{
    const next=acceptPolish(row)
    await upsertAccomplishmentRow(next)
    $('mem_polish').classList.add('hidden'); MEM_POLISH_ID=null
    renderMemList(); logEvent('memory_polish_accept', null, {})
  }catch(e){ $('mem_err').textContent=e.message }
})
$('mem_reject')?.addEventListener('click', async ()=>{
  const row=MEM_ROWS.find(x=>x.id===MEM_POLISH_ID); if(!row) return
  await upsertAccomplishmentRow(rejectPolish(row))
  $('mem_polish').classList.add('hidden'); MEM_POLISH_ID=null
  renderMemList()
})

async function memPromote(id){
  $('mem_err').textContent=''
  const row=MEM_ROWS.find(x=>x.id===id); if(!row) return
  if(!PROFILE?.resume_struct?.roles?.length){
    $('mem_err').textContent='Parse your resume in the builder first (or Settings), then promote into a role.'
    return
  }
  fillMemRoleSelect()
  let roleId=row.role_id || $('mem_role')?.value || ''
  if(!roleId){
    roleId=prompt('Enter resume role id to promote into (or pick in the role dropdown first and re-try):', '') || ''
  }
  if(!roleId){ $('mem_err').textContent='Pick a resume role before promoting.'; return }
  try{
    if(shouldUsePromoteRpc({ dbOk: MEM_DB_OK, userId: ME?.id, sb })){
      const data=await rpcPromoteAccomplishment(sb, {
        accomplishmentId: row.id,
        expectedRev: PROFILE.resume_struct_rev||0,
        roleId,
      })
      const applied=applyPromoteRpcResult(PROFILE, data)
      Object.assign(PROFILE, applied.profile)
      if(applied.accomplishment){
        const i=MEM_ROWS.findIndex(x=>x.id===applied.accomplishment.id)
        if(i>=0) MEM_ROWS[i]=applied.accomplishment; else MEM_ROWS.unshift(applied.accomplishment)
        saveMemLocal(MEM_ROWS)
      }
      paintReconcileBanner()
      if($('s_resume')) $('s_resume').value=PROFILE.resume_text||''
    }else{
      // Offline / localStorage fallback — pure JS promoteAccomplishment
      const result=promoteAccomplishment(PROFILE, row, { role_id: roleId })
      await persistResumeSync(result)
      await upsertAccomplishmentRow(result.accomplishment)
    }
    // Promotion does NOT update last_entry_at
    renderMemList()
    logEvent('memory_promote', null, { role_id: roleId })
    alert('Promoted with bidirectional source links. Structured resume marked for reconcile.')
  }catch(e){
    if(isResumeRevConflict(e) || e?.code===RESUME_REV_CONFLICT){
      if(PROFILE) PROFILE.resume_reconcile_needed=true
      paintReconcileBanner()
    }
    $('mem_err').textContent=e.message||String(e)
  }
}

async function openMemoryModal(){
  showAppSection('memory')
  $('mem_err').textContent=''
  await loadAccomplishments()
  fillMemRoleSelect()
  renderMemList()
}
$('mem_close')?.addEventListener('click', ()=>showAppSection('board'))
$('mem_enrich_propose')?.addEventListener('click', async ()=>{
  const url=($('mem_enrich_url')?.value||'').trim()
  const paste=($('mem_enrich_paste')?.value||'').trim()
  const preview=$('mem_enrich_preview')
  if(!preview) return
  preview.classList.remove('hidden')
  preview.innerHTML='<p class="muted" style="margin:0">Proposing inbox candidates…</p>'
  try{
    const classified=classifyEnrichUrl(url)
    if(!classified){
      preview.innerHTML='<p class="err" style="margin:0">Unsupported URL — use github.com/… or linkedin.com/in|jobs/…</p>'
      return
    }
    let meta=null
    if(classified.kind.startsWith('github')){
      meta=await fetchPublicEnrichMeta(classified)
    }
    const result=proposeEnrichCandidates({ url, pastedText: paste, fetchMeta: meta })
    if(!result.ok || !result.candidates.length){
      preview.innerHTML='<p class="err" style="margin:0">'+(result.error||'No candidates')+'</p>'
      return
    }
    ENRICH_PENDING=result.candidates
    preview.innerHTML=`<p class="muted" style="margin:0 0 8px;font-size:12px">${esc(result.doctrine)}</p>`
      + result.candidates.map((c,i)=>{
        const body=c.type==='portfolio'
          ? (c.item.summary||c.item.body_current||c.item.title)
          : (c.item.body_current||'')
        return `<div style="margin:8px 0;padding:8px;border:1px solid var(--hair);border-radius:10px">
          <div class="muted" style="font-size:11px">${esc(c.type)} · inbox</div>
          <div style="font-size:13px;white-space:pre-wrap;margin:4px 0">${esc(String(body).slice(0,500))}</div>
          <button type="button" class="btn sm primary" data-enrich-accept="${i}">Accept into inbox</button>
        </div>`
      }).join('')
    preview.querySelectorAll('[data-enrich-accept]').forEach(btn=>{
      btn.onclick=async()=>{
        const cand=ENRICH_PENDING && ENRICH_PENDING[Number(btn.dataset.enrichAccept)]
        const accepted=acceptEnrichCandidate(cand)
        if(!accepted) return
        if(accepted.type==='portfolio'){
          await upsertPortfolioRow(accepted.item)
          renderPfList()
        } else {
          await upsertAccomplishmentRow(accepted.item)
          renderMemList()
        }
        btn.textContent='Accepted ✓'
        btn.disabled=true
        logEvent('enrich_accept', null, { type: accepted.type, source: cand.item?._enrich?.source })
      }
    })
  }catch(e){
    preview.innerHTML='<p class="err" style="margin:0">'+esc(e.message||String(e))+'</p>'
  }
})
$('mem_save')?.addEventListener('click', async ()=>{
  $('mem_err').textContent=''
  try{
    const row=createAccomplishment($('mem_body').value, {
      role_id: $('mem_role').value||null,
      employer: $('mem_employer').value.trim()||null,
      project: $('mem_project').value.trim()||null,
    })
    await upsertAccomplishmentRow(row)
    // New capture only — updates cadence last_entry_at
    const next=recordNewCapture({
      bullet_memory_cadence: PROFILE?.bullet_memory_cadence,
      last_entry_at: PROFILE?.last_entry_at,
      snoozed_until: PROFILE?.snoozed_until,
      cadence_anchor: PROFILE?.cadence_anchor,
    })
    if(PROFILE){
      PROFILE.last_entry_at=next.last_entry_at
      try{ await sb.from('mt_profiles').update({ last_entry_at: PROFILE.last_entry_at }).eq('owner',ME.id) }catch(_e){}
    }
    $('mem_body').value=''; $('mem_employer').value=''; $('mem_project').value=''
    renderMemList()
    paintCadenceNudge()
    logEvent('memory_capture', null, {})
  }catch(e){ $('mem_err').textContent=e.message }
})

function renderPfList(){
  const wrap=$('pf_list'); if(!wrap) return
  const rows=(PF_ROWS||[]).filter(r=>!r.archived_at)
  if(!rows.length){ wrap.innerHTML='<p class="muted" style="font-size:13px">No portfolio items yet.</p>'; return }
  wrap.innerHTML=rows.map(r=>`<div class="card" style="padding:12px;margin:8px 0">
    <div style="font-weight:600">${esc(r.title)} <span class="muted" style="font-weight:400">· ${esc(r.item_type)} · ${esc(r.visibility)}</span></div>
    <div style="font-size:13px;margin-top:4px;line-height:1.45">${esc(r.summary||r.body_current||'')}</div>
    ${r.url?`<div class="muted" style="font-size:12px;margin-top:4px">${esc(r.url)}</div>`:''}
    <div class="row" style="margin-top:8px">
      <button type="button" class="btn sm primary" data-pf-promote="${esc(r.id)}">Promote to resume</button>
      <button type="button" class="btn sm" data-pf-vis="${esc(r.id)}">${r.visibility==='resume_ok'?'Make private':'Mark resume_ok'}</button>
      <button type="button" class="btn sm danger-ghost" data-pf-arch="${esc(r.id)}">Archive</button>
    </div>
  </div>`).join('')
  wrap.querySelectorAll('[data-pf-promote]').forEach(b=>b.onclick=async()=>{
    const item=PF_ROWS.find(x=>x.id===b.dataset.pfPromote); if(!item) return
    try{
      if(!PROFILE.resume_struct) PROFILE.resume_struct={ roles:[], projects:[], skills:[], education:[], certs:[] }
      if(shouldUsePromoteRpc({ dbOk: PF_DB_OK, userId: ME?.id, sb })){
        const data=await rpcPromotePortfolio(sb, {
          portfolioId: item.id,
          expectedRev: PROFILE.resume_struct_rev||0,
        })
        const applied=applyPromoteRpcResult(PROFILE, data)
        Object.assign(PROFILE, applied.profile)
        if(applied.portfolio){
          const i=PF_ROWS.findIndex(x=>x.id===applied.portfolio.id)
          if(i>=0) PF_ROWS[i]=applied.portfolio; else PF_ROWS.unshift(applied.portfolio)
          savePfLocal(PF_ROWS)
        }
        paintReconcileBanner()
        if($('s_resume')) $('s_resume').value=PROFILE.resume_text||''
      }else{
        // Offline / localStorage fallback — pure JS promotePortfolio
        const result=promotePortfolio(PROFILE, item)
        await persistResumeSync(result)
        await upsertPortfolioRow(result.portfolio)
      }
      renderPfList()
      alert('Portfolio promoted into Projects with source links.')
    }catch(e){
      if(isResumeRevConflict(e) || e?.code===RESUME_REV_CONFLICT){
        if(PROFILE) PROFILE.resume_reconcile_needed=true
        paintReconcileBanner()
      }
      $('pf_err').textContent=e.message||String(e)
    }
  })
  wrap.querySelectorAll('[data-pf-vis]').forEach(b=>b.onclick=async()=>{
    const item=PF_ROWS.find(x=>x.id===b.dataset.pfVis); if(!item) return
    const next=editPortfolioItem(item, { visibility: item.visibility==='resume_ok'?'private':'resume_ok' })
    await upsertPortfolioRow(next); renderPfList()
  })
  wrap.querySelectorAll('[data-pf-arch]').forEach(b=>b.onclick=async()=>{
    const item=PF_ROWS.find(x=>x.id===b.dataset.pfArch); if(!item) return
    await upsertPortfolioRow(archivePortfolioItem(item)); renderPfList()
  })
}
async function openPortfolioModal(){
  showAppSection('portfolio')
  $('pf_err').textContent=''
  await loadPortfolioRows()
  renderPfList()
}
$('pf_close')?.addEventListener('click', ()=>showAppSection('board'))
$('pf_save')?.addEventListener('click', async ()=>{
  $('pf_err').textContent=''
  try{
    const item=createPortfolioItem({
      title: $('pf_title').value,
      item_type: $('pf_type').value,
      visibility: $('pf_vis').value,
      url: $('pf_url').value.trim()||null,
      summary: $('pf_summary').value,
      tags: list($('pf_tags').value),
    })
    await upsertPortfolioRow(item)
    $('pf_title').value=''; $('pf_url').value=''; $('pf_summary').value=''; $('pf_tags').value=''
    renderPfList()
  }catch(e){ $('pf_err').textContent=e.message }
})

let ADVISOR_BRIEF=null, ADVISOR_REPORT_ID=null

function paintAdvisorBrief(brief){
  const el=$('advisor_out'); if(!el) return
  ADVISOR_BRIEF=brief
  const sk=(brief.suggested_next_skills||[]).map(s=>`<li>${esc(s.text||s)} <span class="chip">model judgment</span></li>`).join('')
  const gaps=(brief.demand_gaps||[]).map(g=>`<li>${esc(typeof g==='string'?g:g.text||JSON.stringify(g))}</li>`).join('')
  const moves=(brief.resume_portfolio_moves||[]).map(m=>`<li>${esc(typeof m==='string'?m:m.text||JSON.stringify(m))}</li>`).join('')
  const plan=(brief.acquisition_plan||[]).map(m=>`<li>${esc(typeof m==='string'?m:m.text||JSON.stringify(m))}</li>`).join('')
  const fus=(brief.follow_ups||[]).map(f=>{
    const steps=(f.suggested_next_steps||[]).map(s=>`<li>${esc(s.text||s)} <span class="chip">model judgment</span></li>`).join('')
    const warn=f.claim_check && f.claim_check.ok===false
      ? `<p class="err" style="font-size:12px">Some observed claims were not found in materials — treat as unverified draft.</p>`
      : ''
    return `<div class="eval-box" style="margin-top:8px">
      <h4 style="font-size:13px">Q: ${esc(f.question||'')}</h4>
      <p style="font-size:12.5px;margin:4px 0"><b>Observed in your materials</b></p>
      <p style="white-space:pre-wrap;margin:0 0 6px">${esc(f.observed_in_materials||'')}</p>
      ${warn}
      <p style="font-size:12.5px;margin:4px 0"><b>Suggested next steps</b> <span class="chip">model judgment</span></p>
      <ul>${steps||'<li class="muted">None</li>'}</ul>
      ${f.market_notes?.text?`<p class="muted" style="font-size:12px"><span class="chip">model judgment</span> ${esc(f.market_notes.text)}</p>`:''}
      <p class="muted" style="font-size:11px;margin:4px 0 0">Draft wording only — polish/Accept before it becomes materials.</p>
    </div>`
  }).join('')
  el.innerHTML=`
    ${brief.free_tier?'<p class="muted" style="font-size:12px">Shorter free-tier brief.</p>':''}
    <div class="eval-box"><h4>Market read <span class="chip">model judgment</span></h4><p>${esc(brief.market_read?.text||'')}</p></div>
    <div class="eval-box"><h4>Observed in your materials / fit</h4><p>${esc(typeof brief.fit==='string'?brief.fit:JSON.stringify(brief.observed_in_materials||brief.fit||''))}</p></div>
    <div class="eval-box"><h4>Demand gaps</h4><ul>${gaps||'<li class="muted">None listed</li>'}</ul></div>
    <div class="eval-box"><h4>Suggested next skills <span class="chip">not your experience</span></h4><ul>${sk||'<li class="muted">None</li>'}</ul></div>
    <div class="eval-box"><h4>Acquisition plan</h4><ul>${plan||'<li class="muted">None</li>'}</ul></div>
    <div class="eval-box"><h4>Resume / portfolio moves</h4><ul>${moves||'<li class="muted">None</li>'}</ul>
      <div class="row" style="margin-top:8px">
        <button type="button" class="btn sm" id="advisor_to_mem">Open Memory</button>
        <button type="button" class="btn sm" id="advisor_to_pf">Open Portfolio</button>
      </div>
    </div>
    <div class="eval-box" id="advisor_followup_box" style="margin-top:12px">
      <h4>Grounded follow-up</h4>
      <p class="muted" style="font-size:12px;margin:0 0 8px">Same materials + ranked memory as the brief. Observed facts stay separate from suggested next steps. Never invents experience.</p>
      <div id="advisor_fu_log">${fus||'<p class="muted" style="font-size:12px;margin:0 0 8px">No follow-ups yet.</p>'}</div>
      <textarea id="advisor_fu_in" style="min-height:52px;width:100%" placeholder="Ask a follow-up grounded in this brief…"></textarea>
      <div class="row" style="margin-top:8px;align-items:center">
        <button type="button" class="primary btn sm" id="advisor_fu_send">Ask follow-up</button>
        <span class="err" id="advisor_fu_err" style="flex:1"></span>
      </div>
    </div>
    ${brief.raw_text?`<details style="margin-top:10px"><summary>Raw</summary><pre style="white-space:pre-wrap;font-size:12px">${esc(brief.raw_text)}</pre></details>`:''}`
  $('advisor_to_mem')?.addEventListener('click', ()=>{ openMemoryModal() })
  $('advisor_to_pf')?.addEventListener('click', ()=>{ openPortfolioModal() })
  $('advisor_fu_send')?.addEventListener('click', ()=>sendAdvisorFollowUp())
  $('advisor_fu_in')?.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendAdvisorFollowUp() } })
}

async function persistAdvisorBrief(brief){
  const row=advisorReportRow(brief, null)
  row.owner=ME?.id||null
  if(ADVISOR_REPORT_ID){
    try{
      const { error }=await sb.from('mt_reports').update({ rewritten:row.rewritten, missing_keywords:row.missing_keywords }).eq('id', ADVISOR_REPORT_ID)
      if(!error) return
    }catch(_e){}
  }
  try{
    const { data }=await sb.from('mt_reports').insert(row).select('id').single()
    if(data?.id) ADVISOR_REPORT_ID=data.id
  }catch(_e){
    try{ await sb.from('mt_reports').insert(row) }catch(_e2){}
  }
}

async function loadLatestAdvisorBrief(){
  try{
    let q=sb.from('mt_reports').select('id,rewritten,created_at').eq('kind','advisor').order('created_at',{ascending:false}).limit(1)
    if(ME?.id) q=q.eq('owner', ME.id)
    const { data }=await q
    const row=(data||[])[0]
    if(!row?.rewritten) return null
    ADVISOR_REPORT_ID=row.id
    return normalizeAdvisorBrief(typeof row.rewritten==='string'?JSON.parse(row.rewritten):row.rewritten)
  }catch(_e){ return null }
}

async function sendAdvisorFollowUp(){
  const q=($('advisor_fu_in')?.value||'').trim(); if(!q||!ADVISOR_BRIEF) return
  const errEl=$('advisor_fu_err'); if(errEl) errEl.textContent=''
  const b=$('advisor_fu_send'), o=b?.textContent; if(b){ b.disabled=true; b.textContent='…' }
  try{
    await loadAccomplishments(); await loadPortfolioRows()
    const ctx=buildAdvisorContext({ accomplishments:MEM_ROWS, portfolio:PF_ROWS, profile:PROFILE||{},
      checkedIds: MEM_ROWS.filter(x=>x.checked).map(x=>x.id),
      jd: (PROFILE?.target_titles||[]).join(' '),
      gaps: PROFILE?.keywords||[],
    })
    const byo=anyByoKeyOnFile(PROFILE, loadOpenaiPrefs().key)
    const userMsg=buildAdvisorFollowUpUserMessage({
      question:q, brief:ADVISOR_BRIEF, observedMaterials:ctx.observed_materials, freeTier:!byo,
    })
    let text=''
    if(preferClientOpenai()||providerSecretOnFile(PROFILE,'ai_key')||providerSecretOnFile(PROFILE,'kimi_key')){
      try{
        const out=await openaiChat({ system:advisorFollowUpSystemPrompt(), messages:[{role:'user',content:userMsg}], max_tokens:byo?1200:600, json:true })
        text=out.text
      }catch(_e){
        const data=await invokeChat([{role:'user',content:advisorFollowUpSystemPrompt()+'\n\n'+userMsg}])
        if(data.error) throw new Error(mapRewriteSoftError(data.error,data)||data.error)
        text=data.reply||''
      }
    }else{
      const data=await invokeChat([{role:'user',content:advisorFollowUpSystemPrompt()+'\n\n'+userMsg}])
      if(data.error){ if(errEl) errEl.textContent=mapRewriteSoftError(data.error,data)||data.error; return }
      text=data.reply||''
    }
    if(!text.trim()){ if(errEl) errEl.textContent='Model returned nothing — try again.'; return }
    const exchange=normalizeAdvisorFollowUp(text, {
      question:q, free_tier:!byo,
      model: preferClientOpenai()?'openai-compat':(providerSecretOnFile(PROFILE,'ai_key')?'claude':'free'),
      corpus: materialsCorpusFromContext(ctx),
    })
    ADVISOR_BRIEF=appendAdvisorFollowUp(ADVISOR_BRIEF, exchange)
    if($('advisor_fu_in')) $('advisor_fu_in').value=''
    paintAdvisorBrief(ADVISOR_BRIEF)
    await persistAdvisorBrief(ADVISOR_BRIEF)
    logEvent('advisor_followup', null, { free_tier:!byo })
  }catch(e){ if(errEl) errEl.textContent=e.message||String(e) }
  finally{ if(b){ b.disabled=false; b.textContent=o||'Ask follow-up' } }
}

async function openAdvisorModal(){
  showAppSection('advise')
  $('advisor_err').textContent=''
  const byo=anyByoKeyOnFile(PROFILE, loadOpenaiPrefs().key)
  $('advisor_free_banner')?.classList.toggle('hidden', byo)
  if(!ADVISOR_BRIEF){
    const prev=await loadLatestAdvisorBrief()
    if(prev) paintAdvisorBrief(prev)
  }else{
    paintAdvisorBrief(ADVISOR_BRIEF)
  }
}
$('advisor_close')?.addEventListener('click', ()=>showAppSection('board'))
$('advisor_run')?.addEventListener('click', async ()=>{
  $('advisor_err').textContent=''
  const b=$('advisor_run'), o=b.textContent; b.disabled=true; b.textContent='Advising…'
  try{
    await loadAccomplishments(); await loadPortfolioRows()
    const ctx=buildAdvisorContext({ accomplishments:MEM_ROWS, portfolio:PF_ROWS, profile:PROFILE||{},
      checkedIds: MEM_ROWS.filter(x=>x.checked).map(x=>x.id),
      jd: (PROFILE?.target_titles||[]).join(' '),
      gaps: PROFILE?.keywords||[],
    })
    const byo=anyByoKeyOnFile(PROFILE, loadOpenaiPrefs().key)
    const userMsg=`Build a CareerOps advisor brief as JSON with keys: market_read, fit, demand_gaps, acquisition_plan, resume_portfolio_moves, suggested_next_skills, observed_in_materials.
Materials (truth):\n${JSON.stringify(ctx.observed_materials).slice(0, byo?12000:5000)}`
    let text=''
    if(preferClientOpenai()||providerSecretOnFile(PROFILE,'ai_key')||providerSecretOnFile(PROFILE,'kimi_key')){
      try{
        const out=await openaiChat({ system:advisorSystemPrompt(), messages:[{role:'user',content:userMsg}], max_tokens:byo?2500:900, json:true })
        text=out.text
      }catch(_e){
        const data=await invokeChat([{role:'user',content:advisorSystemPrompt()+'\n\n'+userMsg}])
        if(data.error) throw new Error(mapRewriteSoftError(data.error,data)||data.error)
        text=data.reply||''
      }
    }else{
      const data=await invokeChat([{role:'user',content:advisorSystemPrompt()+'\n\n'+userMsg}])
      if(data.error){ $('advisor_err').textContent=mapRewriteSoftError(data.error,data)||data.error; return }
      text=data.reply||''
    }
    const brief=normalizeAdvisorBrief(text, { free_tier:!byo, model: preferClientOpenai()?'openai-compat':(providerSecretOnFile(PROFILE,'ai_key')?'claude':'free') })
    ADVISOR_REPORT_ID=null
    paintAdvisorBrief(brief)
    await persistAdvisorBrief(brief)
    logEvent('advisor_brief', null, { free_tier:!byo })
  }catch(e){ $('advisor_err').textContent=e.message||String(e) }
  finally{ b.disabled=false; b.textContent=o }
})

function paintCadenceNudge(){
  const el=$('cadence_nudge'); if(!el) return
  const state={
    bullet_memory_cadence: PROFILE?.bullet_memory_cadence||'off',
    cadence_anchor: PROFILE?.cadence_anchor||'1,15',
    cadence_timezone: PROFILE?.cadence_timezone||'UTC',
    last_entry_at: PROFILE?.last_entry_at||null,
    snoozed_until: PROFILE?.snoozed_until||null,
  }
  const n=shouldNudge(state)
  el.classList.toggle('hidden', !n.due)
  if(n.due && PROFILE){
    const prompted=recordPrompted(state)
    PROFILE.last_prompted_at=prompted.last_prompted_at
    sb.from('mt_profiles').update({ last_prompted_at: PROFILE.last_prompted_at }).eq('owner',ME.id).then(()=>{},()=>{})
  }
}
$('cadence_open')?.addEventListener('click', ()=>{ $('cadence_nudge').classList.add('hidden'); openMemoryModal() })
$('cadence_dismiss')?.addEventListener('click', ()=>$('cadence_nudge').classList.add('hidden'))
$('cadence_snooze')?.addEventListener('click', async ()=>{
  const until=new Date(); until.setDate(until.getDate()+7)
  if(PROFILE){
    PROFILE.snoozed_until=until.toISOString()
    try{ await sb.from('mt_profiles').update({ snoozed_until: PROFILE.snoozed_until }).eq('owner',ME.id) }catch(_e){}
  }
  $('cadence_nudge').classList.add('hidden')
})
$('reconcile_ack')?.addEventListener('click', async ()=>{
  if(!PROFILE) return
  PROFILE.resume_reconcile_needed=false
  try{ await sb.from('mt_profiles').update({ resume_reconcile_needed:false }).eq('owner',ME.id) }catch(_e){}
  paintReconcileBanner()
})

/** Ranked memory lines for Generate materials (not newest-20). */
function rankedMemoryMaterials(jd, gaps){
  const checkedIds=MEM_ROWS.filter(x=>x.checked).map(x=>x.id)
  const roleIds=(PROFILE?.resume_struct?.roles||[]).map(r=>r.id||stableRoleKey(r))
  return rankForGenerate(MEM_ROWS, { jd, gaps, checkedIds, relevantRoleIds:roleIds, cap:20 })
}

}

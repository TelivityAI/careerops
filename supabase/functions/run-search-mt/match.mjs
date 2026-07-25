/**
 * Shared Find matching — used by run-search-mt and Node regression tests.
 * Sterile: no user PII, no vault paths.
 */

/** Roles that almost never belong unless the user explicitly searched for them. */
export const BAN_RE =
  /(software engineer|staff engineer|senior engineer|\b swe\b|frontend|backend|full[\s-]?stack|devops|sre\b|data scien|machine learning|ml engineer|applied ai architect|ai architect|account executive|\bae\b[, ]|enterprise security|security sales|administrative business partner|channel partner|alliance rvp|finance business partner|hr business|hr operations|recruit(er|ing)|talent acquisition|people ops|payroll|accountant|controller\b|counsel\b|\blegal\b|paralegal|nurse|clinical|physician|housekeep|front desk|line cook|\bserver\b|bartender|maintenance tech|security guard|warehouse associate|driver\b|cashier)/i

/** Domain tokens for travel / distribution lane searches. */
export const DOMAIN_RE =
  /\b(travel|airline|aviation|hospitality|hotel|lodging|ota|gds|ndc|tmc|tourism|cruise|rail|metasearch|destination|dmo)\b|\bair\b/i

const FALLBACK_TITLE_RE =
  /(director|vp\b|vice president|head of|principal|partner|commercial|partnership|business develop|go[\s-]?to[\s-]?market|alliances|channel)/i

export function listTerms(v) {
  return (Array.isArray(v) ? v : [])
    .map((x) => String(x || '').trim())
    .filter((s) => s.length >= 2)
}

export function hitCount(title, terms) {
  const t = title.toLowerCase()
  let n = 0
  for (const term of terms) {
    if (t.includes(term.toLowerCase())) n++
  }
  return n
}

export function prefsWantDomain(titles, keywords) {
  return [...titles, ...keywords].some((t) => DOMAIN_RE.test(t))
}

export function significantTokens(terms) {
  const out = []
  for (const term of terms) {
    for (const w of String(term)
      .toLowerCase()
      .split(/[^a-z0-9]+/)) {
      if (w.length >= 4 && !/^(with|from|that|this|have|your|into|over|senior|director)$/.test(w)) {
        out.push(w)
      }
    }
  }
  return [...new Set(out)]
}

/**
 * Why a role fails the user's Find lane (client soft-hide + bulk close).
 * Returns null when the role is in-lane (or prefs are empty).
 */
export function roleOffLaneReason(role, prof) {
  const title = String(role?.title || '')
  const company = String(role?.company || '')
  const blob = `${title} ${company}`
  if (!title.trim()) return 'empty_title'
  if (BAN_RE.test(title)) return 'banned_title'

  const titles = listTerms(prof?.target_titles)
  const keywords = listTerms(prof?.keywords)
  const seniority = listTerms(prof?.seniority)
  if (!titles.length && !keywords.length && !seniority.length) return null

  const hay = title.toLowerCase()
  if (titles.length && hitCount(title, titles) === 0) {
    // Allow token overlap for multi-word title prefs (e.g. "travel partnerships" → partnerships)
    const toks = significantTokens(titles)
    if (!toks.some((w) => hay.includes(w))) return 'title_miss'
  }
  if (keywords.length && hitCount(title, keywords) === 0) {
    const toks = significantTokens(keywords)
    if (!toks.some((w) => hay.includes(w))) {
      if (!(prefsWantDomain(titles, keywords) && DOMAIN_RE.test(blob))) return 'keyword_miss'
    }
  }
  if (seniority.length && hitCount(title, seniority) === 0) return 'seniority_miss'

  if (prefsWantDomain(titles, keywords) && !DOMAIN_RE.test(blob)) {
    const strong = titles.some((t) => t.length >= 10 && hay.includes(t.toLowerCase()))
    if (!strong) return 'domain_miss'
  }
  return null
}

/**
 * Strict Find filter → score (0 = reject).
 * scoreOf(title, loc, company?)
 */
export function buildScorer(prof, prefs = {}) {
  const titles = listTerms(prof?.target_titles)
  const keywords = listTerms(prof?.keywords)
  const seniority = listTerms(prof?.seniority)
  const locations = listTerms(prof?.locations)
  const userAskedBan = [...titles, ...keywords].some((t) => BAN_RE.test(t))
  const wantDomain = prefsWantDomain(titles, keywords)

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const locRe = locations.length ? new RegExp(locations.map(escapeRe).join('|'), 'i') : null
  const wantRemote =
    locations.some((l) => /remote/i.test(l)) ||
    prefs.remote_pref === 'remote_only' ||
    prefs.remote_pref === 'prefer_remote'
  const remoteOnly = prefs.remote_pref === 'remote_only'

  return (title, loc, company = '') => {
    if (!title || !title.trim()) return 0
    if (!userAskedBan && BAN_RE.test(title)) return 0

    const hay = title.toLowerCase()
    const titleHits = titles.length ? hitCount(title, titles) : 0
    const kwHits = keywords.length ? hitCount(title, keywords) : 0
    const senHits = seniority.length ? hitCount(title, seniority) : 0
    const titleTok = titles.length ? significantTokens(titles).some((w) => hay.includes(w)) : false
    const kwTok = keywords.length ? significantTokens(keywords).some((w) => hay.includes(w)) : false

    if (titles.length && titleHits === 0 && !titleTok) return 0
    if (keywords.length && kwHits === 0 && !kwTok) {
      // Domain hit in title/company can satisfy travel-lane keywords (e.g. "Air Partner")
      if (!(wantDomain && DOMAIN_RE.test(`${title} ${company || ''}`))) return 0
    }
    if (seniority.length && senHits === 0) return 0

    if (!titles.length && !keywords.length && !seniority.length) {
      if (!FALLBACK_TITLE_RE.test(title)) return 0
    }

    const blob = `${title} ${company || ''}`
    if (wantDomain && !DOMAIN_RE.test(blob)) {
      const strong = titles.some((t) => t.length >= 10 && hay.includes(t.toLowerCase()))
      if (!strong) return 0
    }

    const locStr = loc || ''
    const looksRemote =
      /remote|anywhere|distributed|work from home|wfh/i.test(locStr) || /remote/i.test(title)
    const looksOnsite = /\bon[\s-]?site\b|\bin[\s-]?office\b/i.test(locStr) && !looksRemote
    if (remoteOnly && looksOnsite) return 0
    if (locRe && locStr.trim()) {
      const okLoc = locRe.test(locStr) || (wantRemote && looksRemote)
      if (!okLoc && !looksRemote) return 0
    }

    const tScore = titleHits * 5 + (titleTok && !titleHits ? 2 : 0)
    const kScore = kwHits * 3 + (kwTok && !kwHits ? 2 : 0)
    return tScore + kScore + senHits * 2 + (looksRemote && wantRemote ? 1 : 0) + 1
  }
}

/** Match stamp for notes / UI (sterile). */
export function matchStamp(title, prof) {
  const titles = listTerms(prof?.target_titles)
  const keywords = listTerms(prof?.keywords)
  const hits = []
  for (const t of titles) {
    if (title.toLowerCase().includes(t.toLowerCase())) hits.push('title:' + t)
  }
  for (const t of keywords) {
    if (title.toLowerCase().includes(t.toLowerCase())) hits.push('kw:' + t)
  }
  if (!hits.length) {
    const toks = significantTokens([...titles, ...keywords]).filter((w) =>
      title.toLowerCase().includes(w),
    )
    for (const w of toks.slice(0, 3)) hits.push('token:' + w)
  }
  return hits.slice(0, 4).join(' · ') || 'score>0'
}

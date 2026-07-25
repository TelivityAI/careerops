#!/usr/bin/env node
/**
 * Regression: Find lane matching (travel prefs fixture).
 * Expects 10 lane-true titles in, and known off-lane junk out.
 */
import assert from 'node:assert/strict'
import { buildScorer, roleOffLaneReason } from '../supabase/functions/run-search-mt/match.mjs'

const travelProf = {
  target_titles: [
    'Director',
    'Vp',
    'Senior Director',
    'Director Travel Partnerships',
    'Senior Director, Strategic Partnerships',
    'Director Business Development (Air/Travel)',
    'Partner Development (Airline/OTA)',
  ],
  keywords: [
    'travel partnerships',
    'travel distribution',
    'airline',
    'travel',
    'NDC',
    'GDS',
    'OTA',
    'TMC',
    'airline partnerships',
  ],
  seniority: [],
  locations: ['remote', 'chicago', 'US'],
}

const scoreOf = buildScorer(travelProf, { remote_pref: 'any' })

const LANE_TRUE = [
  { co: 'Duffel', title: 'Airline Partnerships Executive' },
  { co: 'Engine', title: 'Senior Director, Strategic Travel Partnerships' },
  { co: 'Internova', title: 'Director, Business Development - Air Partner Relations' },
  { co: 'Marriott', title: 'Director, Travel Distribution - Connectivity Operations' },
  { co: 'Sabre', title: 'Principal Business Development Manager - Lodging & Travel' },
  { co: 'Getyourguide', title: 'Partnerships Lead - DMO Travel' },
  { co: 'Expedia', title: 'Director Travel Partnerships' },
  { co: 'Booking', title: 'Director, Airline Partnerships' },
  { co: 'Amadeus', title: 'Senior Director, GDS Distribution' },
  { co: 'Hopper', title: 'Director, Travel Distribution & NDC' },
]

const OFF_LANE = [
  { co: 'Anthropic', title: 'Applied AI Architect, Commercial' },
  { co: 'Anthropic', title: 'Applied AI Architect, Partnerships' },
  { co: 'Asana', title: 'Administrative Business Partner' },
  { co: 'Brex', title: 'Accounting Channel Partner Manager' },
  { co: 'Databricks', title: 'Alliance RVP, McKinsey' },
  { co: 'Datadog', title: 'Area Vice President, Enterprise Security Sales' },
  { co: 'Stripe', title: 'Account Executive, Commercial Grower' },
  { co: 'Cursor', title: 'Account Executive, Commercial Expansion - San Francisco' },
  { co: 'Notion', title: 'Account Executive, Commercial' },
  { co: 'Agoda', title: 'Associate Director, Global HR Operations (Bangkok Based)' },
]

let failed = 0

for (const r of LANE_TRUE) {
  const s = scoreOf(r.title, 'Remote', r.co)
  const off = roleOffLaneReason(r, travelProf)
  const ok = s > 0 && !off
  console.log(ok ? 'ok   lane' : 'FAIL lane', r.co, '—', r.title, `score=${s}`, off || '')
  if (!ok) failed++
}

for (const r of OFF_LANE) {
  const s = scoreOf(r.title, 'San Francisco', r.co)
  const off = roleOffLaneReason(r, travelProf)
  const ok = s === 0 || !!off
  console.log(ok ? 'ok   junk' : 'FAIL junk', r.co, '—', r.title, `score=${s}`, off || 'NOT flagged')
  if (!ok) failed++
}

assert.equal(LANE_TRUE.length, 10, 'fixture must stay at 10 lane-true samples')
if (failed) {
  console.error(`\ntest-find-match: ${failed} failure(s)`)
  process.exit(1)
}
console.log('\nok  find-match fixture (10 lane-true, off-lane rejected)')

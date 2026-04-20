#!/usr/bin/env node
/**
 * SwineSense — reprocess legacy alerts through the Pipedream → Claude pipeline.
 *
 * Why this exists:
 *   The Supabase DB webhook on `alerts` is INSERT-only (STATUS.md §2.3).
 *   Flipping `ai_processed` back to false via SQL will NOT retrigger it.
 *   This script resets the AI fields and POSTs a synthetic DB-webhook payload
 *   directly to Pipedream, which is a reliable and config-free approach.
 *
 * Usage:
 *   node scripts/reprocess-legacy-alerts.mjs             # live dispatch
 *   node scripts/reprocess-legacy-alerts.mjs --dry-run   # list only, no writes
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PIPEDREAM_ALERT_WEBHOOK_URL
 *   SWINESENSE_ORG_ID                (optional; defaults to the prod org id)
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const pipedreamUrl = process.env.PIPEDREAM_ALERT_WEBHOOK_URL
const orgId =
  process.env.SWINESENSE_ORG_ID ?? 'af3e2255-a6e0-44d4-8077-b066dd5215c7'

if (!url || !key || !pipedreamUrl) {
  console.error(
    'Missing env vars.\n' +
      'Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PIPEDREAM_ALERT_WEBHOOK_URL'
  )
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const THROTTLE_MS = 2000 // 2 s between calls — safe for default Anthropic tier

const sb = createClient(url, key, { auth: { persistSession: false } })

async function listCandidates() {
  const { data: sites, error: siteErr } = await sb
    .from('sites')
    .select('id, name')
    .eq('organization_id', orgId)
  if (siteErr) throw siteErr

  const siteIds = (sites ?? []).map((s) => s.id)
  if (!siteIds.length) throw new Error(`No sites found for organization ${orgId}`)

  const { data: alerts, error } = await sb
    .from('alerts')
    .select('*')
    .in('site_id', siteIds)
    .in('severity', ['High', 'Critical'])
    .eq('ai_processed', false)
    .order('timestamp', { ascending: true })

  if (error) throw error
  return alerts ?? []
}

async function resetAndDispatch(alert) {
  // 1) Reset AI fields
  const { data: fresh, error: resetErr } = await sb
    .from('alerts')
    .update({
      ai_ready: true,
      ai_processed: false,
      ai_response_status: 'pending',
      ai_insight: null,
      likely_cause: null,
      recommended_action: null,
      short_message: null,
      priority_level: null,
      requires_vet_escalation: null,
      ai_timestamp: null,
      ai_triggered_at: new Date().toISOString(),
      ai_model: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', alert.id)
    .select('*')
    .single()

  if (resetErr || !fresh) throw resetErr ?? new Error('Reset failed')

  // 2) Dispatch DB-webhook-shaped payload to Pipedream
  const payload = {
    type: 'INSERT',
    table: 'alerts',
    schema: 'public',
    record: fresh,
    old_record: null,
  }
  const res = await fetch(pipedreamUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Pipedream ${res.status} ${res.statusText}`)
}

async function main() {
  const candidates = await listCandidates()

  console.log(
    '\nSwineSense — legacy alert reprocessor\n' +
      `  org:         ${orgId}\n` +
      `  candidates:  ${candidates.length} (High/Critical, ai_processed=false)\n` +
      `  throttle:    ${THROTTLE_MS} ms between dispatches\n` +
      `  mode:        ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}\n`
  )

  for (const a of candidates) {
    console.log(
      `  · ${a.id}  ${String(a.alert_type).padEnd(22)}  sev=${a.severity}  ` +
        `site=${a.site_id}  ts=${a.timestamp}`
    )
  }
  console.log('')

  if (DRY_RUN) {
    console.log('Dry run complete. Re-run without --dry-run to actually dispatch.')
    return
  }

  if (candidates.length === 0) {
    console.log('Nothing to do.')
    return
  }

  let ok = 0
  let fail = 0
  for (let i = 0; i < candidates.length; i++) {
    const alert = candidates[i]
    try {
      await resetAndDispatch(alert)
      console.log(`  ✓  ${alert.id}  dispatched`)
      ok++
    } catch (e) {
      console.error(`  ✗  ${alert.id}  ${e.message}`)
      fail++
    }
    if (i < candidates.length - 1) {
      await new Promise((r) => setTimeout(r, THROTTLE_MS))
    }
  }

  const cost = (ok * 0.009).toFixed(3)
  console.log(
    '\nDone.\n' +
      `  dispatched:  ${ok}\n` +
      `  failed:      ${fail}\n` +
      `  est. cost:   USD $${cost} (Sonnet 4.5, ~1500 in + 300 out tokens per call)\n` +
      '\nVerify in ~30 s:\n' +
      '  SELECT id, ai_processed, ai_response_status, ai_timestamp\n' +
      '  FROM alerts WHERE ai_processed = true ORDER BY ai_timestamp DESC LIMIT 10;\n'
  )
}

main().catch((e) => {
  console.error('\nFatal:', e.message)
  process.exit(1)
})

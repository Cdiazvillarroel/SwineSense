'use server'

/**
 * SwineSense — alert mutation Server Actions
 *
 * Wires the four action buttons on `/alerts/[id]` and exposes `reRunAiAnalysis`
 * which re-fires the Pipedream → Claude pipeline for an existing alert.
 *
 * Note on re-run strategy: the Supabase database webhook on the `alerts` table
 * is INSERT-only (per STATUS.md §2.3). An UPDATE does not retrigger it, so
 * `reRunAiAnalysis` resets the AI fields and POSTs a synthetic DB-webhook
 * payload directly to Pipedream. The existing workflow (filter_alert →
 * fetch_context → claude_analyze → writeback_to_app → send_telegram) does
 * the rest unchanged.
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ────────────────────────────── schemas ──────────────────────────────

const AlertStatusSchema = z.enum(['Open', 'In Progress', 'Closed', 'Snoozed'])
const UuidSchema = z.string().uuid()

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

// ────────────────────────── Supabase clients ─────────────────────────

/**
 * Build a Supabase client that carries the user's auth cookie.
 *
 * Awaiting `cookies()` is compatible with both Next.js 14 (where it returns
 * the store synchronously) and Next.js 15 (where it returns a Promise).
 * This lets the app upgrade Next major versions without touching this code.
 */
async function getUserScopedClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // no-ops: Server Actions don't need to write cookies here
        set() {},
        remove() {},
      },
    }
  )
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function requireUser() {
  const sb = await getUserScopedClient()
  const {
    data: { user },
    error,
  } = await sb.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { user, sb }
}

function revalidateAlertViews(alertId: string) {
  revalidatePath(`/alerts/${alertId}`)
  revalidatePath('/alerts')
  revalidatePath('/overview')
}

// ────────────────────────────── actions ──────────────────────────────

/**
 * Update the status field of an alert.
 * Used by: "Mark in progress" and "Close alert" buttons.
 */
export async function updateAlertStatus(
  alertIdRaw: string,
  statusRaw: string
): Promise<ActionResult> {
  try {
    const alertId = UuidSchema.parse(alertIdRaw)
    const status = AlertStatusSchema.parse(statusRaw)
    const { sb } = await requireUser()

    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'Closed') {
      patch.closed_timestamp = new Date().toISOString()
    }

    const { error } = await sb.from('alerts').update(patch).eq('id', alertId)
    if (error) return { ok: false, error: error.message }

    revalidateAlertViews(alertId)
    return { ok: true, message: `Status set to ${status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
  }
}

/**
 * Assign (or unassign) an alert.
 * Pass `null` to clear the assignee; pass the current user's id for "Assign to me".
 */
export async function assignAlert(
  alertIdRaw: string,
  assigneeIdRaw: string | null
): Promise<ActionResult> {
  try {
    const alertId = UuidSchema.parse(alertIdRaw)
    const assignee =
      assigneeIdRaw === null ? null : UuidSchema.parse(assigneeIdRaw)
    const { sb } = await requireUser()

    const { error } = await sb
      .from('alerts')
      .update({
        assigned_to: assignee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)

    if (error) return { ok: false, error: error.message }
    revalidateAlertViews(alertId)
    return { ok: true, message: assignee ? 'Assigned' : 'Unassigned' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
  }
}

/**
 * Re-run the Claude AI analysis on an existing alert.
 *
 * Steps:
 *   1. Authenticate the caller.
 *   2. Reset the AI-filled columns on the row (service role, bypasses RLS).
 *   3. POST a Supabase-DB-webhook-shaped payload to Pipedream.
 *   4. The existing Pipedream workflow writes the new analysis back.
 *
 * Latency: 6–10 s end-to-end before the page shows the new analysis.
 * Cost: ~USD $0.009 per call.
 */
export async function reRunAiAnalysis(alertIdRaw: string): Promise<ActionResult> {
  try {
    const alertId = UuidSchema.parse(alertIdRaw)
    await requireUser()

    const pipedreamUrl = process.env.PIPEDREAM_ALERT_WEBHOOK_URL
    if (!pipedreamUrl) {
      return {
        ok: false,
        error: 'PIPEDREAM_ALERT_WEBHOOK_URL env var is not set',
      }
    }

    const admin = getServiceClient()

    // 1) Reset AI fields and capture the fresh row
    const { data: fresh, error: resetErr } = await admin
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
      .eq('id', alertId)
      .select('*')
      .single()

    if (resetErr || !fresh) {
      return { ok: false, error: resetErr?.message ?? 'Alert not found' }
    }

    // 2) Dispatch to Pipedream with the DB-webhook payload shape
    const res = await fetch(pipedreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INSERT',
        table: 'alerts',
        schema: 'public',
        record: fresh,
        old_record: null,
      }),
      // Don't hang the UI if Pipedream is slow to ack
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return {
        ok: false,
        error: `Pipedream returned ${res.status} ${res.statusText}`,
      }
    }

    revalidateAlertViews(alertId)
    return {
      ok: true,
      message: 'Re-processing triggered. New analysis will appear in 6–10 s.',
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
  }
}

/**
 * Helper for the alert detail Server Component so it can pass the current
 * user's id down to <AlertActions /> for the "Assign to me" button.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const sb = await getUserScopedClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  return user?.id ?? null
}

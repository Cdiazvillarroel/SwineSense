import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PipedreamCallbackSchema } from '@/lib/claude/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/pipedream-callback
 *
 * Called by the Pipedream `alert-ai-processor` workflow after Claude
 * has returned a validated response. This handler:
 *
 *   1. Verifies the shared secret (defense against public URL abuse).
 *   2. Re-validates the payload shape with Zod (never trust upstream).
 *   3. Writes the AI fields to the alerts row using the service-role client.
 *   4. Appends an audit row in ai_processing_log.
 *
 * Why not have Pipedream write directly to Supabase? Two reasons:
 *   - Single writeback path: any schema change happens here, not in N workflows.
 *   - Validation: Supabase will accept any text; we want strict typing
 *     enforced by Zod before the DB sees it.
 */
export async function POST(request: NextRequest) {
  // --- Shared secret auth ---
  const providedSecret = request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.PIPEDREAM_WEBHOOK_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing PIPEDREAM_WEBHOOK_SECRET' },
      { status: 500 },
    );
  }
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Body parsing + validation ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PipedreamCallbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { alert_id, model, insight, metadata } = parsed.data;

  // --- Writeback ---
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from('alerts')
    .update({
      ai_insight: insight.ai_insight,
      likely_cause: insight.likely_cause,
      recommended_action: insight.recommended_action,
      priority_level: insight.priority_level,
      short_message: insight.short_message,
      requires_vet_escalation: insight.requires_vet_escalation,
      ai_model: model,
      ai_processed: true,
      ai_timestamp: new Date().toISOString(),
      ai_response_status: 'success',
    })
    .eq('id', alert_id);

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to update alert: ${updateError.message}` },
      { status: 500 },
    );
  }

  // --- Audit log (best effort — don't fail the call if this fails) ---
  await supabase.from('ai_processing_log').insert({
    alert_id,
    model,
    input_tokens: metadata?.input_tokens ?? null,
    output_tokens: metadata?.output_tokens ?? null,
    latency_ms: metadata?.latency_ms ?? null,
    status: 'success',
  });

  return NextResponse.json({ ok: true, alert_id });
}

/** Reject everything other than POST so GET probes get a clear signal. */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 },
  );
}

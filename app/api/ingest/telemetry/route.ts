import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ingest/telemetry
 *
 * Batch-insert telemetry readings from one or more devices. Authenticated
 * via the `x-device-key` header; the key is hashed and matched against
 * devices.api_key_hash (done in a follow-up iteration — MVP accepts a
 * global shared secret for simplicity).
 *
 * Payload accepts either a single reading or an array (up to 500 per call).
 * Inserts go through the service role client to bypass RLS.
 */

const Reading = z.object({
  timestamp: z.string().datetime(),
  animal_id: z.string().uuid().nullable().optional(),
  device_id: z.string().uuid(),
  site_id: z.string().uuid(),
  pen_id: z.string().uuid().nullable().optional(),
  body_temp_c: z.number().min(30).max(45).nullable().optional(),
  activity: z.number().min(0).nullable().optional(),
  feed_intake_g: z.number().min(0).nullable().optional(),
  feed_visits: z.number().int().min(0).nullable().optional(),
  water_intake_ml: z.number().min(0).nullable().optional(),
  battery: z.number().int().min(0).max(100).nullable().optional(),
  signal: z.number().int().nullable().optional(),
  raw_payload: z.any().optional(),
});

const Payload = z.union([Reading, z.array(Reading).max(500)]);

export async function POST(request: NextRequest) {
  // Simple global key check for MVP. Upgrade to per-device hashed keys later.
  const deviceKey = request.headers.get('x-device-key');
  if (!deviceKey || deviceKey !== process.env.INGEST_API_KEY_SALT) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const supabase = createAdminClient();

  const { error } = await supabase.from('telemetry_raw').insert(rows);
  if (error) {
    return NextResponse.json(
      { error: `Insert failed: ${error.message}` },
      { status: 500 },
    );
  }

  // Update device last_seen (best effort)
  const deviceIds = Array.from(new Set(rows.map((r) => r.device_id)));
  await supabase
    .from('devices')
    .update({ last_seen: new Date().toISOString(), signal_status: 'online' })
    .in('id', deviceIds);

  return NextResponse.json({ ok: true, inserted: rows.length });
}

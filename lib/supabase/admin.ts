import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database';

/**
 * SwineSense — Service-role Supabase client (server-only).
 *
 * Use ONLY in:
 *   - API routes (app/api/**)
 *   - Server Actions that need to bypass RLS (e.g. Storage uploads)
 *   - Pipedream callbacks / webhooks
 *
 * Never expose this client or its key to the browser. It bypasses Row-Level
 * Security and can read/write any row in any table.
 *
 * Typed with the generated `Database` schema so every `.from('table').insert/update(...)`
 * call is strictly type-checked at build time.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

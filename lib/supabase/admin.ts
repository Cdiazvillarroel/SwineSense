import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 *
 * USE ONLY in:
 *  - API routes that ingest external data (devices, webhooks from Pipedream)
 *  - Cron / server-side aggregation jobs
 *  - Admin operations confirmed as coming from a trusted source
 *
 * The `server-only` import ensures this file can never be bundled into the
 * client. If you accidentally import it from a Client Component, the build
 * will fail loudly.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

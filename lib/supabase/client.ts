'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

/**
 * Supabase client for use in Client Components ("use client").
 *
 * Uses the public anon key — Row Level Security enforces access control.
 * Auth cookies are set by the server flow (middleware + server client),
 * this client just reads them from document.cookie via @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

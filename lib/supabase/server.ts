import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Returns a Supabase client scoped to the current user's session cookies.
 * RLS policies apply automatically.
 *
 * `await cookies()` is compatible with both Next.js 14 (sync) and 15 (async).
 */
export async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // no-ops: pages are read-only and Server Actions handle their own writes
        set() {},
        remove() {},
      },
    }
  );
}

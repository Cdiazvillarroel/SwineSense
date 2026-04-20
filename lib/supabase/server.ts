import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

/**
 * Supabase client for Server Components and Route Handlers.
 *
 * Reads the Supabase auth cookie to run queries as the authenticated user,
 * so Row Level Security policies apply automatically.
 *
 * Server Components cannot set cookies (Next.js constraint), so `set` and
 * `remove` fail silently here. The middleware.ts file handles cookie refresh.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
            // because middleware refreshes the session on each request.
          }
        },
      },
    },
  );
}

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database';

/**
 * SwineSense — User-scoped Supabase client for Server Components, Server
 * Actions, and Route Handlers. Respects RLS (reads the user session from
 * cookies and impersonates them on every query).
 *
 * Typed with `Database` so all CRUD is strictly type-checked.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cookie mutations are no-ops inside Server Components; this is
            // expected and safe — the middleware is responsible for refreshing
            // session cookies for the next request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above — ignored in Server Components.
          }
        },
      },
    }
  );
}

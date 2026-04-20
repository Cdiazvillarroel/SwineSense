import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client scoped to the current user's session cookies.
 * RLS policies apply automatically.
 *
 * Usage:
 *   const supabase = createClient();
 *   const { data } = await supabase.from('sites').select('*');
 *
 * When upgrading to Next.js 15: make this `async`, add `await` to `cookies()`,
 * and update callers to `await createClient()`.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
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
            // Server Components cannot write cookies — safely ignored.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Server Components cannot write cookies — safely ignored.
          }
        },
      },
    }
  );
}

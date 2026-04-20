import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';

/**
 * Refreshes the Supabase auth session on every request.
 *
 * Supabase access tokens are short-lived. The middleware runs on the edge
 * before Server Components render, refreshes the session if needed, and
 * pushes the updated cookies back to the browser.
 *
 * It also enforces auth redirects:
 *  - Unauthenticated users on /overview, /alerts, etc. → /login
 *  - Authenticated users on /login → /overview
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login');
  const isPublicRoute =
    isAuthRoute ||
    pathname.startsWith('/api/ingest') ||          // device ingest (API key auth)
    pathname.startsWith('/api/webhooks') ||        // Pipedream callback (shared secret)
    pathname === '/';

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    const home = request.nextUrl.clone();
    home.pathname = '/overview';
    return NextResponse.redirect(home);
  }

  return response;
}

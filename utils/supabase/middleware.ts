import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {
            // Safe to ignore if cookiestore modifications are blocked in this request context
          }
        },
      },
    }
  );

  // IMPORTANT: Do NOT remove auth.getUser(). This refreshes the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Route protection rule 1: Protect '/profile' and '/update-password' routes and redirect unauthenticated users to '/login'
  if (!user && (pathname.startsWith('/profile') || pathname.startsWith('/update-password'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Append the original page path as a redirect query param so they can be sent back after logging in
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  // Route protection rule 2: Redirect logged-in users away from auth pages ('/login', '/signup') to home '/'
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

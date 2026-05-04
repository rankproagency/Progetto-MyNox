import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Non autenticato → login
  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/club'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    // Leggi il ruolo una volta sola
    let role: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = profile?.role ?? null;
    } catch {
      role = null;
    }

    // Redirect da / e /login al pannello corretto
    if (pathname === '/' || pathname === '/login') {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      if (role === 'club_admin' || role === 'club_staff') return NextResponse.redirect(new URL('/club/dashboard', request.url));
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    // Protegge /admin/* — solo admin
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    // Protegge /club/* — club_admin e club_staff
    if (pathname.startsWith('/club') && role !== 'club_admin' && role !== 'club_staff') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/club/:path*'],
};


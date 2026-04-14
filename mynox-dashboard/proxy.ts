import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    // Redirect da / e /login al pannello corretto
    if (pathname === '/' || pathname === '/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      if (role === 'club_admin') return NextResponse.redirect(new URL('/club/dashboard', request.url));
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    // club_admin non può accedere ad /admin/*
    if (pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/club/dashboard', request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/club/:path*'],
};


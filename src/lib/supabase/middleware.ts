import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from './client';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If Supabase is not configured, pass through (allows standalone local offline mode)
  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password');

  const isProtectedPage =
    path.startsWith('/dashboard') ||
    path.startsWith('/projects') ||
    (path.startsWith('/editor/') && path !== '/editor');

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

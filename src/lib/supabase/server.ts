import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-project.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error('Failed to get current user from session:', err);
    return null;
  }
}

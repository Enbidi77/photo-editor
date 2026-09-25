'use client';

import { useAuthStore } from '@/store/authStore';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, profile, session, initialized, loading, signOut: storeSignOut, setUser } = useAuthStore();

  const signInWithPassword = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    return { data, error };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const updatePassword = async (newPassword: string) => {
    const supabase = getSupabaseBrowserClient();
    return await supabase.auth.updateUser({ password: newPassword });
  };

  const signOut = async () => {
    await storeSignOut();
    router.push('/login');
  };

  return {
    user,
    profile,
    session,
    initialized,
    loading,
    isAuthenticated: Boolean(user),
    signInWithPassword,
    signUp,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    signOut,
  };
}

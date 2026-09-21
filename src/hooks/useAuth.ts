'use client';

import { useAuthStore } from '@/store/authStore';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, profile, session, initialized, loading, signOut: storeSignOut, setUser } = useAuthStore();

  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      // Mock sign-in for development without Supabase
      const mockUser = {
        id: `user-${Date.now()}`,
        app_metadata: {},
        user_metadata: { display_name: email.split('@')[0] },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email,
      };
      setUser(mockUser as any, null, {
        id: mockUser.id,
        displayName: email.split('@')[0],
        email,
      });
      return { error: null };
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!isSupabaseConfigured()) {
      const mockUser = {
        id: `user-${Date.now()}`,
        app_metadata: {},
        user_metadata: { display_name: displayName },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email,
      };
      setUser(mockUser as any, null, {
        id: mockUser.id,
        displayName,
        email,
      });
      return { error: null };
    }

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
    if (!isSupabaseConfigured()) {
      alert('Google OAuth requires configuring NEXT_PUBLIC_SUPABASE_URL and anon key.');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }
    const supabase = getSupabaseBrowserClient();
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }
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

import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  initialized: boolean;
  loading: boolean;

  setUser: (user: User | null, session: Session | null, profile?: UserProfile | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  initAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001';

// Fallback user for offline / standalone mode
const FALLBACK_USER: User = {
  id: LOCAL_USER_ID,
  app_metadata: {},
  user_metadata: { display_name: 'Local Creator' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'creator@pixelforge.local',
};

const FALLBACK_PROFILE: UserProfile = {
  id: LOCAL_USER_ID,
  displayName: 'Local Creator',
  avatarUrl: '',
  email: 'creator@pixelforge.local',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  initialized: false,
  loading: true,

  setUser: (user, session, profile = null) => {
    set({ user, session, profile: profile || (user ? { id: user.id, displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User', email: user.email } : null), loading: false });
  },

  setProfile: (profile) => set({ profile }),

  initAuth: async () => {
    if (!isSupabaseConfigured()) {
      set({
        user: FALLBACK_USER,
        session: null,
        profile: FALLBACK_PROFILE,
        initialized: true,
        loading: false,
      });
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          user: session.user,
          session,
          profile: profile || {
            id: session.user.id,
            displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Creator',
            avatarUrl: session.user.user_metadata?.avatar_url || '',
            email: session.user.email,
          },
          initialized: true,
          loading: false,
        });
      } else {
        set({ user: null, session: null, profile: null, initialized: true, loading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();

          set({
            user: newSession.user,
            session: newSession,
            profile: profile || {
              id: newSession.user.id,
              displayName: newSession.user.user_metadata?.display_name || newSession.user.email?.split('@')[0] || 'Creator',
              avatarUrl: newSession.user.user_metadata?.avatar_url || '',
              email: newSession.user.email,
            },
            loading: false,
          });
        } else {
          set({ user: null, session: null, profile: null, loading: false });
        }
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ initialized: true, loading: false });
    }
  },

  signOut: async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    set({ user: null, session: null, profile: null });
  },
}));

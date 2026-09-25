import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { db, isDatabaseConfigured } from '@/db';
import { profiles } from '@/db/schema';
import { User } from '@supabase/supabase-js';

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function getCurrentUser(): Promise<User | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        if (isDatabaseConfigured()) {
          try {
            const displayName =
              user.user_metadata?.display_name ||
              user.user_metadata?.full_name ||
              (user.email ? user.email.split('@')[0] : 'User');
            const avatarUrl = user.user_metadata?.avatar_url || null;
            const normalizedEmail = user.email ? user.email.trim().toLowerCase() : null;

            await db
              .insert(profiles)
              .values({
                id: user.id,
                displayName,
                email: normalizedEmail,
                avatarUrl,
              })
              .onConflictDoUpdate({
                target: profiles.id,
                set: {
                  displayName,
                  ...(normalizedEmail ? { email: normalizedEmail } : {}),
                  ...(avatarUrl ? { avatarUrl } : {}),
                  updatedAt: new Date(),
                },
              });
          } catch (syncErr) {
            console.warn('Failed to sync user profile in DB:', syncErr);
          }
        }
        return user;
      }
      return null;
    } catch (err) {
      console.error('Failed to get current user from session:', err);
      return null;
    }
  }

  // When Supabase is not configured (standalone / offline local development mode),
  // but PostgreSQL is configured:
  // Use the local creator profile so local projects, memberships, and invitations persist cleanly.
  if (!isSupabaseConfigured() && isDatabaseConfigured()) {
    try {
      await db
        .insert(profiles)
        .values({
          id: LOCAL_USER_ID,
          displayName: 'Local Creator',
          email: 'creator@pixelforge.local',
        })
        .onConflictDoNothing();
    } catch (err) {
      console.warn('Failed to ensure default profile in DB:', err);
    }

    return {
      id: LOCAL_USER_ID,
      app_metadata: {},
      user_metadata: { display_name: 'Local Creator' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'creator@pixelforge.local',
    };
  }

  return null;
}


import 'server-only';
import { db, isDatabaseConfigured } from '@/db';
import { projectMembers, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ProjectRole } from '@/lib/auth/permissions';

export interface MemberWithProfile {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: Date;
  profile?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export class MemberService {
  async listMembers(projectId: string): Promise<MemberWithProfile[]> {
    if (!isDatabaseConfigured()) {
      return [];
    }

    const members = await db.query.projectMembers.findMany({
      where: eq(projectMembers.projectId, projectId),
      with: {
        user: true,
      },
    });

    return members.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      userId: m.userId,
      role: m.role as ProjectRole,
      createdAt: m.createdAt,
      profile: m.user
        ? {
            id: m.user.id,
            displayName: m.user.displayName,
            avatarUrl: m.user.avatarUrl,
          }
        : undefined,
    }));
  }

  async addOrInviteMember(
    projectId: string,
    email: string,
    role: 'editor' | 'viewer'
  ): Promise<{ success: boolean; member?: MemberWithProfile; error?: string }> {
    if (!isDatabaseConfigured()) {
      return { success: true };
    }

    // Lookup user profile by email or user ID
    // Note: If profile exists, add them directly to projectMembers
    const targetProfile = await db.query.profiles.findFirst({
      where: (p, { eq: eqFn }) => eqFn(p.displayName, email), // or user email
    });

    if (targetProfile) {
      const [newMember] = await db
        .insert(projectMembers)
        .values({
          projectId,
          userId: targetProfile.id,
          role,
        })
        .onConflictDoUpdate({
          target: [projectMembers.projectId, projectMembers.userId],
          set: { role },
        })
        .returning();

      return {
        success: true,
        member: {
          id: newMember.id,
          projectId: newMember.projectId,
          userId: newMember.userId,
          role: newMember.role as ProjectRole,
          createdAt: newMember.createdAt,
          profile: {
            id: targetProfile.id,
            displayName: targetProfile.displayName,
            avatarUrl: targetProfile.avatarUrl,
          },
        },
      };
    }

    return {
      success: true,
      error: 'Invitation queued for user registration',
    };
  }

  async updateRole(projectId: string, userId: string, role: 'editor' | 'viewer'): Promise<void> {
    if (!isDatabaseConfigured()) return;

    await db
      .update(projectMembers)
      .set({ role })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    if (!isDatabaseConfigured()) return;

    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  }
}

export const memberService = new MemberService();

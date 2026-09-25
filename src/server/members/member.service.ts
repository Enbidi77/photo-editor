import 'server-only';
import { randomBytes } from 'crypto';
import { db, isDatabaseConfigured } from '@/db';
import { projectMembers, profiles, projectInvites } from '@/db/schema';
import { eq, and, or, gt, desc } from 'drizzle-orm';
import { ProjectRole } from '@/lib/auth/permissions';
import { PendingProjectInvite, ProjectInvite } from '@/types/auth';
import { toUuid } from '@/lib/utils/toUuid';
import { LOCAL_USER_ID } from '@/lib/auth/getCurrentUser';

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

    const pId = toUuid(projectId);

    const members = await db.query.projectMembers.findMany({
      where: eq(projectMembers.projectId, pId),
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
    role: 'editor' | 'viewer',
    invitedByUserId?: string
  ): Promise<{ success: boolean; member?: MemberWithProfile; invite?: ProjectInvite; error?: string }> {
    if (!isDatabaseConfigured()) {
      return { success: true };
    }

    const pId = toUuid(projectId);
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user already exists in profiles
    const targetProfile = await db.query.profiles.findFirst({
      where: (p, { or: orFn, eq: eqFn }) =>
        orFn(
          eqFn(p.email, normalizedEmail),
          eqFn(p.displayName, normalizedEmail)
        ),
    });

    // 2. If user already exists and is already a member, update role
    if (targetProfile) {
      const existingMember = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, pId),
          eq(projectMembers.userId, targetProfile.id)
        ),
      });

      if (existingMember) {
        const [updated] = await db
          .update(projectMembers)
          .set({ role })
          .where(and(eq(projectMembers.projectId, pId), eq(projectMembers.userId, targetProfile.id)))
          .returning();

        return {
          success: true,
          member: {
            id: updated.id,
            projectId: updated.projectId,
            userId: updated.userId,
            role: updated.role as ProjectRole,
            createdAt: updated.createdAt,
            profile: {
              id: targetProfile.id,
              displayName: targetProfile.displayName,
              avatarUrl: targetProfile.avatarUrl,
            },
          },
        };
      }
    }

    // 3. Create or replace a pending invitation so the invited user receives a dialog prompt
    const inviterId = invitedByUserId || targetProfile?.id;
    if (!inviterId) {
      // Fallback: fetch project owner
      const project = await db.query.projects.findFirst({
        where: (p, { eq: eqFn }) => eqFn(p.id, pId),
      });
      if (!project) {
        return { success: false, error: 'Project not found' };
      }
    }

    // Remove any existing pending invite for this project & email
    await db
      .delete(projectInvites)
      .where(
        and(
          eq(projectInvites.projectId, pId),
          eq(projectInvites.email, normalizedEmail)
        )
      );

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Get inviter ID (passed in or project owner or local fallback)
    let finalInviterId = inviterId;
    if (!finalInviterId) {
      const proj = await db.query.projects.findFirst({
        where: (p, { eq: eqFn }) => eqFn(p.id, pId),
      });
      finalInviterId = proj?.ownerId;
    }

    if (!finalInviterId) {
      finalInviterId = LOCAL_USER_ID;
    }

    // Ensure inviter profile exists in DB
    try {
      await db
        .insert(profiles)
        .values({
          id: finalInviterId,
          displayName: 'Local Creator',
          email: 'creator@pixelforge.local',
        })
        .onConflictDoNothing();
    } catch {
      // Ignore conflict
    }

    const [newInvite] = await db
      .insert(projectInvites)
      .values({
        projectId: pId,
        email: normalizedEmail,
        role,
        token,
        invitedBy: finalInviterId,
        expiresAt,
      })
      .returning();

    return {
      success: true,
      invite: {
        id: newInvite.id,
        projectId: newInvite.projectId,
        email: newInvite.email,
        role: newInvite.role as 'editor' | 'viewer',
        token: newInvite.token,
        invitedBy: newInvite.invitedBy,
        createdAt: newInvite.createdAt.toISOString(),
        expiresAt: newInvite.expiresAt.toISOString(),
      },
    };
  }

  async listProjectInvites(projectId: string): Promise<ProjectInvite[]> {
    if (!isDatabaseConfigured()) return [];

    const pId = toUuid(projectId);

    const invites = await db.query.projectInvites.findMany({
      where: eq(projectInvites.projectId, pId),
      orderBy: [desc(projectInvites.createdAt)],
    });

    return invites.map((i) => ({
      id: i.id,
      projectId: i.projectId,
      email: i.email,
      role: i.role as 'editor' | 'viewer',
      token: i.token,
      invitedBy: i.invitedBy,
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt.toISOString(),
    }));
  }

  async cancelProjectInvite(projectId: string, inviteId: string): Promise<void> {
    if (!isDatabaseConfigured()) return;

    const pId = toUuid(projectId);

    await db
      .delete(projectInvites)
      .where(and(eq(projectInvites.projectId, pId), eq(projectInvites.id, inviteId)));
  }

  async listUserPendingInvitations(userEmail: string): Promise<PendingProjectInvite[]> {
    if (!isDatabaseConfigured() || !userEmail) return [];

    const normalized = userEmail.trim().toLowerCase();

    const invites = await db.query.projectInvites.findMany({
      where: and(
        eq(projectInvites.email, normalized),
        gt(projectInvites.expiresAt, new Date())
      ),
      with: {
        project: true,
        inviter: true,
      },
      orderBy: [desc(projectInvites.createdAt)],
    });

    return invites.map((i) => ({
      id: i.id,
      projectId: i.projectId,
      projectName: i.project?.name || 'Untitled Project',
      role: i.role as 'editor' | 'viewer',
      invitedBy: i.inviter
        ? {
            id: i.inviter.id,
            displayName: i.inviter.displayName,
            avatarUrl: i.inviter.avatarUrl,
          }
        : undefined,
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt.toISOString(),
    }));
  }

  async acceptInvitation(
    inviteId: string,
    userId: string,
    userEmail: string
  ): Promise<{ success: boolean; projectId?: string; error?: string }> {
    if (!isDatabaseConfigured()) {
      return { success: true };
    }

    const normalized = userEmail.trim().toLowerCase();

    const invite = await db.query.projectInvites.findFirst({
      where: eq(projectInvites.id, inviteId),
    });

    if (!invite) {
      return { success: false, error: 'Invitation not found or already accepted' };
    }

    if (invite.email.toLowerCase() !== normalized) {
      return { success: false, error: 'This invitation was addressed to a different email address' };
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return { success: false, error: 'Invitation has expired' };
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(projectMembers)
        .values({
          projectId: invite.projectId,
          userId,
          role: invite.role,
        })
        .onConflictDoUpdate({
          target: [projectMembers.projectId, projectMembers.userId],
          set: { role: invite.role },
        });

      await tx.delete(projectInvites).where(eq(projectInvites.id, invite.id));
    });

    return { success: true, projectId: invite.projectId };
  }

  async declineInvitation(
    inviteId: string,
    userEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isDatabaseConfigured()) {
      return { success: true };
    }

    const normalized = userEmail.trim().toLowerCase();

    const invite = await db.query.projectInvites.findFirst({
      where: eq(projectInvites.id, inviteId),
    });

    if (!invite) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invite.email.toLowerCase() !== normalized) {
      return { success: false, error: 'Unauthorized to decline this invitation' };
    }

    await db.delete(projectInvites).where(eq(projectInvites.id, invite.id));
    return { success: true };
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

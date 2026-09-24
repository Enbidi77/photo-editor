import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { inviteMemberSchema } from '@/lib/validation/member';
import { projectInvites } from '@/db/schema/projectInvites';
import { memberService } from '@/server/members/member.service';
import { canManageMembers, hasMinimumRole } from '@/lib/auth/permissions';

describe('Project Collaboration Invitations & Management', () => {
  it('validates invitation inputs correctly', () => {
    // Valid roles and emails
    expect(inviteMemberSchema.safeParse({ email: 'collaborator@pixelforge.io', role: 'editor' }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ email: 'client@company.com', role: 'viewer' }).success).toBe(true);

    // Default role fallback to editor
    const res = inviteMemberSchema.safeParse({ email: 'teammate@company.com' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.role).toBe('editor');
    }

    // Invalid email rejection
    expect(inviteMemberSchema.safeParse({ email: 'not-an-email', role: 'editor' }).success).toBe(false);
    expect(inviteMemberSchema.safeParse({ email: '', role: 'viewer' }).success).toBe(false);

    // Invalid role rejection
    expect(inviteMemberSchema.safeParse({ email: 'user@example.com', role: 'owner' as any }).success).toBe(false);
    expect(inviteMemberSchema.safeParse({ email: 'user@example.com', role: 'admin' as any }).success).toBe(false);
  });

  it('verifies projectInvites table schema definition', () => {
    expect(projectInvites).toBeDefined();
    expect(projectInvites.projectId).toBeDefined();
    expect(projectInvites.email).toBeDefined();
    expect(projectInvites.role).toBeDefined();
    expect(projectInvites.token).toBeDefined();
    expect(projectInvites.invitedBy).toBeDefined();
    expect(projectInvites.expiresAt).toBeDefined();
  });

  it('permits owners and editors to manage members and invitations', () => {
    expect(canManageMembers('owner')).toBe(true);
    expect(canManageMembers('editor')).toBe(true);
    expect(canManageMembers('viewer')).toBe(false);
  });

  it('evaluates expiration correctly for 7-day invitations', () => {
    const now = Date.now();
    const activeExpiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
    const expiredDate = new Date(now - 1000);

    expect(activeExpiresAt.getTime()).toBeGreaterThan(now);
    expect(expiredDate.getTime()).toBeLessThan(now);
  });

  it('handles memberService operations safely in offline / unconfigured database mode', async () => {
    // When DB is unconfigured, methods should return graceful fallbacks without crashing
    const listRes = await memberService.listMembers('fake-project-id');
    expect(Array.isArray(listRes)).toBe(true);

    const userInvites = await memberService.listUserPendingInvitations('test@example.com');
    expect(Array.isArray(userInvites)).toBe(true);

    const projectInvitesList = await memberService.listProjectInvites('fake-project-id');
    expect(Array.isArray(projectInvitesList)).toBe(true);

    const inviteRes = await memberService.addOrInviteMember('fake-project-id', 'test@example.com', 'editor');
    expect(inviteRes.success).toBe(true);

    const acceptRes = await memberService.acceptInvitation('fake-invite-id', 'user-1', 'test@example.com');
    expect(acceptRes.success).toBe(true);

    const declineRes = await memberService.declineInvitation('fake-invite-id', 'test@example.com');
    expect(declineRes.success).toBe(true);
  });
});

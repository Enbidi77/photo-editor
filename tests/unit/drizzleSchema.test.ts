import { describe, it, expect } from 'vitest';
import {
  profiles,
  projects,
  projectMembers,
  projectAssets,
  projectOperations,
  projectSnapshots,
  projectRoleEnum,
} from '@/db/schema';
import { createProjectSchema, updateProjectSchema } from '@/lib/validation/project';
import { inviteMemberSchema } from '@/lib/validation/member';
import { persistOperationSchema } from '@/lib/validation/operation';
import { hasMinimumRole, canEdit, canDeleteProject, canManageMembers } from '@/lib/auth/permissions';

describe('Drizzle Schema Definitions', () => {
  it('defines all required PostgreSQL tables and enums', () => {
    expect(profiles).toBeDefined();
    expect(projects).toBeDefined();
    expect(projectMembers).toBeDefined();
    expect(projectAssets).toBeDefined();
    expect(projectOperations).toBeDefined();
    expect(projectSnapshots).toBeDefined();
    expect(projectRoleEnum.enumValues).toEqual(['owner', 'editor', 'viewer']);
  });

  it('verifies column definitions on projects table', () => {
    expect(projects.id).toBeDefined();
    expect(projects.ownerId).toBeDefined();
    expect(projects.name).toBeDefined();
    expect(projects.width).toBeDefined();
    expect(projects.height).toBeDefined();
    expect(projects.document).toBeDefined();
    expect(projects.thumbnailUrl).toBeDefined();
    expect(projects.createdAt).toBeDefined();
    expect(projects.updatedAt).toBeDefined();
  });

  it('verifies column definitions on project_members table', () => {
    expect(projectMembers.id).toBeDefined();
    expect(projectMembers.projectId).toBeDefined();
    expect(projectMembers.userId).toBeDefined();
    expect(projectMembers.role).toBeDefined();
  });

  it('verifies column definitions on project_operations table', () => {
    expect(projectOperations.id).toBeDefined();
    expect(projectOperations.projectId).toBeDefined();
    expect(projectOperations.sequence).toBeDefined();
    expect(projectOperations.operationType).toBeDefined();
    expect(projectOperations.payload).toBeDefined();
  });
});

describe('Zod Validation Schemas', () => {
  it('validates correct project creation payloads', () => {
    const valid = {
      name: 'Banner 2026',
      width: 1920,
      height: 1080,
      resolution: 72,
      backgroundColor: '#ffffff',
      colorMode: 'RGB',
    };
    const parsed = createProjectSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid project dimensions', () => {
    const invalidZero = {
      name: 'Zero Dimensions',
      width: 0,
      height: 1080,
    };
    expect(createProjectSchema.safeParse(invalidZero).success).toBe(false);

    const invalidNegative = {
      name: 'Negative Dimensions',
      width: 800,
      height: -50,
    };
    expect(createProjectSchema.safeParse(invalidNegative).success).toBe(false);

    const invalidTooLarge = {
      name: 'Giant Canvas',
      width: 50000,
      height: 1000,
    };
    expect(createProjectSchema.safeParse(invalidTooLarge).success).toBe(false);
  });

  it('validates project updates', () => {
    const partialUpdate = {
      name: 'New Name',
      thumbnailUrl: 'https://example.com/thumb.png',
    };
    expect(updateProjectSchema.safeParse(partialUpdate).success).toBe(true);
  });

  it('validates member invitations', () => {
    expect(inviteMemberSchema.safeParse({ email: 'designer@example.com', role: 'editor' }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ email: 'viewer@example.com', role: 'viewer' }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ email: 'not-an-email', role: 'editor' }).success).toBe(false);
  });

  it('validates operation payloads', () => {
    const validOp = {
      projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      operationType: 'TRANSFORM_LAYER',
      payload: { layerId: 'l1', transform: { x: 10, y: 20 } },
    };
    expect(persistOperationSchema.safeParse(validOp).success).toBe(true);
  });
});

describe('Permission Logic & RBAC Hierarchy', () => {
  it('correctly evaluates minimum role requirements', () => {
    expect(hasMinimumRole('owner', 'viewer')).toBe(true);
    expect(hasMinimumRole('owner', 'editor')).toBe(true);
    expect(hasMinimumRole('owner', 'owner')).toBe(true);

    expect(hasMinimumRole('editor', 'viewer')).toBe(true);
    expect(hasMinimumRole('editor', 'editor')).toBe(true);
    expect(hasMinimumRole('editor', 'owner')).toBe(false);

    expect(hasMinimumRole('viewer', 'viewer')).toBe(true);
    expect(hasMinimumRole('viewer', 'editor')).toBe(false);
    expect(hasMinimumRole('viewer', 'owner')).toBe(false);
  });

  it('evaluates capability checks correctly', () => {
    expect(canEdit('owner')).toBe(true);
    expect(canEdit('editor')).toBe(true);
    expect(canEdit('viewer')).toBe(false);

    expect(canDeleteProject('owner')).toBe(true);
    expect(canDeleteProject('editor')).toBe(false);
    expect(canDeleteProject('viewer')).toBe(false);

    expect(canManageMembers('owner')).toBe(true);
    expect(canManageMembers('editor')).toBe(true);
    expect(canManageMembers('viewer')).toBe(false);
  });
});

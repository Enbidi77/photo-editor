import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']).default('editor'),
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;

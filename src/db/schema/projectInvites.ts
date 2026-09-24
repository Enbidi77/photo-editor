import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { profiles } from './profiles';

export const projectInvites = pgTable(
  'project_invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().$type<'editor' | 'viewer'>(),
    token: text('token').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .notNull(),
  },
  (table) => [
    index('idx_project_invites_email').on(table.email),
    index('idx_project_invites_project').on(table.projectId),
  ]
);

export type ProjectInviteRow = typeof projectInvites.$inferSelect;
export type NewProjectInviteRow = typeof projectInvites.$inferInsert;

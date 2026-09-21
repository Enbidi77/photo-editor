import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { profiles } from './profiles';

export const projectRoleEnum = pgEnum('project_role', ['owner', 'editor', 'viewer']);

export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: projectRoleEnum('role').default('editor').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('project_members_project_user_idx').on(table.projectId, table.userId),
    index('project_members_project_id_idx').on(table.projectId),
    index('project_members_user_id_idx').on(table.userId),
  ]
);

export type ProjectMemberRow = typeof projectMembers.$inferSelect;
export type NewProjectMemberRow = typeof projectMembers.$inferInsert;

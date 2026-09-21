import {
  pgTable,
  uuid,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { profiles } from './profiles';

export const projectSnapshots = pgTable(
  'project_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    document: jsonb('document').notNull(),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('project_snapshots_project_id_idx').on(table.projectId),
    index('project_snapshots_created_at_idx').on(table.createdAt),
  ]
);

export type ProjectSnapshotRow = typeof projectSnapshots.$inferSelect;
export type NewProjectSnapshotRow = typeof projectSnapshots.$inferInsert;

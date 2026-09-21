import {
  pgTable,
  uuid,
  text,
  jsonb,
  bigserial,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const projectOperations = pgTable(
  'project_operations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    operationType: text('operation_type').notNull(),
    payload: jsonb('payload').notNull(),
    sequence: bigserial('sequence', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('project_operations_project_id_idx').on(table.projectId),
    index('project_operations_seq_idx').on(table.projectId, table.sequence),
    index('project_operations_created_at_idx').on(table.createdAt),
  ]
);

export type ProjectOperationRow = typeof projectOperations.$inferSelect;
export type NewProjectOperationRow = typeof projectOperations.$inferInsert;

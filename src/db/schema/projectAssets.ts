import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { profiles } from './profiles';

export const projectAssets = pgTable(
  'project_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    storagePath: text('storage_path').notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    width: integer('width'),
    height: integer('height'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('project_assets_project_id_idx').on(table.projectId),
  ]
);

export type ProjectAssetRow = typeof projectAssets.$inferSelect;
export type NewProjectAssetRow = typeof projectAssets.$inferInsert;

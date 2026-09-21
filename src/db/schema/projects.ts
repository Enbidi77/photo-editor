import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    resolution: integer('resolution').default(72).notNull(),
    backgroundColor: text('background_color').default('#ffffff').notNull(),
    colorMode: text('color_mode').default('RGB').notNull(),
    document: jsonb('document').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('projects_owner_id_idx').on(table.ownerId),
    index('projects_updated_at_idx').on(table.updatedAt),
    check('projects_width_positive', sql`${table.width} > 0`),
    check('projects_height_positive', sql`${table.height} > 0`),
  ]
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;

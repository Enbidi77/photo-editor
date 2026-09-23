---
name: drizzle-supabase-workflow
description: End-to-end guidance for Drizzle ORM and Supabase in Next.js applications, covering schema design, migrations, RLS policies, storage bucket asset handling, and offline sync.
---

# Drizzle ORM & Supabase Production Workflow

This skill outlines the workflow, schema conventions, security policies, and asset management patterns when working with Drizzle ORM and Supabase.

---

## 1. Schema Design Conventions

In a photo editor like Pixelforge, project state has two parts:
1. **Relational metadata**: Project ID, user ownership, title, creation/update timestamps, thumbnail URLs.
2. **Document state**: Dynamic layer hierarchies, vector paths, adjustments, and filter values stored efficiently as typed `jsonb`.

### Schema Example:
```typescript
// src/db/schema/projects.ts
import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import type { LayerData } from '@/types/editor';

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull().default('Untitled Project'),
  thumbnailUrl: text('thumbnail_url'),
  width: text('width').notNull().default('1920'),
  height: text('height').notNull().default('1080'),
  layers: jsonb('layers').$type<LayerData[]>().notNull().default([]),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 2. Migration Commands & Workflow

Always use the package scripts defined in `package.json`:

* **Generate new SQL migration files**:
  ```bash
  pnpm db:generate
  ```
  Inspect the generated SQL inside `drizzle/` before running migrations.
* **Apply migrations to the database**:
  ```bash
  pnpm db:migrate
  ```
* **Push schema directly in local/dev environments**:
  ```bash
  pnpm db:push
  ```
* **Open Drizzle Studio UI**:
  ```bash
  pnpm db:studio
  ```

---

## 3. Supabase Row-Level Security (RLS)

All tables created in Supabase MUST have RLS enabled to prevent unauthorized data access.

### Standard RLS Policy Template for User Projects:
```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own projects or public projects
CREATE POLICY "Users can view own or public projects"
ON projects FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

-- Allow users to insert their own projects
CREATE POLICY "Users can insert own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own projects
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own projects
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);
```

---

## 4. Supabase Storage for Images & Thumbnails

### Bucket Organization:
* `project-assets/`: Private bucket for high-res source images uploaded into projects. Requires signed URLs or authenticated RLS access.
* `thumbnails/`: Public bucket for low-res project preview thumbnails (e.g., 300x200 JPEG/WebP).

### Uploading Image Assets:
```typescript
import { createClient } from '@/lib/supabase/client';

export async function uploadProjectAsset(projectId: string, file: Blob, filename: string) {
  const supabase = createClient();
  const filePath = `${projectId}/${Date.now()}_${filename}`;

  const { data, error } = await supabase.storage
    .from('project-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;
  return data.path;
}
```

---

## 5. Offline Draft Persistence with IndexedDB (`idb`)

To prevent users from losing work when their network drops or the browser refreshes:

1. **Auto-save drafts locally to IndexedDB** on every layer mutation (debounced by ~1 second).
2. **Sync to Supabase**: When network connectivity is active, push changes to the Supabase backend.
3. **On Editor Mount**: Check IndexedDB for a newer local draft timestamp before loading the database version, and prompt the user to restore if an unsaved crash occurred.

import { relations } from 'drizzle-orm';
import { profiles } from './profiles';
import { projects } from './projects';
import { projectMembers } from './projectMembers';
import { projectAssets } from './projectAssets';
import { projectOperations } from './projectOperations';
import { projectSnapshots } from './projectSnapshots';

export const profilesRelations = relations(profiles, ({ many }) => ({
  ownedProjects: many(projects),
  memberships: many(projectMembers),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [projects.ownerId],
    references: [profiles.id],
  }),
  members: many(projectMembers),
  assets: many(projectAssets),
  operations: many(projectOperations),
  snapshots: many(projectSnapshots),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(profiles, {
    fields: [projectMembers.userId],
    references: [profiles.id],
  }),
}));

export const projectAssetsRelations = relations(projectAssets, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssets.projectId],
    references: [projects.id],
  }),
  creator: one(profiles, {
    fields: [projectAssets.createdBy],
    references: [profiles.id],
  }),
}));

export const projectOperationsRelations = relations(projectOperations, ({ one }) => ({
  project: one(projects, {
    fields: [projectOperations.projectId],
    references: [projects.id],
  }),
}));

export const projectSnapshotsRelations = relations(projectSnapshots, ({ one }) => ({
  project: one(projects, {
    fields: [projectSnapshots.projectId],
    references: [projects.id],
  }),
  creator: one(profiles, {
    fields: [projectSnapshots.createdBy],
    references: [profiles.id],
  }),
}));

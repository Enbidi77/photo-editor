export type ProjectRole = 'owner' | 'editor' | 'viewer';

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

export function hasMinimumRole(userRole: ProjectRole, requiredRole: ProjectRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canEdit(userRole: ProjectRole): boolean {
  return hasMinimumRole(userRole, 'editor');
}

export function canManageMembers(userRole: ProjectRole): boolean {
  return hasMinimumRole(userRole, 'editor');
}

export function canDeleteProject(userRole: ProjectRole): boolean {
  return userRole === 'owner';
}

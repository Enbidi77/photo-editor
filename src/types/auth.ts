export type UserRole = 'owner' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  profile?: UserProfile;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  email: string;
  role: 'editor' | 'viewer';
  token: string;
  expiresAt: string;
}

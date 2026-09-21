import { UserRole } from './auth';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface Collaborator {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  color: string; // Distinct cursor/selection color
  activeTool?: string;
  lastSeen: number;
}

export interface RemoteCursor {
  userId: string;
  displayName: string;
  color: string;
  x: number; // In document coordinates
  y: number; // In document coordinates
  tool?: string;
}

export interface RemoteSelection {
  userId: string;
  layerId: string;
  color: string;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  color: string;
  activeTool?: string;
}

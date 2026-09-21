import { EditorOperation } from '@/types/operation';
import { Collaborator, RemoteCursor, RemoteSelection } from '@/types/collaboration';
import { UserRole } from '@/types/auth';

export interface CollaborationUser {
  id: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  color: string;
}

export interface CollaborationAdapter {
  connect(projectId: string, user: CollaborationUser): Promise<void>;
  disconnect(): Promise<void>;

  publishOperation(operation: EditorOperation): Promise<void>;
  subscribeOperations(handler: (op: EditorOperation) => void): () => void;

  publishCursor(cursor: { x: number; y: number; tool?: string }): Promise<void>;
  subscribeCursors(handler: (cursor: RemoteCursor) => void): () => void;

  publishSelection(layerId: string): Promise<void>;
  subscribeSelections(handler: (selection: RemoteSelection) => void): () => void;

  publishPresence(activeTool?: string): Promise<void>;
  subscribePresence(handler: (collaborators: Collaborator[]) => void): () => void;
}

export const COLLABORATOR_COLORS = [
  '#0078d4', // Blue
  '#107c41', // Green
  '#d83b01', // Orange
  '#8764b8', // Purple
  '#e3008c', // Pink
  '#008272', // Teal
  '#a4262c', // Red
  '#5c2d91', // Indigo
];

export function getRandomColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
}

import { isSupabaseConfigured } from '@/lib/supabase/client';
import { SupabaseRealtimeCollaborationAdapter } from './supabaseRealtimeAdapter';
import { LocalCollaborationAdapter } from './localCollaborationAdapter';

export function createCollaborationAdapter(): CollaborationAdapter {
  if (isSupabaseConfigured()) {
    return new SupabaseRealtimeCollaborationAdapter();
  }
  return new LocalCollaborationAdapter();
}

import { create } from 'zustand';
import {
  Collaborator,
  RemoteCursor,
  RemoteSelection,
  ConnectionState,
} from '@/types/collaboration';
import { UserRole } from '@/types/auth';

interface CollaborationState {
  connected: boolean;
  connectionState: ConnectionState;
  userRole: UserRole;
  isSaving: boolean;
  collaborators: Collaborator[];
  remoteCursors: Record<string, RemoteCursor>;
  remoteSelections: Record<string, RemoteSelection>;
  pendingOperationsCount: number;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setUserRole: (role: UserRole) => void;
  setIsSaving: (saving: boolean) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  updateRemoteCursor: (cursor: RemoteCursor) => void;
  removeRemoteCursor: (userId: string) => void;
  updateRemoteSelection: (selection: RemoteSelection) => void;
  removeRemoteSelection: (userId: string) => void;
  setPendingOperationsCount: (count: number) => void;
  resetCollaboration: () => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  connected: false,
  connectionState: 'disconnected',
  userRole: 'owner',
  isSaving: false,
  collaborators: [],
  remoteCursors: {},
  remoteSelections: {},
  pendingOperationsCount: 0,

  setConnectionState: (state) =>
    set({
      connectionState: state,
      connected: state === 'connected',
    }),

  setUserRole: (role) => set({ userRole: role }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setCollaborators: (collaborators) => set({ collaborators }),

  updateRemoteCursor: (cursor) =>
    set((state) => ({
      remoteCursors: {
        ...state.remoteCursors,
        [cursor.userId]: cursor,
      },
    })),

  removeRemoteCursor: (userId) =>
    set((state) => {
      const next = { ...state.remoteCursors };
      delete next[userId];
      return { remoteCursors: next };
    }),

  updateRemoteSelection: (selection) =>
    set((state) => ({
      remoteSelections: {
        ...state.remoteSelections,
        [selection.userId]: selection,
      },
    })),

  removeRemoteSelection: (userId) =>
    set((state) => {
      const next = { ...state.remoteSelections };
      delete next[userId];
      return { remoteSelections: next };
    }),

  setPendingOperationsCount: (count) => set({ pendingOperationsCount: count }),

  resetCollaboration: () =>
    set({
      connected: false,
      connectionState: 'disconnected',
      userRole: 'owner',
      isSaving: false,
      collaborators: [],
      remoteCursors: {},
      remoteSelections: {},
      pendingOperationsCount: 0,
    }),
}));

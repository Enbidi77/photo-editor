'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useAuthStore } from '@/store/authStore';
import {
  CollaborationAdapter,
  createCollaborationAdapter,
  getRandomColor,
} from '@/lib/collaboration/adapter';
import { EditorOperation } from '@/types/operation';
import { applyRemoteOperation } from '@/lib/collaboration/operations';
import { UserRole } from '@/types/auth';

export function useCollaboration(projectId: string | null, role: UserRole = 'editor') {
  const adapterRef = useRef<CollaborationAdapter | null>(null);

  const {
    connected,
    connectionState,
    collaborators,
    remoteCursors,
    remoteSelections,
    isSaving,
    pendingOperationsCount,
    setUserRole,
  } = useCollaborationStore();

  const { user, profile } = useAuthStore();

  useEffect(() => {
    if (!projectId) return;

    setUserRole(role);
    const adapter = createCollaborationAdapter();
    adapterRef.current = adapter;

    const currentUserId = user?.id || `anon-${Math.random()}`;
    const displayName = profile?.displayName || user?.user_metadata?.display_name || 'Guest Creator';
    const avatarUrl = profile?.avatarUrl || '';
    const color = getRandomColor(currentUserId);

    // Connect
    adapter.connect(projectId, {
      id: currentUserId,
      name: displayName,
      avatarUrl,
      role,
      color,
    });

    // Subscribe to operations
    const unsubOps = adapter.subscribeOperations((op: EditorOperation) => {
      // Don't re-apply our own operations
      if (op.userId === currentUserId) return;
      applyRemoteOperation(op);
    });

    return () => {
      unsubOps();
      adapter.disconnect();
      adapterRef.current = null;
    };
  }, [projectId, user?.id, role, setUserRole, profile?.displayName, profile?.avatarUrl]);

  const publishOperation = useCallback(async (op: EditorOperation) => {
    if (adapterRef.current) {
      await adapterRef.current.publishOperation(op);
    }
  }, []);

  const publishCursor = useCallback(async (x: number, y: number, tool?: string) => {
    if (adapterRef.current) {
      await adapterRef.current.publishCursor({ x, y, tool });
    }
  }, []);

  const publishSelection = useCallback(async (layerId: string) => {
    if (adapterRef.current) {
      await adapterRef.current.publishSelection(layerId);
    }
  }, []);

  const publishPresence = useCallback(async (activeTool?: string) => {
    if (adapterRef.current) {
      await adapterRef.current.publishPresence(activeTool);
    }
  }, []);

  return {
    connected,
    connectionState,
    collaborators,
    remoteCursors,
    remoteSelections,
    isSaving,
    pendingOperationsCount,
    publishOperation,
    publishCursor,
    publishSelection,
    publishPresence,
  };
}

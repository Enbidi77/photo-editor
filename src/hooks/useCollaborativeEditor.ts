'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCollaboration } from './useCollaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useAuthStore } from '@/store/authStore';
import { useToolStore } from '@/store/toolStore';
import { useLayerStore } from '@/store/layerStore';
import { useDocumentStore } from '@/store/documentStore';
import { operationBridge } from '@/lib/collaboration/operationBridge';
import { remoteProjectRepository } from '@/lib/projects/remoteProjectRepository';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { UserRole } from '@/types/auth';

export function useCollaborativeEditor(projectId: string | null, role: UserRole = 'editor') {
  const { user } = useAuthStore();
  const { activeTool } = useToolStore();
  const { activeLayerId } = useLayerStore();
  const { document: doc, setDirty } = useDocumentStore();
  const { setIsSaving } = useCollaborationStore();

  const collaboration = useCollaboration(projectId, role);
  const { publishOperation, publishCursor, publishSelection, publishPresence } = collaboration;

  // 1. Maintain context in operationBridge
  useEffect(() => {
    const currentUserId = user?.id || `anon-${Math.random()}`;
    operationBridge.setContext(projectId, currentUserId);

    return () => {
      operationBridge.setContext(null, null);
    };
  }, [projectId, user?.id]);

  // 2. Subscribe operationBridge to publishOperation
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = operationBridge.subscribe((op) => {
      publishOperation(op);
    });

    return unsubscribe;
  }, [projectId, publishOperation]);

  // 3. Broadcast layer selection changes
  useEffect(() => {
    if (!projectId || !activeLayerId) return;
    publishSelection(activeLayerId);
  }, [projectId, activeLayerId, publishSelection]);

  // 4. Broadcast active tool presence changes
  useEffect(() => {
    if (!projectId) return;
    publishPresence(activeTool);
  }, [projectId, activeTool, publishPresence]);

  // 5. Throttled cursor publishing helper
  const lastCursorSendRef = useRef(0);
  const handlePointerMove = useCallback(
    (docX: number, docY: number) => {
      if (!projectId) return;
      const now = Date.now();
      if (now - lastCursorSendRef.current >= 50) {
        lastCursorSendRef.current = now;
        publishCursor(docX, docY, activeTool);
      }
    },
    [projectId, activeTool, publishCursor]
  );

  // 6. Debounced auto-save to cloud repository every 4 seconds when document is dirty
  useEffect(() => {
    if (!projectId || !doc || !doc.isDirty) return;

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        const project = PxfSerializer.serialize();
        await remoteProjectRepository.save(project);
        setDirty(false);
      } catch (err) {
        console.warn('Collaborative auto-save failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [projectId, doc, doc?.isDirty, setDirty, setIsSaving]);

  return {
    ...collaboration,
    handlePointerMove,
  };
}

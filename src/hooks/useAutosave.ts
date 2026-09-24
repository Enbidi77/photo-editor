'use client';

import { useEffect, useRef, useCallback } from 'react';
import { UserRole } from '@/types/auth';
import { AutosaveController } from '@/lib/storage/autosave/AutosaveController';
import { useAutosaveStore } from '@/store/autosaveStore';
import { SaveResult } from '@/types/autosave';

export interface UseAutosaveOptions {
  projectId: string | null;
  userRole?: UserRole;
  debounceMs?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

export function useAutosave({
  projectId,
  userRole = 'editor',
  debounceMs = 1500,
  maxIntervalMs = 20000,
  enabled = true,
}: UseAutosaveOptions) {
  const controllerRef = useRef<AutosaveController | null>(null);

  // Autosave store state
  const status = useAutosaveStore((s) => s.status);
  const statusMessage = useAutosaveStore((s) => s.statusMessage);
  const isDirty = useAutosaveStore((s) => s.isDirty);
  const lastSavedTime = useAutosaveStore((s) => s.lastSavedTime);
  const lastError = useAutosaveStore((s) => s.lastError);

  // Initialize controller once on mount
  useEffect(() => {
    const controller = new AutosaveController({
      projectId,
      userRole,
      debounceMs,
      maxIntervalMs,
      enabled,
    });
    controllerRef.current = controller;

    return () => {
      // Flush before unmounting if dirty
      if (controller.isDirty()) {
        controller.flushPendingSave('lifecycle');
      }
      controller.destroy();
      controllerRef.current = null;
    };
  }, [projectId]);

  // Keep options updated when props change without destroying controller
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig({
        projectId,
        userRole,
        debounceMs,
        maxIntervalMs,
        enabled,
      });
    }
  }, [projectId, userRole, debounceMs, maxIntervalMs, enabled]);

  const forceSave = useCallback(async (): Promise<SaveResult> => {
    if (!controllerRef.current) {
      return {
        success: false,
        error: 'Autosave controller is not initialized',
        savedLocally: false,
        savedRemotely: false,
      };
    }
    return controllerRef.current.forceSave();
  }, []);

  return {
    status,
    statusMessage,
    isDirty,
    lastSavedTime,
    lastError,
    forceSave,
    controller: controllerRef.current,
  };
}

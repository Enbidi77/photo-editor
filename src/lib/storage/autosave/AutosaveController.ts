import { UserRole } from '@/types/auth';
import { PixelForgeProject } from '@/types/project';
import { AutosaveOptions, AutosaveStatus, SaveResult, SaveTrigger } from '@/types/autosave';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { IProjectRepository, projectRepository } from '@/lib/storage/projectRepository';
import { RemoteProjectRepository, remoteProjectRepository } from '@/lib/projects/remoteProjectRepository';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useAutosaveStore } from '@/store/autosaveStore';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getIsApplyingRemoteOperation } from '@/lib/collaboration/operations';

/**
 * AUTOSAVE PERSISTENCE POLICY:
 * 
 * 1. Local Projects (e.g. 'default-doc', 'local-*', or unconfigured Supabase):
 *    - Primary persistence is IndexedDB via `LocalProjectRepository`.
 *    - Saves are considered complete and clean as soon as IndexedDB writes succeed.
 *    - Status transitions to "Saved" with `isDirty = false`.
 *
 * 2. Cloud Projects (projects with remote backend ID and active Supabase configuration):
 *    - Two-stage resilience: Local IndexedDB first (immediate safety cache), then Remote API PATCH.
 *    - If offline: local write succeeds, project queued in `offlineQueue`, status: "Changes saved locally — waiting to sync" or "Offline".
 *    - If online: remote PATCH executes. On success: status: "Saved", `isDirty = false`.
 *    - If remote PATCH fails: local write preserved intact, status: "Save failed — retrying", queued with bounded exponential backoff.
 *
 * 3. Viewer Permissions:
 *    - Users with role 'viewer' have read-only access.
 *    - Autosave and manual save are hard-blocked for viewers.
 *
 * 4. Remote Collaboration Loop Prevention:
 *    - Remote operations applied via `applyRemoteOperation` are flagged.
 *    - Store subscriptions suppress dirty marking and save timers during remote operation execution.
 */

export function computeProjectFingerprint(project: PixelForgeProject): string {
  // Stable JSON string without volatile timestamps for equality comparison
  return JSON.stringify({
    id: project.id,
    doc: {
      name: project.document.name,
      width: project.document.width,
      height: project.document.height,
      resolution: project.document.resolution,
      backgroundColor: project.document.backgroundColor,
      colorMode: project.document.colorMode,
    },
    layers: project.layers,
  });
}

export class AutosaveController {
  private projectId: string | null = null;
  private userRole: UserRole = 'editor';
  private debounceMs = 1500;
  private maxIntervalMs = 20000;
  private baseRetryDelayMs = 1000;
  private maxRetryDelayMs = 30000;
  private enabled = true;

  private localRepository: IProjectRepository;
  private remoteRepository: RemoteProjectRepository;

  private firstDirtyTime: number | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxIntervalTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private retryAttempt = 0;
  private isSaving = false;
  private latestRequestId = 0;
  private lastSavedFingerprint: string | null = null;
  private offlineQueue: PixelForgeProject | null = null;

  private unsubscribers: (() => void)[] = [];
  private isDestroyed = false;

  constructor(options: AutosaveOptions = { projectId: null }) {
    this.projectId = options.projectId;
    this.userRole = options.userRole || 'editor';
    if (options.debounceMs !== undefined) this.debounceMs = options.debounceMs;
    if (options.maxIntervalMs !== undefined) this.maxIntervalMs = options.maxIntervalMs;
    if (options.baseRetryDelayMs !== undefined) this.baseRetryDelayMs = options.baseRetryDelayMs;
    if (options.maxRetryDelayMs !== undefined) this.maxRetryDelayMs = options.maxRetryDelayMs;
    if (options.enabled !== undefined) this.enabled = options.enabled;

    this.localRepository = options.localRepository || projectRepository;
    this.remoteRepository = options.remoteRepository || remoteProjectRepository;

    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // 1. Subscribe to document store changes (meaningful doc metadata)
    const unsubDoc = useDocumentStore.subscribe((state, prevState) => {
      if (this.isDestroyed || !this.enabled || this.userRole === 'viewer') return;
      if (getIsApplyingRemoteOperation()) return;

      const curDoc = state.document;
      const prevDoc = prevState.document;
      if (!curDoc) return;

      // Check if meaningful metadata changed (ignore updatedAt / isDirty changes alone)
      const hasChanged =
        !prevDoc ||
        curDoc.id !== prevDoc.id ||
        curDoc.name !== prevDoc.name ||
        curDoc.width !== prevDoc.width ||
        curDoc.height !== prevDoc.height ||
        curDoc.resolution !== prevDoc.resolution ||
        curDoc.backgroundColor !== prevDoc.backgroundColor ||
        curDoc.colorMode !== prevDoc.colorMode;

      if (hasChanged) {
        this.markDirty();
      }
    });
    this.unsubscribers.push(unsubDoc);

    // 2. Subscribe to layer store changes (layers array identity/content changes)
    const unsubLayers = useLayerStore.subscribe((state, prevState) => {
      if (this.isDestroyed || !this.enabled || this.userRole === 'viewer') return;
      if (getIsApplyingRemoteOperation()) return;

      // Note: activeLayerId, selectedLayerIds, editingMaskLayerId do not change state.layers
      if (state.layers !== prevState.layers) {
        this.markDirty();
      }
    });
    this.unsubscribers.push(unsubLayers);

    // 3. Attach browser lifecycle listeners for flushing pending saves
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        this.flushPendingSave('lifecycle');
      }
    };

    const handlePageHide = () => {
      this.flushPendingSave('lifecycle');
    };

    const handleBeforeUnload = () => {
      this.flushPendingSave('lifecycle');
    };

    const handleOnline = () => {
      if (this.offlineQueue || this.retryTimer) {
        this.retrySync();
      }
    };

    const handleOffline = () => {
      if (this.isCloudProject()) {
        useAutosaveStore.getState().setStatus('offline');
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.unsubscribers.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange));
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      this.unsubscribers.push(() => {
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      });
    }

    // Initialize baseline fingerprint from current state if available
    this.updateBaselineFingerprint();
  }

  public updateConfig(options: Partial<AutosaveOptions>): void {
    if (options.projectId !== undefined && options.projectId !== this.projectId) {
      // Switching project: flush pending save for old project, then reset
      if (this.isDirty()) {
        this.flushPendingSave('lifecycle');
      }
      this.projectId = options.projectId;
      this.resetProjectState();
    }
    if (options.userRole !== undefined) this.userRole = options.userRole;
    if (options.debounceMs !== undefined) this.debounceMs = options.debounceMs;
    if (options.maxIntervalMs !== undefined) this.maxIntervalMs = options.maxIntervalMs;
    if (options.baseRetryDelayMs !== undefined) this.baseRetryDelayMs = options.baseRetryDelayMs;
    if (options.maxRetryDelayMs !== undefined) this.maxRetryDelayMs = options.maxRetryDelayMs;
    if (options.enabled !== undefined) this.enabled = options.enabled;
    if (options.localRepository) this.localRepository = options.localRepository;
    if (options.remoteRepository) this.remoteRepository = options.remoteRepository;
  }

  public isCloudProject(): boolean {
    if (!this.projectId) return false;
    if (this.projectId.startsWith('local-') || this.projectId === 'default-doc') return false;
    return isSupabaseConfigured();
  }

  public isDirty(): boolean {
    return useAutosaveStore.getState().isDirty || Boolean(this.debounceTimer);
  }

  public markDirty(): void {
    if (this.userRole === 'viewer') return;

    useAutosaveStore.getState().setDirty(true);
    useDocumentStore.getState().setDirty(true);

    this.scheduleSave();
  }

  private scheduleSave(): void {
    const now = Date.now();

    // 1. Initialize firstDirtyTime for max interval calculation
    if (this.firstDirtyTime === null) {
      this.firstDirtyTime = now;
    }

    // 2. Check if maximum save interval has elapsed during sustained editing
    const elapsed = now - this.firstDirtyTime;
    if (elapsed >= this.maxIntervalMs) {
      // Max interval reached — flush save immediately
      this.clearTimers();
      this.save('interval');
      return;
    }

    // 3. Reset debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.save('debounce');
    }, this.debounceMs);

    // 4. Ensure max interval timer is running
    if (!this.maxIntervalTimer) {
      const remainingTime = Math.max(0, this.maxIntervalMs - elapsed);
      this.maxIntervalTimer = setTimeout(() => {
        this.maxIntervalTimer = null;
        this.save('interval');
      }, remainingTime);
    }
  }

  public flushPendingSave(trigger: SaveTrigger = 'manual'): Promise<SaveResult> {
    this.clearTimers();
    return this.save(trigger);
  }

  public async forceSave(): Promise<SaveResult> {
    return this.flushPendingSave('manual');
  }

  public async save(trigger: SaveTrigger = 'debounce', options?: { keepalive?: boolean }): Promise<SaveResult> {
    if (this.userRole === 'viewer') {
      return {
        success: false,
        error: 'Viewers have read-only access and cannot save changes.',
        savedLocally: false,
        savedRemotely: false,
      };
    }

    const doc = useDocumentStore.getState().document;
    if (!doc) {
      return {
        success: false,
        error: 'No active document to save.',
        savedLocally: false,
        savedRemotely: false,
      };
    }

    this.clearTimers();

    let project: PixelForgeProject;
    try {
      project = PxfSerializer.serialize();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Serialization failed',
        savedLocally: false,
        savedRemotely: false,
      };
    }

    // Compare fingerprint to prevent redundant writes of unchanged snapshots
    const fingerprint = computeProjectFingerprint(project);
    if (fingerprint === this.lastSavedFingerprint && !this.offlineQueue && trigger !== 'manual') {
      this.firstDirtyTime = null;
      useAutosaveStore.getState().setDirty(false);
      useDocumentStore.getState().setDirty(false);
      useAutosaveStore.getState().setStatus('saved');
      return {
        success: true,
        savedLocally: true,
        savedRemotely: true,
      };
    }

    // Stale write / latest-request guard
    const requestId = ++this.latestRequestId;
    this.isSaving = true;
    useAutosaveStore.getState().setStatus('saving');

    let savedLocally = false;
    let savedRemotely = false;

    try {
      // Step 1: Local IndexedDB Save (always first for zero data loss)
      await this.localRepository.save(project);
      savedLocally = true;

      // Stale check
      if (requestId !== this.latestRequestId) {
        return {
          success: false,
          isStale: true,
          savedLocally: true,
          savedRemotely: false,
        };
      }

      // Step 2: Policy check — Is it a local-only project?
      if (!this.isCloudProject()) {
        // Local project: IndexedDB save is the complete persistence!
        this.lastSavedFingerprint = fingerprint;
        this.firstDirtyTime = null;
        this.offlineQueue = null;

        useAutosaveStore.getState().setDirty(false);
        useDocumentStore.getState().setDirty(false);
        useAutosaveStore.getState().setLastSavedTime(Date.now());
        useAutosaveStore.getState().setLastError(null);
        useAutosaveStore.getState().setStatus('saved');

        return {
          success: true,
          savedLocally: true,
          savedRemotely: false,
        };
      }

      // Step 3: Cloud Project Remote Sync
      const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;

      if (!isOnline) {
        this.offlineQueue = project;
        useAutosaveStore.getState().setStatus('saved-locally-waiting-sync');
        return {
          success: true,
          savedLocally: true,
          savedRemotely: false,
        };
      }

      // Online: perform remote write
      await this.remoteRepository.saveRemote(project, { keepalive: options?.keepalive });

      // Stale check after async network call
      if (requestId !== this.latestRequestId) {
        return {
          success: false,
          isStale: true,
          savedLocally: true,
          savedRemotely: true,
        };
      }

      savedRemotely = true;
      this.lastSavedFingerprint = fingerprint;
      this.firstDirtyTime = null;
      this.offlineQueue = null;
      this.retryAttempt = 0;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }

      useAutosaveStore.getState().setDirty(false);
      useDocumentStore.getState().setDirty(false);
      useAutosaveStore.getState().setLastSavedTime(Date.now());
      useAutosaveStore.getState().setLastError(null);
      useAutosaveStore.getState().setStatus('saved');

      return {
        success: true,
        savedLocally: true,
        savedRemotely: true,
      };
    } catch (err: any) {
      if (requestId !== this.latestRequestId) {
        return {
          success: false,
          isStale: true,
          savedLocally,
          savedRemotely: false,
        };
      }

      // Remote write failed: keep local data intact, queue retry with exponential backoff
      this.offlineQueue = project;
      const errorMsg = err?.message || 'Network error during cloud sync';
      useAutosaveStore.getState().setLastError(errorMsg);
      useAutosaveStore.getState().setStatus('failed-retrying');

      this.scheduleRetry();

      return {
        success: false,
        error: errorMsg,
        savedLocally,
        savedRemotely: false,
      };
    } finally {
      if (requestId === this.latestRequestId) {
        this.isSaving = false;
      }
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);

    // Bounded exponential backoff with jitter
    const exponential = this.baseRetryDelayMs * Math.pow(2, this.retryAttempt++);
    const delay = Math.min(this.maxRetryDelayMs, exponential) + Math.floor(Math.random() * 200);

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.retrySync();
    }, delay);
  }

  public async retrySync(): Promise<void> {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (!this.offlineQueue) {
      // Nothing queued; check if dirty
      if (this.isDirty()) {
        await this.save('debounce');
      }
      return;
    }

    const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (!isOnline) {
      useAutosaveStore.getState().setStatus('offline');
      return;
    }

    const projectToSync = this.offlineQueue;
    const requestId = ++this.latestRequestId;
    useAutosaveStore.getState().setStatus('saving');

    try {
      await this.remoteRepository.saveRemote(projectToSync);

      if (requestId !== this.latestRequestId) return;

      this.offlineQueue = null;
      this.retryAttempt = 0;
      this.lastSavedFingerprint = computeProjectFingerprint(projectToSync);
      this.firstDirtyTime = null;

      useAutosaveStore.getState().setDirty(false);
      useDocumentStore.getState().setDirty(false);
      useAutosaveStore.getState().setLastSavedTime(Date.now());
      useAutosaveStore.getState().setLastError(null);
      useAutosaveStore.getState().setStatus('saved');
    } catch (err: any) {
      if (requestId !== this.latestRequestId) return;

      const errorMsg = err?.message || 'Retry sync failed';
      useAutosaveStore.getState().setLastError(errorMsg);
      useAutosaveStore.getState().setStatus('failed-retrying');
      this.scheduleRetry();
    }
  }

  public updateBaselineFingerprint(): void {
    try {
      const doc = useDocumentStore.getState().document;
      if (doc) {
        const project = PxfSerializer.serialize();
        this.lastSavedFingerprint = computeProjectFingerprint(project);
      }
    } catch {
      // Ignore if document not loaded yet
    }
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxIntervalTimer) {
      clearTimeout(this.maxIntervalTimer);
      this.maxIntervalTimer = null;
    }
  }

  private resetProjectState(): void {
    this.clearTimers();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.firstDirtyTime = null;
    this.offlineQueue = null;
    this.retryAttempt = 0;
    this.latestRequestId++;
    this.lastSavedFingerprint = null;
    this.updateBaselineFingerprint();
    useAutosaveStore.getState().reset();
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.clearTimers();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore unbind errors
      }
    });
    this.unsubscribers = [];
  }
}

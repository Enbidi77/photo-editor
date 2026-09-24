import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutosaveController } from '@/lib/storage/autosave/AutosaveController';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useAutosaveStore } from '@/store/autosaveStore';
import { applyRemoteOperation, OperationFactory } from '@/lib/collaboration/operations';
import { ShapeLayer } from '@/types/layer';
import { PixelForgeProject } from '@/types/project';

describe('Autosave Subsystem', () => {
  let controller: AutosaveController;
  let mockLocalRepo: { save: ReturnType<typeof vi.fn> };
  let mockRemoteRepo: { save: ReturnType<typeof vi.fn>; saveRemote: ReturnType<typeof vi.fn> };

  const sampleLayer: ShapeLayer = {
    id: 'layer-auto-1',
    type: 'SHAPE',
    name: 'Auto Rectangle',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    shapeKind: 'rect',
    fill: '#00ffaa',
    stroke: '#000000',
    strokeWidth: 1,
  };

  beforeEach(() => {
    vi.useFakeTimers();

    useLayerStore.getState().clearLayers();
    useDocumentStore.getState().createNewDocument('Autosave Doc', 800, 600);
    useAutosaveStore.getState().reset();

    mockLocalRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    };

    mockRemoteRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      saveRemote: vi.fn().mockResolvedValue(undefined),
    };

    controller = new AutosaveController({
      projectId: 'local-proj-test',
      userRole: 'editor',
      debounceMs: 1500,
      maxIntervalMs: 20000,
      localRepository: mockLocalRepo as any,
      remoteRepository: mockRemoteRepo as any,
    });
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // 1. Detection of meaningful changes
  it('detects meaningful document metadata changes and marks dirty', () => {
    expect(useAutosaveStore.getState().isDirty).toBe(false);

    // Update document name
    useDocumentStore.getState().updateDocument({ name: 'Renamed Project' });

    expect(useAutosaveStore.getState().isDirty).toBe(true);
    expect(useDocumentStore.getState().document?.isDirty).toBe(true);
  });

  it('detects layer additions and property modifications as meaningful changes', () => {
    expect(useAutosaveStore.getState().isDirty).toBe(false);

    // Add a layer
    useLayerStore.getState().addLayer(sampleLayer);

    expect(useAutosaveStore.getState().isDirty).toBe(true);

    // Reset dirty flag
    useAutosaveStore.getState().setDirty(false);
    expect(useAutosaveStore.getState().isDirty).toBe(false);

    // Update layer opacity
    useLayerStore.getState().setLayerOpacity(sampleLayer.id, 0.5);
    expect(useAutosaveStore.getState().isDirty).toBe(true);
  });

  it('does NOT mark dirty when only selection or active layer changes', () => {
    useLayerStore.getState().addLayer(sampleLayer);
    useAutosaveStore.getState().setDirty(false);

    // Changing selection should not change state.layers
    useLayerStore.getState().setActiveLayerId(sampleLayer.id);
    useLayerStore.getState().setSelectedLayerIds([sampleLayer.id]);

    expect(useAutosaveStore.getState().isDirty).toBe(false);
  });

  // 2. Debounce behavior and save coalescing
  it('debounces multiple rapid changes into a single coalesced save', async () => {
    useLayerStore.getState().addLayer(sampleLayer);
    vi.advanceTimersByTime(500);

    useLayerStore.getState().setLayerOpacity(sampleLayer.id, 0.8);
    vi.advanceTimersByTime(500);

    useLayerStore.getState().setLayerOpacity(sampleLayer.id, 0.6);
    vi.advanceTimersByTime(500);

    // 1500ms since start, but only 500ms since last change: save should not have fired yet
    expect(mockLocalRepo.save).not.toHaveBeenCalled();

    // Advance by the full debounce interval (1500ms) after the last change
    await vi.advanceTimersByTimeAsync(1500);

    // Should have saved exactly once
    expect(mockLocalRepo.save).toHaveBeenCalledTimes(1);
    expect(useAutosaveStore.getState().isDirty).toBe(false);
    expect(useAutosaveStore.getState().status).toBe('saved');
  });

  // 3. Maximum-save interval
  it('forces a save at the maximum interval during sustained continuous editing', async () => {
    useLayerStore.getState().addLayer(sampleLayer);

    // Simulate sustained editing: a change every 1000ms for 22 seconds
    // Without maxInterval, debounce (1500ms) would keep resetting indefinitely
    for (let i = 0; i < 21; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      useLayerStore.getState().updateLayer(sampleLayer.id, { x: i * 2 });
    }

    // Since maxInterval is 20000ms (20s), at least one save MUST have fired before 22s
    expect(mockLocalRepo.save).toHaveBeenCalled();
  });

  // 4. Project switch and unmount cleanup
  it('cleans up timers and unbinds listeners on destroy', async () => {
    useLayerStore.getState().addLayer(sampleLayer);
    expect(useAutosaveStore.getState().isDirty).toBe(true);

    controller.destroy();

    // Advancing timers should not execute any save because controller is destroyed
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockLocalRepo.save).not.toHaveBeenCalled();

    // New store changes after destroy should not mark dirty or trigger saves
    useDocumentStore.getState().updateDocument({ name: 'Post Destroy Name' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockLocalRepo.save).not.toHaveBeenCalled();
  });

  it('flushes pending save when switching project', async () => {
    useLayerStore.getState().addLayer(sampleLayer);
    expect(useAutosaveStore.getState().isDirty).toBe(true);

    // Switch project
    controller.updateConfig({ projectId: 'new-project-id' });

    // The old project changes should have been flushed immediately
    expect(mockLocalRepo.save).toHaveBeenCalledTimes(1);
  });

  // 5. Manual force-save
  it('executes manual force-save immediately without waiting for debounce', async () => {
    useLayerStore.getState().addLayer(sampleLayer);
    expect(mockLocalRepo.save).not.toHaveBeenCalled();

    const result = await controller.forceSave();

    expect(result.success).toBe(true);
    expect(result.savedLocally).toBe(true);
    expect(mockLocalRepo.save).toHaveBeenCalledTimes(1);
    expect(useAutosaveStore.getState().status).toBe('saved');
    expect(useAutosaveStore.getState().isDirty).toBe(false);
  });

  // 6. Offline local save plus queued remote sync
  it('saves locally to IndexedDB and queues remote sync when offline, then syncs on reconnect', async () => {
    // Configure as a cloud project
    vi.spyOn(controller, 'isCloudProject').mockReturnValue(true);

    // Simulate browser offline
    const originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });

    useLayerStore.getState().addLayer(sampleLayer);
    await vi.advanceTimersByTimeAsync(1500);

    // Local repository must have been saved
    expect(mockLocalRepo.save).toHaveBeenCalledTimes(1);
    // Remote save must NOT have been called while offline
    expect(mockRemoteRepo.saveRemote).not.toHaveBeenCalled();
    // Status reflects local save waiting to sync
    expect(useAutosaveStore.getState().status).toBe('saved-locally-waiting-sync');

    // Simulate coming back online
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });

    // Trigger retry sync
    await controller.retrySync();

    expect(mockRemoteRepo.saveRemote).toHaveBeenCalledTimes(1);
    expect(useAutosaveStore.getState().status).toBe('saved');

    // Restore navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  // 7. Retry after a failed remote save
  it('queues retry with exponential backoff when remote sync fails', async () => {
    vi.spyOn(controller, 'isCloudProject').mockReturnValue(true);
    mockRemoteRepo.saveRemote.mockRejectedValueOnce(new Error('500 Internal Server Error'));

    useLayerStore.getState().addLayer(sampleLayer);
    await vi.advanceTimersByTimeAsync(1500);

    // Local save succeeded
    expect(mockLocalRepo.save).toHaveBeenCalledTimes(1);
    // Remote failed
    expect(mockRemoteRepo.saveRemote).toHaveBeenCalledTimes(1);
    expect(useAutosaveStore.getState().status).toBe('failed-retrying');

    // Now mock remote success for next retry
    mockRemoteRepo.saveRemote.mockResolvedValueOnce(undefined);

    // Advance time past initial backoff (1000ms + jitter)
    await vi.advanceTimersByTimeAsync(2000);

    // Remote sync should have retried and succeeded
    expect(mockRemoteRepo.saveRemote).toHaveBeenCalledTimes(2);
    expect(useAutosaveStore.getState().status).toBe('saved');
  });

  // 8. Permission restrictions for viewers
  it('strictly blocks autosave and manual save for viewer role', async () => {
    controller.destroy();

    const viewerController = new AutosaveController({
      projectId: 'viewer-project',
      userRole: 'viewer',
      localRepository: mockLocalRepo as any,
      remoteRepository: mockRemoteRepo as any,
    });

    // Viewers making layer changes
    useLayerStore.getState().addLayer(sampleLayer);
    await vi.advanceTimersByTimeAsync(3000);

    expect(mockLocalRepo.save).not.toHaveBeenCalled();
    expect(useAutosaveStore.getState().isDirty).toBe(false);

    // Force save by viewer must fail
    const result = await viewerController.forceSave();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Viewers have read-only access');
    expect(mockLocalRepo.save).not.toHaveBeenCalled();

    viewerController.destroy();
  });

  // 9. Stale-request protection
  it('guards against stale asynchronous write completions', async () => {
    vi.spyOn(controller, 'isCloudProject').mockReturnValue(true);

    let resolveFirstRemote: () => void = () => {};
    const firstRemotePromise = new Promise<void>((resolve) => {
      resolveFirstRemote = resolve;
    });

    // Request 1 hangs on remote save
    mockRemoteRepo.saveRemote.mockImplementationOnce(() => firstRemotePromise);

    // Trigger Request 1
    const savePromise1 = controller.save('manual');

    // Make another change and trigger Request 2 before Request 1 resolves
    mockRemoteRepo.saveRemote.mockResolvedValueOnce(undefined);
    const savePromise2 = controller.save('manual');

    // Resolve Request 1 afterwards
    resolveFirstRemote();

    const [res1, res2] = await Promise.all([savePromise1, savePromise2]);

    // Request 1 is identified as stale
    expect(res1.isStale).toBe(true);
    // Request 2 is fresh and succeeds
    expect(res2.success).toBe(true);
    expect(useAutosaveStore.getState().status).toBe('saved');
  });

  // 10. Remote collaboration events not causing local autosaves
  it('does NOT trigger local autosaves or dirty flags on remote collaboration operations', async () => {
    const remoteOp = OperationFactory.addLayer('collab-proj', 'remote-user-99', sampleLayer, 0);

    expect(useAutosaveStore.getState().isDirty).toBe(false);

    // Apply remote operation
    const applied = applyRemoteOperation(remoteOp);
    expect(applied).toBe(true);

    // Should NOT mark dirty
    expect(useAutosaveStore.getState().isDirty).toBe(false);

    // Advance timers — no save should fire
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockLocalRepo.save).not.toHaveBeenCalled();
  });

  // 11. Dirty and save status transitions
  it('properly transitions through status states during save lifecycle', async () => {
    let capturedStatuses: string[] = [];
    const unsub = useAutosaveStore.subscribe((state) => {
      capturedStatuses.push(state.status);
    });

    useLayerStore.getState().addLayer(sampleLayer);
    expect(useAutosaveStore.getState().isDirty).toBe(true);

    await vi.advanceTimersByTimeAsync(1500);

    expect(capturedStatuses).toContain('saving');
    expect(capturedStatuses).toContain('saved');
    expect(useAutosaveStore.getState().status).toBe('saved');
    expect(useAutosaveStore.getState().lastSavedTime).toBeGreaterThan(0);

    unsub();
  });
});

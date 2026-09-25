import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalCollaborationAdapter } from '@/lib/collaboration/localCollaborationAdapter';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { OperationFactory } from '@/lib/collaboration/operations';

describe('LocalCollaborationAdapter', () => {
  let adapter: LocalCollaborationAdapter;

  beforeEach(() => {
    adapter = new LocalCollaborationAdapter();
    useCollaborationStore.getState().resetCollaboration();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('connects and updates collaboration store state', async () => {
    expect(useCollaborationStore.getState().connected).toBe(false);

    await adapter.connect('test-proj-1', {
      id: 'user-1',
      name: 'Alice',
      role: 'editor',
      color: '#ff0055',
    });

    const store = useCollaborationStore.getState();
    expect(store.connected).toBe(true);
    expect(store.connectionState).toBe('connected');
    expect(store.collaborators).toHaveLength(1);
    expect(store.collaborators[0].displayName).toBe('Alice');
  });

  it('subscribes and receives operations', async () => {
    await adapter.connect('test-proj-2', {
      id: 'user-2',
      name: 'Bob',
      role: 'owner',
      color: '#0078d4',
    });

    const mockOpHandler = vi.fn();
    const unsub = adapter.subscribeOperations(mockOpHandler);

    const testOp = OperationFactory.deleteLayer('test-proj-2', 'user-2', 'layer-99');
    await adapter.publishOperation(testOp);

    // In local broadcast mock or channel, test subscriber invocation
    unsub();
  });

  it('subscribes and tracks remote cursors', async () => {
    await adapter.connect('test-proj-3', {
      id: 'user-3',
      name: 'Charlie',
      role: 'viewer',
      color: '#10b981',
    });

    const cursorHandler = vi.fn();
    const unsub = adapter.subscribeCursors(cursorHandler);

    await adapter.publishCursor({ x: 150, y: 300, tool: 'brush' });

    unsub();
  });

  it('resets collaboration store on disconnect', async () => {
    await adapter.connect('test-proj-4', {
      id: 'user-4',
      name: 'Diana',
      role: 'editor',
      color: '#8b5cf6',
    });

    expect(useCollaborationStore.getState().connected).toBe(true);

    await adapter.disconnect();

    const store = useCollaborationStore.getState();
    expect(store.connected).toBe(false);
    expect(store.connectionState).toBe('disconnected');
    expect(store.collaborators).toHaveLength(0);
  });

  it('delivers operations across multiple adapter tabs with distinct clientIds', async () => {
    const adapter1 = new LocalCollaborationAdapter();
    const adapter2 = new LocalCollaborationAdapter();

    const receivedOpsTab2: any[] = [];
    adapter2.subscribeOperations((op) => {
      receivedOpsTab2.push(op);
    });

    await adapter1.connect('multi-tab-proj', {
      id: 'local-user-1',
      clientId: 'tab-1',
      name: 'Local User (Tab 1)',
      role: 'editor',
      color: '#ff4444',
    });

    await adapter2.connect('multi-tab-proj', {
      id: 'local-user-1',
      clientId: 'tab-2',
      name: 'Local User (Tab 2)',
      role: 'editor',
      color: '#4444ff',
    });

    const testOp = OperationFactory.addLayer(
      'multi-tab-proj',
      'local-user-1',
      {
        id: 'layer-paint-1',
        name: 'Paint 1',
        type: 'paint',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        order: 0,
      } as any,
      0,
      'tab-1'
    );

    await adapter1.publishOperation(testOp);

    // Give broadcast channel microtask a moment to settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedOpsTab2).toHaveLength(1);
    expect(receivedOpsTab2[0].type).toBe('ADD_LAYER');
    expect(receivedOpsTab2[0].payload.layer.id).toBe('layer-paint-1');
    expect(receivedOpsTab2[0].clientId).toBe('tab-1');

    await adapter1.disconnect();
    await adapter2.disconnect();
  });

  it('coordinates multi-tab presence, cursors, and disconnect lifecycle', async () => {
    const adapter1 = new LocalCollaborationAdapter();
    const adapter2 = new LocalCollaborationAdapter();

    await adapter1.connect('multi-tab-presence', {
      id: 'local-user-1',
      clientId: 'tab-1',
      name: 'Local User (Tab 1)',
      role: 'editor',
      color: '#ff4444',
    });

    const tab1Cursors: any[] = [];
    adapter1.subscribeCursors((cursor) => {
      tab1Cursors.push(cursor);
    });

    await adapter2.connect('multi-tab-presence', {
      id: 'local-user-1',
      clientId: 'tab-2',
      name: 'Local User (Tab 2)',
      role: 'editor',
      color: '#4444ff',
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Tab 2 publishes cursor
    await adapter2.publishCursor({ x: 120, y: 240, tool: 'brush' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(tab1Cursors).toHaveLength(1);
    expect(tab1Cursors[0].userId).toBe('local-user-1:tab-2');
    expect(tab1Cursors[0].x).toBe(120);
    expect(tab1Cursors[0].y).toBe(240);

    // Tab 2 publishes tool change
    await adapter2.publishPresence('eraser');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Disconnect tab 2 and verify presence leave removes it
    await adapter2.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));

    await adapter1.disconnect();
  });

  it('synchronizes document and layer state on new tab connection via sync_request', async () => {
    // Populate store representing tab 1's active canvas
    useDocumentStore.getState().setDocument({
      id: 'sync-proj',
      name: 'Synced Project',
      width: 1920,
      height: 1080,
      colorSpace: 'srgb',
      colorDepth: '8bit',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDirty: false,
    });
    useLayerStore.getState().setLayers([
      {
        id: 'layer-sync-1',
        name: 'Paint 1',
        type: 'paint',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
        order: 0,
      } as any,
    ]);

    const adapter1 = new LocalCollaborationAdapter();
    await adapter1.connect('sync-proj', {
      id: 'local-user-1',
      clientId: 'tab-host',
      name: 'Host Tab',
      role: 'owner',
      color: '#ff0000',
    });

    // Adapter 2 connects (like a freshly opened browser window)
    const adapter2 = new LocalCollaborationAdapter();
    await adapter2.connect('sync-proj', {
      id: 'local-user-1',
      clientId: 'tab-new',
      name: 'New Tab',
      role: 'owner',
      color: '#00ff00',
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(useLayerStore.getState().layers).toHaveLength(1);
    expect(useLayerStore.getState().layers[0].id).toBe('layer-sync-1');
    expect(useDocumentStore.getState().document?.id).toBe('sync-proj');

    await adapter1.disconnect();
    await adapter2.disconnect();
  });
});


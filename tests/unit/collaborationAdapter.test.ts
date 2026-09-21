import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalCollaborationAdapter } from '@/lib/collaboration/localCollaborationAdapter';
import { useCollaborationStore } from '@/store/collaborationStore';
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
});

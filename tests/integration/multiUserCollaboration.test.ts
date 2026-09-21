import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore } from '@/store/layerStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import { operationBridge } from '@/lib/collaboration/operationBridge';
import { OperationFactory, applyRemoteOperation } from '@/lib/collaboration/operations';
import { AddLayerCommand, TransformLayerCommand } from '@/editor/commands/LayerCommands';
import { ShapeLayer } from '@/types/layer';

describe('Multi-User Real-Time Collaboration Integration Flow', () => {
  const layerAlpha: ShapeLayer = {
    id: 'layer-collab-alpha',
    type: 'SHAPE',
    name: 'Collaborative Banner',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 100,
    y: 100,
    width: 400,
    height: 200,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    shapeKind: 'rect',
    fill: '#3b82f6',
  };

  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useCollaborationStore.getState().resetCollaboration();
  });

  it('simulates User A adding a layer and User B synchronizing it via operations', () => {
    // 1. Simulate User A session
    operationBridge.setContext('proj-collab-1', 'user-A');
    useCollaborationStore.getState().setUserRole('owner');

    let transmittedOp: any = null;
    const unsub = operationBridge.subscribe((op) => {
      transmittedOp = op;
    });

    // User A executes AddLayerCommand
    const cmd = new AddLayerCommand(layerAlpha);
    cmd.execute();

    expect(transmittedOp).not.toBeNull();
    expect(transmittedOp.type).toBe('ADD_LAYER');
    expect(transmittedOp.userId).toBe('user-A');

    // 2. Simulate User B receiving the operation over network
    // Clear User A local state to simulate User B client
    useLayerStore.getState().clearLayers();
    expect(useLayerStore.getState().layers).toHaveLength(0);

    const applied = applyRemoteOperation(transmittedOp);
    expect(applied).toBe(true);

    const userBLayers = useLayerStore.getState().layers;
    expect(userBLayers).toHaveLength(1);
    expect(userBLayers[0].id).toBe('layer-collab-alpha');
    expect(userBLayers[0].fill).toBe('#3b82f6');

    // 3. User B moves/transforms the layer
    operationBridge.setContext('proj-collab-1', 'user-B');
    useCollaborationStore.getState().setUserRole('editor');

    let userBTransformedOp: any = null;
    const unsubB = operationBridge.subscribe((op) => {
      userBTransformedOp = op;
    });

    const transformCmd = new TransformLayerCommand(
      'layer-collab-alpha',
      { x: 100, y: 100, width: 400, height: 200, rotation: 0 },
      { x: 250, y: 350, width: 500, height: 250, rotation: 15 }
    );
    transformCmd.execute();

    expect(userBTransformedOp).not.toBeNull();
    expect(userBTransformedOp.type).toBe('TRANSFORM_LAYER');
    expect(userBTransformedOp.userId).toBe('user-B');

    // 4. Remote application back on client
    const remoteApplied = applyRemoteOperation(userBTransformedOp);
    expect(remoteApplied).toBe(true);

    const finalLayer = useLayerStore.getState().layers[0];
    expect(finalLayer.x).toBe(250);
    expect(finalLayer.y).toBe(350);
    expect(finalLayer.width).toBe(500);
    expect(finalLayer.rotation).toBe(15);

    unsub();
    unsubB();
  });

  it('tracks remote collaborator cursors and selections in collaboration store', () => {
    const store = useCollaborationStore.getState();

    // Remote collaborator moves cursor
    store.updateRemoteCursor({
      userId: 'user-remote-1',
      displayName: 'Remote Designer',
      color: '#ec4899',
      x: 320,
      y: 480,
      tool: 'brush',
    });

    expect(useCollaborationStore.getState().remoteCursors['user-remote-1']).toBeDefined();
    expect(useCollaborationStore.getState().remoteCursors['user-remote-1'].x).toBe(320);
    expect(useCollaborationStore.getState().remoteCursors['user-remote-1'].tool).toBe('brush');

    // Remote collaborator selects a layer
    store.updateRemoteSelection({
      userId: 'user-remote-1',
      layerId: 'layer-collab-alpha',
      color: '#ec4899',
    });

    expect(useCollaborationStore.getState().remoteSelections['user-remote-1']).toBeDefined();
    expect(useCollaborationStore.getState().remoteSelections['user-remote-1'].layerId).toBe('layer-collab-alpha');

    // Remote collaborator disconnects / leaves
    store.removeRemoteCursor('user-remote-1');
    store.removeRemoteSelection('user-remote-1');

    expect(useCollaborationStore.getState().remoteCursors['user-remote-1']).toBeUndefined();
    expect(useCollaborationStore.getState().remoteSelections['user-remote-1']).toBeUndefined();
  });
});

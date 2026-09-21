import { describe, it, expect, beforeEach } from 'vitest';
import { useCollaborationStore } from '@/store/collaborationStore';
import { operationBridge } from '@/lib/collaboration/operationBridge';
import { AddLayerCommand } from '@/editor/commands/LayerCommands';
import { ShapeLayer } from '@/types/layer';
import { useLayerStore } from '@/store/layerStore';

describe('Role-Based Access Control & Permission Enforcement', () => {
  const testLayer: ShapeLayer = {
    id: 'perm-layer-1',
    type: 'SHAPE',
    name: 'Perm Layer',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    shapeKind: 'rect',
    fill: '#00ff00',
  };

  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useCollaborationStore.getState().resetCollaboration();
    operationBridge.setContext('proj-perm-1', 'user-viewer-1');
  });

  it('prohibits operation broadcasting when current user is in viewer role', () => {
    useCollaborationStore.getState().setUserRole('viewer');

    let broadcastedOp = null;
    const unsub = operationBridge.subscribe((op) => {
      broadcastedOp = op;
    });

    const cmd = new AddLayerCommand(testLayer);
    cmd.execute();

    // Since role is viewer, operationBridge should NOT have broadcasted any operations
    expect(broadcastedOp).toBeNull();

    unsub();
  });

  it('allows operation broadcasting when user is in editor role', () => {
    useCollaborationStore.getState().setUserRole('editor');

    let broadcastedOp: any = null;
    const unsub = operationBridge.subscribe((op) => {
      broadcastedOp = op;
    });

    const cmd = new AddLayerCommand(testLayer);
    cmd.execute();

    expect(broadcastedOp).not.toBeNull();
    expect(broadcastedOp?.type).toBe('ADD_LAYER');
    expect(broadcastedOp?.payload.layer.id).toBe('perm-layer-1');

    unsub();
  });

  it('allows operation broadcasting when user is in owner role', () => {
    useCollaborationStore.getState().setUserRole('owner');

    let broadcastedOp: any = null;
    const unsub = operationBridge.subscribe((op) => {
      broadcastedOp = op;
    });

    const cmd = new AddLayerCommand(testLayer);
    cmd.execute();

    expect(broadcastedOp).not.toBeNull();
    expect(broadcastedOp?.type).toBe('ADD_LAYER');

    unsub();
  });
});

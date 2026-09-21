import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore } from '@/store/layerStore';
import { useDocumentStore } from '@/store/documentStore';
import { OperationFactory, applyRemoteOperation } from '@/lib/collaboration/operations';
import { ShapeLayer } from '@/types/layer';

describe('Collaboration Operations & Conflict Safety', () => {
  const sampleLayer: ShapeLayer = {
    id: 'layer-test-1',
    type: 'SHAPE',
    name: 'Test Rectangle',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 50,
    y: 50,
    width: 200,
    height: 150,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    shapeKind: 'rect',
    fill: '#ff0055',
    stroke: '#000000',
    strokeWidth: 2,
  };

  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useDocumentStore.getState().createNewDocument('Test Doc', 1920, 1080);
  });

  it('generates valid operations using OperationFactory', () => {
    const op = OperationFactory.addLayer('proj-1', 'user-1', sampleLayer, 0);

    expect(op.id).toBeDefined();
    expect(op.projectId).toBe('proj-1');
    expect(op.userId).toBe('user-1');
    expect(op.type).toBe('ADD_LAYER');
    expect(op.timestamp).toBeGreaterThan(0);
    expect(op.payload.layer.id).toBe('layer-test-1');
  });

  it('safely applies ADD_LAYER and prevents duplicate insertions', () => {
    const op = OperationFactory.addLayer('proj-1', 'user-1', sampleLayer, 0);

    const firstResult = applyRemoteOperation(op);
    expect(firstResult).toBe(true);
    expect(useLayerStore.getState().layers).toHaveLength(1);
    expect(useLayerStore.getState().layers[0].id).toBe('layer-test-1');

    // Duplicate insertion should return false (conflict safety / idempotency)
    const secondResult = applyRemoteOperation(op);
    expect(secondResult).toBe(false);
    expect(useLayerStore.getState().layers).toHaveLength(1);
  });

  it('safely applies TRANSFORM_LAYER to existing layer and no-ops for non-existent layer', () => {
    // 1. Add layer first
    useLayerStore.getState().addLayer(sampleLayer);

    // 2. Transform existing layer
    const transformOp = OperationFactory.transformLayer('proj-1', 'user-1', 'layer-test-1', {
      x: 120,
      y: 180,
      width: 300,
      height: 250,
      rotation: 45,
    });

    const result = applyRemoteOperation(transformOp);
    expect(result).toBe(true);

    const updated = useLayerStore.getState().layers.find((l) => l.id === 'layer-test-1');
    expect(updated?.x).toBe(120);
    expect(updated?.y).toBe(180);
    expect(updated?.width).toBe(300);
    expect(updated?.rotation).toBe(45);

    // 3. Attempting to transform a non-existent layer should return false without crashing
    const ghostOp = OperationFactory.transformLayer('proj-1', 'user-1', 'ghost-layer-999', {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
    });
    const ghostResult = applyRemoteOperation(ghostOp);
    expect(ghostResult).toBe(false);
  });

  it('safely applies UPDATE_OPACITY and UPDATE_BLEND_MODE', () => {
    useLayerStore.getState().addLayer(sampleLayer);

    const opacityOp = OperationFactory.updateOpacity('proj-1', 'user-2', 'layer-test-1', 0.65);
    expect(applyRemoteOperation(opacityOp)).toBe(true);
    expect(useLayerStore.getState().layers[0].opacity).toBe(0.65);

    const blendOp = OperationFactory.updateBlendMode('proj-1', 'user-2', 'layer-test-1', 'multiply');
    expect(applyRemoteOperation(blendOp)).toBe(true);
    expect(useLayerStore.getState().layers[0].blendMode).toBe('multiply');
  });

  it('safely applies REORDER_LAYER', () => {
    const layer2 = { ...sampleLayer, id: 'layer-test-2', name: 'Second' };
    useLayerStore.getState().addLayer(sampleLayer);
    useLayerStore.getState().addLayer(layer2);

    expect(useLayerStore.getState().layers[0].id).toBe('layer-test-2');
    expect(useLayerStore.getState().layers[1].id).toBe('layer-test-1');

    const reorderOp = OperationFactory.reorderLayer('proj-1', 'user-1', 0, 1);
    expect(applyRemoteOperation(reorderOp)).toBe(true);

    expect(useLayerStore.getState().layers[0].id).toBe('layer-test-1');
    expect(useLayerStore.getState().layers[1].id).toBe('layer-test-2');
  });

  it('safely applies DELETE_LAYER', () => {
    useLayerStore.getState().addLayer(sampleLayer);
    expect(useLayerStore.getState().layers).toHaveLength(1);

    const deleteOp = OperationFactory.deleteLayer('proj-1', 'user-1', 'layer-test-1');
    expect(applyRemoteOperation(deleteOp)).toBe(true);
    expect(useLayerStore.getState().layers).toHaveLength(0);
  });

  it('rejects invalid or corrupted operations gracefully', () => {
    const invalidOp: any = {
      id: 'bad-op',
      projectId: 'proj-1',
      // Missing userId, timestamp, type, payload
    };

    const result = applyRemoteOperation(invalidOp);
    expect(result).toBe(false);
  });
});

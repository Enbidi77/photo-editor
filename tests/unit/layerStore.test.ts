import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore } from '@/store/layerStore';
import { ShapeLayer } from '@/types/layer';

describe('Layer Store Slice', () => {
  beforeEach(() => {
    useLayerStore.getState().clearLayers();
  });

  it('adds layers and marks the newly added layer active', () => {
    const layer1: ShapeLayer = {
      id: 'l1',
      type: 'SHAPE',
      name: 'Rectangle 1',
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
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 1,
      cornerRadius: 0,
    };

    useLayerStore.getState().addLayer(layer1);
    const state = useLayerStore.getState();

    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].id).toBe('l1');
    expect(state.activeLayerId).toBe('l1');
  });

  it('updates layer properties correctly', () => {
    const layer1: ShapeLayer = {
      id: 'l1',
      type: 'SHAPE',
      name: 'Layer 1',
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
      fill: '#000',
      stroke: '',
      strokeWidth: 0,
      cornerRadius: 0,
    };

    useLayerStore.getState().addLayer(layer1);
    useLayerStore.getState().updateLayer('l1', { x: 50, opacity: 0.8 });

    const updated = useLayerStore.getState().layers[0];
    expect(updated.x).toBe(50);
    expect(updated.opacity).toBe(0.8);
  });

  it('reorders layers correctly', () => {
    const layer1: ShapeLayer = {
      id: 'l1',
      type: 'SHAPE',
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      shapeKind: 'rect',
      fill: '#000',
      stroke: '',
      strokeWidth: 0,
      cornerRadius: 0,
    };
    const layer2 = { ...layer1, id: 'l2', name: 'Layer 2' };

    useLayerStore.getState().addLayer(layer1);
    useLayerStore.getState().addLayer(layer2);

    expect(useLayerStore.getState().layers[0].id).toBe('l2');
    expect(useLayerStore.getState().layers[1].id).toBe('l1');

    useLayerStore.getState().reorderLayers(0, 1);

    expect(useLayerStore.getState().layers[0].id).toBe('l1');
    expect(useLayerStore.getState().layers[1].id).toBe('l2');
  });

  it('duplicates layers with a new ID and offset position', () => {
    const layer1: ShapeLayer = {
      id: 'orig',
      type: 'SHAPE',
      name: 'Original',
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
      fill: '#000',
      stroke: '',
      strokeWidth: 0,
      cornerRadius: 0,
    };

    useLayerStore.getState().addLayer(layer1);
    const duplicated = useLayerStore.getState().duplicateLayer('orig');

    expect(duplicated).not.toBeNull();
    expect(duplicated?.id).not.toBe('orig');
    expect(duplicated?.name).toBe('Original copy');
    expect(duplicated?.x).toBe(30); // 10 + 20 offset
    expect(useLayerStore.getState().layers).toHaveLength(2);
  });
});

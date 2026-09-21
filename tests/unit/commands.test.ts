import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import {
  AddLayerCommand,
  DeleteLayerCommand,
  TransformLayerCommand,
  ChangeOpacityCommand,
} from '@/editor/commands/LayerCommands';
import { ShapeLayer } from '@/types/layer';

describe('Command Pattern & Undo/Redo Engine', () => {
  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useHistoryStore.getState().clearHistory();
  });

  it('executes AddLayerCommand and supports undo and redo', async () => {
    const layer: ShapeLayer = {
      id: 'cmd-test-1',
      type: 'SHAPE',
      name: 'Test Shape',
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
      fill: '#0078d4',
      stroke: '',
      strokeWidth: 0,
      cornerRadius: 0,
    };

    const cmd = new AddLayerCommand(layer, 0);
    await useHistoryStore.getState().executeCommand(cmd);

    expect(useLayerStore.getState().layers).toHaveLength(1);
    expect(useHistoryStore.getState().canUndo()).toBe(true);

    // Undo
    await useHistoryStore.getState().undo();
    expect(useLayerStore.getState().layers).toHaveLength(0);

    // Redo
    await useHistoryStore.getState().redo();
    expect(useLayerStore.getState().layers).toHaveLength(1);
  });

  it('handles TransformLayerCommand undo/redo', async () => {
    const layer: ShapeLayer = {
      id: 'tf-1',
      type: 'SHAPE',
      name: 'Box',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      shapeKind: 'rect',
      fill: '#fff',
      stroke: '',
      strokeWidth: 0,
      cornerRadius: 0,
    };
    useLayerStore.getState().addLayer(layer);

    const prevProps = { x: 0, y: 0, width: 50, height: 50, rotation: 0 };
    const newProps = { x: 100, y: 200, width: 120, height: 80, rotation: 45 };

    const cmd = new TransformLayerCommand('tf-1', prevProps, newProps);
    await useHistoryStore.getState().executeCommand(cmd);

    const transformed = useLayerStore.getState().layers[0];
    expect(transformed.x).toBe(100);
    expect(transformed.y).toBe(200);
    expect(transformed.width).toBe(120);
    expect(transformed.rotation).toBe(45);

    // Undo
    await useHistoryStore.getState().undo();
    const reverted = useLayerStore.getState().layers[0];
    expect(reverted.x).toBe(0);
    expect(reverted.y).toBe(0);
    expect(reverted.width).toBe(50);
    expect(reverted.rotation).toBe(0);
  });

  it('handles ChangeOpacityCommand undo/redo', async () => {
    const layer: ShapeLayer = {
      id: 'op-1',
      type: 'SHAPE',
      name: 'Box',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      shapeKind: 'rect',
      fill: '#fff',
      stroke: '',
      strokeWidth: 0,
      cornerRadius: 0,
    };
    useLayerStore.getState().addLayer(layer);

    const cmd = new ChangeOpacityCommand('op-1', 1, 0.45);
    await useHistoryStore.getState().executeCommand(cmd);

    expect(useLayerStore.getState().layers[0].opacity).toBe(0.45);

    await useHistoryStore.getState().undo();
    expect(useLayerStore.getState().layers[0].opacity).toBe(1);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore } from '@/store/layerStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useViewStore } from '@/store/viewStore';
import { ShapeLayer } from '@/types/layer';
import {
  AddMaskCommand,
  RemoveMaskCommand,
  ToggleMaskEnabledCommand,
  UpdateMaskDataCommand,
  ApplyMaskCommand,
} from '@/editor/commands/MaskCommands';
import {
  colorDistance,
  floodFillSelect,
  maskToBoundingBox,
  maskToPolygon,
  simplifyPolygon,
} from '@/lib/image/floodFill';
import { computeSnap, getLayerSnapPoints, SnapConfig } from '@/lib/snap/snapEngine';

describe('Layer Mask System', () => {
  const dummyLayer: ShapeLayer = {
    id: 'layer-mask-test',
    type: 'SHAPE',
    name: 'Shape with mask',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    shapeKind: 'rect',
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 1,
    cornerRadius: 0,
  };

  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useLayerStore.getState().addLayer({ ...dummyLayer });
  });

  it('adds and removes a mask on a layer', () => {
    useLayerStore.getState().addMask('layer-mask-test', 800, 600);
    let layer = useLayerStore.getState().layers[0];
    expect(layer.mask).toBeDefined();
    expect(layer.mask?.enabled).toBe(true);
    expect(layer.mask?.linked).toBe(true);
    expect(layer.mask?.dataUrl).toContain('data:image/png');

    useLayerStore.getState().removeMask('layer-mask-test');
    layer = useLayerStore.getState().layers[0];
    expect(layer.mask).toBeUndefined();
  });

  it('toggles mask enabled and linked properties', () => {
    useLayerStore.getState().addMask('layer-mask-test', 800, 600);
    useLayerStore.getState().toggleMaskEnabled('layer-mask-test');
    expect(useLayerStore.getState().layers[0].mask?.enabled).toBe(false);

    useLayerStore.getState().toggleMaskEnabled('layer-mask-test');
    expect(useLayerStore.getState().layers[0].mask?.enabled).toBe(true);

    useLayerStore.getState().toggleMaskLinked('layer-mask-test');
    expect(useLayerStore.getState().layers[0].mask?.linked).toBe(false);
  });

  it('updates mask data URL', () => {
    useLayerStore.getState().addMask('layer-mask-test', 800, 600);
    useLayerStore.getState().updateMaskData('layer-mask-test', 'data:image/png;base64,custom');
    expect(useLayerStore.getState().layers[0].mask?.dataUrl).toBe('data:image/png;base64,custom');
  });

  it('tracks editing mask layer ID', () => {
    expect(useLayerStore.getState().editingMaskLayerId).toBeNull();
    useLayerStore.getState().setEditingMask('layer-mask-test');
    expect(useLayerStore.getState().editingMaskLayerId).toBe('layer-mask-test');
    useLayerStore.getState().setEditingMask(null);
    expect(useLayerStore.getState().editingMaskLayerId).toBeNull();
  });

  it('executes and undoes AddMaskCommand and RemoveMaskCommand', () => {
    const addCmd = new AddMaskCommand('layer-mask-test', 800, 600);
    addCmd.execute();
    expect(useLayerStore.getState().layers[0].mask).toBeDefined();

    addCmd.undo();
    expect(useLayerStore.getState().layers[0].mask).toBeUndefined();

    // Re-add and test remove
    addCmd.execute();
    const maskData = useLayerStore.getState().layers[0].mask!;
    const removeCmd = new RemoveMaskCommand('layer-mask-test', maskData);
    removeCmd.execute();
    expect(useLayerStore.getState().layers[0].mask).toBeUndefined();

    removeCmd.undo();
    expect(useLayerStore.getState().layers[0].mask).toBeDefined();
    expect(useLayerStore.getState().layers[0].mask?.enabled).toBe(true);
  });

  it('executes and undoes ToggleMaskEnabledCommand and UpdateMaskDataCommand', () => {
    useLayerStore.getState().addMask('layer-mask-test', 800, 600);

    const toggleCmd = new ToggleMaskEnabledCommand('layer-mask-test');
    toggleCmd.execute();
    expect(useLayerStore.getState().layers[0].mask?.enabled).toBe(false);
    toggleCmd.undo();
    expect(useLayerStore.getState().layers[0].mask?.enabled).toBe(true);

    const updateCmd = new UpdateMaskDataCommand('layer-mask-test', 'old-url', 'new-url');
    updateCmd.execute();
    expect(useLayerStore.getState().layers[0].mask?.dataUrl).toBe('new-url');
    updateCmd.undo();
    expect(useLayerStore.getState().layers[0].mask?.dataUrl).toBe('old-url');
  });
});

describe('Selection Store & Polygon Support', () => {
  beforeEach(() => {
    useSelectionStore.getState().clearSelection();
  });

  it('sets rectangular and polygon selections', () => {
    useSelectionStore.getState().setSelection({
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      shape: 'rect',
    });
    expect(useSelectionStore.getState().selection?.shape).toBe('rect');

    useSelectionStore.getState().setSelection({
      x: 5,
      y: 5,
      width: 50,
      height: 50,
      shape: 'polygon',
      points: [5, 5, 55, 5, 55, 55, 5, 55, 5, 5],
    });
    const sel = useSelectionStore.getState().selection;
    expect(sel?.shape).toBe('polygon');
    expect(sel?.points).toHaveLength(10);
  });

  it('selectAll selects the full document bounds', () => {
    useSelectionStore.getState().selectAll(1920, 1080);
    const sel = useSelectionStore.getState().selection;
    expect(sel).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      shape: 'rect',
    });
  });

  it('clearSelection and invertSelection behave as expected', () => {
    useSelectionStore.getState().selectAll(1000, 800);
    expect(useSelectionStore.getState().selection).not.toBeNull();

    useSelectionStore.getState().clearSelection();
    expect(useSelectionStore.getState().selection).toBeNull();

    // Invert when null selects all
    useSelectionStore.getState().invertSelection(1000, 800);
    expect(useSelectionStore.getState().selection?.width).toBe(1000);

    // Invert when selected clears selection
    useSelectionStore.getState().invertSelection(1000, 800);
    expect(useSelectionStore.getState().selection).toBeNull();
  });
});

describe('Flood Fill & Polygon Extraction', () => {
  it('calculates color distance correctly', () => {
    expect(colorDistance(0, 0, 0, 0, 0, 0)).toBe(0);
    expect(colorDistance(255, 0, 0, 0, 0, 0)).toBe(255);
    // sqrt(3 * 10^2) = sqrt(300) ~ 17.32
    expect(colorDistance(10, 10, 10, 0, 0, 0)).toBeCloseTo(17.32, 1);
  });

  it('performs contiguous flood fill selection', () => {
    // 4x4 image:
    // [W, W, B, B]
    // [W, W, B, B]
    // [B, B, B, B]
    // [B, B, B, B]
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill all with black (0, 0, 0, 255)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    // Set top-left 2x2 to white (255, 255, 255, 255)
    const whiteCoords = [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (const [x, y] of whiteCoords) {
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
    }

    const imgData = { width, height, data } as unknown as ImageData;

    const mask = floodFillSelect(imgData, 0, 0, 10, true);
    // 4 pixels selected
    let count = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) count++;
    }
    expect(count).toBe(4);

    const bbox = maskToBoundingBox(mask, width, height);
    expect(bbox).toEqual({ x: 0, y: 0, width: 2, height: 2 });
  });

  it('performs non-contiguous color selection', () => {
    // 3x1 image: [Red, Blue, Red]
    const width = 3;
    const height = 1;
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,   // Red
      0, 0, 255, 255,   // Blue
      255, 0, 0, 255,   // Red
    ]);
    const imgData = { width, height, data } as unknown as ImageData;

    const mask = floodFillSelect(imgData, 0, 0, 10, false);
    expect(mask[0]).toBe(1);
    expect(mask[1]).toBe(0);
    expect(mask[2]).toBe(1);
  });

  it('simplifies polygons using Douglas-Peucker', () => {
    // Collinear points along a line: (0,0), (5,0), (10,0)
    const line = [0, 0, 5, 0, 10, 0];
    const simplified = simplifyPolygon(line, 1.0);
    // Should reduce to just start and end points: (0,0), (10,0)
    expect(simplified).toEqual([0, 0, 10, 0]);
  });
});

describe('Smart Guides & Snapping Engine', () => {
  it('calculates layer snap points correctly', () => {
    const pts = getLayerSnapPoints({ x: 100, y: 50, width: 200, height: 100 });
    expect(pts).toEqual({
      left: 100,
      right: 300,
      centerX: 200,
      top: 50,
      bottom: 150,
      centerY: 100,
    });
  });

  it('snaps to document bounds within threshold', () => {
    const config: SnapConfig = {
      snapEnabled: true,
      snapThreshold: 5,
      snapToDocumentBounds: true,
      snapToLayers: false,
      snapToGuides: false,
      snapToGrid: false,
    };

    // Moving layer is at x: 3, within threshold 5 of document left edge (0)
    const result = computeSnap(
      { x: 3, y: 100, width: 100, height: 100 },
      [],
      { width: 1000, height: 800 },
      [],
      config
    );

    expect(result.snappedX).toBe(0);
    expect(result.snappedY).toBe(100);
    expect(result.guides).toHaveLength(1);
    expect(result.guides[0]).toEqual({
      orientation: 'vertical',
      position: 0,
      type: 'edge',
    });
  });

  it('snaps to other layer edges and centers', () => {
    const config: SnapConfig = {
      snapEnabled: true,
      snapThreshold: 5,
      snapToDocumentBounds: false,
      snapToLayers: true,
      snapToGuides: false,
      snapToGrid: false,
    };

    const otherLayer = {
      x: 200,
      y: 200,
      width: 100,
      height: 100,
      visible: true,
      locked: false,
    };

    // Moving layer right edge is at 198 (x: 98, width: 100), close to other layer's left edge (200)
    const result = computeSnap(
      { x: 98, y: 198, width: 100, height: 100 },
      [otherLayer],
      { width: 1000, height: 800 },
      [],
      config
    );

    // Should snap X to 100 (so right edge = 200) and Y to 200 (top edge aligned)
    expect(result.snappedX).toBe(100);
    expect(result.snappedY).toBe(200);
    expect(result.guides.length).toBeGreaterThanOrEqual(2);
  });

  it('does not snap when snapEnabled is false or distance exceeds threshold', () => {
    const config: SnapConfig = {
      snapEnabled: false,
      snapThreshold: 5,
      snapToDocumentBounds: true,
      snapToLayers: true,
      snapToGuides: true,
      snapToGrid: false,
    };

    const result = computeSnap(
      { x: 3, y: 3, width: 100, height: 100 },
      [],
      { width: 1000, height: 800 },
      [],
      config
    );

    expect(result.snappedX).toBe(3);
    expect(result.snappedY).toBe(3);
    expect(result.guides).toHaveLength(0);
  });
});

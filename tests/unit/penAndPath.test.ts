import { describe, it, expect, beforeEach } from 'vitest';
import {
  pathPointsToSvg,
  sampleCubicBezier,
  pathPointsToPolygon,
  computePathBounds,
  pathToSelection,
  convertPointType,
  updateHandle,
  hitTestAnchor,
  hitTestHandle,
  PathPoint,
} from '@/lib/vector/bezier';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useSelectionStore } from '@/store/selectionStore';
import { PathLayer } from '@/types/layer';
import {
  AddLayerCommand,
  UpdateLayerPropertiesCommand,
} from '@/editor/commands/LayerCommands';

describe('Pen Tool & Vector Bézier Mathematics', () => {
  describe('pathPointsToSvg', () => {
    it('returns empty string for empty points array', () => {
      expect(pathPointsToSvg([], false)).toBe('');
      expect(pathPointsToSvg([], true)).toBe('');
    });

    it('returns single move command for single point', () => {
      const points: PathPoint[] = [{ x: 50, y: 100 }];
      expect(pathPointsToSvg(points, false)).toBe('M 50 100');
      expect(pathPointsToSvg(points, true)).toBe('M 50 100');
    });

    it('generates straight line commands (L) when points have no handles', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const svg = pathPointsToSvg(points, false);
      expect(svg).toBe('M 0 0 L 100 0 L 100 100');
    });

    it('generates cubic bezier curves (C) when handles are present', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0, handleOut: { x: 30, y: 50 } },
        { x: 100, y: 100, handleIn: { x: 70, y: 50 } },
      ];
      const svg = pathPointsToSvg(points, false);
      expect(svg).toBe('M 0 0 C 30 50, 70 50, 100 100');
    });

    it('handles fallback control points when only one handle is present', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0, handleOut: { x: 40, y: 0 } },
        { x: 100, y: 100, handleIn: null },
      ];
      const svg = pathPointsToSvg(points, false);
      // cp2 defaults to curr point: (100, 100)
      expect(svg).toBe('M 0 0 C 40 0, 100 100, 100 100');
    });

    it('closes path with straight Z when endpoints have no handles', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const svg = pathPointsToSvg(points, true);
      expect(svg).toBe('M 0 0 L 100 0 L 100 100 Z');
    });

    it('closes path with curved C ... Z when closing segment has handles', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0, handleIn: { x: 0, y: 50 } },
        { x: 100, y: 0 },
        { x: 100, y: 100, handleOut: { x: 50, y: 100 } },
      ];
      const svg = pathPointsToSvg(points, true);
      expect(svg).toBe('M 0 0 L 100 0 L 100 100 C 50 100, 0 50, 0 0 Z');
    });
  });

  describe('sampleCubicBezier', () => {
    it('evaluates endpoints accurately at t=0 and t=1', () => {
      const p0 = { x: 10, y: 20 };
      const cp1 = { x: 30, y: 80 };
      const cp2 = { x: 70, y: 80 };
      const p1 = { x: 90, y: 20 };

      const samples = sampleCubicBezier(p0, cp1, cp2, p1, 10);
      expect(samples).toHaveLength(11);
      expect(samples[0]).toEqual(p0);
      expect(samples[samples.length - 1]).toEqual(p1);
    });

    it('correctly evaluates symmetric midpoint at t=0.5', () => {
      const p0 = { x: 0, y: 0 };
      const cp1 = { x: 0, y: 100 };
      const cp2 = { x: 100, y: 100 };
      const p1 = { x: 100, y: 0 };

      const samples = sampleCubicBezier(p0, cp1, cp2, p1, 2);
      expect(samples[0]).toEqual({ x: 0, y: 0 });
      // At t = 0.5:
      // x = 0.125*0 + 3*0.25*0.5*0 + 3*0.5*0.25*100 + 0.125*100 = 37.5 + 12.5 = 50
      // y = 0.125*0 + 3*0.25*0.5*100 + 3*0.5*0.25*100 + 0.125*0 = 37.5 + 37.5 = 75
      expect(samples[1]).toEqual({ x: 50, y: 75 });
      expect(samples[2]).toEqual({ x: 100, y: 0 });
    });
  });

  describe('pathPointsToPolygon', () => {
    it('returns empty polygon for less than 2 points', () => {
      expect(pathPointsToPolygon([], false)).toEqual([]);
      expect(pathPointsToPolygon([{ x: 10, y: 20 }], false)).toEqual([]);
    });

    it('discretizes straight segments into vertex coordinates', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const poly = pathPointsToPolygon(points, false);
      expect(poly).toEqual([0, 0, 100, 0, 100, 100]);
    });

    it('closes polygon by connecting to start point when closed is true', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const poly = pathPointsToPolygon(points, true);
      expect(poly).toEqual([0, 0, 100, 0, 100, 100, 0, 0]);
    });

    it('samples curved segments smoothly', () => {
      const points: PathPoint[] = [
        { x: 0, y: 0, handleOut: { x: 0, y: 50 } },
        { x: 100, y: 100, handleIn: { x: 50, y: 100 } },
      ];
      const steps = 4;
      const poly = pathPointsToPolygon(points, false, steps);
      // steps = 4 means 5 points (10 coordinates: x,y pairs)
      expect(poly.length).toBe((steps + 1) * 2);
      expect(poly[0]).toBe(0);
      expect(poly[1]).toBe(0);
      expect(poly[poly.length - 2]).toBe(100);
      expect(poly[poly.length - 1]).toBe(100);
    });
  });

  describe('computePathBounds', () => {
    it('returns zeros for empty points', () => {
      expect(computePathBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('encloses anchor points and handles', () => {
      const points: PathPoint[] = [
        { x: 50, y: 50, handleIn: { x: 10, y: 50 } },
        { x: 150, y: 50, handleOut: { x: 200, y: 120 } },
      ];
      const bounds = computePathBounds(points);
      expect(bounds.x).toBe(10);
      expect(bounds.y).toBe(50);
      expect(bounds.width).toBe(190); // 200 - 10
      expect(bounds.height).toBe(70); // 120 - 50
    });
  });

  describe('pathToSelection', () => {
    it('returns null for less than 2 points', () => {
      expect(pathToSelection([])).toBeNull();
      expect(pathToSelection([{ x: 10, y: 10 }])).toBeNull();
    });

    it('generates valid SelectionArea polygon', () => {
      const points: PathPoint[] = [
        { x: 20, y: 20 },
        { x: 120, y: 20 },
        { x: 120, y: 120 },
        { x: 20, y: 120 },
      ];
      const selection = pathToSelection(points, true);
      expect(selection).not.toBeNull();
      expect(selection?.shape).toBe('polygon');
      expect(selection?.x).toBe(20);
      expect(selection?.y).toBe(20);
      expect(selection?.width).toBe(100);
      expect(selection?.height).toBe(100);
      expect(selection?.points?.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('convertPointType', () => {
    it('converts smooth point to corner by removing handles', () => {
      const smoothPt: PathPoint = {
        x: 100,
        y: 100,
        pointType: 'smooth',
        handleIn: { x: 80, y: 100 },
        handleOut: { x: 120, y: 100 },
      };
      const cornerPt = convertPointType(smoothPt, 'corner');
      expect(cornerPt.pointType).toBe('corner');
      expect(cornerPt.handleIn).toBeNull();
      expect(cornerPt.handleOut).toBeNull();
    });

    it('converts corner point with existing handles to smooth by aligning collinear', () => {
      const cornerPt: PathPoint = {
        x: 100,
        y: 100,
        pointType: 'corner',
        handleIn: { x: 100, y: 80 },  // 90 deg off
        handleOut: { x: 120, y: 100 }, // along +x
      };
      const smoothPt = convertPointType(cornerPt, 'smooth');
      expect(smoothPt.pointType).toBe('smooth');
      // handleOut is along +x (dx=20, dy=0), handleIn should now be along -x
      expect(smoothPt.handleOut).toEqual({ x: 120, y: 100 });
      expect(smoothPt.handleIn?.x).toBeLessThan(100);
      expect(smoothPt.handleIn?.y).toBe(100);
    });

    it('converts corner point without handles to smooth using neighbor tangents', () => {
      const prevPt: PathPoint = { x: 0, y: 100 };
      const currPt: PathPoint = { x: 100, y: 100, pointType: 'corner' };
      const nextPt: PathPoint = { x: 200, y: 100 };

      const smoothPt = convertPointType(currPt, 'smooth', prevPt, nextPt);
      expect(smoothPt.pointType).toBe('smooth');
      expect(smoothPt.handleIn).toBeDefined();
      expect(smoothPt.handleOut).toBeDefined();
      // Tangent is along +x (from 0 to 200)
      expect(smoothPt.handleIn?.x).toBeLessThan(100);
      expect(smoothPt.handleOut?.x).toBeGreaterThan(100);
      expect(smoothPt.handleIn?.y).toBe(100);
      expect(smoothPt.handleOut?.y).toBe(100);
    });
  });

  describe('updateHandle', () => {
    it('keeps opposite handle collinear for smooth point', () => {
      const pt: PathPoint = {
        x: 100,
        y: 100,
        pointType: 'smooth',
        handleIn: { x: 70, y: 100 },
        handleOut: { x: 130, y: 100 },
      };

      // Move handleOut upward (100, 140) => dy = 40, dx = 0
      const updated = updateHandle(pt, 'out', { x: 100, y: 140 }, true);
      expect(updated.handleOut).toEqual({ x: 100, y: 140 });
      // Opposite handleIn should be aligned collinearly (dx=0, dy=-30)
      expect(updated.handleIn).toEqual({ x: 100, y: 70 });
    });

    it('keeps opposite handle symmetric in length and direction for symmetric point', () => {
      const pt: PathPoint = {
        x: 100,
        y: 100,
        pointType: 'symmetric',
        handleIn: { x: 70, y: 100 },
        handleOut: { x: 130, y: 100 },
      };

      // Move handleOut to distance 50 at (150, 100)
      const updated = updateHandle(pt, 'out', { x: 150, y: 100 }, true);
      expect(updated.handleOut).toEqual({ x: 150, y: 100 });
      // handleIn should also match distance 50 on opposite side -> (50, 100)
      expect(updated.handleIn).toEqual({ x: 50, y: 100 });
    });

    it('allows independent handle movement for corner point or when lockCollinear is false', () => {
      const pt: PathPoint = {
        x: 100,
        y: 100,
        pointType: 'corner',
        handleIn: { x: 80, y: 100 },
        handleOut: { x: 120, y: 100 },
      };

      const updated = updateHandle(pt, 'out', { x: 130, y: 120 }, false);
      expect(updated.handleOut).toEqual({ x: 130, y: 120 });
      // handleIn remains untouched
      expect(updated.handleIn).toEqual({ x: 80, y: 100 });
    });
  });

  describe('hitTestAnchor and hitTestHandle', () => {
    const points: PathPoint[] = [
      { x: 50, y: 50, handleOut: { x: 80, y: 50 } },
      { x: 150, y: 150, handleIn: { x: 120, y: 150 } },
    ];

    it('detects anchor point within threshold', () => {
      expect(hitTestAnchor(points, 52, 49, 8)).toBe(0);
      expect(hitTestAnchor(points, 153, 148, 8)).toBe(1);
      expect(hitTestAnchor(points, 200, 200, 8)).toBe(-1);
    });

    it('detects handle within threshold', () => {
      expect(hitTestHandle(points[0], 81, 51, 8)).toBe('out');
      expect(hitTestHandle(points[0], 20, 50, 8)).toBeNull();

      expect(hitTestHandle(points[1], 119, 151, 8)).toBe('in');
      expect(hitTestHandle(points[1], 180, 150, 8)).toBeNull();
    });
  });
});

describe('PathLayer Store & Command Integration', () => {
  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useHistoryStore.getState().clearHistory();
    useSelectionStore.getState().clearSelection();
  });

  it('adds a PathLayer to useLayerStore and sets activeLayerId', () => {
    const pathLayer: PathLayer = {
      id: 'path-layer-1',
      type: 'PATH',
      name: 'Vector Path 1',
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
      points: [
        { x: 0, y: 0, handleOut: { x: 30, y: 50 } },
        { x: 150, y: 100, handleIn: { x: 100, y: 100 } },
      ],
      closed: false,
      stroke: '#00ffff',
      strokeWidth: 3,
      fill: 'transparent',
    };

    useLayerStore.getState().addLayer(pathLayer);
    const state = useLayerStore.getState();

    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].id).toBe('path-layer-1');
    expect(state.layers[0].type).toBe('PATH');
    expect(state.activeLayerId).toBe('path-layer-1');
  });

  it('updates PathLayer properties like stroke, fill, and closed state', () => {
    const pathLayer: PathLayer = {
      id: 'path-layer-2',
      type: 'PATH',
      name: 'Curved Shape',
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
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      closed: false,
      stroke: '#000000',
      strokeWidth: 2,
      fill: 'transparent',
    };

    useLayerStore.getState().addLayer(pathLayer);
    useLayerStore.getState().updateLayer('path-layer-2', {
      closed: true,
      fill: '#ffaa00',
      strokeWidth: 5,
    });

    const updated = useLayerStore.getState().layers[0] as PathLayer;
    expect(updated.closed).toBe(true);
    expect(updated.fill).toBe('#ffaa00');
    expect(updated.strokeWidth).toBe(5);
  });

  it('executes AddLayerCommand for PathLayer with undo and redo', async () => {
    const pathLayer: PathLayer = {
      id: 'cmd-path-1',
      type: 'PATH',
      name: 'Path 1',
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
      points: [
        { x: 10, y: 10 },
        { x: 90, y: 90 },
      ],
      closed: false,
      stroke: '#ff0000',
      strokeWidth: 2,
    };

    const cmd = new AddLayerCommand(pathLayer, 0);
    await useHistoryStore.getState().executeCommand(cmd);

    expect(useLayerStore.getState().layers).toHaveLength(1);
    expect(useHistoryStore.getState().canUndo()).toBe(true);

    // Undo command
    await useHistoryStore.getState().undo();
    expect(useLayerStore.getState().layers).toHaveLength(0);

    // Redo command
    await useHistoryStore.getState().redo();
    expect(useLayerStore.getState().layers).toHaveLength(1);
    expect(useLayerStore.getState().layers[0].id).toBe('cmd-path-1');
  });

  it('executes UpdateLayerPropertiesCommand for editing path points with undo and redo', async () => {
    const initialPoints: PathPoint[] = [
      { x: 0, y: 0, pointType: 'corner' },
      { x: 100, y: 100, pointType: 'corner' },
    ];
    const pathLayer: PathLayer = {
      id: 'cmd-path-2',
      type: 'PATH',
      name: 'Path 2',
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
      points: initialPoints,
      closed: false,
      stroke: '#3b82f6',
      strokeWidth: 2,
    };

    useLayerStore.getState().addLayer(pathLayer);

    const modifiedPoints: PathPoint[] = [
      { x: 0, y: 0, pointType: 'smooth', handleOut: { x: 30, y: 50 } },
      { x: 120, y: 150, pointType: 'corner' },
    ];

    const cmd = new UpdateLayerPropertiesCommand(
      'cmd-path-2',
      { points: initialPoints },
      { points: modifiedPoints },
      'Edit Path'
    );

    await useHistoryStore.getState().executeCommand(cmd);

    let current = useLayerStore.getState().layers[0] as PathLayer;
    expect(current.points[1].x).toBe(120);
    expect(current.points[0].handleOut).toEqual({ x: 30, y: 50 });

    // Undo
    await useHistoryStore.getState().undo();
    current = useLayerStore.getState().layers[0] as PathLayer;
    expect(current.points[1].x).toBe(100);
    expect(current.points[0].handleOut).toBeUndefined();

    // Redo
    await useHistoryStore.getState().redo();
    current = useLayerStore.getState().layers[0] as PathLayer;
    expect(current.points[1].x).toBe(120);
    expect(current.points[0].handleOut).toEqual({ x: 30, y: 50 });
  });

  it('integrates path conversion into selection store', () => {
    const points: PathPoint[] = [
      { x: 10, y: 10 },
      { x: 80, y: 10 },
      { x: 80, y: 80 },
      { x: 10, y: 80 },
    ];

    const selectionArea = pathToSelection(points, true);
    expect(selectionArea).not.toBeNull();

    if (selectionArea) {
      useSelectionStore.getState().setSelection(selectionArea);
      const selState = useSelectionStore.getState().selection;
      expect(selState).not.toBeNull();
      expect(selState?.shape).toBe('polygon');
      expect(selState?.x).toBe(10);
      expect(selState?.y).toBe(10);
      expect(selState?.width).toBe(70);
      expect(selState?.height).toBe(70);
    }
  });
});

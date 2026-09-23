import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeGradientT,
  parseColorToRgba,
  colorToHex,
  buildGradientLUT,
  resolveGradientStops,
  renderGradientToImageData,
  formatCssGradient,
  GRADIENT_PRESETS,
  DEFAULT_GRADIENT_OPTIONS,
  GradientType,
  GradientStop,
} from '@/lib/image/gradient';
import { useLayerStore } from '@/store/layerStore';
import { useToolStore } from '@/store/toolStore';
import { ShapeLayer, PaintLayer } from '@/types/layer';
import { AddLayerCommand, UpdateLayerPropertiesCommand } from '@/editor/commands/LayerCommands';

function createTestImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('Gradient Mathematical Calculations', () => {
  describe('Linear Gradient', () => {
    it('calculates linear interpolation along horizontal axis', () => {
      // (0, 0) to (100, 0)
      expect(computeGradientT(0, 0, 0, 0, 100, 0, 'linear')).toBe(0);
      expect(computeGradientT(50, 0, 0, 0, 100, 0, 'linear')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(100, 0, 0, 0, 100, 0, 'linear')).toBe(1);
    });

    it('clamps values outside [0, 1] range', () => {
      expect(computeGradientT(-50, 0, 0, 0, 100, 0, 'linear')).toBe(0);
      expect(computeGradientT(150, 0, 0, 0, 100, 0, 'linear')).toBe(1);
    });

    it('calculates linear interpolation along vertical and diagonal axes', () => {
      // vertical: (0, 0) to (0, 100)
      expect(computeGradientT(0, 25, 0, 0, 0, 100, 'linear')).toBeCloseTo(0.25, 3);
      expect(computeGradientT(0, 75, 0, 0, 0, 100, 'linear')).toBeCloseTo(0.75, 3);

      // diagonal: (0, 0) to (100, 100)
      expect(computeGradientT(50, 50, 0, 0, 100, 100, 'linear')).toBeCloseTo(0.5, 3);
    });

    it('handles zero-length drag vector without NaN', () => {
      expect(computeGradientT(10, 10, 50, 50, 50, 50, 'linear')).toBe(0);
    });
  });

  describe('Radial Gradient', () => {
    it('calculates radial distance from center', () => {
      // center (50, 50), end (100, 50) => radius = 50
      expect(computeGradientT(50, 50, 50, 50, 100, 50, 'radial')).toBe(0);
      expect(computeGradientT(75, 50, 50, 50, 100, 50, 'radial')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(100, 50, 50, 50, 100, 50, 'radial')).toBe(1);
    });

    it('is concentric and circular in all directions', () => {
      // center (50, 50), radius = 50
      expect(computeGradientT(50, 75, 50, 50, 100, 50, 'radial')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(50, 25, 50, 50, 100, 50, 'radial')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(25, 50, 50, 50, 100, 50, 'radial')).toBeCloseTo(0.5, 3);
    });

    it('clamps values exceeding radius to 1', () => {
      expect(computeGradientT(150, 50, 50, 50, 100, 50, 'radial')).toBe(1);
    });
  });

  describe('Angle (Conical) Gradient', () => {
    it('sweeps 360 degrees around center point', () => {
      // center (50, 50), ref vector pointing right (100, 50) [angle 0]
      // right: angle 0 => t = 0
      expect(computeGradientT(100, 50, 50, 50, 100, 50, 'angle')).toBe(0);
      // bottom: angle +90 deg => t = 0.25
      expect(computeGradientT(50, 100, 50, 50, 100, 50, 'angle')).toBeCloseTo(0.25, 2);
      // left: angle 180 deg => t = 0.5
      expect(computeGradientT(0, 50, 50, 50, 100, 50, 'angle')).toBeCloseTo(0.5, 2);
      // top: angle 270 deg (-90 deg) => t = 0.75
      expect(computeGradientT(50, 0, 50, 50, 100, 50, 'angle')).toBeCloseTo(0.75, 2);
    });
  });

  describe('Reflected Gradient', () => {
    it('is symmetric on both sides of the start axis', () => {
      // center (50, 50), end (100, 50) => distance = 50
      expect(computeGradientT(50, 50, 50, 50, 100, 50, 'reflected')).toBe(0);
      // positive direction
      expect(computeGradientT(75, 50, 50, 50, 100, 50, 'reflected')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(100, 50, 50, 50, 100, 50, 'reflected')).toBe(1);
      // reflected negative direction
      expect(computeGradientT(25, 50, 50, 50, 100, 50, 'reflected')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(0, 50, 50, 50, 100, 50, 'reflected')).toBe(1);
    });
  });

  describe('Diamond Gradient', () => {
    it('forms diamond isocontours centered at start point', () => {
      // start (50, 50), end (100, 50) => D = 50
      expect(computeGradientT(50, 50, 50, 50, 100, 50, 'diamond')).toBe(0);
      // along drag axis
      expect(computeGradientT(75, 50, 50, 50, 100, 50, 'diamond')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(100, 50, 50, 50, 100, 50, 'diamond')).toBe(1);
      // along perpendicular axis
      expect(computeGradientT(50, 75, 50, 50, 100, 50, 'diamond')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(50, 100, 50, 50, 100, 50, 'diamond')).toBe(1);
      // along opposite axis
      expect(computeGradientT(25, 50, 50, 50, 100, 50, 'diamond')).toBeCloseTo(0.5, 3);
      expect(computeGradientT(0, 50, 50, 50, 100, 50, 'diamond')).toBe(1);
      // at diamond boundary point: dx = 25, dy = 25 => (25 + 25) / 50 = 1.0
      expect(computeGradientT(75, 75, 50, 50, 100, 50, 'diamond')).toBeCloseTo(1.0, 3);
    });
  });
});

describe('Color Parsing and LUT Generation', () => {
  it('parses various hex color formats', () => {
    expect(parseColorToRgba('#fff')).toEqual([255, 255, 255, 255]);
    expect(parseColorToRgba('#000')).toEqual([0, 0, 0, 255]);
    expect(parseColorToRgba('#ff0000')).toEqual([255, 0, 0, 255]);
    expect(parseColorToRgba('#00ff00')).toEqual([0, 255, 0, 255]);
    expect(parseColorToRgba('#0000ff80')).toEqual([0, 0, 255, 128]);
  });

  it('parses rgb and rgba strings', () => {
    expect(parseColorToRgba('rgb(10, 20, 30)')).toEqual([10, 20, 30, 255]);
    expect(parseColorToRgba('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30, 128]);
    expect(parseColorToRgba('transparent')).toEqual([0, 0, 0, 0]);
  });

  it('builds a 1024-entry LUT matching color stops', () => {
    const stops: GradientStop[] = [
      { offset: 0, color: '#ff0000' },
      { offset: 1, color: '#0000ff' },
    ];
    const lut = buildGradientLUT(stops, false, 1.0);
    expect(lut.length).toBe(1024);

    // First entry: pure red (R: 255, G: 0, B: 0, A: 255)
    const first = lut[0];
    expect(first & 0xff).toBe(255); // R
    expect((first >> 8) & 0xff).toBe(0); // G
    expect((first >> 16) & 0xff).toBe(0); // B
    expect((first >> 24) & 0xff).toBe(255); // A

    // Last entry: pure blue (R: 0, G: 0, B: 255, A: 255)
    const last = lut[1023];
    expect(last & 0xff).toBe(0); // R
    expect((last >> 16) & 0xff).toBe(255); // B
  });

  it('inverts color stops when reverse is true', () => {
    const stops: GradientStop[] = [
      { offset: 0, color: '#ff0000' },
      { offset: 1, color: '#0000ff' },
    ];
    const lutReversed = buildGradientLUT(stops, true, 1.0);

    // In reverse mode, first entry should be blue, last should be red
    const first = lutReversed[0];
    expect(first & 0xff).toBe(0); // R
    expect((first >> 16) & 0xff).toBe(255); // B

    const last = lutReversed[1023];
    expect(last & 0xff).toBe(255); // R
    expect((last >> 16) & 0xff).toBe(0); // B
  });

  it('scales alpha channel with opacity', () => {
    const stops: GradientStop[] = [
      { offset: 0, color: '#ffffff' },
      { offset: 1, color: '#000000' },
    ];
    const lutHalfOpacity = buildGradientLUT(stops, false, 0.5);
    const alpha = (lutHalfOpacity[0] >> 24) & 0xff;
    expect(alpha).toBeCloseTo(128, -1);
  });
});

describe('Gradient Presets & Resolution', () => {
  it('resolves dynamic foreground to background preset', () => {
    const stops = resolveGradientStops('fg-bg', '#123456', '#abcdef');
    expect(stops).toHaveLength(2);
    expect(stops[0].color).toBe('#123456');
    expect(stops[1].color).toBe('#abcdef');
  });

  it('resolves dynamic foreground to transparent preset', () => {
    const stops = resolveGradientStops('fg-trans', '#ff0000', '#ffffff');
    expect(stops).toHaveLength(2);
    expect(stops[0].color).toBe('rgba(255, 0, 0, 1)');
    expect(stops[1].color).toBe('rgba(255, 0, 0, 0)');
  });

  it('formats CSS gradient string correctly', () => {
    const css = formatCssGradient([
      { offset: 0, color: '#000' },
      { offset: 1, color: '#fff' },
    ]);
    expect(css).toContain('linear-gradient');
    expect(css).toContain('#000 0%');
    expect(css).toContain('#fff 100%');
  });
});

describe('ImageData Rasterization', () => {
  it('renders gradient into test ImageData without errors', () => {
    const img = createTestImageData(20, 20);
    renderGradientToImageData(
      img,
      20,
      20,
      0,
      0,
      19,
      0,
      'linear',
      [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#00ff00' },
      ],
      false,
      1.0
    );

    // Check pixel at (0, 0) is predominantly red
    expect(img.data[0]).toBe(255); // R
    expect(img.data[1]).toBe(0); // G
    expect(img.data[3]).toBe(255); // A

    // Check pixel at (19, 0) is predominantly green
    const lastPixelIdx = (0 * 20 + 19) * 4;
    expect(img.data[lastPixelIdx + 1]).toBe(255); // G
  });
});

describe('Shape Layer Gradient Integration', () => {
  beforeEach(() => {
    useLayerStore.getState().clearLayers();
  });

  it('supports gradient fill config on ShapeLayer', () => {
    const shapeLayer: ShapeLayer = {
      id: 'shape-grad-1',
      type: 'SHAPE',
      name: 'Gradient Rectangle',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 10,
      y: 10,
      width: 200,
      height: 150,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      shapeKind: 'rect',
      fill: '#0078d4',
      fillType: 'gradient',
      gradient: {
        type: 'radial',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
        reverse: false,
        opacity: 0.9,
      },
    };

    useLayerStore.getState().addLayer(shapeLayer);
    const stored = useLayerStore.getState().layers[0] as ShapeLayer;

    expect(stored.fillType).toBe('gradient');
    expect(stored.gradient?.type).toBe('radial');
    expect(stored.gradient?.stops).toHaveLength(2);
    expect(stored.gradient?.opacity).toBe(0.9);
  });

  it('executes and undoes UpdateLayerPropertiesCommand for Shape gradient fill', () => {
    const shapeLayer: ShapeLayer = {
      id: 'shape-grad-cmd',
      type: 'SHAPE',
      name: 'Rectangle',
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
      fill: '#000000',
      fillType: 'color',
    };

    useLayerStore.getState().addLayer(shapeLayer);

    const cmd = new UpdateLayerPropertiesCommand(
      'shape-grad-cmd',
      { fillType: 'color' },
      {
        fillType: 'gradient',
        gradient: {
          type: 'reflected',
          stops: [
            { offset: 0, color: '#fa709a' },
            { offset: 1, color: '#fee140' },
          ],
          reverse: false,
          opacity: 1,
        },
      },
      'Apply Gradient'
    );

    cmd.execute();
    let layer = useLayerStore.getState().layers[0] as ShapeLayer;
    expect(layer.fillType).toBe('gradient');
    expect(layer.gradient?.type).toBe('reflected');

    cmd.undo();
    layer = useLayerStore.getState().layers[0] as ShapeLayer;
    expect(layer.fillType).toBe('color');
  });
});

describe('Paint Layer Gradient Data Integration', () => {
  beforeEach(() => {
    useLayerStore.getState().clearLayers();
  });

  it('adds PaintLayer with rasterized gradient dataUrl', () => {
    const paintLayer: PaintLayer = {
      id: 'paint-grad-1',
      type: 'PAINT',
      name: 'Gradient 1',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      paths: [],
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    };

    const cmd = new AddLayerCommand(paintLayer, 0);
    cmd.execute();

    const layer = useLayerStore.getState().layers[0] as PaintLayer;
    expect(layer.type).toBe('PAINT');
    expect(layer.dataUrl).toContain('data:image/png;base64');

    cmd.undo();
    expect(useLayerStore.getState().layers).toHaveLength(0);
  });
});

describe('Custom Gradient Colors & colorToHex', () => {
  describe('colorToHex', () => {
    it('returns 6-digit hex as-is in lowercase', () => {
      expect(colorToHex('#ff00aa')).toBe('#ff00aa');
      expect(colorToHex('#ABCDEF')).toBe('#abcdef');
    });

    it('expands 3-digit hex strings to 6-digit hex', () => {
      expect(colorToHex('#fff')).toBe('#ffffff');
      expect(colorToHex('#000')).toBe('#000000');
      expect(colorToHex('#f0a')).toBe('#ff00aa');
    });

    it('converts rgb and rgba strings to 6-digit hex', () => {
      expect(colorToHex('rgb(255, 0, 0)')).toBe('#ff0000');
      expect(colorToHex('rgb(0, 255, 0)')).toBe('#00ff00');
      expect(colorToHex('rgba(0, 0, 255, 0.5)')).toBe('#0000ff');
      expect(colorToHex('rgb(10, 20, 30)')).toBe('#0a141e');
    });

    it('handles named colors and fallbacks', () => {
      expect(colorToHex('white')).toBe('#ffffff');
      expect(colorToHex('black')).toBe('#000000');
      expect(colorToHex('transparent')).toBe('#000000');
      expect(colorToHex('')).toBe('#000000');
    });
  });

  describe('Custom Gradient Resolution & Modification', () => {
    it('resolves custom preset using provided stops', () => {
      const customStops: GradientStop[] = [
        { offset: 0, color: '#ff0055' },
        { offset: 0.5, color: '#00ffee' },
        { offset: 1, color: '#ffea00' },
      ];
      const resolved = resolveGradientStops('custom', '#000000', '#ffffff', customStops);
      expect(resolved).toEqual(customStops);
      expect(resolved).toHaveLength(3);
    });

    it('supports adding and removing stops on custom gradients', () => {
      const initialStops: GradientStop[] = [
        { offset: 0, color: '#112233' },
        { offset: 1, color: '#445566' },
      ];

      // Add a middle stop
      const added = [
        ...initialStops,
        { offset: 0.5, color: '#998877' },
      ].sort((a, b) => a.offset - b.offset);

      expect(added).toHaveLength(3);
      expect(added[1].offset).toBe(0.5);
      expect(added[1].color).toBe('#998877');

      // Remove middle stop
      const removed = added.filter((_, i) => i !== 1);
      expect(removed).toHaveLength(2);
      expect(removed[0].color).toBe('#112233');
      expect(removed[1].color).toBe('#445566');
    });

    it('updates ShapeLayer with custom stops and presetId: custom', () => {
      useLayerStore.getState().clearLayers();

      const shapeLayer: ShapeLayer = {
        id: 'shape-custom-grad',
        type: 'SHAPE',
        name: 'Custom Gradient Shape',
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
        fill: '#000000',
        fillType: 'gradient',
        gradient: {
          type: 'linear',
          presetId: 'custom',
          stops: [
            { offset: 0, color: '#ff0000' },
            { offset: 0.5, color: '#00ff00' },
            { offset: 1, color: '#0000ff' },
          ],
          reverse: false,
          opacity: 1,
        },
      };

      useLayerStore.getState().addLayer(shapeLayer);

      const customStopsUpdated: GradientStop[] = [
        { offset: 0, color: '#ff1493' },
        { offset: 0.5, color: '#00ffff' },
        { offset: 1, color: '#ffd700' },
      ];

      const cmd = new UpdateLayerPropertiesCommand(
        'shape-custom-grad',
        shapeLayer,
        {
          ...shapeLayer,
          gradient: {
            ...shapeLayer.gradient!,
            presetId: 'custom',
            stops: customStopsUpdated,
          },
        },
        'Update Custom Gradient Colors'
      );

      cmd.execute();
      const updated = useLayerStore.getState().layers[0] as ShapeLayer;
      expect(updated.gradient?.presetId).toBe('custom');
      expect(updated.gradient?.stops[0].color).toBe('#ff1493');
      expect(updated.gradient?.stops[1].color).toBe('#00ffff');
      expect(updated.gradient?.stops[2].color).toBe('#ffd700');

      cmd.undo();
      const reverted = useLayerStore.getState().layers[0] as ShapeLayer;
      expect(reverted.gradient?.stops[0].color).toBe('#ff0000');
    });
  });
});

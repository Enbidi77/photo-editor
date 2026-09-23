import { describe, it, expect } from 'vitest';
import { AVAILABLE_FILTERS, FilterType } from '@/types/filters';
import { DEFAULT_ADJUSTMENTS } from '@/types/layer';
import {
  applyVignette,
  applyChromaticAberration,
  VignetteFilter,
  ChromaticAberrationFilter,
} from '@/editor/filters/stylizeFilters';
import Konva from 'konva';

function createTestImageData(width: number, height: number, fillColor: [number, number, number, number] = [200, 200, 200, 255]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillColor[0];
    data[i + 1] = fillColor[1];
    data[i + 2] = fillColor[2];
    data[i + 3] = fillColor[3];
  }
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('Stylize Filters Definition & Registration', () => {
  it('registers vignette and chromatic-aberration in AVAILABLE_FILTERS with Stylize category', () => {
    const vignette = AVAILABLE_FILTERS.find((f) => f.id === 'vignette');
    expect(vignette).toBeDefined();
    expect(vignette?.category).toBe('Stylize');
    expect(vignette?.name).toBe('Vignette');

    const chromatic = AVAILABLE_FILTERS.find((f) => f.id === 'chromatic-aberration');
    expect(chromatic).toBeDefined();
    expect(chromatic?.category).toBe('Stylize');
    expect(chromatic?.name).toBe('Chromatic Aberration');
  });

  it('includes default adjustments for vignette and chromatic aberration', () => {
    expect(DEFAULT_ADJUSTMENTS.vignetteAmount).toBe(0);
    expect(DEFAULT_ADJUSTMENTS.vignetteMidpoint).toBe(50);
    expect(DEFAULT_ADJUSTMENTS.vignetteRoundness).toBe(50);
    expect(DEFAULT_ADJUSTMENTS.chromaticShift).toBe(0);
    expect(DEFAULT_ADJUSTMENTS.chromaticDirection).toBe(0);
  });

  it('registers Konva filter functions on Konva.Filters', () => {
    expect(typeof (Konva.Filters as any).Vignette).toBe('function');
    expect(typeof (Konva.Filters as any).ChromaticAberration).toBe('function');
  });
});

describe('Vignette Filter Algorithm', () => {
  it('does not modify image data when amount is 0', () => {
    const img = createTestImageData(20, 20, [150, 150, 150, 255]);
    const original = new Uint8ClampedArray(img.data);

    applyVignette(img, { amount: 0, midpoint: 50, roundness: 50 });

    expect(img.data).toEqual(original);
  });

  it('preserves center pixels while darkening corner pixels', () => {
    const img = createTestImageData(50, 50, [200, 200, 200, 255]);
    applyVignette(img, { amount: 80, midpoint: 40, roundness: 50 });

    // Center pixel (25, 25)
    const centerIdx = (25 * 50 + 25) * 4;
    expect(img.data[centerIdx]).toBe(200);
    expect(img.data[centerIdx + 1]).toBe(200);
    expect(img.data[centerIdx + 2]).toBe(200);
    expect(img.data[centerIdx + 3]).toBe(255);

    // Corner pixel (0, 0) should be darkened significantly
    const cornerIdx = 0;
    expect(img.data[cornerIdx]).toBeLessThan(200);
    expect(img.data[cornerIdx + 1]).toBeLessThan(200);
    expect(img.data[cornerIdx + 2]).toBeLessThan(200);
    expect(img.data[cornerIdx + 3]).toBe(255); // Alpha intact
  });

  it('darkens corners more when amount is higher', () => {
    const imgLow = createTestImageData(40, 40, [200, 200, 200, 255]);
    const imgHigh = createTestImageData(40, 40, [200, 200, 200, 255]);

    applyVignette(imgLow, { amount: 30, midpoint: 50, roundness: 50 });
    applyVignette(imgHigh, { amount: 90, midpoint: 50, roundness: 50 });

    const cornerIdx = 0;
    expect(imgHigh.data[cornerIdx]).toBeLessThan(imgLow.data[cornerIdx]);
  });

  it('delays darkening start when midpoint is higher', () => {
    const imgEarly = createTestImageData(60, 60, [200, 200, 200, 255]);
    const imgLate = createTestImageData(60, 60, [200, 200, 200, 255]);

    applyVignette(imgEarly, { amount: 80, midpoint: 10, roundness: 50 });
    applyVignette(imgLate, { amount: 80, midpoint: 90, roundness: 50 });

    // Mid-radius pixel at (30, 15)
    const midIdx = (15 * 60 + 30) * 4;
    // With midpoint=90, this pixel should be barely darkened, whereas midpoint=10 darkens it
    expect(imgLate.data[midIdx]).toBeGreaterThan(imgEarly.data[midIdx]);
  });

  it('alters falloff shape between roundness 0 (elliptical) and 100 (circular)', () => {
    // In an elongated rectangle (100x20)
    const imgOval = createTestImageData(100, 20, [200, 200, 200, 255]);
    const imgCircle = createTestImageData(100, 20, [200, 200, 200, 255]);

    applyVignette(imgOval, { amount: 80, midpoint: 30, roundness: 0 });
    applyVignette(imgCircle, { amount: 80, midpoint: 30, roundness: 100 });

    // Pixel at top edge middle (x=50, y=0)
    const topEdgeIdx = (0 * 100 + 50) * 4;
    // For an oval, y=0 is at distance 1.0 (edge of ellipse), so it gets darkened
    // For a circle with maxR=50, y=0 is only distance 10/50 = 0.2 (well inside circle), so it's less darkened
    expect(imgCircle.data[topEdgeIdx]).toBeGreaterThan(imgOval.data[topEdgeIdx]);
  });
});

describe('Chromatic Aberration Filter Algorithm', () => {
  it('does not modify image data when shift is 0', () => {
    const img = createTestImageData(20, 20, [100, 150, 200, 255]);
    const original = new Uint8ClampedArray(img.data);

    applyChromaticAberration(img, { shift: 0, direction: 0 });

    expect(img.data).toEqual(original);
  });

  it('offsets red and blue channels horizontally when direction is 0', () => {
    // Create an image with a single vertical white stripe in the middle of black background
    const width = 20;
    const height = 10;
    const img = createTestImageData(width, height, [0, 0, 0, 255]);

    // Draw white stripe at x = 10
    for (let y = 0; y < height; y++) {
      const idx = (y * width + 10) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 255;
      img.data[idx + 2] = 255;
    }

    applyChromaticAberration(img, { shift: 2, direction: 0 });

    // At original stripe x=10: green should still be 255
    const centerIdx = (5 * width + 10) * 4;
    expect(img.data[centerIdx + 1]).toBe(255); // Green stays in center

    // Red channel was shifted by -dx (-2), so at x = 12 (10 - (-2)), red should be 255!
    const redShiftedIdx = (5 * width + 12) * 4;
    expect(img.data[redShiftedIdx]).toBe(255); // Red is present

    // Blue channel was shifted by +dx (+2), so at x = 8 (10 + (-2)), blue should be 255!
    const blueShiftedIdx = (5 * width + 8) * 4;
    expect(img.data[blueShiftedIdx + 2]).toBe(255); // Blue is present
  });

  it('offsets red and blue channels vertically when direction is 90', () => {
    // Create an image with a horizontal stripe at y = 10
    const width = 10;
    const height = 20;
    const img = createTestImageData(width, height, [0, 0, 0, 255]);

    for (let x = 0; x < width; x++) {
      const idx = (10 * width + x) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 255;
      img.data[idx + 2] = 255;
    }

    applyChromaticAberration(img, { shift: 3, direction: 90 });

    // Center green channel at y=10
    const centerIdx = (10 * width + 5) * 4;
    expect(img.data[centerIdx + 1]).toBe(255);

    // Red shifted to y = 13 (10 - (-3))
    const redShiftedIdx = (13 * width + 5) * 4;
    expect(img.data[redShiftedIdx]).toBe(255);

    // Blue shifted to y = 7 (10 + (-3))
    const blueShiftedIdx = (7 * width + 5) * 4;
    expect(img.data[blueShiftedIdx + 2]).toBe(255);
  });

  it('clamps at image boundaries without error or NaN', () => {
    const img = createTestImageData(10, 10, [100, 100, 100, 255]);
    // Large shift that exceeds image dimensions
    applyChromaticAberration(img, { shift: 25, direction: 45 });

    for (let i = 0; i < img.data.length; i++) {
      expect(Number.isNaN(img.data[i])).toBe(false);
      expect(img.data[i]).toBeGreaterThanOrEqual(0);
      expect(img.data[i]).toBeLessThanOrEqual(255);
    }
  });
});

describe('Konva Filters Integration', () => {
  it('executes VignetteFilter via this context', () => {
    const img = createTestImageData(30, 30, [200, 200, 200, 255]);
    const mockNode = {
      vignetteAmount: () => 75,
      vignetteMidpoint: () => 50,
      vignetteRoundness: () => 50,
    };

    VignetteFilter.call(mockNode, img);

    // Corners should be darkened
    expect(img.data[0]).toBeLessThan(200);
  });

  it('executes ChromaticAberrationFilter via this context', () => {
    const img = createTestImageData(30, 30, [0, 0, 0, 255]);
    img.data[(15 * 30 + 15) * 4] = 255;
    img.data[(15 * 30 + 15) * 4 + 1] = 255;
    img.data[(15 * 30 + 15) * 4 + 2] = 255;

    const mockNode = {
      chromaticShift: () => 5,
      chromaticDirection: () => 0,
    };

    ChromaticAberrationFilter.call(mockNode, img);

    // Center green remains
    expect(img.data[(15 * 30 + 15) * 4 + 1]).toBe(255);
  });
});

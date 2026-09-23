import Konva from 'konva';

export interface VignetteOptions {
  amount: number; // 0 to 100
  midpoint?: number; // 0 to 100, default 50
  roundness?: number; // 0 to 100, default 50
}

/**
 * Pure function to apply a vignette effect (darkening edges) to ImageData.
 */
export function applyVignette(imageData: ImageData, options: VignetteOptions): void {
  const { width, height, data } = imageData;
  if (width <= 0 || height <= 0) return;

  const amount = Math.max(0, Math.min(100, options.amount));
  if (amount <= 0) return;

  const midpoint = Math.max(0, Math.min(100, options.midpoint ?? 50));
  const roundness = Math.max(0, Math.min(100, options.roundness ?? 50));

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(cx, cy);

  const roundRatio = roundness / 100;
  const ovalRatio = 1 - roundRatio;

  // Midpoint determines where darkening begins (0% starts near center, 100% starts at edges)
  const midNorm = (midpoint / 100) * 0.9;
  const maxDist = 1.4142; // sqrt(2), corner distance of normalized coords
  const distRange = Math.max(0.001, maxDist - midNorm);
  const amtRatio = amount / 100;

  // Precompute normalized x distances for oval and circle
  const xOvalSq = new Float32Array(width);
  const xCircSq = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const nx = (x - cx) / cx;
    const nxCirc = (x - cx) / maxR;
    xOvalSq[x] = nx * nx;
    xCircSq[x] = nxCirc * nxCirc;
  }

  for (let y = 0; y < height; y++) {
    const ny = (y - cy) / cy;
    const nyCirc = (y - cy) / maxR;
    const nyOvalSq = ny * ny;
    const nyCircSq = nyCirc * nyCirc;

    let idx = y * width * 4;
    for (let x = 0; x < width; x++, idx += 4) {
      const distOval = Math.sqrt(xOvalSq[x] + nyOvalSq);
      const distCirc = Math.sqrt(xCircSq[x] + nyCircSq);
      const dist = ovalRatio * distOval + roundRatio * distCirc;

      if (dist > midNorm) {
        const t = Math.min(1, (dist - midNorm) / distRange);
        // Smoothstep: 3t^2 - 2t^3
        const s = t * t * (3 - 2 * t);
        const factor = 1 - amtRatio * s;

        data[idx] = Math.round(data[idx] * factor);
        data[idx + 1] = Math.round(data[idx + 1] * factor);
        data[idx + 2] = Math.round(data[idx + 2] * factor);
      }
    }
  }
}

export interface ChromaticAberrationOptions {
  shift: number; // in pixels (e.g. 0 to 50)
  direction?: number; // in degrees (0 to 360)
}

/**
 * Pure function to apply chromatic aberration (RGB channel shift) to ImageData.
 */
export function applyChromaticAberration(imageData: ImageData, options: ChromaticAberrationOptions): void {
  const { width, height, data } = imageData;
  if (width <= 0 || height <= 0) return;

  const shift = Math.max(0, options.shift);
  if (shift <= 0) return;

  const direction = ((options.direction ?? 0) % 360 + 360) % 360;
  const rad = (direction * Math.PI) / 180;
  const dx = Math.round(shift * Math.cos(rad));
  const dy = Math.round(shift * Math.sin(rad));

  if (dx === 0 && dy === 0) return;

  const src = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    // Red sampled from -dx, -dy
    const rY = Math.min(Math.max(y - dy, 0), height - 1);
    // Blue sampled from +dx, +dy
    const bY = Math.min(Math.max(y + dy, 0), height - 1);

    const destRow = y * width * 4;
    const rRow = rY * width * 4;
    const bRow = bY * width * 4;

    for (let x = 0; x < width; x++) {
      const rX = Math.min(Math.max(x - dx, 0), width - 1);
      const bX = Math.min(Math.max(x + dx, 0), width - 1);

      const destIdx = destRow + (x << 2);
      const rIdx = rRow + (rX << 2);
      const bIdx = bRow + (bX << 2);

      data[destIdx] = src[rIdx]; // Red
      // Green (destIdx + 1) stays unaltered
      data[destIdx + 2] = src[bIdx + 2]; // Blue
      data[destIdx + 3] = Math.max(src[destIdx + 3], src[rIdx + 3], src[bIdx + 3]); // Alpha
    }
  }
}

/**
 * Konva Vignette filter function
 */
export const VignetteFilter = function (this: any, imageData: ImageData): void {
  const amount = (typeof this?.vignetteAmount === 'function' ? this.vignetteAmount() : this?.getAttr?.('vignetteAmount')) ?? 0;
  const midpoint = (typeof this?.vignetteMidpoint === 'function' ? this.vignetteMidpoint() : this?.getAttr?.('vignetteMidpoint')) ?? 50;
  const roundness = (typeof this?.vignetteRoundness === 'function' ? this.vignetteRoundness() : this?.getAttr?.('vignetteRoundness')) ?? 50;

  applyVignette(imageData, { amount, midpoint, roundness });
};

/**
 * Konva Chromatic Aberration filter function
 */
export const ChromaticAberrationFilter = function (this: any, imageData: ImageData): void {
  const shift = (typeof this?.chromaticShift === 'function' ? this.chromaticShift() : this?.getAttr?.('chromaticShift')) ?? 0;
  const direction = (typeof this?.chromaticDirection === 'function' ? this.chromaticDirection() : this?.getAttr?.('chromaticDirection')) ?? 0;

  applyChromaticAberration(imageData, { shift, direction });
};

// Register filters on Konva.Filters
if (Konva.Filters) {
  (Konva.Filters as any).Vignette = VignetteFilter;
  (Konva.Filters as any).ChromaticAberration = ChromaticAberrationFilter;
}

// Register getter/setter attributes on Konva.Node
const konvaFactory = (Konva as any).Factory;
if (konvaFactory && Konva.Node) {
  try {
    konvaFactory.addGetterSetter(Konva.Node, 'vignetteAmount', 0, undefined, konvaFactory.afterSetFilter);
    konvaFactory.addGetterSetter(Konva.Node, 'vignetteMidpoint', 50, undefined, konvaFactory.afterSetFilter);
    konvaFactory.addGetterSetter(Konva.Node, 'vignetteRoundness', 50, undefined, konvaFactory.afterSetFilter);
    konvaFactory.addGetterSetter(Konva.Node, 'chromaticShift', 0, undefined, konvaFactory.afterSetFilter);
    konvaFactory.addGetterSetter(Konva.Node, 'chromaticDirection', 0, undefined, konvaFactory.afterSetFilter);
  } catch {
    // Ignore duplicate registrations
  }
}

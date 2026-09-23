export type GradientType = 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';

export interface GradientStop {
  offset: number; // 0.0 to 1.0
  color: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  stops: GradientStop[];
  dynamic?: 'foreground-background' | 'foreground-transparent';
}

export interface GradientToolOptions {
  type: GradientType;
  presetId: string;
  stops: GradientStop[];
  opacity: number; // 0.0 to 1.0
  reverse: boolean;
}

export interface ShapeGradientConfig {
  type: GradientType;
  stops: GradientStop[];
  presetId?: string;
  reverse?: boolean;
  opacity?: number;
  startX?: number; // local to shape
  startY?: number;
  endX?: number;
  endY?: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'fg-bg',
    name: 'Foreground to Background',
    dynamic: 'foreground-background',
    stops: [
      { offset: 0, color: '#000000' },
      { offset: 1, color: '#ffffff' },
    ],
  },
  {
    id: 'fg-trans',
    name: 'Foreground to Transparent',
    dynamic: 'foreground-transparent',
    stops: [
      { offset: 0, color: '#000000' },
      { offset: 1, color: 'rgba(0, 0, 0, 0)' },
    ],
  },
  {
    id: 'black-white',
    name: 'Black, White',
    stops: [
      { offset: 0, color: '#000000' },
      { offset: 1, color: '#ffffff' },
    ],
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    stops: [
      { offset: 0, color: '#ff0000' },
      { offset: 0.17, color: '#ff7f00' },
      { offset: 0.33, color: '#ffff00' },
      { offset: 0.5, color: '#00ff00' },
      { offset: 0.67, color: '#0000ff' },
      { offset: 0.83, color: '#4b0082' },
      { offset: 1, color: '#8f00ff' },
    ],
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    stops: [
      { offset: 0, color: '#fa709a' },
      { offset: 1, color: '#fee140' },
    ],
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    stops: [
      { offset: 0, color: '#2e3192' },
      { offset: 1, color: '#1bffff' },
    ],
  },
  {
    id: 'neon',
    name: 'Neon Pink',
    stops: [
      { offset: 0, color: '#f857a6' },
      { offset: 1, color: '#ff5858' },
    ],
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    stops: [
      { offset: 0, color: '#11998e' },
      { offset: 1, color: '#38ef7d' },
    ],
  },
  {
    id: 'chrome',
    name: 'Chrome Silver',
    stops: [
      { offset: 0, color: '#e0e0e0' },
      { offset: 0.25, color: '#ffffff' },
      { offset: 0.5, color: '#9e9e9e' },
      { offset: 0.75, color: '#eeeeee' },
      { offset: 1, color: '#616161' },
    ],
  },
];

export const DEFAULT_GRADIENT_OPTIONS: GradientToolOptions = {
  type: 'linear',
  presetId: 'fg-bg',
  stops: [
    { offset: 0, color: '#000000' },
    { offset: 1, color: '#ffffff' },
  ],
  opacity: 1,
  reverse: false,
};

/**
 * Resolves stops for a preset, taking active foreground and background colors into account
 */
export function resolveGradientStops(
  presetId: string,
  foregroundColor: string,
  backgroundColor: string,
  fallbackStops?: GradientStop[]
): GradientStop[] {
  const preset = GRADIENT_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return fallbackStops && fallbackStops.length > 0 ? fallbackStops : DEFAULT_GRADIENT_OPTIONS.stops;
  }

  if (preset.dynamic === 'foreground-background') {
    return [
      { offset: 0, color: foregroundColor },
      { offset: 1, color: backgroundColor },
    ];
  }

  if (preset.dynamic === 'foreground-transparent') {
    const [r, g, b] = parseColorToRgba(foregroundColor);
    return [
      { offset: 0, color: `rgba(${r}, ${g}, ${b}, 1)` },
      { offset: 1, color: `rgba(${r}, ${g}, ${b}, 0)` },
    ];
  }

  return preset.stops;
}

/**
 * Parses any color format (hex, rgb, rgba, transparent, white, black) to [r, g, b, a] (0-255)
 */
export function parseColorToRgba(colorStr: string): [number, number, number, number] {
  if (!colorStr) return [0, 0, 0, 255];
  const str = colorStr.trim().toLowerCase();

  if (str === 'transparent') return [0, 0, 0, 0];
  if (str === 'white') return [255, 255, 255, 255];
  if (str === 'black') return [0, 0, 0, 255];

  // Hex format: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b, 255];
    }
    if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = parseInt(hex[3] + hex[3], 16);
      return [r, g, b, a];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b, 255];
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16);
      return [r, g, b, a];
    }
  }

  // rgb/rgba format: rgb(r, g, b) or rgba(r, g, b, a)
  const match = str.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (match) {
    const r = Math.round(parseFloat(match[1]));
    const g = Math.round(parseFloat(match[2]));
    const b = Math.round(parseFloat(match[3]));
    const a = match[4] !== undefined ? Math.round(parseFloat(match[4]) <= 1 ? parseFloat(match[4]) * 255 : parseFloat(match[4])) : 255;
    return [
      Math.max(0, Math.min(255, r)),
      Math.max(0, Math.min(255, g)),
      Math.max(0, Math.min(255, b)),
      Math.max(0, Math.min(255, a)),
    ];
  }

  return [0, 0, 0, 255];
}

/**
 * Builds a fast lookup table (1024 RGBA samples) for color stops
 */
export function buildGradientLUT(
  stops: GradientStop[],
  reverse: boolean = false,
  opacity: number = 1.0
): Uint32Array {
  const lutSize = 1024;
  const lut32 = new Uint32Array(lutSize);

  if (!stops || stops.length === 0) {
    const defaultColor = (Math.round(255 * opacity) << 24);
    lut32.fill(defaultColor);
    return lut32;
  }

  // Sort stops by offset
  const sortedStops = [...stops].sort((a, b) => a.offset - b.offset);

  // Normalize stops to span 0 to 1
  const preparedStops: { offset: number; rgba: [number, number, number, number] }[] = [];
  if (sortedStops[0].offset > 0) {
    preparedStops.push({
      offset: 0,
      rgba: parseColorToRgba(sortedStops[0].color),
    });
  }
  for (const s of sortedStops) {
    preparedStops.push({
      offset: Math.max(0, Math.min(1, s.offset)),
      rgba: parseColorToRgba(s.color),
    });
  }
  if (preparedStops[preparedStops.length - 1].offset < 1) {
    preparedStops.push({
      offset: 1,
      rgba: parseColorToRgba(sortedStops[sortedStops.length - 1].color),
    });
  }

  for (let i = 0; i < lutSize; i++) {
    let t = i / (lutSize - 1);
    if (reverse) {
      t = 1 - t;
    }

    // Find bounding stops
    let low = preparedStops[0];
    let high = preparedStops[preparedStops.length - 1];

    for (let j = 0; j < preparedStops.length - 1; j++) {
      if (t >= preparedStops[j].offset && t <= preparedStops[j + 1].offset) {
        low = preparedStops[j];
        high = preparedStops[j + 1];
        break;
      }
    }

    const range = high.offset - low.offset;
    const factor = range > 1e-6 ? (t - low.offset) / range : 0;

    const r = Math.round(low.rgba[0] + (high.rgba[0] - low.rgba[0]) * factor);
    const g = Math.round(low.rgba[1] + (high.rgba[1] - low.rgba[1]) * factor);
    const b = Math.round(low.rgba[2] + (high.rgba[2] - low.rgba[2]) * factor);
    const a = Math.round((low.rgba[3] + (high.rgba[3] - low.rgba[3]) * factor) * opacity);

    // Pack into little-endian Uint32 (A << 24 | B << 16 | G << 8 | R)
    lut32[i] = ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
  }

  return lut32;
}

/**
 * Computes normalized parameter t (0.0 to 1.0) for a given pixel (x, y)
 * according to gradient type and start/end coordinates.
 */
export function computeGradientT(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  type: GradientType
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-6) {
    return 0;
  }

  const px = x - x0;
  const py = y - y0;

  switch (type) {
    case 'linear': {
      const proj = px * dx + py * dy;
      const t = proj / lenSq;
      return t < 0 ? 0 : t > 1 ? 1 : t;
    }
    case 'radial': {
      const dist = Math.sqrt(px * px + py * py);
      const radius = Math.sqrt(lenSq);
      const t = dist / radius;
      return t < 0 ? 0 : t > 1 ? 1 : t;
    }
    case 'angle': {
      const refAngle = Math.atan2(dy, dx);
      const angle = Math.atan2(py, px);
      let diff = angle - refAngle;
      diff = ((diff % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const t = diff / (Math.PI * 2);
      return t < 0 ? 0 : t > 1 ? 1 : t;
    }
    case 'reflected': {
      const proj = Math.abs(px * dx + py * dy);
      const t = proj / lenSq;
      return t < 0 ? 0 : t > 1 ? 1 : t;
    }
    case 'diamond': {
      const u = Math.abs(px * dx + py * dy);
      const v = Math.abs(-px * dy + py * dx);
      const t = (u + v) / lenSq;
      return t < 0 ? 0 : t > 1 ? 1 : t;
    }
    default:
      return 0;
  }
}

/**
 * Renders gradient pixels into an ImageData buffer using fast LUT indexing
 */
export function renderGradientToImageData(
  imageData: ImageData,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  type: GradientType,
  stops: GradientStop[],
  reverse: boolean = false,
  opacity: number = 1.0
): void {
  const lut32 = buildGradientLUT(stops, reverse, opacity);
  const lutMask = 1023;
  const pixels32 = new Uint32Array(imageData.data.buffer);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const t = computeGradientT(x, y, x0, y0, x1, y1, type);
      const lutIndex = (t * lutMask + 0.5) | 0;
      pixels32[rowOffset + x] = lut32[lutIndex];
    }
  }
}

/**
 * Creates an HTMLCanvasElement with the gradient rendered on it
 */
export function renderGradientCanvas(
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  type: GradientType,
  stops: GradientStop[],
  reverse: boolean = false,
  opacity: number = 1.0
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.createImageData(canvas.width, canvas.height);
  renderGradientToImageData(
    imageData,
    canvas.width,
    canvas.height,
    x0,
    y0,
    x1,
    y1,
    type,
    stops,
    reverse,
    opacity
  );
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * Renders a shape gradient canvas matching shape dimensions
 */
export function renderShapeGradientCanvas(
  width: number,
  height: number,
  config: ShapeGradientConfig
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  const x0 = config.startX !== undefined ? config.startX : 0;
  const y0 = config.startY !== undefined ? config.startY : 0;
  const x1 = config.endX !== undefined ? config.endX : w;
  const y1 = config.endY !== undefined ? config.endY : (config.type === 'radial' ? 0 : h);

  return renderGradientCanvas(
    w,
    h,
    x0,
    y0,
    x1,
    y1,
    config.type,
    config.stops,
    config.reverse ?? false,
    config.opacity ?? 1.0
  );
}

/**
 * Formats stops as CSS linear-gradient string for preview swatches
 */
export function formatCssGradient(stops: GradientStop[], angle = 90): string {
  if (!stops || stops.length === 0) return 'none';
  const sorted = [...stops].sort((a, b) => a.offset - b.offset);
  const stopsStr = sorted.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
  return `linear-gradient(${angle}deg, ${stopsStr})`;
}

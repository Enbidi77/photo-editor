import { GradientToolOptions, DEFAULT_GRADIENT_OPTIONS } from '@/lib/image/gradient';

export type ToolType =
  | 'move'
  | 'marquee'
  | 'lasso'
  | 'magic-wand'
  | 'crop'
  | 'eyedropper'
  | 'brush'
  | 'eraser'
  | 'clone'
  | 'gradient'
  | 'paint-bucket'
  | 'pen'
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'hand'
  | 'zoom';

export interface BrushPreset {
  id: string;
  name: string;
  size: number;
  hardness: number; // 0 to 1
  opacity: number; // 0 to 1
  flow: number; // 0 to 1
}

export const DEFAULT_BRUSH_PRESETS: BrushPreset[] = [
  { id: 'soft-round-sm', name: 'Soft Round Small', size: 10, hardness: 0.2, opacity: 1, flow: 1 },
  { id: 'soft-round-md', name: 'Soft Round Medium', size: 30, hardness: 0.2, opacity: 1, flow: 1 },
  { id: 'hard-round-sm', name: 'Hard Round Small', size: 8, hardness: 1.0, opacity: 1, flow: 1 },
  { id: 'hard-round-md', name: 'Hard Round Medium', size: 24, hardness: 1.0, opacity: 1, flow: 1 },
  { id: 'hard-round-lg', name: 'Hard Round Large', size: 60, hardness: 1.0, opacity: 1, flow: 1 },
  { id: 'airbrush', name: 'Airbrush Soft', size: 45, hardness: 0.05, opacity: 0.5, flow: 0.4 },
];

export type CropAspect = 'free' | '1:1' | '16:9' | '4:3' | '9:16' | 'custom';

export interface ToolOptions {
  brush: {
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
  };
  eraser: {
    size: number;
    opacity: number;
  };
  text: {
    fontFamily: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold' | '300' | '400' | '500' | '600' | '700' | '800';
    fontStyle: 'normal' | 'italic';
    align: 'left' | 'center' | 'right' | 'justify';
    color: string;
    lineHeight: number;
    letterSpacing: number;
  };
  shape: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius: number;
    sides: number;
  };
  marquee: {
    shape: 'rect' | 'ellipse';
    feather: number;
  };
  crop: {
    aspect: CropAspect;
    active: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zoom: {
    mode: 'in' | 'out';
  };
  lasso: Record<string, never>; // freehand selection, no special options
  magicWand: {
    tolerance: number;        // 0–255, color distance threshold
    contiguous: boolean;      // only select connected pixels
    sampleAllLayers: boolean; // sample composite or active layer only
  };
  gradient: GradientToolOptions;
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  brush: {
    size: 20,
    hardness: 0.8,
    opacity: 1,
    flow: 1,
  },
  eraser: {
    size: 30,
    opacity: 1,
  },
  text: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 36,
    fontWeight: '600',
    fontStyle: 'normal',
    align: 'left',
    color: '#ffffff',
    lineHeight: 1.2,
    letterSpacing: 0,
  },
  shape: {
    fill: '#0078d4',
    stroke: '#ffffff',
    strokeWidth: 0,
    cornerRadius: 8,
    sides: 5,
  },
  marquee: {
    shape: 'rect',
    feather: 0,
  },
  crop: {
    aspect: 'free',
    active: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  },
  zoom: {
    mode: 'in',
  },
  lasso: {},
  magicWand: {
    tolerance: 32,
    contiguous: true,
    sampleAllLayers: false,
  },
  gradient: DEFAULT_GRADIENT_OPTIONS,
};

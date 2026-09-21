export type LayerType = 'IMAGE' | 'TEXT' | 'SHAPE' | 'PAINT' | 'ADJUSTMENT' | 'GROUP';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  scaleX?: number;
  scaleY?: number;
  zIndex: number;
  parentId: string | null;
}

export interface ImageAdjustments {
  brightness: number; // -1 to 1, default 0
  contrast: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  hue: number; // -180 to 180, default 0
  exposure: number; // -100 to 100, default 0
  blur: number; // 0 to 40, default 0
  noise: number; // 0 to 1, default 0
  grayscale: boolean;
  invert: boolean;
  sepia: boolean;
  sharpen: boolean;
  pixelate: number; // 0 (off) or block size (e.g. 8)
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  exposure: 0,
  blur: 0,
  noise: 0,
  grayscale: false,
  invert: false,
  sepia: false,
  sharpen: false,
  pixelate: 0,
};

export interface ImageLayer extends BaseLayer {
  type: 'IMAGE';
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  adjustments: ImageAdjustments;
}

export interface TextLayer extends BaseLayer {
  type: 'TEXT';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '300' | '400' | '500' | '600' | '700' | '800';
  fontStyle: 'normal' | 'italic';
  fill: string;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  underline: boolean;
}

export type ShapeKind = 'rect' | 'rounded-rect' | 'circle' | 'ellipse' | 'polygon' | 'line';

export interface ShapeLayer extends BaseLayer {
  type: 'SHAPE';
  shapeKind: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  sides?: number; // for polygon
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface PaintPath {
  id: string;
  points: number[]; // [x0, y0, x1, y1, ...]
  color: string;
  size: number;
  opacity: number;
  isEraser: boolean;
}

export interface PaintLayer extends BaseLayer {
  type: 'PAINT';
  paths: PaintPath[];
}

export interface AdjustmentLayer extends BaseLayer {
  type: 'ADJUSTMENT';
  adjustments: ImageAdjustments;
}

export interface GroupLayer extends BaseLayer {
  type: 'GROUP';
  childIds: string[];
}

export type Layer = ImageLayer | TextLayer | ShapeLayer | PaintLayer | AdjustmentLayer | GroupLayer;

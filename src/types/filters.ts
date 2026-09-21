import { ImageAdjustments } from './layer';

export type FilterType =
  | 'blur'
  | 'sharpen'
  | 'grayscale'
  | 'invert'
  | 'sepia'
  | 'noise'
  | 'pixelate'
  | 'brightness-contrast'
  | 'hue-saturation'
  | 'exposure';

export interface FilterDefinition {
  id: FilterType;
  name: string;
  category: 'Blur & Sharpen' | 'Color & Tone' | 'Stylize' | 'Adjustments';
  description: string;
}

export const AVAILABLE_FILTERS: FilterDefinition[] = [
  { id: 'brightness-contrast', name: 'Brightness / Contrast', category: 'Adjustments', description: 'Adjust tonal range and overall luminance' },
  { id: 'hue-saturation', name: 'Hue / Saturation', category: 'Adjustments', description: 'Modify color tint and color intensity' },
  { id: 'exposure', name: 'Exposure', category: 'Adjustments', description: 'Simulate camera exposure stops' },
  { id: 'blur', name: 'Gaussian Blur', category: 'Blur & Sharpen', description: 'Smooth out details with gaussian convolution' },
  { id: 'sharpen', name: 'Sharpen', category: 'Blur & Sharpen', description: 'Enhance edge contrast and crispness' },
  { id: 'grayscale', name: 'Black & White', category: 'Color & Tone', description: 'Convert color to monochromatic grayscale' },
  { id: 'sepia', name: 'Sepia', category: 'Color & Tone', description: 'Apply warm vintage nostalgic sepia toning' },
  { id: 'invert', name: 'Invert Colors', category: 'Color & Tone', description: 'Invert every color channel (photo negative)' },
  { id: 'noise', name: 'Add Noise', category: 'Stylize', description: 'Introduce subtle film grain texture' },
  { id: 'pixelate', name: 'Pixelate / Mosaic', category: 'Stylize', description: 'Group pixels into large retro mosaic blocks' },
];

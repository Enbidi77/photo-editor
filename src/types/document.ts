export type ColorMode = 'RGB';

export interface DocumentDimensions {
  width: number;
  height: number;
  resolution: number; // DPI, default 72
}

export interface DocumentPreset {
  id: string;
  name: string;
  category: 'Web' | 'Social' | 'Print' | 'Photo';
  width: number;
  height: number;
  resolution: number;
  description?: string;
}

export const DOCUMENT_PRESETS: DocumentPreset[] = [
  { id: 'web-fhd', name: 'Web Large (FHD)', category: 'Web', width: 1920, height: 1080, resolution: 72, description: '1920 × 1080 px' },
  { id: 'web-4k', name: 'Web 4K UHD', category: 'Web', width: 3840, height: 2160, resolution: 72, description: '3840 × 2160 px' },
  { id: 'web-standard', name: 'Web Medium', category: 'Web', width: 1440, height: 900, resolution: 72, description: '1440 × 900 px' },
  { id: 'insta-square', name: 'Instagram Square', category: 'Social', width: 1080, height: 1080, resolution: 72, description: '1080 × 1080 px (1:1)' },
  { id: 'insta-portrait', name: 'Instagram Portrait', category: 'Social', width: 1080, height: 1350, resolution: 72, description: '1080 × 1350 px (4:5)' },
  { id: 'insta-story', name: 'Story / Reel', category: 'Social', width: 1080, height: 1920, resolution: 72, description: '1080 × 1920 px (9:16)' },
  { id: 'youtube-thumb', name: 'YouTube Thumbnail', category: 'Social', width: 1280, height: 720, resolution: 72, description: '1280 × 720 px (16:9)' },
  { id: 'print-a4', name: 'A4 Document', category: 'Print', width: 2480, height: 3508, resolution: 300, description: '210 × 297 mm @ 300 DPI' },
  { id: 'print-a3', name: 'A3 Document', category: 'Print', width: 3508, height: 4960, resolution: 300, description: '297 × 420 mm @ 300 DPI' },
  { id: 'photo-landscape', name: 'Landscape Photo', category: 'Photo', width: 2400, height: 1600, resolution: 300, description: '6 × 4 in @ 300 DPI' },
];

export interface DocumentMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  resolution: number;
  backgroundColor: string; // e.g., '#ffffff' or 'transparent'
  colorMode: ColorMode;
  createdAt: number;
  updatedAt: number;
  isDirty?: boolean;
}

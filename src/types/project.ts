import { DocumentMeta } from './document';
import { Layer } from './layer';

export interface ProjectAsset {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string; // Base64 data URL
}

export interface PixelForgeProject {
  version: 1;
  id: string;
  document: DocumentMeta;
  layers: Layer[];
  thumbnail?: string; // Small preview data URL
  assets?: ProjectAsset[];
  createdAt: number;
  updatedAt: number;
}

export interface RecentProjectSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: number;
  thumbnail?: string;
  layerCount: number;
}

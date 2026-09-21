import { saveAs } from 'file-saver';
import Konva from 'konva';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0.1 to 1.0
  pixelRatio: number; // 0.5, 1, 2, 4
  filename: string;
  transparentBackground?: boolean;
}

export class Exporter {
  /**
   * Export a Konva Stage to an image file and prompt download
   */
  static async exportStage(stage: Konva.Stage, options: ExportOptions): Promise<void> {
    const mimeType = options.format === 'png' ? 'image/png' : options.format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const quality = options.format === 'png' ? undefined : options.quality;

    return new Promise((resolve, reject) => {
      try {
        const dataUrl = stage.toDataURL({
          mimeType,
          quality,
          pixelRatio: options.pixelRatio,
        });

        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });

        const extension = options.format;
        const cleanName = options.filename.replace(/\.[^/.]+$/, '');
        saveAs(blob, `${cleanName}.${extension}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate a small thumbnail data URL for a project
   */
  static getThumbnail(stage: Konva.Stage, maxWidth = 320): string {
    try {
      const stageWidth = stage.width();
      const pixelRatio = Math.min(1, maxWidth / (stageWidth || 1));
      return stage.toDataURL({
        mimeType: 'image/jpeg',
        quality: 0.7,
        pixelRatio,
      });
    } catch {
      return '';
    }
  }
}

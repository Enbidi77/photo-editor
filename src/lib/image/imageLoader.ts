export interface LoadedImageInfo {
  dataUrl: string;
  name: string;
  width: number;
  height: number;
}

export class ImageLoader {
  /**
   * Load an image File or Blob into a dataUrl and extract dimensions
   */
  static async loadFromFile(file: File | Blob, customName?: string): Promise<LoadedImageInfo> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl,
            name: customName || (file instanceof File ? file.name : 'Imported Image'),
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          });
        };
        img.onerror = () => reject(new Error('Failed to load image element'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Read image data from a clipboard DataTransferItemList
   */
  static async loadFromClipboard(items: DataTransferItemList): Promise<LoadedImageInfo | null> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          return this.loadFromFile(file, `Pasted Image ${new Date().toLocaleTimeString()}`);
        }
      }
    }
    return null;
  }
}

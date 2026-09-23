import { PixelForgeProject } from '@/types/project';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { saveAs } from 'file-saver';

export class PxfSerializer {
  /**
   * Serialize current document state into a PixelForgeProject object
   */
  static serialize(thumbnail?: string): PixelForgeProject {
    const doc = useDocumentStore.getState().document;
    const layers = useLayerStore.getState().layers;

    if (!doc) {
      throw new Error('No active document to serialize');
    }

    const project: PixelForgeProject = {
      version: 1,
      id: doc.id,
      document: { ...doc, updatedAt: Date.now() },
      layers: JSON.parse(JSON.stringify(layers)),
      thumbnail,
      createdAt: doc.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    return project;
  }

  /**
   * Export the project as a downloadable .pxf file
   */
  static exportToFile(thumbnail?: string): void {
    const project = this.serialize(thumbnail);
    const jsonString = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const filename = `${project.document.name.replace(/\.[^/.]+$/, '')}.pxf`;
    saveAs(blob, filename);
  }

  /**
   * Load and restore state from a PixelForgeProject object
   */
  static deserialize(project: PixelForgeProject): void {
    if (!project || project.version !== 1 || !project.document || !Array.isArray(project.layers)) {
      throw new Error('Invalid or corrupted .pxf project file format.');
    }

    useDocumentStore.getState().setDocument(project.document);
    useLayerStore.getState().setLayers(project.layers);
    useHistoryStore.getState().clearHistory('Open Project');
  }

  /**
   * Parse a file from an input element and load it
   */
  static async loadFromFile(file: File): Promise<PixelForgeProject> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed: PixelForgeProject = JSON.parse(content);
          this.deserialize(parsed);
          resolve(parsed);
        } catch (err) {
          reject(new Error('Failed to parse project file.'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error.'));
      reader.readAsText(file);
    });
  }
}

import { nanoid } from 'nanoid';
import { EditorOperation, OperationType, EditorOperationSchema } from '@/types/operation';
import { Layer, BlendMode } from '@/types/layer';
import { DocumentMeta } from '@/types/document';
import { useLayerStore } from '@/store/layerStore';
import { useDocumentStore } from '@/store/documentStore';

export class OperationFactory {
  static create<T>(
    type: OperationType,
    projectId: string,
    userId: string,
    payload: T
  ): EditorOperation<T> {
    return {
      id: nanoid(),
      projectId,
      userId,
      type,
      timestamp: Date.now(),
      payload,
    };
  }

  static addLayer(projectId: string, userId: string, layer: Layer, index = 0) {
    return this.create('ADD_LAYER', projectId, userId, { layer, index });
  }

  static deleteLayer(projectId: string, userId: string, layerId: string) {
    return this.create('DELETE_LAYER', projectId, userId, { layerId });
  }

  static transformLayer(
    projectId: string,
    userId: string,
    layerId: string,
    transform: { x: number; y: number; width: number; height: number; rotation: number }
  ) {
    return this.create('TRANSFORM_LAYER', projectId, userId, { layerId, transform });
  }

  static updateLayer(projectId: string, userId: string, layerId: string, patch: Partial<Layer>) {
    return this.create('UPDATE_LAYER', projectId, userId, { layerId, patch });
  }

  static reorderLayer(projectId: string, userId: string, startIndex: number, endIndex: number) {
    return this.create('REORDER_LAYER', projectId, userId, { startIndex, endIndex });
  }

  static updateOpacity(projectId: string, userId: string, layerId: string, opacity: number) {
    return this.create('UPDATE_OPACITY', projectId, userId, { layerId, opacity });
  }

  static updateBlendMode(projectId: string, userId: string, layerId: string, blendMode: BlendMode) {
    return this.create('UPDATE_BLEND_MODE', projectId, userId, { layerId, blendMode });
  }

  static updateDocument(projectId: string, userId: string, patch: Partial<DocumentMeta>) {
    return this.create('UPDATE_DOCUMENT', projectId, userId, { patch });
  }
}

let isApplyingRemoteOperation = false;

export function getIsApplyingRemoteOperation(): boolean {
  return isApplyingRemoteOperation;
}

export function setIsApplyingRemoteOperation(applying: boolean): void {
  isApplyingRemoteOperation = applying;
}

/**
 * Validates and safely applies a remote operation to local Zustand state.
 * Implements structural conflict safety: no-op if referenced layers don't exist.
 */
export function applyRemoteOperation(op: EditorOperation): boolean {
  const result = EditorOperationSchema.safeParse(op);
  if (!result.success) {
    console.warn('Invalid remote operation rejected:', result.error);
    return false;
  }

  const prevApplying = isApplyingRemoteOperation;
  isApplyingRemoteOperation = true;

  const layerStore = useLayerStore.getState();
  const docStore = useDocumentStore.getState();

  try {
    switch (op.type) {
      case 'ADD_LAYER': {
        const { layer, index } = op.payload as { layer: Layer; index: number };
        // Avoid duplicate insertion
        if (layerStore.layers.some((l) => l.id === layer.id)) {
          return false;
        }
        layerStore.addLayer(layer, index ?? 0);
        return true;
      }

      case 'DELETE_LAYER': {
        const { layerId } = op.payload as { layerId: string };
        layerStore.removeLayer(layerId);
        return true;
      }

      case 'TRANSFORM_LAYER': {
        const { layerId, transform } = op.payload as {
          layerId: string;
          transform: { x: number; y: number; width: number; height: number; rotation: number };
        };
        // Safe check: does layer exist?
        const exists = layerStore.layers.some((l) => l.id === layerId);
        if (!exists) return false;

        layerStore.updateLayer(layerId, transform);
        return true;
      }

      case 'UPDATE_LAYER': {
        const { layerId, patch } = op.payload as { layerId: string; patch: Partial<Layer> };
        const exists = layerStore.layers.some((l) => l.id === layerId);
        if (!exists) return false;

        layerStore.updateLayer(layerId, patch);
        return true;
      }

      case 'REORDER_LAYER': {
        const { startIndex, endIndex } = op.payload as { startIndex: number; endIndex: number };
        layerStore.reorderLayers(startIndex, endIndex);
        return true;
      }

      case 'UPDATE_OPACITY': {
        const { layerId, opacity } = op.payload as { layerId: string; opacity: number };
        layerStore.setLayerOpacity(layerId, opacity);
        return true;
      }

      case 'UPDATE_BLEND_MODE': {
        const { layerId, blendMode } = op.payload as { layerId: string; blendMode: BlendMode };
        layerStore.setLayerBlendMode(layerId, blendMode);
        return true;
      }

      case 'UPDATE_DOCUMENT': {
        const { patch } = op.payload as { patch: Partial<DocumentMeta> };
        docStore.updateDocument(patch, false);
        return true;
      }

      default:
        console.warn('Unhandled operation type:', op.type);
        return false;
    }
  } catch (err) {
    console.error('Error applying remote operation:', err);
    return false;
  } finally {
    isApplyingRemoteOperation = prevApplying;
  }
}

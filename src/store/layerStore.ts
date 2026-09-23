import { create } from 'zustand';
import { Layer, BlendMode } from '../types/layer';
import { nanoid } from 'nanoid';

interface LayerState {
  layers: Layer[];
  activeLayerId: string | null;
  selectedLayerIds: string[];
  editingMaskLayerId: string | null; // which layer's mask is being painted

  // Actions
  setLayers: (layers: Layer[]) => void;
  setActiveLayerId: (id: string | null) => void;
  setSelectedLayerIds: (ids: string[]) => void;
  selectLayer: (id: string, multiSelect?: boolean) => void;

  addLayer: (layer: Layer, index?: number) => void;
  removeLayer: (id: string) => void;
  updateLayer: <T extends Layer>(id: string, patch: Partial<T>) => void;
  duplicateLayer: (id: string) => Layer | null;

  reorderLayers: (startIndex: number, endIndex: number) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: BlendMode) => void;
  renameLayer: (id: string, name: string) => void;
  clearLayers: () => void;

  // Mask actions
  addMask: (layerId: string, docWidth: number, docHeight: number) => void;
  removeMask: (layerId: string) => void;
  toggleMaskEnabled: (layerId: string) => void;
  toggleMaskLinked: (layerId: string) => void;
  updateMaskData: (layerId: string, dataUrl: string) => void;
  setEditingMask: (layerId: string | null) => void;
  applyMask: (layerId: string) => void;
}

export const useLayerStore = create<LayerState>((set, get) => ({
  layers: [],
  activeLayerId: null,
  selectedLayerIds: [],
  editingMaskLayerId: null,

  setLayers: (layers) =>
    set({
      layers,
      activeLayerId: layers.length > 0 ? layers[0].id : null,
      selectedLayerIds: layers.length > 0 ? [layers[0].id] : [],
    }),

  setActiveLayerId: (id) =>
    set({
      activeLayerId: id,
      selectedLayerIds: id ? [id] : [],
    }),

  setSelectedLayerIds: (ids) =>
    set({
      selectedLayerIds: ids,
      activeLayerId: ids.length > 0 ? ids[0] : null,
    }),

  selectLayer: (id, multiSelect = false) => {
    const { selectedLayerIds } = get();
    if (multiSelect) {
      if (selectedLayerIds.includes(id)) {
        const next = selectedLayerIds.filter((item) => item !== id);
        set({
          selectedLayerIds: next,
          activeLayerId: next.length > 0 ? next[0] : null,
        });
      } else {
        const next = [id, ...selectedLayerIds];
        set({ selectedLayerIds: next, activeLayerId: id });
      }
    } else {
      set({ selectedLayerIds: [id], activeLayerId: id });
    }
  },

  addLayer: (layer, index = 0) => {
    const { layers } = get();
    const nextLayers = [...layers];
    nextLayers.splice(index, 0, layer);
    set({
      layers: nextLayers,
      activeLayerId: layer.id,
      selectedLayerIds: [layer.id],
    });
  },

  removeLayer: (id) => {
    const { layers, activeLayerId } = get();
    const nextLayers = layers.filter((l) => l.id !== id);
    let nextActiveId = activeLayerId;
    if (activeLayerId === id) {
      nextActiveId = nextLayers.length > 0 ? nextLayers[0].id : null;
    }
    set({
      layers: nextLayers,
      activeLayerId: nextActiveId,
      selectedLayerIds: nextActiveId ? [nextActiveId] : [],
    });
  },

  updateLayer: <T extends Layer>(id: string, patch: Partial<T>) => {
    const { layers } = get();
    set({
      layers: layers.map((layer) => {
        if (layer.id !== id) return layer;
        return { ...layer, ...patch } as Layer;
      }),
    });
  },

  duplicateLayer: (id) => {
    const { layers } = get();
    const targetIndex = layers.findIndex((l) => l.id === id);
    if (targetIndex === -1) return null;

    const source = layers[targetIndex];
    const duplicated: Layer = {
      ...JSON.parse(JSON.stringify(source)),
      id: nanoid(),
      name: `${source.name} copy`,
      x: source.x + 20,
      y: source.y + 20,
    };

    const nextLayers = [...layers];
    nextLayers.splice(targetIndex, 0, duplicated);

    set({
      layers: nextLayers,
      activeLayerId: duplicated.id,
      selectedLayerIds: [duplicated.id],
    });
    return duplicated;
  },

  reorderLayers: (startIndex, endIndex) => {
    const { layers } = get();
    if (
      startIndex < 0 ||
      startIndex >= layers.length ||
      endIndex < 0 ||
      endIndex >= layers.length
    ) {
      return;
    }
    const result = [...layers];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    set({ layers: result });
  },

  bringForward: (id) => {
    const { layers } = get();
    const index = layers.findIndex((l) => l.id === id);
    if (index > 0) {
      get().reorderLayers(index, index - 1);
    }
  },

  sendBackward: (id) => {
    const { layers } = get();
    const index = layers.findIndex((l) => l.id === id);
    if (index !== -1 && index < layers.length - 1) {
      get().reorderLayers(index, index + 1);
    }
  },

  bringToFront: (id) => {
    const { layers } = get();
    const index = layers.findIndex((l) => l.id === id);
    if (index > 0) {
      get().reorderLayers(index, 0);
    }
  },

  sendToBack: (id) => {
    const { layers } = get();
    const index = layers.findIndex((l) => l.id === id);
    if (index !== -1 && index < layers.length - 1) {
      get().reorderLayers(index, layers.length - 1);
    }
  },

  toggleVisibility: (id) => {
    const { layers } = get();
    set({
      layers: layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    });
  },

  toggleLock: (id) => {
    const { layers } = get();
    set({
      layers: layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    });
  },

  setLayerOpacity: (id, opacity) => {
    const clamped = Math.max(0, Math.min(1, opacity));
    get().updateLayer(id, { opacity: clamped });
  },

  setLayerBlendMode: (id, blendMode) => {
    get().updateLayer(id, { blendMode });
  },

  renameLayer: (id, name) => {
    get().updateLayer(id, { name });
  },

  clearLayers: () => set({ layers: [], activeLayerId: null, selectedLayerIds: [], editingMaskLayerId: null }),

  // Mask actions
  addMask: (layerId, docWidth, docHeight) => {
    let dataUrl = '';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = docWidth;
      canvas.height = docHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, docWidth, docHeight);
      }
      dataUrl = canvas.toDataURL('image/png') || '';
    } catch {
      // Fallback for non-browser/jsdom environments without canvas support
      dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    }
    if (!dataUrl) {
      dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    }

    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === layerId
          ? { ...l, mask: { enabled: true, linked: true, dataUrl } }
          : l
      ),
    });
  },

  removeMask: (layerId) => {
    const { layers, editingMaskLayerId } = get();
    set({
      layers: layers.map((l) => {
        if (l.id !== layerId) return l;
        const { mask: _mask, ...rest } = l;
        return rest as Layer;
      }),
      editingMaskLayerId: editingMaskLayerId === layerId ? null : editingMaskLayerId,
    });
  },

  toggleMaskEnabled: (layerId) => {
    const { layers } = get();
    set({
      layers: layers.map((l) => {
        if (l.id !== layerId || !l.mask) return l;
        return { ...l, mask: { ...l.mask, enabled: !l.mask.enabled } };
      }),
    });
  },

  toggleMaskLinked: (layerId) => {
    const { layers } = get();
    set({
      layers: layers.map((l) => {
        if (l.id !== layerId || !l.mask) return l;
        return { ...l, mask: { ...l.mask, linked: !l.mask.linked } };
      }),
    });
  },

  updateMaskData: (layerId, dataUrl) => {
    const { layers } = get();
    set({
      layers: layers.map((l) => {
        if (l.id !== layerId || !l.mask) return l;
        return { ...l, mask: { ...l.mask, dataUrl } };
      }),
    });
  },

  setEditingMask: (layerId) => {
    set({ editingMaskLayerId: layerId });
  },

  applyMask: (layerId) => {
    // Apply mask is a destructive action — remove the mask
    // The actual pixel flattening is handled by the command that calls this
    const { layers, editingMaskLayerId } = get();
    set({
      layers: layers.map((l) => {
        if (l.id !== layerId) return l;
        const { mask: _mask, ...rest } = l;
        return rest as Layer;
      }),
      editingMaskLayerId: editingMaskLayerId === layerId ? null : editingMaskLayerId,
    });
  },
}));

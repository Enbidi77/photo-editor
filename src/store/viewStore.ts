import { create } from 'zustand';

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export interface SmartGuide {
  orientation: 'horizontal' | 'vertical';
  position: number;  // in document coordinates
  type: 'edge' | 'center'; // edge alignment vs center alignment
}

interface ViewState {
  zoom: number; // 1 = 100%
  panX: number;
  panY: number;
  rotation: number;

  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
  snapToLayers: boolean;

  // Smart guides & snapping
  snapEnabled: boolean;          // master toggle
  snapThreshold: number;         // pixel threshold for snapping
  snapToDocumentBounds: boolean; // snap to document edges/center
  activeSmartGuides: SmartGuide[]; // transient alignment lines during drag

  guides: Guide[];
  cursorPos: { x: number; y: number };

  // Actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToViewport: (vpW: number, vpH: number, docW: number, docH: number) => void;
  setPan: (panX: number, panY: number) => void;
  panBy: (dx: number, dy: number) => void;
  resetPan: () => void;

  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  toggleSnapToGrid: () => void;
  setSnapEnabled: (enabled: boolean) => void;
  toggleSnapEnabled: () => void;
  setSnapThreshold: (px: number) => void;
  setSnapToDocumentBounds: (enabled: boolean) => void;
  setSnapToLayers: (enabled: boolean) => void;
  setSnapToGuides: (enabled: boolean) => void;
  setActiveSmartGuides: (guides: SmartGuide[]) => void;
  clearSmartGuides: () => void;

  addGuide: (orientation: 'horizontal' | 'vertical', position: number) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;
  setCursorPos: (x: number, y: number) => void;
}

const ZOOM_LEVELS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32];

export const useViewStore = create<ViewState>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,

  showGrid: false,
  showRulers: true,
  showGuides: true,
  snapToGrid: false,
  snapToGuides: true,
  snapToLayers: true,

  snapEnabled: true,
  snapThreshold: 5,
  snapToDocumentBounds: true,
  activeSmartGuides: [],

  guides: [],
  cursorPos: { x: 0, y: 0 },

  setZoom: (zoom) => {
    const clamped = Math.max(0.05, Math.min(32, zoom));
    set({ zoom: clamped });
  },

  zoomIn: () => {
    const current = get().zoom;
    const next = ZOOM_LEVELS.find((lvl) => lvl > current + 0.01) || current * 1.5;
    get().setZoom(next);
  },

  zoomOut: () => {
    const current = get().zoom;
    const prev = [...ZOOM_LEVELS].reverse().find((lvl) => lvl < current - 0.01) || current / 1.5;
    get().setZoom(prev);
  },

  resetZoom: () => set({ zoom: 1 }),

  fitToViewport: (vpW, vpH, docW, docH) => {
    const padding = 80;
    const availW = Math.max(100, vpW - padding);
    const availH = Math.max(100, vpH - padding);
    const scale = Math.min(availW / docW, availH / docH);
    const clamped = Math.max(0.1, Math.min(4, scale));
    set({
      zoom: clamped,
      panX: 0,
      panY: 0,
    });
  },

  setPan: (panX, panY) => set({ panX, panY }),

  panBy: (dx, dy) => {
    const { panX, panY } = get();
    set({ panX: panX + dx, panY: panY + dy });
  },

  resetPan: () => set({ panX: 0, panY: 0 }),

  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  toggleSnapEnabled: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setSnapThreshold: (px) => set({ snapThreshold: Math.max(1, Math.min(20, px)) }),
  setSnapToDocumentBounds: (enabled) => set({ snapToDocumentBounds: enabled }),
  setSnapToLayers: (enabled) => set({ snapToLayers: enabled }),
  setSnapToGuides: (enabled) => set({ snapToGuides: enabled }),
  setActiveSmartGuides: (guides) => set({ activeSmartGuides: guides }),
  clearSmartGuides: () => set({ activeSmartGuides: [] }),

  addGuide: (orientation, position) => {
    set((s) => ({
      guides: [...s.guides, { id: `guide-${Date.now()}-${Math.random()}`, orientation, position }],
    }));
  },

  removeGuide: (id) => {
    set((s) => ({ guides: s.guides.filter((g) => g.id !== id) }));
  },

  clearGuides: () => set({ guides: [] }),

  setCursorPos: (x, y) => set({ cursorPos: { x, y } }),
}));

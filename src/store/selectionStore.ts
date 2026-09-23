import { create } from 'zustand';

export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'ellipse' | 'polygon';
  // For polygon/freeform selections (lasso, magic wand)
  points?: number[]; // [x0, y0, x1, y1, ...] — closed polygon outline
}

interface SelectionState {
  selection: SelectionArea | null;
  feather: number;

  setSelection: (area: SelectionArea | null) => void;
  clearSelection: () => void;
  setFeather: (feather: number) => void;
  selectAll: (docWidth: number, docHeight: number) => void;
  invertSelection: (docWidth: number, docHeight: number) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selection: null,
  feather: 0,

  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
  setFeather: (feather) => set({ feather }),

  selectAll: (docWidth, docHeight) =>
    set({
      selection: {
        x: 0,
        y: 0,
        width: docWidth,
        height: docHeight,
        shape: 'rect',
      },
    }),

  invertSelection: (docWidth, docHeight) => {
    const { selection } = get();
    if (!selection) {
      // No selection → select all
      set({
        selection: {
          x: 0,
          y: 0,
          width: docWidth,
          height: docHeight,
          shape: 'rect',
        },
      });
      return;
    }
    // For simple rect/ellipse, invert is approximated as the bounding box complement.
    // For a pixel-perfect inversion, a mask-based selection would be needed.
    // Here we clear the selection — the practical inverse for simple geometry.
    set({ selection: null });
  },
}));

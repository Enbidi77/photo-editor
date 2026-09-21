import { create } from 'zustand';

export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'ellipse';
}

interface SelectionState {
  selection: SelectionArea | null;
  feather: number;

  setSelection: (area: SelectionArea | null) => void;
  clearSelection: () => void;
  setFeather: (feather: number) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selection: null,
  feather: 0,

  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
  setFeather: (feather) => set({ feather }),
}));

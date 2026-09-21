import { create } from 'zustand';
import { FilterType } from '../types/filters';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface UIState {
  activePanel: 'layers' | 'properties' | 'history' | 'navigator' | 'color' | 'brushes' | 'character';
  rightSidebarCollapsed: boolean;
  statusMessage: string;

  activeDialog: 'new' | 'export' | 'shortcuts' | 'filters' | 'adjustments' | null;
  activeFilterType: FilterType | null;
  commandPaletteOpen: boolean;

  toasts: ToastItem[];

  // Actions
  setActivePanel: (panel: 'layers' | 'properties' | 'history' | 'navigator' | 'color' | 'brushes' | 'character') => void;
  toggleRightSidebar: () => void;
  setStatusMessage: (msg: string) => void;
  openDialog: (dialog: 'new' | 'export' | 'shortcuts' | 'filters' | 'adjustments', filterType?: FilterType) => void;
  closeDialog: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  activePanel: 'layers',
  rightSidebarCollapsed: false,
  statusMessage: 'Ready',

  activeDialog: null,
  activeFilterType: null,
  commandPaletteOpen: false,

  toasts: [],

  setActivePanel: (panel) => set({ activePanel: panel, rightSidebarCollapsed: false }),
  toggleRightSidebar: () => set((s) => ({ rightSidebarCollapsed: !s.rightSidebarCollapsed })),
  setStatusMessage: (msg) => set({ statusMessage: msg }),

  openDialog: (dialog, filterType) =>
    set({
      activeDialog: dialog,
      activeFilterType: filterType || null,
    }),

  closeDialog: () => set({ activeDialog: null, activeFilterType: null }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  showToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

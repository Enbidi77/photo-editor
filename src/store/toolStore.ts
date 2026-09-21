import { create } from 'zustand';
import { ToolType, ToolOptions, DEFAULT_TOOL_OPTIONS } from '../types/tools';

interface ToolState {
  activeTool: ToolType;
  previousTool: ToolType | null;
  isTemporaryHand: boolean;
  options: ToolOptions;

  foregroundColor: string;
  backgroundColor: string;

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setTemporaryHand: (active: boolean) => void;
  updateToolOptions: <K extends keyof ToolOptions>(key: K, patch: Partial<ToolOptions[K]>) => void;
  setForegroundColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  swapColors: () => void;
  resetColors: () => void;
}

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: 'move',
  previousTool: null,
  isTemporaryHand: false,
  options: DEFAULT_TOOL_OPTIONS,

  foregroundColor: '#000000',
  backgroundColor: '#ffffff',

  setActiveTool: (tool) => {
    const current = get().activeTool;
    if (current !== tool) {
      set({ activeTool: tool, previousTool: current });
    }
  },

  setTemporaryHand: (active) => {
    const { activeTool, previousTool, isTemporaryHand } = get();
    if (active && !isTemporaryHand) {
      set({
        isTemporaryHand: true,
        previousTool: activeTool,
        activeTool: 'hand',
      });
    } else if (!active && isTemporaryHand) {
      set({
        isTemporaryHand: false,
        activeTool: previousTool || 'move',
      });
    }
  },

  updateToolOptions: (key, patch) => {
    const current = get().options;
    set({
      options: {
        ...current,
        [key]: {
          ...current[key],
          ...patch,
        },
      },
    });
  },

  setForegroundColor: (color) => set({ foregroundColor: color }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),

  swapColors: () => {
    const { foregroundColor, backgroundColor } = get();
    set({ foregroundColor: backgroundColor, backgroundColor: foregroundColor });
  },

  resetColors: () => set({ foregroundColor: '#000000', backgroundColor: '#ffffff' }),
}));

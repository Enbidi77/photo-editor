import { create } from 'zustand';
import { ICommand, HistoryEntry } from '../types/history';
import { useCollaborationStore } from './collaborationStore';
import { useUIStore } from './uiStore';

export const MAX_HISTORY = 100;

interface HistoryState {
  undoStack: ICommand[];
  redoStack: ICommand[];
  entries: HistoryEntry[];
  currentIndex: number;

  executeCommand: (command: ICommand) => Promise<boolean>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  jumpTo: (index: number) => Promise<void>;
  clearHistory: (initialLabel?: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function isViewer(): boolean {
  try {
    return useCollaborationStore.getState().userRole === 'viewer';
  } catch {
    return false;
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  entries: [{ id: 'init', label: 'Open Document', timestamp: Date.now() }],
  currentIndex: 0,

  executeCommand: async (command: ICommand): Promise<boolean> => {
    if (isViewer()) return false;

    // Reject no-op commands
    if (command.isNoOp && command.isNoOp()) {
      return false;
    }

    try {
      await command.execute();
      const { undoStack, entries, currentIndex } = get();

      // Prune any redo branch
      const activeEntries = entries.slice(0, currentIndex + 1);
      const activeUndo = undoStack.slice(0, currentIndex);

      let nextUndo = [...activeUndo, command];
      let nextEntries: HistoryEntry[] = [
        ...activeEntries,
        { id: command.id, label: command.label, timestamp: Date.now() },
      ];

      // Enforce bounded history size (cap total history entries to MAX_HISTORY)
      if (nextEntries.length > MAX_HISTORY) {
        const overflow = nextEntries.length - MAX_HISTORY;
        nextEntries = [nextEntries[0], ...nextEntries.slice(1 + overflow)];
        nextUndo = nextUndo.slice(overflow);
      }

      set({
        undoStack: nextUndo,
        redoStack: [],
        entries: nextEntries,
        currentIndex: nextEntries.length - 1,
      });
      return true;
    } catch (error) {
      console.error('Command execution failed:', error);
      return false;
    }
  },

  undo: async () => {
    if (isViewer()) return;
    const { undoStack, redoStack, currentIndex } = get();
    if (undoStack.length === 0 || currentIndex <= 0) return;

    const command = undoStack[undoStack.length - 1];
    if (!command) return;

    try {
      await command.undo();
      const nextUndo = undoStack.slice(0, -1);
      const nextRedo = [command, ...redoStack];

      set({
        undoStack: nextUndo,
        redoStack: nextRedo,
        currentIndex: currentIndex - 1,
      });

      useUIStore.getState().showToast(`Undid: ${command.label}`, 'info');
      useUIStore.getState().setStatusMessage(`Undid: ${command.label}`);
    } catch (error) {
      console.error('Command undo failed:', error);
    }
  },

  redo: async () => {
    if (isViewer()) return;
    const { undoStack, redoStack, currentIndex } = get();
    if (redoStack.length === 0) return;

    const command = redoStack[0];
    if (!command) return;

    try {
      await command.execute();
      const nextRedo = redoStack.slice(1);
      const nextUndo = [...undoStack, command];

      set({
        undoStack: nextUndo,
        redoStack: nextRedo,
        currentIndex: currentIndex + 1,
      });

      useUIStore.getState().showToast(`Redid: ${command.label}`, 'info');
      useUIStore.getState().setStatusMessage(`Redid: ${command.label}`);
    } catch (error) {
      console.error('Command redo failed:', error);
    }
  },

  jumpTo: async (targetIndex: number) => {
    if (isViewer()) return;
    const { currentIndex, entries } = get();
    if (targetIndex < 0 || targetIndex >= entries.length || targetIndex === currentIndex) {
      return;
    }

    if (targetIndex < currentIndex) {
      const steps = currentIndex - targetIndex;
      for (let i = 0; i < steps; i++) {
        await get().undo();
      }
    } else {
      const steps = targetIndex - currentIndex;
      for (let i = 0; i < steps; i++) {
        await get().redo();
      }
    }
  },

  clearHistory: (initialLabel = 'Open Document') =>
    set({
      undoStack: [],
      redoStack: [],
      entries: [{ id: 'init', label: initialLabel, timestamp: Date.now() }],
      currentIndex: 0,
    }),

  canUndo: () => {
    if (isViewer()) return false;
    return get().currentIndex > 0 && get().undoStack.length > 0;
  },

  canRedo: () => {
    if (isViewer()) return false;
    return get().redoStack.length > 0;
  },
}));

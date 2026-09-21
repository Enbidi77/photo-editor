import { create } from 'zustand';
import { ICommand, HistoryEntry } from '../types/history';

interface HistoryState {
  undoStack: ICommand[];
  redoStack: ICommand[];
  entries: HistoryEntry[];
  currentIndex: number;

  executeCommand: (command: ICommand) => Promise<void> | void;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  jumpTo: (index: number) => Promise<void> | void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  entries: [{ id: 'init', label: 'Open Document', timestamp: Date.now() }],
  currentIndex: 0,

  executeCommand: async (command) => {
    try {
      await command.execute();
      const { undoStack, entries, currentIndex } = get();

      // Slice off any redo branch
      const activeEntries = entries.slice(0, currentIndex + 1);
      const activeUndo = undoStack.slice(0, currentIndex);

      const nextUndo = [...activeUndo, command];
      const nextEntries: HistoryEntry[] = [
        ...activeEntries,
        { id: command.id, label: command.label, timestamp: Date.now() },
      ];

      set({
        undoStack: nextUndo,
        redoStack: [],
        entries: nextEntries,
        currentIndex: nextEntries.length - 1,
      });
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  },

  undo: async () => {
    const { undoStack, redoStack, currentIndex } = get();
    if (undoStack.length === 0 || currentIndex <= 0) return;

    const command = undoStack[currentIndex - 1];
    if (!command) return;

    try {
      await command.undo();
      set({
        redoStack: [command, ...redoStack],
        currentIndex: currentIndex - 1,
      });
    } catch (error) {
      console.error('Command undo failed:', error);
    }
  },

  redo: async () => {
    const { undoStack, redoStack, currentIndex } = get();
    if (redoStack.length === 0) return;

    const command = redoStack[0];
    if (!command) return;

    try {
      await command.execute();
      set({
        redoStack: redoStack.slice(1),
        currentIndex: currentIndex + 1,
      });
    } catch (error) {
      console.error('Command redo failed:', error);
    }
  },

  jumpTo: async (targetIndex) => {
    const { currentIndex, undoStack, entries } = get();
    if (targetIndex < 0 || targetIndex >= entries.length || targetIndex === currentIndex) {
      return;
    }

    if (targetIndex < currentIndex) {
      // Undo backwards
      for (let i = currentIndex; i > targetIndex; i--) {
        const cmd = undoStack[i - 1];
        if (cmd) await cmd.undo();
      }
    } else {
      // Redo forwards
      for (let i = currentIndex; i < targetIndex; i++) {
        const cmd = undoStack[i];
        if (cmd) await cmd.execute();
      }
    }

    set({ currentIndex: targetIndex });
  },

  clearHistory: () =>
    set({
      undoStack: [],
      redoStack: [],
      entries: [{ id: 'init', label: 'Open Document', timestamp: Date.now() }],
      currentIndex: 0,
    }),

  canUndo: () => get().currentIndex > 0,
  canRedo: () => get().redoStack.length > 0 || get().currentIndex < get().entries.length - 1,
}));

import { create } from 'zustand';
import { AutosaveStatus, AutosaveState } from '@/types/autosave';

export const STATUS_LABELS: Record<AutosaveStatus, string> = {
  idle: 'Ready',
  saved: 'Saved',
  saving: 'Saving…',
  'saved-locally-waiting-sync': 'Changes saved locally — waiting to sync',
  offline: 'Offline',
  'failed-retrying': 'Save failed — retrying',
};

interface AutosaveStoreState extends AutosaveState {
  setStatus: (status: AutosaveStatus, message?: string) => void;
  setDirty: (isDirty: boolean) => void;
  setLastSavedTime: (time: number | null) => void;
  setLastError: (error: string | null) => void;
  reset: () => void;
}

const initialState: AutosaveState = {
  status: 'saved',
  statusMessage: STATUS_LABELS.saved,
  isDirty: false,
  lastSavedTime: null,
  lastError: null,
};

export const useAutosaveStore = create<AutosaveStoreState>((set) => ({
  ...initialState,

  setStatus: (status, message) =>
    set({
      status,
      statusMessage: message || STATUS_LABELS[status] || status,
    }),

  setDirty: (isDirty) => set({ isDirty }),

  setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),

  setLastError: (lastError) => set({ lastError }),

  reset: () => set(initialState),
}));

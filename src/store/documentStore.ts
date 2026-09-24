import { create } from 'zustand';
import { DocumentMeta, DOCUMENT_PRESETS } from '../types/document';
import { nanoid } from 'nanoid';

interface DocumentState {
  document: DocumentMeta | null;
  setDocument: (doc: DocumentMeta) => void;
  updateDocument: (patch: Partial<DocumentMeta>, markDirty?: boolean) => void;
  createNewDocument: (
    name?: string,
    width?: number,
    height?: number,
    resolution?: number,
    backgroundColor?: string
  ) => DocumentMeta;
  closeDocument: () => void;
  setDirty: (isDirty: boolean) => void;
}

const defaultPreset = DOCUMENT_PRESETS[0]; // 1920x1080

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: {
    id: 'default-doc',
    name: 'Untitled-1',
    width: defaultPreset.width,
    height: defaultPreset.height,
    resolution: defaultPreset.resolution,
    backgroundColor: '#ffffff',
    colorMode: 'RGB',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDirty: false,
  },

  setDocument: (doc) => set({ document: doc }),

  updateDocument: (patch, markDirty = true) => {
    const current = get().document;
    if (!current) return;
    set({
      document: {
        ...current,
        ...patch,
        updatedAt: Date.now(),
        isDirty: markDirty ? true : current.isDirty,
      },
    });
  },

  createNewDocument: (
    name = 'Untitled-1',
    width = 1920,
    height = 1080,
    resolution = 72,
    backgroundColor = '#ffffff'
  ) => {
    const newDoc: DocumentMeta = {
      id: nanoid(),
      name,
      width,
      height,
      resolution,
      backgroundColor,
      colorMode: 'RGB',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDirty: false,
    };
    set({ document: newDoc });
    return newDoc;
  },

  closeDocument: () => set({ document: null }),

  setDirty: (isDirty: boolean) => {
    const current = get().document;
    if (!current) return;
    set({ document: { ...current, isDirty } });
  },
}));

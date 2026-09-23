export interface ShortcutDef {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  actionName: string;
  category: 'Tools' | 'Document' | 'Edit & History' | 'View & Navigation' | 'Layers';
  description: string;
}

export const SHORTCUT_REGISTRY: ShortcutDef[] = [
  // Tools
  { key: 'v', actionName: 'tool-move', category: 'Tools', description: 'Move Tool' },
  { key: 'm', actionName: 'tool-marquee', category: 'Tools', description: 'Rectangular Marquee Tool' },
  { key: 'l', actionName: 'tool-lasso', category: 'Tools', description: 'Lasso Tool' },
  { key: 'w', actionName: 'tool-wand', category: 'Tools', description: 'Magic Wand Tool' },
  { key: 'c', actionName: 'tool-crop', category: 'Tools', description: 'Crop Tool' },
  { key: 'i', actionName: 'tool-eyedropper', category: 'Tools', description: 'Eyedropper Tool' },
  { key: 'b', actionName: 'tool-brush', category: 'Tools', description: 'Brush Tool' },
  { key: 'e', actionName: 'tool-eraser', category: 'Tools', description: 'Eraser Tool' },
  { key: 'g', actionName: 'tool-gradient', category: 'Tools', description: 'Gradient Tool' },
  { key: 'p', actionName: 'tool-pen', category: 'Tools', description: 'Pen Tool (Vector Bézier Paths)' },
  { key: 't', actionName: 'tool-text', category: 'Tools', description: 'Text Tool' },
  { key: 'u', actionName: 'tool-shape', category: 'Tools', description: 'Shape (Rectangle) Tool' },
  { key: 'h', actionName: 'tool-hand', category: 'Tools', description: 'Hand Tool' },
  { key: 'z', actionName: 'tool-zoom', category: 'Tools', description: 'Zoom Tool' },

  // Colors
  { key: 'x', actionName: 'color-swap', category: 'Tools', description: 'Swap Foreground & Background Colors' },
  { key: 'd', actionName: 'color-reset', category: 'Tools', description: 'Reset Colors to Default (Black/White)' },

  // Document & File
  { key: 'n', ctrlOrCmd: true, actionName: 'doc-new', category: 'Document', description: 'New Document' },
  { key: 'o', ctrlOrCmd: true, actionName: 'doc-open', category: 'Document', description: 'Open File / Project' },
  { key: 's', ctrlOrCmd: true, actionName: 'doc-save', category: 'Document', description: 'Save Project (.pxf)' },
  { key: 'e', ctrlOrCmd: true, shift: true, actionName: 'doc-export', category: 'Document', description: 'Export Image As...' },
  { key: 'k', ctrlOrCmd: true, actionName: 'command-palette', category: 'Document', description: 'Open Command Palette' },

  // Edit & History
  { key: 'z', ctrlOrCmd: true, actionName: 'edit-undo', category: 'Edit & History', description: 'Undo' },
  { key: 'z', ctrlOrCmd: true, shift: true, actionName: 'edit-redo', category: 'Edit & History', description: 'Redo' },
  { key: 'y', ctrlOrCmd: true, actionName: 'edit-redo-y', category: 'Edit & History', description: 'Redo' },
  { key: 'a', ctrlOrCmd: true, actionName: 'select-all', category: 'Edit & History', description: 'Select All' },
  { key: 'd', ctrlOrCmd: true, actionName: 'select-deselect', category: 'Edit & History', description: 'Deselect Selection' },
  { key: 'i', ctrlOrCmd: true, shift: true, actionName: 'select-inverse', category: 'Edit & History', description: 'Inverse Selection' },

  // Layers
  { key: 'j', ctrlOrCmd: true, actionName: 'layer-duplicate', category: 'Layers', description: 'Duplicate Current Layer' },
  { key: 'delete', actionName: 'layer-delete', category: 'Layers', description: 'Delete Current Layer' },
  { key: 'backspace', actionName: 'layer-delete-bs', category: 'Layers', description: 'Delete Current Layer' },
  { key: 'm', ctrlOrCmd: true, shift: true, actionName: 'layer-add-mask', category: 'Layers', description: 'Add Layer Mask' },
  { key: '\\', actionName: 'mask-overlay-toggle', category: 'Layers', description: 'Toggle Mask Overlay' },

  // View & Navigation
  { key: '0', ctrlOrCmd: true, actionName: 'view-fit', category: 'View & Navigation', description: 'Fit Canvas to Screen' },
  { key: '1', ctrlOrCmd: true, actionName: 'view-100', category: 'View & Navigation', description: 'Actual Pixels (100%)' },
  { key: '=', ctrlOrCmd: true, actionName: 'view-zoom-in', category: 'View & Navigation', description: 'Zoom In' },
  { key: '+', ctrlOrCmd: true, actionName: 'view-zoom-in-plus', category: 'View & Navigation', description: 'Zoom In' },
  { key: '-', ctrlOrCmd: true, actionName: 'view-zoom-out', category: 'View & Navigation', description: 'Zoom Out' },
  { key: ';', ctrlOrCmd: true, actionName: 'view-toggle-guides', category: 'View & Navigation', description: 'Toggle Guides' },
  { key: ';', ctrlOrCmd: true, shift: true, actionName: 'view-toggle-snap', category: 'View & Navigation', description: 'Toggle Snap' },
  { key: "'", ctrlOrCmd: true, actionName: 'view-toggle-grid', category: 'View & Navigation', description: 'Toggle Grid' },
  { key: 'r', ctrlOrCmd: true, actionName: 'view-toggle-rulers', category: 'View & Navigation', description: 'Toggle Rulers' },
  { key: '?', actionName: 'help-shortcuts', category: 'View & Navigation', description: 'Keyboard Shortcuts Cheat Sheet' },
];

export function isFormInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (
    target.closest?.(
      'input, textarea, select, [contenteditable], [contenteditable="true"], .MuiInputBase-input'
    )
  ) {
    return true;
  }
  const tagName = target.tagName.toLowerCase();
  const ceAttr = target.getAttribute?.('contenteditable');
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    Boolean(target.isContentEditable) ||
    target.contentEditable === 'true' ||
    ceAttr === 'true' ||
    ceAttr === '' ||
    target.classList.contains('MuiInputBase-input')
  );
}

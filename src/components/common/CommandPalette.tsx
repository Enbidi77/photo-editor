'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useToolStore } from '@/store/toolStore';
import { useHistoryStore } from '@/store/historyStore';
import { useViewStore } from '@/store/viewStore';
import { useLayerStore } from '@/store/layerStore';
import { useDocumentStore } from '@/store/documentStore';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { DuplicateLayerCommand } from '@/editor/commands/LayerCommands';
import { editorTokens } from '@/theme/palette';
import Dialog from '@mui/material/Dialog';
import { Search, Command as CmdIcon } from 'lucide-react';

interface PaletteAction {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  perform: () => void;
}

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, openDialog, showToast } = useUIStore();
  const { setActiveTool } = useToolStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const { resetZoom, fitToViewport, toggleRulers, toggleGuides, toggleGrid } = useViewStore();
  const { activeLayerId, duplicateLayer } = useLayerStore();
  const { document: doc } = useDocumentStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const actions: PaletteAction[] = [
    { id: 'new-doc', label: 'New Document...', category: 'File', shortcut: 'Ctrl+N', perform: () => openDialog('new') },
    { id: 'save-pxf', label: 'Save Project (.pxf)', category: 'File', shortcut: 'Ctrl+S', perform: () => { window.dispatchEvent(new CustomEvent('pixelforge:save')); } },
    { id: 'export-img', label: 'Export Image As...', category: 'File', shortcut: 'Ctrl+Shift+E', perform: () => openDialog('export') },
    { id: 'undo', label: 'Undo Action', category: 'Edit', shortcut: 'Ctrl+Z', perform: () => undo() },
    { id: 'redo', label: 'Redo Action', category: 'Edit', shortcut: 'Ctrl+Shift+Z', perform: () => redo() },
    { id: 'duplicate-layer', label: 'Duplicate Current Layer', category: 'Layer', shortcut: 'Ctrl+J', perform: () => { if (activeLayerId) useHistoryStore.getState().executeCommand(new DuplicateLayerCommand(activeLayerId)); } },
    { id: 'tool-move', label: 'Switch to Move Tool', category: 'Tools', shortcut: 'V', perform: () => setActiveTool('move') },
    { id: 'tool-brush', label: 'Switch to Brush Tool', category: 'Tools', shortcut: 'B', perform: () => setActiveTool('brush') },
    { id: 'tool-eraser', label: 'Switch to Eraser Tool', category: 'Tools', shortcut: 'E', perform: () => setActiveTool('eraser') },
    { id: 'tool-text', label: 'Switch to Text Tool', category: 'Tools', shortcut: 'T', perform: () => setActiveTool('text') },
    { id: 'tool-crop', label: 'Switch to Crop Tool', category: 'Tools', shortcut: 'C', perform: () => setActiveTool('crop') },
    { id: 'tool-shape', label: 'Switch to Rectangle Shape Tool', category: 'Tools', shortcut: 'U', perform: () => setActiveTool('rectangle') },
    { id: 'view-fit', label: 'Fit Canvas to Screen', category: 'View', shortcut: 'Ctrl+0', perform: () => { if (doc) fitToViewport(window.innerWidth - 300, window.innerHeight - 150, doc.width, doc.height); } },
    { id: 'view-100', label: 'Actual Pixels (100% Zoom)', category: 'View', shortcut: 'Ctrl+1', perform: () => resetZoom() },
    { id: 'toggle-rulers', label: 'Toggle Rulers', category: 'View', shortcut: 'Ctrl+R', perform: () => toggleRulers() },
    { id: 'toggle-guides', label: 'Toggle Guides', category: 'View', shortcut: 'Ctrl+;', perform: () => toggleGuides() },
    { id: 'toggle-grid', label: 'Toggle Grid', category: 'View', shortcut: "Ctrl+'", perform: () => toggleGrid() },
    { id: 'filter-blur', label: 'Filter: Gaussian Blur...', category: 'Filter', perform: () => openDialog('filters', 'blur') },
    { id: 'filter-noise', label: 'Filter: Add Noise...', category: 'Filter', perform: () => openDialog('filters', 'noise') },
    { id: 'filter-sharpen', label: 'Filter: Sharpen...', category: 'Filter', perform: () => openDialog('filters', 'sharpen') },
    { id: 'filter-bw', label: 'Filter: Convert to Black & White', category: 'Filter', perform: () => openDialog('filters', 'grayscale') },
    { id: 'filter-vignette', label: 'Filter: Vignette...', category: 'Filter', perform: () => openDialog('filters', 'vignette') },
    { id: 'filter-chromatic', label: 'Filter: Chromatic Aberration...', category: 'Filter', perform: () => openDialog('filters', 'chromatic-aberration') },
    { id: 'adj-dialog', label: 'Image Adjustments...', category: 'Image', perform: () => openDialog('adjustments') },
    { id: 'shortcuts-cheat', label: 'Keyboard Shortcuts Cheat Sheet', category: 'Help', shortcut: '?', perform: () => openDialog('shortcuts') },
  ];

  const filtered = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const action = filtered[selectedIndex];
      if (action) {
        setCommandPaletteOpen(false);
        action.perform();
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <Dialog
      open={commandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: editorTokens.bg.surface,
          border: `1px solid ${editorTokens.border.medium}`,
          borderRadius: 3,
          boxShadow: editorTokens.shadow.menu,
          top: -80,
        },
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${editorTokens.border.subtle}`, gap: 10 }}>
        <Search size={16} color={editorTokens.text.secondary} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a command or search actions..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '0.85rem',
          }}
        />
        <span
          style={{
            fontSize: '0.65rem',
            backgroundColor: editorTokens.bg.input,
            padding: '2px 6px',
            borderRadius: 3,
            color: editorTokens.text.muted,
          }}
        >
          ESC to exit
        </span>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: editorTokens.text.muted, fontSize: '0.75rem' }}>
            No matching commands found.
          </div>
        ) : (
          filtered.map((action, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={action.id}
                onClick={() => {
                  setCommandPaletteOpen(false);
                  action.perform();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  backgroundColor: isSelected ? editorTokens.accent.primary : 'transparent',
                  color: isSelected ? '#ffffff' : editorTokens.text.primary,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  gap: 8,
                }}
              >
                <CmdIcon size={13} opacity={0.7} />
                <span style={{ flex: 1 }}>{action.label}</span>
                <span style={{ fontSize: '0.65rem', color: isSelected ? 'rgba(255,255,255,0.8)' : editorTokens.text.muted }}>
                  {action.category}
                </span>
                {action.shortcut && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      backgroundColor: isSelected ? 'rgba(0,0,0,0.25)' : editorTokens.bg.input,
                      border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : editorTokens.border.subtle}`,
                      padding: '1px 5px',
                      borderRadius: 2,
                      fontFamily: 'monospace',
                    }}
                  >
                    {action.shortcut}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Dialog>
  );
};

'use client';

import React, { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { DOCUMENT_PRESETS, DocumentPreset } from '@/types/document';
import { editorTokens } from '@/theme/palette';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

export const NewDocumentDialog: React.FC = () => {
  const { activeDialog, closeDialog, showToast } = useUIStore();
  const { createNewDocument } = useDocumentStore();
  const { clearLayers } = useLayerStore();
  const { clearHistory } = useHistoryStore();

  const [category, setCategory] = useState<'Web' | 'Social' | 'Print' | 'Photo'>('Web');
  const [name, setName] = useState('Untitled-1');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [resolution, setResolution] = useState(72);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const isOpen = activeDialog === 'new';

  const handleSelectPreset = (preset: DocumentPreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setResolution(preset.resolution);
  };

  const handleCreate = () => {
    clearLayers();
    clearHistory();
    createNewDocument(name, width, height, resolution, backgroundColor);
    closeDialog();
    showToast(`Created document "${name}" (${width}×${height})`, 'success');
  };

  const filteredPresets = DOCUMENT_PRESETS.filter((p) => p.category === category);

  const inputNumberSx = {
    height: 24,
    backgroundColor: editorTokens.bg.input,
    border: `1px solid ${editorTokens.border.subtle}`,
    color: editorTokens.text.primary,
    fontSize: '0.75rem',
    padding: '2px 8px',
    borderRadius: 2,
    width: 90,
  };

  return (
    <Dialog
      open={isOpen}
      onClose={closeDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: editorTokens.bg.surface,
          border: `1px solid ${editorTokens.border.medium}`,
          color: editorTokens.text.primary,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '0.85rem',
          fontWeight: 700,
          borderBottom: `1px solid ${editorTokens.border.subtle}`,
          padding: '10px 16px',
        }}
      >
        New Document
      </DialogTitle>

      <DialogContent sx={{ padding: '16px', display: 'flex', gap: 20 }}>
        {/* Left: Presets Column */}
        <div style={{ flex: 1.2, borderRight: `1px solid ${editorTokens.border.subtle}`, paddingRight: 16 }}>
          <Tabs
            value={category}
            onChange={(_, val) => setCategory(val)}
            sx={{
              minHeight: 28,
              marginBottom: 12,
              '& .MuiTab-root': {
                minHeight: 28,
                padding: '4px 8px',
                fontSize: '0.7rem',
                color: editorTokens.text.secondary,
                '&.Mui-selected': { color: '#ffffff' },
              },
            }}
          >
            <Tab label="Web" value="Web" />
            <Tab label="Social" value="Social" />
            <Tab label="Print" value="Print" />
            <Tab label="Photo" value="Photo" />
          </Tabs>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {filteredPresets.map((p) => {
              const isSelected = width === p.width && height === p.height;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: isSelected ? editorTokens.bg.activeRow : editorTokens.bg.panel,
                    border: `1px solid ${isSelected ? editorTokens.accent.primary : editorTokens.border.subtle}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: isSelected ? '#fff' : editorTokens.text.primary }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: editorTokens.text.secondary }}>
                    {p.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Custom Dimensions & Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>Document Name:</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...inputNumberSx, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>Width (px):</div>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(10, parseInt(e.target.value) || 800))}
                style={inputNumberSx}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>Height (px):</div>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(10, parseInt(e.target.value) || 600))}
                style={inputNumberSx}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>Resolution (DPI):</div>
            <input
              type="number"
              value={resolution}
              onChange={(e) => setResolution(Math.max(10, parseInt(e.target.value) || 72))}
              style={inputNumberSx}
            />
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>Background:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'White', val: '#ffffff' },
                { label: 'Black', val: '#000000' },
                { label: 'Transparent', val: 'transparent' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setBackgroundColor(opt.val)}
                  style={{
                    backgroundColor: backgroundColor === opt.val ? editorTokens.accent.primary : editorTokens.bg.input,
                    border: `1px solid ${editorTokens.border.subtle}`,
                    color: backgroundColor === opt.val ? '#ffffff' : editorTokens.text.primary,
                    padding: '3px 8px',
                    borderRadius: 2,
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogActions sx={{ padding: '8px 16px', borderTop: `1px solid ${editorTokens.border.subtle}` }}>
        <Button onClick={closeDialog} sx={{ color: editorTokens.text.secondary, fontSize: '0.72rem' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleCreate} sx={{ fontSize: '0.72rem' }}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

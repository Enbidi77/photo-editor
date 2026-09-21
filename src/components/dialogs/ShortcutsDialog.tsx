'use client';

import React, { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { SHORTCUT_REGISTRY, ShortcutDef } from '@/lib/keyboard/shortcutRegistry';
import { editorTokens } from '@/theme/palette';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

export const ShortcutsDialog: React.FC = () => {
  const { activeDialog, closeDialog } = useUIStore();
  const [search, setSearch] = useState('');

  const isOpen = activeDialog === 'shortcuts';

  const filtered = SHORTCUT_REGISTRY.filter(
    (s) =>
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.key.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  const formatKey = (s: ShortcutDef) => {
    const parts: string[] = [];
    if (s.ctrlOrCmd) parts.push('Ctrl/Cmd');
    if (s.alt) parts.push('Alt');
    if (s.shift) parts.push('Shift');
    parts.push(s.key.toUpperCase());
    return parts.join(' + ');
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Keyboard Shortcuts</span>
        <input
          type="text"
          placeholder="Filter shortcuts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            height: 22,
            width: 160,
            backgroundColor: editorTokens.bg.input,
            border: `1px solid ${editorTokens.border.subtle}`,
            color: editorTokens.text.primary,
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: 2,
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ padding: '8px 16px', maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${editorTokens.border.subtle}`, color: editorTokens.text.secondary }}>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Action</th>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Category</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: `1px solid ${editorTokens.border.subtle}`,
                  height: 26,
                }}
              >
                <td style={{ padding: '4px' }}>{s.description}</td>
                <td style={{ padding: '4px', color: editorTokens.text.secondary }}>{s.category}</td>
                <td style={{ padding: '4px', textAlign: 'right' }}>
                  <span
                    style={{
                      backgroundColor: editorTokens.bg.input,
                      border: `1px solid ${editorTokens.border.medium}`,
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontFamily: 'monospace',
                      fontSize: '0.68rem',
                      color: editorTokens.text.accent,
                    }}
                  >
                    {formatKey(s)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>

      <DialogActions sx={{ padding: '8px 16px', borderTop: `1px solid ${editorTokens.border.subtle}` }}>
        <Button variant="contained" color="primary" onClick={closeDialog} sx={{ fontSize: '0.72rem' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

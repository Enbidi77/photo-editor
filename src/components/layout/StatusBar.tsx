'use client';

import React from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useViewStore } from '@/store/viewStore';
import { useToolStore } from '@/store/toolStore';
import { useUIStore } from '@/store/uiStore';
import { useAutosaveStore } from '@/store/autosaveStore';
import { editorTokens } from '@/theme/palette';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Check, Loader2, Cloud, WifiOff, AlertCircle } from 'lucide-react';

const ZOOM_OPTIONS = [0.1, 0.25, 0.5, 0.67, 1, 1.5, 2, 3, 4, 8];

export const StatusBar: React.FC = () => {
  const { document: doc } = useDocumentStore();
  const { zoom, setZoom, cursorPos } = useViewStore();
  const { activeTool } = useToolStore();
  const { statusMessage } = useUIStore();
  const { status: autosaveStatus, statusMessage: autosaveMessage, lastSavedTime } = useAutosaveStore();

  const zoomPercent = Math.round(zoom * 100);

  const formatLastSaved = (ts: number | null): string => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const getAutosaveIcon = () => {
    switch (autosaveStatus) {
      case 'saving':
        return (
          <Loader2
            size={11}
            style={{
              animation: 'spin 1s linear infinite',
              color: editorTokens.accent.primary,
            }}
          />
        );
      case 'saved-locally-waiting-sync':
        return <Cloud size={11} style={{ color: '#eab308' }} />;
      case 'offline':
        return <WifiOff size={11} style={{ color: '#9ca3af' }} />;
      case 'failed-retrying':
        return <AlertCircle size={11} style={{ color: '#ef4444' }} />;
      case 'saved':
      default:
        return <Check size={11} style={{ color: '#22c55e' }} />;
    }
  };

  const formattedSavedTime = formatLastSaved(lastSavedTime);
  const accessibleLabel = `Save status: ${autosaveMessage}${formattedSavedTime ? `. Last saved at ${formattedSavedTime}` : ''}`;

  const getToolHelp = () => {
    switch (activeTool) {
      case 'move':
        return 'Click layer to select. Drag to move. Hold Shift to constrain axis.';
      case 'brush':
        return 'Click and drag to paint strokes. Adjust size and hardness in Options.';
      case 'eraser':
        return 'Click and drag to erase pixels from paint layers.';
      case 'text':
        return 'Click on canvas to add a new text layer.';
      case 'rectangle':
      case 'ellipse':
      case 'polygon':
        return 'Click and drag to draw a shape.';
      case 'eyedropper':
        return 'Click anywhere on canvas to sample color.';
      case 'crop':
        return 'Drag crop handles to frame canvas. Press Enter to apply, Esc to cancel.';
      case 'hand':
        return 'Drag to pan canvas workspace.';
      case 'zoom':
        return 'Click to zoom in. Hold Alt and click to zoom out.';
      case 'marquee':
        return 'Drag to create rectangular or elliptical selection.';
      default:
        return statusMessage;
    }
  };

  return (
    <div
      style={{
        height: 22,
        backgroundColor: editorTokens.bg.app,
        borderTop: `1px solid ${editorTokens.border.subtle}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        fontSize: '0.68rem',
        color: editorTokens.text.secondary,
        zIndex: 45,
        userSelect: 'none',
        gap: 16,
      }}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Zoom Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Select
          value={zoomPercent}
          onChange={(e) => setZoom(Number(e.target.value) / 100)}
          variant="standard"
          disableUnderline
          sx={{
            fontSize: '0.68rem',
            color: editorTokens.text.primary,
            height: 18,
            '& .MuiSelect-select': { padding: '0 2px' },
          }}
        >
          {ZOOM_OPTIONS.map((z) => {
            const p = Math.round(z * 100);
            return (
              <MenuItem key={p} value={p} sx={{ fontSize: '0.7rem' }}>
                {p}%
              </MenuItem>
            );
          })}
          {!ZOOM_OPTIONS.map((z) => Math.round(z * 100)).includes(zoomPercent) && (
            <MenuItem value={zoomPercent} sx={{ fontSize: '0.7rem' }}>
              {zoomPercent}%
            </MenuItem>
          )}
        </Select>
      </div>

      <div style={{ width: 1, height: 12, backgroundColor: editorTokens.border.subtle }} />

      {/* Document Info */}
      {doc && (
        <div>
          Doc: {doc.width} × {doc.height} px ({doc.resolution} ppi)
        </div>
      )}

      <div style={{ width: 1, height: 12, backgroundColor: editorTokens.border.subtle }} />

      {/* Cursor Coordinates */}
      <div>
        X: {cursorPos.x} px &nbsp; Y: {cursorPos.y} px
      </div>

      <div style={{ width: 1, height: 12, backgroundColor: editorTokens.border.subtle }} />

      {/* Context / Tool Help */}
      <div style={{ flex: 1, color: editorTokens.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {getToolHelp()}
      </div>

      <div style={{ width: 1, height: 12, backgroundColor: editorTokens.border.subtle }} />

      {/* Autosave Status Indicator */}
      <div
        role="status"
        aria-live="polite"
        aria-label={accessibleLabel}
        title={formattedSavedTime ? `Last saved: ${formattedSavedTime}` : autosaveMessage}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.68rem',
          color:
            autosaveStatus === 'failed-retrying'
              ? '#ef4444'
              : autosaveStatus === 'saved-locally-waiting-sync'
              ? '#eab308'
              : editorTokens.text.secondary,
          cursor: 'default',
          flexShrink: 0,
        }}
      >
        {getAutosaveIcon()}
        <span>{autosaveMessage}</span>
        {formattedSavedTime && autosaveStatus === 'saved' && (
          <span style={{ color: editorTokens.text.muted, fontSize: '0.64rem' }}>
            {formattedSavedTime}
          </span>
        )}
      </div>
    </div>
  );
};

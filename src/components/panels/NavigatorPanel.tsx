'use client';

import React from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useViewStore } from '@/store/viewStore';
import { editorTokens } from '@/theme/palette';
import Slider from '@mui/material/Slider';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';

export const NavigatorPanel: React.FC = () => {
  const { document: doc } = useDocumentStore();
  const { zoom, setZoom, resetPan, resetZoom, panBy } = useViewStore();

  const docW = doc?.width || 800;
  const docH = doc?.height || 600;

  // Aspect ratio scaling to fit a 200x140 preview box
  const boxW = 200;
  const boxH = 130;
  const docAspect = docW / docH;
  const boxAspect = boxW / boxH;

  let previewW = boxW;
  let previewH = boxH;
  if (docAspect > boxAspect) {
    previewH = boxW / docAspect;
  } else {
    previewW = boxH * docAspect;
  }

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: editorTokens.bg.panel,
        padding: '12px 10px',
        fontSize: '0.72rem',
        userSelect: 'none',
      }}
    >
      {/* Mini-map Thumbnail Container */}
      <div
        style={{
          width: '100%',
          height: 140,
          backgroundColor: editorTokens.bg.input,
          border: `1px solid ${editorTokens.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        {/* Document Frame */}
        <div
          style={{
            width: previewW,
            height: previewH,
            backgroundColor: doc?.backgroundColor === 'transparent' ? '#ffffff' : doc?.backgroundColor || '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            position: 'relative',
            border: '1px solid #555',
          }}
        >
          {/* Red Viewport Rectangle representing current view */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: `${Math.min(100, Math.max(20, 100 / zoom))}%`,
              height: `${Math.min(100, Math.max(20, 100 / zoom))}%`,
              border: '1.5px solid #ff3b30',
              backgroundColor: 'rgba(255, 59, 48, 0.12)',
              cursor: 'move',
            }}
            title="Drag to navigate view"
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tooltip title="Zoom Out">
          <button
            type="button"
            onClick={() => setZoom(zoom * 0.8)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: editorTokens.text.secondary,
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
            }}
          >
            <ZoomOut size={14} />
          </button>
        </Tooltip>

        <Slider
          value={zoomPercent}
          min={10}
          max={800}
          onChange={(_, val) => setZoom((val as number) / 100)}
          sx={{ flex: 1 }}
        />

        <Tooltip title="Zoom In">
          <button
            type="button"
            onClick={() => setZoom(zoom * 1.25)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: editorTokens.text.secondary,
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
            }}
          >
            <ZoomIn size={14} />
          </button>
        </Tooltip>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: editorTokens.text.secondary }}>Zoom: {zoomPercent}%</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => {
              resetZoom();
              resetPan();
            }}
            style={{
              backgroundColor: editorTokens.bg.surface,
              border: `1px solid ${editorTokens.border.subtle}`,
              color: editorTokens.text.primary,
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => resetPan()}
            style={{
              backgroundColor: editorTokens.bg.surface,
              border: `1px solid ${editorTokens.border.subtle}`,
              color: editorTokens.text.primary,
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Center
          </button>
        </div>
      </div>
    </div>
  );
};

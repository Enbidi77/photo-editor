'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useToolStore } from '@/store/toolStore';
import { useHistoryStore } from '@/store/historyStore';
import { CropDocumentCommand } from '../commands/DocumentCommands';
import { editorTokens } from '@/theme/palette';
import { Check, X } from 'lucide-react';
import Button from '@mui/material/Button';

interface CropOverlayProps {
  docX: number;
  docY: number;
  zoom: number;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({ docX, docY, zoom }) => {
  const { document: doc } = useDocumentStore();
  const { layers } = useLayerStore();
  const { activeTool, options, setActiveTool } = useToolStore();
  const { executeCommand } = useHistoryStore();

  const isCropActive = activeTool === 'crop';

  // Crop rectangle in document coordinates
  const [cropRect, setCropRect] = useState({
    x: 0,
    y: 0,
    width: doc?.width || 800,
    height: doc?.height || 600,
  });

  // Reset crop bounds to full doc when switching to crop tool or doc dimensions change
  useEffect(() => {
    if (isCropActive && doc) {
      setCropRect({
        x: 0,
        y: 0,
        width: doc.width,
        height: doc.height,
      });
    }
  }, [isCropActive, doc?.width, doc?.height]);

  const handleApply = useCallback(() => {
    if (!doc) return;
    const { x, y, width, height } = cropRect;
    if (width <= 10 || height <= 10) return;

    const roundW = Math.round(width);
    const roundH = Math.round(height);
    const roundX = Math.round(x);
    const roundY = Math.round(y);

    const prevDoc = { ...doc };
    const nextDoc = {
      ...doc,
      width: roundW,
      height: roundH,
      updatedAt: Date.now(),
      isDirty: true,
    };

    const prevLayers = JSON.parse(JSON.stringify(layers));
    // Offset each layer by -roundX and -roundY so they remain correctly positioned inside the cropped area
    const nextLayers = layers.map((l) => ({
      ...l,
      x: l.x - roundX,
      y: l.y - roundY,
    }));

    const cmd = new CropDocumentCommand(prevDoc, nextDoc, prevLayers, nextLayers);
    executeCommand(cmd);
    setActiveTool('move');
  }, [doc, cropRect, layers, executeCommand, setActiveTool]);

  const handleCancel = useCallback(() => {
    setActiveTool('move');
  }, [setActiveTool]);

  // Handle keyboard shortcuts (Enter to apply, Escape to cancel)
  useEffect(() => {
    if (!isCropActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCropActive, handleApply, handleCancel]);

  if (!isCropActive || !doc) return null;

  // Viewport pixel coordinates of the crop rectangle
  const screenLeft = docX + cropRect.x * zoom;
  const screenTop = docY + cropRect.y * zoom;
  const screenWidth = cropRect.width * zoom;
  const screenHeight = cropRect.height * zoom;

  const handleMouseDownOnAnchor = (handle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startCrop = { ...cropRect };
    const aspect = options.crop.aspect;

    const onMove = (moveEv: MouseEvent) => {
      const dx = (moveEv.clientX - startClientX) / zoom;
      const dy = (moveEv.clientY - startClientY) / zoom;

      let nextX = startCrop.x;
      let nextY = startCrop.y;
      let nextW = startCrop.width;
      let nextH = startCrop.height;

      if (handle.includes('right')) {
        nextW = Math.max(20, startCrop.width + dx);
      }
      if (handle.includes('bottom')) {
        nextH = Math.max(20, startCrop.height + dy);
      }
      if (handle.includes('left')) {
        const potentialW = startCrop.width - dx;
        if (potentialW > 20) {
          nextX = startCrop.x + dx;
          nextW = potentialW;
        }
      }
      if (handle.includes('top')) {
        const potentialH = startCrop.height - dy;
        if (potentialH > 20) {
          nextY = startCrop.y + dy;
          nextH = potentialH;
        }
      }

      // Aspect ratio constraints
      if (aspect === '1:1') {
        const size = Math.min(nextW, nextH);
        nextW = size;
        nextH = size;
      } else if (aspect === '16:9') {
        nextH = nextW * (9 / 16);
      } else if (aspect === '4:3') {
        nextH = nextW * (3 / 4);
      } else if (aspect === '9:16') {
        nextH = nextW * (16 / 9);
      }

      setCropRect({
        x: nextX,
        y: nextY,
        width: nextW,
        height: nextH,
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleMouseDownOnBox = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startCrop = { ...cropRect };

    const onMove = (moveEv: MouseEvent) => {
      const dx = (moveEv.clientX - startClientX) / zoom;
      const dy = (moveEv.clientY - startClientY) / zoom;
      setCropRect({
        ...startCrop,
        x: startCrop.x + dx,
        y: startCrop.y + dy,
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handles = [
    { id: 'top-left', cursor: 'nwse-resize', style: { top: -6, left: -6 } },
    { id: 'top-center', cursor: 'ns-resize', style: { top: -6, left: '50%', transform: 'translateX(-50%)' } },
    { id: 'top-right', cursor: 'nesw-resize', style: { top: -6, right: -6 } },
    { id: 'middle-right', cursor: 'ew-resize', style: { top: '50%', right: -6, transform: 'translateY(-50%)' } },
    { id: 'bottom-right', cursor: 'nwse-resize', style: { bottom: -6, right: -6 } },
    { id: 'bottom-center', cursor: 'ns-resize', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)' } },
    { id: 'bottom-left', cursor: 'nesw-resize', style: { bottom: -6, left: -6 } },
    { id: 'middle-left', cursor: 'ew-resize', style: { top: '50%', left: -6, transform: 'translateY(-50%)' } },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 22,
      }}
    >
      {/* Darkened Mask Outside Crop Box */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <mask id="crop-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={screenLeft}
              y={screenTop}
              width={screenWidth}
              height={screenHeight}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#crop-mask)"
        />
      </svg>

      {/* Interactive Crop Frame */}
      <div
        style={{
          position: 'absolute',
          left: `${screenLeft}px`,
          top: `${screenTop}px`,
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
          border: '1.5px solid #ffffff',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.6)',
          pointerEvents: 'auto',
          cursor: 'move',
        }}
        onMouseDown={handleMouseDownOnBox}
      >
        {/* Rule of Thirds Grid Lines */}
        <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
        <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
        <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
        <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />

        {/* 8 Resize Handles */}
        {handles.map((h) => (
          <div
            key={h.id}
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              backgroundColor: '#ffffff',
              border: '2px solid #000000',
              cursor: h.cursor,
              zIndex: 3,
              ...h.style,
            }}
            onMouseDown={handleMouseDownOnAnchor(h.id)}
          />
        ))}

        {/* Floating Action Confirmation Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: -36,
            right: 0,
            display: 'flex',
            gap: 6,
            backgroundColor: editorTokens.bg.surface,
            padding: '3px 6px',
            borderRadius: 3,
            border: `1px solid ${editorTokens.border.medium}`,
            boxShadow: editorTokens.shadow.panel,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<Check size={13} />}
            onClick={handleApply}
            sx={{ height: 22, fontSize: '0.7rem' }}
          >
            Apply (Enter)
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<X size={13} />}
            onClick={handleCancel}
            sx={{ height: 22, fontSize: '0.7rem', color: editorTokens.text.secondary }}
          >
            Cancel (Esc)
          </Button>
        </div>
      </div>
    </div>
  );
};

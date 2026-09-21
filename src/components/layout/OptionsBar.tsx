'use client';

import React from 'react';
import { useToolStore } from '@/store/toolStore';
import { useLayerStore } from '@/store/layerStore';
import { useDocumentStore } from '@/store/documentStore';
import { useViewStore } from '@/store/viewStore';
import { editorTokens } from '@/theme/palette';
import { CropAspect } from '@/types/tools';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Maximize,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Slider from '@mui/material/Slider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

export const OptionsBar: React.FC = () => {
  const { activeTool, options, updateToolOptions, foregroundColor, setForegroundColor } = useToolStore();
  const { activeLayerId, layers, updateLayer } = useLayerStore();
  const { document: doc } = useDocumentStore();
  const { zoom, setZoom, resetZoom, fitToViewport } = useViewStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  // Alignment helpers for Move tool
  const alignActiveLayer = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!activeLayer || !doc) return;
    let nextX = activeLayer.x;
    let nextY = activeLayer.y;

    if (type === 'left') nextX = 0;
    if (type === 'center') nextX = Math.round((doc.width - activeLayer.width) / 2);
    if (type === 'right') nextX = doc.width - activeLayer.width;
    if (type === 'top') nextY = 0;
    if (type === 'middle') nextY = Math.round((doc.height - activeLayer.height) / 2);
    if (type === 'bottom') nextY = doc.height - activeLayer.height;

    updateLayer(activeLayer.id, { x: nextX, y: nextY });
  };

  return (
    <div
      style={{
        height: 34,
        backgroundColor: editorTokens.bg.toolbar,
        borderBottom: `1px solid ${editorTokens.border.subtle}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 16,
        fontSize: '0.72rem',
        color: editorTokens.text.primary,
        zIndex: 35,
        userSelect: 'none',
        overflowX: 'auto',
      }}
    >
      {/* Active Tool Label Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
          color: editorTokens.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontSize: '0.68rem',
          borderRight: `1px solid ${editorTokens.border.subtle}`,
          paddingRight: 12,
        }}
      >
        <span>{activeTool.replace('-', ' ')}</span>
      </div>

      {/* MOVE TOOL OPTIONS */}
      {activeTool === 'move' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: editorTokens.text.secondary }}>Align Layer:</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              type="button"
              onClick={() => alignActiveLayer('left')}
              title="Align Left Edges"
              disabled={!activeLayer}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: activeLayer ? editorTokens.text.primary : editorTokens.text.muted,
                padding: '2px 4px',
                cursor: activeLayer ? 'pointer' : 'default',
              }}
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => alignActiveLayer('center')}
              title="Align Horizontal Centers"
              disabled={!activeLayer}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: activeLayer ? editorTokens.text.primary : editorTokens.text.muted,
                padding: '2px 4px',
                cursor: activeLayer ? 'pointer' : 'default',
              }}
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => alignActiveLayer('right')}
              title="Align Right Edges"
              disabled={!activeLayer}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: activeLayer ? editorTokens.text.primary : editorTokens.text.muted,
                padding: '2px 4px',
                cursor: activeLayer ? 'pointer' : 'default',
              }}
            >
              <AlignRight size={14} />
            </button>
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: editorTokens.border.subtle }} />

          <Button
            size="small"
            variant="text"
            onClick={() => alignActiveLayer('middle')}
            disabled={!activeLayer}
            sx={{ fontSize: '0.68rem', padding: '1px 6px', minHeight: 20 }}
          >
            Center in Canvas
          </Button>
        </div>
      )}

      {/* BRUSH TOOL OPTIONS */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Size Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: editorTokens.text.secondary }}>Size:</span>
            <Slider
              value={activeTool === 'brush' ? options.brush.size : options.eraser.size}
              min={1}
              max={150}
              onChange={(_, val) => {
                if (activeTool === 'brush') {
                  updateToolOptions('brush', { size: val as number });
                } else {
                  updateToolOptions('eraser', { size: val as number });
                }
              }}
              sx={{ width: 80 }}
            />
            <span style={{ minWidth: 26, fontSize: '0.7rem' }}>
              {activeTool === 'brush' ? options.brush.size : options.eraser.size}px
            </span>
          </div>

          {/* Hardness (Brush only) */}
          {activeTool === 'brush' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: editorTokens.text.secondary }}>Hardness:</span>
              <Slider
                value={Math.round(options.brush.hardness * 100)}
                min={0}
                max={100}
                onChange={(_, val) =>
                  updateToolOptions('brush', { hardness: (val as number) / 100 })
                }
                sx={{ width: 60 }}
              />
              <span style={{ minWidth: 32, fontSize: '0.7rem' }}>
                {Math.round(options.brush.hardness * 100)}%
              </span>
            </div>
          )}

          {/* Opacity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: editorTokens.text.secondary }}>Opacity:</span>
            <Slider
              value={Math.round(
                (activeTool === 'brush' ? options.brush.opacity : options.eraser.opacity) * 100
              )}
              min={1}
              max={100}
              onChange={(_, val) => {
                const dec = (val as number) / 100;
                if (activeTool === 'brush') {
                  updateToolOptions('brush', { opacity: dec });
                } else {
                  updateToolOptions('eraser', { opacity: dec });
                }
              }}
              sx={{ width: 60 }}
            />
            <span style={{ minWidth: 32, fontSize: '0.7rem' }}>
              {Math.round(
                (activeTool === 'brush' ? options.brush.opacity : options.eraser.opacity) * 100
              )}
              %
            </span>
          </div>
        </div>
      )}

      {/* TEXT TOOL OPTIONS */}
      {activeTool === 'text' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Font Family */}
          <Select
            value={options.text.fontFamily}
            onChange={(e) => updateToolOptions('text', { fontFamily: e.target.value })}
            sx={{ height: 24, fontSize: '0.72rem', minWidth: 130 }}
          >
            <MenuItem value="Inter, system-ui, sans-serif">Inter (Default)</MenuItem>
            <MenuItem value="Arial, sans-serif">Arial</MenuItem>
            <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
            <MenuItem value="'Courier New', monospace">Courier New</MenuItem>
            <MenuItem value="Georgia, serif">Georgia</MenuItem>
            <MenuItem value="'Segoe UI', sans-serif">Segoe UI</MenuItem>
            <MenuItem value="Impact, sans-serif">Impact</MenuItem>
          </Select>

          {/* Font Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: editorTokens.text.secondary }}>Size:</span>
            <input
              type="number"
              value={options.text.fontSize}
              min={8}
              max={288}
              onChange={(e) =>
                updateToolOptions('text', { fontSize: Math.max(6, parseInt(e.target.value) || 12) })
              }
              style={{
                width: 44,
                height: 22,
                backgroundColor: editorTokens.bg.input,
                border: `1px solid ${editorTokens.border.subtle}`,
                color: editorTokens.text.primary,
                fontSize: '0.72rem',
                padding: '1px 4px',
                borderRadius: 2,
              }}
            />
            <span>px</span>
          </div>

          {/* Bold & Italic */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              type="button"
              onClick={() =>
                updateToolOptions('text', {
                  fontWeight: options.text.fontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
              style={{
                backgroundColor: options.text.fontWeight === 'bold' ? editorTokens.accent.primary : 'transparent',
                color: options.text.fontWeight === 'bold' ? '#fff' : editorTokens.text.primary,
                border: 'none',
                padding: '2px 4px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() =>
                updateToolOptions('text', {
                  fontStyle: options.text.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
              style={{
                backgroundColor: options.text.fontStyle === 'italic' ? editorTokens.accent.primary : 'transparent',
                color: options.text.fontStyle === 'italic' ? '#fff' : editorTokens.text.primary,
                border: 'none',
                padding: '2px 4px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              <Italic size={13} />
            </button>
          </div>

          {/* Alignments */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              type="button"
              onClick={() => updateToolOptions('text', { align: 'left' })}
              style={{
                backgroundColor: options.text.align === 'left' ? editorTokens.accent.primary : 'transparent',
                color: options.text.align === 'left' ? '#fff' : editorTokens.text.primary,
                border: 'none',
                padding: '2px 4px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => updateToolOptions('text', { align: 'center' })}
              style={{
                backgroundColor: options.text.align === 'center' ? editorTokens.accent.primary : 'transparent',
                color: options.text.align === 'center' ? '#fff' : editorTokens.text.primary,
                border: 'none',
                padding: '2px 4px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => updateToolOptions('text', { align: 'right' })}
              style={{
                backgroundColor: options.text.align === 'right' ? editorTokens.accent.primary : 'transparent',
                color: options.text.align === 'right' ? '#fff' : editorTokens.text.primary,
                border: 'none',
                padding: '2px 4px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              <AlignRight size={13} />
            </button>
          </div>

          {/* Color swatch */}
          <div
            style={{
              width: 18,
              height: 18,
              backgroundColor: foregroundColor,
              border: '1px solid #ffffff',
              borderRadius: 2,
              cursor: 'pointer',
            }}
            title="Text Color (click to change)"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = foregroundColor;
              input.onchange = (e) => setForegroundColor((e.target as HTMLInputElement).value);
              input.click();
            }}
          />
        </div>
      )}

      {/* SHAPE TOOL OPTIONS */}
      {(activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'polygon') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Fill color */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: editorTokens.text.secondary }}>Fill:</span>
            <div
              style={{
                width: 18,
                height: 18,
                backgroundColor: options.shape.fill,
                border: '1px solid #999',
                borderRadius: 2,
                cursor: 'pointer',
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = options.shape.fill;
                input.onchange = (e) =>
                  updateToolOptions('shape', { fill: (e.target as HTMLInputElement).value });
                input.click();
              }}
            />
          </div>

          {/* Stroke color */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: editorTokens.text.secondary }}>Stroke:</span>
            <div
              style={{
                width: 18,
                height: 18,
                backgroundColor: options.shape.stroke,
                border: '1px solid #999',
                borderRadius: 2,
                cursor: 'pointer',
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = options.shape.stroke;
                input.onchange = (e) =>
                  updateToolOptions('shape', { stroke: (e.target as HTMLInputElement).value });
                input.click();
              }}
            />
          </div>

          {/* Stroke width */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: editorTokens.text.secondary }}>Width:</span>
            <input
              type="number"
              value={options.shape.strokeWidth}
              min={0}
              max={50}
              onChange={(e) =>
                updateToolOptions('shape', { strokeWidth: parseInt(e.target.value) || 0 })
              }
              style={{
                width: 38,
                height: 22,
                backgroundColor: editorTokens.bg.input,
                border: `1px solid ${editorTokens.border.subtle}`,
                color: editorTokens.text.primary,
                fontSize: '0.72rem',
                padding: '1px 4px',
                borderRadius: 2,
              }}
            />
            <span>px</span>
          </div>

          {/* Corner radius for rect */}
          {activeTool === 'rectangle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: editorTokens.text.secondary }}>Radius:</span>
              <input
                type="number"
                value={options.shape.cornerRadius}
                min={0}
                max={100}
                onChange={(e) =>
                  updateToolOptions('shape', { cornerRadius: parseInt(e.target.value) || 0 })
                }
                style={{
                  width: 38,
                  height: 22,
                  backgroundColor: editorTokens.bg.input,
                  border: `1px solid ${editorTokens.border.subtle}`,
                  color: editorTokens.text.primary,
                  fontSize: '0.72rem',
                  padding: '1px 4px',
                  borderRadius: 2,
                }}
              />
              <span>px</span>
            </div>
          )}
        </div>
      )}

      {/* CROP TOOL OPTIONS */}
      {activeTool === 'crop' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: editorTokens.text.secondary }}>Ratio:</span>
          <Select
            value={options.crop.aspect}
            onChange={(e) =>
              updateToolOptions('crop', { aspect: e.target.value as CropAspect })
            }
            sx={{ height: 24, fontSize: '0.72rem', minWidth: 90 }}
          >
            <MenuItem value="free">Freeform</MenuItem>
            <MenuItem value="1:1">1 : 1 (Square)</MenuItem>
            <MenuItem value="16:9">16 : 9</MenuItem>
            <MenuItem value="4:3">4 : 3</MenuItem>
            <MenuItem value="9:16">9 : 16</MenuItem>
          </Select>
          <span style={{ color: editorTokens.text.muted, fontSize: '0.68rem' }}>
            Press Enter to commit, Esc to cancel
          </span>
        </div>
      )}

      {/* MARQUEE TOOL OPTIONS */}
      {activeTool === 'marquee' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: editorTokens.text.secondary }}>Shape:</span>
          <Select
            value={options.marquee.shape}
            onChange={(e) =>
              updateToolOptions('marquee', { shape: e.target.value as 'rect' | 'ellipse' })
            }
            sx={{ height: 24, fontSize: '0.72rem', minWidth: 100 }}
          >
            <MenuItem value="rect">Rectangular</MenuItem>
            <MenuItem value="ellipse">Elliptical</MenuItem>
          </Select>
        </div>
      )}

      {/* ZOOM / VIEW CONTROLS */}
      {(activeTool === 'zoom' || activeTool === 'hand') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setZoom(zoom * 1.25)}
            startIcon={<ZoomIn size={12} />}
            sx={{ height: 22, fontSize: '0.68rem' }}
          >
            Zoom In
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setZoom(zoom * 0.8)}
            startIcon={<ZoomOut size={12} />}
            sx={{ height: 22, fontSize: '0.68rem' }}
          >
            Zoom Out
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={resetZoom}
            sx={{ height: 22, fontSize: '0.68rem' }}
          >
            100%
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              if (doc) fitToViewport(window.innerWidth - 300, window.innerHeight - 150, doc.width, doc.height);
            }}
            startIcon={<Maximize size={12} />}
            sx={{ height: 22, fontSize: '0.68rem' }}
          >
            Fit Canvas
          </Button>
        </div>
      )}
    </div>
  );
};

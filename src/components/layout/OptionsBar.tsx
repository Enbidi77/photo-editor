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
  ToggleLeft,
  ToggleRight,
  Magnet,
  CircleDot,
  RotateCw,
  Columns2,
  Diamond,
  Minus,
  PenTool,
  SquareDashed,
  Square,
} from 'lucide-react';
import { useHistoryStore } from '@/store/historyStore';
import { TransformLayerCommand, UpdateLayerPropertiesCommand } from '@/editor/commands/LayerCommands';
import { PathLayer } from '@/types/layer';
import Slider from '@mui/material/Slider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import {
  GRADIENT_PRESETS,
  GradientType,
  resolveGradientStops,
  formatCssGradient,
  DEFAULT_GRADIENT_OPTIONS,
  colorToHex,
} from '@/lib/image/gradient';

export const OptionsBar: React.FC = () => {
  const { activeTool, options, updateToolOptions, foregroundColor, setForegroundColor, backgroundColor } = useToolStore();
  const { activeLayerId, layers, updateLayer, editingMaskLayerId, setEditingMask } = useLayerStore();
  const { document: doc } = useDocumentStore();
  const { zoom, setZoom, resetZoom, fitToViewport, snapEnabled, setSnapEnabled } = useViewStore();
  const { executeCommand } = useHistoryStore();

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

    executeCommand(
      new TransformLayerCommand(
        activeLayer.id,
        {
          x: activeLayer.x,
          y: activeLayer.y,
          width: activeLayer.width,
          height: activeLayer.height,
          scaleX: activeLayer.scaleX,
          scaleY: activeLayer.scaleY,
          rotation: activeLayer.rotation,
        },
        {
          x: nextX,
          y: nextY,
          width: activeLayer.width,
          height: activeLayer.height,
          scaleX: activeLayer.scaleX,
          scaleY: activeLayer.scaleY,
          rotation: activeLayer.rotation,
        },
        `Align Layer ${type.charAt(0).toUpperCase() + type.slice(1)}`
      )
    );
  };

  const updatePathLayer = (patch: Partial<PathLayer>, label: string) => {
    if (!activeLayer || activeLayer.type !== 'PATH') return;
    const current = activeLayer as PathLayer;
    executeCommand(
      new UpdateLayerPropertiesCommand(
        activeLayer.id,
        current,
        { ...current, ...patch },
        label
      )
    );
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

          <div style={{ width: 1, height: 16, backgroundColor: editorTokens.border.subtle }} />

          <button
            type="button"
            onClick={() => setSnapEnabled(!snapEnabled)}
            title={snapEnabled ? 'Disable Snapping' : 'Enable Snapping'}
            style={{
              backgroundColor: snapEnabled ? editorTokens.accent.primary : 'transparent',
              color: snapEnabled ? '#fff' : editorTokens.text.primary,
              border: 'none',
              padding: '2px 8px',
              borderRadius: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.68rem',
            }}
          >
            <Magnet size={12} />
            Snap
          </button>
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

          {/* Mask editing indicator */}
          {editingMaskLayerId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <div style={{
                backgroundColor: '#ff00ff33',
                border: '1px solid #ff00ff',
                borderRadius: 3,
                padding: '2px 8px',
                fontSize: '0.68rem',
                color: '#ff88ff',
                fontWeight: 600,
              }}>
                Editing Mask
              </div>
              <button
                type="button"
                onClick={() => setEditingMask(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${editorTokens.border.subtle}`,
                  color: editorTokens.text.primary,
                  padding: '2px 8px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontSize: '0.68rem',
                }}
              >
                Done
              </button>
            </div>
          )}
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

      {/* GRADIENT TOOL OPTIONS */}
      {activeTool === 'gradient' && (() => {
        const gradOpts = options.gradient || DEFAULT_GRADIENT_OPTIONS;
        const resolvedStops = resolveGradientStops(
          gradOpts.presetId,
          foregroundColor,
          backgroundColor,
          gradOpts.stops
        );

        const types: { id: GradientType; label: string; icon: React.ReactNode }[] = [
          { id: 'linear', label: 'Linear', icon: <Minus size={13} style={{ transform: 'rotate(-45deg)' }} /> },
          { id: 'radial', label: 'Radial', icon: <CircleDot size={13} /> },
          { id: 'angle', label: 'Angle', icon: <RotateCw size={13} /> },
          { id: 'reflected', label: 'Reflected', icon: <Columns2 size={13} /> },
          { id: 'diamond', label: 'Diamond', icon: <Diamond size={13} /> },
        ];

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Active Gradient Preview */}
            <div
              title="Active Gradient"
              style={{
                width: 48,
                height: 20,
                borderRadius: 2,
                border: `1px solid ${editorTokens.border.subtle}`,
                background: formatCssGradient(resolvedStops),
                flexShrink: 0,
              }}
            />

            {/* Presets Swatches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: editorTokens.text.secondary }}>Presets:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, maxWidth: 220, overflowX: 'auto' }}>
                {GRADIENT_PRESETS.map((preset) => {
                  const pStops = resolveGradientStops(preset.id, foregroundColor, backgroundColor);
                  const isSelected = gradOpts.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.name}
                      onClick={() =>
                        updateToolOptions('gradient', {
                          presetId: preset.id,
                          stops: pStops,
                        })
                      }
                      style={{
                        width: 22,
                        height: 18,
                        borderRadius: 2,
                        border: isSelected ? '2px solid #0078d4' : `1px solid ${editorTokens.border.subtle}`,
                        background: formatCssGradient(pStops),
                        cursor: 'pointer',
                        padding: 0,
                        outline: 'none',
                        flexShrink: 0,
                        boxShadow: isSelected ? '0 0 0 1px #ffffff' : 'none',
                      }}
                    />
                  );
                })}
                {gradOpts.presetId === 'custom' && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      padding: '1px 5px',
                      borderRadius: 2,
                      backgroundColor: editorTokens.accent.primary,
                      color: '#ffffff',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Custom
                  </span>
                )}
              </div>
            </div>

            {/* Custom Color Stops */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: editorTokens.text.secondary }}>Colors:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {resolvedStops.map((stop, idx) => {
                  const hexColor = colorToHex(stop.color);
                  const isRemovable = resolvedStops.length > 2 && idx > 0 && idx < resolvedStops.length - 1;
                  return (
                    <div
                      key={`grad-stop-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        backgroundColor: editorTokens.bg.input,
                        padding: '1px 3px',
                        borderRadius: 3,
                        border: `1px solid ${editorTokens.border.subtle}`,
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                        title={`Stop ${idx + 1}: ${stop.color} (${Math.round(stop.offset * 100)}%) - Click to choose custom color`}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 16,
                            backgroundColor: stop.color,
                            borderRadius: 2,
                            border: `1px solid ${editorTokens.border.medium}`,
                          }}
                        />
                        <input
                          type="color"
                          value={hexColor}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            const nextStops = resolvedStops.map((s, i) =>
                              i === idx ? { ...s, color: newColor } : s
                            );
                            updateToolOptions('gradient', {
                              presetId: 'custom',
                              stops: nextStops,
                            });
                          }}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: 18,
                            height: 16,
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                          }}
                        />
                      </label>

                      {isRemovable && (
                        <button
                          type="button"
                          title="Remove stop"
                          onClick={() => {
                            const nextStops = resolvedStops.filter((_, i) => i !== idx);
                            updateToolOptions('gradient', {
                              presetId: 'custom',
                              stops: nextStops,
                            });
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: editorTokens.text.muted,
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '0.7rem',
                            lineHeight: 1,
                          }}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add Stop Button */}
                <button
                  type="button"
                  title="Add color stop to gradient"
                  onClick={() => {
                    const newOffset = resolvedStops.length >= 2
                      ? Number(((resolvedStops[0].offset + resolvedStops[resolvedStops.length - 1].offset) / 2).toFixed(2))
                      : 0.5;
                    const nextStops = [
                      ...resolvedStops,
                      { offset: newOffset, color: foregroundColor || '#ffff00' },
                    ].sort((a, b) => a.offset - b.offset);
                    updateToolOptions('gradient', {
                      presetId: 'custom',
                      stops: nextStops,
                    });
                  }}
                  style={{
                    backgroundColor: editorTokens.bg.input,
                    border: `1px dashed ${editorTokens.border.medium}`,
                    color: editorTokens.text.secondary,
                    borderRadius: 3,
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Type Selector (5-button group) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: editorTokens.text.secondary }}>Type:</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: editorTokens.bg.input,
                  borderRadius: 3,
                  padding: 1,
                  border: `1px solid ${editorTokens.border.subtle}`,
                }}
              >
                {types.map((t) => {
                  const isActive = (gradOpts.type || 'linear') === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={`${t.label} Gradient`}
                      onClick={() => updateToolOptions('gradient', { type: t.id })}
                      style={{
                        width: 24,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isActive ? editorTokens.accent.primary : 'transparent',
                        color: isActive ? '#ffffff' : editorTokens.text.secondary,
                        border: 'none',
                        borderRadius: 2,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {t.icon}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opacity Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: editorTokens.text.secondary }}>Opacity:</span>
              <Slider
                value={Math.round((gradOpts.opacity ?? 1) * 100)}
                min={1}
                max={100}
                onChange={(_, val) =>
                  updateToolOptions('gradient', { opacity: (val as number) / 100 })
                }
                sx={{ width: 64, height: 2 }}
              />
              <span style={{ width: 32, fontSize: '0.68rem', color: editorTokens.text.muted }}>
                {Math.round((gradOpts.opacity ?? 1) * 100)}%
              </span>
            </div>

            {/* Reverse Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                color: editorTokens.text.secondary,
              }}
            >
              <input
                type="checkbox"
                checked={gradOpts.reverse ?? false}
                onChange={(e) => updateToolOptions('gradient', { reverse: e.target.checked })}
                style={{ width: 12, height: 12, cursor: 'pointer' }}
              />
              Reverse
            </label>
          </div>
        );
      })()}

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

      {/* LASSO TOOL OPTIONS */}
      {activeTool === 'lasso' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: editorTokens.text.secondary }}>Freehand selection — draw to select, release to close</span>
        </div>
      )}

      {/* MAGIC WAND TOOL OPTIONS */}
      {activeTool === 'magic-wand' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Tolerance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: editorTokens.text.secondary }}>Tolerance:</span>
            <input
              type="number"
              value={options.magicWand.tolerance}
              min={0}
              max={255}
              onChange={(e) =>
                updateToolOptions('magicWand', { tolerance: Math.max(0, Math.min(255, parseInt(e.target.value) || 0)) })
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
          </div>

          {/* Contiguous toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: editorTokens.text.secondary }}>
            <input
              type="checkbox"
              checked={options.magicWand.contiguous}
              onChange={(e) => updateToolOptions('magicWand', { contiguous: e.target.checked })}
              style={{ width: 12, height: 12 }}
            />
            Contiguous
          </label>

          {/* Sample All Layers toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: editorTokens.text.secondary }}>
            <input
              type="checkbox"
              checked={options.magicWand.sampleAllLayers}
              onChange={(e) => updateToolOptions('magicWand', { sampleAllLayers: e.target.checked })}
              style={{ width: 12, height: 12 }}
            />
            Sample All Layers
          </label>
        </div>
      )}

      {/* PEN TOOL OPTIONS */}
      {activeTool === 'pen' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mode Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: editorTokens.text.secondary }}>Mode:</span>
            <Select
              value={options.pen.mode}
              onChange={(e) => updateToolOptions('pen', { mode: e.target.value as 'path' | 'shape' })}
              sx={{ height: 24, fontSize: '0.72rem', minWidth: 76 }}
            >
              <MenuItem value="path">Path</MenuItem>
              <MenuItem value="shape">Shape</MenuItem>
            </Select>
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: editorTokens.border.subtle }} />

          {/* Stroke Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: editorTokens.text.secondary }}>
              <input
                type="checkbox"
                checked={options.pen.strokeEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateToolOptions('pen', { strokeEnabled: val });
                  if (activeLayer?.type === 'PATH') {
                    updatePathLayer({ stroke: val ? options.pen.stroke : 'none' }, 'Toggle Path Stroke');
                  }
                }}
                style={{ width: 12, height: 12 }}
              />
              Stroke:
            </label>
            <div
              style={{
                width: 18,
                height: 18,
                backgroundColor: options.pen.stroke,
                border: '1px solid #ffffff',
                borderRadius: 2,
                cursor: 'pointer',
              }}
              title="Stroke Color"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = options.pen.stroke;
                input.onchange = (e) => {
                  const color = (e.target as HTMLInputElement).value;
                  updateToolOptions('pen', { stroke: color });
                  if (activeLayer?.type === 'PATH') {
                    updatePathLayer({ stroke: color }, 'Change Path Stroke Color');
                  }
                };
                input.click();
              }}
            />
            <input
              type="number"
              value={options.pen.strokeWidth}
              min={1}
              max={100}
              onChange={(e) => {
                const w = Math.max(1, parseInt(e.target.value) || 1);
                updateToolOptions('pen', { strokeWidth: w });
                if (activeLayer?.type === 'PATH') {
                  updatePathLayer({ strokeWidth: w }, 'Change Path Stroke Width');
                }
              }}
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
            <span style={{ color: editorTokens.text.muted, fontSize: '0.68rem' }}>px</span>
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: editorTokens.border.subtle }} />

          {/* Fill Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: editorTokens.text.secondary }}>
              <input
                type="checkbox"
                checked={options.pen.fillEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateToolOptions('pen', { fillEnabled: val });
                  if (activeLayer?.type === 'PATH') {
                    updatePathLayer({ fill: val ? options.pen.fill : 'none' }, 'Toggle Path Fill');
                  }
                }}
                style={{ width: 12, height: 12 }}
              />
              Fill:
            </label>
            <div
              style={{
                width: 18,
                height: 18,
                backgroundColor: options.pen.fillEnabled ? options.pen.fill : 'transparent',
                border: '1px solid #ffffff',
                borderRadius: 2,
                cursor: options.pen.fillEnabled ? 'pointer' : 'default',
                opacity: options.pen.fillEnabled ? 1 : 0.4,
              }}
              title="Fill Color"
              onClick={() => {
                if (!options.pen.fillEnabled) return;
                const input = document.createElement('input');
                input.type = 'color';
                input.value = options.pen.fill;
                input.onchange = (e) => {
                  const color = (e.target as HTMLInputElement).value;
                  updateToolOptions('pen', { fill: color });
                  if (activeLayer?.type === 'PATH') {
                    updatePathLayer({ fill: color }, 'Change Path Fill Color');
                  }
                };
                input.click();
              }}
            />
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: editorTokens.border.subtle }} />

          {/* Make Selection button */}
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('pen-make-selection'));
            }}
            startIcon={<SquareDashed size={12} />}
            sx={{ height: 22, fontSize: '0.68rem', padding: '1px 6px' }}
          >
            Make Selection
          </Button>

          {/* If active layer is PATH: path actions */}
          {activeLayer?.type === 'PATH' && (() => {
            const pathLayer = activeLayer as PathLayer;
            return (
              <>
                <div style={{ width: 1, height: 16, backgroundColor: editorTokens.border.subtle }} />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const nextClosed = !pathLayer.closed;
                    const cmd = new UpdateLayerPropertiesCommand(
                      pathLayer.id,
                      { closed: pathLayer.closed },
                      { closed: nextClosed },
                      nextClosed ? 'Close Path' : 'Open Path'
                    );
                    executeCommand(cmd);
                  }}
                  sx={{ height: 22, fontSize: '0.68rem', padding: '1px 6px' }}
                >
                  {pathLayer.closed ? 'Open Path' : 'Close Path'}
                </Button>

                <Button
                  size="small"
                  variant="text"
                  onClick={() => window.dispatchEvent(new CustomEvent('pen-convert-point', { detail: { type: 'corner' } }))}
                  startIcon={<Square size={11} />}
                  sx={{ height: 22, fontSize: '0.68rem', padding: '1px 4px' }}
                >
                  To Corner
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => window.dispatchEvent(new CustomEvent('pen-convert-point', { detail: { type: 'smooth' } }))}
                  startIcon={<CircleDot size={11} />}
                  sx={{ height: 22, fontSize: '0.68rem', padding: '1px 4px' }}
                >
                  To Smooth
                </Button>

                <span style={{ color: editorTokens.text.muted, fontSize: '0.68rem' }}>
                  ({pathLayer.points.length} pts)
                </span>
              </>
            );
          })()}
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
